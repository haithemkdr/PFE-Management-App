const db = require('../config/db');
const gradeEngine = require('../services/gradeEngine');

// ============================================================
// Contrôleur du Responsable Matière (Coordonnateur)
// Fonctions réservées au CM désigné comme responsable :
// 1. Modifier les pondérations d'évaluation du module
// 2. Consulter le statut de soumission des groupes TD/TP
// 3. Déverrouiller un groupe pour correction
// 4. Valider les notes finales du module (PV)
// 5. Générer le PV (export CSV)
// ============================================================

// ── Helpers : vérifier que l'enseignant est bien responsable matière ──
async function verifierResponsable(id_utilisateur, id_module) {
    const [rows] = await db.query(
        `SELECT id_affectation FROM affectations 
         WHERE id_utilisateur = ? AND id_module = ? AND est_responsable_matiere = 1`,
        [id_utilisateur, id_module]
    );
    return rows.length > 0;
}

// ============================================================
// 1. updatePoidsCoordonnateur
// Le coordonnateur peut modifier les poids TD/TP/Exam
// Les valeurs pré-programmées par l'agent restent les valeurs par défaut
// ============================================================
const updatePoidsCoordonnateur = async (req, res) => {
    try {
        const id_enseignant = req.user.id_utilisateur;
        const { id_module, poids_td, poids_tp, poids_exam } = req.body;

        if (!id_module) {
            return res.status(400).json({ message: "id_module est obligatoire." });
        }

        // Vérifier autorisation
        const estResp = await verifierResponsable(id_enseignant, id_module);
        if (!estResp) {
            return res.status(403).json({
                message: "Seul le responsable matière (coordonnateur CM) peut modifier les pondérations."
            });
        }

        // Validation : la somme doit faire 1.0
        const td = parseFloat(poids_td);
        const tp = parseFloat(poids_tp);
        const ex = parseFloat(poids_exam);

        if (isNaN(td) || isNaN(tp) || isNaN(ex)) {
            return res.status(400).json({ message: "Les pondérations doivent être des nombres valides." });
        }

        const somme = Math.round((td + tp + ex) * 100);
        if (somme !== 100) {
            return res.status(400).json({
                message: `La somme des pondérations doit être 100% (actuel: ${somme}%).`
            });
        }

        await db.query(
            "UPDATE modules SET poids_td = ?, poids_tp = ?, poids_exam = ? WHERE id_module = ?",
            [td, tp, ex, id_module]
        );

        res.json({ message: "Pondérations mises à jour avec succès.", poids: { poids_td: td, poids_tp: tp, poids_exam: ex } });
    } catch (err) {
        console.log("Erreur dans updatePoidsCoordonnateur:", err);
        res.status(500).json({ message: "Erreur lors de la mise à jour des pondérations." });
    }
};

// ============================================================
// 2. getStatutGroupes
// Voir le statut de soumission de chaque groupe TD/TP pour un module
// ============================================================
const getStatutGroupes = async (req, res) => {
    try {
        const id_enseignant = req.user.id_utilisateur;
        const { id_module } = req.query;

        if (!id_module) {
            return res.status(400).json({ message: "id_module est obligatoire." });
        }

        const estResp = await verifierResponsable(id_enseignant, id_module);
        if (!estResp) {
            return res.status(403).json({
                message: "Seul le responsable matière peut consulter le statut des groupes."
            });
        }

        const [rows] = await db.query(
            `SELECT a.id_affectation, a.type_seance, a.statut_saisie,
                    u.nom, u.prenom, u.email,
                    g.libelle AS nom_groupe,
                    m.nom_module
             FROM affectations a
             JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
             LEFT JOIN groupes g ON a.id_groupe = g.id_groupe
             JOIN modules m ON a.id_module = m.id_module
             WHERE a.id_module = ? AND a.type_seance IN ('TD', 'TP')
             ORDER BY a.type_seance, g.libelle`,
            [id_module]
        );

        res.json(rows);
    } catch (err) {
        console.log("Erreur dans getStatutGroupes:", err);
        res.status(500).json({ message: "Erreur lors de la récupération des statuts." });
    }
};

// ============================================================
// 3. deverrouillerGroupe
// Le coordonnateur peut renvoyer un groupe en mode EN_COURS
// pour permettre à l'enseignant TD/TP de corriger ses notes
// ============================================================
const deverrouillerGroupe = async (req, res) => {
    try {
        const id_enseignant = req.user.id_utilisateur;
        const { id_affectation } = req.body;

        if (!id_affectation) {
            return res.status(400).json({ message: "id_affectation est obligatoire." });
        }

        // Récupérer le module de cette affectation
        const [affRows] = await db.query(
            "SELECT id_module, statut_saisie FROM affectations WHERE id_affectation = ?",
            [id_affectation]
        );
        if (affRows.length === 0) {
            return res.status(404).json({ message: "Affectation introuvable." });
        }

        const estResp = await verifierResponsable(id_enseignant, affRows[0].id_module);
        if (!estResp) {
            return res.status(403).json({
                message: "Seul le responsable matière peut déverrouiller un groupe."
            });
        }

        await db.query(
            "UPDATE affectations SET statut_saisie = 'EN_COURS' WHERE id_affectation = ?",
            [id_affectation]
        );

        res.json({ message: "Groupe déverrouillé — l'enseignant peut à nouveau modifier ses notes." });
    } catch (err) {
        console.log("Erreur dans deverrouillerGroupe:", err);
        res.status(500).json({ message: "Erreur lors du déverrouillage." });
    }
};

// ============================================================
// 4. getMesModulesResponsable
// Retourne les modules dont l'enseignant est responsable matière
// ============================================================
const getMesModulesResponsable = async (req, res) => {
    try {
        const id_enseignant = req.user.id_utilisateur;

        const [rows] = await db.query(
            `SELECT DISTINCT m.id_module, m.nom_module, m.semestre, m.credits, m.coefficient,
                    m.poids_td, m.poids_tp, m.poids_exam, a.niveau
             FROM affectations a
             JOIN modules m ON a.id_module = m.id_module
             WHERE a.id_utilisateur = ? AND a.est_responsable_matiere = 1
             ORDER BY m.semestre, m.nom_module`,
            [id_enseignant]
        );

        res.json(rows);
    } catch (err) {
        console.log("Erreur dans getMesModulesResponsable:", err);
        res.status(500).json({ message: "Erreur lors de la récupération des modules." });
    }
};

// ============================================================
// 5. genererPV
// Génère le PV de notes (format CSV) pour un module
// ============================================================
const genererPV = async (req, res) => {
    try {
        const id_enseignant = req.user.id_utilisateur;
        const { id_module } = req.query;

        if (!id_module) {
            return res.status(400).json({ message: "id_module est obligatoire." });
        }

        const estResp = await verifierResponsable(id_enseignant, id_module);
        if (!estResp) {
            return res.status(403).json({
                message: "Seul le responsable matière peut générer le PV."
            });
        }

        // Récupérer le module info
        const [modRows] = await db.query(
            "SELECT nom_module, semestre, poids_td, poids_tp, poids_exam FROM modules WHERE id_module = ?",
            [id_module]
        );
        if (modRows.length === 0) {
            return res.status(404).json({ message: "Module introuvable." });
        }
        const mod = modRows[0];

        // Récupérer TOUTES les affectations CM pour déterminer les sections/niveaux concernés
        const [cmAffs] = await db.query(
            `SELECT DISTINCT section, niveau FROM affectations 
             WHERE id_module = ? AND type_seance = 'CM'`,
            [id_module]
        );

        if (cmAffs.length === 0) {
            return res.status(404).json({ message: "Aucune affectation CM trouvée pour ce module." });
        }

        // Construire les filtres pour inclure TOUS les étudiants de toutes les sections/niveaux
        const sectionFilters = cmAffs.map(a => `(g.section = '${a.section}' AND g.niveau = '${a.niveau}')`).join(' OR ');

        // Récupérer tous les étudiants de toutes les sections/niveaux concernés
        const [etudiants] = await db.query(
            `SELECT e.matricule, e.nom, e.prenom, g.libelle AS nom_groupe, g.section,
                    n.note_td, n.note_tp, n.note_ef, n.note_er,
                    n.moy1, n.moy2, n.moyenne_finale, n.resultat
             FROM etudiants e
             JOIN groupes g ON e.id_groupe = g.id_groupe
             LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = ?
             WHERE (${sectionFilters})
             ORDER BY g.section, e.nom, e.prenom`,
            [id_module]
        );

        // Construire le CSV
        const sectionsLabel = cmAffs.map(a => `${a.section} (${a.niveau})`).join(', ');
        const BOM = '\uFEFF'; // UTF-8 BOM pour Excel
        let csv = BOM;
        csv += `PV de Notes - ${mod.nom_module} (${mod.semestre})\n`;
        csv += `Pondérations: TD=${(mod.poids_td * 100).toFixed(0)}%, TP=${(mod.poids_tp * 100).toFixed(0)}%, Exam=${(mod.poids_exam * 100).toFixed(0)}%\n`;
        csv += `Sections: ${sectionsLabel}\n\n`;
        csv += `Matricule;Nom;Prénom;Groupe;Section;Note TD;Note TP;Note EF;Note ER;Moy Normale;Moy Rattrapage;Moyenne Finale;Résultat\n`;

        for (const etu of etudiants) {
            csv += [
                etu.matricule || '',
                etu.nom || '',
                etu.prenom || '',
                etu.nom_groupe || '',
                etu.section || '',
                etu.note_td != null ? etu.note_td : '',
                etu.note_tp != null ? etu.note_tp : '',
                etu.note_ef != null ? etu.note_ef : '',
                etu.note_er != null ? etu.note_er : '',
                etu.moy1 != null ? etu.moy1 : '',
                etu.moy2 != null ? etu.moy2 : '',
                etu.moyenne_finale != null ? etu.moyenne_finale : '',
                etu.resultat || ''
            ].join(';') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="PV_${mod.nom_module.replace(/\s+/g, '_')}_${mod.semestre}.csv"`);
        res.send(csv);
    } catch (err) {
        console.log("Erreur dans genererPV:", err);
        res.status(500).json({ message: "Erreur lors de la génération du PV." });
    }
};

module.exports = {
    updatePoidsCoordonnateur,
    getStatutGroupes,
    deverrouillerGroupe,
    getMesModulesResponsable,
    genererPV
};
