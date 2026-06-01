// Routes pour la gestion des absences
const express = require('express');
const router = express.Router();
const { getListeAppel, enregistrerAbsence, enregistrerSeance, getSuiviSeances, getEdtDates } = require('../controllers/absencesController');
const verifierToken = require('../middleware/authMiddleware');

// Route pour afficher la liste d'appel d'un groupe à une date précise
router.get('/appel/:id_module/:id_groupe/:date_seance', verifierToken, getListeAppel);

// Route pour le suivi S1-S14 (matrice de présence)
router.get('/suivi/:id_module/:id_groupe', verifierToken, getSuiviSeances);

// Route pour récupérer les dates de séances selon l'EDT
router.get('/edt-dates/:id_module/:id_groupe', verifierToken, getEdtDates);

// Route pour enregistrer l'absence ou la présence d'un étudiant (ancien, compatibilité)
router.post('/enregistrer', verifierToken, enregistrerAbsence);

// Route pour enregistrer toute la séance d'un coup (mode batch)
router.post('/enregistrer-seance', verifierToken, enregistrerSeance);

module.exports = router;
