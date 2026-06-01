/**
 * Script de vérification de l'intégrité des données
 * ================================================
 * Vérifie qu'aucune donnée orpheline n'existe dans la base.
 * - Notes sans étudiant ou sans module valide
 * - Étudiants sans groupe
 * - Absences orphelines
 * 
 * Usage : node scripts/check-data-integrity.js
 */

require('dotenv').config();
const pool = require('../config/db');

async function checkIntegrity() {
    console.log('🔍 Vérification de l\'intégrité des données...\n');
    let issues = 0;

    try {
        // 1. Notes orphelines (étudiant inexistant)
        const [orphanNotesEtudiant] = await pool.query(`
            SELECT n.id_note, n.id_etudiant 
            FROM notes n 
            LEFT JOIN etudiants e ON n.id_etudiant = e.id_etudiant 
            WHERE e.id_etudiant IS NULL
        `);
        if (orphanNotesEtudiant.length > 0) {
            console.log(`❌ ${orphanNotesEtudiant.length} note(s) orpheline(s) — étudiant inexistant`);
            issues += orphanNotesEtudiant.length;
        } else {
            console.log('✅ Aucune note orpheline (étudiants)');
        }

        // 2. Notes orphelines (module inexistant)
        const [orphanNotesModule] = await pool.query(`
            SELECT n.id_note, n.id_module 
            FROM notes n 
            LEFT JOIN modules m ON n.id_module = m.id_module 
            WHERE m.id_module IS NULL
        `);
        if (orphanNotesModule.length > 0) {
            console.log(`❌ ${orphanNotesModule.length} note(s) orpheline(s) — module inexistant`);
            issues += orphanNotesModule.length;
        } else {
            console.log('✅ Aucune note orpheline (modules)');
        }

        // 3. Étudiants sans groupe
        const [etudiantsSansGroupe] = await pool.query(`
            SELECT id_etudiant, nom, prenom 
            FROM etudiants 
            WHERE id_groupe IS NULL
        `);
        if (etudiantsSansGroupe.length > 0) {
            console.log(`⚠️  ${etudiantsSansGroupe.length} étudiant(s) sans groupe assigné`);
            issues += etudiantsSansGroupe.length;
        } else {
            console.log('✅ Tous les étudiants ont un groupe');
        }

        // 4. Absences orphelines (étudiant inexistant)
        const [orphanAbsences] = await pool.query(`
            SELECT a.id_absence, a.id_etudiant 
            FROM absences a 
            LEFT JOIN etudiants e ON a.id_etudiant = e.id_etudiant 
            WHERE e.id_etudiant IS NULL
        `);
        if (orphanAbsences.length > 0) {
            console.log(`❌ ${orphanAbsences.length} absence(s) orpheline(s) — étudiant inexistant`);
            issues += orphanAbsences.length;
        } else {
            console.log('✅ Aucune absence orpheline');
        }

        // 5. Affectations orphelines (enseignant inexistant)
        const [orphanAffectEns] = await pool.query(`
            SELECT af.id_affectation, af.id_utilisateur 
            FROM affectations af 
            LEFT JOIN utilisateurs u ON af.id_utilisateur = u.id_utilisateur 
            WHERE u.id_utilisateur IS NULL
        `);
        if (orphanAffectEns.length > 0) {
            console.log(`❌ ${orphanAffectEns.length} affectation(s) orpheline(s) — enseignant inexistant`);
            issues += orphanAffectEns.length;
        } else {
            console.log('✅ Aucune affectation orpheline (enseignants)');
        }

        // 6. Affectations orphelines (module inexistant)
        const [orphanAffectMod] = await pool.query(`
            SELECT af.id_affectation, af.id_module 
            FROM affectations af 
            LEFT JOIN modules m ON af.id_module = m.id_module 
            WHERE m.id_module IS NULL
        `);
        if (orphanAffectMod.length > 0) {
            console.log(`❌ ${orphanAffectMod.length} affectation(s) orpheline(s) — module inexistant`);
            issues += orphanAffectMod.length;
        } else {
            console.log('✅ Aucune affectation orpheline (modules)');
        }

        // 7. Modules avec poids invalides
        const [poidsInvalides] = await pool.query(`
            SELECT id_module, nom_module, poids_cc, poids_ef 
            FROM modules 
            WHERE ABS((poids_cc + poids_ef) - 1.00) > 0.01
        `);
        if (poidsInvalides.length > 0) {
            console.log(`⚠️  ${poidsInvalides.length} module(s) avec poids CC+EF ≠ 1.00`);
            poidsInvalides.forEach(m => {
                console.log(`   → ${m.nom_module}: CC=${m.poids_cc} + EF=${m.poids_ef} = ${(parseFloat(m.poids_cc) + parseFloat(m.poids_ef)).toFixed(2)}`);
            });
            issues += poidsInvalides.length;
        } else {
            console.log('✅ Tous les modules ont des poids CC+EF = 1.00');
        }

        // Résumé
        console.log('\n' + '='.repeat(50));
        if (issues === 0) {
            console.log('🎉 Intégrité parfaite — Aucun problème détecté !');
        } else {
            console.log(`⚠️  ${issues} problème(s) détecté(s). Vérification manuelle requise.`);
        }

    } catch (err) {
        console.error('💥 Erreur lors de la vérification :', err.message);
    } finally {
        process.exit(0);
    }
}

checkIntegrity();
