/**
 * seed_lmd_curriculum.js — Peuple la DB depuis les fichiers JSON LMD
 * 
 * Usage : node scripts/seed_lmd_curriculum.js
 * 
 * IMPORTANT : Ce script est conçu pour être exécuté UNE SEULE FOIS
 * après la migration SQL (run_migration_lmd.js).
 * Il nettoie les anciennes données démo et insère le curriculum complet.
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// ── Fichiers JSON sources ──
const JSON_FILES = [
    { file: 'L1Info2025.json', code: 'L1Info' },
    { file: 'L2Info.json',     code: 'L2Info' },
    { file: 'L3SI.json',       code: 'L3SI'   }
];

// ── Mapping LMD : chaque niveau a ses propres semestres ──
// Sécurité : on force le bon nom de semestre en se basant sur le level,
// même si le JSON contient un nom incorrect (ex: L1 avec "S3")
const LEVEL_SEMESTERS = {
    1: { semestre1: 'S1', semestre2: 'S2' },
    2: { semestre1: 'S3', semestre2: 'S4' },
    3: { semestre1: 'S5', semestre2: 'S6' }
};

async function seed() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Seed LMD — Chargement du curriculum    ║');
    console.log('╚══════════════════════════════════════════╝\n');

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // ── Étape 0 : Nettoyer les données démo ──
        console.log('🗑  Nettoyage des données démo existantes...');
        await conn.query('DELETE FROM notes');
        await conn.query('DELETE FROM absences');
        await conn.query('DELETE FROM supports_cours');
        await conn.query('DELETE FROM emploi_du_temps');
        await conn.query('DELETE FROM affectations');
        await conn.query('DELETE FROM etudiants');
        await conn.query('DELETE FROM groupes');
        await conn.query('DELETE FROM modules');
        await conn.query('DELETE FROM unites_enseignement');
        await conn.query('DELETE FROM formations');
        console.log('   ✓ Tables nettoyées\n');

        let totalFormations = 0;
        let totalUEs = 0;
        let totalModules = 0;

        // ── Étape 1 : Parser chaque JSON et insérer ──
        for (const { file, code } of JSON_FILES) {
            const filePath = path.join(__dirname, '..', file);
            if (!fs.existsSync(filePath)) {
                console.log(`  ⚠  Fichier introuvable : ${file} — ignoré`);
                continue;
            }

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const level = parseInt(data.level) || 1;
            console.log(`📄 Traitement de ${file} (${data.name}, niveau L${level})...`);

            // ── Insérer la formation ──
            const [formResult] = await conn.query(
                `INSERT INTO formations (code, nom_complet, domaine, branche, cycle, niveau, annee_debut, annee_expiration)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.name,
                    data.fullname || data.name,
                    data.domain || null,
                    data.branch || null,
                    data.cycle || 'licence',
                    level,
                    data.startdate || null,
                    data.expired || null
                ]
            );
            const id_formation = formResult.insertId;
            totalFormations++;
            console.log(`   ✓ Formation "${data.name}" (id=${id_formation})`);

            // ── Mapping des semestres pour ce niveau ──
            const levelSems = LEVEL_SEMESTERS[level] || LEVEL_SEMESTERS[1];

            // ── Traiter les deux semestres ──
            const semestres = [
                { key: 'semestre1', data: data.semestre1, correctName: levelSems.semestre1 },
                { key: 'semestre2', data: data.semestre2, correctName: levelSems.semestre2 }
            ];

            for (const sem of semestres) {
                if (!sem.data || !sem.data.unites) continue;

                // Forcer le nom correct basé sur le niveau, pas sur le JSON
                const semName = sem.correctName;
                const jsonName = sem.data.name;
                if (jsonName !== semName) {
                    console.log(`   ⚠  JSON dit "${jsonName}" mais le niveau L${level} impose "${semName}" — corrigé`);
                }
                console.log(`   📂 Semestre ${semName} (${sem.data.unites.length} UEs)`);

                for (const ue of sem.data.unites) {
                    // ── Insérer l'UE ──
                    const [ueResult] = await conn.query(
                        `INSERT INTO unites_enseignement (id_formation, code_ue, titre, semestre, coefficient, credits, credits_origine)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id_formation,
                            ue.name,
                            ue.title || ue.name,
                            semName,
                            parseFloat(ue.coef) || 1,
                            parseInt(ue.credit) || 0,
                            parseInt(ue.credits_origine) || 0
                        ]
                    );
                    const id_ue = ueResult.insertId;
                    totalUEs++;

                    // ── Insérer les modules de cette UE ──
                    if (ue.modules && Array.isArray(ue.modules)) {
                        for (const mod of ue.modules) {
                            const poids_exam = parseFloat(mod.poids_exam) || 0.60;
                            const poids_td   = parseFloat(mod.poids_td)   || 0.20;
                            const poids_tp   = parseFloat(mod.poids_tp)   || 0.00;

                            await conn.query(
                                `INSERT INTO modules (nom_module, code_module, coefficient, semestre, credits, id_ue, id_formation, poids_exam, poids_td, poids_tp)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    mod.title || mod.name,
                                    mod.name,
                                    parseFloat(mod.coef) || 1,
                                    semName,
                                    parseInt(mod.credit) || 0,
                                    id_ue,
                                    id_formation,
                                    poids_exam,
                                    poids_td,
                                    poids_tp
                                ]
                            );
                            totalModules++;
                        }
                    }

                    console.log(`      ✓ UE "${ue.title || ue.name}" → ${ue.modules?.length || 0} modules`);
                }
            }
            console.log('');
        }

        // ── Étape 2 : Créer les groupes de démo ──
        // L1 = 3 sections, L2 = 2 sections, L3 = 2 sections
        console.log('👥 Création des groupes de démonstration...');
        const groupes = [
            // L1 — Section 1
            { libelle: 'G1-L1', niveau: 'L1', section: 'Section 1' },
            { libelle: 'G2-L1', niveau: 'L1', section: 'Section 1' },
            // L1 — Section 2
            { libelle: 'G3-L1', niveau: 'L1', section: 'Section 2' },
            { libelle: 'G4-L1', niveau: 'L1', section: 'Section 2' },
            // L1 — Section 3
            { libelle: 'G5-L1', niveau: 'L1', section: 'Section 3' },
            { libelle: 'G6-L1', niveau: 'L1', section: 'Section 3' },
            // L2 — Section 1
            { libelle: 'G1-L2', niveau: 'L2', section: 'Section 1' },
            { libelle: 'G2-L2', niveau: 'L2', section: 'Section 1' },
            // L2 — Section 2
            { libelle: 'G3-L2', niveau: 'L2', section: 'Section 2' },
            { libelle: 'G4-L2', niveau: 'L2', section: 'Section 2' },
            // L3 — Section 1
            { libelle: 'G1-L3', niveau: 'L3', section: 'Section 1' },
            { libelle: 'G2-L3', niveau: 'L3', section: 'Section 1' },
            // L3 — Section 2
            { libelle: 'G3-L3', niveau: 'L3', section: 'Section 2' },
            { libelle: 'G4-L3', niveau: 'L3', section: 'Section 2' },
        ];

        const groupeIds = {};
        for (const g of groupes) {
            const [res] = await conn.query(
                'INSERT INTO groupes (libelle, niveau, section) VALUES (?, ?, ?)',
                [g.libelle, g.niveau, g.section]
            );
            groupeIds[`${g.niveau}_${g.libelle}`] = res.insertId;
        }
        console.log(`   ✓ ${groupes.length} groupes créés\n`);

        // ── Étape 3 : Créer les étudiants de démo ──
        console.log('🎓 Création des étudiants de démonstration...');
        const etudiants = [
            // L1 — Section 1 : G1-L1, G2-L1
            { matricule: '202500001', nom: 'Boudiaf',  prenom: 'Yacine',  groupe: 'L1_G1-L1' },
            { matricule: '202500002', nom: 'Mebarki',  prenom: 'Sara',    groupe: 'L1_G1-L1' },
            { matricule: '202500003', nom: 'Hamidi',   prenom: 'Karim',   groupe: 'L1_G1-L1' },
            { matricule: '202500004', nom: 'Ziani',    prenom: 'Fatima',  groupe: 'L1_G2-L1' },
            { matricule: '202500005', nom: 'Boudaoud', prenom: 'Amine',   groupe: 'L1_G2-L1' },
            // L1 — Section 2 : G3-L1, G4-L1
            { matricule: '202500006', nom: 'Rahmani',  prenom: 'Nabil',   groupe: 'L1_G3-L1' },
            { matricule: '202500007', nom: 'Kaci',     prenom: 'Lina',    groupe: 'L1_G3-L1' },
            { matricule: '202500008', nom: 'Zerrouki', prenom: 'Abdelkrim', groupe: 'L1_G4-L1' },
            { matricule: '202500009', nom: 'Djellouli',prenom: 'Samia',   groupe: 'L1_G4-L1' },
            // L1 — Section 3 : G5-L1, G6-L1
            { matricule: '202500010', nom: 'Bellil',   prenom: 'Mourad',  groupe: 'L1_G5-L1' },
            { matricule: '202500011', nom: 'Hadj',     prenom: 'Ikram',   groupe: 'L1_G5-L1' },
            { matricule: '202500012', nom: 'Sahraoui', prenom: 'Walid',   groupe: 'L1_G6-L1' },
            { matricule: '202500013', nom: 'Ouali',    prenom: 'Nour',    groupe: 'L1_G6-L1' },
            // L2 — Section 1 : G1-L2, G2-L2
            { matricule: '202400001', nom: 'Benali',   prenom: 'Rania',   groupe: 'L2_G1-L2' },
            { matricule: '202400002', nom: 'Khaldi',   prenom: 'Omar',    groupe: 'L2_G1-L2' },
            { matricule: '202400003', nom: 'Saadi',    prenom: 'Meriem',  groupe: 'L2_G1-L2' },
            { matricule: '202400004', nom: 'Ferhat',   prenom: 'Nadir',   groupe: 'L2_G2-L2' },
            { matricule: '202400005', nom: 'Larbi',    prenom: 'Amira',   groupe: 'L2_G2-L2' },
            // L2 — Section 2 : G3-L2, G4-L2
            { matricule: '202400006', nom: 'Brahimi',  prenom: 'Youssef', groupe: 'L2_G3-L2' },
            { matricule: '202400007', nom: 'Guendouz', prenom: 'Asma',    groupe: 'L2_G3-L2' },
            { matricule: '202400008', nom: 'Necib',    prenom: 'Fayçal',  groupe: 'L2_G4-L2' },
            { matricule: '202400009', nom: 'Toumi',    prenom: 'Hayet',   groupe: 'L2_G4-L2' },
            // L3 — Section 1 : G1-L3, G2-L3
            { matricule: '202300001', nom: 'Cherifi',  prenom: 'Nadia',   groupe: 'L3_G1-L3' },
            { matricule: '202300002', nom: 'Mokrani',  prenom: 'Sofiane', groupe: 'L3_G1-L3' },
            { matricule: '202300003', nom: 'Taleb',    prenom: 'Leila',   groupe: 'L3_G1-L3' },
            { matricule: '202300004', nom: 'Djebbar',  prenom: 'Mehdi',   groupe: 'L3_G2-L3' },
            { matricule: '202300005', nom: 'Hafsi',    prenom: 'Yasmine', groupe: 'L3_G2-L3' },
            // L3 — Section 2 : G3-L3, G4-L3
            { matricule: '202300006', nom: 'Medjdoub', prenom: 'Amine',   groupe: 'L3_G3-L3' },
            { matricule: '202300007', nom: 'Benabdi',  prenom: 'Kenza',   groupe: 'L3_G3-L3' },
            { matricule: '202300008', nom: 'Lakhdari', prenom: 'Bilal',   groupe: 'L3_G4-L3' },
            { matricule: '202300009', nom: 'Amrani',   prenom: 'Sabrina', groupe: 'L3_G4-L3' },
        ];

        for (const etu of etudiants) {
            await conn.query(
                'INSERT INTO etudiants (matricule, nom, prenom, id_groupe) VALUES (?, ?, ?, ?)',
                [etu.matricule, etu.nom, etu.prenom, groupeIds[etu.groupe]]
            );
        }
        console.log(`   ✓ ${etudiants.length} étudiants créés\n`);

        // ── Étape 4 : Créer des affectations de démo ──
        // On affecte l'enseignant Benali (id=2) à quelques modules L3
        console.log('📋 Création des affectations de démonstration...');
        // Trouver les premiers modules L3
        const [l3Modules] = await conn.query(
            "SELECT id_module, nom_module, semestre FROM modules WHERE id_formation = (SELECT id_formation FROM formations WHERE code = 'L3SI') LIMIT 3"
        );

        if (l3Modules.length > 0) {
            const mod1 = l3Modules[0];
            // CM pour toute la Section 1, niveau L3
            await conn.query(
                "INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau) VALUES (?, ?, NULL, '2025/2026', 'CM', 'Section 1', 'L3')",
                [2, mod1.id_module]
            );
            // TD pour G1
            await conn.query(
                "INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau) VALUES (?, ?, ?, '2025/2026', 'TD', 'Section 1', 'L3')",
                [2, mod1.id_module, groupeIds['L3_G1-L3']]
            );
            // TD pour G2
            await conn.query(
                "INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau) VALUES (?, ?, ?, '2025/2026', 'TD', 'Section 1', 'L3')",
                [2, mod1.id_module, groupeIds['L3_G2-L3']]
            );
            console.log(`   ✓ 3 affectations pour "${mod1.nom_module}" (CM + TD×2)`);
        }

        if (l3Modules.length > 1) {
            const mod2 = l3Modules[1];
            // TP pour G1
            await conn.query(
                "INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau) VALUES (?, ?, ?, '2025/2026', 'TP', 'Section 1', 'L3')",
                [2, mod2.id_module, groupeIds['L3_G1-L3']]
            );
            console.log(`   ✓ 1 affectation pour "${mod2.nom_module}" (TP)`);
        }

        await conn.commit();

        console.log('\n╔══════════════════════════════════════════╗');
        console.log(`║  Seed terminé avec succès !               ║`);
        console.log(`║  • ${totalFormations} formations                        ║`);
        console.log(`║  • ${totalUEs} unités d'enseignement               ║`);
        console.log(`║  • ${totalModules} modules                            ║`);
        console.log(`║  • ${groupes.length} groupes, ${etudiants.length} étudiants              ║`);
        console.log('╚══════════════════════════════════════════╝');

    } catch (err) {
        await conn.rollback();
        console.error('\n✗ ERREUR — Transaction annulée :', err.message);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

seed().catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
