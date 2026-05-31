const db = require('../config/db');

// Contrôleur des Supports de Cours
// Fait par: étudiant L3

const uploadSupport = async (req, res) => {
    try {
        console.log("[DEBUG uploadSupport] req.body:", req.body);
        console.log("[DEBUG uploadSupport] req.file:", req.file);

        // Je vérifie si le fichier a bien été reçu
        if (!req.file) {
            console.log("[DEBUG uploadSupport] No file received");
            return res.status(400).send("Aucun fichier n'a été envoyé");
        }

        // Je récupère les informations du body et du fichier
        let titre = req.body.titre;
        let chemin_fichier = req.file.filename; // Le nom généré par multer
        let type_fichier = req.file.mimetype;

        // Extraction des affectations cibles (peut être un ID unique ou un tableau JSON)
        let id_affectations = [];
        if (req.body.id_affectations) {
            try {
                id_affectations = JSON.parse(req.body.id_affectations);
                if (!Array.isArray(id_affectations)) {
                    id_affectations = [id_affectations];
                }
            } catch (e) {
                console.log("[DEBUG uploadSupport] JSON.parse failed, parsing as comma-separated string:", req.body.id_affectations);
                id_affectations = String(req.body.id_affectations)
                    .split(',')
                    .map(id => parseInt(id.trim()))
                    .filter(id => !isNaN(id));
            }
        } else if (req.body.id_affectation) {
            id_affectations = [parseInt(req.body.id_affectation)];
        }

        console.log("[DEBUG uploadSupport] titre:", titre);
        console.log("[DEBUG uploadSupport] parsed id_affectations:", id_affectations);

        if (titre == null || id_affectations.length === 0) {
            console.log("[DEBUG uploadSupport] Validation failed. titre:", titre, "id_affectations:", id_affectations);
            return res.status(400).send("Il manque le titre ou l'affectation");
        }

        // J'insère les informations dans la base de données pour chaque affectation
        let insert_sql = "INSERT INTO supports_cours (id_affectation, titre, chemin_fichier, type_fichier) VALUES (?, ?, ?, ?)";
        await Promise.all(id_affectations.map(id_aff => 
            db.query(insert_sql, [id_aff, titre, chemin_fichier, type_fichier])
        ));

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

        let sql;
        if (typeof id_support === 'string' && id_support.includes(',')) {
            const ids = id_support.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (ids.length === 0) {
                return res.status(400).send("Aucun ID valide fourni");
            }
            sql = `DELETE FROM supports_cours WHERE id_support IN (${ids.join(',')})`;
            await db.query(sql);
        } else {
            sql = "DELETE FROM supports_cours WHERE id_support = ?";
            await db.query(sql, [id_support]);
        }

        res.json({ message: "Le support a été supprimé de la base de données" });
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la suppression du support");
    }
};

const getSupportsForTeacherByModule = async (req, res) => {
    try {
        const id_enseignant = req.user.id_utilisateur;
        const id_module = req.params.id_module;

        if (!id_module) {
            return res.status(400).send("Il faut l'id_module");
        }

        // Requête SQL groupée pour avoir chaque fichier unique avec la liste des groupes/séances associés
        const sql = `
            SELECT s.chemin_fichier, s.titre, s.type_fichier, MAX(s.uploaded_at) AS uploaded_at,
                   GROUP_CONCAT(COALESCE(g.libelle, a.type_seance) ORDER BY g.libelle) AS dest_groupes,
                   GROUP_CONCAT(s.id_support ORDER BY s.id_support) AS id_supports
            FROM supports_cours s
            JOIN affectations a ON s.id_affectation = a.id_affectation
            LEFT JOIN groupes g ON a.id_groupe = g.id_groupe
            WHERE a.id_module = ? AND a.id_utilisateur = ?
            GROUP BY s.chemin_fichier, s.titre, s.type_fichier
            ORDER BY uploaded_at DESC
        `;
        const result = await db.query(sql, [id_module, id_enseignant]);
        res.json(result[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la récupération des supports");
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

module.exports = { uploadSupport, getSupports, deleteSupport, downloadSupport, getSupportsForTeacherByModule };
