import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Lock, Unlock, Info } from 'lucide-react';
import '../shared.css';

/**
 * PeriodesPage — Gestion des Périodes de Saisie (UC-A04)
 * Correspond au Figma Page 12 (node 21:5456)
 *
 * L'agent peut ouvrir ou fermer la saisie des notes par affectation.
 * Les enseignants ne peuvent saisir les notes que si la période est ouverte.
 *
 * Design : full-width data table avec filtres + toggles switches
 */
export default function PeriodesPage() {
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filtres — Figma montre 3 filtres : Année, Semestre, Filière (groupe)
  const [anneeFilter, setAnneeFilter] = useState('');
  const [semestreFilter, setSemestreFilter] = useState('');
  const [groupeFilter, setGroupeFilter] = useState('');

  useEffect(() => {
    loadAffectations();
  }, []);

  function loadAffectations() {
    setLoading(true);
    api.get('/agent/affectations')
      .then(res => setAffectations(res.data))
      .catch(() => showToast('Erreur chargement des affectations', 'error'))
      .finally(() => setLoading(false));
  }

  // Valeurs uniques pour les filtres
  const annees = [...new Set(affectations.map(a => a.annee_univ))].sort().reverse();
  const semestres = [...new Set(affectations.map(a => a.semestre).filter(Boolean))].sort();
  const groupes = [...new Set(affectations.map(a => a.libelle_groupe).filter(Boolean))].sort();

  // Filtrage des affectations
  const filtered = useMemo(() => {
    return affectations.filter(a => {
      if (anneeFilter && a.annee_univ !== anneeFilter) return false;
      if (semestreFilter && a.semestre !== semestreFilter) return false;
      if (groupeFilter && a.libelle_groupe !== groupeFilter) return false;
      return true;
    });
  }, [affectations, anneeFilter, semestreFilter, groupeFilter]);

  // Toggle une seule affectation via PATCH /agent/periodes/:id/toggle
  function handleToggle(id, currentState) {
    api.patch(`/agent/periodes/${id}/toggle`)
      .then(() => {
        setAffectations(prev =>
          prev.map(a =>
            a.id_affectation === id
              ? { ...a, periode_saisie_ouverte: currentState ? 0 : 1 }
              : a
          )
        );
        showToast(
          currentState ? 'Période fermée avec succès' : 'Période ouverte avec succès',
          'success'
        );
      })
      .catch(() => showToast('Erreur lors de la mise à jour', 'error'));
  }

  // Actions en masse — ouvrir ou fermer toutes les affectations filtrées
  function handleBulk(open) {
    const toToggle = filtered.filter(a =>
      a.periode_saisie_ouverte !== (open ? 1 : 0)
    );

    if (toToggle.length === 0) {
      showToast(
        open ? 'Toutes les périodes sont déjà ouvertes' : 'Toutes les périodes sont déjà fermées',
        'success'
      );
      return;
    }

    const promises = toToggle.map(a =>
      api.patch(`/agent/periodes/${a.id_affectation}/toggle`)
    );

    Promise.all(promises)
      .then(() => {
        loadAffectations();
        showToast(
          open ? 'Toutes les périodes ouvertes' : 'Toutes les périodes fermées',
          'success'
        );
      })
      .catch(() => showToast('Erreur lors de la mise à jour en masse', 'error'));
  }

  // Formater le rapport CC/EF pour l'affichage (ex: "40/60")
  function formatCcEf(poids_cc, poids_ef) {
    const cc = poids_cc != null ? Math.round(poids_cc * 100) : '—';
    const ef = poids_ef != null ? Math.round(poids_ef * 100) : '—';
    return `${cc}/${ef}`;
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      {/* Titre de la page */}
      <div className="page-header">
        <h2 className="page-header__title">Gestion des Périodes de Saisie</h2>
      </div>

      {/* Barre de filtres + actions en masse — Figma : 3 selects + 2 boutons */}
      <div className="filter-bar">
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>Filtres:</span>

        <select
          className="filter-bar__select"
          value={anneeFilter}
          onChange={e => setAnneeFilter(e.target.value)}
        >
          <option value="">Toutes les années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          className="filter-bar__select"
          value={semestreFilter}
          onChange={e => setSemestreFilter(e.target.value)}
        >
          <option value="">Tous les semestres</option>
          {semestres.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="filter-bar__select"
          value={groupeFilter}
          onChange={e => setGroupeFilter(e.target.value)}
        >
          <option value="">Toutes les filières</option>
          {groupes.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <div className="filter-bar__spacer" />

        <button className="btn btn--success btn--sm" onClick={() => handleBulk(true)}>
          <Unlock /> Ouvrir tout
        </button>
        <button className="btn btn--danger btn--sm" onClick={() => handleBulk(false)}>
          <Lock /> Fermer tout
        </button>
      </div>

      {/* Bandeau d'information — Figma : alerte bleue info */}
      <div className="alert alert--info">
        <Info className="alert__icon" />
        Lorsqu'une période est ouverte, les enseignants peuvent saisir et modifier les notes pour les affectations correspondantes.
      </div>

      {/* Tableau des affectations — Figma : colonnes complètes */}
      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Enseignant</th>
              <th>Module</th>
              <th>Groupe</th>
              <th>Année Univ.</th>
              <th>Semestre</th>
              <th>CC / EF</th>
              <th>Statut Période</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Aucune affectation trouvée
                </td>
              </tr>
            ) : (
              filtered.map(a => (
                <tr key={a.id_affectation}>
                  {/* Enseignant — Figma : "M. Benali" → Initiale prénom + nom */}
                  <td>{a.prenom_enseignant?.charAt(0)}. {a.nom_enseignant}</td>

                  {/* Module */}
                  <td>{a.nom_module}</td>

                  {/* Groupe */}
                  <td>{a.libelle_groupe}</td>

                  {/* Année Univ. */}
                  <td>{a.annee_univ}</td>

                  {/* Semestre */}
                  <td>{a.semestre || '—'}</td>

                  {/* CC/EF — Figma : "40/60" */}
                  <td>{formatCcEf(a.poids_cc, a.poids_ef)}</td>

                  {/* Statut Période — Figma : badge vert/rouge */}
                  <td>
                    <span
                      className={`status-badge ${
                        a.periode_saisie_ouverte
                          ? 'status-badge--ouverte'
                          : 'status-badge--fermee'
                      }`}
                    >
                      {a.periode_saisie_ouverte ? 'Ouverte' : 'Fermée'}
                    </span>
                  </td>

                  {/* Action — Figma : toggle switch + texte Ouvrir/Fermer */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={!!a.periode_saisie_ouverte}
                          onChange={() => handleToggle(a.id_affectation, a.periode_saisie_ouverte)}
                        />
                        <span className="toggle__slider" />
                      </label>
                      <span style={{
                        fontSize: 'var(--font-size-caption)',
                        color: a.periode_saisie_ouverte ? 'var(--semantic-success)' : 'var(--text-secondary)',
                        fontWeight: 500
                      }}>
                        {a.periode_saisie_ouverte ? 'Ouvrir' : 'Fermer'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Toast de feedback */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
