import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Scale, Eye, LockOpen, Download, AlertTriangle, CheckCircle,
  Clock, ShieldCheck, RefreshCw, Settings2,
  X, Lock, FileText, Bell
} from 'lucide-react';
import '../shared.css';

export default function ResponsableMatierePanel() {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [poids, setPoids] = useState({ poids_td: '', poids_tp: '', poids_exam: '' });
  const [groupStatuses, setGroupStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPoids, setSavingPoids] = useState(false);
  const [unlocking, setUnlocking] = useState({});
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('params');
  const [previewModal, setPreviewModal] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [relancing, setRelancing] = useState({});
  const [cloturing, setCloturing] = useState(false);
  const [showClotureConfirm, setShowClotureConfirm] = useState(false);

  useEffect(() => {
    api.get('/responsable/mes-modules')
      .then(res => {
        setModules(res.data);
        if (res.data.length > 0) setSelectedModule(res.data[0]);
      })
      .catch(err => console.error('Erreur chargement modules responsable:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedModule) return;
    loadGroupStatuses();
    setPoids({
      poids_td: selectedModule.poids_td != null ? Math.round(parseFloat(selectedModule.poids_td) * 100) : '',
      poids_tp: selectedModule.poids_tp != null ? Math.round(parseFloat(selectedModule.poids_tp) * 100) : '',
      poids_exam: selectedModule.poids_exam != null ? Math.round(parseFloat(selectedModule.poids_exam) * 100) : '',
    });
  }, [selectedModule]);

  async function loadGroupStatuses() {
    try {
      const res = await api.get(`/responsable/statut-groupes?id_module=${selectedModule.id_module}`);
      setGroupStatuses(res.data);
    } catch (err) {
      console.error('Erreur chargement statuts:', err);
    }
  }

  async function handleSavePoids() {
    setSavingPoids(true);
    try {
      await api.put('/responsable/poids', {
        id_module: selectedModule.id_module,
        poids_td: (parseFloat(poids.poids_td) || 0) / 100,
        poids_tp: (parseFloat(poids.poids_tp) || 0) / 100,
        poids_exam: (parseFloat(poids.poids_exam) || 0) / 100,
      });
      showToast('Pondérations mises à jour', 'success');
      setModules(prev => prev.map(m =>
        m.id_module === selectedModule.id_module
          ? { ...m, poids_td: (parseFloat(poids.poids_td) || 0) / 100, poids_tp: (parseFloat(poids.poids_tp) || 0) / 100, poids_exam: (parseFloat(poids.poids_exam) || 0) / 100 }
          : m
      ));
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setSavingPoids(false);
    }
  }

  async function handleDeverrouiller(idAffectation) {
    setUnlocking(prev => ({ ...prev, [idAffectation]: true }));
    try {
      await api.post('/responsable/deverrouiller', { id_affectation: idAffectation });
      showToast('Groupe déverrouillé', 'success');
      await loadGroupStatuses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du déverrouillage', 'error');
    } finally {
      setUnlocking(prev => ({ ...prev, [idAffectation]: false }));
    }
  }

  async function handleDownloadPV() {
    try {
      const res = await api.get(`/responsable/pv?id_module=${selectedModule.id_module}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PV_${selectedModule.nom_module || 'module'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('PV téléchargé', 'success');
    } catch (err) {
      showToast('Erreur lors du téléchargement du PV', 'error');
    }
  }

  async function handleRelancer(idAffectation) {
    setRelancing(prev => ({ ...prev, [idAffectation]: true }));
    try {
      const res = await api.post('/responsable/relancer', { id_affectation: idAffectation });
      showToast(res.data.message, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l\'envoi du rappel', 'error');
    } finally {
      setRelancing(prev => ({ ...prev, [idAffectation]: false }));
    }
  }

  async function handlePreviewNotes(idAffectation) {
    setPreviewLoading(true);
    try {
      const res = await api.get(`/responsable/apercu-notes?id_affectation=${idAffectation}`);
      setPreviewModal(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du chargement de l\'aperçu', 'error');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCloturer() {
    setCloturing(true);
    try {
      await api.post('/responsable/cloturer', { id_module: selectedModule.id_module });
      showToast('Module clôturé avec succès', 'success');
      setSelectedModule(prev => ({ ...prev, est_cloture: 1 }));
      setModules(prev => prev.map(m =>
        m.id_module === selectedModule.id_module ? { ...m, est_cloture: 1 } : m
      ));
      setShowClotureConfirm(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la clôture', 'error');
    } finally {
      setCloturing(false);
    }
  }

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const poidsSum = (parseFloat(poids.poids_td) || 0) + (parseFloat(poids.poids_tp) || 0) + (parseFloat(poids.poids_exam) || 0);
  const poidsValid = Math.abs(poidsSum - 100) < 0.01;
  const totalGroups = groupStatuses.length;
  const submittedGroups = groupStatuses.filter(g => g.statut_saisie === 'SOUMIS').length;
  const allSubmitted = totalGroups > 0 && submittedGroups === totalGroups;
  const progressPct = totalGroups > 0 ? Math.round((submittedGroups / totalGroups) * 100) : 0;
  const isCloture = selectedModule?.est_cloture === 1;
  const hasOngoingSaisie = submittedGroups > 0;

  if (loading) return <div className="empty-state">Chargement…</div>;

  if (modules.length === 0) {
    return (
      <div className="empty-state">
        <ShieldCheck />
        <p>Aucun module ne vous est attribué en tant que coordonnateur.</p>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>
          Seuls les enseignants CM (Chargé de cours) avec le rôle de responsable matière ont accès à ce panneau.
        </span>
      </div>
    );
  }

  const tabs = [
    { key: 'params', label: 'Paramètres & Pondérations', icon: <Scale size={15} /> },
    { key: 'suivi', label: 'Suivi des Groupes', icon: <Eye size={15} /> },
    { key: 'validation', label: 'Validation & Clôture', icon: <Lock size={15} /> },
  ];

  return (
    <div>
      {/* Sélecteur de module */}
      <div className="filter-bar">
        <Settings2 style={{ width: 18, height: 18, color: '#6b7280' }} />
        <select
          className="filter-bar__select"
          value={selectedModule?.id_module || ''}
          onChange={e => {
            const mod = modules.find(m => String(m.id_module) === e.target.value);
            setSelectedModule(mod);
          }}
        >
          {modules.map(m => (
            <option key={m.id_module} value={m.id_module}>
              {m.nom_module} — {m.niveau} {m.semestre}
            </option>
          ))}
        </select>
        <div className="filter-bar__spacer" />
        {isCloture && (
          <span className="status-badge status-badge--valide">
            <Lock size={12} style={{ marginRight: 4 }} /> Clôturé
          </span>
        )}
        <button className="btn btn--outline btn--sm" onClick={loadGroupStatuses} title="Actualiser">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Barre d'onglets */}
      <div className="rm-tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`rm-tab-bar__tab${activeTab === t.key ? ' rm-tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ========== Onglet 1 : Paramètres & Pondérations ========== */}
      {activeTab === 'params' && (
        <div>
          <div className="form-panel">
            <h3 className="form-panel__title">
              <Scale size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
              Pondérations d'évaluation
            </h3>

            {isCloture && (
              <div className="rm-alert rm-alert--warning" style={{ marginBottom: 16 }}>
                <AlertTriangle size={16} />
                <span>Module clôturé — les pondérations sont en lecture seule.</span>
              </div>
            )}

            {!isCloture && hasOngoingSaisie && (
              <div className="rm-alert rm-alert--warning" style={{ marginBottom: 16 }}>
                <AlertTriangle size={16} />
                <span>Attention : des enseignants ont déjà commencé la saisie. Modifier les poids entraînera un recalcul des moyennes.</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Poids TD (%)</label>
                <input type="number" min="0" max="100" step="1" disabled={isCloture}
                  value={poids.poids_td} onChange={e => setPoids({ ...poids, poids_td: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Poids TP (%)</label>
                <input type="number" min="0" max="100" step="1" disabled={isCloture}
                  value={poids.poids_tp} onChange={e => setPoids({ ...poids, poids_tp: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Poids Examen (%)</label>
                <input type="number" min="0" max="100" step="1" disabled={isCloture}
                  value={poids.poids_exam} onChange={e => setPoids({ ...poids, poids_exam: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: poidsValid ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                Total : {poidsSum.toFixed(0)}% {poidsValid ? '✓' : '(doit faire 100%)'}
              </span>
              {!isCloture && (
                <button className="btn btn--primary btn--sm" onClick={handleSavePoids}
                  disabled={savingPoids || !poidsValid}>
                  <Scale size={14} />
                  {savingPoids ? 'Enregistrement…' : 'Appliquer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== Onglet 2 : Suivi des Groupes ========== */}
      {activeTab === 'suivi' && (
        
        <div>
          
          {/* Barre de progression */}
          
          <div className="rm-progress-container">
            <div className="rm-progress-header">
              <span>Progression des soumissions</span>
              <span className="rm-progress-label">{submittedGroups}/{totalGroups} affectations — {progressPct}%</span>
            </div>
            <div className="rm-progress-bar">
              <div
                className={`rm-progress-bar__fill${progressPct === 100 ? ' rm-progress-bar__fill--complete' : ''}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="data-card">
            <div className="data-card__header">
              <span className="data-card__title">
                <Eye size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                Suivi des soumissions par groupe
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {allSubmitted && (
                  <span className="status-badge status-badge--valide">
                    <CheckCircle size={12} style={{ marginRight: 4 }} /> Tous soumis
                  </span>
                )}
              </div>
            </div>
            {groupStatuses.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                Aucun groupe TD/TP trouvé pour ce module
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Groupe</th>
                    <th>Type</th>
                    <th>Enseignant</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStatuses.map(g => (
                    <tr key={g.id_affectation}>
                      <td style={{ fontWeight: 500 }}>{g.nom_groupe}</td>
                      <td>
                        <span className={`type-seance-badge type-seance-badge--${g.type_seance?.toLowerCase()}`}>
                          {g.type_seance}
                        </span>
                      </td>
                      <td>{g.nom ? `${g.nom} ${g.prenom || ''}` : '—'}</td>
                      <td>
                        {g.statut_saisie === 'SOUMIS' ? (
                          <span className="status-badge status-badge--valide">
                            <CheckCircle size={12} style={{ marginRight: 4 }} /> SOUMIS
                          </span>
                        ) : (
                          <span className="status-badge status-badge--attente">
                            <Clock size={12} style={{ marginRight: 4 }} /> EN COURS
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {g.statut_saisie === 'SOUMIS' ? (
                            <>
                              <button className="btn btn--outline btn--sm"
                                onClick={() => handlePreviewNotes(g.id_affectation)}
                                disabled={previewLoading} title="Aperçu des notes">
                                <FileText size={14} /> Aperçu
                              </button>
                              {!isCloture && (
                                <button className="btn btn--outline btn--sm"
                                  onClick={() => handleDeverrouiller(g.id_affectation)}
                                  disabled={unlocking[g.id_affectation]} title="Déverrouiller">
                                  <LockOpen size={14} />
                                  {unlocking[g.id_affectation] ? '…' : 'Déverrouiller'}
                                </button>
                              )}
                            </>
                          ) : (
                            <button className="btn btn--warning btn--sm"
                              onClick={() => handleRelancer(g.id_affectation)}
                              disabled={relancing[g.id_affectation]} title="Envoyer un rappel">
                              <Bell size={14} />
                              {relancing[g.id_affectation] ? 'Envoi…' : 'Relancer'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========== Onglet 3 : Validation & Clôture ========== */}
      {activeTab === 'validation' && (
        <div>
          <div className="closure-card">
            <h3 className="closure-card__title" style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
              <Lock size={18} /> Clôture du module
            </h3>
            <p className="closure-card__desc" style={{ textAlign: 'left' }}>
              La clôture verrouille définitivement toutes les notes du module. Aucune modification ne sera possible après cette action.
            </p>

            <div className="rm-progress-container" style={{ marginBottom: 20 }}>
              <div className="rm-progress-header">
                <span>Soumissions requises</span>
                <span className="rm-progress-label">{submittedGroups}/{totalGroups}</span>
              </div>
              <div className="rm-progress-bar">
                <div
                  className={`rm-progress-bar__fill${progressPct === 100 ? ' rm-progress-bar__fill--complete' : ''}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {isCloture ? (
              <div className="rm-alert rm-alert--success">
                <CheckCircle size={16} />
                <span>Ce module a été clôturé. Les notes sont en lecture seule et prêtes pour les délibérations.</span>
              </div>
            ) : !allSubmitted ? (
              <div className="rm-alert rm-alert--warning">
                <AlertTriangle size={16} />
                <span>Toutes les affectations doivent avoir soumis leurs notes avant de pouvoir clôturer le module ({totalGroups - submittedGroups} affectation(s) en attente).</span>
              </div>
            ) : !showClotureConfirm ? (
              <button className="btn btn--critical" onClick={() => setShowClotureConfirm(true)}>
                <Lock size={16} /> Clôturer le module
              </button>
            ) : (
              <div className="rm-confirm-box">
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  <AlertTriangle size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6, color: '#dc2626' }} />
                  Êtes-vous sûr de vouloir clôturer ce module ?
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                  Cette action est irréversible. Les notes seront verrouillées en lecture seule pour les délibérations.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn--critical" onClick={handleCloturer} disabled={cloturing}>
                    {cloturing ? 'Clôture en cours…' : 'Confirmer la clôture'}
                  </button>
                  <button className="btn btn--outline" onClick={() => setShowClotureConfirm(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <button className="btn btn--success btn--sm" onClick={handleDownloadPV} title="Télécharger le PV">
                <Download size={14} /> Télécharger le PV final
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale aperçu des notes */}
      {previewModal && (
        <div className="modal-overlay" onClick={() => setPreviewModal(null)}>
          <div className="modal-content modal-content--wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FileText size={18} style={{ marginRight: 8 }} />
                Aperçu — {previewModal.groupe} ({previewModal.type_seance})
              </h3>
              <button className="modal-close" onClick={() => setPreviewModal(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              {previewModal.module} — {previewModal.total_etudiants} étudiant(s)
            </p>
            {previewModal.notes.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>Aucune note saisie pour ce groupe.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>TD</th>
                      <th>TP</th>
                      <th>EF</th>
                      <th>ER</th>
                      <th>Moy.</th>
                      <th>Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewModal.notes.map((n, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.matricule || '—'}</td>
                        <td>{n.nom || '—'}</td>
                        <td>{n.prenom || '—'}</td>
                        <td>{n.note_td != null ? n.note_td : '—'}</td>
                        <td>{n.note_tp != null ? n.note_tp : '—'}</td>
                        <td>{n.note_ef != null ? n.note_ef : '—'}</td>
                        <td>{n.note_er != null ? n.note_er : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{n.moyenne_finale != null ? n.moyenne_finale : '—'}</td>
                        <td>
                          {n.resultat ? (
                            <span className={`status-badge status-badge--${n.resultat === 'Admis' ? 'valide' : 'attente'}`}>
                              {n.resultat}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
