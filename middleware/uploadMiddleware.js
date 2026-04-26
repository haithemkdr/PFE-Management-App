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

// Filtre pour n'accepter que les PDF et DOCX
const fileFilter = (req, file, cb) => {
    // Je vérifie le type de fichier
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else if (file.mimetype === 'application/msword') {
        // Pour les vieux .doc
        cb(null, true);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Pour les nouveaux .docx
        cb(null, true);
    } else {
        // Si c'est autre chose, je refuse
        cb(new Error("Seuls les fichiers PDF et DOC/DOCX sont autorisés"), false);
    }
};

// Initialisation de multer
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

module.exports = upload;
