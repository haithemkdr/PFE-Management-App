const express = require('express');
const router = express.Router();
const { uploadSupport, getSupports, deleteSupport, downloadSupport, getSupportsForTeacherByModule } = require('../controllers/supportsController');
const verifierToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const multer = require('multer');

// Route pour uploader un fichier (avec gestion d'erreurs multer)
router.post('/upload', verifierToken, (req, res, next) => {
    upload.single('fichier')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Le fichier dépasse la limite de 10 Mo' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadSupport);

// Route pour télécharger un support
router.get('/download/:id_support', verifierToken, downloadSupport);

// Route pour récupérer les supports d'un module par un enseignant
router.get('/teacher/module/:id_module', verifierToken, getSupportsForTeacherByModule);

// Route pour récupérer les supports d'une affectation
router.get('/:id_affectation', verifierToken, getSupports);

// Route pour supprimer un support
router.delete('/:id_support', verifierToken, deleteSupport);

module.exports = router;
