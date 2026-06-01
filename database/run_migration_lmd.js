/**
 * run_migration_lmd.js — Exécute la migration LMD sur la base pfe_app
 * Usage : node database/run_migration_lmd.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Migration LMD — Schéma dynamique       ║');
    console.log('╚══════════════════════════════════════════╝\n');

    const sqlFile = path.join(__dirname, 'migration_lmd_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split par point-virgule et filtrer les lignes vides / commentaires seuls
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let success = 0;
    let errors = 0;

    for (const stmt of statements) {
        try {
            await db.query(stmt);
            // Extraire la première ligne significative pour le log
            const firstLine = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--')) || stmt.substring(0, 60);
            console.log(`  ✓ ${firstLine.trim().substring(0, 80)}`);
            success++;
        } catch (err) {
            // Ignorer les erreurs "column already exists" ou "table already exists"
            if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log(`  ⊘ Déjà appliqué : ${stmt.substring(0, 60).trim()}...`);
            } else if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log(`  ⊘ Colonne déjà supprimée : ${stmt.substring(0, 60).trim()}...`);
            } else {
                console.error(`  ✗ ERREUR : ${err.message}`);
                console.error(`    SQL : ${stmt.substring(0, 100)}...`);
                errors++;
            }
        }
    }

    console.log(`\n═══ Résultat : ${success} succès, ${errors} erreur(s) ═══`);

    if (errors > 0) {
        console.log('\n⚠  Des erreurs se sont produites. Vérifiez la base de données.');
    } else {
        console.log('\n✓  Migration LMD terminée avec succès !');
    }

    process.exit(errors > 0 ? 1 : 0);
}

runMigration().catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
