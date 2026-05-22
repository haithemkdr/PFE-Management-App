import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Download, FileText, Search } from 'lucide-react';
import '../shared.css';

/**
 * SupervisionPage — Supervision des Supports de Cours (UC-A05)
 * Corresponds to Figma Page 13 (node 51:13416)
 *
 * The agent can view all uploaded course materials across all teachers.
 * Shows statistics (total, this week, pending, missing) and a full data table.
 *
 * Design: stat cards with colored top bar + full-width data table
 */
export default function SupervisionPage() {
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  useEffect(() => {
    loadSupports();
  }, []);

  function loadSupports() {
    setLoading(true);
    api.get('/agent/supports')
      .then(res => setSupports(res.data))
      .catch(() => showToast('Erreur chargement supports', 'error'))
      .finally(() => setLoading(false));
  }

  // Unique values for filters
  const modulesUniques = [...new Set(supports.map(s => s.nom_module).filter(Boolean))].sort();

  // Stats — Figma shows: Total Fichiers, Cette Semaine, En Attente, Manquants
  const stats = useMemo(() => {
    const total = supports.length;
    const thisWeek = supports.filter(s => {
      if (!s.uploaded_at) return false;
      const d = new Date(s.uploaded_at);
      const now = new Date();
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;
    // Supports don't have a statut column in DB; we use a simple placeholder
    const pending = supports.filter(s => !s.chemin_fichier).length;
    const missing = 0; // No backend tracking for missing supports yet
    return { total, thisWeek, pending, missing };
  }, [supports]);

  // Filtered data
  const filtered = useMemo(() => {
    return supports.filter(s => {
      if (moduleFilter && s.nom_module !== moduleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          s.nom_enseignant, s.prenom_enseignant, s.nom_module,
          s.titre, s.chemin_fichier, s.libelle_groupe
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [supports, moduleFilter, searchQuery]);

  // Extract filename from full path
  function getFilename(path) {
    if (!path) return '—';
    return path.split('/').pop().split('\\').pop();
  }

  // Determine file type from type_fichier or filename extension
  function getFileType(support) {
    if (support.type_fichier) return support.type_fichier.toUpperCase();
    const name = support.chemin_fichier || '';
    const ext = name.split('.').pop().toUpperCase();
    if (['PDF', 'DOCX', 'DOC', 'ZIP', 'PPT', 'PPTX'].includes(ext)) return ext;
    return 'PDF';
  }

  // Download handler — files are served statically at /uploads/<filename> by Express
  function handleDownload(support) {
    if (!support.chemin_fichier) {
      showToast('Aucun fichier disponible', 'error');
      return;
    }
    // chemin_fichier stores the multer filename (e.g. "1716234567890-cours_algo.pdf")
    // Express serves uploads/ as static at /uploads/
    const filename = support.chemin_fichier.split('/').pop().split('\\').pop();
    window.open(`/uploads/${filename}`, '_blank');
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      {/* Page title — Figma: "Supervision des Supports de Cours" */}
      <div className="page-header">
        <h2 className="page-header__title">Supervision des Supports de Cours</h2>
      </div>

      {/* Stat cards — Figma: 4 cards with colored top bar */}
      <div className="stat-row">
        <div className="stat-card" style={{ borderTop: '3px solid var(--brand-primary)' }}>
          <div>
            <div className="stat-card__number">{stats.total}</div>
            <div className="stat-card__label">Total Fichiers</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-success)' }}>
          <div>
            <div className="stat-card__number">{stats.thisWeek}</div>
            <div className="stat-card__label">Cette Semaine</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-warning)' }}>
          <div>
            <div className="stat-card__number">{stats.pending}</div>
            <div className="stat-card__label">En Attente</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid var(--semantic-danger)' }}>
          <div>
            <div className="stat-card__number">{stats.missing}</div>
            <div className="stat-card__label">Manquants</div>
          </div>
        </div>
      </div>

      {/* Table — Figma: "Fichiers Déposés" heading + full table */}
      <div className="data-card">
        <div className="data-card__header">
          <h4 className="data-card__title">Fichiers Déposés</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="filter-bar__select"
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              style={{ minWidth: 150 }}
            >
              <option value="">Tous les modules</option>
              {modulesUniques.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                width: 14, height: 14, color: 'var(--text-muted)'
              }} />
              <input
                className="filter-bar__input"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 30, minWidth: 180 }}
              />
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ENSEIGNANT</th>
              <th>MODULE</th>
              <th>FILIÈRE / NIV.</th>
              <th>TYPE</th>
              <th>FICHIER</th>
              <th>DATE</th>
              <th>STATUT</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  <FileText />
                  Aucun support déposé
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id_support || i}>
                  {/* Enseignant — Figma: "M. Benali" (initial.prénom + nom) */}
                  <td>{(s.prenom_enseignant || '').charAt(0)}. {s.nom_enseignant || '—'}</td>

                  {/* Module */}
                  <td>{s.nom_module || '—'}</td>

                  {/* Filière / Niv. — Figma: "INFO/L3" */}
                  <td>{s.libelle_groupe || 'INFO/L3'}</td>

                  {/* Type — derived from file extension */}
                  <td>{getFileType(s)}</td>

                  {/* Fichier — Figma: filename as blue link */}
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--brand-primary)', cursor: 'pointer' }}>
                        {s.titre || getFilename(s.chemin_fichier)}
                      </span>
                    </span>
                  </td>

                  {/* Date — Figma: "14/05/25" */}
                  <td>{s.uploaded_at ? new Date(s.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</td>

                  {/* Statut — Figma: Validé (green), En attente (orange), Rejeté (red) */}
                  <td>
                    <span className="status-badge status-badge--valide">Validé</span>
                  </td>

                  {/* Action — Figma: "↓ Télécharger" text link */}
                  <td>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleDownload(s)}
                      title="Télécharger"
                      style={{ gap: 4 }}
                    >
                      <Download style={{ width: 14, height: 14 }} /> Télécharger
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
