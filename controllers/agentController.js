const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Contrôleur de l'Agent Pédagogique
// Couvre les 6 fonctions obligatoires :
// 1. Gérer les comptes enseignants (CRUD + activer/désactiver)
// 2. Affecter les enseignants aux modules et groupes
// 3. Définir les règles de calcul des notes (poids CC / EF par module)
// 4. Autoriser ou verrouiller la saisie des notes
// 5. Superviser le dépôt des cours (vue globale de tous les supports)
// 6. Mettre à jour l'emploi du temps

const getEnseignants = async (req, res) => {
    try {
        // Je fais un SELECT basique pour trouver tous les utilisateurs avec le rôle 2 (Enseignant)
        let sql = "SELECT id_utilisateur, nom, prenom, email, actif FROM utilisateurs WHERE id_role = 2 ORDER BY nom, prenom";
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
        let id_groupe = req.body.id_groupe; // Optionnel: si absent, on met à jour TOUTES les affectations du module
        let periode_saisie_ouverte = req.body.periode_saisie_ouverte;

        // Vérification basique
        if (id_module == null || periode_saisie_ouverte == null) {
            return res.status(400).send("Il manque le module ou le statut de la période !");
        }

        // ============================================================
        // PATCH AUDIT: On met à jour la table AFFECTATIONS (et non plus notes)
        // C'est la bonne table car periode_saisie_ouverte est une propriété
        // de l'affectation (enseignant + module + groupe), pas de la note elle-même.
        // ============================================================
        let sql;
        let params;

        if (id_groupe != null) {
            // Si l'agent spécifie un groupe, on ouvre/ferme uniquement cette affectation précise
            sql = "UPDATE affectations SET periode_saisie_ouverte = ? WHERE id_module = ? AND id_groupe = ?";
            params = [periode_saisie_ouverte, id_module, id_groupe];
        } else {
            // Sinon, on ouvre/ferme TOUTES les affectations de ce module (pour tous les groupes)
            sql = "UPDATE affectations SET periode_saisie_ouverte = ? WHERE id_module = ?";
            params = [periode_saisie_ouverte, id_module];
        }

        await db.query(sql, params);

        res.json({ message: "La période de saisie a été mise à jour." });
    } catch (err) {
        console.log("Erreur dans togglePeriodeSaisie :", err);
        res.status(500).send("Erreur lors de la modification de la période de saisie");
    }
};

// ============================================================
// REQ-1 : Créer un nouveau compte enseignant
// ============================================================
const createEnseignant = async (req, res) => {
    try {
        let { nom, prenom, email, mot_de_passe } = req.body;

        if (!nom || !prenom || !email || !mot_de_passe) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires (nom, prenom, email, mot_de_passe)." });
        }

        // Vérifier que l'email n'est pas déjà utilisé
        let verif = await db.query("SELECT id_utilisateur FROM utilisateurs WHERE email = ?", [email]);
        if (verif[0].length > 0) {
            return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
        }

        // Hasher le mot de passe avant de l'enregistrer
        let hash = await bcrypt.hash(mot_de_passe, 10);

        // id_role = 2 = Enseignant (défini dans la table roles)
        let sql = "INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES (?, ?, ?, ?, 2, 1)";
        let result = await db.query(sql, [nom, prenom, email, hash]);

        res.status(201).json({ message: "Compte enseignant créé avec succès.", id: result[0].insertId });
    } catch (err) {
        console.log("Erreur dans createEnseignant :", err);
        res.status(500).json({ message: "Erreur lors de la création du compte enseignant." });
    }
};

// ============================================================
// REQ-1 : Mettre à jour les informations d'un enseignant
// ============================================================
const updateEnseignant = async (req, res) => {
    try {
        let id_utilisateur = req.params.id;
        let { nom, prenom, email } = req.body;

        if (!nom || !prenom || !email) {
            return res.status(400).json({ message: "Les champs nom, prenom et email sont obligatoires." });
        }

        // Vérifier que le compte cible est bien un enseignant (id_role = 2)
        let verif = await db.query("SELECT id_role FROM utilisateurs WHERE id_utilisateur = ?", [id_utilisateur]);
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Enseignant introuvable." });
        }
        if (verif[0][0].id_role !== 2) {
            return res.status(403).json({ message: "Cet utilisateur n'est pas un enseignant." });
        }

        let sql = "UPDATE utilisateurs SET nom = ?, prenom = ?, email = ? WHERE id_utilisateur = ?";
        await db.query(sql, [nom, prenom, email, id_utilisateur]);

        res.json({ message: "Compte enseignant mis à jour avec succès." });
    } catch (err) {
        console.log("Erreur dans updateEnseignant :", err);
        res.status(500).json({ message: "Erreur lors de la mise à jour du compte." });
    }
};

// ============================================================
// REQ-1 : Activer ou désactiver un compte enseignant
// ============================================================
const toggleEnseignantActif = async (req, res) => {
    try {
        let id_utilisateur = req.params.id;
        let { actif } = req.body; // 1 = activer, 0 = désactiver

        if (actif == null) {
            return res.status(400).json({ message: "Le champ 'actif' (0 ou 1) est obligatoire." });
        }

        // On ne peut désactiver que les enseignants (protection contre la désactivation de l'agent lui-même)
        let verif = await db.query("SELECT id_role FROM utilisateurs WHERE id_utilisateur = ?", [id_utilisateur]);
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        if (verif[0][0].id_role !== 2) {
            return res.status(403).json({ message: "Seuls les comptes enseignants peuvent être activés/désactivés par cet agent." });
        }

        await db.query("UPDATE utilisateurs SET actif = ? WHERE id_utilisateur = ?", [actif, id_utilisateur]);

        let etat = actif == 1 ? "activé" : "désactivé";
        res.json({ message: `Compte enseignant ${etat} avec succès.` });
    } catch (err) {
        console.log("Erreur dans toggleEnseignantActif :", err);
        res.status(500).json({ message: "Erreur lors de la mise à jour du statut." });
    }
};

// ============================================================
// REQ-3 : Définir les règles de calcul des notes pour un module
// (poids_cc + poids_ef doivent totaliser 1.00)
// ============================================================
const updateReglesNotes = async (req, res) => {
    try {
        let id_module = req.params.id;
        let { poids_cc, poids_ef } = req.body;

        if (poids_cc == null || poids_ef == null) {
            return res.status(400).json({ message: "Les champs poids_cc et poids_ef sont obligatoires." });
        }

        poids_cc = parseFloat(poids_cc);
        poids_ef = parseFloat(poids_ef);

        // Vérification mathématique : la somme doit être exactement 1.00
        let somme = Math.round((poids_cc + poids_ef) * 100);
        if (somme !== 100) {
            return res.status(400).json({
                message: `poids_cc + poids_ef doit être égal à 1.00. Vous avez fourni : ${poids_cc} + ${poids_ef} = ${(poids_cc + poids_ef).toFixed(2)}`
            });
        }

        // Les valeurs doivent être entre 0 et 1
        if (poids_cc < 0 || poids_cc > 1 || poids_ef < 0 || poids_ef > 1) {
            return res.status(400).json({ message: "Chaque poids doit être compris entre 0.00 et 1.00." });
        }

        let verif = await db.query("SELECT id_module FROM modules WHERE id_module = ?", [id_module]);
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Module introuvable." });
        }

        await db.query("UPDATE modules SET poids_cc = ?, poids_ef = ? WHERE id_module = ?", [poids_cc, poids_ef, id_module]);

        res.json({
            message: "Règles de calcul mises à jour avec succès.",
            module: id_module,
            poids_cc,
            poids_ef
        });
    } catch (err) {
        console.log("Erreur dans updateReglesNotes :", err);
        res.status(500).json({ message: "Erreur lors de la mise à jour des règles de calcul." });
    }
};

// ============================================================
// REQ-5 : Superviser tous les dépôts de cours (vue globale agent)
// ============================================================
const getSupportsTous = async (req, res) => {
    try {
        // Vue complète : titre, fichier, enseignant, module, groupe, date d'upload
        let sql = `
            SELECT
                sc.id_support,
                sc.titre,
                sc.chemin_fichier,
                sc.type_fichier,
                sc.uploaded_at,
                u.nom        AS nom_enseignant,
                u.prenom     AS prenom_enseignant,
                m.nom_module,
                g.libelle    AS libelle_groupe
            FROM supports_cours sc
            JOIN affectations a   ON sc.id_affectation = a.id_affectation
            JOIN utilisateurs u   ON a.id_utilisateur  = u.id_utilisateur
            JOIN modules m        ON a.id_module        = m.id_module
            JOIN groupes g        ON a.id_groupe        = g.id_groupe
            ORDER BY sc.uploaded_at DESC
        `;

        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getSupportsTous :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des supports." });
    }
};

// ============================================================
// REQ-6 : Consulter tout l'emploi du temps (vue globale agent)
// ============================================================
const getEdtTous = async (req, res) => {
    try {
        let sql = `
            SELECT
                edt.id_creneau,
                edt.jour,
                edt.heure_debut,
                edt.heure_fin,
                edt.salle,
                edt.type_seance,
                u.nom        AS nom_enseignant,
                u.prenom     AS prenom_enseignant,
                m.nom_module,
                g.libelle    AS libelle_groupe,
                a.id_affectation
            FROM emploi_du_temps edt
            JOIN affectations a ON edt.id_affectation = a.id_affectation
            JOIN utilisateurs u ON a.id_utilisateur   = u.id_utilisateur
            JOIN modules m      ON a.id_module         = m.id_module
            JOIN groupes g      ON a.id_groupe         = g.id_groupe
            ORDER BY FIELD(edt.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), edt.heure_debut
        `;

        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getEdtTous :", err);
        res.status(500).json({ message: "Erreur lors de la récupération de l'emploi du temps." });
    }
};

// ============================================================
// REQ-6 : Créer ou modifier un créneau dans l'emploi du temps
// ============================================================
const upsertCreneauAgent = async (req, res) => {
    try {
        let { id_affectation, jour, heure_debut, heure_fin, salle, type_seance, id_creneau } = req.body;

        if (!id_affectation || !jour || !heure_debut || !heure_fin || !type_seance) {
            return res.status(400).json({ message: "Champs obligatoires : id_affectation, jour, heure_debut, heure_fin, type_seance." });
        }

        // Vérifier que l'affectation existe
        let verif = await db.query("SELECT id_affectation FROM affectations WHERE id_affectation = ?", [id_affectation]);
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Affectation introuvable." });
        }

        if (id_creneau) {
            // Modification d'un créneau existant
            await db.query(
                "UPDATE emploi_du_temps SET id_affectation=?, jour=?, heure_debut=?, heure_fin=?, salle=?, type_seance=? WHERE id_creneau=?",
                [id_affectation, jour, heure_debut, heure_fin, salle || null, type_seance, id_creneau]
            );
            res.json({ message: "Créneau mis à jour avec succès." });
        } else {
            // Création d'un nouveau créneau
            let ins = await db.query(
                "INSERT INTO emploi_du_temps (id_affectation, jour, heure_debut, heure_fin, salle, type_seance) VALUES (?, ?, ?, ?, ?, ?)",
                [id_affectation, jour, heure_debut, heure_fin, salle || null, type_seance]
            );
            res.status(201).json({ message: "Créneau créé avec succès.", id: ins[0].insertId });
        }
    } catch (err) {
        console.log("Erreur dans upsertCreneauAgent :", err);
        res.status(500).json({ message: "Erreur lors de la gestion du créneau." });
    }
};

// ============================================================
// REQ-6 : Supprimer un créneau de l'emploi du temps
// ============================================================
const deleteCreneauAgent = async (req, res) => {
    try {
        let id_creneau = req.params.id;

        let verif = await db.query("SELECT id_creneau FROM emploi_du_temps WHERE id_creneau = ?", [id_creneau]);
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Créneau introuvable." });
        }

        await db.query("DELETE FROM emploi_du_temps WHERE id_creneau = ?", [id_creneau]);
        res.json({ message: "Créneau supprimé avec succès." });
    } catch (err) {
        console.log("Erreur dans deleteCreneauAgent :", err);
        res.status(500).json({ message: "Erreur lors de la suppression du créneau." });
    }
};

module.exports = {
    // REQ-1 : Gestion des comptes enseignants
    getEnseignants,
    createEnseignant,
    updateEnseignant,
    toggleEnseignantActif,
    // REQ-2 : Affectation enseignants → modules/groupes
    affecterEnseignant,
    // REQ-3 : Règles de calcul des notes
    updateReglesNotes,
    // REQ-4 : Autoriser/verrouiller la saisie des notes
    togglePeriodeSaisie,
    // REQ-5 : Supervision des supports de cours
    getSupportsTous,
    // REQ-6 : Gestion de l'emploi du temps
    getEdtTous,
    upsertCreneauAgent,
    deleteCreneauAgent
};
