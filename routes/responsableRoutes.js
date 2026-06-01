const express = require('express');
const router = express.Router();
const {
    updatePoidsCoordonnateur,
    getStatutGroupes,
    deverrouillerGroupe,
    getMesModulesResponsable,
    genererPV
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

module.exports = router;
