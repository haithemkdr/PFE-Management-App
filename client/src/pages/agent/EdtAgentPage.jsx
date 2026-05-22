import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Plus, X, Edit2, Trash2, Calendar } from 'lucide-react';
import '../shared.css';

/**
 * EdtAgentPage — Gestion de l'Emploi du Temps (UC-A06)
 * Corresponds to Figma Page 14 (node 51:13577)
 *
 * The agent can view, create, edit, and delete schedule slots.
 * Shows a weekly grid (Dimanche → Jeudi) with colored cards per type.
 *
 * Design: filter bar + weekly grid + "Ajouter créneau" button
 */

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
const HEURES = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];

// Figma color scheme per session type
const TYPE_COLORS = {
  CM: { bg: '#e8f5e9', border: '#a5d6a7', text: '#2e7d32', badge: '#43a047' },
  TD: { bg: '#e3f2fd', border: '#90caf9', text: '#1565c0', badge: '#1e88e5' },
  TP: { bg: '#fce4ec', border: '#f48fb1', text: '#c62828', badge: '#e57373' }
};

export default function EdtAgentPage() {
  const [creneaux, setCreneaux] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters — Figma: 3 selects (Enseignant, Jour, Semestre)
  const [enseignantFilter, setEnseignantFilter] = useState('');
  const [jourFilter, setJourFilter] = useState('');
  const [semestreFilter, setSemestreFilter] = useState('');

  const emptyForm = {
    id_affectation: '', jour: 'Dimanche',
    heure_debut: '08:00', heure_fin: '09:30',
    salle: '', type_seance: 'CM'
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    Promise.all([
      api.get('/agent/edt'),
      api.get('/agent/affectations')
    ])
      .then(([edt, aff]) => {
        setCreneaux(edt.data);
        setAffectations(aff.data);
      })
      .catch(() => showToast('Erreur chargement EDT', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Unique enseignants from affectations for filter
  const enseignants = useMemo(() => {
    const map = {};
    affectations.forEach(a => {
      if (!map[a.id_utilisateur]) {
        map[a.id_utilisateur] = { id: a.id_utilisateur, nom: a.nom_enseignant, prenom: a.prenom_enseignant };
      }
    });
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [affectations]);

  // Build grid: { 'Dimanche-08:00': [creneau, ...] }
  const grid = useMemo(() => {
    const map = {};
    creneaux.forEach(c => {
      // Apply filters
      if (enseignantFilter && String(c.nom_enseignant) !== enseignantFilter) return;
      if (jourFilter && c.jour !== jourFilter) return;
      const hNorm = (c.heure_debut || '').slice(0, 5); // '08:00:00' → '08:00'
      const key = `${c.jour}-${hNorm}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [creneaux, enseignantFilter, jourFilter]);

  // Get week label — Figma: "Semaine du 12 au 16 Mai 2025"
  function getWeekLabel() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);

    const moisFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    return `Semaine du ${start.getDate()} au ${end.getDate()} ${moisFr[end.getMonth()]} ${end.getFullYear()}`;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.id_affectation) {
      showToast('Veuillez sélectionner une affectation', 'error');
      return;
    }

    const payload = { ...form };
    if (editingId) payload.id_creneau = editingId;

    api.put('/agent/edt', payload)
      .then(() => {
        showToast(editingId ? 'Créneau modifié' : 'Créneau ajouté', 'success');
        setForm(emptyForm);
        setShowForm(false);
        setEditingId(null);
        api.get('/agent/edt').then(r => setCreneaux(r.data));
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur', 'error'));
  }

  function handleEdit(creneau) {
    setForm({
      id_affectation: String(creneau.id_affectation),
      jour: creneau.jour,
      heure_debut: (creneau.heure_debut || '').slice(0, 5),
      heure_fin: (creneau.heure_fin || '').slice(0, 5),
      salle: creneau.salle || '',
      type_seance: creneau.type_seance || 'CM'
    });
    setEditingId(creneau.id_creneau);
    setShowForm(true);
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

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Count filtered créneaux
  const filteredCreneaux = creneaux.filter(c => {
    if (enseignantFilter && c.nom_enseignant !== enseignantFilter) return false;
    if (jourFilter && c.jour !== jourFilter) return false;
    return true;
  });

  // Unique enseignant count in filtered
  const uniqueEnseignants = [...new Set(filteredCreneaux.map(c => c.nom_enseignant))].length;

  return (
    <>
      {/* Page header — Figma: "Gestion de l'Emploi du Temps" + "Ajouter créneau" button */}
      <div className="page-header">
        <h2 className="page-header__title">Gestion de l'Emploi du Temps</h2>
        <button
          className="btn btn--primary"
          onClick={() => {
            if (showForm && !editingId) {
              setShowForm(false);
            } else {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }
          }}
        >
          {showForm && !editingId ? <X /> : <Plus />}
          {showForm && !editingId ? 'Annuler' : 'Ajouter créneau'}
        </button>
      </div>

      {/* Filter bar — Figma: 3 filters (Enseignants, Jours, Semestre) */}
      <div className="filter-bar">
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>Filtres:</span>
        <select className="filter-bar__select" value={enseignantFilter} onChange={e => setEnseignantFilter(e.target.value)}>
          <option value="">Tous les enseignants</option>
          {enseignants.map(e => (
            <option key={e.id} value={e.nom}>{e.nom} {e.prenom}</option>
          ))}
        </select>
        <select className="filter-bar__select" value={jourFilter} onChange={e => setJourFilter(e.target.value)}>
          <option value="">Tous les jours</option>
          {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <select className="filter-bar__select" value={semestreFilter} onChange={e => setSemestreFilter(e.target.value)}>
          <option value="">Semestre 1</option>
          <option value="S1">Semestre 1</option>
          <option value="S2">Semestre 2</option>
        </select>
      </div>

      {/* Add/Edit form panel */}
      {showForm && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <h4 className="form-panel__title">
            {editingId ? 'Modifier le créneau' : 'Nouveau créneau'}
          </h4>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Affectation (Enseignant → Module → Groupe)</label>
              <select
                required
                value={form.id_affectation}
                onChange={e => setForm({ ...form, id_affectation: e.target.value })}
              >
                <option value="">Sélectionner une affectation</option>
                {affectations.map(a => (
                  <option key={a.id_affectation} value={a.id_affectation}>
                    {a.nom_enseignant} {a.prenom_enseignant} — {a.nom_module} — {a.libelle_groupe}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Jour</label>
              <select value={form.jour} onChange={e => setForm({ ...form, jour: e.target.value })}>
                {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Heure début</label>
              <select value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })}>
                {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Heure fin</label>
              <input
                value={form.heure_fin}
                onChange={e => setForm({ ...form, heure_fin: e.target.value })}
                placeholder="09:30"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Salle</label>
              <input
                value={form.salle}
                onChange={e => setForm({ ...form, salle: e.target.value })}
                placeholder="A101"
              />
            </div>
            <div className="form-group">
              <label>Type de séance</label>
              <select value={form.type_seance} onChange={e => setForm({ ...form, type_seance: e.target.value })}>
                <option value="CM">CM</option>
                <option value="TD">TD</option>
                <option value="TP">TP</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn--primary">
              {editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      {/* Week label — Figma: "Semaine du 12 au 16 Mai 2025" */}
      <div style={{
        fontFamily: 'var(--heading)', fontWeight: 600, fontSize: 'var(--font-size-body)',
        color: 'var(--text-primary)', marginBottom: 16
      }}>
        {getWeekLabel()}
      </div>

      {/* Weekly grid — Figma: 5 columns (Dim-Jeu) × 6 time rows */}
      <div className="data-card" style={{ overflow: 'auto' }}>
        <table className="data-table edt-grid" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 80, textAlign: 'center' }} />
              {JOURS.map(j => (
                <th key={j} style={{ textAlign: 'center', fontWeight: 600 }}>{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : (
              HEURES.map(h => (
                <tr key={h}>
                  <td style={{
                    fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'top',
                    paddingTop: 16
                  }}>
                    {h}
                  </td>
                  {JOURS.map(j => {
                    const items = grid[`${j}-${h}`] || [];
                    return (
                      <td key={j} style={{ padding: 4, verticalAlign: 'top', minHeight: 70, minWidth: 160 }}>
                        {items.map(c => {
                          const colors = TYPE_COLORS[c.type_seance] || TYPE_COLORS.CM;
                          return (
                            <div
                              key={c.id_creneau}
                              style={{
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 10,
                                padding: '8px 10px',
                                marginBottom: 4,
                                fontSize: 13,
                                lineHeight: 1.5,
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                              {/* Module name — bold + colored */}
                              <strong style={{ display: 'block', color: colors.text }}>
                                {c.nom_module}
                              </strong>

                              {/* Teacher + room */}
                              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                {(c.prenom_enseignant || '').charAt(0)}. {c.nom_enseignant} · {c.salle || '—'}
                              </span>

                              {/* Type badge — Figma: small colored pill top-right */}
                              <span style={{
                                position: 'absolute', top: 6, right: 8,
                                fontSize: 10, fontWeight: 700, color: '#fff',
                                background: colors.badge, borderRadius: 4, padding: '2px 6px',
                                letterSpacing: 0.3
                              }}>
                                {c.type_seance}
                              </span>

                              {/* Edit icon — Figma: pencil icon bottom-right */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                                style={{
                                  position: 'absolute', bottom: 6, right: 8,
                                  background: 'rgba(255,255,255,0.7)', border: 'none',
                                  borderRadius: 4, padding: '2px 4px', cursor: 'pointer',
                                  color: 'var(--text-secondary)', display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Modifier"
                              >
                                <Edit2 style={{ width: 12, height: 12 }} />
                              </button>
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

      {/* Summary — Figma: "Liste des créneaux — Semaine" with stats */}
      <div style={{
        marginTop: 16, display: 'flex', alignItems: 'center', gap: 8
      }}>
        <Calendar style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
        <div>
          <div style={{
            fontWeight: 600, fontSize: 14, color: 'var(--text-primary)'
          }}>
            Liste des créneaux — Semaine
          </div>
          <div style={{
            fontSize: 13, color: 'var(--text-secondary)'
          }}>
            {filteredCreneaux.length} créneaux programmés · {uniqueEnseignants} enseignants
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
