// Contrôleur des Absences — Gestion de la fiche d'appel par séance
// Fait par: étudiant L3

const db = require('../config/db');

// Récupère la liste d'appel pour un module, groupe et date de séance
const getListeAppel = async (req, res) => {
    try {
        // Je récupère les paramètres de l'URL
        let id_module = req.params.id_module;
        let id_groupe = req.params.id_groupe;
        let date_seance = req.params.date_seance;

        // Je fais une jointure entre les étudiants du groupe et leurs absences pour cette date
        // Pour pouvoir filtrer par module et groupe, je passe par la table affectations
        // On joint aussi la table notes pour savoir si l'étudiant est déjà exclu
        let sql = `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, a.id_absence, a.statut, a.justifiee, n.resultat 
                   FROM etudiants e 
                   LEFT JOIN affectations aff ON e.id_groupe = aff.id_groupe AND aff.id_module = ? 
                   LEFT JOIN absences a ON e.id_etudiant = a.id_etudiant AND a.id_affectation = aff.id_affectation AND a.date_seance = ? 
                   LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = aff.id_module
                   WHERE e.id_groupe = ? ORDER BY e.nom ASC`;
        
        let result = await db.query(sql, [id_module, date_seance, id_groupe]);
        let rows = result[0];

        // Par défaut tout le monde est présent si la ligne d'absence n'existe pas
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].statut == null) {
                rows[i].statut = 'Présent';
            }
            // Je convertis justifiee en boolean pour le front (0 -> false, 1 -> true)
            rows[i].justifiee = rows[i].justifiee === 1;
        }

        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur dans getListeAppel");
    }
};

// Enregistrer l'absence d'un seul étudiant (ancien endpoint, gardé pour compatibilité)
const enregistrerAbsence = async (req, res) => {
    try {
        // Je lis ce qui a été envoyé par le front
        let id_etudiant = req.body.id_etudiant;
        let id_affectation = req.body.id_affectation;
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

// ============================================================
// Enregistrer toute la séance d'un coup (mode batch)
// Reçoit: { id_affectation, date_seance, etudiants: [{ id_etudiant, statut, justifiee }] }
// Après l'enregistrement, vérifie la règle d'exclusion pour chaque étudiant
// Règle: 3 absences non justifiées OU 5 absences totales = exclu (0/20)
// Un "Retard" compte comme 0.5 absence
// ============================================================
const enregistrerSeance = async (req, res) => {
    try {
        let id_affectation = req.body.id_affectation;
        let date_seance = req.body.date_seance;
        let etudiants = req.body.etudiants;

        // Vérification des champs obligatoires
        if (id_affectation == null || date_seance == null || !etudiants || etudiants.length === 0) {
            return res.status(400).send("Il manque des champs obligatoires");
        }

        // Vérifier que le statut est valide pour chaque étudiant
        let statuts_valides = ['Présent', 'Absent', 'Retard'];
        for (let i = 0; i < etudiants.length; i++) {
            if (!statuts_valides.includes(etudiants[i].statut)) {
                return res.status(400).send("Statut invalide pour l'étudiant " + etudiants[i].id_etudiant);
            }
        }

        // Récupérer l'id_module depuis l'affectation (nécessaire pour la règle d'exclusion)
        let aff_sql = "SELECT id_module FROM affectations WHERE id_affectation = ?";
        let aff_result = await db.query(aff_sql, [id_affectation]);
        let aff_rows = aff_result[0];

        if (aff_rows.length === 0) {
            return res.status(404).send("Affectation introuvable");
        }

        let id_module = aff_rows[0].id_module;

        // Je fais un UPSERT pour chaque étudiant de la séance
        for (let i = 0; i < etudiants.length; i++) {
            let etu = etudiants[i];
            let justifiee_val = etu.justifiee ? 1 : 0;

            // Vérifier si l'étudiant a déjà une ligne pour cette séance
            let verif_sql = "SELECT id_absence FROM absences WHERE id_etudiant = ? AND id_affectation = ? AND date_seance = ?";
            let verif_result = await db.query(verif_sql, [etu.id_etudiant, id_affectation, date_seance]);
            let lignes = verif_result[0];

            if (lignes.length > 0) {
                // Mettre à jour la ligne existante
                let update_sql = "UPDATE absences SET statut = ?, justifiee = ? WHERE id_etudiant = ? AND id_affectation = ? AND date_seance = ?";
                await db.query(update_sql, [etu.statut, justifiee_val, etu.id_etudiant, id_affectation, date_seance]);
            } else {
                // Insérer une nouvelle ligne
                let insert_sql = "INSERT INTO absences (id_etudiant, id_affectation, date_seance, statut, justifiee) VALUES (?, ?, ?, ?, ?)";
                await db.query(insert_sql, [etu.id_etudiant, id_affectation, date_seance, etu.statut, justifiee_val]);
            }
        }

        // ============================================================
        // Vérification de la règle d'exclusion pour chaque étudiant
        // Règle: 3 absences non justifiées OU 5 absences totales = exclu
        // Retard non justifié = 0.5 absence, Absent non justifié = 1.0
        // ============================================================
        let exclus = [];

        for (let i = 0; i < etudiants.length; i++) {
            let id_etudiant = etudiants[i].id_etudiant;

            // Compter les absences non justifiées dans ce module
            // On récupère toutes les absences de cet étudiant pour cette affectation
            let abs_sql = "SELECT statut, justifiee FROM absences WHERE id_etudiant = ? AND id_affectation = ? AND statut IN ('Absent', 'Retard')";
            let abs_result = await db.query(abs_sql, [id_etudiant, id_affectation]);
            let abs_rows = abs_result[0];

            // Calculer le total d'absences non justifiées
            let total_non_justifiees = 0;
            let total_absences = 0;

            for (let j = 0; j < abs_rows.length; j++) {
                let row = abs_rows[j];
                // Compter les totaux (justifiée ou non)
                if (row.statut === 'Absent') {
                    total_absences = total_absences + 1;
                } else if (row.statut === 'Retard') {
                    total_absences = total_absences + 0.5;
                }
                // Compter seulement les non justifiées
                if (row.justifiee === 0) {
                    if (row.statut === 'Absent') {
                        total_non_justifiees = total_non_justifiees + 1;
                    } else if (row.statut === 'Retard') {
                        total_non_justifiees = total_non_justifiees + 0.5;
                    }
                }
            }

            // Vérifier la règle: 3 non justifiées OU 5 totales
            if (total_non_justifiees >= 3 || total_absences >= 5) {
                // Marquer l'étudiant comme exclu dans la table notes
                // On met moyenne_finale = 0 et resultat = 'EXC'
                let verif_note_sql = "SELECT id_note FROM notes WHERE id_etudiant = ? AND id_module = ?";
                let verif_note_result = await db.query(verif_note_sql, [id_etudiant, id_module]);
                let note_rows = verif_note_result[0];

                if (note_rows.length > 0) {
                    // Mettre à jour la note existante
                    let update_note_sql = "UPDATE notes SET moyenne_finale = 0.00, resultat = 'EXC' WHERE id_etudiant = ? AND id_module = ?";
                    await db.query(update_note_sql, [id_etudiant, id_module]);
                } else {
                    // Créer une ligne de note avec exclu
                    let insert_note_sql = "INSERT INTO notes (id_etudiant, id_module, moyenne_finale, resultat) VALUES (?, ?, 0.00, 'EXC')";
                    await db.query(insert_note_sql, [id_etudiant, id_module]);
                }

                // Ajouter à la liste des exclus pour informer le front
                exclus.push({
                    id_etudiant: id_etudiant,
                    total_non_justifiees: total_non_justifiees,
                    total_absences: total_absences
                });
            }
        }

        // Réponse avec le résultat
        let message = "La séance a été enregistrée avec succès";
        if (exclus.length > 0) {
            message = message + " — " + exclus.length + " étudiant(s) exclu(s)";
        }

        res.json({
            message: message,
            exclus: exclus
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de l'enregistrement de la séance");
    }
};

module.exports = { getListeAppel, enregistrerAbsence, enregistrerSeance };
