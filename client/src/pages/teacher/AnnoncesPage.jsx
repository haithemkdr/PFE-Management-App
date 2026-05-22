import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Send, X } from 'lucide-react';
import '../shared.css';

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const emptyForm = { titre: '', id_groupe: '', contenu: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadAnnonces();
    // Load teacher's assigned groups for the dropdown
    api.get('/notes/mes-affectations')
      .then(res => {
        const unique = [...new Map(res.data.map(a => [a.id_groupe, a])).values()];
        setGroupes(unique);
      })
      .catch(() => {});
  }, []);

  function loadAnnonces() {
    setLoading(true);
    // Teacher announcements endpoint — uses enseignant context
    api.get('/annonces')
      .then(res => setAnnonces(res.data.data || res.data))
      .catch(() => {
        // If endpoint doesn't exist yet, show empty state
        setAnnonces([]);
      })
      .finally(() => setLoading(false));
  }

  function handleSubmit(e) {
    e.preventDefault();
    api.post('/annonces', form)
      .then(() => {
        showToast('Annonce envoyée', 'success');
        setForm(emptyForm);
        setShowForm(false);
        loadAnnonces();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur', 'error'));
  }

  function handleDelete(id) {
    api.delete(`/annonces/${id}`)
      .then(() => {
        setAnnonces(prev => prev.filter(a => a.id_annonce !== id));
        showToast('Annonce supprimée', 'success');
      })
      .catch(() => showToast('Erreur suppression', 'error'));
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-header__title">Mes Annonces</h2>
        <button className={`btn ${showForm ? 'btn--outline' : 'btn--primary'}`} onClick={() => setShowForm(!showForm)}>
          {showForm ? <X /> : <Plus />}
          {showForm ? 'Annuler' : 'Nouvelle annonce'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <h4 className="form-panel__title">Nouvelle annonce</h4>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Titre</label>
              <input
                required
                placeholder="Titre de l'annonce..."
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Groupe destinataire</label>
              <select required value={form.id_groupe} onChange={e => setForm({ ...form, id_groupe: e.target.value })}>
                <option value="" disabled>-- Sélectionner un groupe --</option>
                {groupes.map(g => (
                  <option key={g.id_groupe} value={g.id_groupe}>{g.nom_groupe}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Message</label>
            <textarea
              placeholder="Contenu du message pour les étudiants..."
              value={form.contenu}
              onChange={e => setForm({ ...form, contenu: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn--primary">
            <Send /> Envoyer
          </button>
        </form>
      )}

      {/* Table */}
      <div className="data-card">
        <div className="data-card__header">
          <h4 className="data-card__title">Annonces envoyées</h4>
          <span className="data-card__subtitle">{annonces.length} annonce(s)</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Groupe</th>
              <th>Date envoyée</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : annonces.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucune annonce pour l'instant</td></tr>
            ) : (
              annonces.map(a => (
                <tr key={a.id_annonce}>
                  <td>{a.titre}</td>
                  <td>{a.groupe || 'Tous'}</td>
                  <td>{a.date_envoi ? new Date(a.date_envoi).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>
                    <span className="status-badge status-badge--actif">Envoyé</span>
                  </td>
                  <td>
                    <button className="btn btn--danger btn--sm" onClick={() => handleDelete(a.id_annonce)}>
                      <Trash2 /> Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
