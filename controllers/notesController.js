const db = require('../config/db');

// Contrôleur des Notes
// Fait par: étudiant L3

const getNotesByGroupe = async (req, res) => {
    try {
        // Je récupère les paramètres depuis la requête (query)
        let id_module = req.query.id_module;
        let id_groupe = req.query.id_groupe;

        // Je fais la requête SQL pour avoir les étudiants et leurs notes
        let sql = "SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, n.id_note, n.note_cc, n.note_ef, n.note_er, n.moyenne_finale, n.resultat FROM etudiants e LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = ? WHERE e.id_groupe = ? ORDER BY e.nom ASC";
        
        let result = await db.query(sql, [id_module, id_groupe]);
        let rows = result[0]; // je prends juste les lignes

        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur dans le getNotesByGroupe");
    }
};

const upsertNote = async (req, res) => {
    try {
        // Je lis ce qui a été envoyé dans le body
        let id_etudiant = req.body.id_etudiant;
        let id_module = req.body.id_module;
        let id_groupe = req.body.id_groupe; // Obligatoire pour vérifier l'affectation
        let note_cc = req.body.note_cc;
        let note_ef = req.body.note_ef;
        let note_er = req.body.note_er;

        // Je récupère l'id de l'utilisateur connecté pour la traçabilité
        let saisie_par = req.user.id_utilisateur;

        // Vérification très simple des champs obligatoires
        if (id_etudiant == null) {
            return res.status(400).send("Il faut l'id etudiant");
        }
        if (id_module == null) {
            return res.status(400).send("Il faut l'id module");
        }
        if (id_groupe == null) {
            return res.status(400).send("Il faut l'id groupe pour vérifier la période");
        }

        // ============================================================
        // PATCH AUDIT: Vérifier si la période de saisie est ouverte
        // On lit periode_saisie_ouverte depuis la table AFFECTATIONS
        // (et non plus depuis notes, car c'est logiquement une propriété
        // de l'affectation enseignant/module/groupe)
        // ============================================================
        let verif_periode_sql = "SELECT periode_saisie_ouverte FROM affectations WHERE id_module = ? AND id_groupe = ?";
        let verif_periode_result = await db.query(verif_periode_sql, [id_module, id_groupe]);
        let affectation_rows = verif_periode_result[0];

        // Si aucune affectation trouvée, on bloque
        if (affectation_rows.length === 0) {
            return res.status(400).send("Aucune affectation trouvée pour ce module et ce groupe.");
        }

        // Si la période est fermée (0), on bloque la modification
        if (affectation_rows[0].periode_saisie_ouverte === 0) {
            return res.status(403).send("La période de saisie des notes est fermée. Contactez l'Agent de scolarité.");
        }

        // ============================================================
        // PATCH AUDIT: Lire les pondérations depuis la table MODULES
        // (et non plus utiliser 0.4 et 0.6 codés en dur)
        // ============================================================
        let poids_sql = "SELECT poids_cc, poids_ef FROM modules WHERE id_module = ?";
        let poids_result = await db.query(poids_sql, [id_module]);
        let poids_rows = poids_result[0];

        // Si le module n'existe pas, on utilise les valeurs par défaut (sécurité)
        let poids_cc = 0.40;
        let poids_ef = 0.60;
        if (poids_rows.length > 0) {
            poids_cc = parseFloat(poids_rows[0].poids_cc);
            poids_ef = parseFloat(poids_rows[0].poids_ef);
        }

        // Vérification basique des notes entre 0 et 20
        if (note_cc != null) {
            if (note_cc < 0) return res.status(400).send("Note CC invalide");
            if (note_cc > 20) return res.status(400).send("Note CC invalide");
        }
        if (note_ef != null) {
            if (note_ef < 0) return res.status(400).send("Note EF invalide");
            if (note_ef > 20) return res.status(400).send("Note EF invalide");
        }
        if (note_er != null) {
            if (note_er < 0) return res.status(400).send("Note ER invalide");
            if (note_er > 20) return res.status(400).send("Note ER invalide");
        }

        // Je vais calculer les moyennes avec les pondérations dynamiques lues depuis la BDD
        let moy1 = null;
        let moy2 = null;
        let moyenne_finale = null;

        // Formule du PV pour la moyenne 1 (session normale)
        if (note_cc != null) {
            if (note_ef != null) {
                moy1 = (note_cc * poids_cc) + (note_ef * poids_ef);
            }
        }

        // Formule du PV pour la moyenne 2 (s'il y a rattrapage)
        if (note_cc != null) {
            if (note_er != null) {
                moy2 = (note_cc * poids_cc) + (note_er * poids_ef);
            }
        }

        // Je cherche la moyenne finale (le max entre moy1 et moy2)
        if (moy1 != null) {
            moyenne_finale = moy1;
            if (moy2 != null) {
                if (moy2 > moy1) {
                    moyenne_finale = moy2;
                }
            }
        }

        // Je détermine le résultat (ADM, RAT, ELI)
        let resultat = null;
        if (moyenne_finale != null) {
            if (moyenne_finale >= 10) {
                resultat = "ADM";
            } else if (moyenne_finale >= 5) {
                resultat = "RAT";
            } else {
                resultat = "ELI";
            }
        }

        // Maintenant je vérifie si la note existe déjà dans la base
        let verif_sql = "SELECT id_note FROM notes WHERE id_etudiant = ? AND id_module = ?";
        let verif_result = await db.query(verif_sql, [id_etudiant, id_module]);
        let lignes = verif_result[0];

        if (lignes.length > 0) {
            // S'il y a déjà une note, je fais un UPDATE
            let update_sql = "UPDATE notes SET note_cc = ?, note_ef = ?, note_er = ?, moy1 = ?, moy2 = ?, moyenne_finale = ?, resultat = ?, saisie_par = ?, date_saisie = NOW() WHERE id_etudiant = ? AND id_module = ?";
            await db.query(update_sql, [note_cc, note_ef, note_er, moy1, moy2, moyenne_finale, resultat, saisie_par, id_etudiant, id_module]);
        } else {
            // Sinon, je fais un INSERT
            let insert_sql = "INSERT INTO notes (id_etudiant, id_module, note_cc, note_ef, note_er, moy1, moy2, moyenne_finale, resultat, saisie_par) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.query(insert_sql, [id_etudiant, id_module, note_cc, note_ef, note_er, moy1, moy2, moyenne_finale, resultat, saisie_par]);
        }

        // Je renvoie la réponse
        res.json({ message: "La note est bien enregistrée" });

    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur");
    }
};

module.exports = { getNotesByGroupe, upsertNote };
