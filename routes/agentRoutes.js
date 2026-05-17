const express = require('express');
const router = express.Router();
const {
    // REQ-1 : Gestion des comptes enseignants
    getEnseignants,
    createEnseignant,
    updateEnseignant,
    toggleEnseignantActif,
    // REQ-2 : Affectation
    affecterEnseignant,
    // REQ-3 : Règles de calcul des notes
    updateReglesNotes,
    // REQ-4 : Période de saisie
    togglePeriodeSaisie,
    // REQ-5 : Supervision des supports
    getSupportsTous,
    // REQ-6 : Emploi du temps
    getEdtTous,
    upsertCreneauAgent,
    deleteCreneauAgent
} = require('../controllers/agentController');

const verifierToken     = require('../middleware/authMiddleware');
const autoriserRoles    = require('../middleware/roleMiddleware');

// Raccourci pour simplifier les routes
const guard = [verifierToken, autoriserRoles('Agent', 'Administrateur')];

// ============================================================
// REQ-1 : Gérer les comptes enseignants
// ============================================================
router.get   ('/enseignants',                    ...guard, getEnseignants);       // Lister tous
router.post  ('/enseignants',                    ...guard, createEnseignant);     // Créer un compte
router.put   ('/enseignants/:id',                ...guard, updateEnseignant);     // Modifier nom/email
router.patch ('/enseignants/:id/statut',         ...guard, toggleEnseignantActif);// Activer / désactiver

// ============================================================
// REQ-2 : Affecter les enseignants aux modules et groupes
// ============================================================
router.post  ('/affectation',                    ...guard, affecterEnseignant);

// ============================================================
// REQ-3 : Définir les règles de calcul des notes par module
// ============================================================
router.put   ('/modules/:id/regles-notes',       ...guard, updateReglesNotes);

// ============================================================
// REQ-4 : Autoriser ou verrouiller la saisie des notes
// ============================================================
router.put   ('/periode-saisie',                 ...guard, togglePeriodeSaisie);

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

module.exports = router;

