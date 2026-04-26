const db = require('../config/db');

// Contrôleur des Absences
// Fait par: étudiant L3

const getListeAppel = async (req, res) => {
    try {
        // Je récupère les paramètres de l'URL
        let id_module = req.params.id_module;
        let id_groupe = req.params.id_groupe;
        let date_seance = req.params.date_seance;

        // Je fais une jointure entre les étudiants du groupe et leurs absences pour cette date
        // Pour pouvoir filtrer par module et groupe, je passe par la table affectations
        let sql = "SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, a.id_absence, a.statut, a.justifiee FROM etudiants e LEFT JOIN affectations aff ON e.id_groupe = aff.id_groupe AND aff.id_module = ? LEFT JOIN absences a ON e.id_etudiant = a.id_etudiant AND a.id_affectation = aff.id_affectation AND a.date_seance = ? WHERE e.id_groupe = ? ORDER BY e.nom ASC";
        
        let result = await db.query(sql, [id_module, date_seance, id_groupe]);
        let rows = result[0];

        // Par défaut tout le monde est présent si la ligne d'absence n'existe pas
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].statut == null) {
                rows[i].statut = 'Présent';
            }
        }

        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur dans getListeAppel");
    }
};

const enregistrerAbsence = async (req, res) => {
    try {
        // Je lis ce qui a été envoyé par le front
        let id_etudiant = req.body.id_etudiant;
        let id_affectation = req.body.id_affectation; // Il faut l'affectation pour la table absences
        let date_seance = req.body.date_seance;
        let statut = req.body.statut;

        // Vérification simple
        if (id_etudiant == null || id_affectation == null || date_seance == null || statut == null) {
            return res.status(400).send("Il manque des champs obligatoires");
        }

        // Je cherche si l'étudiant a déjà été marqué aujourd'hui pour cette séance
        let verif_sql = "SELECT id_absence FROM absences WHERE id_etudiant = ? AND id_affectation = ? AND date_seance = ?";
        let verif_result = await db.query(verif_sql, [id_etudiant, id_affectation, date_seance]);
        let lignes = verif_result[0];

        if (lignes.length > 0) {
            // S'il y a déjà une ligne, je la mets à jour
            let update_sql = "UPDATE absences SET statut = ? WHERE id_etudiant = ? AND id_affectation = ? AND date_seance = ?";
            await db.query(update_sql, [statut, id_etudiant, id_affectation, date_seance]);
        } else {
            // S'il n'y a rien, j'insère une nouvelle ligne d'absence
            let insert_sql = "INSERT INTO absences (id_etudiant, id_affectation, date_seance, statut) VALUES (?, ?, ?, ?)";
            await db.query(insert_sql, [id_etudiant, id_affectation, date_seance, statut]);
        }

        res.json({ message: "Le statut a été enregistré" });

    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de l'enregistrement de l'absence");
    }
};

module.exports = { getListeAppel, enregistrerAbsence };
