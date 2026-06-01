import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Plus, Search, Pencil, Trash2, X, Download, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import '../shared.css';

export default function EnseignantsPage() {
  const [enseignants, setEnseignants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Module/Responsable modal state ───
  const [respModal, setRespModal] = useState(null); // { id_utilisateur, nom, prenom }
  const [respModules, setRespModules] = useState([]);
  const [respLoading, setRespLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { group, action: 'assign'|'remove' }

  // Group affectations by module+type+semestre to avoid repetition
  const groupedModules = useMemo(() => {
    const map = new Map();
    respModules.forEach(m => {
      const key = `${m.id_module}-${m.type_seance}-${m.semestre}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          id_module: m.id_module,
          nom_module: m.nom_module,
          type_seance: m.type_seance,
          semestre: m.semestre,
          niveau: m.niveau,
          est_responsable_matiere: m.est_responsable_matiere,
          sections: [],
          cmAffectation: m.type_seance === 'CM' ? m : null
        });
      }
      const entry = map.get(key);
      // Build section/group labels
      const parts = [];
      if (m.section) parts.push(m.section);
      if (m.nom_groupe) parts.push(m.nom_groupe);
      const label = parts.join(' / ') || null;
      if (label && !entry.sections.includes(label)) entry.sections.push(label);
      // Track responsable status
      if (m.est_responsable_matiere) {
        entry.est_responsable_matiere = 1;
        if (m.type_seance === 'CM') entry.cmAffectation = m;
      }
    });
    return Array.from(map.values());
  }, [respModules]);

  // Form state
  const emptyForm = { nom: '', prenom: '', email: '', matricule: '', grade: 'MAA', mot_de_passe: '' };
  const [form, setForm] = useState(emptyForm);

  // Load teachers
  useEffect(() => {
    loadEnseignants();
  }, []);

  function loadEnseignants() {
    setLoading(true);
    api.get('/agent/enseignants')
      .then(res => setEnseignants(res.data))
      .catch(() => showToast('Erreur chargement enseignants', 'error'))
      .finally(() => setLoading(false));
  }

  // Filtrage — uses `actif` (DB column name) not `est_actif`
  const filtered = useMemo(() => {
    return enseignants.filter(e => {
      const matchSearch = !search ||
        e.nom?.toLowerCase().includes(search.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.matricule?.toLowerCase().includes(search.toLowerCase());
      const matchGrade = !gradeFilter || e.grade === gradeFilter;
      const matchStatut = !statutFilter ||
        (statutFilter === 'actif' && e.actif) ||
        (statutFilter === 'inactif' && !e.actif);
      return matchSearch && matchGrade && matchStatut;
    });
  }, [enseignants, search, gradeFilter, statutFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = enseignants.length;
    const actifs = enseignants.filter(e => e.actif).length;
    const inactifs = total - actifs;
    const maa = enseignants.filter(e => e.grade === 'MAA').length;
    return { total, actifs, inactifs, maa };
  }, [enseignants]);

  // Grades uniques pour le filtre
  const grades = [...new Set(enseignants.map(e => e.grade).filter(Boolean))];

  // Toggle actif/inactif
  function handleToggle(id) {
    api.patch(`/agent/enseignants/${id}/statut`)
      .then(res => {
        setEnseignants(prev =>
          prev.map(e => e.id_utilisateur === id ? { ...e, actif: res.data.actif } : e)
        );
        showToast('Statut mis à jour', 'success');
      })
      .catch(() => showToast('Erreur lors de la mise à jour', 'error'));
  }

  // Create enseignant
  function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      // Mode edition
      const payload = {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        matricule: form.matricule,
        grade: form.grade
      };
      // Inclure le mot de passe seulement s'il a été modifié
      if (form.mot_de_passe && form.mot_de_passe.trim()) {
        payload.mot_de_passe = form.mot_de_passe;
      }
      api.put(`/agent/enseignants/${editingId}`, payload)
        .then(() => {
          showToast('Enseignant modifié avec succès', 'success');
          resetForm();
          loadEnseignants();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur modification', 'error'));
    } else {
      // Mode création
      api.post('/agent/enseignants', form)
        .then(() => {
          showToast('Enseignant créé avec succès', 'success');
          resetForm();
          loadEnseignants();
        })
        .catch(err => showToast(err.response?.data?.message || 'Erreur création', 'error'));
    }
  }

  // Edit enseignant — open form with data
  function handleEdit(enseignant) {
    setForm({
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      email: enseignant.email,
      matricule: enseignant.matricule || '',
      grade: enseignant.grade || 'MAA',
      mot_de_passe: enseignant.mot_de_passe_clair || ''
    });
    setEditingId(enseignant.id_utilisateur);
    setShowForm(true);
    setShowPassword(false);
  }

  // Delete enseignant
  function handleDelete(id) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet enseignant ?')) return;
    api.delete(`/agent/enseignants/${id}`)
      .then(() => {
        showToast('Enseignant supprimé', 'success');
        setEnseignants(prev => prev.filter(e => e.id_utilisateur !== id));
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur suppression', 'error'));
  }

  // Export CSV
  function handleExportCSV() {
    const headers = ['Matricule', 'Nom', 'Prenom', 'Email', 'Grade', 'Modules', 'Statut'];
    const rows = filtered.map(e => [
      e.matricule || '', e.nom, e.prenom, e.email, e.grade || '', e.nb_modules, e.actif ? 'Actif' : 'Inactif'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enseignants.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setShowPassword(false);
  }

  function showToast(msg, type) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Responsable de module Modal ───
  function openRespModal(enseignant) {
    setRespModal({
      id_utilisateur: enseignant.id_utilisateur,
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      grade: enseignant.grade
    });
    setRespLoading(true);
    api.get(`/agent/enseignants/${enseignant.id_utilisateur}/modules`)
      .then(res => setRespModules(res.data))
      .catch(() => showToast('Erreur chargement modules', 'error'))
      .finally(() => setRespLoading(false));
  }

  function closeRespModal() {
    setRespModal(null);
    setRespModules([]);
    setConfirmAction(null);
  }

  function handleToggleResp(affectation) {
    // MySQL returns integers; coerce to boolean explicitly
    const isCurrentlyResponsable = Number(affectation.est_responsable_matiere) === 1;
    const newVal = !isCurrentlyResponsable;
    api.put('/agent/enseignants/responsable', {
      id_affectation: affectation.id_affectation,
      est_responsable: newVal
    })
      .then(res => {
        showToast(res.data.message, 'success');
        // Reload fresh data from server to guarantee UI matches DB
        if (respModal) {
          api.get(`/agent/enseignants/${respModal.id_utilisateur}/modules`)
            .then(r => setRespModules(r.data))
            .catch(() => {});
        }
      })
      .catch(err => showToast(err.response?.data?.message || 'Erreur', 'error'));
  }

  return (
    <>
      {/* Toolbar: search + filters + add button */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 16, height: 16, color: 'var(--text-muted)' }} />
          <input
            className="filter-bar__input"
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-bar__select" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
          <option value="">Tous les grades</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-bar__select" value={statutFilter} onChange={e => setStatutFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
        <button className="btn btn--primary" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annuler' : 'Ajouter enseignant'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--brand-primary)' }} />
          <div>
            <div className="stat-card__number">{stats.total}</div>
            <div className="stat-card__label">Total</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--semantic-success)' }} />
          <div>
            <div className="stat-card__number">{stats.actifs}</div>
            <div className="stat-card__label">Actifs</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--semantic-danger)' }} />
          <div>
            <div className="stat-card__number">{stats.inactifs}</div>
            <div className="stat-card__label">Inactifs</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card__dot" style={{ background: 'var(--brand-accent)' }} />
          <div>
            <div className="stat-card__number">{stats.maa}</div>
            <div className="stat-card__label">MAA</div>
          </div>
        </div>
      </div>

      {/* Create/Edit form (collapsible) */}
      {showForm && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <h4 className="form-panel__title">{editingId ? 'Modifier Enseignant' : 'Nouvel Enseignant'}</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Matricule</label>
              <input value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} placeholder="Ex: ENS-008" />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Grade</label>
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                <option value="MAA">MAA</option>
                <option value="MAB">MAB</option>
                <option value="MCA">MCA</option>
                <option value="MCB">MCB</option>
                <option value="Prof">Professeur</option>
              </select>
            </div>
            <div className="form-group">
              <label>{editingId ? 'Mot de passe (actuel ou nouveau)' : 'Mot de passe'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingId}
                  value={form.mot_de_passe}
                  onChange={e => setForm({ ...form, mot_de_passe: e.target.value })}
                  placeholder={editingId ? 'Laisser vide pour ne pas changer' : ''}
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                  }}
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {editingId && <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Le mot de passe actuel est affiché. Modifiez-le pour changer.</small>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn--primary">{editingId ? 'Enregistrer les modifications' : 'Créer le compte'}</button>
            <button type="button" className="btn btn--secondary" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="data-card">
        <div className="data-card__header">
          <h4 className="data-card__title">Liste des Enseignants</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge--primary">{filtered.length} enseignants</span>
            <button className="btn btn--outline btn--sm" onClick={handleExportCSV}>
              <Download size={14} /> Exporter CSV
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Grade</th>
              <th>Modules</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun enseignant trouvé</td></tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id_utilisateur}>
                  <td>{e.matricule || '—'}</td>
                  <td>{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.email}</td>
                  <td>{e.grade || '—'}</td>
                  <td>{e.nb_modules ?? 0}</td>
                  <td>
                    <span
                      className={`status-badge ${e.actif ? 'status-badge--actif' : 'status-badge--inactif'}`}
                      onClick={() => handleToggle(e.id_utilisateur)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquer pour changer le statut"
                    >
                      {e.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button className="action-icon action-icon--edit" title="Modifier" onClick={() => handleEdit(e)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="action-icon"
                        title="Gérer responsable de module"
                        onClick={() => openRespModal(e)}
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        <ShieldCheck size={15} />
                      </button>
                      <button className="action-icon action-icon--delete" title="Supprimer" onClick={() => handleDelete(e.id_utilisateur)}>
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

      {/* ─── Modal : Gestion Responsable de module ─── */}
      {respModal && (
        <div className="modal-overlay" onClick={closeRespModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>
                <ShieldCheck size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Responsable de module — {respModal.nom} {respModal.prenom}
              </h3>
              <button className="modal-close" onClick={closeRespModal}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 16px' }}>
              Désignez cet enseignant comme responsable de module sur ses affectations CM.
              {respModal.grade && !['MAA', 'MCA', 'MCB', 'Prof', 'Professeur'].includes(respModal.grade) && (
                <span style={{ display: 'block', color: 'var(--semantic-danger)', marginTop: 4, fontWeight: 600 }}>
                  ⚠ Grade {respModal.grade} — non éligible au rôle de responsable de module (MAA minimum requis)
                </span>
              )}
            </p>

            {respLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Chargement…</div>
            ) : groupedModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                Aucune affectation trouvée pour cet enseignant.
              </div>
            ) : (
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Type</th>
                    <th>Niveau</th>
                    <th>Semestre</th>
                    <th>Section / Groupe</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedModules.map(g => (
                    <tr key={g.key}>
                      <td style={{ fontWeight: 500 }}>{g.nom_module}</td>
                      <td>
                        <span className={`type-seance-badge type-seance-badge--${g.type_seance.toLowerCase()}`}>
                          {g.type_seance}
                        </span>
                      </td>
                      <td>{g.niveau || '—'}</td>
                      <td>{g.semestre}</td>
                      <td>{g.sections.length > 0 ? g.sections.join(', ') : '—'}</td>
                      <td>
                        {g.type_seance === 'CM' && g.cmAffectation ? (
                          g.est_responsable_matiere ? (
                            <button
                              className="btn btn--sm"
                              style={{
                                background: 'var(--semantic-success)',
                                color: '#fff',
                                border: 'none',
                                fontSize: 11,
                                padding: '4px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Cliquer pour retirer le rôle"
                              onClick={() => setConfirmAction({ group: g, action: 'remove' })}
                            >
                              <ShieldCheck size={13} /> Responsable
                              <X size={12} style={{ marginLeft: 2, opacity: 0.8 }} />
                            </button>
                          ) : (
                            <button
                              className="btn btn--sm btn--outline"
                              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}
                              title="Désigner comme responsable de module"
                              onClick={() => setConfirmAction({ group: g, action: 'assign' })}
                            >
                              Assigner
                            </button>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ─── Styled Confirmation Overlay ─── */}
            {confirmAction && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                borderRadius: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, backdropFilter: 'blur(2px)'
              }}>
                <div style={{
                  background: '#fff', borderRadius: 12, padding: '24px 28px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxWidth: 380, width: '90%', textAlign: 'center'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: confirmAction.action === 'remove' ? 'var(--semantic-danger-light, #fee)' : 'var(--semantic-success-light, #e8f5e9)'
                  }}>
                    <ShieldCheck size={22} style={{ color: confirmAction.action === 'remove' ? 'var(--semantic-danger)' : 'var(--semantic-success)' }} />
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>
                    {confirmAction.action === 'remove' ? 'Retirer le rôle ?' : 'Assigner le rôle ?'}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                    {confirmAction.action === 'remove'
                      ? <>Voulez-vous retirer le rôle de responsable de module pour <strong>{confirmAction.group.nom_module}</strong> ({confirmAction.group.semestre}) ?</>
                      : <>Désigner cet enseignant comme responsable de module pour <strong>{confirmAction.group.nom_module}</strong> ({confirmAction.group.semestre}) ?</>
                    }
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      className="btn btn--outline"
                      style={{ fontSize: 13, padding: '7px 20px', borderRadius: 8 }}
                      onClick={() => setConfirmAction(null)}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn"
                      style={{
                        fontSize: 13, padding: '7px 20px', borderRadius: 8, border: 'none', color: '#fff',
                        background: confirmAction.action === 'remove' ? 'var(--semantic-danger)' : 'var(--semantic-success)'
                      }}
                      onClick={() => {
                        handleToggleResp(confirmAction.group.cmAffectation);
                        setConfirmAction(null);
                      }}
                    >
                      {confirmAction.action === 'remove' ? 'Retirer' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
