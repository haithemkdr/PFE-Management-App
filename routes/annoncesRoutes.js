const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/authMiddleware');
const autoriserRoles = require('../middleware/roleMiddleware');
const annoncesController = require('../controllers/annoncesController');

router.post('/',              verifierToken, autoriserRoles('Enseignant'), annoncesController.creerAnnonce);
router.get('/',               verifierToken, autoriserRoles('Enseignant'), annoncesController.listerAnnonces);
router.delete('/:id_annonce', verifierToken, autoriserRoles('Enseignant'), annoncesController.supprimerAnnonce);

module.exports = router;
