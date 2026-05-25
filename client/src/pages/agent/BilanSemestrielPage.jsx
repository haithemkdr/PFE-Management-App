// BilanSemestrielPage.jsx — v3 : Custom modals, compact stats, CSV export
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import { BarChart2, ChevronDown, ChevronRight, Search, ToggleLeft, ToggleRight, Award, Save, Download, Users, CheckCircle, XCircle, TrendingUp, BookOpen, AlertCircle, AlertTriangle } from 'lucide-react';
import '../shared.css';
import '../Dashboard.css';

const NIVEAUX = ['L1','L2','L3'];
const SEM_MAP = { L1:['S1','S2'], L2:['S3','S4'], L3:['S5','S6'] };
const NIVEAU_SECTIONS = {
  L1: ['Section 1','Section 2','Section 3'],
  L2: ['Section 1','Section 2'],
  L3: ['Section 1','Section 2']
};
const DECISIONS = {
  'Admis(e) (session normale)':    { cls:'result-badge--adm', label:'Admis (Normale)' },
  'Admis(e) (session rattrapage)': { cls:'result-badge--rat', label:'Admis (Rattrapage)' },
  'Admis(e) (Rachat)':             { cls:'result-badge--rachat', label:'Admis (Rachat)' },
  'Admis(e) avec dettes':          { cls:'result-badge--rat', label:'Avec dettes' },
  'Ajourné(e)':                    { cls:'result-badge--eli', label:'Ajourné(e)' },
};

function DecisionBadge({ decision }) {
  if (!decision) return <span style={{color:'var(--text-muted)'}}>—</span>;
  const d = DECISIONS[decision];
  if (!d) return <span className="result-badge">{decision}</span>;
  return <span className={`result-badge ${d.cls}`}>{d.label}</span>;
}

/* ── Custom confirm modal ── */
function ConfirmModal({ open, title, message, warning, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{title || 'Confirmation'}</h3>
        <p>{message}</p>
        {warning && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8,
            background:'#fff8e1', border:'1px solid #ffe082', marginBottom:16, fontSize:13 }}>
            <AlertTriangle size={18} color="#e65100" style={{flexShrink:0}} />
            <span style={{color:'#e65100'}}>{warning}</span>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn--secondary" onClick={onCancel}>{cancelLabel || 'Annuler'}</button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(';'), ...rows.map(r => headers.map(h => {
    let v = r[h] ?? '';
    if (typeof v === 'string' && (v.includes(';') || v.includes('"'))) v = `"${v.replace(/"/g,'""')}"`;
    return v;
  }).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

export default function BilanSemestrielPage() {
  const [tab, setTab] = useState('bilan');
  return (
    <>
      <div className="page-header">
        <h2 className="page-header__title"><BarChart2 style={{marginRight:8,verticalAlign:'middle'}} /> Bilan Semestriel</h2>
      </div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid var(--border-default)'}}>
        {[['bilan','Bilan Semestriel',BarChart2],['deliberation','Délibération Annuelle',Award]].map(([k,l,Icon])=>(
          <button key={k} onClick={()=>setTab(k)} className={tab===k?'btn btn--primary':'btn btn--outline'}
            style={{borderRadius:'8px 8px 0 0',borderBottom:tab===k?'2px solid var(--brand-primary)':'none',fontSize:13}}>
            <Icon size={15}/> {l}
          </button>
        ))}
      </div>
      {tab==='bilan' ? <TabBilan/> : <TabDeliberation/>}
    </>
  );
}

/* ═══════ TAB 1: Bilan Semestriel ═══════ */
function TabBilan() {
  const [niveau, setNiveau] = useState('L1');
  const [semestre, setSemestre] = useState('S1');
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');
  const [bilan, setBilan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedUE, setExpandedUE] = useState({});
  const [expandedEtu, setExpandedEtu] = useState({});
  const [sessionInfo, setSessionInfo] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [modal, setModal] = useState(null);

  const load = useCallback(()=>{
    if(!niveau||!semestre) return; setLoading(true);
    const p = new URLSearchParams({niveau,semestre}); if(section) p.append('section',section);
    Promise.all([api.get(`/agent/bilan-semestre?${p}`),api.get(`/agent/session-active?semestre=${semestre}`)])
    .then(([b,s])=>{
      setBilan(b.data); setSessionInfo(Array.isArray(s.data)?s.data[0]:s.data);
      const o={}; (b.data.structure||[]).forEach((_,i)=>{o[i]=true}); setExpandedUE(o);
    }).catch(e=>console.error(e)).finally(()=>setLoading(false));
  },[niveau,semestre,section]);
  useEffect(()=>{load()},[load]);

  const toggleSession = ()=>{
    if(!sessionInfo) return;
    const nt = sessionInfo.type_session==='NORMALE'?'RATTRAPAGE':'NORMALE';
    const isRat = nt==='RATTRAPAGE';
    setModal({
      title: `Basculer en session ${nt}`,
      message: `Voulez-vous basculer le semestre ${semestre} en session ${nt} ?`,
      warning: isRat ? 'Les notes de contrôle continu (TD/TP) seront verrouillées. Seule la note d\'examen de rattrapage (ER) pourra être saisie.' : null,
      confirmLabel: isRat ? 'Passer en Rattrapage' : 'Revenir en Normale',
      danger: isRat,
      onConfirm: async ()=>{
        setModal(null); setToggling(true);
        try { await api.put('/agent/session-active',{semestre,type_session:nt}); load(); }
        catch(e){ alert(e.response?.data?.message||e.message); }
        finally { setToggling(false); }
      }
    });
  };

  const filtered = useMemo(()=>{
    if(!bilan?.etudiants) return [];
    if(!search) return bilan.etudiants;
    const q=search.toLowerCase();
    return bilan.etudiants.filter(e=>e.nom?.toLowerCase().includes(q)||e.prenom?.toLowerCase().includes(q)||e.matricule?.toLowerCase().includes(q));
  },[bilan,search]);

  const stats = useMemo(()=>{
    if(!filtered.length) return null;
    const t=filtered.length, admis=filtered.filter(e=>e.decision==='Admis'||e.moyenne_sem>=10).length;
    const moys=filtered.filter(e=>e.moyenne_sem!=null).map(e=>e.moyenne_sem);
    return {total:t,admis,ajourne:t-admis,avg:moys.length?(moys.reduce((a,b)=>a+b,0)/moys.length).toFixed(2):'—'};
  },[filtered]);

  const handleExport = ()=>{
    if(!filtered.length) return;
    exportCSV(filtered.map(e=>({Matricule:e.matricule,Nom:e.nom,Prenom:e.prenom,Groupe:e.nom_groupe||'',
      Moyenne:e.moyenne_sem!=null?e.moyenne_sem.toFixed(2):'',Credits_Acquis:e.credits_acquis??0,
      Credits_Total:e.credits_total??0,Decision:e.decision||''})),`bilan_${semestre}_${niveau}.csv`);
  };

  const isRat = sessionInfo?.type_session==='RATTRAPAGE';

  return (<>
    <ConfirmModal open={!!modal} {...(modal||{})} onCancel={()=>setModal(null)} />

    <div className="data-card" style={{marginBottom:16}}>
      <div className="data-card__header" style={{background:isRat?'#fff8e1':'#e8f5e9',borderBottom:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span className={`status-badge ${isRat?'status-badge--attente':'status-badge--actif'}`}>{isRat?'Rattrapage':'Normale'}</span>
          <span style={{fontSize:13,color:'var(--text-secondary)'}}>Session active pour {semestre}</span>
        </div>
        <button onClick={toggleSession} disabled={toggling} className="btn btn--sm btn--secondary">
          {isRat?<><ToggleRight size={14}/>Revenir en Normale</>:<><ToggleLeft size={14}/>Passer en Rattrapage</>}
        </button>
      </div>
    </div>

    <div className="filter-bar">
      <select className="filter-bar__select" value={niveau} onChange={e=>{setNiveau(e.target.value);setSemestre(SEM_MAP[e.target.value][0])}}>
        {NIVEAUX.map(n=><option key={n}value={n}>{n}</option>)}</select>
      <select className="filter-bar__select" value={semestre} onChange={e=>setSemestre(e.target.value)}>
        {(SEM_MAP[niveau]||[]).map(s=><option key={s}value={s}>{s}</option>)}</select>
      <select className="filter-bar__select" value={section} onChange={e=>setSection(e.target.value)}>
        <option value="">Toutes les sections</option>{(NIVEAU_SECTIONS[niveau]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>
      <div className="filter-bar__spacer"/>
      <button className="btn btn--sm btn--outline" onClick={handleExport}><Download size={14}/>Exporter CSV</button>
      <div style={{position:'relative'}}>
        <Search style={{position:'absolute',left:10,top:9,width:15,height:15,color:'#9ca3af'}}/>
        <input className="filter-bar__input" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
      </div>
    </div>

    {stats&&(<div className="stat-grid" style={{marginBottom:20}}>
      {[[stats.total,'Étudiants','--blue',Users],[stats.admis,'Admis','--green',CheckCircle],[stats.ajourne,'Ajournés','--orange',XCircle],[stats.avg,'Moy. Promo','--gold',TrendingUp]].map(([v,l,c,Icon],i)=>(
        <div key={i} className={`stat-card stat-card${c}`}>
          <div><div className="stat-card__value">{v}</div><div className="stat-card__label">{l}</div></div>
          <div className={`stat-card__icon stat-card__icon${c}`}><Icon/></div>
        </div>))}
    </div>)}

    {loading&&<div className="empty-state">Chargement…</div>}

    {bilan?.structure?.length>0&&!loading&&(
      <div className="data-card" style={{marginBottom:24}}>
        <div className="data-card__header"><span className="data-card__title">Structure {bilan.semestre}</span>
          <span className="badge badge--primary">{bilan.structure.length} UE(s)</span></div>
        <table className="data-table"><thead><tr>
          <th style={{width:30}}></th><th>Code</th><th>Titre / Module</th><th>Coef.</th><th>Crédits</th><th>Exam</th><th>TD</th><th>TP</th>
        </tr></thead><tbody>
          {bilan.structure.map((ue,idx)=>(<React.Fragment key={`ue-${idx}`}>
            <tr key={`u${idx}`} onClick={()=>setExpandedUE(p=>({...p,[idx]:!p[idx]}))} style={{cursor:'pointer',backgroundColor:'var(--card-bg)'}}>
              <td>{expandedUE[idx]?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</td>
              <td><strong>{ue.code_ue}</strong></td><td><strong>{ue.titre}</strong></td>
              <td>{ue.coefficient}</td><td>{ue.credits_total}</td><td colSpan={3}></td></tr>
            {expandedUE[idx]&&(ue.modules||[]).map(m=>(<tr key={`m${m.id_module}`} style={{backgroundColor:'var(--bg-main)'}}>
              <td></td><td style={{paddingLeft:24,color:'var(--text-muted)',fontSize:13}}>{m.code_module}</td>
              <td style={{paddingLeft:24}}>{m.nom_module}</td><td>{m.coefficient}</td><td>{m.credits}</td>
              <td>{Math.round((m.poids_exam||0)*100)}%</td><td>{Math.round((m.poids_td||0)*100)}%</td><td>{Math.round((m.poids_tp||0)*100)}%</td>
            </tr>))}
          </React.Fragment>))}
        </tbody></table>
      </div>
    )}

    {!loading&&filtered.length>0&&(
      <div className="data-card"><div className="data-card__header"><span className="data-card__title">Résultats</span>
        <span className="data-card__subtitle">{filtered.length} étudiant(s)</span></div>
        <table className="data-table"><thead><tr>
          <th style={{width:30}}></th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Groupe</th><th>Moy.</th><th>Crédits</th><th>Décision</th>
        </tr></thead><tbody>
          {filtered.map(etu=>(<React.Fragment key={`etu-${etu.id_etudiant}`}>
            <tr key={`e${etu.id_etudiant}`} onClick={()=>setExpandedEtu(p=>({...p,[etu.id_etudiant]:!p[etu.id_etudiant]}))} style={{cursor:'pointer'}}>
              <td>{expandedEtu[etu.id_etudiant]?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</td>
              <td>{etu.matricule}</td><td>{etu.nom}</td><td>{etu.prenom}</td><td>{etu.nom_groupe||'—'}</td>
              <td style={{fontWeight:600}}>{etu.moyenne_sem!=null?etu.moyenne_sem.toFixed(2):'—'}</td>
              <td>{etu.credits_acquis??0}/{etu.credits_total??0}</td>
              <td><DecisionBadge decision={etu.decision==='Admis'?'Admis(e) (session normale)':etu.decision==='Ajourné'?'Ajourné(e)':etu.decision}/></td></tr>
            {expandedEtu[etu.id_etudiant]&&etu.ues?.map((ue,i)=>(
              <tr key={`d${etu.id_etudiant}-${i}`} style={{backgroundColor:'var(--bg-main)',fontSize:13}}>
                <td></td><td colSpan={2} style={{paddingLeft:24}}><strong>{ue.code_ue}</strong> — {ue.titre}</td>
                <td>Moy: {ue.moyenne_ue!=null?ue.moyenne_ue.toFixed(2):'—'}</td>
                <td colSpan={2}>{ue.statut_credits&&<span className={`result-badge ${ue.statut_credits.includes('Acquis')?'result-badge--adm':'result-badge--rat'}`}>{ue.statut_credits}</span>}</td>
                <td colSpan={2}>{ue.modules_notes?.map(m=>(<div key={m.id_module} style={{marginBottom:2}}><span style={{color:'var(--text-muted)'}}>{m.nom_module}:</span> {m.moyenne_finale!=null?m.moyenne_finale.toFixed(2):'—'}</div>))}</td>
              </tr>))}
          </React.Fragment>))}
        </tbody></table>
      </div>
    )}
    {!loading&&bilan&&filtered.length===0&&<div className="empty-state">Aucun étudiant trouvé.</div>}
  </>);
}

/* ═══════ TAB 2: Délibération Annuelle ═══════ */
function TabDeliberation() {
  const [niveau, setNiveau] = useState('L1');
  const [annee, setAnnee] = useState('2025-2026');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [seuilRachat, setSeuilRachat] = useState('');
  const [rachatLoading, setRachatLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(()=>{
    setLoading(true);
    api.get(`/agent/deliberation?niveau=${niveau}&annee_univ=${annee}`)
    .then(r=>setData(r.data)).catch(e=>console.error(e)).finally(()=>setLoading(false));
  },[niveau,annee]);
  useEffect(()=>{load()},[load]);

  const filtered = useMemo(()=>{
    if(!data?.etudiants) return [];
    if(!search) return data.etudiants;
    const q=search.toLowerCase();
    return data.etudiants.filter(e=>e.nom?.toLowerCase().includes(q)||e.prenom?.toLowerCase().includes(q)||e.matricule?.toLowerCase().includes(q));
  },[data,search]);

  const handleRachat = ()=>{
    const s=parseFloat(seuilRachat);
    if(isNaN(s)||s>=10||s<0){alert('Seuil invalide (0 à 9.99)');return;}
    const n=(data?.etudiants||[]).filter(e=>e.moyenne_annuelle>=s&&e.moyenne_annuelle<10).length;
    setModal({
      title:'Appliquer le Rachat',
      message:`${n} étudiant(s) dont la moyenne annuelle est entre ${s.toFixed(2)} et 9.99 seront automatiquement rachetés et leur moyenne sera portée à 10.00.`,
      warning:'Cette action est enregistrée avec traçabilité complète. Les moyennes originales sont conservées.',
      confirmLabel:`Racheter ${n} étudiant(s)`,
      onConfirm: async ()=>{
        setModal(null);setRachatLoading(true);setMsg(null);
        try{const r=await api.post('/agent/deliberation/rachat',{niveau,annee_univ:annee,seuil_rachat:s});setMsg({ok:true,text:r.data.message});load();}
        catch(e){setMsg({ok:false,text:e.response?.data?.message||e.message});}
        finally{setRachatLoading(false);}
      }
    });
  };

  const handleSave = ()=>{
    if(!data?.etudiants?.length) return;
    setModal({
      title:'Enregistrer la délibération',
      message:`Vous allez enregistrer les décisions du jury pour ${data.etudiants.length} étudiants de ${niveau} (${annee}).`,
      confirmLabel:'Enregistrer',
      onConfirm: async ()=>{
        setModal(null);setSaveLoading(true);setMsg(null);
        try{const r=await api.post('/agent/deliberation/valider',{niveau,annee_univ:annee,etudiants:data.etudiants});setMsg({ok:true,text:r.data.message});}
        catch(e){setMsg({ok:false,text:e.response?.data?.message||e.message});}
        finally{setSaveLoading(false);}
      }
    });
  };

  const handleExport = ()=>{
    if(!filtered.length) return;
    exportCSV(filtered.map(e=>({Matricule:e.matricule,Nom:e.nom,Prenom:e.prenom,Groupe:e.nom_groupe||'',
      Moy_S1:e.moyenne_s1!=null?e.moyenne_s1.toFixed(2):'',Moy_S2:e.moyenne_s2!=null?e.moyenne_s2.toFixed(2):'',
      Moy_Annuelle:e.moyenne_annuelle!=null?e.moyenne_annuelle.toFixed(2):'',
      Moy_Originale:e.rachat&&e.moyenne_originale!=null?e.moyenne_originale.toFixed(2):'',
      Credits:`${e.credits_acquis??0}/${e.credits_max??60}`,Decision:e.decision||''})),`deliberation_${niveau}_${annee}.csv`);
  };

  const st=data?.stats;

  return (<>
    <ConfirmModal open={!!modal} {...(modal||{})} onCancel={()=>setModal(null)} />

    <div className="filter-bar">
      <select className="filter-bar__select" value={niveau} onChange={e=>setNiveau(e.target.value)}>
        {NIVEAUX.map(n=><option key={n}value={n}>{n}</option>)}</select>
      <select className="filter-bar__select" value={annee} onChange={e=>setAnnee(e.target.value)}>
        <option value="2025-2026">2025-2026</option><option value="2024-2025">2024-2025</option></select>
      <div className="filter-bar__spacer"/>
      <button className="btn btn--sm btn--outline" onClick={handleExport}><Download size={14}/>Exporter CSV</button>
      <div style={{position:'relative'}}>
        <Search style={{position:'absolute',left:10,top:9,width:15,height:15,color:'#9ca3af'}}/>
        <input className="filter-bar__input" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
      </div>
    </div>

    {st&&(<div className="stat-grid" style={{gridTemplateColumns:'repeat(6,1fr)',marginBottom:20}}>
      {[[data.total,'Total','--blue',Users],[st.admis_normale,'Admis Norm.','--green',CheckCircle],
        [st.admis_rattrapage,'Admis Ratt.','--blue',BookOpen],[st.admis_rachat,'Rachat','--gold',Award],
        [st.admis_dettes,'Avec dettes','--orange',AlertCircle],[st.ajourne,'Ajournés','--orange',XCircle]
      ].map(([v,l,c,Icon],i)=>(
        <div key={i} className={`stat-card stat-card${c}`}>
          <div><div className="stat-card__value" style={{fontSize:24}}>{v}</div><div className="stat-card__label">{l}</div></div>
          <div className={`stat-card__icon stat-card__icon${c}`}><Icon/></div>
        </div>))}
    </div>)}

    <div className="data-card" style={{marginBottom:16}}>
      <div className="data-card__header" style={{borderBottom:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Award size={18} color="var(--brand-accent)"/>
          <span style={{fontWeight:600,fontSize:13}}>Rachat :</span>
          <input type="number" step="0.01" min="0" max="9.99" placeholder="Seuil (ex: 9.90)"
            value={seuilRachat} onChange={e=>setSeuilRachat(e.target.value)}
            className="filter-bar__input" style={{width:140,padding:'6px 10px'}}/>
          <button onClick={handleRachat} disabled={rachatLoading} className="btn btn--sm btn--primary" style={{background:'var(--brand-accent)'}}>
            {rachatLoading?'Application…':'Appliquer le Rachat'}</button>
        </div>
        <button onClick={handleSave} disabled={saveLoading} className="btn btn--sm btn--primary">
          <Save size={14}/> {saveLoading?'Enregistrement…':'Enregistrer la délibération'}</button>
      </div>
    </div>

    {msg&&<div className={`toast ${msg.ok?'toast--success':'toast--error'}`} style={{position:'relative',bottom:'auto',right:'auto',marginBottom:16}}>{msg.text}</div>}

    {loading&&<div className="empty-state">Chargement…</div>}

    {!loading&&filtered.length>0&&(
      <div className="data-card"><div className="data-card__header">
        <span className="data-card__title">Délibération {niveau} — {data?.semestre_1}/{data?.semestre_2} — {annee}</span>
        <span className="data-card__subtitle">{filtered.length} étudiant(s)</span></div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table"><thead><tr>
            <th>Matricule</th><th>Nom Prénom</th><th>Groupe</th>
            <th>Moy. {data?.semestre_1}</th><th>Moy. {data?.semestre_2}</th>
            <th>Moy. Annuelle</th><th>Crédits</th><th>Décision</th>
          </tr></thead><tbody>
            {filtered.map(etu=>(<tr key={etu.id_etudiant}>
              <td>{etu.matricule}</td><td style={{fontWeight:500}}>{etu.nom} {etu.prenom}</td><td>{etu.nom_groupe||'—'}</td>
              <td style={{textAlign:'center'}}>{etu.moyenne_s1!=null?etu.moyenne_s1.toFixed(2):'—'}</td>
              <td style={{textAlign:'center'}}>{etu.moyenne_s2!=null?etu.moyenne_s2.toFixed(2):'—'}</td>
              <td style={{textAlign:'center',fontWeight:700}}>
                {etu.moyenne_annuelle!=null?etu.moyenne_annuelle.toFixed(2):'—'}
                {etu.rachat===1&&etu.moyenne_originale!=null&&<span title={`Originale: ${etu.moyenne_originale.toFixed(2)}`}
                  style={{fontSize:10,color:'var(--text-muted)',marginLeft:4}}>(orig: {etu.moyenne_originale.toFixed(2)})</span>}
              </td>
              <td style={{textAlign:'center'}}>{etu.credits_acquis??0}/{etu.credits_max??60}</td>
              <td><DecisionBadge decision={etu.decision}/></td>
            </tr>))}
          </tbody></table>
        </div>
      </div>
    )}
    {!loading&&data&&filtered.length===0&&<div className="empty-state">Aucun étudiant trouvé.</div>}
  </>);
}
