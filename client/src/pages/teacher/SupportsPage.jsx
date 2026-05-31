import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { Upload, Trash2, FileText, Download, Plus, X, AlertTriangle } from 'lucide-react';
import '../shared.css';

/* ── Helper: extract short type label from mimetype ── */
function getFileTypeLabel(mime) {
  if (!mime) return 'Fichier';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('word') || mime.includes('msword')) return 'DOC';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPTX';
  if (mime.includes('zip') || mime.includes('rar')) return 'ZIP';
  return 'Autre';
}

function getFileTypeBadgeClass(label) {
  const map = { PDF: 'pdf', DOC: 'doc', PPTX: 'pptx', ZIP: 'zip' };
  return `file-type-badge file-type-badge--${map[label] || 'other'}`;
}

/* ── Helper: format date+time in French ── */
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) + ' à ' + d.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });
}

// Determine current semester period based on date:
// Sept(9)–Jan(1) → odd semesters (S1,S3,S5)
// Feb(2)–Aug(8) → even semesters (S2,S4,S6)
function getCurrentSemesters() {
  // Return odd semesters to match backend timetable logic
  return ['S1', 'S3', 'S5'];
}

export default function SupportsPage() {
  const [affectations, setAffectations] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [titre, setTitre] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { id, titre }
  const [audienceMode, setAudienceMode] = useState('all'); // 'all' or 'specific'
  const [specificAffectations, setSpecificAffectations] = useState([]);
  const fileRef = useRef(null);

  /* ── Load affectations ── */
  useEffect(() => {
    api.get('/notes/mes-affectations')
      .then(res => setAffectations(res.data))
      .catch(err => console.error('Erreur affectations:', err));
  }, []);

  // Semestres académiques en cours — calculé dynamiquement selon la date
  const CURRENT_SEMESTERS = getCurrentSemesters();
  const currentAffectations = affectations.filter(a => CURRENT_SEMESTERS.includes(a.semestre));

  /* ── Get unique modules assigned to the teacher ── */
  const uniqueModules = [];
  const seenModuleIds = new Set();
  currentAffectations.forEach(a => {
    if (!seenModuleIds.has(a.id_module)) {
      seenModuleIds.add(a.id_module);
      uniqueModules.push({
        id_module: a.id_module,
        nom_module: a.nom_module,
        semestre: a.semestre,
        niveau: a.niveau
      });
    }
  });

  const loadSupports = useCallback(() => {
    if (!selectedModule) { setSupports([]); return; }
    setLoading(true);
    api.get(`/supports/teacher/module/${selectedModule}`)
      .then(res => setSupports(res.data))
      .catch(err => console.error('Erreur supports:', err))
      .finally(() => setLoading(false));
  }, [selectedModule]);

  /* ── Load supports when selectedModule changes ── */
  useEffect(() => {
    setSpecificAffectations([]);
    setAudienceMode('all');
    loadSupports();
  }, [selectedModule, loadSupports]);

  /* ── Upload handler ── */
  async function handleUpload() {
    const file = selectedFile;
    if (!file || !selectedModule) return;

    // Client-side size check
    if (file.size > 10 * 1024 * 1024) {
      showToast('Le fichier dépasse la limite de 10 Mo', 'error');
      return;
    }

    const moduleAffectations = currentAffectations.filter(a => a.id_module === parseInt(selectedModule));
    let targetIds = [];
    if (audienceMode === 'all') {
      targetIds = moduleAffectations.map(a => a.id_affectation);
    } else {
      targetIds = specificAffectations;
    }

    if (targetIds.length === 0) {
      showToast('Veuillez sélectionner au moins un groupe ou cours', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('titre', titre || file.name.replace(/\.[^/.]+$/, ''));
    formData.append('id_affectations', JSON.stringify(targetIds));
    formData.append('fichier', file);
    try {
      await api.post('/supports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Fichier uploadé avec succès', 'success');
      setTitre('');
      setSelectedFile(null);
      setSpecificAffectations([]);
      setAudienceMode('all');
      if (fileRef.current) fileRef.current.value = '';
      setShowUploadForm(false);
      loadSupports();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Erreur lors de l\'upload';
      showToast(typeof msg === 'string' ? msg : 'Erreur lors de l\'upload', 'error');
    } finally {
      setUploading(false);
    }
  }

  /* ── Delete handler (via modal) ── */
  async function confirmDelete() {
    if (!deleteModal) return;
    try {
      await api.delete(`/supports/${deleteModal.id}`);
      showToast('Support supprimé', 'success');
      setDeleteModal(null);
      loadSupports();
    } catch (err) {
      showToast('Erreur lors de la suppression', 'error');
    }
  }

  /* ── Download handler ── */
  const handleDownload = async (support) => {
    try {
      const firstId = String(support.id_supports).split(',')[0];
      const response = await api.get(`/supports/download/${firstId}`, {
        responseType: 'blob',
      });
      const originalName = support.chemin_fichier.replace(/^\d{13}-/, '');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur de téléchargement', err);
      showToast('Erreur lors du téléchargement', 'error');
    }
  };

  /* ── Drag-and-drop ── */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!titre) setTitre(file.name.replace(/\.[^/.]+$/, ''));
    }
  }, [titre]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!titre) setTitre(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const moduleAffectations = currentAffectations.filter(a => a.id_module === parseInt(selectedModule));

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <select className="filter-bar__select" value={selectedModule}
          onChange={e => setSelectedModule(e.target.value)} style={{ minWidth: 320 }}>
          <option value="">— Choisir un cours —</option>
          {uniqueModules.map(m => (
            <option key={m.id_module} value={m.id_module}>
              {m.nom_module} ({m.niveau} - {m.semestre})
            </option>
          ))}
        </select>
        <span className="filter-bar__spacer" />
        {selectedModule && (
          <button className="btn btn--primary" onClick={() => setShowUploadForm(v => !v)}>
            {showUploadForm ? <><X /> Fermer</> : <><Plus /> Ajouter support</>}
          </button>
        )}
      </div>

      {/* ── Upload form panel ── */}
      {showUploadForm && selectedModule && (
        <div className="form-panel">
          <h4 className="form-panel__title">Nouveau support</h4>

          <div className="form-row">
            <div className="form-group">
              <label>Titre du fichier</label>
              <input type="text" placeholder="Ex: Chapitre 1 — Introduction"
                value={titre} onChange={e => setTitre(e.target.value)} />
            </div>
          </div>

          {/* ── Selection du public cible ── */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
              Diffusion du support :
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 'var(--font-size-small)' }}>
                <input
                  type="radio"
                  name="audienceMode"
                  value="all"
                  checked={audienceMode === 'all'}
                  onChange={() => {
                    setAudienceMode('all');
                    setSpecificAffectations([]);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                />
                <span><strong>Envoyer à tous mes groupes</strong> (CM, TD, TP associés à ce cours)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 'var(--font-size-small)' }}>
                <input
                  type="radio"
                  name="audienceMode"
                  value="specific"
                  checked={audienceMode === 'specific'}
                  onChange={() => setAudienceMode('specific')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                />
                <span><strong>Spécifier des groupes spécifiques</strong> (devoir, correction de TP, etc.)</span>
              </label>
            </div>
          </div>

          {/* ── Liste des groupes spécifiques ── */}
          {audienceMode === 'specific' && moduleAffectations.length > 0 && (
            <div className="form-group" style={{ marginBottom: 16, marginLeft: 24 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '8px 16px',
                padding: '12px',
                border: '1px solid var(--border-input)',
                borderRadius: 'var(--radius-md)',
                background: '#fafbfc',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {moduleAffectations.map(a => (
                  <label key={a.id_affectation} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-small)', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={specificAffectations.includes(a.id_affectation)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                      onChange={e => {
                        if (e.target.checked) {
                          setSpecificAffectations([...specificAffectations, a.id_affectation]);
                        } else {
                          setSpecificAffectations(specificAffectations.filter(id => id !== a.id_affectation));
                        }
                      }}
                    />
                    <span>{a.nom_groupe || a.type_seance}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── DropZone ── */}
          <div
            className={`upload-area ${dragActive ? 'upload-area--active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ marginBottom: 16 }}
          >
            <Upload className="upload-area__icon" />
            {selectedFile ? (
              <div className="upload-area__text">
                <strong>{selectedFile.name}</strong>
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} Mo)
                </span>
              </div>
            ) : (
              <div className="upload-area__text">
                Glisser-déposer un fichier ici — ou — <span className="upload-area__link">Parcourir</span>
              </div>
            )}
            <div className="upload-area__hint">
              PDF, DOC, DOCX, PPTX, ZIP, RAR — 10 Mo max
            </div>
            <input
              type="file"
              ref={fileRef}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.pptx,.zip,.rar"
              onChange={handleFileSelect}
            />
          </div>

          <button className="btn btn--primary" onClick={handleUpload}
            disabled={uploading || !selectedFile}>
            <Upload /> {uploading ? 'Upload en cours…' : 'Déposer le fichier'}
          </button>
        </div>
      )}

      {/* ── Supports table ── */}
      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : supports.length === 0 && selectedModule ? (
        <div className="empty-state">
          <FileText />
          Aucun support déposé pour ce cours
        </div>
      ) : supports.length > 0 ? (
        <div className="data-card">
          <div className="data-card__header">
            <span className="data-card__title">Historique des supports</span>
            <span className="data-card__subtitle">{supports.length} fichier(s)</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Destinataires</th>
                <th>Type</th>
                <th>Date de dépôt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supports.map(s => {
                const typeLabel = getFileTypeLabel(s.type_fichier);
                return (
                  <tr key={s.chemin_fichier}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText style={{ width: 16, height: 16, color: '#6b7280', flexShrink: 0 }} />
                      {s.titre}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {s.dest_groupes ? s.dest_groupes.split(',').join(', ') : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={getFileTypeBadgeClass(typeLabel)}>{typeLabel}</span>
                    </td>
                    <td>{formatDateTime(s.uploaded_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleDownload(s)}
                          className="btn btn--secondary btn--sm">
                          <Download /> Télécharger
                        </button>
                        <button className="btn btn--danger btn--sm"
                          onClick={() => setDeleteModal({ id: s.id_supports, titre: s.titre })}>
                          <Trash2 /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Delete confirmation modal ── */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>
              <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444', verticalAlign: 'middle', marginRight: 8 }} />
              Supprimer le support
            </h3>
            <p>
              Êtes-vous sûr de vouloir supprimer « <strong>{deleteModal.titre}</strong> » ?
              Cette action est irréversible.
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setDeleteModal(null)}>
                Annuler
              </button>
              <button className="btn btn--danger" onClick={confirmDelete}>
                <Trash2 /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
