const express = require('express');
const router = express.Router();
const {
    // REQ-1 : Gestion des comptes enseignants
    getEnseignants,
    createEnseignant,
    updateEnseignant,
    toggleEnseignantActif,
    deleteEnseignant,
    // REQ-2 : Affectation
    affecterEnseignant,
    updateAffectation,
    deleteAffectation,
    // REQ-3 : Règles de calcul des notes
    updateReglesNotes,
    // REQ-4 : Période de saisie
    togglePeriodeSaisie,
    togglePeriodeById,
    // REQ-5 : Supervision des supports
    getSupportsTous,
    // REQ-6 : Emploi du temps
    getEdtTous,
    upsertCreneauAgent,
    deleteCreneauAgent,
    // Dashboard
    getDashboardStats,
    // Helpers pour le frontend
    getModules,
    getGroupes,
    getAffectationsTous
} = require('../controllers/agentController');

const verifierToken     = require('../middleware/authMiddleware');
const autoriserRoles    = require('../middleware/roleMiddleware');

// Raccourci pour simplifier les routes
const guard = [verifierToken, autoriserRoles('Agent', 'Administrateur')];

// ============================================================
// Dashboard stats
// ============================================================
router.get   ('/dashboard-stats',                ...guard, getDashboardStats);

// ============================================================
// REQ-1 : Gérer les comptes enseignants
// ============================================================
router.get   ('/enseignants',                    ...guard, getEnseignants);       // Lister tous
router.post  ('/enseignants',                    ...guard, createEnseignant);     // Créer un compte
router.put   ('/enseignants/:id',                ...guard, updateEnseignant);     // Modifier nom/email
router.patch ('/enseignants/:id/statut',         ...guard, toggleEnseignantActif);// Activer / désactiver
router.delete('/enseignants/:id',                ...guard, deleteEnseignant);     // Supprimer

// ============================================================
// REQ-2 : Affecter les enseignants aux modules et groupes
// ============================================================
router.post  ('/affectation',                    ...guard, affecterEnseignant);
router.put   ('/affectations/:id',                ...guard, updateAffectation);
router.delete('/affectations/:id',                ...guard, deleteAffectation);

// ============================================================
// REQ-3 : Définir les règles de calcul des notes par module
// ============================================================
router.put   ('/modules/:id/regles-notes',       ...guard, updateReglesNotes);
router.put   ('/regles',                          ...guard, updateReglesNotes);

// ============================================================
// REQ-4 : Autoriser ou verrouiller la saisie des notes
// ============================================================
router.put   ('/periode-saisie',                 ...guard, togglePeriodeSaisie);
router.patch ('/periodes/:id/toggle',             ...guard, togglePeriodeById);

// ============================================================
// REQ-5 : Superviser le dépôt des cours (vue globale)
// ============================================================
router.get   ('/supports',                       ...guard, getSupportsTous);

// ============================================================
// REQ-6 : Mettre à jour l'emploi du temps
// ============================================================
router.get   ('/edt',                            ...guard, getEdtTous);           // Vue globale
router.post  ('/edt',                            ...guard, upsertCreneauAgent);   // Créer créneau
router.put   ('/edt',                            ...guard, upsertCreneauAgent);   // Modifier créneau
router.delete('/edt/:id',                        ...guard, deleteCreneauAgent);   // Supprimer créneau

// ============================================================
// Helpers : listes déroulantes pour le frontend
// ============================================================
router.get   ('/modules',                        ...guard, getModules);
router.get   ('/groupes',                        ...guard, getGroupes);
router.get   ('/affectations',                   ...guard, getAffectationsTous);

module.exports = router;

