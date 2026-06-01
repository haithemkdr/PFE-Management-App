// BilanEnseignantPage.jsx — Délibérations (Enseignant)
// Vue lecture seule scopée aux modules et groupes de l'enseignant
// Affiche les notes TD/TP/EF/ER et moyennes pour chaque étudiant
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { BarChart2, Search, Users, CheckCircle, XCircle } from 'lucide-react';
import '../shared.css';
import '../Dashboard.css';


// Niveau → Semestre mapping (LMD standard)
const NIVEAU_SEMESTERS = {
  L1: [{ value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' }],
  L2: [{ value: 'S3', label: 'Semestre 3' }, { value: 'S4', label: 'Semestre 4' }],
  L3: [{ value: 'S5', label: 'Semestre 5' }, { value: 'S6', label: 'Semestre 6' }]
};

export default function BilanEnseignantPage() {
  const [niveau, setNiveau] = useState('L1');
  const [semestre, setSemestre] = useState('S1');
  const [bilan, setBilan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Charger le bilan quand le semestre change
  useEffect(() => {
    setLoading(true);
    api.get(`/notes/bilan?semestre=${semestre}`)
      .then(res => setBilan(res.data))
      .catch(err => console.error('Erreur bilan enseignant:', err))
      .finally(() => setLoading(false));
  }, [semestre]);

  // Filtrer les étudiants par recherche
  const filteredEtudiants = useMemo(() => {
    if (!bilan?.etudiants) return [];
    if (!search) return bilan.etudiants;
    const q = search.toLowerCase();
    return bilan.etudiants.filter(e =>
      e.nom?.toLowerCase().includes(q) ||
      e.prenom?.toLowerCase().includes(q) ||
      e.matricule?.toLowerCase().includes(q)
    );
  }, [bilan, search]);

  // Modules uniques pour les en-têtes du tableau
  const modules = bilan?.modules || [];

  // Statistiques rapides
  const stats = useMemo(() => {
    if (!filteredEtudiants.length || !modules.length) return null;
    const total = filteredEtudiants.length;
    // Calculer les moyennes disponibles pour le premier module
    let withNotes = 0;
    let withoutNotes = 0;
    for (const etu of filteredEtudiants) {
      const hasAny = etu.modules?.some(m => m.moyenne_finale != null);
      if (hasAny) withNotes++;
      else withoutNotes++;
    }
    return { total, withNotes, withoutNotes };
  }, [filteredEtudiants, modules]);

  function getResultBadge(resultat) {
    if (!resultat) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    const cls = resultat === 'ADM' ? 'result-badge--adm'
      : resultat === 'RAT' ? 'result-badge--rat'
      : 'result-badge--eli';
    return <span className={`result-badge ${cls}`}>{resultat}</span>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div className="page-header">
        <h2 className="page-header__title">
          <BarChart2 style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Délibérations
        </h2>
      </div>

      {/* Barre de filtres : Niveau + Semestre + Recherche */}
      <div className="filter-bar">
        <select
          className="filter-bar__select"
          value={niveau}
          onChange={e => { setNiveau(e.target.value); setSemestre((NIVEAU_SEMESTERS[e.target.value] || [])[0]?.value || ''); }}
        >
          <option value="L1">L1</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
        </select>
        <select
          className="filter-bar__select"
          value={semestre}
          onChange={e => setSemestre(e.target.value)}
        >
          {(NIVEAU_SEMESTERS[niveau] || []).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="filter-bar__spacer" />

        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 15, height: 15, color: '#9ca3af' }} />
          <input
            className="filter-bar__input"
            placeholder="Rechercher étudiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: 20 }}>
          <div className="stat-card" style={{ borderTop: '3px solid var(--brand-primary)' }}>
            <div>
              <div className="stat-card__value">{stats.total}</div>
              <div className="stat-card__label">Étudiants</div>
            </div>
            <div className="stat-card__icon" style={{ background: 'rgba(67, 97, 238, 0.1)', color: 'var(--brand-primary)' }}>
              <Users />
            </div>
          </div>
          
          <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-success)' }}>
            <div>
              <div className="stat-card__value">{stats.withNotes}</div>
              <div className="stat-card__label">Avec notes</div>
            </div>
            <div className="stat-card__icon" style={{ background: 'rgba(56, 161, 105, 0.1)', color: 'var(--semantic-success)' }}>
              <CheckCircle />
            </div>
          </div>

          <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-danger)' }}>
            <div>
              <div className="stat-card__value">{stats.withoutNotes}</div>
              <div className="stat-card__label">Sans notes</div>
            </div>
            <div className="stat-card__icon" style={{ background: 'rgba(229, 62, 62, 0.1)', color: 'var(--semantic-danger)' }}>
              <XCircle />
            </div>
          </div>
        </div>
      )}

      {loading && <div className="empty-state">Chargement…</div>}

      {/* Info : aucune affectation pour ce semestre */}
      {!loading && bilan && modules.length === 0 && (
        <div className="alert alert--info">
          Vous n'avez aucune affectation pour le semestre {semestre}.
        </div>
      )}

      {/* Tableau principal */}
      {!loading && modules.length > 0 && (
        <div className="data-card" style={{ overflow: 'visible' }}>
          <div className="data-card__header">
            <span className="data-card__title">
              Mes modules — {semestre}
            </span>
            <span className="data-card__subtitle">
              {modules.length} module(s) · {filteredEtudiants.length} étudiant(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Groupe</th>
                  {modules.map(mod => (
                    <th key={mod.id_module} style={{ textAlign: 'center', minWidth: 120 }}>
                      {mod.nom_module}
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                        Coef. {mod.coefficient}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEtudiants.length === 0 ? (
                  <tr>
                    <td colSpan={4 + modules.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      Aucun étudiant trouvé
                    </td>
                  </tr>
                ) : (
                  filteredEtudiants.map(etu => (
                    <tr key={etu.id_etudiant}>
                      <td>{etu.matricule}</td>
                      <td>{etu.nom}</td>
                      <td>{etu.prenom}</td>
                      <td>{etu.nom_groupe || '—'}</td>
                      {modules.map(mod => {
                        const noteData = etu.modules?.find(m => m.id_module === mod.id_module);
                        return (
                          <td key={mod.id_module} style={{ textAlign: 'center' }}>
                            {noteData?.moyenne_finale != null ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>
                                  {noteData.moyenne_finale.toFixed(2)}
                                </span>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  {noteData.note_td != null ? `TD:${noteData.note_td}` : ''}
                                  {noteData.note_tp != null ? ` TP:${noteData.note_tp}` : ''}
                                  {noteData.note_ef != null ? ` EF:${noteData.note_ef}` : ''}
                                  {noteData.note_er != null ? ` ER:${noteData.note_er}` : ''}
                                </div>
                                {getResultBadge(noteData.resultat)}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
