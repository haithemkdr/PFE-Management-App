import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Download, FileText, Search, User, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import '../shared.css';

/**
 * SupervisionPage — Supervision des Supports de Cours (UC-A05)
 * Figma Page 13 (node 51:13416)
 *
 * Features:
 *  - Filter by instructor, module, file type
 *  - Per-instructor lesson progress tracking (supports déposés / affectations)
 *  - Stat cards: total files, this week, instructors active, coverage %
 */
export default function SupervisionPage() {
  const [supports, setSupports]         = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState(null);
  const [activeTab, setActiveTab]       = useState('fichiers'); // 'fichiers' | 'progression'

  // Filters
  const [searchQuery,      setSearchQuery]      = useState('');
  const [moduleFilter,     setModuleFilter]     = useState('');
  const [instructeurFilter,setInstructeurFilter]= useState('');
  const [typeFilter,       setTypeFilter]       = useState('');

  useEffect(() => { loadAll(); }, []);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get('/agent/supports'),
      api.get('/agent/affectations')
    ])
      .then(([sup, aff]) => {
        setSupports(sup.data);
        setAffectations(aff.data);
      })
      .catch(() => showToast('Erreur chargement données', 'error'))
      .finally(() => setLoading(false));
  }

  // ── Unique filter values ──────────────────────────────────────
  // Instructeurs + modules come from affectations (always loaded, even if 0 supports)
  const modulesUniques = useMemo(() => {
    const fromAff = affectations.map(a => a.nom_module).filter(Boolean);
    const fromSup = supports.map(s => s.nom_module).filter(Boolean);
    return [...new Set([...fromAff, ...fromSup])].sort();
  }, [affectations, supports]);

  const instructeursUniques = useMemo(() => {
    const map = {};
    // Include all instructors from affectations
    affectations.forEach(a => {
      if (a.id_utilisateur && !map[a.id_utilisateur]) {
        map[a.id_utilisateur] = { id: a.id_utilisateur, nom: a.nom_enseignant, prenom: a.prenom_enseignant };
      }
    });
    // Also include any from supports that might not be in affectations
    supports.forEach(s => {
      if (s.id_utilisateur && !map[s.id_utilisateur]) {
        map[s.id_utilisateur] = { id: s.id_utilisateur, nom: s.nom_enseignant, prenom: s.prenom_enseignant };
      }
    });
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [affectations, supports]);

  const typesUniques = useMemo(() =>
    [...new Set(supports.map(s => getFileType(s)).filter(Boolean))].sort()
  , [supports]);

  // ── Global stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = supports.length;
    const thisWeek = supports.filter(s => {
      if (!s.uploaded_at) return false;
      return (Date.now() - new Date(s.uploaded_at)) / 86400000 <= 7;
    }).length;
    const activeInstructors = new Set(supports.map(s => s.id_utilisateur).filter(Boolean)).size;
    // Coverage: instructors who have at least 1 support / total instructors in affectations
    const totalInstructors = new Set(affectations.map(a => a.id_utilisateur).filter(Boolean)).size;
    const coverage = totalInstructors > 0 ? Math.round((activeInstructors / totalInstructors) * 100) : 0;
    return { total, thisWeek, activeInstructors, coverage };
  }, [supports, affectations]);

  // ── Per-instructor progression ────────────────────────────────
  const progressionData = useMemo(() => {
    // Group affectations by instructor
    const byInstructor = {};
    affectations.forEach(a => {
      const key = a.id_utilisateur;
      if (!key) return;
      if (!byInstructor[key]) {
        byInstructor[key] = {
          id: key,
          nom: a.nom_enseignant,
          prenom: a.prenom_enseignant,
          affectations: []
        };
      }
      byInstructor[key].affectations.push(a);
    });

    // Count supports per instructor
    const supportsByInstructor = {};
    supports.forEach(s => {
      if (!s.id_utilisateur) return;
      supportsByInstructor[s.id_utilisateur] = (supportsByInstructor[s.id_utilisateur] || 0) + 1;
    });

    return Object.values(byInstructor).map(inst => {
      const total = inst.affectations.length;
      const deposited = supportsByInstructor[inst.id] || 0;
      const pct = total > 0 ? Math.min(100, Math.round((deposited / total) * 100)) : 0;
      return { ...inst, total, deposited, pct };
    }).sort((a, b) => b.deposited - a.deposited);
  }, [affectations, supports]);

  // ── Filtered table data ───────────────────────────────────────
  const filtered = useMemo(() => {
    return supports.filter(s => {
      if (moduleFilter      && s.nom_module !== moduleFilter)                       return false;
      if (instructeurFilter && String(s.id_utilisateur) !== instructeurFilter)      return false;
      if (typeFilter        && getFileType(s) !== typeFilter)                       return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = [s.nom_enseignant, s.prenom_enseignant, s.nom_module,
                     s.titre, s.libelle_groupe, s.niveau].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [supports, moduleFilter, instructeurFilter, typeFilter, searchQuery]);

  // ── Helpers ───────────────────────────────────────────────────
  function getFilename(path) {
    if (!path) return '—';
    return path.split('/').pop().split('\\').pop();
  }

  function getFileType(support) {
    if (support.type_fichier) return support.type_fichier.toUpperCase();
    const ext = (support.chemin_fichier || '').split('.').pop().toUpperCase();
    return ['PDF', 'DOCX', 'DOC', 'ZIP', 'PPT', 'PPTX'].includes(ext) ? ext : 'PDF';
  }

  function getTypeBadgeColor(type) {
    const map = { PDF: '#e53e3e', DOCX: '#3182ce', DOC: '#3182ce', PPT: '#d97706', PPTX: '#d97706', ZIP: '#718096' };
    return map[type] || '#718096';
  }

  function getProgressColor(pct) {
    if (pct >= 80) return 'var(--semantic-success)';
    if (pct >= 40) return 'var(--semantic-warning)';
    return 'var(--semantic-danger)';
  }

  const handleDownload = async (support) => {
    try {
      if (!support.chemin_fichier) { showToast('Aucun fichier disponible', 'error'); return; }
      const response = await api.get(`/supports/download/${support.id_support}`, { responseType: 'blob' });
      let fileName = support.titre || getFilename(support.chemin_fichier);
      const cd = response.headers['content-disposition'];
      if (cd) { const m = cd.match(/filename="?([^"]+)"?/); if (m?.[1]) fileName = m[1]; }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', fileName);
      document.body.appendChild(link); link.click();
      link.remove(); window.URL.revokeObjectURL(url);
    } catch { showToast('Erreur téléchargement', 'error'); }
  };

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Tab styles ────────────────────────────────────────────────
  const tabStyle = (active) => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, transition: 'all 0.15s ease',
    background: active ? 'var(--brand-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)'
  });

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <h2 className="page-header__title">Supervision des Supports de Cours</h2>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="stat-row">
        <div className="stat-card" style={{ borderTop: '3px solid var(--brand-primary)' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(67,97,238,0.1)', color: 'var(--brand-primary)' }}>
            <FileText style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-card__number">{stats.total}</div>
            <div className="stat-card__label">Total Fichiers</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-success)' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(56,161,105,0.1)', color: 'var(--semantic-success)' }}>
            <TrendingUp style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-card__number">{stats.thisWeek}</div>
            <div className="stat-card__label">Cette Semaine</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-warning)' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(237,137,54,0.1)', color: 'var(--semantic-warning)' }}>
            <User style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-card__number">{stats.activeInstructors}</div>
            <div className="stat-card__label">Enseignants Actifs</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-danger)' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(229,62,62,0.1)', color: 'var(--semantic-danger)' }}>
            <BookOpen style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-card__number">{stats.coverage}%</div>
            <div className="stat-card__label">Couverture</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-bg)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 20 }}>
        <button style={tabStyle(activeTab === 'fichiers')}    onClick={() => setActiveTab('fichiers')}>
          <FileText style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'middle' }} />
          Fichiers Déposés
        </button>
        <button style={tabStyle(activeTab === 'progression')} onClick={() => setActiveTab('progression')}>
          <TrendingUp style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'middle' }} />
          Progression par Enseignant
        </button>
      </div>

      {/* ══════════════ TAB 1 : Fichiers Déposés ══════════════════ */}
      {activeTab === 'fichiers' && (
        <div className="data-card">
          <div className="data-card__header">
            <h4 className="data-card__title">Fichiers Déposés</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

              {/* Filter: Instructeur */}
              <select className="filter-bar__select" value={instructeurFilter}
                onChange={e => setInstructeurFilter(e.target.value)} style={{ minWidth: 150 }}>
                <option value="">Tous les enseignants</option>
                {instructeursUniques.map(e => (
                  <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
                ))}
              </select>

              {/* Filter: Module */}
              <select className="filter-bar__select" value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)} style={{ minWidth: 140 }}>
                <option value="">Tous les modules</option>
                {modulesUniques.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              {/* Filter: Type */}
              <select className="filter-bar__select" value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: 100 }}>
                <option value="">Tous les types</option>
                {typesUniques.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
                <input className="filter-bar__input" placeholder="Rechercher..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 30, minWidth: 180 }} />
              </div>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>ENSEIGNANT</th>
                <th>MODULE</th>
                <th>NIV. / GROUPE</th>
                <th>TYPE</th>
                <th>FICHIER</th>
                <th>DATE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <AlertCircle style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.4 }} />
                    <div>Aucun support déposé</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Modifiez les filtres pour afficher d'autres résultats
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const ftype = getFileType(s);
                  const ftColor = getTypeBadgeColor(ftype);
                  const groupeLabel = s.libelle_groupe
                    || (s.type_seance === 'CM' ? `${s.section || ''} entière` : '—');
                  return (
                    <tr key={s.id_support || i}>
                      {/* Enseignant */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'var(--brand-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0
                          }}>
                            {(s.prenom_enseignant || '?').charAt(0)}{(s.nom_enseignant || '').charAt(0)}
                          </div>
                          <span style={{ fontWeight: 500 }}>
                            {(s.prenom_enseignant || '').charAt(0)}. {s.nom_enseignant || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Module */}
                      <td style={{ fontWeight: 500 }}>{s.nom_module || '—'}</td>

                      {/* Niveau / Groupe */}
                      <td>
                        <span style={{ fontSize: 12 }}>
                          {s.niveau && <span style={{
                            background: 'var(--surface-bg)', border: '1px solid var(--border-default)',
                            borderRadius: 4, padding: '2px 6px', marginRight: 4, fontWeight: 600, fontSize: 11
                          }}>{s.niveau}</span>}
                          {groupeLabel}
                        </span>
                      </td>

                      {/* Type badge */}
                      <td>
                        <span style={{
                          background: ftColor, color: '#fff', borderRadius: 4,
                          padding: '2px 8px', fontSize: 11, fontWeight: 700
                        }}>{ftype}</span>
                      </td>

                      {/* Fichier */}
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--brand-primary)', cursor: 'pointer', fontSize: 13 }}>
                            {s.titre || getFilename(s.chemin_fichier)}
                          </span>
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {s.uploaded_at
                          ? new Date(s.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                          : '—'}
                      </td>

                      {/* Action */}
                      <td>
                        <button className="btn btn--secondary btn--sm"
                          onClick={() => handleDownload(s)} style={{ gap: 4 }}>
                          <Download style={{ width: 14, height: 14 }} /> Télécharger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Result count */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)' }}>
              {filtered.length} fichier{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
              {(instructeurFilter || moduleFilter || typeFilter || searchQuery) && ' (filtrés)'}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB 2 : Progression par Enseignant ════════ */}
      {activeTab === 'progression' && (
        <div className="data-card">
          <div className="data-card__header">
            <h4 className="data-card__title">Progression par Enseignant</h4>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Supports déposés / Affectations totales
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Chargement…</div>
          ) : progressionData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Aucune donnée disponible
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {progressionData.map(inst => (
                <div key={inst.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 20px', borderBottom: '1px solid var(--border-default)'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--brand-primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14
                  }}>
                    {(inst.prenom || '?').charAt(0)}{(inst.nom || '').charAt(0)}
                  </div>

                  {/* Name + modules */}
                  <div style={{ minWidth: 180, flexShrink: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {inst.prenom} {inst.nom}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {inst.affectations.map(a => a.nom_module).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{
                      height: 8, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 99, transition: 'width 0.4s ease',
                        width: `${inst.pct}%`,
                        background: getProgressColor(inst.pct)
                      }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ minWidth: 130, textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{inst.deposited}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> / {inst.total} supports</span>
                  </div>

                  {/* Percentage badge */}
                  <div style={{
                    minWidth: 52, textAlign: 'center', flexShrink: 0,
                    fontWeight: 700, fontSize: 13,
                    color: getProgressColor(inst.pct)
                  }}>
                    {inst.pct}%
                  </div>

                  {/* Status icon */}
                  <div style={{ flexShrink: 0 }}>
                    {inst.pct === 0
                      ? <span title="Aucun support déposé"><AlertCircle style={{ width: 18, height: 18, color: 'var(--semantic-danger)' }} /></span>
                      : inst.pct < 50
                      ? <span title="Progression insuffisante"><AlertCircle style={{ width: 18, height: 18, color: 'var(--semantic-warning)' }} /></span>
                      : <span title="Bonne progression"><TrendingUp style={{ width: 18, height: 18, color: 'var(--semantic-success)' }} /></span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
