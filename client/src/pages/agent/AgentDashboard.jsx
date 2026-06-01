import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  Users,
  GraduationCap,
  Link2,
  BookOpen,
} from 'lucide-react';
import '../Dashboard.css';

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = user?.nom_complet || user?.prenom || 'Agent';

  // État pour les données du tableau de bord
  const [stats, setStats] = useState({ enseignants: 0, etudiants: 0, affectations: 0, modules: 0, periodesActives: 0 });
  const [periodes, setPeriodes] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les données réelles au montage
  useEffect(() => {
    api.get('/agent/dashboard-stats')
      .then(res => {
        setStats(res.data.stats);
        setPeriodes(res.data.periodes);
        setEnseignants(res.data.enseignants);
      })
      .catch(err => console.log('Erreur chargement dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  // Configuration des cartes de statistiques
  const statCards = [
    { label: 'Enseignants',  value: stats.enseignants,  color: 'blue',   icon: Users },
    { label: 'Étudiants',   value: stats.etudiants,    color: 'orange', icon: GraduationCap },
    { label: 'Affectations', value: stats.affectations,  color: 'green',  icon: Link2 },
    { label: 'Modules',     value: stats.modules,      color: 'gold',   icon: BookOpen },
  ];

  return (
    <>
      {/* Welcome */}
      <div className="welcome-card">
        <div className="welcome-card__text">
          <h2>Bienvenue, {name}</h2>
          <p>Administration – Semestre 2 | 2025/2026</p>
        </div>
        <span className="welcome-card__badge">
          {loading ? '…' : `${stats.periodesActives} périodes actives`}
        </span>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`stat-card stat-card--${color}`}>
            <div>
              <div className="stat-card__value">{loading ? '…' : value}</div>
              <div className="stat-card__label">{label}</div>
            </div>
            <div className={`stat-card__icon stat-card__icon--${color}`}>
              <Icon />
            </div>
          </div>
        ))}
      </div>

      {/* Two tables side-by-side */}
      <div className="section-grid-2">
        {/* Periodes */}
        <div className="section-panel">
          <div className="section-panel__header">
            <h3 className="section-panel__title">Périodes de saisie</h3>
            <button className="section-panel__action" onClick={() => navigate('/agent/periodes')}>Gérer</button>
          </div>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Module</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24 }}>Chargement…</td></tr>
              ) : periodes.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Aucune affectation</td></tr>
              ) : (
                periodes.map((p) => (
                  <tr key={p.id_affectation}>
                    <td>{p.prenom[0]}. {p.nom}</td>
                    <td>{p.nom_module}</td>
                    <td>
                      <span className={`badge ${p.periode_saisie_ouverte ? 'badge--success' : 'badge--danger'}`}>
                        {p.periode_saisie_ouverte ? 'Ouverte' : 'Fermée'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enseignants */}
        <div className="section-panel">
          <div className="section-panel__header">
            <h3 className="section-panel__title">Enseignants</h3>
            <button className="section-panel__action" onClick={() => navigate('/agent/enseignants')}>Voir tous</button>
          </div>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Nom & Prénom</th>
                <th>Email</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24 }}>Chargement…</td></tr>
              ) : enseignants.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Aucun enseignant</td></tr>
              ) : (
                enseignants.map((e) => (
                  <tr key={e.id_utilisateur}>
                    <td>{e.nom} {e.prenom}</td>
                    <td>{e.email}</td>
                    <td>
                      <span className={`badge ${e.actif ? 'badge--success' : 'badge--danger'}`}>
                        {e.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
