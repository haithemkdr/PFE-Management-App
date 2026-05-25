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
    // Bilan semestriel
    getBilanSemestre,
    // Sessions + Délibération
    getSessionActive,
    setSessionActive,
    getDeliberation,
    appliquerRachat,
    validerDeliberation,
    // Helpers pour le frontend
    getModules,
    getGroupes,
    getAffectationsTous,
    getFormations
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
router.get   ('/enseignants',                    ...guard, getEnseignants);
router.post  ('/enseignants',                    ...guard, createEnseignant);
router.put   ('/enseignants/:id',                ...guard, updateEnseignant);
router.patch ('/enseignants/:id/statut',         ...guard, toggleEnseignantActif);
router.delete('/enseignants/:id',                ...guard, deleteEnseignant);

// ============================================================
// REQ-2 : Affecter les enseignants aux modules et groupes
// ============================================================
router.post  ('/affectation',                    ...guard, affecterEnseignant);
router.put   ('/affectations/:id',               ...guard, updateAffectation);
router.delete('/affectations/:id',               ...guard, deleteAffectation);

// ============================================================
// REQ-3 : Définir les règles de calcul des notes par module
// ============================================================
router.put   ('/modules/:id/regles-notes',       ...guard, updateReglesNotes);
router.put   ('/regles',                         ...guard, updateReglesNotes);

// ============================================================
// REQ-4 : Autoriser ou verrouiller la saisie des notes
// ============================================================
router.put   ('/periode-saisie',                 ...guard, togglePeriodeSaisie);
router.patch ('/periodes/:id/toggle',            ...guard, togglePeriodeById);

// ============================================================
// REQ-5 : Superviser le dépôt des cours (vue globale)
// ============================================================
router.get   ('/supports',                       ...guard, getSupportsTous);

// ============================================================
// REQ-6 : Mettre à jour l'emploi du temps
// ============================================================
router.get   ('/edt',                            ...guard, getEdtTous);
router.post  ('/edt',                            ...guard, upsertCreneauAgent);
router.put   ('/edt',                            ...guard, upsertCreneauAgent);
router.delete('/edt/:id',                        ...guard, deleteCreneauAgent);

// ============================================================
// Bilan Semestriel
// ============================================================
router.get   ('/bilan-semestre',                 ...guard, getBilanSemestre);
router.get   ('/formations',                     ...guard, getFormations);

// ============================================================
// Sessions (NORMALE / RATTRAPAGE)
// ============================================================
router.get   ('/session-active',                 ...guard, getSessionActive);
router.put   ('/session-active',                 ...guard, setSessionActive);

// ============================================================
// Délibération annuelle
// ============================================================
router.get   ('/deliberation',                   ...guard, getDeliberation);
router.post  ('/deliberation/rachat',            ...guard, appliquerRachat);
router.post  ('/deliberation/valider',           ...guard, validerDeliberation);

// ============================================================
// Helpers : listes déroulantes pour le frontend
// ============================================================
router.get   ('/modules',                        ...guard, getModules);
router.get   ('/groupes',                        ...guard, getGroupes);
router.get   ('/affectations',                   ...guard, getAffectationsTous);

module.exports = router;
