const db = require('../config/db');
const bcrypt = require('bcryptjs');
const gradeEngine = require('../services/gradeEngine');

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
        let { id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau } = req.body;

        // Champs toujours obligatoires
        if (id_utilisateur == null || id_module == null || annee_univ == null) {
            return res.status(400).json({ message: "Les champs id_utilisateur, id_module et annee_univ sont obligatoires." });
        }

        // Défaut : TD si pas spécifié (rétro-compatible)
        if (!type_seance) type_seance = 'TD';

        // Validation selon le type de séance
        if (type_seance === 'CM') {
            // CM → affectation à une section entière, pas de groupe
            if (!section || !niveau) {
                return res.status(400).json({ message: "Pour une affectation CM, la section et le niveau sont obligatoires." });
            }
            id_groupe = null; // CM n'a pas de groupe spécifique
        } else {
            // TD/TP → groupe obligatoire
            if (id_groupe == null) {
                return res.status(400).json({ message: "Pour une affectation TD/TP, le groupe est obligatoire." });
            }
        }

        let sql = "INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau) VALUES (?, ?, ?, ?, ?, ?, ?)";
        await db.query(sql, [id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section || null, niveau || null]);

        res.json({ message: `Affectation ${type_seance} créée avec succès.` });
    } catch (err) {
        console.log("Erreur dans affecterEnseignant :", err);
        res.status(500).json({ message: "Erreur lors de l'affectation de l'enseignant" });
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
// poids_exam + poids_td + poids_tp doivent totaliser 1.00
// ============================================================
const updateReglesNotes = async (req, res) => {
    try {
        // On récupère l'id soit depuis l'URL soit depuis le body
        let id_module = req.params.id || req.body.id_module;
        let { coefficient, semestre, credits, poids_exam, poids_td, poids_tp } = req.body;

        // Vérification basique : il faut au moins le module et le coefficient
        if (id_module == null || coefficient == null) {
            return res.status(400).json({ message: "Les champs id_module et coefficient sont obligatoires." });
        }

        coefficient = parseFloat(coefficient);

        if (coefficient < 0.5 || coefficient > 10) {
            return res.status(400).json({ message: "Le coefficient doit être compris entre 0.5 et 10." });
        }

        // Validation des poids 3-way via gradeEngine
        if (poids_exam != null && poids_td != null && poids_tp != null) {
            const errPoids = gradeEngine.validePoids(poids_exam, poids_td, poids_tp);
            if (errPoids) {
                return res.status(400).json({ message: errPoids });
            }
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
        if (credits != null) {
            sql += ", credits = ?";
            params.push(parseInt(credits));
        }
        if (poids_exam != null) {
            sql += ", poids_exam = ?";
            params.push(parseFloat(poids_exam));
        }
        if (poids_td != null) {
            sql += ", poids_td = ?";
            params.push(parseFloat(poids_td));
        }
        if (poids_tp != null) {
            sql += ", poids_tp = ?";
            params.push(parseFloat(poids_tp));
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
        // LEFT JOIN groupes car les affectations CM n'ont pas de groupe (id_groupe NULL)
        let sql = `
            SELECT
                sc.id_support,
                sc.titre,
                sc.chemin_fichier,
                sc.type_fichier,
                sc.uploaded_at,
                u.id_utilisateur,
                u.nom        AS nom_enseignant,
                u.prenom     AS prenom_enseignant,
                m.nom_module,
                a.type_seance,
                g.libelle    AS libelle_groupe,
                COALESCE(g.niveau,  a.niveau)  AS niveau,
                COALESCE(g.section, a.section) AS section
            FROM supports_cours sc
            JOIN affectations a   ON sc.id_affectation = a.id_affectation
            JOIN utilisateurs u   ON a.id_utilisateur  = u.id_utilisateur
            JOIN modules m        ON a.id_module        = m.id_module
            LEFT JOIN groupes g   ON a.id_groupe        = g.id_groupe
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
                u.id_utilisateur AS id_enseignant,
                u.nom        AS nom_enseignant,
                u.prenom     AS prenom_enseignant,
                m.nom_module,
                m.semestre,
                g.libelle    AS libelle_groupe,
                COALESCE(g.niveau, a.niveau)   AS niveau,
                COALESCE(g.section, a.section) AS section,
                a.id_affectation
            FROM emploi_du_temps edt
            JOIN affectations a ON edt.id_affectation = a.id_affectation
            JOIN utilisateurs u ON a.id_utilisateur   = u.id_utilisateur
            JOIN modules m      ON a.id_module         = m.id_module
            LEFT JOIN groupes g ON a.id_groupe         = g.id_groupe
            ORDER BY FIELD(edt.jour,'Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), edt.heure_debut
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
        let { id_affectation, jour, heure_debut, heure_fin, salle, id_creneau } = req.body;

        if (!id_affectation || !jour || !heure_debut || !heure_fin) {
            return res.status(400).json({ message: "Champs obligatoires : id_affectation, jour, heure_debut, heure_fin." });
        }

        // Vérifier que l'affectation existe ET récupérer son type_seance
        let verif = await db.query(
            "SELECT id_affectation, type_seance FROM affectations WHERE id_affectation = ?",
            [id_affectation]
        );
        if (verif[0].length === 0) {
            return res.status(404).json({ message: "Affectation introuvable." });
        }

        // Le type_seance du créneau est TOUJOURS hérité de l'affectation
        let type_seance = verif[0][0].type_seance;

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
        let { id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau } = req.body;

        // Champs toujours obligatoires
        if (!id_utilisateur || !id_module || !annee_univ) {
            return res.status(400).json({ message: "Les champs id_utilisateur, id_module et annee_univ sont obligatoires." });
        }

        // Défaut : TD si pas spécifié
        if (!type_seance) type_seance = 'TD';

        // Validation selon le type de séance
        if (type_seance === 'CM') {
            if (!section || !niveau) {
                return res.status(400).json({ message: "Pour une affectation CM, la section et le niveau sont obligatoires." });
            }
            id_groupe = null;
        } else {
            if (id_groupe == null) {
                return res.status(400).json({ message: "Pour une affectation TD/TP, le groupe est obligatoire." });
            }
        }

        // Vérifier que l'affectation existe
        let [verif] = await db.query("SELECT id_affectation FROM affectations WHERE id_affectation = ?", [id_affectation]);
        if (verif.length === 0) {
            return res.status(404).json({ message: "Affectation introuvable." });
        }

        // Mise à jour de l'affectation avec type_seance
        let sql = "UPDATE affectations SET id_utilisateur = ?, id_module = ?, id_groupe = ?, annee_univ = ?, type_seance = ?, section = ?, niveau = ? WHERE id_affectation = ?";
        await db.query(sql, [id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section || null, niveau || null, id_affectation]);

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
        // On récupère tous les champs du module avec les poids 3-way LMD
        let sql = `SELECT m.id_module, m.nom_module, m.code_module, m.coefficient, m.semestre,
                          m.poids_exam, m.poids_td, m.poids_tp, m.credits,
                          m.id_ue, m.id_formation,
                          ue.titre AS titre_ue,
                          f.code AS code_formation
                   FROM modules m
                   LEFT JOIN unites_enseignement ue ON m.id_ue = ue.id_ue
                   LEFT JOIN formations f ON m.id_formation = f.id_formation
                   ORDER BY f.code, m.semestre, ue.code_ue, m.nom_module`;
        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getModules :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des modules." });
    }
};

const getGroupes = async (req, res) => {
    try {
        let sql = "SELECT id_groupe, libelle, niveau, section FROM groupes ORDER BY niveau, section, libelle";
        let result = await db.query(sql);
        res.json(result[0]);
    } catch (err) {
        console.log("Erreur dans getGroupes :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des groupes." });
    }
};

const getAffectationsTous = async (req, res) => {
    try {
        // Vue complète : enseignant, module, groupe, année, type_seance, section/niveau, période
        // LEFT JOIN groupes car CM n'a pas de id_groupe (NULL)
        let sql = `
            SELECT
                a.id_affectation,
                a.annee_univ,
                a.periode_saisie_ouverte,
                a.type_seance,
                a.section   AS aff_section,
                a.niveau    AS aff_niveau,
                u.id_utilisateur,
                u.nom        AS nom_enseignant,
                u.prenom     AS prenom_enseignant,
                m.id_module,
                m.nom_module,
                m.coefficient,
                m.semestre,
                m.poids_exam,
                m.poids_td,
                m.poids_tp,
                g.id_groupe,
                g.libelle    AS libelle_groupe,
                COALESCE(g.niveau,  a.niveau)  AS niveau,
                COALESCE(g.section, a.section) AS section
            FROM affectations a
            JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
            JOIN modules m      ON a.id_module      = m.id_module
            LEFT JOIN groupes g ON a.id_groupe      = g.id_groupe
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

// ============================================================
// Bilan Semestriel — Vue complète des résultats par semestre
// ============================================================
const getBilanSemestre = async (req, res) => {
    try {
        const { niveau, section, semestre } = req.query;

        if (!niveau || !semestre) {
            return res.status(400).json({ message: "Les paramètres niveau et semestre sont obligatoires." });
        }

        // 1. Récupérer les UE et modules pour ce semestre/formation
        const [ues] = await db.query(
            `SELECT ue.id_ue, ue.code_ue, ue.titre, ue.coefficient AS ue_coef, ue.credits,
                    m.id_module, m.nom_module, m.code_module, m.coefficient, m.credits AS mod_credits,
                    m.poids_exam, m.poids_td, m.poids_tp
             FROM unites_enseignement ue
             JOIN modules m ON m.id_ue = ue.id_ue
             JOIN formations f ON ue.id_formation = f.id_formation
             WHERE ue.semestre = ? AND f.niveau = ?
             ORDER BY ue.code_ue, m.nom_module`,
            [semestre, niveau.replace('L', '')]
        );

        if (ues.length === 0) {
            return res.json({ etudiants: [], structure: [] });
        }

        // 2. Récupérer tous les étudiants du niveau/section
        let etuSql = `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, g.libelle AS nom_groupe
                      FROM etudiants e
                      JOIN groupes g ON e.id_groupe = g.id_groupe
                      WHERE g.niveau = ?`;
        let etuParams = [niveau];
        if (section) {
            etuSql += " AND g.section = ?";
            etuParams.push(section);
        }
        etuSql += " ORDER BY e.nom, e.prenom";
        const [etudiants] = await db.query(etuSql, etuParams);

        // 3. Construire la structure UE (nécessaire même sans étudiants)
        const ueMap = new Map();
        for (const row of ues) {
            if (!ueMap.has(row.id_ue)) {
                ueMap.set(row.id_ue, {
                    id_ue: row.id_ue,
                    code_ue: row.code_ue,
                    titre: row.titre,
                    coefficient: parseFloat(row.ue_coef),
                    credits_total: parseInt(row.credits),
                    modules: []
                });
            }
            ueMap.get(row.id_ue).modules.push({
                id_module: row.id_module,
                nom_module: row.nom_module,
                code_module: row.code_module,
                coefficient: parseFloat(row.coefficient),
                credits: parseInt(row.mod_credits),
                poids_exam: parseFloat(row.poids_exam),
                poids_td: parseFloat(row.poids_td),
                poids_tp: parseFloat(row.poids_tp)
            });
        }
        const ueStructure = Array.from(ueMap.values());

        if (etudiants.length === 0) {
            return res.json({ etudiants: [], structure: ueStructure });
        }

        // 4. Récupérer toutes les notes pour ces modules/étudiants
        const moduleIds = [...new Set(ues.map(u => u.id_module))];
        const etudiantIds = etudiants.map(e => e.id_etudiant);

        const [notes] = await db.query(
            `SELECT id_etudiant, id_module, note_td, note_tp, note_ef, note_er,
                    moy1, moy2, moyenne_finale, resultat
             FROM notes
             WHERE id_module IN (?) AND id_etudiant IN (?)`,
            [moduleIds, etudiantIds]
        );

        // Index des notes : { id_etudiant: { id_module: noteRow } }
        const notesIndex = {};
        for (const n of notes) {
            if (!notesIndex[n.id_etudiant]) notesIndex[n.id_etudiant] = {};
            notesIndex[n.id_etudiant][n.id_module] = n;
        }

        // 5. Calculer le bilan pour chaque étudiant
        const bilanEtudiants = etudiants.map(etu => {
            const ueResults = ueStructure.map(ue => {
                const modulesNotes = ue.modules.map(mod => {
                    const noteRow = notesIndex[etu.id_etudiant]?.[mod.id_module];
                    return {
                        id_module: mod.id_module,
                        nom_module: mod.nom_module,
                        coefficient: mod.coefficient,
                        credits: mod.credits,
                        note_td: noteRow?.note_td ?? null,
                        note_tp: noteRow?.note_tp ?? null,
                        note_ef: noteRow?.note_ef ?? null,
                        note_er: noteRow?.note_er ?? null,
                        moyenne_finale: noteRow?.moyenne_finale != null
                            ? parseFloat(noteRow.moyenne_finale) : null,
                        resultat: noteRow?.resultat ?? null
                    };
                });

                const ueCalc = gradeEngine.calculeMoyenneUE(modulesNotes, ue.credits_total);
                return {
                    ...ue,
                    modules_notes: modulesNotes,
                    ...ueCalc
                };
            });

            const bilanSem = gradeEngine.calculeBilanSemestre(ueResults);
            return {
                id_etudiant: etu.id_etudiant,
                matricule: etu.matricule,
                nom: etu.nom,
                prenom: etu.prenom,
                nom_groupe: etu.nom_groupe,
                ues: ueResults,
                ...bilanSem
            };
        });

        res.json({
            semestre,
            niveau,
            section: section || 'Toutes',
            structure: ueStructure,
            etudiants: bilanEtudiants
        });

    } catch (err) {
        console.log("Erreur dans getBilanSemestre :", err);
        res.status(500).json({ message: "Erreur lors du calcul du bilan semestriel." });
    }
};

// ============================================================
// Helper : Liste des formations disponibles
// ============================================================
const getFormations = async (req, res) => {
    try {
        let [rows] = await db.query(
            "SELECT id_formation, code, nom_complet, domaine, branche, cycle, niveau FROM formations ORDER BY niveau, code"
        );
        res.json(rows);
    } catch (err) {
        console.log("Erreur dans getFormations :", err);
        res.status(500).json({ message: "Erreur lors de la récupération des formations." });
    }
};


// ============================================================
// Sessions : gestion de la session active (NORMALE / RATTRAPAGE)
// ============================================================

const getSessionActive = async (req, res) => {
    try {
        const { semestre, annee_univ } = req.query;
        const annee = annee_univ || '2025-2026';

        let sql = "SELECT * FROM sessions WHERE annee_univ = ?";
        let params = [annee];
        if (semestre) {
            sql += " AND semestre = ?";
            params.push(semestre);
        }
        sql += " ORDER BY semestre";

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("Erreur getSessionActive:", err);
        res.status(500).json({ message: "Erreur récupération session." });
    }
};

const setSessionActive = async (req, res) => {
    try {
        const { semestre, annee_univ, type_session } = req.body;
        const annee = annee_univ || '2025-2026';

        if (!semestre || !type_session) {
            return res.status(400).json({ message: "semestre et type_session sont obligatoires." });
        }
        if (!['NORMALE', 'RATTRAPAGE'].includes(type_session)) {
            return res.status(400).json({ message: "type_session doit être NORMALE ou RATTRAPAGE." });
        }

        const verrouille = type_session === 'RATTRAPAGE' ? 1 : 0;

        await db.query(
            `INSERT INTO sessions (annee_univ, semestre, type_session, verrouille)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE type_session = VALUES(type_session), verrouille = VALUES(verrouille)`,
            [annee, semestre, type_session, verrouille]
        );

        res.json({ message: `Session ${semestre} basculée en ${type_session}.`, type_session, verrouille });
    } catch (err) {
        console.error("Erreur setSessionActive:", err);
        res.status(500).json({ message: "Erreur mise à jour session." });
    }
};


// ============================================================
// Délibération : bilan annuel avec décisions du jury
// ============================================================

const getDeliberation = async (req, res) => {
    try {
        const { niveau, annee_univ } = req.query;
        const annee = annee_univ || '2025-2026';

        if (!niveau) {
            return res.status(400).json({ message: "Le paramètre niveau est obligatoire." });
        }

        // Determine semester pair based on level
        const semestrePairs = { L1: ['S1', 'S2'], L2: ['S3', 'S4'], L3: ['S5', 'S6'] };
        const [sem1, sem2] = semestrePairs[niveau] || ['S1', 'S2'];

        // Helper: compute one semester's bilan for all students
        async function computeSemestre(semestre) {
            const [ues] = await db.query(
                `SELECT ue.id_ue, ue.code_ue, ue.titre, ue.coefficient AS ue_coef, ue.credits,
                        m.id_module, m.nom_module, m.code_module, m.coefficient, m.credits AS mod_credits,
                        m.poids_exam, m.poids_td, m.poids_tp
                 FROM unites_enseignement ue
                 JOIN modules m ON m.id_ue = ue.id_ue
                 JOIN formations f ON ue.id_formation = f.id_formation
                 WHERE ue.semestre = ? AND f.niveau = ?
                 ORDER BY ue.code_ue, m.nom_module`,
                [semestre, niveau.replace('L', '')]
            );

            if (ues.length === 0) return { ueStructure: [], bilans: {} };

            // Build UE structure
            const ueMap = new Map();
            for (const row of ues) {
                if (!ueMap.has(row.id_ue)) {
                    ueMap.set(row.id_ue, {
                        id_ue: row.id_ue, code_ue: row.code_ue, titre: row.titre,
                        coefficient: parseFloat(row.ue_coef), credits_total: parseInt(row.credits),
                        modules: []
                    });
                }
                ueMap.get(row.id_ue).modules.push({
                    id_module: row.id_module, nom_module: row.nom_module,
                    coefficient: parseFloat(row.coefficient), credits: parseInt(row.mod_credits),
                    poids_exam: parseFloat(row.poids_exam), poids_td: parseFloat(row.poids_td),
                    poids_tp: parseFloat(row.poids_tp)
                });
            }
            const ueStructure = Array.from(ueMap.values());
            const moduleIds = [...new Set(ues.map(u => u.id_module))];

            // Get all students for this level
            const [etudiants] = await db.query(
                `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, g.libelle AS nom_groupe
                 FROM etudiants e
                 JOIN groupes g ON e.id_groupe = g.id_groupe
                 WHERE g.niveau = ?
                 ORDER BY e.nom, e.prenom`,
                [niveau]
            );

            if (etudiants.length === 0) return { ueStructure, bilans: {}, etudiants: [] };

            const etudiantIds = etudiants.map(e => e.id_etudiant);

            // Get notes
            const [notes] = await db.query(
                `SELECT id_etudiant, id_module, note_td, note_tp, note_ef, note_er,
                        moy1, moy2, moyenne_finale, resultat, session_validation
                 FROM notes WHERE id_module IN (?) AND id_etudiant IN (?)`,
                [moduleIds, etudiantIds]
            );

            const notesIndex = {};
            for (const n of notes) {
                if (!notesIndex[n.id_etudiant]) notesIndex[n.id_etudiant] = {};
                notesIndex[n.id_etudiant][n.id_module] = n;
            }

            // Compute bilan per student
            const bilans = {};
            for (const etu of etudiants) {
                const ueResults = ueStructure.map(ue => {
                    const modulesNotes = ue.modules.map(mod => {
                        const noteRow = notesIndex[etu.id_etudiant]?.[mod.id_module];
                        return {
                            id_module: mod.id_module, nom_module: mod.nom_module,
                            coefficient: mod.coefficient, credits: mod.credits,
                            moyenne_finale: noteRow?.moyenne_finale != null ? parseFloat(noteRow.moyenne_finale) : null,
                            resultat: noteRow?.resultat ?? null,
                            session_validation: noteRow?.session_validation ?? null,
                            moy1: noteRow?.moy1 != null ? parseFloat(noteRow.moy1) : null,
                            moy2: noteRow?.moy2 != null ? parseFloat(noteRow.moy2) : null
                        };
                    });
                    return { ...ue, ...gradeEngine.calculeMoyenneUE(modulesNotes, ue.credits_total) };
                });
                const bilanSem = gradeEngine.calculeBilanSemestre(ueResults);
                bilans[etu.id_etudiant] = bilanSem;
            }

            return { ueStructure, bilans, etudiants };
        }

        // Compute both semesters
        const result1 = await computeSemestre(sem1);
        const result2 = await computeSemestre(sem2);

        // Merge student lists (union)
        const allStudents = new Map();
        for (const e of (result1.etudiants || [])) allStudents.set(e.id_etudiant, e);
        for (const e of (result2.etudiants || [])) allStudents.set(e.id_etudiant, e);

        // Check existing deliberation records
        const [existingDelibs] = await db.query(
            "SELECT * FROM deliberations WHERE annee_univ = ? AND niveau = ?",
            [annee, niveau]
        );
        const delibIndex = {};
        for (const d of existingDelibs) delibIndex[d.id_etudiant] = d;

        // Check if any module was validated in rattrapage (per student)
        const allModuleIds = [
            ...new Set([
                ...(result1.ueStructure || []).flatMap(ue => ue.modules.map(m => m.id_module)),
                ...(result2.ueStructure || []).flatMap(ue => ue.modules.map(m => m.id_module))
            ])
        ];
        let rattrapageIndex = {};
        if (allModuleIds.length > 0 && allStudents.size > 0) {
            const [ratNotes] = await db.query(
                "SELECT id_etudiant FROM notes WHERE id_module IN (?) AND id_etudiant IN (?) AND session_validation = 'RATTRAPAGE'",
                [allModuleIds, [...allStudents.keys()]]
            );
            for (const r of ratNotes) rattrapageIndex[r.id_etudiant] = true;
        }

        // Build final result
        const deliberation = [...allStudents.values()].map(etu => {
            const b1 = result1.bilans?.[etu.id_etudiant] || { moyenne_semestre: null, total_credits: 0, credits_max: 0 };
            const b2 = result2.bilans?.[etu.id_etudiant] || { moyenne_semestre: null, total_credits: 0, credits_max: 0 };
            const annuel = gradeEngine.calculeBilanAnnuel(b1, b2);
            const hasRattrapage = !!rattrapageIndex[etu.id_etudiant];

            // Check if there's an existing deliberation with rachat
            const existingDelib = delibIndex[etu.id_etudiant];
            if (existingDelib && existingDelib.rachat) {
                return {
                    id_etudiant: etu.id_etudiant,
                    matricule: etu.matricule,
                    nom: etu.nom,
                    prenom: etu.prenom,
                    nom_groupe: etu.nom_groupe,
                    moyenne_s1: b1.moyenne_semestre,
                    moyenne_s2: b2.moyenne_semestre,
                    moyenne_annuelle: parseFloat(existingDelib.moyenne_annuelle),
                    moyenne_originale: parseFloat(existingDelib.moyenne_originale),
                    credits_acquis: existingDelib.credits_acquis,
                    credits_max: annuel.credits_max,
                    decision: existingDelib.decision,
                    rachat: 1,
                    seuil_rachat: existingDelib.seuil_rachat ? parseFloat(existingDelib.seuil_rachat) : null,
                    hasRattrapage
                };
            }

            const decision = gradeEngine.calculeDecisionJury(
                annuel.moyenne_annuelle, annuel.credits_acquis, annuel.credits_max, hasRattrapage
            );

            return {
                id_etudiant: etu.id_etudiant,
                matricule: etu.matricule,
                nom: etu.nom,
                prenom: etu.prenom,
                nom_groupe: etu.nom_groupe,
                moyenne_s1: b1.moyenne_semestre,
                moyenne_s2: b2.moyenne_semestre,
                moyenne_annuelle: annuel.moyenne_annuelle,
                moyenne_originale: annuel.moyenne_annuelle,
                credits_acquis: annuel.credits_acquis,
                credits_max: annuel.credits_max,
                decision,
                rachat: 0,
                seuil_rachat: null,
                hasRattrapage
            };
        });

        // Sort by nom
        deliberation.sort((a, b) => a.nom.localeCompare(b.nom));

        res.json({
            niveau, annee_univ: annee,
            semestre_1: sem1, semestre_2: sem2,
            etudiants: deliberation,
            total: deliberation.length,
            stats: {
                admis_normale: deliberation.filter(d => d.decision === 'Admis(e) (session normale)').length,
                admis_rattrapage: deliberation.filter(d => d.decision === 'Admis(e) (session rattrapage)').length,
                admis_rachat: deliberation.filter(d => d.decision === 'Admis(e) (Rachat)').length,
                admis_dettes: deliberation.filter(d => d.decision === 'Admis(e) avec dettes').length,
                ajourne: deliberation.filter(d => d.decision === 'Ajourné(e)').length
            }
        });

    } catch (err) {
        console.error("Erreur getDeliberation:", err);
        res.status(500).json({ message: "Erreur lors du calcul de la délibération." });
    }
};


// ============================================================
// Rachat en masse
// ============================================================
const appliquerRachat = async (req, res) => {
    try {
        const { niveau, annee_univ, seuil_rachat } = req.body;
        const annee = annee_univ || '2025-2026';
        const seuil = parseFloat(seuil_rachat);

        if (!niveau || isNaN(seuil) || seuil >= 10 || seuil < 0) {
            return res.status(400).json({ message: "niveau et seuil_rachat (0-9.99) sont obligatoires." });
        }

        // First, get the full deliberation data by calling internal logic
        // We'll reuse the getDeliberation logic inline
        const semestrePairs = { L1: ['S1', 'S2'], L2: ['S3', 'S4'], L3: ['S5', 'S6'] };
        const [sem1, sem2] = semestrePairs[niveau] || ['S1', 'S2'];

        // Simplified: get all students and their annual averages
        const [etudiants] = await db.query(
            `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom
             FROM etudiants e
             JOIN groupes g ON e.id_groupe = g.id_groupe
             WHERE g.niveau = ?`,
            [niveau]
        );

        if (etudiants.length === 0) {
            return res.json({ message: "Aucun étudiant trouvé.", rachetes: 0 });
        }

        // Compute bilans for both semesters
        async function getModulesBilan(semestre) {
            const [ues] = await db.query(
                `SELECT ue.id_ue, ue.coefficient AS ue_coef, ue.credits,
                        m.id_module, m.coefficient, m.credits AS mod_credits
                 FROM unites_enseignement ue
                 JOIN modules m ON m.id_ue = ue.id_ue
                 JOIN formations f ON ue.id_formation = f.id_formation
                 WHERE ue.semestre = ? AND f.niveau = ?`,
                [semestre, niveau.replace('L', '')]
            );
            return ues;
        }

        const ues1 = await getModulesBilan(sem1);
        const ues2 = await getModulesBilan(sem2);
        const allModIds = [...new Set([...ues1, ...ues2].map(u => u.id_module))];
        const etudiantIds = etudiants.map(e => e.id_etudiant);

        if (allModIds.length === 0) {
            return res.json({ message: "Aucun module trouvé pour ce niveau.", rachetes: 0 });
        }

        const [allNotes] = await db.query(
            "SELECT id_etudiant, id_module, moyenne_finale FROM notes WHERE id_module IN (?) AND id_etudiant IN (?)",
            [allModIds, etudiantIds]
        );

        const notesIdx = {};
        for (const n of allNotes) {
            if (!notesIdx[n.id_etudiant]) notesIdx[n.id_etudiant] = {};
            notesIdx[n.id_etudiant][n.id_module] = n;
        }

        // Build UE structures
        function buildUeStruct(uesRows) {
            const map = new Map();
            for (const r of uesRows) {
                if (!map.has(r.id_ue)) {
                    map.set(r.id_ue, { coefficient: parseFloat(r.ue_coef), credits_total: parseInt(r.credits), modules: [] });
                }
                map.get(r.id_ue).modules.push({ id_module: r.id_module, coefficient: parseFloat(r.coefficient), credits: parseInt(r.mod_credits) });
            }
            return Array.from(map.values());
        }

        const ueStruct1 = buildUeStruct(ues1);
        const ueStruct2 = buildUeStruct(ues2);

        // Compute annual averages
        const candidats = [];
        for (const etu of etudiants) {
            function semBilan(ueStruct) {
                const ueResults = ueStruct.map(ue => {
                    const mods = ue.modules.map(m => ({
                        moyenne_finale: notesIdx[etu.id_etudiant]?.[m.id_module]?.moyenne_finale != null
                            ? parseFloat(notesIdx[etu.id_etudiant][m.id_module].moyenne_finale) : null,
                        coefficient: m.coefficient, credits: m.credits
                    }));
                    return { ...ue, ...gradeEngine.calculeMoyenneUE(mods, ue.credits_total) };
                });
                return gradeEngine.calculeBilanSemestre(ueResults);
            }
            const b1 = semBilan(ueStruct1);
            const b2 = semBilan(ueStruct2);
            const annuel = gradeEngine.calculeBilanAnnuel(b1, b2);
            candidats.push({ ...etu, ...annuel });
        }

        // Apply rachat
        const rachetes = gradeEngine.appliqueRachatBulk(candidats, seuil);

        // Save to deliberations table
        const delibere_par = req.user.id_utilisateur;
        for (const r of rachetes) {
            await db.query(
                `INSERT INTO deliberations
                 (id_etudiant, annee_univ, niveau, semestre_1, semestre_2,
                  moyenne_annuelle, moyenne_originale, credits_acquis, credits_max,
                  seuil_rachat, decision, rachat, delibere_par)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                 ON DUPLICATE KEY UPDATE
                  moyenne_annuelle = VALUES(moyenne_annuelle),
                  moyenne_originale = VALUES(moyenne_originale),
                  credits_acquis = VALUES(credits_acquis),
                  seuil_rachat = VALUES(seuil_rachat),
                  decision = VALUES(decision),
                  rachat = 1,
                  delibere_par = VALUES(delibere_par),
                  date_deliberation = NOW()`,
                [r.id_etudiant, annee, niveau, sem1, sem2,
                 r.moyenne_annuelle, r.moyenne_originale, r.credits_acquis, r.credits_max,
                 r.seuil_rachat, r.decision, delibere_par]
            );
        }

        res.json({
            message: `Rachat appliqué : ${rachetes.length} étudiant(s) racheté(s) avec seuil ${seuil}.`,
            rachetes: rachetes.length,
            seuil_rachat: seuil,
            etudiants: rachetes.map(r => ({
                id_etudiant: r.id_etudiant, matricule: r.matricule,
                nom: r.nom, prenom: r.prenom,
                moyenne_originale: r.moyenne_originale,
                moyenne_annuelle: r.moyenne_annuelle
            }))
        });
    } catch (err) {
        console.error("Erreur appliquerRachat:", err);
        res.status(500).json({ message: "Erreur lors de l'application du rachat." });
    }
};


// ============================================================
// Valider la délibération (sauvegarder les décisions du jury)
// ============================================================
const validerDeliberation = async (req, res) => {
    try {
        const { niveau, annee_univ, etudiants } = req.body;
        const annee = annee_univ || '2025-2026';
        const delibere_par = req.user.id_utilisateur;

        if (!niveau || !etudiants || !Array.isArray(etudiants)) {
            return res.status(400).json({ message: "niveau et etudiants[] sont obligatoires." });
        }

        const semestrePairs = { L1: ['S1', 'S2'], L2: ['S3', 'S4'], L3: ['S5', 'S6'] };
        const [sem1, sem2] = semestrePairs[niveau] || ['S1', 'S2'];

        let saved = 0;
        for (const etu of etudiants) {
            // Skip if already racheted (don't overwrite rachat decisions)
            if (etu.rachat) continue;

            await db.query(
                `INSERT INTO deliberations
                 (id_etudiant, annee_univ, niveau, semestre_1, semestre_2,
                  moyenne_s1, moyenne_s2, moyenne_annuelle, moyenne_originale,
                  credits_acquis, credits_max, decision, rachat, delibere_par)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                 ON DUPLICATE KEY UPDATE
                  moyenne_s1 = VALUES(moyenne_s1), moyenne_s2 = VALUES(moyenne_s2),
                  moyenne_annuelle = VALUES(moyenne_annuelle), moyenne_originale = VALUES(moyenne_originale),
                  credits_acquis = VALUES(credits_acquis), decision = VALUES(decision),
                  delibere_par = VALUES(delibere_par), date_deliberation = NOW()`,
                [etu.id_etudiant, annee, niveau, sem1, sem2,
                 etu.moyenne_s1, etu.moyenne_s2, etu.moyenne_annuelle, etu.moyenne_originale,
                 etu.credits_acquis, etu.credits_max, etu.decision, delibere_par]
            );
            saved++;
        }

        res.json({ message: `Délibération enregistrée : ${saved} décision(s).`, saved });
    } catch (err) {
        console.error("Erreur validerDeliberation:", err);
        res.status(500).json({ message: "Erreur lors de l'enregistrement de la délibération." });
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
    // Bilan semestriel
    getBilanSemestre,
    // Sessions + Délibération
    getSessionActive,
    setSessionActive,
    getDeliberation,
    appliquerRachat,
    validerDeliberation,
    // Helpers pour le frontend
    getModules,
    getGroupes,
    getAffectationsTous,
    getFormations
};

