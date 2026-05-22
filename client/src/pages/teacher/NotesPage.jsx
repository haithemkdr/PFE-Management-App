import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { CheckCircle, AlertTriangle, Save, Search } from 'lucide-react';
import '../shared.css';

export default function NotesPage() {
  const [affectations, setAffectations] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [students, setStudents] = useState([]);
  const [periodeOuverte, setPeriodeOuverte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  // Load teacher affectations on mount
  useEffect(() => {
    api.get('/notes/mes-affectations')
      .then(res => setAffectations(res.data))
      .catch(err => console.error('Erreur chargement affectations:', err));
  }, []);

  // Derive unique modules and matching groupes
  const modules = [...new Map(affectations.map(a => [a.id_module, a])).values()];
  const groupes = affectations.filter(a => String(a.id_module) === selectedModule);

  // Load students when both filters are set
  useEffect(() => {
    if (!selectedModule || !selectedGroupe) return;
    setLoading(true);
    api.get(`/notes?id_module=${selectedModule}&id_groupe=${selectedGroupe}`)
      .then(res => {
        setStudents(res.data);
        // Check if grading period is open for this affectation
        const aff = affectations.find(
          a => String(a.id_module) === selectedModule && String(a.id_groupe) === selectedGroupe
        );
        setPeriodeOuverte(aff ? aff.periode_saisie_ouverte === 1 : false);
      })
      .catch(err => console.error('Erreur chargement notes:', err))
      .finally(() => setLoading(false));
  }, [selectedModule, selectedGroupe, affectations]);

  function handleNoteChange(idx, field, value) {
    const updated = [...students];
    updated[idx] = { ...updated[idx], [field]: value === '' ? null : parseFloat(value) };
    setStudents(updated);
  }

  async function handleSave(student) {
    setSaving(true);
    try {
      await api.post('/notes/upsert', {
        id_etudiant: student.id_etudiant,
        id_module: Number(selectedModule),
        id_groupe: Number(selectedGroupe),
        note_cc: student.note_cc,
        note_ef: student.note_ef,
        note_er: student.note_er,
      });
      showToast('Note enregistrée avec succès', 'success');
      // Reload to get recalculated moyenne
      const res = await api.get(`/notes?id_module=${selectedModule}&id_groupe=${selectedGroupe}`);
      setStudents(res.data);
    } catch (err) {
      const msg = err.response?.data || 'Erreur lors de la sauvegarde';
      showToast(typeof msg === 'string' ? msg : msg.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function getResultBadge(resultat) {
    if (!resultat) return null;
    const cls = resultat === 'ADM' ? 'result-badge--adm'
      : resultat === 'RAT' ? 'result-badge--rat'
      : 'result-badge--eli';
    return <span className={`result-badge ${cls}`}>{resultat}</span>;
  }

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.matricule?.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Period status banner */}
      {periodeOuverte !== null && (
        <div className={`alert ${periodeOuverte ? 'alert--success' : 'alert--danger'}`}>
          {periodeOuverte
            ? <><CheckCircle className="alert__icon" /> La période de saisie est ouverte. Vous pouvez modifier les notes.</>
            : <><AlertTriangle className="alert__icon" /> La période de saisie est fermée. Contactez l'agent de scolarité.</>
          }
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <select
          className="filter-bar__select"
          value={selectedModule}
          onChange={e => { setSelectedModule(e.target.value); setSelectedGroupe(''); setStudents([]); setPeriodeOuverte(null); }}
        >
          <option value="">— Choisir un module —</option>
          {modules.map(m => (
            <option key={m.id_module} value={m.id_module}>
              {m.nom_module}
            </option>
          ))}
        </select>

        <select
          className="filter-bar__select"
          value={selectedGroupe}
          onChange={e => setSelectedGroupe(e.target.value)}
          disabled={!selectedModule}
        >
          <option value="">— Choisir un groupe —</option>
          {groupes.map(g => (
            <option key={g.id_groupe} value={g.id_groupe}>{g.nom_groupe}</option>
          ))}
        </select>

        <div className="filter-bar__spacer" />

        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 15, height: 15, color: '#9ca3af' }} />
          <input
            className="filter-bar__input"
            placeholder="Rechercher étudiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : filtered.length === 0 && selectedModule && selectedGroupe ? (
        <div className="empty-state">Aucun étudiant trouvé</div>
      ) : filtered.length > 0 ? (
        <div className="data-card">
          <div className="data-card__header">
            <span className="data-card__title">Notes des étudiants</span>
            <span className="data-card__subtitle">{filtered.length} étudiant(s)</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>CC</th>
                <th>EF</th>
                <th>ER</th>
                <th>Moyenne</th>
                <th>Résultat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id_etudiant}>
                  <td>{s.matricule}</td>
                  <td>{s.nom}</td>
                  <td>{s.prenom}</td>
                  <td>
                    <input
                      type="number" min="0" max="20" step="0.25"
                      className="cell-input"
                      value={s.note_cc ?? ''}
                      onChange={e => handleNoteChange(idx, 'note_cc', e.target.value)}
                      disabled={!periodeOuverte}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="0" max="20" step="0.25"
                      className="cell-input"
                      value={s.note_ef ?? ''}
                      onChange={e => handleNoteChange(idx, 'note_ef', e.target.value)}
                      disabled={!periodeOuverte}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="0" max="20" step="0.25"
                      className="cell-input"
                      value={s.note_er ?? ''}
                      onChange={e => handleNoteChange(idx, 'note_er', e.target.value)}
                      disabled={!periodeOuverte}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {s.moyenne_finale != null ? parseFloat(s.moyenne_finale).toFixed(2) : '—'}
                  </td>
                  <td>{getResultBadge(s.resultat)}</td>
                  <td>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => handleSave(s)}
                      disabled={!periodeOuverte || saving}
                      title="Enregistrer cette note"
                    >
                      <Save /> Sauver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
