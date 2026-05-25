// NotesPage.jsx — Saisie des Notes (Enseignant)
// Système 3-way LMD : note_td + note_tp + note_ef + note_er
// Accès par colonne : CM → EF/ER, TD → note_td, TP → note_tp
// Session sync: ER masqué en NORMALE, CC verrouillé en RATTRAPAGE
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { CheckCircle, AlertTriangle, Save, Search, Lock, UserX, SaveAll } from 'lucide-react';
import '../shared.css';

export default function NotesPage() {
  const [affectations, setAffectations] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAffectation, setSelectedAffectation] = useState('');
  const [students, setStudents] = useState([]);
  const [periodeOuverte, setPeriodeOuverte] = useState(null);
  const [typeSeance, setTypeSeance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});  // track per-student save state
  const [savingAll, setSavingAll] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [sessionType, setSessionType] = useState(null); // 'NORMALE' | 'RATTRAPAGE'

  useEffect(() => {
    api.get('/notes/mes-affectations')
      .then(res => setAffectations(res.data))
      .catch(err => console.error('Erreur chargement affectations:', err));
  }, []);

  const modules = [...new Map(affectations.map(a => [a.id_module, a])).values()];
  const moduleAffectations = affectations.filter(a => String(a.id_module) === selectedModule);

  // Load students + session info when affectation changes
  useEffect(() => {
    if (!selectedModule || !selectedAffectation) return;
    const aff = affectations.find(a => String(a.id_affectation) === selectedAffectation);
    if (!aff) return;

    setLoading(true);
    setTypeSeance(aff.type_seance);
    setPeriodeOuverte(aff.periode_saisie_ouverte === 1);

    let params = `id_module=${aff.id_module}&id_affectation=${aff.id_affectation}`;
    if (aff.id_groupe) params += `&id_groupe=${aff.id_groupe}`;

    // Fetch students AND session state in parallel
    Promise.all([
      api.get(`/notes?${params}`),
      aff.semestre ? api.get(`/agent/session-active?semestre=${aff.semestre}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    ]).then(([notesRes, sessRes]) => {
      setStudents(notesRes.data);
      const sessions = sessRes.data;
      const sess = Array.isArray(sessions) ? sessions[0] : sessions;
      setSessionType(sess?.type_session || 'NORMALE');
    }).catch(err => console.error('Erreur:', err))
      .finally(() => setLoading(false));
  }, [selectedModule, selectedAffectation, affectations]);

  const isRattrapage = sessionType === 'RATTRAPAGE';
  const isNormale = sessionType === 'NORMALE';

  // Union of all types this teacher has for the selected module
  // A teacher with CM+TD can edit both EF (from CM) and note_td (from TD)
  const ownedTypes = new Set(moduleAffectations.map(a => a.type_seance));
  const hasTypeTD = ownedTypes.has('TD');
  const hasTypeTP = ownedTypes.has('TP');
  const hasTypeCM = ownedTypes.has('CM');

  const canEditTD = hasTypeTD && !isRattrapage;
  const canEditTP = hasTypeTP && !isRattrapage;
  const canEditEF = hasTypeCM && isNormale;
  const canEditER = hasTypeCM && isRattrapage;

  const showEF = hasTypeCM;
  const showER = hasTypeCM && isRattrapage;

  function handleNoteChange(idx, field, value) {
    const updated = [...students];
    updated[idx] = { ...updated[idx], [field]: value === '' ? null : parseFloat(value) };
    setStudents(updated);
  }

  async function reloadStudents() {
    const aff = affectations.find(a => String(a.id_affectation) === selectedAffectation);
    if (!aff) return;
    let params = `id_module=${selectedModule}&id_affectation=${selectedAffectation}`;
    if (aff?.id_groupe) params += `&id_groupe=${aff.id_groupe}`;
    const res = await api.get(`/notes?${params}`);
    setStudents(res.data);
  }

  async function handleSave(student) {
    setSaving(prev => ({ ...prev, [student.id_etudiant]: true }));
    try {
      const aff = affectations.find(a => String(a.id_affectation) === selectedAffectation);
      const payload = {
        id_etudiant: student.id_etudiant,
        id_module: Number(selectedModule),
        id_groupe: aff?.id_groupe ? Number(aff.id_groupe) : null,
      };
      if (canEditTD) payload.note_td = student.note_td;
      if (canEditTP) payload.note_tp = student.note_tp;
      if (canEditEF) payload.note_ef = student.note_ef;
      if (canEditER) payload.note_er = student.note_er;

      await api.post('/notes/upsert', payload);
      showToast('Note enregistrée', 'success');
      await reloadStudents();
    } catch (err) {
      const msg = err.response?.data || 'Erreur lors de la sauvegarde';
      showToast(typeof msg === 'string' ? msg : msg.message, 'error');
    } finally {
      setSaving(prev => ({ ...prev, [student.id_etudiant]: false }));
    }
  }

  async function handleSaveAll() {
    const editableStudents = filtered.filter(s => s.resultat !== 'ELI');
    if (!editableStudents.length) return;
    setSavingAll(true);
    let ok = 0, fail = 0;
    for (const student of editableStudents) {
      try {
        const aff = affectations.find(a => String(a.id_affectation) === selectedAffectation);
        const payload = {
          id_etudiant: student.id_etudiant,
          id_module: Number(selectedModule),
          id_groupe: aff?.id_groupe ? Number(aff.id_groupe) : null,
        };
        if (canEditTD) payload.note_td = student.note_td;
        if (canEditTP) payload.note_tp = student.note_tp;
        if (canEditEF) payload.note_ef = student.note_ef;
        if (canEditER) payload.note_er = student.note_er;
        await api.post('/notes/upsert', payload);
        ok++;
      } catch { fail++; }
    }
    await reloadStudents();
    showToast(`${ok} note(s) enregistrée(s)${fail ? `, ${fail} erreur(s)` : ''}`, fail ? 'error' : 'success');
    setSavingAll(false);
  }

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function getResultBadge(resultat) {
    if (!resultat) return null;
    if (resultat === 'ELI') return <span className="result-badge result-badge--eli">EXCLU</span>;
    const cls = resultat === 'ADM' ? 'result-badge--adm' : 'result-badge--rat';
    return <span className={`result-badge ${cls}`}>{resultat}</span>;
  }

  function getAffectationLabel(a) {
    if (a.type_seance === 'CM') return `CM — ${a.section || '?'} (${a.niveau || '?'})`;
    return `${a.type_seance} — ${a.nom_groupe || 'Groupe ?'}`;
  }

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.matricule?.toLowerCase().includes(q);
  });

  const seanceBadge = typeSeance ? (
    <span className={`type-seance-badge type-seance-badge--${typeSeance?.toLowerCase()}`}>{typeSeance}</span>
  ) : null;

  function getAccessMessage() {
    let base = '';
    if (typeSeance === 'CM') {
      base = isRattrapage
        ? "Session Rattrapage — Vous pouvez saisir la note d'examen de rattrapage (ER). Les notes CC et EF sont verrouillées."
        : "Session Normale — Vous pouvez modifier la colonne Examen Final (EF). Les colonnes TD/TP sont gérées par les enseignants TD et TP.";
    } else if (typeSeance === 'TD') {
      base = isRattrapage
        ? "Session Rattrapage — La note TD est verrouillée (contrôle continu conservé)."
        : "Session Normale — Vous pouvez modifier la colonne TD.";
    } else if (typeSeance === 'TP') {
      base = isRattrapage
        ? "Session Rattrapage — La note TP est verrouillée (contrôle continu conservé)."
        : "Session Normale — Vous pouvez modifier la colonne TP.";
    }
    return base;
  }

  const anyEditable = canEditTD || canEditTP || canEditEF || canEditER;

  return (
    <div>
      {/* Period status */}
      {periodeOuverte !== null && (
        <div className={`alert ${periodeOuverte ? 'alert--success' : 'alert--danger'}`}>
          {periodeOuverte
            ? <><CheckCircle className="alert__icon" /> La période de saisie est ouverte. Vous pouvez modifier les notes.</>
            : <><AlertTriangle className="alert__icon" /> La période de saisie est fermée. Contactez l'agent de scolarité.</>
          }
        </div>
      )}

      {/* Access info banner */}
      {typeSeance && periodeOuverte && (
        <div className={`alert ${isRattrapage ? 'alert--warning' : 'alert--info'}`} style={{ marginTop: 8 }}>
          <Lock className="alert__icon" />
          {getAccessMessage()}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <select className="filter-bar__select" value={selectedModule}
          onChange={e => { setSelectedModule(e.target.value); setSelectedAffectation(''); setStudents([]); setPeriodeOuverte(null); setTypeSeance(null); setSessionType(null); }}>
          <option value="">— Choisir un module —</option>
          {modules.map(m => <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>)}
        </select>
        <select className="filter-bar__select" value={selectedAffectation}
          onChange={e => setSelectedAffectation(e.target.value)} disabled={!selectedModule}>
          <option value="">— Choisir une affectation —</option>
          {moduleAffectations.map(a => <option key={a.id_affectation} value={a.id_affectation}>{getAffectationLabel(a)}</option>)}
        </select>
        <div className="filter-bar__spacer" />
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 15, height: 15, color: '#9ca3af' }} />
          <input className="filter-bar__input" placeholder="Rechercher étudiant..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : filtered.length === 0 && selectedModule && selectedAffectation ? (
        <div className="empty-state">Aucun étudiant trouvé</div>
      ) : filtered.length > 0 ? (
        <div className="data-card">
          <div className="data-card__header">
            <span className="data-card__title">Notes des étudiants {seanceBadge}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="data-card__subtitle">{filtered.length} étudiant(s)</span>
              {anyEditable && periodeOuverte && (
                <button className="btn btn--primary btn--sm" onClick={handleSaveAll} disabled={savingAll}
                  title="Enregistrer toutes les notes modifiées">
                  <SaveAll size={14} /> {savingAll ? 'Enregistrement…' : 'Tout enregistrer'}
                </button>
              )}
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
                {hasTypeCM && <th>Groupe</th>}
                <th className={!canEditTD ? 'col-locked' : ''}>
                  TD {!canEditTD && <Lock style={{ width: 12, height: 12, display: 'inline' }} />}
                </th>
                <th className={!canEditTP ? 'col-locked' : ''}>
                  TP {!canEditTP && <Lock style={{ width: 12, height: 12, display: 'inline' }} />}
                </th>
                {showEF && (
                  <th className={!canEditEF ? 'col-locked' : ''}>
                    EF {!canEditEF && <Lock style={{ width: 12, height: 12, display: 'inline' }} />}
                  </th>
                )}
                {showER && (
                  <th className={!canEditER ? 'col-locked' : ''}>
                    ER {!canEditER && <Lock style={{ width: 12, height: 12, display: 'inline' }} />}
                  </th>
                )}
                {/* For non-CM, always show EF and ER columns as locked */}
                {typeSeance !== 'CM' && <th className="col-locked">EF <Lock style={{ width: 12, height: 12, display: 'inline' }} /></th>}
                {typeSeance !== 'CM' && <th className="col-locked">ER <Lock style={{ width: 12, height: 12, display: 'inline' }} /></th>}
                <th>Moyenne</th>
                <th>Résultat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const isExcluded = s.resultat === 'ELI';
                const isSavingThis = saving[s.id_etudiant];
                return (
                  <tr key={s.id_etudiant} style={isExcluded ? { backgroundColor: '#fef2f2', opacity: 0.8 } : undefined}>
                    <td>{s.matricule}</td>
                    <td>
                      {s.nom}
                      {isExcluded && (
                        <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 10, color: '#991b1b', background: '#fecaca', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
                          <UserX size={10} /> EXCLU
                        </span>
                      )}
                    </td>
                    <td>{s.prenom}</td>
                    {hasTypeCM && <td>{s.nom_groupe || '—'}</td>}
                    {/* TD */}
                    <td>
                      <input type="number" min="0" max="20" step="0.25"
                        className={`cell-input ${!canEditTD || isExcluded ? 'cell-input--locked' : ''}`}
                        value={s.note_td ?? ''} onChange={e => handleNoteChange(idx, 'note_td', e.target.value)}
                        disabled={!periodeOuverte || !canEditTD || isExcluded} />
                    </td>
                    {/* TP */}
                    <td>
                      <input type="number" min="0" max="20" step="0.25"
                        className={`cell-input ${!canEditTP || isExcluded ? 'cell-input--locked' : ''}`}
                        value={s.note_tp ?? ''} onChange={e => handleNoteChange(idx, 'note_tp', e.target.value)}
                        disabled={!periodeOuverte || !canEditTP || isExcluded} />
                    </td>
                    {/* EF - shown for CM */}
                    {showEF && (
                      <td>
                        <input type="number" min="0" max="20" step="0.25"
                          className={`cell-input ${!canEditEF || isExcluded ? 'cell-input--locked' : ''}`}
                          value={s.note_ef ?? ''} onChange={e => handleNoteChange(idx, 'note_ef', e.target.value)}
                          disabled={!periodeOuverte || !canEditEF || isExcluded} />
                      </td>
                    )}
                    {/* ER - shown for CM only in rattrapage */}
                    {showER && (
                      <td>
                        <input type="number" min="0" max="20" step="0.25"
                          className={`cell-input ${!canEditER || isExcluded ? 'cell-input--locked' : ''}`}
                          value={s.note_er ?? ''} onChange={e => handleNoteChange(idx, 'note_er', e.target.value)}
                          disabled={!periodeOuverte || !canEditER || isExcluded} />
                      </td>
                    )}
                    {/* EF/ER for teachers without CM role (always locked, shows the field but not the value) */}
                    {!hasTypeCM && (
                      <td><input type="number" className="cell-input cell-input--locked" value="" disabled /></td>
                    )}
                    {!hasTypeCM && (
                      <td><input type="number" className="cell-input cell-input--locked" value="" disabled /></td>
                    )}
                    <td style={{ fontWeight: 600 }}>
                      {s.moyenne_finale != null ? parseFloat(s.moyenne_finale).toFixed(2) : '—'}
                    </td>
                    <td>{getResultBadge(s.resultat)}</td>
                    <td>
                      {isExcluded ? (
                        <span style={{ fontSize: 11, color: '#991b1b', fontWeight: 500 }}>—</span>
                      ) : (
                        <button className="btn btn--primary btn--sm" onClick={() => handleSave(s)}
                          disabled={!periodeOuverte || isSavingThis || savingAll || !anyEditable}>
                          <Save size={14} /> {isSavingThis ? '...' : 'Sauver'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {toast && <div className={`toast toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
