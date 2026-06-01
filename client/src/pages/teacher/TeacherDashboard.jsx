import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  Users2,
  BookOpen,
  FileEdit,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import '../Dashboard.css';

const typeColors = {
  CM: 'badge--info',
  TD: 'badge--warning',
  TP: 'badge--success',
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = user?.nom_complet
    || (user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : null)
    || 'Enseignant';

  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionActuelle, setSessionActuelle] = useState(null);
  const [allSessions, setAllSessions] = useState([]);

  /* ── Fetch real affectations from API ── */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [affRes, sessRes] = await Promise.all([
          api.get('/notes/mes-affectations'),
          api.get('/notes/session-active'),
        ]);
        setAffectations(affRes.data);
        // Store all sessions for lookup by semestre
        if (sessRes.data && sessRes.data.length > 0) {
          setAllSessions(sessRes.data);
          setSessionActuelle(sessRes.data[0]); // fallback: most recent
        }
      } catch (err) {
        setError(err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derive stats from real data ── */
  const uniqueGroupes = new Set(affectations.map((a) => a.id_groupe));
  const uniqueModules = new Set(affectations.map((a) => a.id_module));
  const ouvertes = affectations.filter((a) => a.periode_saisie_ouverte === 1).length;
  const fermees = affectations.filter((a) => a.periode_saisie_ouverte === 0).length;

  // Detect the current semester: most frequent semestre among open affectations
  const semestreFreq = {};
  for (const a of affectations.filter(a => a.periode_saisie_ouverte === 1)) {
    if (a.semestre) semestreFreq[a.semestre] = (semestreFreq[a.semestre] || 0) + 1;
  }
  const semestreActuel = Object.entries(semestreFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
    || sessionActuelle?.semestre
    || null;

  // Find the session record matching semestreActuel
  const sessionDuSemestre = allSessions.find(s => s.semestre === semestreActuel) || sessionActuelle;

  const stats = [
    { label: 'Groupes',        value: uniqueGroupes.size, color: 'blue',   icon: Users2 },
    { label: 'Modules',        value: uniqueModules.size,  color: 'orange', icon: BookOpen },
    { label: 'Saisie ouverte', value: ouvertes,            color: 'green',  icon: FileEdit },
    { label: 'Saisie fermée',  value: fermees,             color: 'gold',   icon: Clock },
  ];

  return (
    <>
      {/* Welcome banner */}
      <div className="welcome-card">
        <div className="welcome-card__text">
          <h2>Bienvenue, {name}</h2>
          <p>
            {semestreActuel
              ? <>
                  Semestre en cours :&nbsp;<strong>{semestreActuel}</strong>
                  {sessionDuSemestre && (
                    <>&nbsp;— Session&nbsp;<strong>{sessionDuSemestre.type_session}</strong>&nbsp;·&nbsp;{sessionDuSemestre.annee_univ}</>
                  )}
                </>
              : 'Année universitaire 2025/2026'
            }
          </p>
        </div>
        <span className="welcome-card__badge">
          {affectations.length} affectation{affectations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`stat-card stat-card--${color}`}>
            <div>
              <div className="stat-card__value">{loading ? '–' : value}</div>
              <div className="stat-card__label">{label}</div>
            </div>
            <div className={`stat-card__icon stat-card__icon--${color}`}>
              <Icon />
            </div>
          </div>
        ))}
      </div>

      {/* Affectations table */}
      <div className="section-panel">
        <div className="section-panel__header">
          <h3 className="section-panel__title">Mes affectations</h3>
          <span className="section-panel__action">
            {ouvertes} saisie{ouvertes !== 1 ? 's' : ''} ouverte{ouvertes !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 className="spin" />
            <span>Chargement…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle />
            <span>{error}</span>
          </div>
        ) : affectations.length === 0 ? (
          <div className="empty-state">
            <BookOpen />
            <span>Aucune affectation trouvée</span>
          </div>
        ) : (
          <table className="simple-table">
            <thead>
              <tr>
                <th>Groupe / Section</th>
                <th>Type</th>
                <th>Module</th>
                <th>Semestre</th>
                <th>Période saisie</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {affectations.map((a) => {
                const open = a.periode_saisie_ouverte === 1;
                return (
                  <tr key={a.id_affectation}>
                    <td>{a.nom_groupe || a.section || '—'}</td>
                    <td>
                      <span className={`badge ${typeColors[a.type_seance] || 'badge--info'}`}>
                        {a.type_seance}
                      </span>
                    </td>
                    <td>{a.nom_module}</td>
                    <td>{a.semestre}</td>
                    <td>
                      <span
                        className={`badge ${open ? 'badge--success' : 'badge--danger'}`}
                      >
                        {open ? 'Ouverte' : 'Fermée'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`table-action ${
                          open ? 'table-action--primary' : 'table-action--secondary'
                        }`}
                        onClick={() =>
                          navigate(open ? '/teacher/notes' : '/teacher/supports')
                        }
                      >
                        {open ? 'Saisir notes' : 'Voir supports'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
