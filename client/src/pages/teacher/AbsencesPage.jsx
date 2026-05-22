import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Search, CalendarDays, Save, AlertTriangle } from 'lucide-react';
import '../shared.css';

export default function AbsencesPage() {
  const { user } = useAuth();
  const [affectations, setAffectations] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [dateSeance, setDateSeance] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [originalStudents, setOriginalStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/notes/mes-affectations')
      .then(res => setAffectations(res.data))
      .catch(err => console.error('Erreur affectations:', err));
  }, []);

  const modules = [...new Map(affectations.map(a => [a.id_module, a])).values()];
  const groupes = affectations.filter(a => String(a.id_module) === selectedModule);

  function getAffectationId() {
    const aff = affectations.find(
      a => String(a.id_module) === selectedModule && String(a.id_groupe) === selectedGroupe
    );
    return aff ? aff.id_affectation : null;
  }

  function loadAppel() {
    if (!selectedModule || !selectedGroupe || !dateSeance) return;
    setLoading(true);
    api.get(`/absences/appel/${selectedModule}/${selectedGroupe}/${dateSeance}`)
      .then(res => {
        // Initialiser le state local pour permettre la modification avant sauvegarde
        const data = res.data.map(s => ({
          ...s,
          statut: s.statut || 'Présent',
          justifiee: Boolean(s.justifiee)
        }));
        setStudents(data);
        setOriginalStudents(JSON.parse(JSON.stringify(data)));
      })
      .catch(err => console.error('Erreur chargement appel:', err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (selectedModule && selectedGroupe && dateSeance) {
      loadAppel();
    } else {
      setStudents([]);
    }
  }, [selectedModule, selectedGroupe, dateSeance]);

  function handleStatusChange(id_etudiant, newStatus) {
    setStudents(prev => prev.map(s => 
      s.id_etudiant === id_etudiant ? { ...s, statut: newStatus } : s
    ));
  }

  function handleJustifieeChange(id_etudiant, checked) {
    setStudents(prev => prev.map(s => 
      s.id_etudiant === id_etudiant ? { ...s, justifiee: checked } : s
    ));
  }

  function resetSession() {
    setStudents(JSON.parse(JSON.stringify(originalStudents)));
  }

  async function saveSession() {
    const id_affectation = getAffectationId();
    if (!id_affectation) {
      showToast('Affectation introuvable', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id_affectation,
        date_seance: dateSeance,
        etudiants: students.map(s => ({
          id_etudiant: s.id_etudiant,
          statut: s.statut,
          justifiee: s.justifiee
        }))
      };

      const res = await api.post('/absences/enregistrer-seance', payload);
      
      let msgType = 'success';
      if (res.data.exclus && res.data.exclus.length > 0) {
        msgType = 'warning'; // Affiche le toast d'alerte en cas d'exclusions
      }
      
      showToast(res.data.message, msgType);
      
      // Recharger pour être sûr d'avoir la donnée fraîche
      loadAppel();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la sauvegarde de la séance', 'error');
    } finally {
      setSaving(false);
    }
  }

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // 5 sec pour laisser le temps de lire (surtout s'il y a des exclus)
  }

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.matricule?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="filter-bar">
        <select className="filter-bar__select" value={selectedModule}
          onChange={e => { setSelectedModule(e.target.value); setSelectedGroupe(''); }}>
          <option value="">— Module —</option>
          {modules.map(m => (
            <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>
          ))}
        </select>

        <select className="filter-bar__select" value={selectedGroupe}
          onChange={e => setSelectedGroupe(e.target.value)} disabled={!selectedModule}>
          <option value="">— Groupe —</option>
          {groupes.map(g => (
            <option key={g.id_groupe} value={g.id_groupe}>{g.nom_groupe}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays style={{ width: 16, height: 16, color: '#6b7280' }} />
          <input type="date" className="filter-bar__input" value={dateSeance}
            onChange={e => setDateSeance(e.target.value)} />
        </div>

        <div className="filter-bar__spacer" />

        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 15, height: 15, color: '#9ca3af' }} />
          <input className="filter-bar__input" placeholder="Rechercher…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : students.length === 0 && selectedModule && selectedGroupe ? (
        <div className="empty-state">Aucun étudiant pour cette séance</div>
      ) : students.length > 0 ? (
        <>
          <div className="batch-bar">
            <div className="session-info">
              <span className="session-info__tag">
                {groupes.find(g => String(g.id_groupe) === selectedGroupe)?.nom_groupe || 'Groupe'}
              </span>
              <span className="batch-bar__info">{students.length} étudiant(s)</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn" 
                onClick={resetSession} 
                disabled={saving || JSON.stringify(students) === JSON.stringify(originalStudents)}
                style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}
              >
                Annuler
              </button>
              <button 
                className="btn--save-session" 
                onClick={saveSession} 
                disabled={saving || JSON.stringify(students) === JSON.stringify(originalStudents)}
              >
                <Save size={16} />
                {saving ? 'Enregistrement...' : 'Enregistrer la séance'}
              </button>
            </div>
          </div>

          <div className="data-card" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Étudiant</th>
                  <th>Statut d'Absence</th>
                  <th style={{ textAlign: 'center' }}>Justifiée ?</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id_etudiant}>
                    <td>{s.matricule}</td>
                    <td>{s.nom} {s.prenom}</td>
                    <td>
                      {s.resultat === 'EXC' ? (
                        <div className="attendance-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '500', cursor: 'not-allowed', width: 'fit-content' }}>
                          Exclu du module
                        </div>
                      ) : (
                        <div className="attendance-group">
                          <div 
                            className={`attendance-badge ${s.statut === 'Présent' ? 'attendance-badge--present' : 'attendance-badge--inactive'}`}
                            onClick={() => handleStatusChange(s.id_etudiant, 'Présent')}
                          >
                            <div className={`attendance-dot ${s.statut === 'Présent' ? 'attendance-dot--present' : ''}`} />
                            Présent
                          </div>
                          <div 
                            className={`attendance-badge ${s.statut === 'Absent' ? 'attendance-badge--absent' : 'attendance-badge--inactive'}`}
                            onClick={() => handleStatusChange(s.id_etudiant, 'Absent')}
                          >
                            <div className={`attendance-dot ${s.statut === 'Absent' ? 'attendance-dot--absent' : ''}`} />
                            Absent
                          </div>
                          <div 
                            className={`attendance-badge ${s.statut === 'Retard' ? 'attendance-badge--retard' : 'attendance-badge--inactive'}`}
                            onClick={() => handleStatusChange(s.id_etudiant, 'Retard')}
                          >
                            <div className={`attendance-dot ${s.statut === 'Retard' ? 'attendance-dot--retard' : ''}`} />
                            Retard
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        className="justify-checkbox"
                        checked={s.justifiee}
                        onChange={(e) => handleJustifieeChange(s.id_etudiant, e.target.checked)}
                        disabled={s.statut === 'Présent' || s.resultat === 'EXC'}
                        title={s.resultat === 'EXC' ? "Étudiant exclu" : s.statut === 'Présent' ? "Non applicable si présent" : "Cocher si l'absence/retard est justifié(e)"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {toast && (
        <div className={`toast ${toast.type === 'warning' ? 'toast--warning' : `toast--${toast.type}`}`}>
          {toast.type === 'warning' && <AlertTriangle size={18} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }} />}
          <span style={{ verticalAlign: 'middle' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
