const db = require('../config/db');

// Contrôleur de l'Agent (Scolarité)
// Fait par: étudiant L3

const getEnseignants = async (req, res) => {
    try {
        // Je fais un SELECT basique pour trouver tous les utilisateurs avec le rôle 2 (Enseignant)
        let sql = "SELECT id_utilisateur, nom, prenom, email FROM utilisateurs WHERE id_role = 2";
        let result = await db.query(sql);
        let lignes = result[0]; // On prend le premier tableau renvoyé par mysql2
        
        // Je renvoie les enseignants en JSON au frontend
        res.json(lignes);
    } catch (err) {
        console.log("Erreur dans getEnseignants :", err);
        res.status(500).send("Erreur lors de la récupération des enseignants");
    }
};

const affecterEnseignant = async (req, res) => {
    try {
        let id_utilisateur = req.body.id_utilisateur;
        let id_module = req.body.id_module;
        let id_groupe = req.body.id_groupe;
        let annee_univ = req.body.annee_univ;

        // Vérification très simple avec un if
        if (id_utilisateur == null || id_module == null || id_groupe == null || annee_univ == null) {
            return res.status(400).send("Il manque des champs obligatoires !");
        }

        // L'agent associe un prof à un groupe, ce qui générera plus tard la liste de présence calquée sur le PDF officiel
        let sql = "INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ) VALUES (?, ?, ?, ?)";
        await db.query(sql, [id_utilisateur, id_module, id_groupe, annee_univ]);

        res.json({ message: "L'enseignant a bien été affecté au groupe." });
    } catch (err) {
        console.log("Erreur dans affecterEnseignant :", err);
        res.status(500).send("Erreur lors de l'affectation de l'enseignant");
    }
};

const togglePeriodeSaisie = async (req, res) => {
    try {
        let id_module = req.body.id_module;
        let periode_saisie_ouverte = req.body.periode_saisie_ouverte;

        // Vérification basique
        if (id_module == null || periode_saisie_ouverte == null) {
            return res.status(400).send("Il manque le module ou le statut de la période !");
        }

        // J'ouvre ou je ferme la saisie pour toutes les notes de ce module
        let sql = "UPDATE notes SET periode_saisie_ouverte = ? WHERE id_module = ?";
        await db.query(sql, [periode_saisie_ouverte, id_module]);

        res.json({ message: "La période de saisie a été mise à jour." });
    } catch (err) {
        console.log("Erreur dans togglePeriodeSaisie :", err);
        res.status(500).send("Erreur lors de la modification de la période de saisie");
    }
};

module.exports = { getEnseignants, affecterEnseignant, togglePeriodeSaisie };
