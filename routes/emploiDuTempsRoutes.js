const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/authMiddleware');
const autoriserRoles = require('../middleware/roleMiddleware');
const emploiDuTempsController = require('../controllers/emploiDuTempsController');

// GET /api/emploi-du-temps/:id_enseignant?semaine=N
router.get('/:id_enseignant', verifierToken, autoriserRoles('Enseignant'), emploiDuTempsController.getEmploiDuTemps);

module.exports = router;
