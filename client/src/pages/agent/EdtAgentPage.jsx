import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Plus, X, Edit2, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import '../shared.css';

/**
 * EdtAgentPage — Gestion de l'Emploi du Temps (UC-A06)
 * Figma Page 14 (node 51:13577)
 *
 * Features:
 *  - Horaires démarrent à 08:30
 *  - Salle pré-sélectionnée depuis une liste définie
 *  - Détection de conflits : salle, enseignant, groupe (même jour + même créneau)
 *  - Boutons Modifier ET Supprimer sur chaque carte
 */

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Samedi'];

// ─── Créneaux canoniques (périodes universitaires) ──────────────────────────
// Chaque cours dure 1h30. On fusionne toutes les heures de début en base
// (08:00, 08:30, 09:30, 09:50, etc.) dans la période correspondante.
const PERIOD_RANGES = [
  { key: '08:00', display: '08:00 – 09:30', from: 480, to: 569 },
  { key: '09:30', display: '09:30 – 11:00', from: 570, to: 659 },
  { key: '11:00', display: '11:00 – 12:30', from: 660, to: 779 },
  { key: '13:00', display: '13:00 – 14:30', from: 780, to: 869 },
  { key: '14:30', display: '14:30 – 16:00', from: 870, to: 959 },
  { key: '16:00', display: '16:00 – 17:30', from: 960, to: 1080 },
];
const CANONICAL_SLOTS = PERIOD_RANGES.map(p => p.key);
// Map a period key to its display label
const PERIOD_DISPLAY = Object.fromEntries(PERIOD_RANGES.map(p => [p.key, p.display]));

// Convert "HH:MM" to minutes since midnight
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Map a raw "HH:MM" start time to the period key it belongs to
function normalizeSlot(raw) {
  const rawMin = timeToMin(raw);
  for (const p of PERIOD_RANGES) {
    if (rawMin >= p.from && rawMin <= p.to) return p.key;
  }
  // Fallback: nearest period label
  let best = PERIOD_RANGES[0].key, bestDist = Infinity;
  for (const p of PERIOD_RANGES) {
    const mid = (p.from + p.to) / 2;
    const d = Math.abs(mid - rawMin);
    if (d < bestDist) { bestDist = d; best = p.key; }
  }
  return best;
}

// ─── Salles disponibles par type (synchronisées avec la BDD) ─────────────────
const SALLES = {
  CM:  ['Amphi 3', 'Amphi 4', 'Amphi A1', 'Amphi A2', 'Amphi A3', 'Amphi A4', 'Amphi A5', 'Amphi A6', 'Amphi A7', 'Amphi A8', 'EAD'],
  TD:  ['GS2', 'GS7', '313', 'Info1', 'Info2', 'Info3', 'Info4'],
  TP:  ['Salle P1', 'Salle P2', 'Salle TP A1', 'Salle TP A2', 'Salle TP A5', 'Salle TP A6'],
};
// Toutes les salles confondues pour la liste complète
const TOUTES_SALLES = [...new Set([...SALLES.CM, ...SALLES.TD, ...SALLES.TP])].sort();

// Auto-calculate end time: start + 1h30
function calcEndTime(startTime) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + 90;
  const eh = Math.floor(totalMin / 60);
  const em = totalMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

// Figma color scheme per session type
const TYPE_COLORS = {
  CM: { bg: '#e8f5e9', border: '#a5d6a7', text: '#2e7d32', badge: '#43a047' },
  TD: { bg: '#e3f2fd', border: '#90caf9', text: '#1565c0', badge: '#1e88e5' },
  TP: { bg: '#fce4ec', border: '#f48fb1', text: '#c62828', badge: '#e57373' },
};

const EDT_NIVEAU_SEMESTERS = {
  L1: [{ value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' }],
  L2: [{ value: 'S3', label: 'Semestre 3' }, { value: 'S4', label: 'Semestre 4' }],
  L3: [{ value: 'S5', label: 'Semestre 5' }, { value: 'S6', label: 'Semestre 6' }],
};

export default function EdtAgentPage() {
  const [creneaux,     setCreneaux]     = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [toast,        setToast]        = useState(null);
  const [conflicts,    setConflicts]    = useState([]); // list of conflict messages

  // Filters
  const [enseignantFilter, setEnseignantFilter] = useState('');
  const [jourFilter,       setJourFilter]       = useState('');
  const [niveauFilter,     setNiveauFilter]     = useState('');
  const [semestreFilter,   setSemestreFilter]   = useState('');

  const emptyForm = {
    id_affectation: '',
    jour: 'Lundi',
    heure_debut: '08:00',
    heure_fin: calcEndTime('08:00'),
    salle: SALLES.CM[0],    // pré-sélectionné
    type_seance: 'CM',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    Promise.all([api.get('/agent/edt'), api.get('/agent/affectations')])
      .then(([edt, aff]) => {
        setCreneaux(edt.data);
        setAffectations(aff.data);
      })
      .catch(() => showToast('Erreur chargement EDT', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Unique enseignants for filter ─────────────────────────────
  const enseignants = useMemo(() => {
    const map = {};
    affectations.forEach(a => {
      if (!map[a.id_utilisateur])
        map[a.id_utilisateur] = { id: a.id_utilisateur, nom: a.nom_enseignant, prenom: a.prenom_enseignant };
    });
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [affectations]);

  // sallesDisponibles is now computed below as sallesForType (after grid construction)

  // ── Conflict detection ────────────────────────────────────────
  // Returns array of conflict messages for the current form values.
  // IMPORTANT : les semestres S1 et S2 se déroulent à des dates
  // différentes → un créneau S1 ne peut PAS entrer en conflit
  // avec un créneau S2 (même jour/heure/salle).
  const detectConflicts = (f, excludeId = null) => {
    const msgs = [];
    // Normaliser vers la clé de période canonique (ex : '08:30' → '08:00').
    // Identique à la logique d'affichage de la grille, ce qui garantit la cohérence
    // entre ce qui est affiché et ce qui est détecté comme conflit.
    const debut = normalizeSlot(f.heure_debut);

    // Get selected affectation details
    const aff = affectations.find(a => String(a.id_affectation) === String(f.id_affectation));
    if (!aff) return msgs;

    // Fonction pour extraire le numéro du semestre de manière robuste
    const extractSemesterNumber = (semestreStr) => {
      if (!semestreStr) return 0;
      const s = String(semestreStr).toLowerCase();
      if (s.includes('premier')) return 1;
      if (s.includes('second') || s.includes('deuxième') || s.includes('deuxieme')) return 2;
      if (s.includes('troisième') || s.includes('troisieme')) return 3;
      if (s.includes('quatrième') || s.includes('quatrieme')) return 4;
      if (s.includes('cinquième') || s.includes('cinquieme')) return 5;
      if (s.includes('sixième') || s.includes('sixieme')) return 6;

      const match = s.match(/(?:s|semestre)\s*(\d)/);
      if (match) return parseInt(match[1], 10);

      const firstDigit = s.match(/\d/);
      return firstDigit ? parseInt(firstDigit[0], 10) : 0;
    };

    // Déterminer la parité du semestre du cours en cours d'ajout :
    //   S1, S3, S5 → impair ;  S2, S4, S6 → pair
    const semestreNum = extractSemesterNumber(aff.semestre);
    const isImpair = semestreNum % 2 !== 0;

    const candidats = creneaux.filter(c => {
      if (excludeId && c.id_creneau === excludeId) return false; // ignore self when editing
      if (c.jour !== f.jour) return false;
      const cDebutRaw = (c.heure_debut || '').slice(0, 5);
      if (!cDebutRaw) return false;
      // Normaliser le créneau existant pour comparer les périodes, pas les heures brutes
      const cDebut = normalizeSlot(cDebutRaw);
      if (cDebut !== debut) return false;

      // ── Filtre semestre ──────────────────────────────────
      // Un cours S1 (impair) et un cours S2 (pair) ne sont JAMAIS
      // en conflit car ils ont lieu à des périodes de l'année différentes.
      const cSemNum = extractSemesterNumber(c.semestre);
      // Si l'un des deux numéros de semestre est 0 (inconnu), on laisse le conflit s'appliquer par sécurité,
      // sinon on vérifie la parité.
      if (semestreNum !== 0 && cSemNum !== 0) {
        const cIsImpair = cSemNum % 2 !== 0;
        if (cIsImpair !== isImpair) return false; // semestres de parité différente → pas de conflit
      }

      return true;
    });

    // 1. Conflit de salle
    if (f.salle) {
      const salleOccupee = candidats.find(c => c.salle === f.salle);
      if (salleOccupee) {
        msgs.push(`⚠️ Salle « ${f.salle} » déjà occupée par ${salleOccupee.nom_enseignant} (${salleOccupee.nom_module}, ${salleOccupee.semestre || '?'}) le ${f.jour} à ${debut}`);
      }
    }

    // 2. Conflit enseignant
    const memeEnseignant = candidats.find(c => c.id_enseignant === aff.id_utilisateur);
    if (memeEnseignant) {
      msgs.push(`⚠️ Enseignant déjà planifié pour « ${memeEnseignant.nom_module} » (${memeEnseignant.semestre || '?'}) le ${f.jour} à ${debut}`);
    }

    // 3. Conflit groupe (pour TD/TP seulement, CM = section entière → toujours signaler)
    if (aff.id_groupe) {
      const memeGroupe = candidats.find(c => {
        const cAff = affectations.find(a => a.id_affectation === c.id_affectation);
        return cAff && cAff.id_groupe === aff.id_groupe;
      });
      if (memeGroupe) {
        msgs.push(`⚠️ Le groupe « ${aff.libelle_groupe} » a déjà un cours le ${f.jour} à ${debut}`);
      }
    }

    return msgs;
  };

  // Live conflicts as form changes
  const liveConflicts = useMemo(() => {
    if (!form.id_affectation || !form.jour || !form.heure_debut) return [];
    return detectConflicts(form, editingId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id_affectation, form.jour, form.heure_debut, form.salle, creneaux, affectations, editingId]);

  // ── Dynamic time slots: snap to canonical slots ────────────────
  const dynamicHeures = useMemo(() => {
    const slotSet = new Set();
    creneaux.forEach(c => {
      if (enseignantFilter && String(c.id_enseignant) !== enseignantFilter) return;
      if (jourFilter      && c.jour     !== jourFilter)                     return;
      if (niveauFilter    && c.niveau   !== niveauFilter)                   return;
      if (semestreFilter  && c.semestre !== semestreFilter)                 return;
      const raw = (c.heure_debut || '').slice(0, 5);
      if (raw) slotSet.add(normalizeSlot(raw));
    });
    return [...slotSet].sort();
  }, [creneaux, enseignantFilter, jourFilter, niveauFilter, semestreFilter]);

  // ── Grid construction (keyed by canonical slot) ───────────────
  const grid = useMemo(() => {
    const map = {};
    creneaux.forEach(c => {
      if (enseignantFilter && String(c.id_enseignant) !== enseignantFilter) return;
      if (jourFilter      && c.jour     !== jourFilter)                     return;
      if (niveauFilter    && c.niveau   !== niveauFilter)                   return;
      if (semestreFilter  && c.semestre !== semestreFilter)                 return;
      const raw = (c.heure_debut || '').slice(0, 5);
      const slot = normalizeSlot(raw);
      const key = `${c.jour}-${slot}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [creneaux, enseignantFilter, jourFilter, niveauFilter, semestreFilter]);

  // ── Form dropdown: canonical slots only ───────────────────────
  const formHeures = CANONICAL_SLOTS;

  // ── Dynamic salles: merge hardcoded + data-derived ────────────
  const allSallesFromData = useMemo(() => {
    const set = new Set(TOUTES_SALLES);
    creneaux.forEach(c => { if (c.salle) set.add(c.salle); });
    return [...set].sort();
  }, [creneaux]);

  const sallesForType = useMemo(() => {
    const base = SALLES[form.type_seance] || allSallesFromData;
    // Also include any data-derived salles not in the hardcoded list
    const extra = new Set(base);
    creneaux.forEach(c => {
      if (c.type_seance === form.type_seance && c.salle) extra.add(c.salle);
    });
    return [...extra].sort();
  }, [form.type_seance, creneaux, allSallesFromData]);

  function getWeekLabel() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday through Saturday
    const moisFr = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `Semaine du ${start.getDate()} au ${end.getDate()} ${moisFr[end.getMonth()]} ${end.getFullYear()}`;
  }

  // ── Submit ────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (!form.id_affectation) { showToast('Veuillez sélectionner une affectation', 'error'); return; }
    if (!form.salle)          { showToast('Veuillez sélectionner une salle', 'error'); return; }

    // Block if hard conflicts exist
    if (liveConflicts.length > 0) {
      showToast('Impossible : résolvez les conflits avant d\'enregistrer', 'error');
      return;
    }

    const payload = { ...form };
    if (editingId) payload.id_creneau = editingId;

    api.put('/agent/edt', payload)
      .then(() => {
        showToast(editingId ? 'Créneau modifié' : 'Créneau ajouté', 'success');
        resetForm();
        api.get('/agent/edt').then(r => setCreneaux(r.data));
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur', 'error'));
  }

  // ── When affectation changes: auto-update type + salle ────────
  function handleAffectationChange(val) {
    const selected = affectations.find(a => String(a.id_affectation) === val);
    const newType = selected ? selected.type_seance : 'CM';
    const defaultSalle = (SALLES[newType] || SALLES.CM)[0];
    setForm(prev => ({ ...prev, id_affectation: val, type_seance: newType, salle: defaultSalle }));
  }

  // ── When heure_debut changes: update salle suggestions + fin ─
  function handleHeureChange(val) {
    setForm(prev => ({ ...prev, heure_debut: val, heure_fin: calcEndTime(val) }));
  }

  function handleEdit(creneau) {
    const type = creneau.type_seance || 'CM';
    setForm({
      id_affectation: String(creneau.id_affectation),
      jour: creneau.jour,
      heure_debut: (creneau.heure_debut || '').slice(0, 5),
      heure_fin:   (creneau.heure_fin   || '').slice(0, 5),
      salle: creneau.salle || (SALLES[type] || SALLES.CM)[0],
      type_seance: type,
    });
    setEditingId(creneau.id_creneau);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    if (!window.confirm('Supprimer ce créneau ?')) return;
    api.delete(`/agent/edt/${id}`)
      .then(() => {
        setCreneaux(prev => prev.filter(c => c.id_creneau !== id));
        showToast('Créneau supprimé', 'success');
      })
      .catch(() => showToast('Erreur suppression', 'error'));
  }

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const filteredCreneaux = creneaux.filter(c => {
    if (enseignantFilter && String(c.id_enseignant) !== enseignantFilter) return false;
    if (jourFilter       && c.jour    !== jourFilter)                     return false;
    if (niveauFilter     && c.niveau  !== niveauFilter)                   return false;
    if (semestreFilter   && c.semestre !== semestreFilter)                 return false;
    return true;
  });
  const uniqueEnseignants = [...new Set(filteredCreneaux.map(c => c.nom_enseignant))].length;

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <h2 className="page-header__title">Gestion de l'Emploi du Temps</h2>
        <button className="btn btn--primary" onClick={() => {
          if (showForm && !editingId) { resetForm(); }
          else { setForm(emptyForm); setEditingId(null); setShowForm(true); }
        }}>
          {showForm && !editingId ? <X /> : <Plus />}
          {showForm && !editingId ? 'Annuler' : 'Ajouter créneau'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>Filtres :</span>
        <select className="filter-bar__select" value={enseignantFilter} onChange={e => setEnseignantFilter(e.target.value)}>
          <option value="">Tous les enseignants</option>
          {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
        </select>
        <select className="filter-bar__select" value={jourFilter} onChange={e => setJourFilter(e.target.value)}>
          <option value="">Tous les jours</option>
          {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <select className="filter-bar__select" value={niveauFilter} onChange={e => { setNiveauFilter(e.target.value); setSemestreFilter(''); }}>
          <option value="">Tous les niveaux</option>
          <option value="L1">L1</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
        </select>
        <select className="filter-bar__select" value={semestreFilter} onChange={e => setSemestreFilter(e.target.value)} disabled={!niveauFilter}>
          <option value="">{niveauFilter ? 'Tous les semestres' : 'Choisir un niveau'}</option>
          {(EDT_NIVEAU_SEMESTERS[niveauFilter] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <h4 className="form-panel__title">{editingId ? 'Modifier le créneau' : 'Nouveau créneau'}</h4>

          {/* Conflict alerts */}
          {liveConflicts.length > 0 && (
            <div style={{
              background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14,
            }}>
              {liveConflicts.map((msg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#856404', marginBottom: i < liveConflicts.length - 1 ? 6 : 0 }}>
                  <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Row 1 : Affectation */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Affectation (Enseignant → Module → Groupe)</label>
              <select required value={form.id_affectation} onChange={e => handleAffectationChange(e.target.value)}>
                <option value="">Sélectionner une affectation</option>
                {affectations.map(a => (
                  <option key={a.id_affectation} value={a.id_affectation}>
                    [{a.type_seance}] {a.nom_enseignant} {a.prenom_enseignant} — {a.nom_module} — {a.libelle_groupe || a.section || 'Section entière'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 : Jour + Heures */}
          <div className="form-row">
            <div className="form-group">
              <label>Jour</label>
              <select value={form.jour} onChange={e => setForm({ ...form, jour: e.target.value })}>
                {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Heure début</label>
              <select value={form.heure_debut} onChange={e => handleHeureChange(e.target.value)}>
                {formHeures.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Heure fin <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>(auto +1h30)</span></label>
              <input value={form.heure_fin} readOnly
                style={{ background: 'var(--surface-bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
            </div>
          </div>

          {/* Row 3 : Salle (pré-sélectionnée selon type) + Type */}
          <div className="form-row">
            <div className="form-group">
              <label>
                Salle
                {form.type_seance && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>
                    (salles {form.type_seance})
                  </span>
                )}
              </label>
              <select
                required
                value={form.salle}
                onChange={e => setForm({ ...form, salle: e.target.value })}
              >
                {sallesForType.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Type de séance <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>(hérité)</span></label>
              <select value={form.type_seance} disabled
                style={{ background: 'var(--surface-bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                <option value="CM">CM</option>
                <option value="TD">TD</option>
                <option value="TP">TP</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn--primary" disabled={liveConflicts.length > 0}>
              {editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            <button type="button" className="btn btn--secondary" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      {/* Week label */}
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
        {getWeekLabel()}
      </div>

      {/* Weekly grid */}
      <div className="data-card" style={{ overflow: 'auto' }}>
        <table className="data-table edt-grid" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 70, textAlign: 'center' }} />
              {JOURS.map(j => <th key={j} style={{ textAlign: 'center', fontWeight: 600 }}>{j}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={JOURS.length + 1} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : dynamicHeures.length === 0 ? (
              <tr><td colSpan={JOURS.length + 1} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 14 }}>
                Aucun créneau trouvé pour les filtres sélectionnés.
              </td></tr>
            ) : (
              dynamicHeures.map(h => (
                <tr key={h}>
                  {/* Time label — plage horaire */}
                  <td style={{
                    fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'top', paddingTop: 14,
                    lineHeight: 1.6
                  }}>
                    {PERIOD_DISPLAY[h] || `${h} – ${calcEndTime(h)}`}
                  </td>

                  {JOURS.map(j => {
                    const items = grid[`${j}-${h}`] || [];
                    return (
                      <td key={j} style={{ padding: 4, verticalAlign: 'top', minHeight: 80, minWidth: 160 }}>
                        {items.map(c => {
                          const colors = TYPE_COLORS[c.type_seance] || TYPE_COLORS.CM;
                          return (
                            <div key={c.id_creneau} style={{
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 10,
                              padding: '8px 10px',
                              marginBottom: 4,
                              fontSize: 13,
                              lineHeight: 1.5,
                              position: 'relative',
                              paddingBottom: 32, // space for action buttons
                              transition: 'box-shadow 0.15s ease'
                            }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                              {/* Module name */}
                              <strong style={{ display: 'block', color: colors.text }}>
                                {c.nom_module}
                              </strong>

                              {/* Teacher · room */}
                              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                {(c.prenom_enseignant || '').charAt(0)}. {c.nom_enseignant} · {c.salle || '—'}
                              </span>

                              {/* Type badge — top right */}
                              <span style={{
                                position: 'absolute', top: 6, right: 8,
                                fontSize: 10, fontWeight: 700, color: '#fff',
                                background: colors.badge, borderRadius: 4, padding: '2px 6px',
                              }}>
                                {c.type_seance}
                              </span>

                              {/* Action buttons — bottom right: Edit + Delete */}
                              <div style={{
                                position: 'absolute', bottom: 6, right: 6,
                                display: 'flex', gap: 4,
                              }}>
                                {/* Modifier */}
                                <button
                                  onClick={ev => { ev.stopPropagation(); handleEdit(c); }}
                                  title="Modifier"
                                  style={{
                                    background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: 5, padding: '3px 6px', cursor: 'pointer',
                                    color: colors.text, display: 'flex', alignItems: 'center', gap: 3, fontSize: 11,
                                  }}
                                >
                                  <Edit2 style={{ width: 11, height: 11 }} /> Modifier
                                </button>

                                {/* Supprimer */}
                                <button
                                  onClick={ev => { ev.stopPropagation(); handleDelete(c.id_creneau); }}
                                  title="Supprimer ce créneau"
                                  style={{
                                    background: 'rgba(254,226,226,0.9)', border: '1px solid rgba(229,62,62,0.3)',
                                    borderRadius: 5, padding: '3px 6px', cursor: 'pointer',
                                    color: '#c53030', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11,
                                  }}
                                >
                                  <Trash2 style={{ width: 11, height: 11 }} /> Supprimer
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            Liste des créneaux — Semaine
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {filteredCreneaux.length} créneaux programmés · {uniqueEnseignants} enseignant{uniqueEnseignants > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
