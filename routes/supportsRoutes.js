const express = require('express');
const router = express.Router();
const { uploadSupport, getSupports, deleteSupport } = require('../controllers/supportsController');
const verifierToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route pour uploader un fichier (avec le middleware multer)
router.post('/upload', verifierToken, upload.single('fichier'), uploadSupport);

// Route pour récupérer les supports d'une affectation
router.get('/:id_affectation', verifierToken, getSupports);

// Route pour supprimer un support
router.delete('/:id_support', verifierToken, deleteSupport);

module.exports = router;
