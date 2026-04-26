const express = require('express');
const router = express.Router();
const { getListeAppel, enregistrerAbsence } = require('../controllers/absencesController');
const verifierToken = require('../middleware/authMiddleware');

// Route pour afficher la liste d'appel d'un groupe à une date précise
router.get('/appel/:id_module/:id_groupe/:date_seance', verifierToken, getListeAppel);

// Route pour enregistrer l'absence ou la présence d'un étudiant
router.post('/enregistrer', verifierToken, enregistrerAbsence);

module.exports = router;
