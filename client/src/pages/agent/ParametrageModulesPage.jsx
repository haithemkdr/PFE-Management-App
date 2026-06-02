// ParametrageModulesPage.jsx — Panneau de contrôle à onglets
// Onglet 1 : Paramétrage des modules (coefficient + crédits)
// Onglet 2 : Gestion des responsables de modules (dashboard module-centric)
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Pencil, Filter, RotateCcw, Package, CheckCircle, AlertTriangle, X, Search, UserCheck, Users } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import '../shared.css';

const NIVEAU_SEMESTERS = {
  L1: [{ value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' }],
  L2: [{ value: 'S3', label: 'Semestre 3' }, { value: 'S4', label: 'Semestre 4' }],
  L3: [{ value: 'S5', label: 'Semestre 5' }, { value: 'S6', label: 'Semestre 6' }]
};

function niveauFromSemestre(sem) {
  for (const [niv, sems] of Object.entries(NIVEAU_SEMESTERS)) {
    if (sems.some(s => s.value === sem)) return niv;
  }
  return '';
}

// ─────────────────────────────────────────────
// Onglet 1 : Paramétrage des Modules
// ─────────────────────────────────────────────
function TabParametrage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { id_module: '', coefficient: 3, credits: 6, annee_univ: '2024/2025', _niveau: '', semestre: '' };
  const [form, setForm] = useState(emptyForm);
  const [showFilter, setShowFilter] = useState(false);
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterSemestre, setFilterSemestre] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  useEffect(() => { loadModules(); }, []);

  function loadModules() {
    setLoading(true);
    api.get('/agent/modules')
      .then(res => setModules(res.data))
      .catch(() => showToast('Erreur chargement modules', 'error'))
      .finally(() => setLoading(false));
  }

  const filteredModules = useMemo(() => {
    let result = modules;
    if (filterSemestre) result = result.filter(m => m.semestre === filterSemestre);
    else if (filterNiveau) {
      const valid = (NIVEAU_SEMESTERS[filterNiveau] || []).map(s => s.value);
      result = result.filter(m => valid.includes(m.semestre));
    }
    return result;
  }, [modules, filterNiveau, filterSemestre]);

  function handleEdit(m) {
    setEditingId(m.id_module);
    setForm({ id_module: m.id_module, coefficient: m.coefficient, credits: m.credits || 6, annee_univ: '2024/2025', _niveau: niveauFromSemestre(m.semestre), semestre: m.semestre });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.id_module) { showToast('Veuillez sélectionner un module', 'error'); return; }
    const payload = { id_module: form.id_module, coefficient: parseFloat(form.coefficient), semestre: form.semestre, credits: parseInt(form.credits) };
    api.put(`/agent/modules/${form.id_module}/regles-notes`, payload)
      .then(() => { showToast(editingId ? 'Module modifié avec succès' : 'Paramétrage enregistré', 'success'); resetForm(); loadModules(); })
      .catch(err => showToast(err.response?.data?.message || 'Erreur serveur', 'error'));
  }

  function resetForm() { setEditingId(null); setForm(emptyForm); }

  function handleResetRule(m) {
    setConfirmDialog({
      open: true,
      title: 'Réinitialiser le paramétrage',
      message: `Réinitialiser "${m.nom_module}" aux valeurs par défaut ?\n(Coef: 3, Crédits: 6)`,
      onConfirm: () => {
        api.put(`/agent/modules/${m.id_module}/regles-notes`, { id_module: m.id_module, coefficient: 3, credits: 6 })
          .then(() => { showToast('Paramétrage réinitialisé', 'success'); loadModules(); })
          .catch(err => showToast(err.response?.data?.message || 'Erreur', 'error'));
      }
    });
  }

  function showToast(msg, type) { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  function getPoidsBadge(poids, label) {
    const pct = Math.round((poids || 0) * 100);
    if (pct === 0) return <span className="result-badge result-badge--rat" title={label}>—</span>;
    return <span className="result-badge result-badge--adm" title={label}>{pct}%</span>;
  }

  return (
    <>
      <div className="split-layout">
        <div className="form-panel">
          <h4 className="form-panel__title">{editingId ? 'Modifier le paramétrage' : 'Paramétrage du module'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Module</label>
              <select required value={form.id_module} onChange={e => setForm({ ...form, id_module: e.target.value })}>
                <option value="">Sélectionner module</option>
                {modules.map(m => <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Coefficient</label>
              <select value={form.coefficient} onChange={e => setForm({ ...form, coefficient: e.target.value })}>
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Crédits</label>
              <select value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Année Univ.</label>
              <select value={form.annee_univ} onChange={e => setForm({ ...form, annee_univ: e.target.value })}>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Niveau</label>
              <select value={form._niveau} onChange={e => setForm({ ...form, _niveau: e.target.value, semestre: '' })}>
                <option value="">Sélectionner niveau</option>
                <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Semestre</label>
              <select value={form.semestre} onChange={e => setForm({ ...form, semestre: e.target.value })} disabled={!form._niveau}>
                <option value="">{form._niveau ? 'Sélectionner semestre' : 'Choisir un niveau d\'abord'}</option>
                {(NIVEAU_SEMESTERS[form._niveau] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn--primary">Enregistrer</button>
              <button type="button" className="btn btn--secondary" onClick={resetForm}>Annuler</button>
            </div>
          </form>
        </div>

        <div className="data-card">
          <div className="data-card__header">
            <h4 className="data-card__title">Modules configurés</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge--primary">{filteredModules.length} modules</span>
              <button className="btn btn--outline btn--sm" onClick={() => setShowFilter(!showFilter)}><Filter size={14} /> Filtrer</button>
            </div>
          </div>
          {showFilter && (
            <div className="filter-bar" style={{ gap: 8 }}>
              <select className="filter-bar__select" value={filterNiveau} onChange={e => { setFilterNiveau(e.target.value); setFilterSemestre(''); }}>
                <option value="">Tous les niveaux</option>
                <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
              </select>
              <select className="filter-bar__select" value={filterSemestre} onChange={e => setFilterSemestre(e.target.value)} disabled={!filterNiveau}>
                <option value="">{filterNiveau ? 'Tous les semestres' : 'Choisir un niveau'}</option>
                {(NIVEAU_SEMESTERS[filterNiveau] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
          <table className="data-table">
            <thead><tr><th>Module</th><th>Coef.</th><th>Crédits</th><th>Semestre</th><th title="Défini par le coordonnateur">Exam</th><th title="Défini par le coordonnateur">TD</th><th title="Défini par le coordonnateur">TP</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
              ) : filteredModules.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun module</td></tr>
              ) : filteredModules.map(m => (
                <tr key={m.id_module}>
                  <td>{m.nom_module}</td><td>{m.coefficient}</td><td>{m.credits}</td><td>{m.semestre}</td>
                  <td>{getPoidsBadge(m.poids_exam, 'Examen')}</td><td>{getPoidsBadge(m.poids_td, 'TD')}</td><td>{getPoidsBadge(m.poids_tp, 'TP')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="action-icon action-icon--edit" title="Modifier" onClick={() => handleEdit(m)}><Pencil size={15} /></button>
                      <button className="action-icon" title="Réinitialiser" onClick={() => handleResetRule(m)} style={{ color: 'var(--warning, #f59e0b)' }}><RotateCcw size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog({ ...confirmDialog, open: false });
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Onglet 2 : Responsables de Modules
// ─────────────────────────────────────────────
function TabResponsables() {
  const [modules, setModules] = useState([]);
  const [allEnseignants, setAllEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterSemestre, setFilterSemestre] = useState('');
  // Modal state
  const [modalModule, setModalModule] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  useEffect(() => { loadData(); }, []);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get('/agent/modules-responsables'),
      api.get('/agent/enseignants')
    ])
      .then(([modRes, ensRes]) => {
        // Dedup: keep only one row per id_module (API may return duplicates from JOIN)
        const seen = new Set();
        const uniqueModules = (modRes.data || []).filter(m => {
          if (seen.has(m.id_module)) return false;
          seen.add(m.id_module);
          return true;
        });
        setModules(uniqueModules);
        setAllEnseignants(ensRes.data);
      })
      .catch(() => showToast('Erreur chargement données', 'error'))
      .finally(() => setLoading(false));
  }

  function showToast(msg, type) { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  // ── Filtrage ──
  const filtered = useMemo(() => {
    let result = modules;
    if (filterSemestre) result = result.filter(m => m.semestre === filterSemestre);
    else if (filterNiveau) {
      const valid = (NIVEAU_SEMESTERS[filterNiveau] || []).map(s => s.value);
      result = result.filter(m => valid.includes(m.semestre));
    }
    return result;
  }, [modules, filterNiveau, filterSemestre]);

  // ── KPIs ──
  const total = filtered.length;
  const assigned = filtered.filter(m => m.resp_id).length;
  const unassigned = total - assigned;
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;

  // ── Assigner un responsable ──
  function handleAssign(mod, id_utilisateur) {
    setAssigning(true);
    api.put(`/agent/modules/${mod.id_module}/responsable`, { id_utilisateur })
      .then(res => {
        showToast(res.data.message, 'success');
        setModalModule(null);
        setSearchQuery('');
        loadData();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur', 'error'))
      .finally(() => setAssigning(false));
  }

  // ── Retirer responsable ──
  function handleRemove(mod) {
    setConfirmDialog({
      open: true,
      title: 'Retirer le responsable',
      message: `Êtes-vous sûr de vouloir retirer le responsable de "${mod.nom_module}" ?`,
      onConfirm: () => {
        handleAssign(mod, null);
      }
    });
  }

  // ── Recherche globale dans la modale ──
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allEnseignants.filter(e =>
      `${e.nom} ${e.prenom}`.toLowerCase().includes(q) ||
      (e.email && e.email.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery, allEnseignants]);

  // Helper: initials
  function initials(nom, prenom) {
    return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__icon kpi-card__icon--info"><Package size={22} /></div>
          <div className="kpi-card__body">
            <span className="kpi-card__number">{total}</span>
            <span className="kpi-card__label">Total des modules</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__icon kpi-card__icon--success"><CheckCircle size={22} /></div>
          <div className="kpi-card__body">
            <span className="kpi-card__number">{assigned}</span>
            <span className="kpi-card__label">Avec responsable</span>
            <div className="progress-bar">
              <div className={`progress-bar__fill progress-bar__fill--${pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="kpi-card kpi-card--danger">
          <div className="kpi-card__icon kpi-card__icon--danger"><AlertTriangle size={22} /></div>
          <div className="kpi-card__body">
            <span className="kpi-card__number">{unassigned}</span>
            <span className="kpi-card__label">Sans responsable</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <select className="filter-bar__select" value={filterNiveau} onChange={e => { setFilterNiveau(e.target.value); setFilterSemestre(''); }}>
          <option value="">Tous les niveaux</option>
          <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
        </select>
        <select className="filter-bar__select" value={filterSemestre} onChange={e => setFilterSemestre(e.target.value)} disabled={!filterNiveau}>
          <option value="">{filterNiveau ? 'Tous les semestres' : 'Choisir un niveau'}</option>
          {(NIVEAU_SEMESTERS[filterNiveau] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="filter-bar__spacer" />
        <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
          Couverture : <strong>{pct}%</strong>
        </span>
      </div>

      {/* Tableau */}
      <div className="data-card">
        <div className="data-card__header">
          <h4 className="data-card__title">Modules — Responsables de matière</h4>
          <span className="badge badge--primary">{filtered.length} modules</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Module</th><th>Semestre</th><th>Responsable actuel</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun module trouvé</td></tr>
            ) : filtered.map(m => (
              <tr key={m.id_module}>
                <td><strong>{m.nom_module}</strong>{m.titre_ue && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.titre_ue}</span>}</td>
                <td><span className="session-info__tag">{niveauFromSemestre(m.semestre)} / {m.semestre}</span></td>
                <td>
                  {m.resp_id ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{m.resp_prenom} {m.resp_nom}</span>
                      <span className="grade-badge">{m.resp_grade}</span>
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td>
                  {m.resp_id
                    ? <span className="status-badge status-badge--actif">Assigné</span>
                    : <span className="status-badge status-badge--inactif">Non assigné</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn--sm btn--primary" onClick={() => { setModalModule(m); setSearchQuery(''); }}>
                      {m.resp_id ? 'Modifier' : 'Affecter'}
                    </button>
                    {m.resp_id && (
                      <button className="btn btn--sm btn--outline" onClick={() => handleRemove(m)} title="Retirer le responsable">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modale d'affectation */}
      {modalModule && (
        <div className="modal-overlay" onClick={() => setModalModule(null)}>
          <div className="modal-content modal-content--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Affecter un responsable</h3>
              <button className="modal-close" onClick={() => setModalModule(null)}><X size={20} /></button>
            </div>
            <p className="modal-subtitle">
              Module : <strong>{modalModule.nom_module}</strong> — {niveauFromSemestre(modalModule.semestre)} / {modalModule.semestre}
            </p>

            {/* Section recommandations */}
            {modalModule.candidats?.length > 0 && (
              <>
                <div className="modal-section-title"><Users size={14} /> Enseignants affectés à ce module</div>
                <div className="candidate-list">
                  {modalModule.candidats.map(c => {
                    const isCM = c.type_seance === 'CM';
                    const isCurrentResp = c.est_responsable_matiere === 1;
                    return (
                      <div key={c.id_affectation} className={`candidate-card${isCurrentResp ? ' candidate-card--active' : ''}${!isCM ? ' candidate-card--disabled' : ''}`}>
                        <div className="candidate-card__avatar">{initials(c.nom, c.prenom)}</div>
                        <div className="candidate-card__info">
                          <div className="candidate-card__name">{c.prenom} {c.nom}</div>
                          <div className="candidate-card__meta">
                            <span className={`type-seance-badge type-seance-badge--${c.type_seance.toLowerCase()}`}>{c.type_seance}</span>
                            {c.grade && <span className="grade-badge">{c.grade}</span>}
                            {isCurrentResp && <span className="status-badge status-badge--actif" style={{ fontSize: 10, padding: '1px 8px' }}>Responsable actuel</span>}
                          </div>
                        </div>
                        <div className="candidate-card__action">
                          {isCM && !isCurrentResp && (
                            <button className="btn btn--sm btn--success" disabled={assigning} onClick={() => handleAssign(modalModule, c.id_utilisateur)}>
                              <UserCheck size={14} /> Confirmer
                            </button>
                          )}
                          {!isCM && <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title="Seul un enseignant CM peut être responsable">CM requis</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <hr className="modal-divider" />

            {/* Recherche globale */}
            <div className="modal-section-title"><Search size={14} /> Recherche globale</div>
            <div className="search-autocomplete">
              <Search size={16} className="search-autocomplete__icon" />
              <input
                className="search-autocomplete__input"
                placeholder="Rechercher un enseignant par nom..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery.length >= 2 && (
                <div className="search-autocomplete__results">
                  {searchResults.length === 0 ? (
                    <div className="search-autocomplete__empty">Aucun enseignant trouvé</div>
                  ) : searchResults.map(e => (
                    <div key={e.id_utilisateur} className="search-autocomplete__item" onClick={() => handleAssign(modalModule, e.id_utilisateur)}>
                      <div className="candidate-card__avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(e.nom, e.prenom)}</div>
                      <span><strong>{e.prenom} {e.nom}</strong></span>
                      {e.grade && <span className="grade-badge">{e.grade}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog({ ...confirmDialog, open: false });
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Page principale avec onglets
// ─────────────────────────────────────────────
export default function ParametrageModulesPage() {
  const [activeTab, setActiveTab] = useState('parametrage');

  return (
    <>
      <div className="page-header">
        <h2 className="page-header__title">Paramétrage & Responsables</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Panneau de contrôle des modules : configuration et affectation des responsables.
        </p>
      </div>

      <div className="tab-bar">
        <button className={`tab-bar__item${activeTab === 'parametrage' ? ' tab-bar__item--active' : ''}`} onClick={() => setActiveTab('parametrage')}>
          <Pencil size={15} /> Paramétrage des Modules
        </button>
        <button className={`tab-bar__item${activeTab === 'responsables' ? ' tab-bar__item--active' : ''}`} onClick={() => setActiveTab('responsables')}>
          <UserCheck size={15} /> Responsables de Modules
        </button>
      </div>

      {activeTab === 'parametrage' && <TabParametrage />}
      {activeTab === 'responsables' && <TabResponsables />}
    </>
  );
}
