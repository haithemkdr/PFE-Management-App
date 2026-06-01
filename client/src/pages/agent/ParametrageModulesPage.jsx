// ParametrageModulesPage.jsx — Paramétrage des Modules (Agent Pédagogique)
// L'agent configure uniquement coefficient et crédits.
// Les pondérations (Exam/TD/TP) sont désormais gérées par le coordonnateur de matière.
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Pencil, Filter, RotateCcw } from 'lucide-react';
import '../shared.css';

// Niveau → Semestre mapping (LMD standard)
const NIVEAU_SEMESTERS = {
  L1: [{ value: 'S1', label: 'Semestre 1' }, { value: 'S2', label: 'Semestre 2' }],
  L2: [{ value: 'S3', label: 'Semestre 3' }, { value: 'S4', label: 'Semestre 4' }],
  L3: [{ value: 'S5', label: 'Semestre 5' }, { value: 'S6', label: 'Semestre 6' }]
};

export default function ParametrageModulesPage() {
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
    semestre: ''
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

  function loadModules() {
    setLoading(true);
    api.get('/agent/modules')
      .then(res => setModules(res.data))
      .catch(() => showToast('Erreur chargement modules', 'error'))
      .finally(() => setLoading(false));
  }

  // Filtrage par niveau+semestre
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

  // Helper: derive niveau from semestre
  function niveauFromSemestre(sem) {
    for (const [niv, sems] of Object.entries(NIVEAU_SEMESTERS)) {
      if (sems.some(s => s.value === sem)) return niv;
    }
    return '';
  }

  // Pré-remplir le formulaire pour modification
  function handleEdit(m) {
    const niveau = niveauFromSemestre(m.semestre);
    setEditingId(m.id_module);
    setForm({
      id_module: m.id_module,
      coefficient: m.coefficient,
      credits: m.credits || 6,
      annee_univ: '2024/2025',
      _niveau: niveau,
      semestre: m.semestre
    });
  }

  // Soumission — envoie uniquement coefficient et crédits
  function handleSubmit(e) {
    e.preventDefault();

    if (!form.id_module) {
      showToast('Veuillez sélectionner un module', 'error');
      return;
    }

    const payload = {
      id_module: form.id_module,
      coefficient: parseFloat(form.coefficient),
      semestre: form.semestre,
      credits: parseInt(form.credits)
    };

    api.put(`/agent/modules/${form.id_module}/regles-notes`, payload)
      .then(() => {
        showToast(editingId ? 'Module modifié avec succès' : 'Paramétrage enregistré avec succès', 'success');
        resetForm();
        loadModules();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur serveur', 'error'));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  // Réinitialiser aux valeurs LMD par défaut
  function handleResetRule(m) {
    if (!window.confirm(`Réinitialiser "${m.nom_module}" aux valeurs par défaut ?\n(Coef: 3, Crédits: 6)`)) return;

    const payload = {
      id_module: m.id_module,
      coefficient: 3,
      credits: 6
    };

    api.put(`/agent/modules/${m.id_module}/regles-notes`, payload)
      .then(() => {
        showToast('Paramétrage réinitialisé aux valeurs par défaut', 'success');
        loadModules();
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur réinitialisation', 'error'));
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Badge pour pondération (lecture seule — définie par le coordonnateur)
  function getPoidsBadge(poids, label) {
    const pct = Math.round((poids || 0) * 100);
    if (pct === 0) {
      return <span className="result-badge result-badge--rat" title={label}>—</span>;
    }
    return <span className="result-badge result-badge--adm" title={label}>{pct}%</span>;
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h2 className="page-header__title">Paramétrage des modules</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Configurez les coefficients et crédits. Les pondérations sont gérées par le coordonnateur de matière.
        </p>
      </div>

      {/* Layout deux colonnes */}
      <div className="split-layout">

        {/* ─── Colonne gauche : Formulaire ─── */}
        <div className="form-panel">
          <h4 className="form-panel__title">
            {editingId ? 'Modifier le paramétrage' : 'Paramétrage du module'}
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
              <label>Coefficient</label>
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
              <label>Année Univ.</label>
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

            {/* Semestre */}
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

            {/* Boutons */}
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

        {/* ─── Colonne droite : Tableau ─── */}
        <div className="data-card">
          <div className="data-card__header">
            <h4 className="data-card__title">Modules configurés</h4>
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

          {/* Barre de filtre */}
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
                <th title="Défini par le coordonnateur">Exam</th>
                <th title="Défini par le coordonnateur">TD</th>
                <th title="Défini par le coordonnateur">TP</th>
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
                    <td>{getPoidsBadge(m.poids_exam, 'Examen (coordonnateur)')}</td>
                    <td>{getPoidsBadge(m.poids_td, 'TD (coordonnateur)')}</td>
                    <td>{getPoidsBadge(m.poids_tp, 'TP (coordonnateur)')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="action-icon action-icon--edit"
                          title="Modifier coefficient / crédits"
                          onClick={() => handleEdit(m)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="action-icon"
                          title="Réinitialiser (Coef: 3, Crédits: 6)"
                          onClick={() => handleResetRule(m)}
                          style={{ color: 'var(--warning, #f59e0b)' }}
                        >
                          <RotateCcw size={15} />
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

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
