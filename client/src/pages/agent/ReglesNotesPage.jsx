// ReglesNotesPage.jsx — Règles des Notes (Agent Pédagogique)
// Layout Figma P11 : FormCard "Nouvelle Règle" (380px) | Table "Règles des notes" (flex-1)
// CRUD : Créer/Modifier les règles de notation par module
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Pencil, Trash2, Filter } from 'lucide-react';
import '../shared.css';

export default function ReglesNotesPage() {
  // ─── États principaux ───
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ─── État formulaire ───
  const [editingId, setEditingId] = useState(null);
  const emptyForm = {
    id_module: '',
    type_eval: 'Mixte',
    coefficient: 3,
    note_eliminatoire: 5.00,
    credits: 6,
    annee_univ: '2024/2025',
    semestre: 'S1',
    poids_cc: 40,
    poids_ef: 60
  };
  const [form, setForm] = useState(emptyForm);

  // ─── État filtre ───
  const [showFilter, setShowFilter] = useState(false);
  const [filterSemestre, setFilterSemestre] = useState('');

  // ─── Chargement initial ───
  useEffect(() => {
    loadModules();
  }, []);

  // Ici je récupère la liste des modules depuis l'API
  function loadModules() {
    setLoading(true);
    api.get('/agent/modules')
      .then(res => setModules(res.data))
      .catch(() => showToast('Erreur chargement modules', 'error'))
      .finally(() => setLoading(false));
  }

  // Ici je filtre les modules par semestre si un filtre est sélectionné
  const filteredModules = useMemo(() => {
    if (!filterSemestre) return modules;
    return modules.filter(m => m.semestre === filterSemestre);
  }, [modules, filterSemestre]);

  // Ici je remplis le formulaire quand on clique sur "Modifier" dans le tableau
  function handleEdit(m) {
    setEditingId(m.id_module);
    setForm({
      id_module: m.id_module,
      type_eval: m.type_eval || 'Mixte',
      coefficient: m.coefficient,
      note_eliminatoire: m.note_eliminatoire || 5.00,
      credits: m.credits || 6,
      annee_univ: '2024/2025',
      semestre: m.semestre,
      poids_cc: Math.round((m.poids_cc || 0.40) * 100),
      poids_ef: Math.round((m.poids_ef || 0.60) * 100)
    });
  }

  // Ici j'envoie le formulaire pour enregistrer ou modifier les règles
  function handleSubmit(e) {
    e.preventDefault();

    // Vérification : il faut sélectionner un module
    if (!form.id_module) {
      showToast('Veuillez sélectionner un module', 'error');
      return;
    }

    // Vérification : Poids CC + EF doit faire 100
    if (parseInt(form.poids_cc) + parseInt(form.poids_ef) !== 100) {
      showToast('Poids CC + Poids EF doit être égal à 100', 'error');
      return;
    }

    // On prépare les données à envoyer
    const payload = {
      id_module: form.id_module,
      coefficient: parseFloat(form.coefficient),
      semestre: form.semestre,
      type_eval: form.type_eval,
      note_eliminatoire: parseFloat(form.note_eliminatoire),
      credits: parseInt(form.credits),
      poids_cc: parseInt(form.poids_cc) / 100,
      poids_ef: parseInt(form.poids_ef) / 100
    };

    // On utilise PUT avec l'id du module dans l'URL
    api.put(`/agent/modules/${form.id_module}/regles-notes`, payload)
      .then(() => {
        showToast(editingId ? 'Règle modifiée avec succès' : 'Règle enregistrée avec succès', 'success');
        resetForm();
        loadModules();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur serveur', 'error'));
  }

  // Ici je réinitialise le formulaire après enregistrement
  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  // Ici j'affiche un message temporaire en bas de l'écran
  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Fonction utilitaire pour afficher le badge coloré du Poids EF
  function getPoidsEfBadge(poids_ef) {
    const pct = Math.round((poids_ef || 0.60) * 100);
    if (pct >= 100) {
      return <span className="result-badge result-badge--eli">{pct}%</span>;
    } else if (pct >= 60) {
      return <span className="result-badge result-badge--rat">{pct}%</span>;
    } else {
      return <span className="result-badge result-badge--adm">{pct}%</span>;
    }
  }

  return (
    <>
      {/* Header de la page */}
      <div className="page-header">
        <h2 className="page-header__title">Règles des notes</h2>
      </div>

      {/* Layout deux colonnes : Formulaire à gauche, Tableau à droite */}
      <div className="split-layout">

        {/* ─── Colonne gauche : FormCard "Nouvelle Règle" ─── */}
        <div className="form-panel">
          <h4 className="form-panel__title">
            {editingId ? 'Modifier la Règle' : 'Nouvelle Règle'}
          </h4>

          <form onSubmit={handleSubmit}>
            {/* Module */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Module</label>
              <select
                required
                value={form.id_module}
                onChange={e => setForm({ ...form, id_module: e.target.value })}
              >
                <option value="">Sélectionner module</option>
                {modules.map(m => (
                  <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>
                ))}
              </select>
            </div>

            {/* Type Eval. */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Type Eval.</label>
              <select
                value={form.type_eval}
                onChange={e => {
                  const val = e.target.value;
                  // Si 100% Examen, on met automatiquement poids_cc à 0 et poids_ef à 100
                  if (val === '100% Examen') {
                    setForm({ ...form, type_eval: val, poids_cc: 0, poids_ef: 100 });
                  } else {
                    setForm({ ...form, type_eval: val, poids_cc: 40, poids_ef: 60 });
                  }
                }}
              >
                <option value="Mixte">Mixte (CC + EF)</option>
                <option value="100% Examen">100% Examen</option>
              </select>
            </div>

            {/* Coef. */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Coef.</label>
              <select
                value={form.coefficient}
                onChange={e => setForm({ ...form, coefficient: e.target.value })}
              >
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Note Elim. */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Note Elim.</label>
              <select
                value={form.note_eliminatoire}
                onChange={e => setForm({ ...form, note_eliminatoire: e.target.value })}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
                  <option key={n} value={n.toFixed(2)}>{n.toFixed(2)}</option>
                ))}
              </select>
            </div>

            {/* Crédits */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Crédits</label>
              <select
                value={form.credits}
                onChange={e => setForm({ ...form, credits: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Année Univ. */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Annee Univ.</label>
              <select
                value={form.annee_univ}
                onChange={e => setForm({ ...form, annee_univ: e.target.value })}
              >
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </select>
            </div>

            {/* Semestre */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Semestre</label>
              <select
                value={form.semestre}
                onChange={e => setForm({ ...form, semestre: e.target.value })}
              >
                <option value="S1">Semestre 1</option>
                <option value="S2">Semestre 2</option>
              </select>
            </div>

            {/* Poids CC / Poids EF côte à côte */}
            <div className="form-row" style={{ marginBottom: 20 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Poids CC</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.poids_cc}
                  onChange={e => {
                    const cc = parseInt(e.target.value) || 0;
                    setForm({ ...form, poids_cc: cc, poids_ef: 100 - cc });
                  }}
                  disabled={form.type_eval === '100% Examen'}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Poids EF</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.poids_ef}
                  onChange={e => {
                    const ef = parseInt(e.target.value) || 0;
                    setForm({ ...form, poids_ef: ef, poids_cc: 100 - ef });
                  }}
                  disabled={form.type_eval === '100% Examen'}
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn--primary">Enregistrer</button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={resetForm}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>

        {/* ─── Colonne droite : Tableau des règles ─── */}
        <div className="data-card">
          <div className="data-card__header">
            <h4 className="data-card__title">Règles des notes</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge--primary">{filteredModules.length} modules</span>
              <button
                className="btn btn--outline btn--sm"
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter /> Filtrer
              </button>
            </div>
          </div>

          {/* Barre de filtre par semestre */}
          {showFilter && (
            <div className="filter-bar">
              <select
                className="filter-bar__select"
                value={filterSemestre}
                onChange={e => setFilterSemestre(e.target.value)}
              >
                <option value="">Tous les semestres</option>
                <option value="S1">Semestre 1</option>
                <option value="S2">Semestre 2</option>
              </select>
            </div>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Type Eval.</th>
                <th>Coef.</th>
                <th>Note Elim</th>
                <th>Poids CC</th>
                <th>Poids EF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
              ) : filteredModules.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun module</td></tr>
              ) : (
                filteredModules.map(m => (
                  <tr key={m.id_module}>
                    <td>{m.nom_module}</td>
                    <td>{m.type_eval || 'Mixte'}</td>
                    <td>{m.coefficient}</td>
                    <td>{parseFloat(m.note_eliminatoire || 5).toFixed(2)}</td>
                    <td>{Math.round((m.poids_cc || 0.40) * 100)}%</td>
                    <td>{getPoidsEfBadge(m.poids_ef)}</td>
                    <td>
                      <button
                        className="action-icon action-icon--edit"
                        title="Modifier"
                        onClick={() => handleEdit(m)}
                      >
                        <Pencil />
                      </button>
                      {/* Pas de suppression de module dans cette page — on modifie seulement les règles */}
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
