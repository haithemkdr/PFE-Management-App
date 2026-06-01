/**
 * run_migration_lmd.js — Migre le schéma DB vers l'architecture LMD 3-way
 *
 * Usage : node scripts/run_migration_lmd.js
 *
 * Transformations :
 *   modules   → ajoute code_module, id_ue, id_formation, poids_exam/td/tp, 
 *                étend semestre ENUM à S1-S6, supprime poids_cc/poids_ef/type_eval/note_eliminatoire
 *   notes     → ajoute note_td, note_tp (split de note_cc)
 *   formations       → nouvelle table
 *   unites_enseignement → nouvelle table
 *   affectations → supprime colonne semestre (redondante avec modules.semestre)
 */
const db = require('../config/db');

async function migrate() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Migration LMD — Mise à jour du schéma  ║');
    console.log('╚══════════════════════════════════════════╝\n');

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // ── 1. Créer la table formations ──
        console.log('1/6 — Création de la table formations...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS formations (
                id_formation INT AUTO_INCREMENT PRIMARY KEY,
                code         VARCHAR(50) NOT NULL,
                nom_complet  VARCHAR(200),
                domaine      VARCHAR(100),
                branche      VARCHAR(100),
                cycle        VARCHAR(50)  DEFAULT 'licence',
                niveau       INT          DEFAULT 1,
                annee_debut  VARCHAR(20),
                annee_expiration VARCHAR(20)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('   ✓ Table formations créée');

        // ── 2. Créer la table unites_enseignement ──
        console.log('2/6 — Création de la table unites_enseignement...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS unites_enseignement (
                id_ue        INT AUTO_INCREMENT PRIMARY KEY,
                id_formation INT NOT NULL,
                code_ue      VARCHAR(50) NOT NULL,
                titre        VARCHAR(200),
                semestre     VARCHAR(10),
                coefficient  DECIMAL(3,1) DEFAULT 1.0,
                credits      INT DEFAULT 0,
                credits_origine INT DEFAULT 0,
                FOREIGN KEY (id_formation) REFERENCES formations(id_formation) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('   ✓ Table unites_enseignement créée');

        // ── 3. Modifier la table modules ──
        console.log('3/6 — Modification de la table modules...');

        // 3a. Étendre l'ENUM semestre à S1-S6
        await conn.query(`
            ALTER TABLE modules 
            MODIFY COLUMN semestre ENUM('S1','S2','S3','S4','S5','S6') NOT NULL DEFAULT 'S1'
        `);
        console.log('   ✓ semestre étendu à S1-S6');

        // 3b. Ajouter les nouvelles colonnes (si elles n'existent pas)
        const newModuleCols = [
            { name: 'code_module',  def: "VARCHAR(50) DEFAULT NULL AFTER nom_module" },
            { name: 'id_ue',        def: "INT DEFAULT NULL" },
            { name: 'id_formation', def: "INT DEFAULT NULL" },
            { name: 'poids_exam',   def: "DECIMAL(3,2) DEFAULT 0.60" },
            { name: 'poids_td',     def: "DECIMAL(3,2) DEFAULT 0.20" },
            { name: 'poids_tp',     def: "DECIMAL(3,2) DEFAULT 0.20" },
        ];

        for (const col of newModuleCols) {
            try {
                await conn.query(`ALTER TABLE modules ADD COLUMN ${col.name} ${col.def}`);
                console.log(`   ✓ Colonne modules.${col.name} ajoutée`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`   ⏭  Colonne modules.${col.name} existe déjà`);
                } else throw e;
            }
        }

        // 3c. Ajouter les FK (optionnel, ignore si déjà là)
        try {
            await conn.query(`ALTER TABLE modules ADD FOREIGN KEY (id_ue) REFERENCES unites_enseignement(id_ue) ON DELETE SET NULL`);
            console.log('   ✓ FK modules → unites_enseignement');
        } catch (e) {
            if (e.code === 'ER_FK_DUP_NAME' || e.code === 'ER_DUP_KEY') console.log('   ⏭  FK modules→UE existe déjà');
            else console.log('   ⚠  FK modules→UE:', e.message);
        }
        try {
            await conn.query(`ALTER TABLE modules ADD FOREIGN KEY (id_formation) REFERENCES formations(id_formation) ON DELETE SET NULL`);
            console.log('   ✓ FK modules → formations');
        } catch (e) {
            if (e.code === 'ER_FK_DUP_NAME' || e.code === 'ER_DUP_KEY') console.log('   ⏭  FK modules→formations existe déjà');
            else console.log('   ⚠  FK modules→formations:', e.message);
        }

        // 3d. Supprimer les anciennes colonnes (ignorées si déjà supprimées)
        const oldCols = ['poids_cc', 'poids_ef', 'type_eval', 'note_eliminatoire'];
        for (const col of oldCols) {
            try {
                await conn.query(`ALTER TABLE modules DROP COLUMN ${col}`);
                console.log(`   ✓ Ancienne colonne modules.${col} supprimée`);
            } catch (e) {
                if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`   ⏭  Colonne modules.${col} déjà supprimée`);
                } else throw e;
            }
        }

        // ── 4. Modifier la table notes ──
        console.log('4/6 — Modification de la table notes...');
        const newNoteCols = [
            { name: 'note_td', def: "DECIMAL(4,2) DEFAULT NULL AFTER id_module" },
            { name: 'note_tp', def: "DECIMAL(4,2) DEFAULT NULL AFTER note_td" },
        ];
        for (const col of newNoteCols) {
            try {
                await conn.query(`ALTER TABLE notes ADD COLUMN ${col.name} ${col.def}`);
                console.log(`   ✓ Colonne notes.${col.name} ajoutée`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`   ⏭  Colonne notes.${col.name} existe déjà`);
                } else throw e;
            }
        }

        // Renommer note_cc → note_ef si note_ef n'existe pas déjà séparément
        // note_cc (ancien contrôle continu) → on le garde en tant que note_ef sera séparé
        // En fait dans l'ancien schéma on a note_cc et note_ef séparément.
        // Le nouveau code attend : note_td, note_tp, note_ef, note_er
        // note_cc n'est plus utilisé → on peut la supprimer
        try {
            await conn.query(`ALTER TABLE notes DROP COLUMN note_cc`);
            console.log('   ✓ Ancienne colonne notes.note_cc supprimée');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('   ⏭  Colonne notes.note_cc déjà supprimée');
            } else throw e;
        }

        // ── 5. Modifier la table affectations (supprimer la colonne semestre redondante) ──
        console.log('5/6 — Nettoyage de la table affectations...');
        try {
            await conn.query(`ALTER TABLE affectations DROP COLUMN semestre`);
            console.log('   ✓ Colonne affectations.semestre supprimée (redondante avec modules.semestre)');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('   ⏭  Colonne affectations.semestre déjà supprimée');
            } else throw e;
        }

        // ── 6. Validation ──
        console.log('6/6 — Validation...');
        const [modCols] = await conn.query('DESCRIBE modules');
        const colNames = modCols.map(c => c.Field);
        const required = ['poids_exam', 'poids_td', 'poids_tp', 'code_module', 'id_ue', 'id_formation'];
        const missing = required.filter(c => !colNames.includes(c));
        if (missing.length > 0) {
            throw new Error(`Colonnes manquantes après migration : ${missing.join(', ')}`);
        }

        const [tables] = await conn.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        if (!tableNames.includes('formations') || !tableNames.includes('unites_enseignement')) {
            throw new Error('Tables formations/unites_enseignement non trouvées');
        }

        await conn.commit();

        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║   ✅ Migration LMD terminée avec succès   ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log('\nProchaine étape : node scripts/seed_lmd_curriculum.js');

    } catch (err) {
        await conn.rollback();
        console.error('\n✗ ERREUR — Migration annulée :', err.message);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate().catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
