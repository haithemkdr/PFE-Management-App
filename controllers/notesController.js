const db = require('../config/db');

// ============================================================
// Contrôleur des Notes — Gère la saisie et le calcul des moyennes
// ============================================================

/**
 * GET /api/notes/:id_module/:id_groupe
 * Récupère la liste des étudiants d'un groupe avec leurs notes pour un module donné
 */
const getNotesByGroupe = async (req, res) => {
    try {
        const { id_module, id_groupe } = req.query;

        const sql = `
            SELECT e.id_etudiant, e.matricule, e.nom, e.prenom,
                   n.id_note, n.note_cc, n.note_ef, n.note_er, n.moyenne_finale, n.resultat
            FROM etudiants e
            LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = ?
            WHERE e.id_groupe = ?
            ORDER BY e.nom ASC
        `;

        const [rows] = await db.query(sql, [id_module, id_groupe]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des notes :", error.message);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
};

/**
 * POST /api/notes/upsert
 * Insère ou met à jour une note pour un étudiant et calcule automatiquement les moyennes
 */
const upsertNote = async (req, res) => {
    try {
        const { id_etudiant, id_module, note_cc, note_ef, note_er } = req.body;
        const saisie_par = req.user.id_utilisateur; // Récupéré depuis le token JWT

        // Validation : champs obligatoires
        if (!id_etudiant || !id_module) {
            return res.status(400).json({ message: "id_etudiant et id_module sont obligatoires." });
        }

        // 1. Validation des notes (doivent être entre 0 et 20)
        const valider = (val) => val === null || val === undefined || (val >= 0 && val <= 20);
        if (!valider(note_cc) || !valider(note_ef) || !valider(note_er)) {
            return res.status(400).json({ message: "Les notes doivent être comprises entre 0.00 et 20.00." });
        }

        // 2. Calcul des moyennes selon les règles du PV officiel
        let moy1 = null;
        let moy2 = null;
        let moyenne_finale = null;

        // Calcul de la Moyenne 1 (CC + EF)
        if (note_cc != null && note_ef != null) {
            moy1 = parseFloat(((parseFloat(note_cc) * 0.4) + (parseFloat(note_ef) * 0.6)).toFixed(2));
        }

        // Calcul de la Moyenne 2 (Rattrapage si note_er existe)
        if (note_cc != null && note_er != null) {
            moy2 = parseFloat(((parseFloat(note_cc) * 0.4) + (parseFloat(note_er) * 0.6)).toFixed(2));
        }

        // La moyenne finale est le maximum entre moy1 et moy2
        if (moy1 !== null) {
            moyenne_finale = (moy2 !== null && moy2 > moy1) ? moy2 : moy1;
        }

        // Détermination du résultat selon le PV officiel
        // ADM (>= 10) | RAT (5 à 9.99 : rattrapable) | ELI (< 5 : éliminé)
        let resultat = null;
        if (moyenne_finale !== null) {
            if (moyenne_finale >= 10) resultat = 'ADM';
            else if (moyenne_finale >= 5) resultat = 'RAT';
            else resultat = 'ELI';
        }

        // 3. Logique Upsert (Vérifier si une ligne existe déjà)
        const [exist] = await db.query(
            "SELECT id_note FROM notes WHERE id_etudiant = ? AND id_module = ?",
            [id_etudiant, id_module]
        );

        if (exist.length > 0) {
            // Mise à jour
            const updateSql = `
                UPDATE notes 
                SET note_cc = ?, note_ef = ?, note_er = ?, moy1 = ?, moy2 = ?, moyenne_finale = ?, resultat = ?, saisie_par = ?, date_saisie = NOW()
                WHERE id_etudiant = ? AND id_module = ?
            `;
            await db.query(updateSql, [note_cc, note_ef, note_er, moy1, moy2, moyenne_finale, resultat, saisie_par, id_etudiant, id_module]);
        } else {
            // Insertion
            const insertSql = `
                INSERT INTO notes (id_etudiant, id_module, note_cc, note_ef, note_er, moy1, moy2, moyenne_finale, resultat, saisie_par)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await db.query(insertSql, [id_etudiant, id_module, note_cc, note_ef, note_er, moy1, moy2, moyenne_finale, resultat, saisie_par]);
        }

        res.status(200).json({
            message: "Note enregistrée et moyennes calculées !",
            calculs: { moy1, moy2, moyenne_finale, resultat }
        });

    } catch (error) {
        console.error("❌ Erreur lors de la saisie de la note :", error.message);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
};

module.exports = { getNotesByGroupe, upsertNote };
