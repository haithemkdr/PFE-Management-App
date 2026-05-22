import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Plus, Search, Pencil, Trash2, X, Download } from 'lucide-react';
import '../shared.css';

export default function EnseignantsPage() {
  const [enseignants, setEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const emptyForm = { nom: '', prenom: '', email: '', matricule: '', grade: 'MAA', mot_de_passe: '' };
  const [form, setForm] = useState(emptyForm);

  // Load teachers
  useEffect(() => {
    loadEnseignants();
  }, []);

  function loadEnseignants() {
    setLoading(true);
    api.get('/agent/enseignants')
      .then(res => setEnseignants(res.data))
      .catch(() => showToast('Erreur chargement enseignants', 'error'))
      .finally(() => setLoading(false));
  }

  // Filtrage — uses `actif` (DB column name) not `est_actif`
  const filtered = useMemo(() => {
    return enseignants.filter(e => {
      const matchSearch = !search ||
        e.nom?.toLowerCase().includes(search.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.matricule?.toLowerCase().includes(search.toLowerCase());
      const matchGrade = !gradeFilter || e.grade === gradeFilter;
      const matchStatut = !statutFilter ||
        (statutFilter === 'actif' && e.actif) ||
        (statutFilter === 'inactif' && !e.actif);
      return matchSearch && matchGrade && matchStatut;
    });
  }, [enseignants, search, gradeFilter, statutFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = enseignants.length;
    const actifs = enseignants.filter(e => e.actif).length;
    const inactifs = total - actifs;
    const maa = enseignants.filter(e => e.grade === 'MAA').length;
    return { total, actifs, inactifs, maa };
  }, [enseignants]);

  // Grades uniques pour le filtre
  const grades = [...new Set(enseignants.map(e => e.grade).filter(Boolean))];

  // Toggle actif/inactif
  function handleToggle(id) {
    api.patch(`/agent/enseignants/${id}/statut`)
      .then(res => {
        setEnseignants(prev =>
          prev.map(e => e.id_utilisateur === id ? { ...e, actif: res.data.actif } : e)
        );
        showToast('Statut mis à jour', 'success');
      })
      .catch(() => showToast('Erreur lors de la mise à jour', 'error'));
  }

  // Create enseignant
  function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      // Mode edition
      api.put(`/agent/enseignants/${editingId}`, {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        matricule: form.matricule,
        grade: form.grade
      })
        .then(() => {
          showToast('Enseignant modifié avec succès', 'success');
          resetForm();
          loadEnseignants();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur modification', 'error'));
    } else {
      // Mode création
      api.post('/agent/enseignants', form)
        .then(() => {
          showToast('Enseignant créé avec succès', 'success');
          resetForm();
          loadEnseignants();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur création', 'error'));
    }
  }

  // Edit enseignant — open form with data
  function handleEdit(enseignant) {
    setForm({
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      email: enseignant.email,
      matricule: enseignant.matricule || '',
      grade: enseignant.grade || 'MAA',
      mot_de_passe: ''
    });
    setEditingId(enseignant.id_utilisateur);
    setShowForm(true);
  }

  // Delete enseignant
  function handleDelete(id) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet enseignant ?')) return;
    api.delete(`/agent/enseignants/${id}`)
      .then(() => {
        showToast('Enseignant supprimé', 'success');
        setEnseignants(prev => prev.filter(e => e.id_utilisateur !== id));
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur suppression', 'error'));
  }

  // Export CSV
  function handleExportCSV() {
    const headers = ['Matricule', 'Nom', 'Prenom', 'Email', 'Grade', 'Modules', 'Statut'];
    const rows = filtered.map(e => [
      e.matricule || '', e.nom, e.prenom, e.email, e.grade || '', e.nb_modules, e.actif ? 'Actif' : 'Inactif'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enseignants.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      {/* Toolbar: search + filters + add button */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 16, height: 16, color: 'var(--text-muted)' }} />
          <input
            className="filter-bar__input"
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-bar__select" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
          <option value="">Tous les grades</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-bar__select" value={statutFilter} onChange={e => setStatutFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
        <button className="btn btn--primary" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annuler' : 'Ajouter enseignant'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--brand-primary)' }} />
          <div>
            <div className="stat-card__number">{stats.total}</div>
            <div className="stat-card__label">Total</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--semantic-success)' }} />
          <div>
            <div className="stat-card__number">{stats.actifs}</div>
            <div className="stat-card__label">Actifs</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--semantic-danger)' }} />
          <div>
            <div className="stat-card__number">{stats.inactifs}</div>
            <div className="stat-card__label">Inactifs</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--brand-accent)' }} />
          <div>
            <div className="stat-card__number">{stats.maa}</div>
            <div className="stat-card__label">MAA</div>
          </div>
        </div>
      </div>

      {/* Create/Edit form (collapsible) */}
      {showForm && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <h4 className="form-panel__title">{editingId ? 'Modifier Enseignant' : 'Nouvel Enseignant'}</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Matricule</label>
              <input value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} placeholder="Ex: ENS-008" />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Grade</label>
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                <option value="MAA">MAA</option>
                <option value="MAB">MAB</option>
                <option value="MCA">MCA</option>
                <option value="MCB">MCB</option>
                <option value="Prof">Professeur</option>
              </select>
            </div>
            {!editingId && (
              <div className="form-group">
                <label>Mot de passe</label>
                <input type="password" required value={form.mot_de_passe} onChange={e => setForm({ ...form, mot_de_passe: e.target.value })} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn--primary">{editingId ? 'Enregistrer les modifications' : 'Créer le compte'}</button>
            <button type="button" className="btn btn--secondary" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="data-card">
        <div className="data-card__header">
          <h4 className="data-card__title">Liste des Enseignants</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge--primary">{filtered.length} enseignants</span>
            <button className="btn btn--outline btn--sm" onClick={handleExportCSV}>
              <Download size={14} /> Exporter CSV
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Grade</th>
              <th>Modules</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun enseignant trouvé</td></tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id_utilisateur}>
                  <td>{e.matricule || '—'}</td>
                  <td>{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.email}</td>
                  <td>{e.grade || '—'}</td>
                  <td>{e.nb_modules ?? 0}</td>
                  <td>
                    <span
                      className={`status-badge ${e.actif ? 'status-badge--actif' : 'status-badge--inactif'}`}
                      onClick={() => handleToggle(e.id_utilisateur)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquer pour changer le statut"
                    >
                      {e.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button className="action-icon action-icon--edit" title="Modifier" onClick={() => handleEdit(e)}>
                        <Pencil size={15} />
                      </button>
                      <button className="action-icon action-icon--delete" title="Supprimer" onClick={() => handleDelete(e.id_utilisateur)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
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
