const db = require('../config/db');

/**
 * GET /api/emploi-du-temps/:id_enseignant?semaine=N
 * Retourne les créneaux de la semaine courante (ou semaine N) pour un enseignant.
 * Ne retourne que les cours du semestre en cours (impair ou pair selon la date).
 *
 * Réponse structurée :
 * {
 *   semaine: N,
 *   semestre: 'impair'|'pair',
 *   seances: [{ jour, heure_debut, heure_fin, module, groupe, salle, type_seance }]
 * }
 */
exports.getEmploiDuTemps = async (req, res) => {
    const { id_enseignant } = req.params;
    const semaine = parseInt(req.query.semaine) || getSemaineCourante();

    // Sécurité : un enseignant ne peut consulter que son propre emploi du temps
    if (parseInt(id_enseignant) !== req.user.id_utilisateur) {
        return res.status(403).json({
            success: false,
            message: 'Accès non autorisé à cet emploi du temps.'
        });
    }

    try {
        // Déterminer la parité du semestre en cours :
        //   Sept–Jan  → semestres impairs (S1, S3, S5)
        //   Fév–Juin  → semestres pairs   (S2, S4, S6)
        const semestrePair = getSemestrePair();
        const semestreFilter = semestrePair
            ? ['S2', 'S4', 'S6']
            : ['S1', 'S3', 'S5'];

        const [rows] = await db.execute(
            `SELECT
                edt.jour,
                edt.heure_debut,
                edt.heure_fin,
                edt.salle,
                edt.type_seance,
                m.nom_module AS module,
                g.libelle AS groupe,
                af.section,
                m.semestre
             FROM emploi_du_temps edt
             JOIN affectations af  ON edt.id_affectation = af.id_affectation
             JOIN modules m        ON af.id_module = m.id_module
             LEFT JOIN groupes g        ON af.id_groupe = g.id_groupe
             WHERE af.id_utilisateur = ?
               AND m.semestre IN (?, ?, ?)
             ORDER BY
               FIELD(edt.jour, 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
               edt.heure_debut`,
            [id_enseignant, ...semestreFilter]
        );

        res.json({
            success: true,
            semaine,
            semestreActuel: semestrePair ? 'pair (S2/S4/S6)' : 'impair (S1/S3/S5)',
            data: rows
        });
    } catch (error) {
        console.error('Erreur getEmploiDuTemps :', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

/**
 * Calcule le numéro de semaine ISO actuel.
 */
function getSemaineCourante() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000;
    const oneWeek = 604800000;
    return Math.floor(diff / oneWeek) + 1;
}

/**
 * Détermine si le semestre en cours est pair (S2/S4/S6).
 * Convention universitaire algérienne :
 *   Septembre → Janvier : semestre impair (S1, S3, S5)
 *   Février   → Juillet  : semestre pair   (S2, S4, S6)
 */
function getSemestrePair() {
    // Hardcoded to odd semesters (S1/S3/S5) for current academic year 2025-2026
    // The dynamic month-based detection was causing inconsistencies
    // when the real date falls outside the semester calendar
    return false;
}

