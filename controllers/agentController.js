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
        // On récupère matricule, grade + le nombre de modules affectés via LEFT JOIN
        let sql = `
            SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.matricule, u.grade, u.actif,
                   COUNT(a.id_affectation) AS nb_modules
            FROM utilisateurs u
            LEFT JOIN affectations a ON u.id_utilisateur = a.id_utilisateur
            WHERE u.id_role = 2
            GROUP BY u.id_utilisateur
            ORDER BY u.nom, u.prenom
        `;
        let [lignes] = await db.query(sql);
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

// Toggle période de saisie pour UNE affectation (par id_affectation)
const togglePeriodeById = async (req, res) => {
    try {
        const id = req.params.id;
        // Flip the current value
        let sql = "UPDATE affectations SET periode_saisie_ouverte = NOT periode_saisie_ouverte WHERE id_affectation = ?";
        await db.query(sql, [id]);
        res.json({ message: "Période de saisie basculée." });
    } catch (err) {
        console.log("Erreur dans togglePeriodeById :", err);
        res.status(500).send("Erreur lors de la modification de la période de saisie");
    }
};

// ============================================================
// REQ-1 : Créer un nouveau compte enseignant
// ============================================================
const createEnseignant = async (req, res) => {
    try {
        let { nom, prenom, email, mot_de_passe, matricule, grade } = req.body;

        if (!nom || !prenom || !email || !mot_de_passe) {
            return res.status(400).json({ message: "Les champs nom, prenom, email et mot_de_passe sont obligatoires." });
        }

        // Vérifier que l'email n'est pas déjà utilisé
        let [verif] = await db.query("SELECT id_utilisateur FROM utilisateurs WHERE email = ?", [email]);
        if (verif.length > 0) {
            return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
        }

        // Hasher le mot de passe
        let hash = await bcrypt.hash(mot_de_passe, 10);

        // Insérer avec matricule et grade
        let sql = "INSERT INTO utilisateurs (nom, prenom, email, matricule, grade, mot_de_passe, id_role, actif) VALUES (?, ?, ?, ?, ?, ?, 2, 1)";
        let [result] = await db.query(sql, [nom, prenom, email, matricule || null, grade || null, hash]);

        res.status(201).json({ message: "Compte enseignant créé avec succès.", id: result.insertId });
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
        let { nom, prenom, email, matricule, grade } = req.body;

        if (!nom || !prenom || !email) {
            return res.status(400).json({ message: "Les champs nom, prenom et email sont obligatoires." });
        }

        // Vérifier que le compte cible est bien un enseignant (id_role = 2)
        let [verif] = await db.query("SELECT id_role FROM utilisateurs WHERE id_utilisateur = ?", [id_utilisateur]);
        if (verif.length === 0) {
            return res.status(404).json({ message: "Enseignant introuvable." });
        }
        if (verif[0].id_role !== 2) {
            return res.status(403).json({ message: "Cet utilisateur n'est pas un enseignant." });
        }

        let sql = "UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, matricule = ?, grade = ? WHERE id_utilisateur = ?";
        await db.query(sql, [nom, prenom, email, matricule || null, grade || null, id_utilisateur]);

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

        // Vérifier que c'est bien un enseignant
        let [verif] = await db.query("SELECT id_role, actif FROM utilisateurs WHERE id_utilisateur = ?", [id_utilisateur]);
        if (verif.length === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        if (verif[0].id_role !== 2) {
            return res.status(403).json({ message: "Seuls les comptes enseignants peuvent être activés/désactivés." });
        }

        // Toggle : on inverse la valeur actuelle
        let newActif = verif[0].actif ? 0 : 1;
        await db.query("UPDATE utilisateurs SET actif = ? WHERE id_utilisateur = ?", [newActif, id_utilisateur]);

        let etat = newActif === 1 ? "activé" : "désactivé";
        res.json({ message: `Compte enseignant ${etat} avec succès.`, actif: newActif });
    } catch (err) {
        console.log("Erreur dans toggleEnseignantActif :", err);
        res.status(500).json({ message: "Erreur lors de la mise à jour du statut." });
    }
};

// ============================================================
// REQ-1 : Supprimer un compte enseignant
// ============================================================
const deleteEnseignant = async (req, res) => {
    try {
        let id_utilisateur = req.params.id;

        // Vérifier que c'est bien un enseignant
        let [verif] = await db.query("SELECT id_role FROM utilisateurs WHERE id_utilisateur = ?", [id_utilisateur]);
        if (verif.length === 0) {
            return res.status(404).json({ message: "Enseignant introuvable." });
        }
        if (verif[0].id_role !== 2) {
            return res.status(403).json({ message: "Seuls les comptes enseignants peuvent être supprimés." });
        }

        // Supprimer les affectations liées d'abord (intégrité référentielle)
        await db.query("DELETE FROM affectations WHERE id_utilisateur = ?", [id_utilisateur]);
        // Supprimer le compte
        await db.query("DELETE FROM utilisateurs WHERE id_utilisateur = ?", [id_utilisateur]);

        res.json({ message: "Compte enseignant supprimé avec succès." });
    } catch (err) {
        console.log("Erreur dans deleteEnseignant :", err);
        res.status(500).json({ message: "Erreur lors de la suppression du compte." });
    }
};

// ============================================================
// REQ-3 : Définir les règles de calcul des notes pour un module
// (poids_cc + poids_ef doivent totaliser 1.00)
// ============================================================
const updateReglesNotes = async (req, res) => {
    try {
        // On récupère l'id soit depuis l'URL soit depuis le body
        let id_module = req.params.id || req.body.id_module;
        let { coefficient, semestre, type_eval, note_eliminatoire, credits, poids_cc, poids_ef } = req.body;

        // Vérification basique : il faut au moins le module et le coefficient
        if (id_module == null || coefficient == null) {
            return res.status(400).json({ message: "Les champs id_module et coefficient sont obligatoires." });
        }

        coefficient = parseFloat(coefficient);

        if (coefficient < 0.5 || coefficient > 10) {
            return res.status(400).json({ message: "Le coefficient doit être compris entre 0.5 et 10." });
        }

        // Vérifier que le module existe
        let verif = await db.query("SELECT id_module FROM modules WHERE id_module = ?", [id_module]);
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Module introuvable." });
        }

        // On construit la requête UPDATE avec tous les champs possibles
        let sql = "UPDATE modules SET coefficient = ?";
        let params = [coefficient];

        if (semestre) {
            sql += ", semestre = ?";
            params.push(semestre);
        }
        if (type_eval) {
            sql += ", type_eval = ?";
            params.push(type_eval);
        }
        if (note_eliminatoire != null) {
            sql += ", note_eliminatoire = ?";
            params.push(parseFloat(note_eliminatoire));
        }
        if (credits != null) {
            sql += ", credits = ?";
            params.push(parseInt(credits));
        }
        if (poids_cc != null) {
            sql += ", poids_cc = ?";
            params.push(parseFloat(poids_cc));
        }
        if (poids_ef != null) {
            sql += ", poids_ef = ?";
            params.push(parseFloat(poids_ef));
        }

        sql += " WHERE id_module = ?";
        params.push(id_module);

        await db.query(sql, params);

        res.json({
            message: "Règles de calcul mises à jour avec succès.",
            module: id_module,
            coefficient
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

// ============================================================
// REQ-2 : Modifier une affectation existante
// ============================================================
const updateAffectation = async (req, res) => {
    try {
        let id_affectation = req.params.id;
        let { id_utilisateur, id_module, id_groupe, annee_univ } = req.body;

        // Vérification basique des champs obligatoires
        if (!id_utilisateur || !id_module || !id_groupe || !annee_univ) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires." });
        }

        // Vérifier que l'affectation existe
        let [verif] = await db.query("SELECT id_affectation FROM affectations WHERE id_affectation = ?", [id_affectation]);
        if (verif.length === 0) {
            return res.status(404).json({ message: "Affectation introuvable." });
        }

        // Mise à jour de l'affectation
        let sql = "UPDATE affectations SET id_utilisateur = ?, id_module = ?, id_groupe = ?, annee_univ = ? WHERE id_affectation = ?";
        await db.query(sql, [id_utilisateur, id_module, id_groupe, annee_univ, id_affectation]);

        res.json({ message: "Affectation mise à jour avec succès." });
    } catch (err) {
        console.log("Erreur dans updateAffectation :", err);
        res.status(500).json({ message: "Erreur lors de la mise à jour de l'affectation." });
    }
};

// ============================================================
// REQ-2 : Supprimer une affectation
// ============================================================
const deleteAffectation = async (req, res) => {
    try {
        let id_affectation = req.params.id;

        // Vérifier que l'affectation existe
        let [verif] = await db.query("SELECT id_affectation FROM affectations WHERE id_affectation = ?", [id_affectation]);
        if (verif.length === 0) {
            return res.status(404).json({ message: "Affectation introuvable." });
        }

        // Supprimer les données liées (notes, absences, supports, emploi_du_temps) par cascade SQL
        // Puis supprimer l'affectation elle-même
        await db.query("DELETE FROM affectations WHERE id_affectation = ?", [id_affectation]);

        res.json({ message: "Affectation supprimée avec succès." });
    } catch (err) {
        console.log("Erreur dans deleteAffectation :", err);
        res.status(500).json({ message: "Erreur lors de la suppression de l'affectation." });
    }
};

// ============================================================
// HELPERS : Listes déroulantes pour le frontend agent
// ============================================================
const getModules = async (req, res) => {
    try {
        // On récupère tous les champs du module, y compris les nouvelles colonnes de la page Règles des Notes
        let sql = "SELECT id_module, nom_module, coefficient, semestre, poids_cc, poids_ef, type_eval, note_eliminatoire, credits FROM modules ORDER BY nom_module";
        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getModules :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des modules." });
    }
};

const getGroupes = async (req, res) => {
    try {
        let sql = "SELECT id_groupe, libelle FROM groupes ORDER BY libelle";
        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getGroupes :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des groupes." });
    }
};

const getAffectationsTous = async (req, res) => {
    try {
        // Vue complète : enseignant, module, groupe, année, poids, période
        let sql = `
            SELECT
                a.id_affectation,
                a.annee_univ,
                a.periode_saisie_ouverte,
                u.id_utilisateur,
                u.nom        AS nom_enseignant,
                u.prenom     AS prenom_enseignant,
                m.id_module,
                m.nom_module,
                m.coefficient,
                m.semestre,
                m.poids_cc,
                m.poids_ef,
                g.id_groupe,
                g.libelle    AS libelle_groupe
            FROM affectations a
            JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
            JOIN modules m      ON a.id_module      = m.id_module
            JOIN groupes g      ON a.id_groupe      = g.id_groupe
            ORDER BY a.annee_univ DESC, u.nom, m.nom_module
        `;
        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getAffectationsTous :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des affectations." });
    }
};

// ============================================================
// Dashboard : statistiques en temps réel pour le tableau de bord
// ============================================================
const getDashboardStats = async (req, res) => {
    try {
        // 1) Compteurs globaux — une requête par table pour rester simple
        let [ensRows] = await db.query("SELECT COUNT(*) AS total FROM utilisateurs WHERE id_role = 2");
        let [etuRows] = await db.query("SELECT COUNT(*) AS total FROM etudiants");
        let [affRows] = await db.query("SELECT COUNT(*) AS total FROM affectations");
        let [modRows] = await db.query("SELECT COUNT(*) AS total FROM modules");
        let [perRows] = await db.query("SELECT COUNT(*) AS total FROM affectations WHERE periode_saisie_ouverte = 1");

        let stats = {
            enseignants:     ensRows[0].total,
            etudiants:       etuRows[0].total,
            affectations:    affRows[0].total,
            modules:         modRows[0].total,
            periodesActives: perRows[0].total
        };

        // 2) Top 4 périodes (affectations avec infos enseignant + module)
        let [periodes] = await db.query(`
            SELECT a.id_affectation, u.nom, u.prenom, m.nom_module, a.periode_saisie_ouverte
            FROM affectations a
            JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
            JOIN modules m      ON a.id_module      = m.id_module
            ORDER BY a.id_affectation DESC
            LIMIT 4
        `);

        // 3) Top 4 enseignants
        let [enseignants] = await db.query(`
            SELECT id_utilisateur, nom, prenom, email, actif
            FROM utilisateurs
            WHERE id_role = 2
            ORDER BY nom, prenom
            LIMIT 4
        `);

        res.json({ stats, periodes, enseignants });
    } catch (err) {
        console.log("Erreur dans getDashboardStats :", err);
        res.status(500).send("Erreur lors du chargement du tableau de bord");
    }
};

module.exports = {
    // REQ-1 : Gestion des comptes enseignants
    getEnseignants,
    createEnseignant,
    updateEnseignant,
    toggleEnseignantActif,
    deleteEnseignant,
    // REQ-2 : Affectation enseignants → modules/groupes
    affecterEnseignant,
    updateAffectation,
    deleteAffectation,
    // REQ-3 : Règles de calcul des notes
    updateReglesNotes,
    // REQ-4 : Autoriser/verrouiller la saisie des notes
    togglePeriodeSaisie,
    togglePeriodeById,
    // REQ-5 : Supervision des supports de cours
    getSupportsTous,
    // REQ-6 : Gestion de l'emploi du temps
    getEdtTous,
    upsertCreneauAgent,
    deleteCreneauAgent,
    // Dashboard
    getDashboardStats,
    // Helpers pour le frontend
    getModules,
    getGroupes,
    getAffectationsTous
};

