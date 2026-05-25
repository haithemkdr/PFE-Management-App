const db = require('../config/db');
const gradeEngine = require('../services/gradeEngine');

// Contrôleur des Notes
// Fait par: étudiant L3
// Mis à jour: système 3-way (TD/TP/Exam), gradeEngine centralisé

// ============================================================
// getNotesByGroupe
// Pour TD/TP : récupère les étudiants du groupe spécifique
// Pour CM    : jointure dynamique → tous les étudiants de la section/niveau
// ============================================================
const getNotesByGroupe = async (req, res) => {
    try {
        let id_module = req.query.id_module;
        let id_groupe = req.query.id_groupe;
        let id_affectation = req.query.id_affectation;
        let id_enseignant = req.user.id_utilisateur;

        // Collect ALL affectation types this teacher has for this module
        // A teacher may have CM + TD on the same module — they should edit both
        const [teacherAffs] = await db.query(
            'SELECT type_seance FROM affectations WHERE id_utilisateur = ? AND id_module = ?',
            [id_enseignant, id_module]
        );
        const ownedTypes = new Set(teacherAffs.map(a => a.type_seance));

        // Privacy rule: only expose columns this teacher owns
        // CM teachers can see EF/ER. TD/TP teachers can only see their own column.
        // If a teacher has CM+TD they can see TD+EF+ER.
        const canSeeTD = ownedTypes.has('TD') || ownedTypes.has('CM');
        const canSeeTP = ownedTypes.has('TP') || ownedTypes.has('CM');
        const canSeeEF = ownedTypes.has('CM');
        const canSeeER = ownedTypes.has('CM');

        const maskRow = (r) => ({
            ...r,
            note_td: canSeeTD ? r.note_td : null,
            note_tp: canSeeTP ? r.note_tp : null,
            note_ef: canSeeEF ? r.note_ef : null,
            note_er: canSeeER ? r.note_er : null,
        });

        // Si on a un id_affectation, on détermine le type de séance
        if (id_affectation) {
            let [affRows] = await db.query(
                'SELECT type_seance, section, niveau FROM affectations WHERE id_affectation = ?',
                [id_affectation]
            );

            if (affRows.length > 0 && affRows[0].type_seance === 'CM') {
                // ── CM : jointure dynamique → tous les étudiants de la section ──
                let { section, niveau } = affRows[0];
                let sql = `
                    SELECT e.id_etudiant, e.matricule, e.nom, e.prenom,
                           g.libelle AS nom_groupe,
                           n.id_note, n.note_td, n.note_tp, n.note_ef, n.note_er,
                           n.moy1, n.moy2, n.moyenne_finale, n.resultat
                    FROM etudiants e
                    JOIN groupes g ON e.id_groupe = g.id_groupe
                    LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = ?
                    WHERE g.section = ? AND g.niveau = ?
                    ORDER BY e.nom ASC
                `;
                let [rows] = await db.query(sql, [id_module, section, niveau]);
                return res.json(rows.map(maskRow));
            }
        }

        // ── TD/TP : requête classique par groupe ──
        let sql = `
            SELECT e.id_etudiant, e.matricule, e.nom, e.prenom,
                   n.id_note, n.note_td, n.note_tp, n.note_ef, n.note_er,
                   n.moy1, n.moy2, n.moyenne_finale, n.resultat
            FROM etudiants e
            LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = ?
            WHERE e.id_groupe = ?
            ORDER BY e.nom ASC
        `;
        let [rows] = await db.query(sql, [id_module, id_groupe]);
        res.json(rows.map(maskRow));
    } catch (err) {
        console.log(err);
        res.status(500).send('Erreur dans le getNotesByGroupe');
    }
};

// ============================================================
// upsertNote
// Contrôle d'accès par colonne selon type_seance :
//   CM  → peut modifier note_ef et note_er uniquement
//   TD  → peut modifier note_td uniquement
//   TP  → peut modifier note_tp uniquement
// Calculs délégués à gradeEngine.calculeNote()
// ============================================================
const upsertNote = async (req, res) => {
    try {
        let id_etudiant = req.body.id_etudiant;
        let id_module = req.body.id_module;
        let id_groupe = req.body.id_groupe; // peut être NULL pour CM
        let note_td = req.body.note_td;
        let note_tp = req.body.note_tp;
        let note_ef = req.body.note_ef;
        let note_er = req.body.note_er;

        // Id de l'utilisateur connecté pour la traçabilité
        let saisie_par = req.user.id_utilisateur;

        // Vérification des champs obligatoires
        if (id_etudiant == null) {
            return res.status(400).send("Il faut l'id etudiant");
        }
        if (id_module == null) {
            return res.status(400).send("Il faut l'id module");
        }

        // ============================================================
        // CONTRÔLE D'ACCÈS PAR COLONNE (type_seance)
        // On cherche l'affectation de l'enseignant connecté pour ce module
        // ============================================================
        let aff_sql = `
            SELECT id_affectation, type_seance, id_groupe, section, niveau, periode_saisie_ouverte
            FROM affectations
            WHERE id_utilisateur = ? AND id_module = ?
        `;
        let aff_params = [saisie_par, id_module];

        // Si un id_groupe est fourni, on filtre aussi par groupe (TD/TP)
        // Sinon (CM), on cherche l'affectation sans groupe
        if (id_groupe) {
            aff_sql += " AND (id_groupe = ? OR id_groupe IS NULL)";
            aff_params.push(id_groupe);
        }

        let [affRows] = await db.query(aff_sql, aff_params);

        if (affRows.length === 0) {
            return res.status(403).send("Vous n'avez pas d'affectation pour ce module.");
        }

        // Trouver l'affectation la plus pertinente
        let affectation = affRows[0];

        // Vérifier la période de saisie
        if (affectation.periode_saisie_ouverte === 0) {
            return res.status(403).send("La période de saisie des notes est fermée. Contactez l'Agent de scolarité.");
        }

        // ── VERROUILLAGE SESSION RATTRAPAGE ──
        // Si la session est RATTRAPAGE, bloquer la modification des notes CC (TD/TP)
        let [modRows] = await db.query("SELECT semestre FROM modules WHERE id_module = ?", [id_module]);
        if (modRows.length > 0) {
            let [sessRows] = await db.query(
                "SELECT type_session FROM sessions WHERE semestre = ? ORDER BY id_session DESC LIMIT 1",
                [modRows[0].semestre]
            );
            if (sessRows.length > 0 && sessRows[0].type_session === 'RATTRAPAGE') {
                if (note_td != null || note_tp != null) {
                    return res.status(403).json({
                        message: "Session Rattrapage active : les notes CC (TD/TP) sont verrouillées. Seule la note d'examen de rattrapage (ER) peut être saisie."
                    });
                }
            }
        }

        // ── CONTRÔLE D'ACCÈS PAR COLONNE ──
        let type_seance = affectation.type_seance;

        if (type_seance === 'CM') {
            // CM → accès exclusif à note_ef et note_er
            if (note_td != null || note_tp != null) {
                return res.status(403).json({
                    message: "En tant qu'enseignant CM, vous ne pouvez pas modifier les notes TD/TP. Seuls les enseignants TD/TP peuvent le faire."
                });
            }
        } else if (type_seance === 'TD') {
            // TD → accès exclusif à note_td
            if (note_ef != null || note_er != null || note_tp != null) {
                return res.status(403).json({
                    message: "En tant qu'enseignant TD, vous ne pouvez modifier que la note TD."
                });
            }
        } else if (type_seance === 'TP') {
            // TP → accès exclusif à note_tp
            if (note_ef != null || note_er != null || note_td != null) {
                return res.status(403).json({
                    message: "En tant qu'enseignant TP, vous ne pouvez modifier que la note TP."
                });
            }
        }

        // ============================================================
        // Lire les pondérations depuis la table MODULES (3-way)
        // ============================================================
        let [poids_rows] = await db.query(
            "SELECT poids_exam, poids_td, poids_tp FROM modules WHERE id_module = ?",
            [id_module]
        );

        let poids = {
            poids_exam: 0.60,
            poids_td: 0.20,
            poids_tp: 0.20
        };
        if (poids_rows.length > 0) {
            poids.poids_exam = parseFloat(poids_rows[0].poids_exam);
            poids.poids_td   = parseFloat(poids_rows[0].poids_td);
            poids.poids_tp   = parseFloat(poids_rows[0].poids_tp);
        }

        // ── Validation des notes (0-20) via gradeEngine ──
        for (const [val, label] of [[note_td, 'Note TD'], [note_tp, 'Note TP'], [note_ef, 'Note EF'], [note_er, 'Note ER']]) {
            const err = gradeEngine.valideNote(val, label);
            if (err) return res.status(400).send(err);
        }

        // ============================================================
        // MERGE PARTIEL : on ne met à jour que les colonnes autorisées
        // et on préserve les colonnes des autres enseignants
        // ============================================================
        let [lignes] = await db.query(
            "SELECT id_note, note_td, note_tp, note_ef, note_er FROM notes WHERE id_etudiant = ? AND id_module = ?",
            [id_etudiant, id_module]
        );

        let final_td, final_tp, final_ef, final_er;

        if (lignes.length > 0) {
            // La note existe → merge partiel selon le type_seance
            let existing = lignes[0];
            if (type_seance === 'CM') {
                final_td = existing.note_td;
                final_tp = existing.note_tp;
                final_ef = note_ef != null ? note_ef : existing.note_ef;
                final_er = note_er != null ? note_er : existing.note_er;
            } else if (type_seance === 'TD') {
                final_td = note_td != null ? note_td : existing.note_td;
                final_tp = existing.note_tp;
                final_ef = existing.note_ef;
                final_er = existing.note_er;
            } else {
                // TP
                final_td = existing.note_td;
                final_tp = note_tp != null ? note_tp : existing.note_tp;
                final_ef = existing.note_ef;
                final_er = existing.note_er;
            }
        } else {
            // Pas de note existante → insertion directe
            if (type_seance === 'CM') {
                final_td = null;
                final_tp = null;
                final_ef = note_ef;
                final_er = note_er;
            } else if (type_seance === 'TD') {
                final_td = note_td;
                final_tp = null;
                final_ef = null;
                final_er = null;
            } else {
                // TP
                final_td = null;
                final_tp = note_tp;
                final_ef = null;
                final_er = null;
            }
        }

        // ── Calcul via gradeEngine (CENTRALISÉ) ──
        const calcul = gradeEngine.calculeNote(
            { note_td: final_td, note_tp: final_tp, note_ef: final_ef, note_er: final_er },
            poids
        );

        // ── Déterminer session_validation automatiquement ──
        const sessionVal = gradeEngine.calculeSessionValidation(calcul.moy1, calcul.moy2, calcul.moyenne_finale);

        if (lignes.length > 0) {
            // UPDATE
            await db.query(
                `UPDATE notes SET note_td = ?, note_tp = ?, note_ef = ?, note_er = ?,
                 moy1 = ?, moy2 = ?, moyenne_finale = ?, resultat = ?,
                 session_validation = ?, saisie_par = ?, date_saisie = NOW()
                 WHERE id_etudiant = ? AND id_module = ?`,
                [final_td, final_tp, final_ef, final_er,
                 calcul.moy1, calcul.moy2, calcul.moyenne_finale, calcul.resultat,
                 sessionVal, saisie_par, id_etudiant, id_module]
            );
        } else {
            // INSERT
            await db.query(
                `INSERT INTO notes (id_etudiant, id_module, note_td, note_tp, note_ef, note_er,
                 moy1, moy2, moyenne_finale, resultat, session_validation, saisie_par)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id_etudiant, id_module, final_td, final_tp, final_ef, final_er,
                 calcul.moy1, calcul.moy2, calcul.moyenne_finale, calcul.resultat,
                 sessionVal, saisie_par]
            );
        }

        res.json({ message: "La note est bien enregistrée" });

    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur");
    }
};

module.exports = { getNotesByGroupe, upsertNote, getMesAffectations, getBilanEnseignant };

// ============================================================
// getMesAffectations
// Retourne les affectations de l'enseignant connecté
// Inclut type_seance, section, niveau pour adapter l'UI
// LEFT JOIN groupes car CM n'a pas de id_groupe
// ============================================================
async function getMesAffectations(req, res) {
    try {
        let id_enseignant = req.user.id_utilisateur;
        let sql = `
            SELECT a.id_affectation, a.id_module, a.id_groupe, a.periode_saisie_ouverte,
                   a.type_seance, a.section, a.niveau,
                   m.nom_module, m.semestre,
                   g.libelle AS nom_groupe
            FROM affectations a
            JOIN modules m ON a.id_module = m.id_module
            LEFT JOIN groupes g ON a.id_groupe = g.id_groupe
            WHERE a.id_utilisateur = ?
            ORDER BY m.nom_module, g.libelle
        `;
        let result = await db.query(sql, [id_enseignant]);
        res.json(result[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la récupération des affectations");
    }
}

// ============================================================
// getBilanEnseignant
// Bilan semestriel en lecture seule — scoped aux modules + groupes
// de l'enseignant connecté. Requiert ?semestre=S5
// ============================================================
async function getBilanEnseignant(req, res) {
    try {
        const id_enseignant = req.user.id_utilisateur;
        const { semestre } = req.query;

        if (!semestre) {
            return res.status(400).json({ message: "Le paramètre semestre est obligatoire." });
        }

        // 1. Obtenir les affectations de l'enseignant pour ce semestre
        const [affs] = await db.query(
            `SELECT a.id_affectation, a.id_module, a.id_groupe, a.type_seance,
                    a.section, a.niveau, m.nom_module, m.coefficient,
                    m.credits, m.poids_exam, m.poids_td, m.poids_tp,
                    g.libelle AS nom_groupe
             FROM affectations a
             JOIN modules m ON a.id_module = m.id_module
             LEFT JOIN groupes g ON a.id_groupe = g.id_groupe
             WHERE a.id_utilisateur = ? AND m.semestre = ?
             ORDER BY m.nom_module`,
            [id_enseignant, semestre]
        );

        if (affs.length === 0) {
            return res.json({ modules: [], etudiants: [], semestre });
        }

        // 2. Collecter les étudiants concernés par les affectations
        //    CM → tous les étudiants de la section/niveau
        //    TD/TP → étudiants du groupe spécifique
        const etudiantSet = new Map();
        const moduleIds = [...new Set(affs.map(a => a.id_module))];

        for (const aff of affs) {
            let etuSql, etuParams;
            if (aff.type_seance === 'CM') {
                etuSql = `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, g.libelle AS nom_groupe
                          FROM etudiants e
                          JOIN groupes g ON e.id_groupe = g.id_groupe
                          WHERE g.section = ? AND g.niveau = ?`;
                etuParams = [aff.section, aff.niveau];
            } else {
                etuSql = `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, g.libelle AS nom_groupe
                          FROM etudiants e
                          JOIN groupes g ON e.id_groupe = g.id_groupe
                          WHERE e.id_groupe = ?`;
                etuParams = [aff.id_groupe];
            }
            const [rows] = await db.query(etuSql, etuParams);
            for (const r of rows) {
                if (!etudiantSet.has(r.id_etudiant)) etudiantSet.set(r.id_etudiant, r);
            }
        }

        const etudiants = Array.from(etudiantSet.values());
        if (etudiants.length === 0) {
            return res.json({ modules: affs, etudiants: [], semestre });
        }

        // 3. Récupérer les notes pour les modules de l'enseignant
        const etudiantIds = etudiants.map(e => e.id_etudiant);
        const [notes] = await db.query(
            `SELECT id_etudiant, id_module, note_td, note_tp, note_ef, note_er,
                    moy1, moy2, moyenne_finale, resultat
             FROM notes
             WHERE id_module IN (?) AND id_etudiant IN (?)`,
            [moduleIds, etudiantIds]
        );

        // Index des notes
        const notesIndex = {};
        for (const n of notes) {
            if (!notesIndex[n.id_etudiant]) notesIndex[n.id_etudiant] = {};
            notesIndex[n.id_etudiant][n.id_module] = n;
        }

        // 4. Construire le résultat pour chaque étudiant
        const modulesInfo = affs.map(a => ({
            id_module: a.id_module,
            nom_module: a.nom_module,
            coefficient: parseFloat(a.coefficient),
            credits: parseInt(a.credits),
            poids_exam: parseFloat(a.poids_exam),
            poids_td: parseFloat(a.poids_td),
            poids_tp: parseFloat(a.poids_tp),
            type_seance: a.type_seance,
            nom_groupe: a.nom_groupe
        }));

        // Dédupliquer les modules (un enseignant peut avoir CM+TD)
        const uniqueModules = [...new Map(modulesInfo.map(m => [m.id_module, m])).values()];

        const bilanEtudiants = etudiants.map(etu => {
            const modulesNotes = uniqueModules.map(mod => {
                const noteRow = notesIndex[etu.id_etudiant]?.[mod.id_module];
                return {
                    id_module: mod.id_module,
                    nom_module: mod.nom_module,
                    note_td: noteRow?.note_td ?? null,
                    note_tp: noteRow?.note_tp ?? null,
                    note_ef: noteRow?.note_ef ?? null,
                    note_er: noteRow?.note_er ?? null,
                    moyenne_finale: noteRow?.moyenne_finale != null
                        ? parseFloat(noteRow.moyenne_finale) : null,
                    resultat: noteRow?.resultat ?? null
                };
            });
            return {
                id_etudiant: etu.id_etudiant,
                matricule: etu.matricule,
                nom: etu.nom,
                prenom: etu.prenom,
                nom_groupe: etu.nom_groupe,
                modules: modulesNotes
            };
        });

        res.json({
            semestre,
            modules: uniqueModules,
            etudiants: bilanEtudiants
        });
    } catch (err) {
        console.log("Erreur dans getBilanEnseignant:", err);
        res.status(500).json({ message: "Erreur lors du calcul du bilan." });
    }
}
