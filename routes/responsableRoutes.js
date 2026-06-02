const express = require('express');
const router = express.Router();
const {
    updatePoidsCoordonnateur,
    getStatutGroupes,
    deverrouillerGroupe,
    getMesModulesResponsable,
    genererPV,
    relancerEnseignant,
    apercuNotesGroupe,
    cloturerModule
} = require('../controllers/responsableController');
const verifierToken = require('../middleware/authMiddleware');

// ============================================================
// Routes du Responsable Matière (Coordonnateur CM)
// Toutes protégées par JWT — l'autorisation fine est dans le contrôleur
// ============================================================

// GET /api/responsable/mes-modules
// Liste les modules dont l'enseignant est responsable matière
router.get('/mes-modules', verifierToken, getMesModulesResponsable);

// PUT /api/responsable/poids
// Modifier les pondérations TD/TP/Exam d'un module
router.put('/poids', verifierToken, updatePoidsCoordonnateur);

// GET /api/responsable/statut-groupes?id_module=X
// Voir le statut de soumission de chaque groupe TD/TP
router.get('/statut-groupes', verifierToken, getStatutGroupes);

// POST /api/responsable/deverrouiller
// Renvoyer un groupe en mode EN_COURS
router.post('/deverrouiller', verifierToken, deverrouillerGroupe);

// GET /api/responsable/pv?id_module=X
// Générer et télécharger le PV (CSV)
router.get('/pv', verifierToken, genererPV);

// POST /api/responsable/relancer
// Envoyer un rappel à un enseignant en retard
router.post('/relancer', verifierToken, relancerEnseignant);

// GET /api/responsable/apercu-notes?id_affectation=X
// Aperçu rapide des notes d'un groupe spécifique
router.get('/apercu-notes', verifierToken, apercuNotesGroupe);

// POST /api/responsable/cloturer
// Clôturer définitivement le module (verrouillage)
router.post('/cloturer', verifierToken, cloturerModule);

module.exports = router;

