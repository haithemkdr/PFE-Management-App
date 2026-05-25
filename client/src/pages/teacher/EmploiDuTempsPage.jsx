import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import '../shared.css';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];

const TYPE_COLORS = {
  'CM': { bg: '#E7EEEE', text: '#1B3A5C', border: '#1B3A5C' },
  'TD': { bg: '#E1F5F2', text: '#10A38C', border: '#10A38C' },
  'TP': { bg: '#FFF0E8', text: '#FF7C1E', border: '#FF7C1E' }
};
const DEFAULT_COLOR = { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af' };

// Helpers for dates
function getWeekData(offset = 0) {
  const today = new Date();
  today.setDate(today.getDate() + (offset * 7));
  
  // Find Sunday of this week (Algerian week start)
  const day = today.getDay(); // 0 is Sunday
  const start = new Date(today);
  start.setDate(today.getDate() - day);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  
  // ISO week number approx (to pass to backend)
  const startOfYear = new Date(start.getFullYear(), 0, 1);
  const diff = start - startOfYear + (startOfYear.getTimezoneOffset() - start.getTimezoneOffset()) * 60000;
  const weekNum = Math.floor(diff / 604800000) + 1;
  
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
  const formatterYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return {
    weekNum,
    label: `${formatter.format(start)} au ${formatterYear.format(end)}`
  };
}

export default function EmploiDuTempsPage() {
  const { user } = useAuth();
  const [creneaux, setCreneaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekData = useMemo(() => getWeekData(weekOffset), [weekOffset]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.get(`/emploi-du-temps/${user.id}?semaine=${weekData.weekNum}`)
      .then(res => {
        const rows = res.data.data || res.data;
        setCreneaux(rows.map(r => ({ ...r, nom_module: r.module || r.nom_module })));
      })
      .catch(() => setCreneaux([]))
      .finally(() => setLoading(false));
  }, [user, weekData.weekNum]);

  // Build grid: { 'Lundi-08:00': creneau }
  const grid = useMemo(() => {
    const map = {};
    creneaux.forEach(c => {
      // Fix heure_debut mismatch by taking first 5 chars ("08:00:00" -> "08:00")
      const heureStr = c.heure_debut?.substring(0, 5) || c.heure_debut;
      const key = `${c.jour}-${heureStr}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [creneaux]);

  const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);

  return (
    <>
      {/* Figma: En-tête bleu foncé avec informations et navigation */}
      <div style={{
        background: '#1B3A5C',
        borderRadius: 12,
        padding: '24px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', fontFamily: 'Poppins, sans-serif' }}>
            Mon Emploi du Temps
          </h2>
          <span style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 12px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            Semestre en cours – 2025/2026
          </span>
        </div>
        
        {/* Nav Semaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', padding: '6px 12px', borderRadius: 8, color: '#1A1A2E' }}>
          <button 
            onClick={handlePrevWeek}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            <Calendar size={14} style={{ verticalAlign: -2, marginRight: 6, color: '#6B7280' }} />
            Semaine {weekData.weekNum} ({weekData.label})
          </span>
          <button 
            onClick={handleNextWeek}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="data-card" style={{ overflow: 'auto', padding: 0, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <table className="data-table" style={{ minWidth: 1000, margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 80, background: '#F8F9FA', borderBottom: '2px solid #E5E7EB' }} />
              {JOURS.map(j => (
                <th key={j} style={{ 
                  textAlign: 'center', 
                  background: '#F8F9FA', 
                  color: '#4B5563', 
                  fontWeight: 600,
                  fontSize: 13,
                  borderBottom: '2px solid #E5E7EB'
                }}>
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#6B7280' }}>Chargement de l'emploi du temps…</td></tr>
            ) : (
              HEURES.map((h, i) => (
                <tr key={h}>
                  <td style={{ 
                    fontWeight: 600, 
                    fontSize: 11, 
                    color: '#6B7280', 
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    borderRight: '1px solid #F0F1F3',
                    borderBottom: i === HEURES.length - 1 ? 'none' : '1px solid #F0F1F3'
                  }}>
                    {h}
                  </td>
                  {JOURS.map(j => {
                    const items = grid[`${j}-${h}`] || [];
                    return (
                      <td key={j} style={{ 
                        padding: 6, 
                        verticalAlign: 'top', 
                        minHeight: 80,
                        borderRight: '1px solid #F0F1F3',
                        borderBottom: i === HEURES.length - 1 ? 'none' : '1px solid #F0F1F3'
                      }}>
                        {items.map(c => {
                          const styleOpts = TYPE_COLORS[c.type_seance] || DEFAULT_COLOR;
                          return (
                            <div
                              key={c.id_creneau || Math.random()}
                              style={{
                                background: styleOpts.bg,
                                borderRadius: 8,
                                padding: '10px 12px',
                                fontSize: 12,
                                position: 'relative',
                                borderLeft: `4px solid ${styleOpts.border}`,
                                marginBottom: 8,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                <strong style={{ 
                                  color: '#1A1A2E', 
                                  fontSize: 11, 
                                  lineHeight: 1.3,
                                  maxWidth: '75%'
                                }}>
                                  {c.nom_module || c.module}
                                </strong>
                                <span style={{
                                  fontSize: 10, 
                                  fontWeight: 700, 
                                  color: styleOpts.text,
                                  background: 'rgba(255,255,255,0.6)', 
                                  borderRadius: 4, 
                                  padding: '2px 6px'
                                }}>
                                  {c.type_seance}
                                </span>
                              </div>
                              <div style={{ color: '#4B5563', fontSize: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{c.groupe || c.libelle_groupe || '—'}</span>
                                <span style={{ fontWeight: 500 }}>📍 {c.salle || '—'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, display: 'flex', gap: 24, fontSize: 12, color: '#4B5563' }}>
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ 
              width: 14, 
              height: 14, 
              borderRadius: 4, 
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              display: 'inline-block' 
            }} />
            {type === 'CM' ? 'Cours Magistral' : type === 'TD' ? 'Travaux Dirigés' : 'Travaux Pratiques'}
          </span>
        ))}
      </div>
    </>
  );
}
