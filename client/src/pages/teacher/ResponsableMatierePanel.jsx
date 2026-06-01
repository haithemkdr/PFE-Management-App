// ResponsableMatierePanel.jsx — Panneau Coordonnateur de Matière
// Accès réservé aux enseignants CM avec est_responsable_matiere = 1
// Fonctionnalités : gestion pondérations, suivi soumissions, déverrouillage, PV
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Scale, Eye, LockOpen, Download, AlertTriangle, CheckCircle,
  Clock, ShieldCheck, RefreshCw, Settings2, Users, Send, Hourglass
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

  // Fetch modules where user is responsable
  useEffect(() => {
    api.get('/responsable/mes-modules')
      .then(res => {
        setModules(res.data);
        if (res.data.length > 0) setSelectedModule(res.data[0]);
      })
      .catch(err => console.error('Erreur chargement modules responsable:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch group statuses when module changes
  useEffect(() => {
    if (!selectedModule) return;
    loadGroupStatuses();
    // Set initial weights from module config — convert decimals (0.40) to percentages (40)
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
      // Convert percentages (0-100) to decimals (0-1) for backend
      await api.put('/responsable/poids', {
        id_module: selectedModule.id_module,
        poids_td: (parseFloat(poids.poids_td) || 0) / 100,
        poids_tp: (parseFloat(poids.poids_tp) || 0) / 100,
        poids_exam: (parseFloat(poids.poids_exam) || 0) / 100,
      });
      showToast('Pondérations mises à jour', 'success');
      // Update local module data to reflect changes
      setModules(prev => prev.map(m =>
        m.id_module === selectedModule.id_module
          ? { ...m, poids_td: (parseFloat(poids.poids_td) || 0) / 100, poids_tp: (parseFloat(poids.poids_tp) || 0) / 100, poids_exam: (parseFloat(poids.poids_exam) || 0) / 100 }
          : m
      ));
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la mise à jour';
      showToast(msg, 'error');
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
      const msg = err.response?.data?.message || 'Erreur lors du déverrouillage';
      showToast(msg, 'error');
    } finally {
      setUnlocking(prev => ({ ...prev, [idAffectation]: false }));
    }
  }

  async function handleDownloadPV() {
    try {
      const res = await api.get(`/responsable/pv?id_module=${selectedModule.id_module}`, {
        responseType: 'blob'
      });
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

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const poidsSum = (parseFloat(poids.poids_td) || 0) + (parseFloat(poids.poids_tp) || 0) + (parseFloat(poids.poids_exam) || 0);
  const poidsValid = Math.abs(poidsSum - 100) < 0.01;

  const totalGroups = groupStatuses.length;
  const submittedGroups = groupStatuses.filter(g => g.statut_saisie === 'SOUMIS').length;
  const allSubmitted = totalGroups > 0 && submittedGroups === totalGroups;

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

  return (
    <div>
      {/* Module selector */}
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
        <button className="btn btn--outline btn--sm" onClick={loadGroupStatuses} title="Actualiser">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Stats row — with icons instead of dots */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="stat-card__number">{totalGroups}</div>
            <div className="stat-card__label">Groupes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            <Send size={20} />
          </div>
          <div>
            <div className="stat-card__number">{submittedGroups}</div>
            <div className="stat-card__label">Soumis</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: totalGroups - submittedGroups > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(22,163,74,0.1)', color: totalGroups - submittedGroups > 0 ? '#f59e0b' : '#16a34a' }}>
            <Hourglass size={20} />
          </div>
          <div>
            <div className="stat-card__number">{totalGroups - submittedGroups}</div>
            <div className="stat-card__label">En cours</div>
          </div>
        </div>
      </div>

      {/* Weights management */}
      <div className="form-panel">
        <h3 className="form-panel__title">
          <Scale size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
          Pondérations d'évaluation
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Poids TD (%)</label>
            <input type="number" min="0" max="100" step="1"
              value={poids.poids_td} onChange={e => setPoids({ ...poids, poids_td: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Poids TP (%)</label>
            <input type="number" min="0" max="100" step="1"
              value={poids.poids_tp} onChange={e => setPoids({ ...poids, poids_tp: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Poids Examen (%)</label>
            <input type="number" min="0" max="100" step="1"
              value={poids.poids_exam} onChange={e => setPoids({ ...poids, poids_exam: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
          <span style={{ fontSize: 13, color: poidsValid ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
            Total : {poidsSum.toFixed(0)}% {poidsValid ? '✓' : '(doit faire 100%)'}
          </span>
          <button className="btn btn--primary btn--sm" onClick={handleSavePoids}
            disabled={savingPoids || !poidsValid}>
            <Scale size={14} />
            {savingPoids ? 'Enregistrement…' : 'Appliquer'}
          </button>
        </div>
      </div>

      {/* Group submission statuses */}
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
            <button className="btn btn--success btn--sm" onClick={handleDownloadPV}
              title="Télécharger le PV des notes">
              <Download size={14} /> Générer PV
            </button>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {groupStatuses.map(g => (
                <tr key={`${g.id_affectation}`}>
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
                    {g.statut_saisie === 'SOUMIS' ? (
                      <button className="btn btn--outline btn--sm"
                        onClick={() => handleDeverrouiller(g.id_affectation)}
                        disabled={unlocking[g.id_affectation]}
                        title="Déverrouiller pour permettre la modification"
                      >
                        <LockOpen size={14} />
                        {unlocking[g.id_affectation] ? '…' : 'Déverrouiller'}
                      </button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
