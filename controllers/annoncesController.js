const db = require('../config/db');

/**
 * POST /api/annonces
 * Crée et envoie une annonce à un groupe d'étudiants.
 * Body: { titre, contenu, id_groupe }
 */
exports.creerAnnonce = async (req, res) => {
    const { titre, contenu, id_groupe } = req.body;
    const id_enseignant = req.user.id_utilisateur;

    // Validation des champs obligatoires
    if (!titre || !contenu || !id_groupe) {
        return res.status(400).json({
            success: false,
            message: 'Les champs titre, contenu et id_groupe sont obligatoires.'
        });
    }

    try {
        if (typeof id_groupe === 'string' && id_groupe.startsWith('section:')) {
            const parts = id_groupe.split(':');
            const niveau = parts[1];
            const section = parts[2];

            const [groups] = await db.execute(
                'SELECT id_groupe FROM groupes WHERE niveau = ? AND section = ?',
                [niveau, section]
            );

            if (groups.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Aucun groupe trouvé pour le niveau ${niveau} et la section ${section}.`
                });
            }

            for (const g of groups) {
                await db.execute(
                    `INSERT INTO annonces (id_enseignant, id_groupe, titre, contenu)
                     VALUES (?, ?, ?, ?)`,
                    [id_enseignant, g.id_groupe, titre, contenu]
                );
            }

            return res.status(201).json({
                success: true,
                message: 'Annonce envoyée avec succès à tous les groupes de la section.'
            });
        }

        const [result] = await db.execute(
            `INSERT INTO annonces (id_enseignant, id_groupe, titre, contenu)
             VALUES (?, ?, ?, ?)`,
            [id_enseignant, id_groupe, titre, contenu]
        );

        res.status(201).json({
            success: true,
            message: 'Annonce envoyée avec succès.',
            id_annonce: result.insertId
        });
    } catch (error) {
        console.error('Erreur creerAnnonce :', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * GET /api/annonces?id_enseignant=X
 * Liste toutes les annonces envoyées par l'enseignant connecté.
 */
exports.listerAnnonces = async (req, res) => {
    const id_enseignant = req.user.id_utilisateur;

    try {
        const [rows] = await db.execute(
            `SELECT a.id_annonce, a.titre, a.contenu, a.date_envoi,
                    g.libelle AS groupe
             FROM annonces a
             JOIN groupes g ON a.id_groupe = g.id_groupe
             WHERE a.id_enseignant = ?
             ORDER BY a.date_envoi DESC`,
            [id_enseignant]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erreur listerAnnonces :', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * DELETE /api/annonces/:id_annonce
 * Supprime une annonce appartenant à l'enseignant connecté.
 */
exports.supprimerAnnonce = async (req, res) => {
    const { id_annonce } = req.params;
    const id_enseignant = req.user.id_utilisateur;

    try {
        // Vérifier que l'annonce appartient bien à cet enseignant
        const [rows] = await db.execute(
            `SELECT id_annonce FROM annonces
             WHERE id_annonce = ? AND id_enseignant = ?`,
            [id_annonce, id_enseignant]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Annonce introuvable ou accès non autorisé.'
            });
        }

        await db.execute('DELETE FROM annonces WHERE id_annonce = ?', [id_annonce]);

        res.json({ success: true, message: 'Annonce supprimée.' });
    } catch (error) {
        console.error('Erreur supprimerAnnonce :', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};
