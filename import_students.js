/**
 * Script d'importation des étudiants depuis les fichiers JSON vers la base de données.
 * 
 * Mapping des groupes JSON → id_groupe DB:
 * 
 * L1 JSON: section "1", groupe 1-4 → Section 1 (Gr1=22, Gr2=23, Gr3=24, Gr4=25)
 *          section "2", groupe 5-8 → Section 2 (Gr5=26, Gr6=27, Gr7=28, Gr8=29)
 *          (pas de Section 3 dans le JSON L1)
 * 
 * L2 JSON: Section1, Groupe1-3 → Section 1 (Gr1=34, Gr2=35, Gr3=36)
 *          Section1 has Groupe1,2,3 in actual data → maps to Gr1(34), Gr2(35), Gr3(36)
 *          But Gr4(37) and Gr5(38) exist too
 *          Section2, Groupe4-6 → Section 2 (Gr4→Gr6=39, Gr5→Gr7=40, Gr6→Gr8=41)
 *          Section3 → SKIP (per user instructions)
 * 
 * L3 JSON: Section1, Groupe1-2 → Section 1 (Gr1=44, Gr2=45)
 *          Section2, Groupe3-4 → Section 2 (Gr3=46, Gr4=47)
 *          (Gr5=48 exists but may not be used in JSON)
 */

require('dotenv/config');
const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function importStudents() {
    try {
        // Read JSON files
        const l1Data = JSON.parse(fs.readFileSync(path.join(__dirname, 'liste etudiant L1.json'), 'utf8'));
        const l2Data = JSON.parse(fs.readFileSync(path.join(__dirname, 'liste etudiant L2.json'), 'utf8'));
        const l3Data = JSON.parse(fs.readFileSync(path.join(__dirname, 'liste etudiant L3 -.json'), 'utf8'));

        // Get existing groups from DB
        const [groups] = await db.query('SELECT id_groupe, libelle, niveau, section FROM groupes ORDER BY id_groupe');
        console.log('Groupes en base:', groups.length);

        // Build group mapping: niveau + section + groupe_num → id_groupe
        // L1 groups: Gr1-Gr4 = Section 1, Gr5-Gr8 = Section 2, Gr9-Gr12 = Section 3
        // L2 groups: Gr1-Gr5 = Section 1, Gr6-Gr10 = Section 2
        // L3 groups: Gr1-Gr2 = Section 1, Gr3-Gr5 = Section 2
        const groupMap = {};
        for (const g of groups) {
            groupMap[`${g.niveau}_${g.libelle}`] = g.id_groupe;
        }
        console.log('Group map:', groupMap);

        // Delete existing dummy students
        await db.query('DELETE FROM etudiants');
        console.log('Anciens étudiants supprimés.');

        let totalInserted = 0;

        // Helper to extract number from group strings like "Groupe4" or "4"
        const getGroupNum = (str) => {
            const match = String(str).match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };

        // ========== L1 ==========
        const l1Students = l1Data.L1;
        console.log(`\n=== L1: ${l1Students.length} étudiants ===`);
        for (const student of l1Students) {
            const grNum = getGroupNum(student.groupe);
            const dbGroupId = groupMap[`L1_Gr${grNum}`];
            
            if (!dbGroupId) {
                console.warn(`  ⚠ L1: Pas de groupe DB pour groupe=${student.groupe}`);
                continue;
            }

            // Prefix L1 matricules to avoid collision with L2
            const matricule = 'L1' + student.matricule;
            await db.query(
                'INSERT INTO etudiants (matricule, nom, prenom, id_groupe) VALUES (?, ?, ?, ?)',
                [matricule, student.nom, student.prenom, dbGroupId]
            );
            totalInserted++;
        }
        console.log(`  ✅ L1: insérés`);

        // ========== L2 ==========
        const l2Students = l2Data.L2;
        console.log(`\n=== L2: ${l2Students.length} étudiants ===`);
        
        let l2Inserted = 0;
        let l2Skipped = 0;
        for (const student of l2Students) {
            const grNum = getGroupNum(student.groupe);
            const dbGroupId = groupMap[`L2_Gr${grNum}`];
            
            if (!dbGroupId) {
                console.warn(`  ⚠ L2: Pas de mapping pour groupe=${student.groupe} (${student.nom} ${student.prenom})`);
                l2Skipped++;
                continue;
            }

            await db.query(
                'INSERT INTO etudiants (matricule, nom, prenom, id_groupe) VALUES (?, ?, ?, ?)',
                [student.matricule, student.nom, student.prenom, dbGroupId]
            );
            l2Inserted++;
        }
        console.log(`  ✅ L2: ${l2Inserted} étudiants insérés, ${l2Skipped} ignorés`);
        totalInserted += l2Inserted;

        // ========== L3 ==========
        const l3Students = l3Data.L3;
        console.log(`\n=== L3: ${l3Students.length} étudiants ===`);
        
        let l3Inserted = 0;
        for (const student of l3Students) {
            const grNum = getGroupNum(student.groupe);
            const dbGroupId = groupMap[`L3_Gr${grNum}`];
            
            if (!dbGroupId) {
                console.warn(`  ⚠ L3: Pas de mapping pour groupe=${student.groupe} (${student.nom} ${student.prenom})`);
                continue;
            }

            await db.query(
                'INSERT INTO etudiants (matricule, nom, prenom, id_groupe) VALUES (?, ?, ?, ?)',
                [student.matricule, student.nom, student.prenom, dbGroupId]
            );
            l3Inserted++;
        }
        console.log(`  ✅ L3: ${l3Inserted} étudiants insérés`);
        totalInserted += l3Inserted;

        console.log(`\n=== TOTAL: ${totalInserted} étudiants insérés ===`);

        // Verify final counts per group
        const [counts] = await db.query(`
            SELECT g.niveau, g.section, g.libelle, COUNT(e.id_etudiant) as nb
            FROM groupes g 
            LEFT JOIN etudiants e ON g.id_groupe = e.id_groupe
            GROUP BY g.id_groupe 
            ORDER BY g.niveau, g.section, g.id_groupe
        `);
        console.log('\n=== Répartition par groupe ===');
        console.table(counts);

        process.exit(0);
    } catch (err) {
        console.error('Erreur:', err.message);
        process.exit(1);
    }
}

importStudents();
