const db = require('../config/db');

// Contrôleur des Supports de Cours
// Fait par: étudiant L3

const uploadSupport = async (req, res) => {
    try {
        // Je vérifie si le fichier a bien été reçu
        if (!req.file) {
            return res.status(400).send("Aucun fichier n'a été envoyé");
        }

        // Je récupère les informations du body et du fichier
        let titre = req.body.titre;
        let id_affectation = req.body.id_affectation;
        let chemin_fichier = req.file.filename; // Le nom généré par multer
        let type_fichier = req.file.mimetype;

        if (titre == null || id_affectation == null) {
            return res.status(400).send("Il manque le titre ou l'affectation");
        }

        // J'insère les informations dans la base de données
        let insert_sql = "INSERT INTO supports_cours (id_affectation, titre, chemin_fichier, type_fichier) VALUES (?, ?, ?, ?)";
        await db.query(insert_sql, [id_affectation, titre, chemin_fichier, type_fichier]);

        res.json({ message: "Le fichier a été uploadé avec succès", fichier: chemin_fichier });
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de l'upload du fichier");
    }
};

const getSupports = async (req, res) => {
    try {
        // Je récupère l'id de l'affectation depuis les paramètres de l'URL
        let id_affectation = req.params.id_affectation;

        if (id_affectation == null) {
            return res.status(400).send("Il faut l'id_affectation");
        }

        // Je cherche tous les supports pour cette affectation
        let sql = "SELECT * FROM supports_cours WHERE id_affectation = ?";
        let result = await db.query(sql, [id_affectation]);
        let lignes = result[0];

        res.json(lignes);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la récupération des supports");
    }
};

const deleteSupport = async (req, res) => {
    try {
        // Je récupère l'id du support à supprimer
        let id_support = req.params.id_support;

        if (id_support == null) {
            return res.status(400).send("Il faut l'id_support");
        }

        // Je supprime juste la ligne dans la base de données (c'est plus simple)
        let sql = "DELETE FROM supports_cours WHERE id_support = ?";
        await db.query(sql, [id_support]);

        res.json({ message: "Le support a été supprimé de la base de données" });
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la suppression du support");
    }
};

const downloadSupport = async (req, res) => {
    try {
        let id_support = req.params.id_support;

        if (!id_support) {
            return res.status(400).send("Il faut l'id_support");
        }

        let sql = "SELECT * FROM supports_cours WHERE id_support = ?";
        let result = await db.query(sql, [id_support]);
        let lignes = result[0];

        if (lignes.length === 0) {
            return res.status(404).send("Support introuvable");
        }

        let support = lignes[0];
        const path = require('path');
        const fs   = require('fs');

        // chemin_fichier stores just the filename (no 'uploads/' prefix)
        // Strip any accidental 'uploads/' prefix for robustness
        let filename = support.chemin_fichier.replace(/^uploads[\\/]/, '');
        let filePath = path.join(__dirname, '../uploads', filename);

        console.log('[download] Looking for:', filePath);

        if (!fs.existsSync(filePath)) {
            console.error('[download] File not found:', filePath);
            return res.status(404).json({ message: "Fichier introuvable sur le serveur", path: filePath });
        }

        // Build a clean download name: titre + original extension
        const ext = path.extname(filename);        // e.g. '.pdf'
        const safeTitre = (support.titre || 'support')
            .replace(/[^a-zA-Z0-9\u00C0-\u024F\s_-]/g, '')  // keep letters, digits, spaces, dashes
            .trim()
            .replace(/\s+/g, '_');
        const downloadName = safeTitre + ext;

        res.download(filePath, downloadName);
    } catch (err) {
        console.error('[download] Erreur:', err);
        res.status(500).send("Erreur lors du téléchargement");
    }
};

module.exports = { uploadSupport, getSupports, deleteSupport, downloadSupport };
