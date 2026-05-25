// ReglesNotesPage.jsx — Règles des Notes (Agent Pédagogique)
// Système 3-way LMD : poids_exam + poids_td + poids_tp = 100%
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Pencil, Filter, RotateCcw, Trash2 } from 'lucide-react';
import '../shared.css';

// Niveau → Semestre mapping (LMD standard)
const NIVEAU_SEMESTERS = {
  L1: [{ value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' }],
  L2: [{ value: 'S3', label: 'Semestre 3' }, { value: 'S4', label: 'Semestre 4' }],
  L3: [{ value: 'S5', label: 'Semestre 5' }, { value: 'S6', label: 'Semestre 6' }]
};

export default function ReglesNotesPage() {
  // ─── États principaux ───
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ─── État formulaire ───
  const [editingId, setEditingId] = useState(null);
  const emptyForm = {
    id_module: '',
    coefficient: 3,
    credits: 6,
    annee_univ: '2024/2025',
    _niveau: '',
    semestre: '',
    poids_exam: 60,
    poids_td: 20,
    poids_tp: 20
  };
  const [form, setForm] = useState(emptyForm);

  // ─── État filtre ───
  const [showFilter, setShowFilter] = useState(false);
  const [filterNiveau, setFilterNiveau] = useState('');
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

  // Ici je filtre les modules par niveau+semestre si un filtre est sélectionné
  const filteredModules = useMemo(() => {
    let result = modules;
    if (filterSemestre) {
      result = result.filter(m => m.semestre === filterSemestre);
    } else if (filterNiveau) {
      const validSemesters = (NIVEAU_SEMESTERS[filterNiveau] || []).map(s => s.value);
      result = result.filter(m => validSemesters.includes(m.semestre));
    }
    return result;
  }, [modules, filterNiveau, filterSemestre]);

  // Ici je remplis le formulaire quand on clique sur "Modifier" dans le tableau
  // Helper: derive niveau from semestre
  function niveauFromSemestre(sem) {
    for (const [niv, sems] of Object.entries(NIVEAU_SEMESTERS)) {
      if (sems.some(s => s.value === sem)) return niv;
    }
    return '';
  }

  function handleEdit(m) {
    const niveau = niveauFromSemestre(m.semestre);
    setEditingId(m.id_module);
    setForm({
      id_module: m.id_module,
      coefficient: m.coefficient,
      credits: m.credits || 6,
      annee_univ: '2024/2025',
      _niveau: niveau,
      semestre: m.semestre,
      poids_exam: Math.round((m.poids_exam || 0.60) * 100),
      poids_td: Math.round((m.poids_td || 0.20) * 100),
      poids_tp: Math.round((m.poids_tp || 0.20) * 100)
    });
  }

  // Somme actuelle des poids (pour validation visuelle)
  const poidsTotal = (parseInt(form.poids_exam) || 0)
                   + (parseInt(form.poids_td) || 0)
                   + (parseInt(form.poids_tp) || 0);

  // Clamp a weight field so the 3 fields never exceed 100 combined
  function clampWeight(field, rawValue) {
    const fields = ['poids_exam', 'poids_td', 'poids_tp'];
    const others = fields.filter(f => f !== field);
    const sumOthers = others.reduce((s, f) => s + (parseInt(form[f]) || 0), 0);
    const maxAllowed = 100 - sumOthers;
    const val = Math.max(0, Math.min(parseInt(rawValue) || 0, maxAllowed));
    setForm({ ...form, [field]: val });
  }

  // Ici j'envoie le formulaire pour enregistrer ou modifier les règles
  function handleSubmit(e) {
    e.preventDefault();

    // Vérification : il faut sélectionner un module
    if (!form.id_module) {
      showToast('Veuillez sélectionner un module', 'error');
      return;
    }

    // Vérification : Poids Exam + TD + TP doit faire 100
    if (poidsTotal !== 100) {
      showToast(`Poids Exam + TD + TP doit être égal à 100 (actuellement : ${poidsTotal})`, 'error');
      return;
    }

    // On prépare les données à envoyer (poids en décimales)
    const payload = {
      id_module: form.id_module,
      coefficient: parseFloat(form.coefficient),
      semestre: form.semestre,
      credits: parseInt(form.credits),
      poids_exam: parseInt(form.poids_exam) / 100,
      poids_td: parseInt(form.poids_td) / 100,
      poids_tp: parseInt(form.poids_tp) / 100
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

  // Réinitialiser les règles d'un module aux valeurs par défaut LMD
  function handleResetRule(m) {
    if (!window.confirm(`Réinitialiser les règles de "${m.nom_module}" aux valeurs par défaut ?\n(Coef: 3, Crédits: 6, Exam/TD/TP: 60/20/20)`)) return;

    const payload = {
      id_module: m.id_module,
      coefficient: 3,
      credits: 6,
      poids_exam: 0.60,
      poids_td: 0.20,
      poids_tp: 0.20
    };

    api.put(`/agent/modules/${m.id_module}/regles-notes`, payload)
      .then(() => {
        showToast('Règle réinitialisée aux valeurs par défaut', 'success');
        loadModules();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur réinitialisation', 'error'));
  }

  // Supprimer les poids de notation d'un module (remettre à 0)
  function handleDeleteRule(m) {
    if (!window.confirm(`Supprimer les règles de notation de "${m.nom_module}" ?\nLes poids Exam/TD/TP seront remis à zéro (0/0/0).`)) return;

    const payload = {
      id_module: m.id_module,
      coefficient: m.coefficient,
      credits: m.credits,
      poids_exam: 0,
      poids_td: 0,
      poids_tp: 0
    };

    api.put(`/agent/modules/${m.id_module}/regles-notes`, payload)
      .then(() => {
        showToast('Règles supprimées (poids remis à zéro)', 'success');
        loadModules();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur suppression', 'error'));
  }

  // Ici j'affiche un message temporaire en bas de l'écran
  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Fonction utilitaire pour afficher le badge coloré d'un poids
  function getPoidsBadge(poids, label) {
    const pct = Math.round((poids || 0) * 100);
    if (pct === 0) {
      return <span className="result-badge result-badge--rat" title={label}>—</span>;
    }
    return <span className="result-badge result-badge--adm" title={label}>{pct}%</span>;
  }

  return (
    <>
      {/* Header de la page */}
      <div className="page-header">
        <h2 className="page-header__title">Règles des notes</h2>
      </div>

      {/* Layout deux colonnes : Formulaire à gauche, Tableau à droite */}
      <div className="split-layout">

        {/* ─── Colonne gauche : FormCard ─── */}
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

            {/* Niveau */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Niveau</label>
              <select
                value={form._niveau}
                onChange={e => setForm({ ...form, _niveau: e.target.value, semestre: '' })}
              >
                <option value="">Sélectionner niveau</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
              </select>
            </div>

            {/* Semestre (filtered by niveau) */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Semestre</label>
              <select
                value={form.semestre}
                onChange={e => setForm({ ...form, semestre: e.target.value })}
                disabled={!form._niveau}
              >
                <option value="">{form._niveau ? 'Sélectionner semestre' : 'Choisir un niveau d\'abord'}</option>
                {(NIVEAU_SEMESTERS[form._niveau] || []).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* ─── Poids 3-way : Exam / TD / TP ─── */}
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>
                Pondération (total = 100%)
              </label>
              {poidsTotal !== 100 && (
                <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 8 }}>
                  ⚠ Total actuel : {poidsTotal}%
                </span>
              )}
            </div>
            <div className="form-row" style={{ marginBottom: 20 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Exam</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.poids_exam}
                  onChange={e => clampWeight('poids_exam', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>TD</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.poids_td}
                  onChange={e => clampWeight('poids_td', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>TP</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.poids_tp}
                  onChange={e => clampWeight('poids_tp', e.target.value)}
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
            <div className="filter-bar" style={{ gap: 8 }}>
              <select
                className="filter-bar__select"
                value={filterNiveau}
                onChange={e => { setFilterNiveau(e.target.value); setFilterSemestre(''); }}
              >
                <option value="">Tous les niveaux</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
              </select>
              <select
                className="filter-bar__select"
                value={filterSemestre}
                onChange={e => setFilterSemestre(e.target.value)}
                disabled={!filterNiveau}
              >
                <option value="">{filterNiveau ? 'Tous les semestres' : 'Choisir un niveau'}</option>
                {(NIVEAU_SEMESTERS[filterNiveau] || []).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Coef.</th>
                <th>Crédits</th>
                <th>Semestre</th>
                <th>Exam</th>
                <th>TD</th>
                <th>TP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
              ) : filteredModules.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun module</td></tr>
              ) : (
                filteredModules.map(m => (
                  <tr key={m.id_module}>
                    <td>{m.nom_module}</td>
                    <td>{m.coefficient}</td>
                    <td>{m.credits}</td>
                    <td>{m.semestre}</td>
                    <td>{getPoidsBadge(m.poids_exam, 'Examen')}</td>
                    <td>{getPoidsBadge(m.poids_td, 'TD')}</td>
                    <td>{getPoidsBadge(m.poids_tp, 'TP')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="action-icon action-icon--edit"
                          title="Modifier"
                          onClick={() => handleEdit(m)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="action-icon"
                          title="Réinitialiser aux valeurs par défaut (60/20/20)"
                          onClick={() => handleResetRule(m)}
                          style={{ color: 'var(--warning, #f59e0b)' }}
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          className="action-icon action-icon--delete"
                          title="Supprimer la règle (poids à zéro)"
                          onClick={() => handleDeleteRule(m)}
                        >
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
