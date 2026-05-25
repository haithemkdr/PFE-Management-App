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
        // On utilise des sous-requêtes pour calculer le taux d'absence cumulé
        let sql = `
            SELECT 
                e.id_etudiant, e.matricule, e.nom, e.prenom, 
                a.id_absence, a.statut, a.justifiee, n.resultat,
                a.statut as statut_db, a.justifiee as justifiee_db,
                (SELECT COUNT(*) FROM absences abs 
                 JOIN affectations aff2 ON abs.id_affectation = aff2.id_affectation
                 WHERE abs.id_etudiant = e.id_etudiant AND aff2.id_module = ? AND abs.statut = 'Absent') as nb_absences,
                (SELECT COUNT(*) FROM absences abs 
                 JOIN affectations aff3 ON abs.id_affectation = aff3.id_affectation
                 WHERE abs.id_etudiant = e.id_etudiant AND aff3.id_module = ? AND abs.statut = 'Retard') as nb_retards,
                (SELECT COUNT(*) FROM absences abs 
                 JOIN affectations aff4 ON abs.id_affectation = aff4.id_affectation
                 WHERE abs.id_etudiant = e.id_etudiant AND aff4.id_module = ? AND abs.statut = 'Absent' AND abs.justifiee = 0) as nb_absences_non_justifiees,
                (SELECT COUNT(*) FROM absences abs 
                 JOIN affectations aff5 ON abs.id_affectation = aff5.id_affectation
                 WHERE abs.id_etudiant = e.id_etudiant AND aff5.id_module = ? AND abs.statut = 'Retard' AND abs.justifiee = 0) as nb_retards_non_justifiees
            FROM etudiants e 
            LEFT JOIN affectations aff ON e.id_groupe = aff.id_groupe AND aff.id_module = ? 
            LEFT JOIN absences a ON e.id_etudiant = a.id_etudiant AND a.id_affectation = aff.id_affectation AND a.date_seance = ? 
            LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = aff.id_module
            WHERE e.id_groupe = ? ORDER BY e.nom ASC`;
        
        let result = await db.query(sql, [id_module, id_module, id_module, id_module, id_module, date_seance, id_groupe]);
        let rows = result[0];

        // Par défaut tout le monde est présent si la ligne d'absence n'existe pas
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].statut == null) {
                rows[i].statut = 'Présent';
            }
            // Je convertis justifiee en boolean pour le front (0 -> false, 1 -> true)
            rows[i].justifiee = rows[i].justifiee === 1;
            rows[i].justifiee_db = rows[i].justifiee_db === 1;
            
            // Calcul du taux cumulé (1 absence = 1, 1 retard = 0.5)
            rows[i].taux_absence = (rows[i].nb_absences || 0) + ((rows[i].nb_retards || 0) * 0.5);
            rows[i].taux_non_justifie = (rows[i].nb_absences_non_justifiees || 0) + ((rows[i].nb_retards_non_justifiees || 0) * 0.5);
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

        // Vérification de la restriction des 48h
        let seanceDateObj = new Date(date_seance);
        let currentDateObj = new Date();
        let diffHours = (currentDateObj - seanceDateObj) / (1000 * 60 * 60);

        if (diffHours > 48) {
            return res.status(403).send("Délai de 48h dépassé. L'appel pour cette séance ne peut plus être modifié.");
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
            } else {
                // Si l'étudiant n'atteint plus le seuil d'exclusion, on annule l'exclusion s'il était exclu
                let verif_note_sql = "SELECT id_note, resultat FROM notes WHERE id_etudiant = ? AND id_module = ?";
                let verif_note_result = await db.query(verif_note_sql, [id_etudiant, id_module]);
                let note_rows = verif_note_result[0];

                if (note_rows.length > 0 && note_rows[0].resultat === 'EXC') {
                    // On retire l'exclusion. La moyenne finale sera recalculée lors des délibérations.
                    let update_note_sql = "UPDATE notes SET moyenne_finale = NULL, resultat = NULL WHERE id_etudiant = ? AND id_module = ?";
                    await db.query(update_note_sql, [id_etudiant, id_module]);
                }
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

// ============================================================
// getSuiviSeances
// Generates a S1..S14 grid from the real timetable (emploi_du_temps)
// Each session date = the scheduled weekday of the affectation,
// repeated weekly from the semester start for 14 weeks.
// ============================================================

// Map French day names to JS getDay() values (0=Sunday)
const JOUR_MAP = { 'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6 };

// Derive the semester start date from academic year + semestre
// Odd semesters (S1,S3,S5) → ~Sept 14, Even (S2,S4,S6) → ~Feb 8
function getSemestreStartDate(annee_univ, semestre) {
    const [startYear] = (annee_univ || '2025-2026').split('-').map(Number);
    const semNum = parseInt((semestre || 'S1').replace('S', ''));
    // Odd semesters start in September of the first year
    // Even semesters start in February of the second year
    if (semNum % 2 === 1) {
        return new Date(startYear, 8, 14); // Sept 14
    } else {
        return new Date(startYear + 1, 1, 8); // Feb 8
    }
}

// Generate 14 weekly dates starting from semesterStart on the given weekday
function generateSessionDates(semesterStart, targetDay, count = 14) {
    const dates = [];
    // Find the first occurrence of targetDay on or after semesterStart
    const d = new Date(semesterStart);
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    d.setDate(d.getDate() + diff);

    for (let i = 0; i < count; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 7);
    }
    return dates;
}

const getSuiviSeances = async (req, res) => {
    try {
        const { id_module, id_groupe } = req.params;

        // 1. Find the affectation(s) for this module/groupe
        const [affs] = await db.query(
            `SELECT a.id_affectation, a.type_seance, m.semestre, m.nom_module
             FROM affectations a
             JOIN modules m ON a.id_module = m.id_module
             WHERE a.id_module = ? AND (a.id_groupe = ? OR (a.id_groupe IS NULL AND a.type_seance = 'CM'))
             LIMIT 5`,
            [id_module, id_groupe]
        );

        if (affs.length === 0) {
            return res.json({ seances: [], etudiants: [], stats: { total_seances: 0 } });
        }

        // Use the specific groupe's affectation if available, else fall back to CM
        const affIds = affs.map(a => a.id_affectation);
        const semestre = affs[0].semestre;

        // 2. Get the EDT schedule for these affectations
        const [edtRows] = await db.query(
            `SELECT e.id_affectation, e.jour, e.heure_debut, e.heure_fin, e.salle, e.type_seance
             FROM emploi_du_temps e
             WHERE e.id_affectation IN (?)`,
            [affIds]
        );

        if (edtRows.length === 0) {
            return res.json({ seances: [], etudiants: [], stats: { total_seances: 0 }, message: 'Aucun créneau EDT trouvé' });
        }

        // Get the academic year
        const [sessRows] = await db.query(
            `SELECT annee_univ FROM sessions WHERE semestre = ? LIMIT 1`,
            [semestre]
        );
        const annee_univ = sessRows.length > 0 ? sessRows[0].annee_univ : '2025-2026';
        const semStart = getSemestreStartDate(annee_univ, semestre);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // 3. Generate session dates from the first EDT entry (primary scheduled day)
        // If multiple days exist, use the one matching the groupe affectation
        const primaryEdt = edtRows.find(e => String(e.id_affectation) === String(affs.find(a => a.id_groupe)?.id_affectation)) || edtRows[0];
        const targetDay = JOUR_MAP[primaryEdt.jour];

        const sessionDates = generateSessionDates(semStart, targetDay, 14);

        const seanceList = sessionDates.map((d, i) => ({
            date: d.toISOString().split('T')[0],
            label: `S${i + 1}`,
            numero: i + 1,
            jour: primaryEdt.jour,
            heure: `${primaryEdt.heure_debut.substring(0, 5)}–${primaryEdt.heure_fin.substring(0, 5)}`,
            salle: primaryEdt.salle,
            passed: d <= today
        }));

        const seancesDispensees = seanceList.filter(s => s.passed).length;

        // 4. Get students
        const [etudiants] = await db.query(
            `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom
             FROM etudiants e WHERE e.id_groupe = ? ORDER BY e.nom ASC`,
            [id_groupe]
        );

        if (etudiants.length === 0) {
            return res.json({ seances: seanceList, etudiants: [], stats: { total_seances: 14, seances_dispensees: seancesDispensees } });
        }

        // 5. Get all absence records
        const etudiantIds = etudiants.map(e => e.id_etudiant);
        const [absences] = await db.query(
            `SELECT a.id_etudiant, a.date_seance, a.statut, a.justifiee
             FROM absences a
             JOIN affectations aff ON a.id_affectation = aff.id_affectation
             WHERE aff.id_module = ? AND a.id_etudiant IN (?)
             ORDER BY a.date_seance ASC`,
            [id_module, etudiantIds]
        );

        // 6. Get exclusion status
        const [notes] = await db.query(
            `SELECT id_etudiant, resultat FROM notes
             WHERE id_module = ? AND id_etudiant IN (?)`,
            [id_module, etudiantIds]
        );
        const excluMap = {};
        notes.forEach(n => { if (n.resultat === 'EXC') excluMap[n.id_etudiant] = true; });

        // Index absences by etudiant + date
        const absMap = {};
        absences.forEach(a => {
            const key = `${a.id_etudiant}_${new Date(a.date_seance).toISOString().split('T')[0]}`;
            absMap[key] = { statut: a.statut, justifiee: a.justifiee === 1 };
        });

        // 7. Build the matrix
        const result = etudiants.map(etu => {
            let totalAbsences = 0, totalNonJustifiees = 0, totalPresent = 0, totalRetard = 0;

            const presences = seanceList.map(s => {
                if (!s.passed) return { statut: null, justifiee: false }; // future session

                const key = `${etu.id_etudiant}_${s.date}`;
                const record = absMap[key];
                let statut = record ? record.statut : 'Présent';
                let justifiee = record ? record.justifiee : false;

                if (statut === 'Absent') { totalAbsences += 1; if (!justifiee) totalNonJustifiees += 1; }
                else if (statut === 'Retard') { totalRetard += 1; totalAbsences += 0.5; if (!justifiee) totalNonJustifiees += 0.5; }
                else { totalPresent += 1; }

                return { statut, justifiee };
            });

            const tauxPresence = seancesDispensees > 0
                ? ((totalPresent + totalRetard * 0.5) / seancesDispensees * 100).toFixed(1) : '100.0';

            return {
                id_etudiant: etu.id_etudiant, matricule: etu.matricule, nom: etu.nom, prenom: etu.prenom,
                presences, totalAbsences, totalNonJustifiees, totalPresent, totalRetard,
                tauxPresence: parseFloat(tauxPresence),
                exclu: !!excluMap[etu.id_etudiant],
                seuilExclusion: totalNonJustifiees >= 3 || totalAbsences >= 5
            };
        });

        res.json({
            seances: seanceList,
            etudiants: result,
            edt: { jour: primaryEdt.jour, heure_debut: primaryEdt.heure_debut, heure_fin: primaryEdt.heure_fin, salle: primaryEdt.salle },
            stats: {
                total_seances: 14,
                seances_dispensees: seancesDispensees,
                seances_restantes: 14 - seancesDispensees,
                total_etudiants: etudiants.length,
                total_exclus: Object.keys(excluMap).length
            }
        });
    } catch (err) {
        console.log('Erreur getSuiviSeances:', err);
        res.status(500).send("Erreur lors de la récupération du suivi");
    }
};

// ============================================================
// getEdtDates — Returns valid session dates from the timetable
// Used by the Fiche d'appel tab to populate a date selector
// ============================================================
const getEdtDates = async (req, res) => {
    try {
        const { id_module, id_groupe } = req.params;

        // Find affectation(s)
        const [affs] = await db.query(
            `SELECT a.id_affectation, a.type_seance, m.semestre
             FROM affectations a
             JOIN modules m ON a.id_module = m.id_module
             WHERE a.id_module = ? AND (a.id_groupe = ? OR (a.id_groupe IS NULL AND a.type_seance = 'CM'))
             LIMIT 5`,
            [id_module, id_groupe]
        );

        if (affs.length === 0) return res.json({ dates: [], edt: null });

        const affIds = affs.map(a => a.id_affectation);
        const semestre = affs[0].semestre;

        // Get EDT
        const [edtRows] = await db.query(
            `SELECT e.jour, e.heure_debut, e.heure_fin, e.salle, e.type_seance, e.id_affectation
             FROM emploi_du_temps e WHERE e.id_affectation IN (?)`,
            [affIds]
        );

        if (edtRows.length === 0) return res.json({ dates: [], edt: null });

        // Get semester start
        const [sessRows] = await db.query(
            `SELECT annee_univ FROM sessions WHERE semestre = ? LIMIT 1`, [semestre]
        );
        const annee_univ = sessRows.length > 0 ? sessRows[0].annee_univ : '2025-2026';
        const semStart = getSemestreStartDate(annee_univ, semestre);

        const primaryEdt = edtRows.find(e => String(e.id_affectation) === String(affs.find(a => a.id_groupe)?.id_affectation)) || edtRows[0];
        const targetDay = JOUR_MAP[primaryEdt.jour];
        const sessionDates = generateSessionDates(semStart, targetDay, 14);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const dates = sessionDates.map((d, i) => ({
            date: d.toISOString().split('T')[0],
            label: `S${i + 1}`,
            numero: i + 1,
            passed: d <= today
        }));

        res.json({
            dates,
            edt: {
                jour: primaryEdt.jour,
                heure_debut: primaryEdt.heure_debut,
                heure_fin: primaryEdt.heure_fin,
                salle: primaryEdt.salle
            }
        });
    } catch (err) {
        console.log('Erreur getEdtDates:', err);
        res.status(500).send("Erreur lors de la récupération des dates EDT");
    }
};

module.exports = { getListeAppel, enregistrerAbsence, enregistrerSeance, getSuiviSeances, getEdtDates };
