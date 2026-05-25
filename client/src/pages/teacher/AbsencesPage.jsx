// AbsencesPage.jsx — 2 tabs: Appel (existing) + Suivi S1-S14 grid
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Search, CalendarDays, Save, AlertTriangle, ClipboardList, BarChart3, UserX, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import '../shared.css';
import '../Dashboard.css';

export default function AbsencesPage() {
  const [tab, setTab] = useState('appel');
  return (
    <div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid var(--border-default)'}}>
        {[['appel','Fiche d\'appel',ClipboardList],['suivi','Suivi des séances',BarChart3]].map(([k,l,Icon])=>(
          <button key={k} onClick={()=>setTab(k)} className={tab===k?'btn btn--primary':'btn btn--outline'}
            style={{borderRadius:'8px 8px 0 0',borderBottom:tab===k?'2px solid var(--brand-primary)':'none',fontSize:13}}>
            <Icon size={15}/> {l}
          </button>
        ))}
      </div>
      {tab === 'appel' ? <TabAppel /> : <TabSuivi />}
    </div>
  );
}

/* ═══════ TAB 1: Fiche d'appel (existing logic) ═══════ */
function TabAppel() {
  const { user } = useAuth();
  const [affectations, setAffectations] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [dateSeance, setDateSeance] = useState('');
  const [edtDates, setEdtDates] = useState([]);
  const [edtInfo, setEdtInfo] = useState(null);
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

  // Fetch EDT dates when module+groupe changes
  useEffect(() => {
    if (!selectedModule || !selectedGroupe) { setEdtDates([]); setEdtInfo(null); setDateSeance(''); return; }
    api.get(`/absences/edt-dates/${selectedModule}/${selectedGroupe}`)
      .then(res => {
        setEdtDates(res.data.dates || []);
        setEdtInfo(res.data.edt);
        // Auto-select the most recent past session
        const passed = (res.data.dates || []).filter(d => d.passed);
        if (passed.length > 0) setDateSeance(passed[passed.length - 1].date);
        else if (res.data.dates?.length > 0) setDateSeance(res.data.dates[0].date);
        else setDateSeance('');
      })
      .catch(err => { console.error(err); setEdtDates([]); setEdtInfo(null); });
  }, [selectedModule, selectedGroupe]);

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
        const data = res.data.map(s => ({ ...s, statut: s.statut || 'Présent', justifiee: Boolean(s.justifiee) }));
        setStudents(data);
        setOriginalStudents(JSON.parse(JSON.stringify(data)));
      })
      .catch(err => console.error('Erreur chargement appel:', err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (selectedModule && selectedGroupe && dateSeance) loadAppel();
    else setStudents([]);
  }, [selectedModule, selectedGroupe, dateSeance]);

  function handleStatusChange(id_etudiant, newStatus) {
    setStudents(prev => prev.map(s => s.id_etudiant === id_etudiant ? { ...s, statut: newStatus } : s));
  }
  function handleJustifieeChange(id_etudiant, checked) {
    setStudents(prev => prev.map(s => s.id_etudiant === id_etudiant ? { ...s, justifiee: checked } : s));
  }

  function isPast48h() {
    if (!dateSeance) return false;
    return (new Date() - new Date(dateSeance)) / (1000*60*60) > 48;
  }

  function resetSession() { setStudents(JSON.parse(JSON.stringify(originalStudents))); }

  async function saveSession() {
    const id_affectation = getAffectationId();
    if (!id_affectation) { showToast('Affectation introuvable','error'); return; }
    setSaving(true);
    try {
      const payload = {
        id_affectation, date_seance: dateSeance,
        etudiants: students.map(s => ({ id_etudiant: s.id_etudiant, statut: s.statut, justifiee: s.justifiee }))
      };
      const res = await api.post('/absences/enregistrer-seance', payload);
      showToast(res.data.message, res.data.exclus?.length > 0 ? 'warning' : 'success');
      loadAppel();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally { setSaving(false); }
  }

  function showToast(message, type) { setToast({message,type}); setTimeout(()=>setToast(null),5000); }

  function fmtDate(dateStr) {
    try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  }

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.matricule?.toLowerCase().includes(q);
  });

  const currentSeance = edtDates.find(d => d.date === dateSeance);

  return (<>
    {/* EDT schedule banner */}
    {edtInfo && (
      <div className="alert alert--info" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <CalendarDays size={16} />
        <span>
          Créneau : <strong>{edtInfo.jour}</strong>, {edtInfo.heure_debut?.substring(0,5)} – {edtInfo.heure_fin?.substring(0,5)} — Salle <strong>{edtInfo.salle}</strong>
        </span>
      </div>
    )}

    <div className="filter-bar">
      <select className="filter-bar__select" value={selectedModule}
        onChange={e => { setSelectedModule(e.target.value); setSelectedGroupe(''); }}>
        <option value="">— Module —</option>
        {modules.map(m => <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>)}
      </select>
      <select className="filter-bar__select" value={selectedGroupe}
        onChange={e => setSelectedGroupe(e.target.value)} disabled={!selectedModule}>
        <option value="">— Groupe —</option>
        {groupes.map(g => <option key={g.id_groupe} value={g.id_groupe}>{g.nom_groupe}</option>)}
      </select>
      <select className="filter-bar__select" value={dateSeance}
        onChange={e => setDateSeance(e.target.value)}
        disabled={!selectedGroupe || edtDates.length === 0}
        style={{ minWidth: 200 }}>
        {edtDates.length === 0 && <option value="">— Séance —</option>}
        {edtDates.map(d => (
          <option key={d.date} value={d.date} disabled={!d.passed}>
            {d.label} — {fmtDate(d.date)}{!d.passed ? ' (à venir)' : ''}
          </option>
        ))}
      </select>
      <div className="filter-bar__spacer"/>
      <div style={{position:'relative'}}>
        <Search style={{position:'absolute',left:10,top:9,width:15,height:15,color:'#9ca3af'}}/>
        <input className="filter-bar__input" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
      </div>
    </div>

    {loading ? <div className="empty-state">Chargement…</div>
    : students.length === 0 && selectedModule && selectedGroupe ? <div className="empty-state">Aucun étudiant pour cette séance</div>
    : students.length > 0 ? (<>
      <div className="batch-bar">
        <div className="session-info">
          <span className="session-info__tag">{groupes.find(g=>String(g.id_groupe)===selectedGroupe)?.nom_groupe||'Groupe'}</span>
          {currentSeance && <span className="session-info__tag" style={{background:'#e0e7ff',color:'#3730a3'}}>{currentSeance.label}</span>}
          <span className="batch-bar__info">{students.length} étudiant(s)</span>
          {isPast48h() && <span className="batch-bar__info" style={{color:'var(--semantic-danger)',fontWeight:'500',marginLeft:'8px'}}>
            <AlertTriangle size={14} style={{display:'inline-block',verticalAlign:'text-bottom',marginRight:4}}/> Délai de 48h dépassé (Lecture seule)
          </span>}
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn" onClick={resetSession} disabled={saving||JSON.stringify(students)===JSON.stringify(originalStudents)}
            style={{backgroundColor:'white',color:'#374151',border:'1px solid #d1d5db',padding:'0.5rem 1rem'}}>Annuler</button>
          <button className="btn--save-session" onClick={saveSession}
            disabled={saving||JSON.stringify(students)===JSON.stringify(originalStudents)||isPast48h()}
            title={isPast48h()?"Délai de 48h dépassé":""}>
            <Save size={16}/> {saving?'Enregistrement...':'Enregistrer la séance'}
          </button>
        </div>
      </div>
      <div className="data-card" style={{marginTop:16}}>
        <table className="data-table"><thead><tr>
          <th>Matricule</th><th>Étudiant</th><th>Taux d'Absence</th><th>Statut d'Absence</th><th style={{textAlign:'center'}}>Justifiée ?</th>
        </tr></thead><tbody>
          {filtered.map(s => {
            let base_taux = s.taux_absence||0, base_non_just = s.taux_non_justifie||0;
            if(s.statut_db==='Absent'){base_taux-=1;if(!s.justifiee_db)base_non_just-=1;}
            else if(s.statut_db==='Retard'){base_taux-=0.5;if(!s.justifiee_db)base_non_just-=0.5;}
            let current_taux=base_taux,current_non_just=base_non_just;
            if(s.statut==='Absent'){current_taux+=1;if(!s.justifiee)current_non_just+=1;}
            else if(s.statut==='Retard'){current_taux+=0.5;if(!s.justifiee)current_non_just+=0.5;}
            return (
              <tr key={s.id_etudiant}>
                <td>{s.matricule}</td>
                <td>{s.nom} {s.prenom}</td>
                <td><span style={{fontWeight:'500',color:current_taux>=5||current_non_just>=3?'var(--semantic-danger)':current_taux>=3?'var(--semantic-warning)':'inherit'}}>{current_taux}</span></td>
                <td>{s.resultat==='EXC'?(
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <div className="attendance-badge" style={{backgroundColor:'#fee2e2',color:'#991b1b',fontWeight:'500',cursor:'not-allowed',width:'fit-content'}}>Exclu du module</div>
                    {!isPast48h()&&(s.statut==='Absent'||s.statut==='Retard')&&(
                      <button onClick={()=>handleStatusChange(s.id_etudiant,'Présent')} disabled={!s.justifiee}
                        style={{padding:'4px 8px',fontSize:'12px',cursor:s.justifiee?'pointer':'not-allowed',backgroundColor:s.justifiee?'white':'#f3f4f6',border:'1px solid #d1d5db',borderRadius:'4px',color:s.justifiee?'#374151':'#9ca3af',opacity:s.justifiee?1:0.6}}
                        title={s.justifiee?"Annuler cette absence":"Cochez 'Justifiée' d'abord"}>Annuler l'absence</button>
                    )}
                    {!isPast48h()&&s.statut==='Présent'&&s.statut_db!=='Présent'&&(
                      <span style={{fontSize:'12px',color:'#059669',fontWeight:'500'}}>Absence annulée (à enregistrer)</span>
                    )}
                  </div>
                ):(
                  <div className="attendance-group">
                    {['Présent','Absent','Retard'].map(st=>(
                      <div key={st} className={`attendance-badge ${s.statut===st?`attendance-badge--${st.toLowerCase()}`:'attendance-badge--inactive'}`}
                        onClick={()=>!isPast48h()&&handleStatusChange(s.id_etudiant,st)}
                        style={{opacity:isPast48h()?0.6:1,cursor:isPast48h()?'not-allowed':'pointer'}}>
                        <div className={`attendance-dot ${s.statut===st?`attendance-dot--${st.toLowerCase()}`:''}`}/>
                        {st === 'Présent' ? 'Présent' : st}
                      </div>
                    ))}
                  </div>
                )}</td>
                <td style={{textAlign:'center'}}>
                  <input type="checkbox" className="justify-checkbox" checked={s.justifiee}
                    onChange={e=>handleJustifieeChange(s.id_etudiant,e.target.checked)}
                    disabled={s.statut==='Présent'||isPast48h()}/>
                </td>
              </tr>
            );
          })}
        </tbody></table>
      </div>
    </>) : null}

    {toast && (
      <div className={`toast ${toast.type==='warning'?'toast--warning':`toast--${toast.type}`}`}>
        {toast.type==='warning'&&<AlertTriangle size={18} style={{marginRight:8,display:'inline-block',verticalAlign:'middle'}}/>}
        <span style={{verticalAlign:'middle'}}>{toast.message}</span>
      </div>
    )}
  </>);
}

/* ═══════ TAB 2: Suivi des séances (S1..S14 grid from EDT) ═══════ */
function TabSuivi() {
  const [affectations, setAffectations] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/notes/mes-affectations')
      .then(res => setAffectations(res.data))
      .catch(err => console.error(err));
  }, []);

  const modules = [...new Map(affectations.map(a => [a.id_module, a])).values()];
  const groupes = affectations.filter(a => String(a.id_module) === selectedModule && a.id_groupe);

  useEffect(() => {
    if (!selectedModule || !selectedGroupe) { setData(null); return; }
    setLoading(true);
    api.get(`/absences/suivi/${selectedModule}/${selectedGroupe}`)
      .then(r => setData(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [selectedModule, selectedGroupe]);

  const filtered = useMemo(() => {
    if (!data?.etudiants) return [];
    if (!search) return data.etudiants;
    const q = search.toLowerCase();
    return data.etudiants.filter(e => e.nom?.toLowerCase().includes(q) || e.prenom?.toLowerCase().includes(q) || e.matricule?.toLowerCase().includes(q));
  }, [data, search]);

  function cellStyle(statut) {
    if (!statut) return { background: '#f3f4f6', color: '#9ca3af' }; // future
    if (statut === 'Absent') return { background: '#fee2e2', color: '#991b1b', fontWeight: 600 };
    if (statut === 'Retard') return { background: '#fef3c7', color: '#92400e', fontWeight: 600 };
    return { background: '#dcfce7', color: '#166534' };
  }
  function cellLabel(statut) {
    if (!statut) return '—';
    if (statut === 'Absent') return 'A';
    if (statut === 'Retard') return 'R';
    return 'P';
  }

  function fmtDate(dateStr) {
    try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
    catch { return dateStr; }
  }

  function handleExport() {
    if (!filtered.length || !data) return;
    const headers = ['Matricule','Nom','Prénom',...data.seances.map(s => `${s.label} (${fmtDate(s.date)})`),'Absences','Non-just.','Taux présence','Exclu'];
    const rows = filtered.map(e => [
      e.matricule, e.nom, e.prenom,
      ...e.presences.map(p => p.statut ? cellLabel(p.statut) + (p.justifiee ? '(J)' : '') : '—'),
      e.totalAbsences, e.totalNonJustifiees, e.tauxPresence + '%', e.exclu ? 'OUI' : ''
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `suivi_absences_${selectedModule}.csv`; a.click();
  }

  const st = data?.stats;
  const edt = data?.edt;

  return (<>
    <div className="filter-bar">
      <select className="filter-bar__select" value={selectedModule}
        onChange={e => { setSelectedModule(e.target.value); setSelectedGroupe(''); }}>
        <option value="">— Module —</option>
        {modules.map(m => <option key={m.id_module} value={m.id_module}>{m.nom_module}</option>)}
      </select>
      <select className="filter-bar__select" value={selectedGroupe}
        onChange={e => setSelectedGroupe(e.target.value)} disabled={!selectedModule}>
        <option value="">— Groupe —</option>
        {groupes.map(g => <option key={g.id_groupe} value={g.id_groupe}>{g.nom_groupe || g.libelle}</option>)}
      </select>
      <div className="filter-bar__spacer" />
      <button className="btn btn--sm btn--outline" onClick={handleExport} disabled={!filtered.length}><Download size={14}/> Exporter CSV</button>
      <div style={{position:'relative'}}>
        <Search style={{position:'absolute',left:10,top:9,width:15,height:15,color:'#9ca3af'}}/>
        <input className="filter-bar__input" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
      </div>
    </div>

    {/* EDT Schedule info */}
    {edt && (
      <div className="alert alert--info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <CalendarDays className="alert__icon" />
        <span>
          Créneau EDT : <strong>{edt.jour}</strong>, {edt.heure_debut?.substring(0,5)} – {edt.heure_fin?.substring(0,5)} — Salle <strong>{edt.salle}</strong>
        </span>
      </div>
    )}

    {/* Stats cards */}
    {st && (
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          [`${st.seances_dispensees} / ${st.total_seances}`, 'Séances dispensées', '--blue', CalendarDays],
          [st.seances_restantes, 'Séances restantes', '--green', Clock],
          [st.total_etudiants, 'Étudiants', '--gold', CheckCircle],
          [st.total_exclus, 'Exclus', '--orange', UserX],
        ].map(([v, l, c, Icon], i) => (
          <div key={i} className={`stat-card stat-card${c}`}>
            <div><div className="stat-card__value">{v}</div><div className="stat-card__label">{l}</div></div>
            <div className={`stat-card__icon stat-card__icon${c}`}><Icon /></div>
          </div>
        ))}
      </div>
    )}

    {loading && <div className="empty-state">Chargement…</div>}

    {!loading && data && data.seances?.length === 0 && (
      <div className="empty-state">
        <CalendarDays style={{ width: 32, height: 32, color: '#9ca3af', marginBottom: 8 }} />
        <div>Aucun créneau EDT trouvé pour ce module/groupe</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Vérifiez que l'emploi du temps est configuré.</div>
      </div>
    )}

    {!loading && data && filtered.length === 0 && data.seances?.length > 0 && <div className="empty-state">Aucun étudiant trouvé</div>}

    {!loading && data && data.seances?.length > 0 && filtered.length > 0 && (
      <div className="data-card">
        <div className="data-card__header">
          <span className="data-card__title">Suivi des présences — S1 à S14</span>
          <span className="data-card__subtitle">
            {st?.seances_dispensees || 0} séance(s) dispensée(s) — {filtered.length} étudiant(s)
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#f7f8fb', zIndex: 2, minWidth: 140 }}>Étudiant</th>
                {data.seances.map((s, i) => (
                  <th key={i} style={{
                    textAlign: 'center', minWidth: 44, fontSize: 11,
                    background: s.passed ? '#f7f8fb' : '#f3f4f6', color: s.passed ? 'inherit' : '#9ca3af'
                  }} title={`${fmtDate(s.date)} — ${s.jour} ${s.heure}`}>
                    <div>{s.label}</div>
                    <div style={{ fontSize: 9, fontWeight: 400, color: '#9ca3af' }}>{fmtDate(s.date)}</div>
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>Abs.</th>
                <th style={{ textAlign: 'center' }}>NJ</th>
                <th style={{ textAlign: 'center' }}>Taux</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(etu => (
                <tr key={etu.id_etudiant} style={etu.exclu ? { backgroundColor: '#fef2f2' } : undefined}>
                  <td style={{ position: 'sticky', left: 0, background: etu.exclu ? '#fef2f2' : 'var(--surface-bg-card)', zIndex: 1, whiteSpace: 'nowrap' }}>
                    <strong>{etu.nom}</strong> {etu.prenom}
                    {etu.exclu && <span style={{ marginLeft: 4, fontSize: 9, color: '#991b1b', background: '#fecaca', padding: '1px 5px', borderRadius: 6, fontWeight: 700 }}>EXCLU</span>}
                  </td>
                  {etu.presences.map((p, i) => (
                    <td key={i} style={{ textAlign: 'center', ...cellStyle(p.statut), borderRadius: 0, padding: '6px 4px' }}
                      title={p.statut
                        ? `${data.seances[i].label} (${fmtDate(data.seances[i].date)}) — ${p.statut}${p.justifiee ? ' (Justifiée)' : ''}`
                        : `${data.seances[i].label} (${fmtDate(data.seances[i].date)}) — Pas encore dispensée`}>
                      {cellLabel(p.statut)}{p.justifiee && p.statut !== 'Présent' && p.statut ? '*' : ''}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 600, color: etu.totalAbsences >= 5 ? '#991b1b' : etu.totalAbsences >= 3 ? '#92400e' : 'inherit' }}>
                    {etu.totalAbsences}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: etu.totalNonJustifiees >= 3 ? '#991b1b' : 'inherit' }}>
                    {etu.totalNonJustifiees}
                  </td>
                  <td style={{ textAlign: 'center' }}>{etu.tauxPresence}%</td>
                  <td>
                    {etu.exclu ? <span className="result-badge result-badge--eli">EXCLU</span>
                    : etu.seuilExclusion ? <span className="result-badge result-badge--rat">EN DANGER</span>
                    : etu.totalAbsences >= 3 ? <span className="result-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Attention</span>
                    : <span className="result-badge result-badge--adm">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span><strong style={{ ...cellStyle('Présent'), padding: '1px 6px', borderRadius: 4 }}>P</strong> = Présent</span>
          <span><strong style={{ ...cellStyle('Absent'), padding: '1px 6px', borderRadius: 4 }}>A</strong> = Absent</span>
          <span><strong style={{ ...cellStyle('Retard'), padding: '1px 6px', borderRadius: 4 }}>R</strong> = Retard</span>
          <span><strong style={{ ...cellStyle(null), padding: '1px 6px', borderRadius: 4 }}>—</strong> = Non dispensée</span>
          <span><strong>*</strong> = Justifié(e)</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            Exclusion : 3 abs. non justifiées ou 5 abs. totales
          </span>
        </div>
      </div>
    )}
  </>);
}

