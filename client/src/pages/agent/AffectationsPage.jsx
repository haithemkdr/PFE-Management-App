// AffectationsPage.jsx — Gestion des Affectations (Agent Pédagogique)
// Layout Figma P10 : FormCard (340px) | AffTable (flex-1) — split-layout
// CRUD complet : Créer, Lire, Modifier, Supprimer les affectations enseignant → module → groupe
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Search, Pencil, Trash2, Download } from 'lucide-react';
import '../shared.css';

export default function AffectationsPage() {
  // ─── États principaux ───
  const [affectations, setAffectations] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [modules, setModules] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── États du formulaire ───
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // ─── États des filtres ───
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  // Formulaire vide par défaut
  const emptyForm = {
    id_utilisateur: '',
    id_module: '',
    id_groupe: '',
    annee_univ: '2025-2026'
  };
  const [form, setForm] = useState(emptyForm);

  // ─── Chargement initial des données en parallèle ───
  useEffect(() => {
    loadAll();
  }, []);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get('/agent/affectations'),
      api.get('/agent/enseignants'),
      api.get('/agent/modules'),
      api.get('/agent/groupes')
    ])
      .then(([aff, ens, mod, grp]) => {
        setAffectations(aff.data);
        setEnseignants(ens.data);
        setModules(mod.data);
        setGroupes(grp.data);
      })
      .catch(() => showToast('Erreur chargement données', 'error'))
      .finally(() => setLoading(false));
  }

  // ─── Filtrage des affectations ───
  const filtered = useMemo(() => {
    return affectations.filter(a => {
      // Recherche par nom enseignant, module, ou groupe
      let txt = search.toLowerCase();
      let matchSearch = !search ||
        (a.nom_enseignant + ' ' + a.prenom_enseignant).toLowerCase().includes(txt) ||
        a.nom_module?.toLowerCase().includes(txt) ||
        a.libelle_groupe?.toLowerCase().includes(txt);

      // Filtre par module
      let matchModule = !moduleFilter || String(a.id_module) === moduleFilter;

      return matchSearch && matchModule;
    });
  }, [affectations, search, moduleFilter]);

  // ─── Créer ou modifier une affectation ───
  function handleSubmit(e) {
    e.preventDefault();

    // Vérification côté client — tous les champs sont obligatoires
    if (!form.id_utilisateur || !form.id_module || !form.id_groupe || !form.annee_univ) {
      showToast('Tous les champs sont obligatoires.', 'error');
      return;
    }

    if (editingId) {
      // Mode édition — PUT /agent/affectations/:id
      api.put(`/agent/affectations/${editingId}`, form)
        .then(() => {
          showToast('Affectation modifiée avec succès', 'success');
          resetForm();
          loadAll();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur modification', 'error'));
    } else {
      // Mode création — POST /agent/affectation
      api.post('/agent/affectation', form)
        .then(() => {
          showToast('Affectation créée avec succès', 'success');
          resetForm();
          loadAll();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur création', 'error'));
    }
  }

  // ─── Pré-remplir le formulaire pour modification ───
  function handleEdit(aff) {
    setForm({
      id_utilisateur: aff.id_utilisateur,
      id_module: aff.id_module,
      id_groupe: aff.id_groupe,
      annee_univ: aff.annee_univ || '2025-2026'
    });
    setEditingId(aff.id_affectation);
    // Scroll vers le haut du formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Supprimer une affectation ───
  function handleDelete(id) {
    if (!window.confirm('Supprimer cette affectation ?\nLes notes et absences liées seront aussi supprimées.')) return;
    api.delete(`/agent/affectations/${id}`)
      .then(() => {
        showToast('Affectation supprimée', 'success');
        setAffectations(prev => prev.filter(a => a.id_affectation !== id));
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur suppression', 'error'));
  }

  // ─── Toggle période de saisie (ouvrir / fermer) ───
  function handleTogglePeriode(id) {
    api.patch(`/agent/periodes/${id}/toggle`)
      .then(() => {
        setAffectations(prev => prev.map(a => {
          if (a.id_affectation === id) {
            return { ...a, periode_saisie_ouverte: !a.periode_saisie_ouverte };
          }
          return a;
        }));
        showToast('Période de saisie mise à jour', 'success');
      })
      .catch(() => showToast('Erreur changement période', 'error'));
  }

  // ─── Export CSV ───
  function handleExportCSV() {
    let headers = ['Enseignant', 'Module', 'Groupe', 'Année', 'Semestre', 'Période'];
    let rows = filtered.map(a => [
      a.nom_enseignant + ' ' + a.prenom_enseignant,
      a.nom_module,
      a.libelle_groupe,
      a.annee_univ,
      a.semestre || '',
      a.periode_saisie_ouverte ? 'Ouverte' : 'Fermée'
    ]);
    let csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.download = 'affectations.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ─── Réinitialiser le formulaire ───
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  // ─── Toast (feedback utilisateur) ───
  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── RENDU ───
  return (
    <>
      {/* Figma P10 : Split Layout — FormCard | AffTable */}
      <div className="split-layout">

        {/* ═══ Colonne Gauche : Formulaire Nouvelle Affectation ═══ */}
        <form className="form-panel" onSubmit={handleSubmit} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
          <h4 className="form-panel__title">{editingId ? 'Modifier Affectation' : 'Nouvelle Affectation'}</h4>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)', margin: '0 0 14px' }} />

          {/* Champ 1 : Enseignant */}
          <div className="form-group">
            <label>Enseignant</label>
            <select required value={form.id_utilisateur} onChange={e => setForm({ ...form, id_utilisateur: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {enseignants.map(e => (
                <option key={e.id_utilisateur} value={e.id_utilisateur}>{e.nom} {e.prenom}</option>
              ))}
            </select>
          </div>

          {/* Champ 2 : Module */}
          <div className="form-group">
            <label>Module</label>
            <select required value={form.id_module} onChange={e => setForm({ ...form, id_module: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {modules.map(m => (
                <option key={m.id_module} value={m.id_module}>{m.nom_module} ({m.semestre})</option>
              ))}
            </select>
          </div>

          {/* Champ 3 : Groupe */}
          <div className="form-group">
            <label>Groupe</label>
            <select required value={form.id_groupe} onChange={e => setForm({ ...form, id_groupe: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {groupes.map(g => (
                <option key={g.id_groupe} value={g.id_groupe}>{g.libelle}</option>
              ))}
            </select>
          </div>

          {/* Champ 4 : Année universitaire */}
          <div className="form-group">
            <label>Année Universitaire</label>
            <input
              required
              value={form.annee_univ}
              onChange={e => setForm({ ...form, annee_univ: e.target.value })}
              placeholder="Ex: 2025-2026"
            />
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
              {editingId ? 'Enregistrer' : 'Affecter'}
            </button>
            {editingId && (
              <button type="button" className="btn btn--secondary" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>

        {/* ═══ Colonne Droite : Tableau des Affectations ═══ */}
        <div className="data-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
          {/* En-tête du tableau avec recherche et filtres */}
          <div className="data-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h4 className="data-card__title">
              Affectations
              <span className="badge badge--primary" style={{ marginLeft: 10 }}>{filtered.length}</span>
            </h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Recherche */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 8, top: 8, width: 14, height: 14, color: 'var(--text-muted)' }} />
                <input
                  className="filter-bar__input"
                  style={{ paddingLeft: 28, width: 180 }}
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {/* Filtre par module */}
              <select className="filter-bar__select" style={{ minWidth: 140 }} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
                <option value="">Tous modules</option>
                {modules.map(m => (
                  <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>
                ))}
              </select>
              {/* Export CSV */}
              <button className="btn btn--outline btn--sm" onClick={handleExportCSV} title="Exporter CSV">
                <Download size={14} />
              </button>
            </div>
          </div>

          {/* Tableau de données */}
          <table className="data-table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Module</th>
                <th>Groupe</th>
                <th>Année</th>
                <th>Période</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucune affectation trouvée</td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id_affectation}>
                    <td><strong>{a.nom_enseignant}</strong> {a.prenom_enseignant}</td>
                    <td>{a.nom_module}</td>
                    <td>{a.libelle_groupe}</td>
                    <td>{a.annee_univ}</td>
                    <td>
                      <span
                        className={`status-badge ${a.periode_saisie_ouverte ? 'status-badge--ouverte' : 'status-badge--fermee'}`}
                        onClick={() => handleTogglePeriode(a.id_affectation)}
                        style={{ cursor: 'pointer' }}
                        title="Cliquer pour ouvrir/fermer la période"
                      >
                        {a.periode_saisie_ouverte ? 'Ouverte' : 'Fermée'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="action-icon action-icon--edit" title="Modifier" onClick={() => handleEdit(a)}>
                          <Pencil size={15} />
                        </button>
                        <button className="action-icon action-icon--delete" title="Supprimer" onClick={() => handleDelete(a.id_affectation)}>
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
      </div>

      {/* Toast de feedback */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
