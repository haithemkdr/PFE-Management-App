// AffectationsPage.jsx — Gestion des Affectations (Agent Pédagogique)
// Layout Figma P10 : FormCard (340px) | AffTable (flex-1) — split-layout
// CRUD complet : Créer, Lire, Modifier, Supprimer les affectations enseignant → module → groupe
// Cascading filters : Semestre → Module, Niveau → Section → Groupe
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Search, Pencil, Trash2, Download } from 'lucide-react';
import '../shared.css';

export default function AffectationsPage() {
  // ─── États principaux ───
  const [affectations, setAffectations] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [modules, setModules] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── États du formulaire ───
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // ─── États des filtres (tableau) ───
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  // Formulaire vide par défaut (Figma P10 fields)
  const emptyForm = {
    id_utilisateur: '',
    id_module: '',
    id_groupe: '',
    annee_univ: '2025-2026',
    type_seance: 'TD',
    // Cascading helpers (not sent to backend, just for UI filtering)
    _semestre: '',
    _niveau: '',
    _section: ''
  };
  const [form, setForm] = useState(emptyForm);

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Chargement initial des données en parallèle ───
  useEffect(() => {
    loadAll();
  }, []);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get('/agent/affectations'),
      api.get('/agent/enseignants'),
      api.get('/agent/modules'),
      api.get('/agent/groupes')
    ])
      .then(([aff, ens, mod, grp]) => {
        setAffectations(aff.data);
        setEnseignants(ens.data);
        setModules(mod.data);
        setGroupes(grp.data);
      })
      .catch(() => showToast('Erreur chargement données', 'error'))
      .finally(() => setLoading(false));
  }

  // ─── Niveau → Semestre mapping (LMD standard) ───
  const NIVEAU_SEMESTERS = {
    L1: [{ value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' }],
    L2: [{ value: 'S3', label: 'Semestre 3' }, { value: 'S4', label: 'Semestre 4' }],
    L3: [{ value: 'S5', label: 'Semestre 5' }, { value: 'S6', label: 'Semestre 6' }]
  };
  const NIVEAUX = ['L1', 'L2', 'L3'];

  // Available semesters filtered by selected niveau
  const availableSemesters = useMemo(() => {
    if (!form._niveau) return [];
    return NIVEAU_SEMESTERS[form._niveau] || [];
  }, [form._niveau]);

  const filteredModules = useMemo(() => {
    if (!form._semestre) return modules;
    return modules.filter(m => m.semestre === form._semestre);
  }, [modules, form._semestre]);

  const filteredSections = useMemo(() => {
    if (!form._niveau) return [];
    let set = new Set(
      groupes.filter(g => g.niveau === form._niveau).map(g => g.section).filter(Boolean)
    );
    return [...set].sort();
  }, [groupes, form._niveau]);

  const filteredGroupes = useMemo(() => {
    if (!form._niveau) return groupes;
    let result = groupes.filter(g => g.niveau === form._niveau);
    if (form._section) {
      result = result.filter(g => g.section === form._section);
    }
    return result;
  }, [groupes, form._niveau, form._section]);

  // ─── Filtrage des affectations (tableau) ───
  const filtered = useMemo(() => {
    return affectations.filter(a => {
      // Recherche par nom enseignant, module, ou groupe
      let txt = search.toLowerCase();
      let matchSearch = !search ||
        (a.nom_enseignant + ' ' + a.prenom_enseignant).toLowerCase().includes(txt) ||
        a.nom_module?.toLowerCase().includes(txt) ||
        a.libelle_groupe?.toLowerCase().includes(txt) ||
        a.niveau?.toLowerCase().includes(txt) ||
        a.section?.toLowerCase().includes(txt);

      // Filtre par module
      let matchModule = !moduleFilter || String(a.id_module) === moduleFilter;

      return matchSearch && matchModule;
    });
  }, [affectations, search, moduleFilter]);

  // ─── Créer ou modifier une affectation ───
  function handleSubmit(e) {
    e.preventDefault();

    // Payload — include type_seance + section/niveau
    let payload = {
      id_utilisateur: form.id_utilisateur,
      id_module: form.id_module,
      annee_univ: form.annee_univ,
      type_seance: form.type_seance || 'TD',
      section: form._section || null,
      niveau: form._niveau || null
    };

    // CM → pas de groupe, TD/TP → groupe obligatoire
    if (form.type_seance === 'CM') {
      payload.id_groupe = null;
      if (!payload.section || !payload.niveau) {
        showToast('Pour une affectation CM, le niveau et la section sont obligatoires.', 'error');
        return;
      }
    } else {
      payload.id_groupe = form.id_groupe;
      if (!payload.id_groupe) {
        showToast('Pour une affectation TD/TP, le groupe est obligatoire.', 'error');
        return;
      }
    }

    // Vérification côté client — champs communs toujours obligatoires
    if (!payload.id_utilisateur || !payload.id_module || !payload.annee_univ) {
      showToast('Enseignant, Module et Année sont obligatoires.', 'error');
      return;
    }

    if (editingId) {
      // Mode édition — PUT /agent/affectations/:id
      api.put(`/agent/affectations/${editingId}`, payload)
        .then(() => {
          showToast('Affectation modifiée avec succès', 'success');
          resetForm();
          loadAll();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur modification', 'error'));
    } else {
      // Mode création — POST /agent/affectation
      api.post('/agent/affectation', payload)
        .then(() => {
          showToast('Affectation créée avec succès', 'success');
          resetForm();
          loadAll();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur création', 'error'));
    }
  }

  // ─── Pré-remplir le formulaire pour modification ───
  // Helper: derive niveau from semestre code
  function niveauFromSemestre(sem) {
    for (const [niv, sems] of Object.entries(NIVEAU_SEMESTERS)) {
      if (sems.some(s => s.value === sem)) return niv;
    }
    return '';
  }

  function handleEdit(aff) {
    // Reverse-lookup the groupe to get its niveau + section
    let grp = groupes.find(g => g.id_groupe === aff.id_groupe);
    let mod = modules.find(m => m.id_module === aff.id_module);
    const semestre = mod?.semestre || '';
    const niveau = aff.aff_niveau || grp?.niveau || niveauFromSemestre(semestre);
    setForm({
      id_utilisateur: aff.id_utilisateur,
      id_module: aff.id_module,
      id_groupe: aff.id_groupe || '',
      annee_univ: aff.annee_univ || '2025-2026',
      type_seance: aff.type_seance || 'TD',
      _semestre: semestre,
      _niveau: niveau,
      _section: aff.aff_section || grp?.section || ''
    });
    setEditingId(aff.id_affectation);
    // Scroll vers le haut du formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Supprimer une affectation ───
  function handleDelete(id) {
    if (!window.confirm('Supprimer cette affectation ?\nLes notes et absences liées seront aussi supprimées.')) return;
    api.delete(`/agent/affectations/${id}`)
      .then(() => {
        showToast('Affectation supprimée', 'success');
        setAffectations(prev => prev.filter(a => a.id_affectation !== id));
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur suppression', 'error'));
  }

  // ─── Toggle période de saisie (ouvrir / fermer) ───
  function handleTogglePeriode(id) {
    api.patch(`/agent/periodes/${id}/toggle`)
      .then(() => {
        setAffectations(prev => prev.map(a => {
          if (a.id_affectation === id) {
            return { ...a, periode_saisie_ouverte: !a.periode_saisie_ouverte };
          }
          return a;
        }));
        showToast('Période de saisie mise à jour', 'success');
      })
      .catch(() => showToast('Erreur changement période', 'error'));
  }

  // ─── Export CSV ───
  function handleExportCSV() {
    let headers = ['Enseignant', 'Module', 'Type', 'Niveau', 'Section', 'Groupe', 'Année', 'Semestre', 'Période'];
    let rows = filtered.map(a => [
      a.nom_enseignant + ' ' + a.prenom_enseignant,
      a.nom_module,
      a.type_seance || 'TD',
      a.niveau || '',
      a.section || '',
      a.libelle_groupe || (a.type_seance === 'CM' ? 'Section entière' : ''),
      a.annee_univ,
      a.semestre || '',
      a.periode_saisie_ouverte ? 'Ouverte' : 'Fermée'
    ]);
    let csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.download = 'affectations.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ─── Réinitialiser le formulaire ───
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  // ─── RENDU ───
  return (
    <>
      {/* Figma P10 : Split Layout — FormCard | AffTable */}
      <div className="split-layout">

        {/* ═══ Colonne Gauche : Formulaire Nouvelle Affectation ═══ */}
        <form className="form-panel" onSubmit={handleSubmit} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
          <h4 className="form-panel__title">{editingId ? 'Modifier Affectation' : 'Nouvelle Affectation'}</h4>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)', margin: '0 0 14px' }} />

          {/* Champ 1 : Enseignant */}
          <div className="form-group">
            <label>Enseignant</label>
            <select required value={form.id_utilisateur} onChange={e => setForm({ ...form, id_utilisateur: e.target.value })}>
              <option value="">Sélectionner enseignant</option>
              {enseignants.map(e => (
                <option key={e.id_utilisateur} value={e.id_utilisateur}>{e.nom} {e.prenom}</option>
              ))}
            </select>
          </div>

          {/* Champ 2 : Niveau (filters semestres, sections, groupes) */}
          <div className="form-group">
            <label>Niveau</label>
            <select
              value={form._niveau}
              onChange={e => setForm({ ...form, _niveau: e.target.value, _semestre: '', _section: '', id_groupe: '', id_module: '' })}
            >
              <option value="">Sélectionner niveau</option>
              {NIVEAUX.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Champ 3 : Semestre (filtered by niveau) */}
          <div className="form-group">
            <label>Semestre</label>
            <select
              value={form._semestre}
              onChange={e => setForm({ ...form, _semestre: e.target.value, id_module: '' })}
              disabled={!form._niveau}
            >
              <option value="">{form._niveau ? 'Sélectionner semestre' : 'Choisir un niveau d\'abord'}</option>
              {availableSemesters.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Champ 4 : Module (filtered by semestre) */}
          <div className="form-group">
            <label>Module</label>
            <select required value={form.id_module} onChange={e => setForm({ ...form, id_module: e.target.value })} disabled={!form._semestre}>
              <option value="">{form._semestre ? 'Sélectionner module' : 'Choisir un semestre d\'abord'}</option>
              {filteredModules.map(m => (
                <option key={m.id_module} value={m.id_module}>{m.nom_module} ({m.semestre})</option>
              ))}
            </select>
          </div>

          {/* Champ 5 : Section (filtered by niveau) */}
          <div className="form-group">
            <label>Section</label>
            <select
              value={form._section}
              onChange={e => setForm({ ...form, _section: e.target.value, id_groupe: '' })}
              disabled={!form._niveau}
            >
              <option value="">Toutes les sections</option>
              {filteredSections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Champ 6 : Type de séance */}
          <div className="form-group">
            <label>Type de séance</label>
            <select
              required
              value={form.type_seance}
              onChange={e => setForm({ ...form, type_seance: e.target.value, id_groupe: e.target.value === 'CM' ? '' : form.id_groupe })}
            >
              <option value="CM">CM (Cours Magistral — section entière)</option>
              <option value="TD">TD (Travaux Dirigés — groupe)</option>
              <option value="TP">TP (Travaux Pratiques — groupe)</option>
            </select>
          </div>

          {/* Champ 7 : Groupe (filtered by niveau + section) — masqué pour CM */}
          {form.type_seance !== 'CM' && (
            <div className="form-group">
              <label>Groupe</label>
              <select required value={form.id_groupe} onChange={e => setForm({ ...form, id_groupe: e.target.value })}>
                <option value="">Sélectionner groupe</option>
                {filteredGroupes.map(g => (
                  <option key={g.id_groupe} value={g.id_groupe}>
                    {g.libelle}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Année Universitaire</label>
            <select
              required
              value={form.annee_univ}
              onChange={e => setForm({ ...form, annee_univ: e.target.value })}
            >
              <option value="2024-2025">2024 / 2025</option>
              <option value="2025-2026">2025 / 2026</option>
              <option value="2026-2027">2026 / 2027</option>
            </select>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
              {editingId ? 'Enregistrer' : 'Affecter'}
            </button>
            {editingId && (
              <button type="button" className="btn btn--secondary" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>

        {/* ═══ Colonne Droite : Tableau des Affectations ═══ */}
        <div className="data-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
          {/* En-tête du tableau avec recherche et filtres */}
          <div className="data-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h4 className="data-card__title">
              Affectations
              <span className="badge badge--primary" style={{ marginLeft: 10 }}>{filtered.length} affectations</span>
            </h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Recherche */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 8, top: 8, width: 14, height: 14, color: 'var(--text-muted)' }} />
                <input
                  className="filter-bar__input"
                  style={{ paddingLeft: 28, width: 180 }}
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {/* Filtre par module */}
              <select className="filter-bar__select" style={{ minWidth: 140 }} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
                <option value="">Tous modules</option>
                {modules.map(m => (
                  <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>
                ))}
              </select>
              {/* Export CSV */}
              <button className="btn btn--outline btn--sm" onClick={handleExportCSV} title="Exporter CSV">
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* Tableau de données — Figma P10 columns: Enseignant, Module, Niveau, Section, Groupe, Période, Actions */}
          <table className="data-table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Module</th>
                <th>Type</th>
                <th>Niveau</th>
                <th>Section</th>
                <th>Groupe</th>
                <th>Période</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucune affectation trouvée</td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id_affectation}>
                    <td><strong>{a.nom_enseignant}</strong> {a.prenom_enseignant}</td>
                    <td>{a.nom_module}</td>
                    <td>
                      <span className={`type-seance-badge type-seance-badge--${(a.type_seance || 'td').toLowerCase()}`}>
                        {a.type_seance || 'TD'}
                      </span>
                    </td>
                    <td>{a.niveau || '—'}</td>
                    <td>{a.section ? `Section ${a.section}` : '—'}</td>
                    <td>{a.libelle_groupe || (a.type_seance === 'CM' ? 'Section entière' : '—')}</td>
                    <td>
                      <span
                        className={`status-badge ${a.periode_saisie_ouverte ? 'status-badge--ouverte' : 'status-badge--fermee'}`}
                        onClick={() => handleTogglePeriode(a.id_affectation)}
                        style={{ cursor: 'pointer' }}
                        title="Cliquer pour ouvrir/fermer la période"
                      >
                        {a.periode_saisie_ouverte ? 'Ouverte' : 'Fermée'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="action-icon action-icon--edit" title="Modifier" onClick={() => handleEdit(a)}>
                          <Pencil size={15} />
                        </button>
                        <button className="action-icon action-icon--delete" title="Supprimer" onClick={() => handleDelete(a.id_affectation)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast de feedback */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
