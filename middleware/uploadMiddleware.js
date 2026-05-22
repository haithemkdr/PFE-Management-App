const multer = require('multer');

// Configuration de multer (Fait par: étudiant L3)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Je dis à multer de sauvegarder dans le dossier uploads/
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Je donne un nom unique au fichier avec la date
        let nomUnique = Date.now() + '-' + file.originalname;
        cb(null, nomUnique);
    }
});

// Types de fichiers autorisés (PDF, DOC, DOCX, PPTX, ZIP, RAR)
const ALLOWED_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Type de fichier non autorisé. Formats acceptés : PDF, DOC, DOCX, PPTX, ZIP, RAR"), false);
    }
};

// Initialisation de multer — limite à 10 Mo
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;
