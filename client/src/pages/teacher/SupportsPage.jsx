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

export default function SupportsPage() {
  const [affectations, setAffectations] = useState([]);
  const [selectedAffectation, setSelectedAffectation] = useState('');
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [titre, setTitre] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { id, titre }
  const fileRef = useRef(null);

  /* ── Load affectations ── */
  useEffect(() => {
    api.get('/notes/mes-affectations')
      .then(res => setAffectations(res.data))
      .catch(err => console.error('Erreur affectations:', err));
  }, []);

  /* ── Load supports when affectation changes ── */
  useEffect(() => {
    if (!selectedAffectation) { setSupports([]); return; }
    loadSupports();
  }, [selectedAffectation]);

  function loadSupports() {
    setLoading(true);
    api.get(`/supports/${selectedAffectation}`)
      .then(res => setSupports(res.data))
      .catch(err => console.error('Erreur supports:', err))
      .finally(() => setLoading(false));
  }

  /* ── Upload handler ── */
  async function handleUpload() {
    const file = selectedFile;
    if (!file || !selectedAffectation) return;

    // Client-side size check
    if (file.size > 10 * 1024 * 1024) {
      showToast('Le fichier dépasse la limite de 10 Mo', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('fichier', file);
    formData.append('titre', titre || file.name);
    formData.append('id_affectation', selectedAffectation);
    try {
      await api.post('/supports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Fichier uploadé avec succès', 'success');
      setTitre('');
      setSelectedFile(null);
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

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <select className="filter-bar__select" value={selectedAffectation}
          onChange={e => setSelectedAffectation(e.target.value)} style={{ minWidth: 320 }}>
          <option value="">— Choisir une affectation —</option>
          {affectations.map(a => (
            <option key={a.id_affectation} value={a.id_affectation}>
              {a.nom_module} ({a.nom_groupe})
            </option>
          ))}
        </select>
        <span className="filter-bar__spacer" />
        {selectedAffectation && (
          <button className="btn btn--primary" onClick={() => setShowUploadForm(v => !v)}>
            {showUploadForm ? <><X /> Fermer</> : <><Plus /> Ajouter support</>}
          </button>
        )}
      </div>

      {/* ── Upload form panel ── */}
      {showUploadForm && selectedAffectation && (
        <div className="form-panel">
          <h4 className="form-panel__title">Nouveau support</h4>

          <div className="form-row">
            <div className="form-group">
              <label>Titre du fichier</label>
              <input type="text" placeholder="Ex: Chapitre 1 — Introduction"
                value={titre} onChange={e => setTitre(e.target.value)} />
            </div>
          </div>

          {/* ── DropZone ── */}
          <div
            className={`upload-area ${dragActive ? 'upload-area--active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
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
      ) : supports.length === 0 && selectedAffectation ? (
        <div className="empty-state">
          <FileText />
          Aucun support déposé pour cette affectation
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
                <th>Type</th>
                <th>Date de dépôt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supports.map(s => {
                const typeLabel = getFileTypeLabel(s.type_fichier);
                return (
                  <tr key={s.id_support}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText style={{ width: 16, height: 16, color: '#6b7280', flexShrink: 0 }} />
                      {s.titre}
                    </td>
                    <td>
                      <span className={getFileTypeBadgeClass(typeLabel)}>{typeLabel}</span>
                    </td>
                    <td>{formatDateTime(s.uploaded_at)}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <a href={`/uploads/${s.chemin_fichier}`} target="_blank" rel="noopener noreferrer"
                        className="btn btn--secondary btn--sm">
                        <Download /> Télécharger
                      </a>
                      <button className="btn btn--danger btn--sm"
                        onClick={() => setDeleteModal({ id: s.id_support, titre: s.titre })}>
                        <Trash2 /> Supprimer
                      </button>
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
