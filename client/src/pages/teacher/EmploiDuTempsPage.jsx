import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import '../shared.css';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];
const COULEURS = ['#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f2f1'];

export default function EmploiDuTempsPage() {
  const { user } = useAuth();
  const [creneaux, setCreneaux] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/emploi-du-temps/${user.id}`)
      .then(res => {
        // Controller returns { success, data: rows } — each row has 'module' not 'nom_module'
        const rows = res.data.data || res.data;
        setCreneaux(rows.map(r => ({ ...r, nom_module: r.module || r.nom_module })));
      })
      .catch(() => setCreneaux([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Build grid: { 'Lundi-08:00': creneau }
  const grid = useMemo(() => {
    const map = {};
    creneaux.forEach(c => {
      const key = `${c.jour}-${c.heure_debut}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [creneaux]);

  // Color per module
  const moduleColors = useMemo(() => {
    const map = {};
    let idx = 0;
    creneaux.forEach(c => {
      if (c.nom_module && !map[c.nom_module]) {
        map[c.nom_module] = COULEURS[idx % COULEURS.length];
        idx++;
      }
    });
    return map;
  }, [creneaux]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-header__title">Mon Emploi du Temps</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Semestre 2 — 2025/2026</p>
        </div>
      </div>

      {/* Week navigation */}
      <div className="filter-bar" style={{ justifyContent: 'center', gap: 16 }}>
        <button className="btn btn--secondary btn--sm"><ChevronLeft /></button>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          <Calendar style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 6 }} />
          Semaine du 12 au 17 Mai 2026
        </span>
        <button className="btn btn--secondary btn--sm"><ChevronRight /></button>
      </div>

      {/* Grid */}
      <div className="data-card" style={{ overflow: 'auto', marginTop: 16 }}>
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 80 }} />
              {JOURS.map(j => <th key={j} style={{ textAlign: 'center' }}>{j}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : (
              HEURES.map(h => (
                <tr key={h}>
                  <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</td>
                  {JOURS.map(j => {
                    const items = grid[`${j}-${h}`] || [];
                    return (
                      <td key={j} style={{ padding: 4, verticalAlign: 'top', minHeight: 60 }}>
                        {items.map(c => (
                          <div
                            key={c.id_creneau}
                            style={{
                              background: moduleColors[c.nom_module] || '#f5f5f5',
                              borderRadius: 8,
                              padding: '8px 10px',
                              fontSize: 12,
                              lineHeight: 1.5,
                              position: 'relative'
                            }}
                          >
                            <span style={{
                              display: 'inline-block',
                              fontSize: 10, fontWeight: 700, color: 'var(--brand-primary)',
                              background: 'rgba(255,255,255,0.7)', borderRadius: 4, padding: '1px 5px',
                              marginBottom: 3
                            }}>{c.type_seance}</span>
                            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{c.nom_module}</strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{c.libelle_groupe || '—'}</span>
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11 }}>📍 {c.salle || '—'}</span>
                          </div>
                        ))}
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
      {creneaux.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
          {Object.entries(moduleColors).map(([name, color]) => (
            <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
