const express = require('express');
const router = express.Router();
const { getEnseignants, affecterEnseignant, togglePeriodeSaisie } = require('../controllers/agentController');
const verifierToken = require('../middleware/authMiddleware');
const verifierRole = require('../middleware/roleMiddleware');

// ============================================================
// Routes pour l'Agent de Scolarité
// ============================================================

// Récupérer la liste des enseignants
router.get('/enseignants', verifierToken, verifierRole('Agent', 'Administrateur'), getEnseignants);

// Créer une nouvelle affectation
router.post('/affectation', verifierToken, verifierRole('Agent', 'Administrateur'), affecterEnseignant);

// Ouvrir ou fermer la période de saisie des notes
router.put('/periode-saisie', verifierToken, verifierRole('Agent', 'Administrateur'), togglePeriodeSaisie);

module.exports = router;
