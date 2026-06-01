// ============================================================
// seed_edt_data.js — Seed the full official EDT into the database
// Run: node database/seed_edt_data.js
// ============================================================
const db = require('../config/db');
const edtRaw = require('../edtmetadata.json');

const ANNEE = '2025-2026';
const DEFAULT_HASH = '$2b$10$ij/2B2pQeoh7IuaWl/ylP.QQ2MWJx9XLf8jCXDMoh0HIFh4EbF8AG'; // admin123
const ROLE_ENSEIGNANT = 2;

// ── Module name normalization (EDT name → DB module id) ──
// Will be populated after creating missing modules
const MODULE_NAME_MAP = {};

// Known mappings: normalized_key → existing DB id
const KNOWN_MODULE_IDS = {
  'analyse1':46, 'algebre1':47, 'asd1':48, 'sm1':49,
  'composant':50, 'anglais':51, 'electricite':52,
  'analyse2':53, 'algebre2':54, 'asd2':55, 'sm2':56,
  'logique':57, 'iia':58, 'electronique':59,
  'ao':60, 'asd3':61, 'sif':62, 'thg':63, 'mn':64, 'lm':65,
  'anglais_s3':66, 'thl':67, 'se1':68, 'bd':69, 'reseaux':70,
  'poo':71, 'devweb':72, 'anglais_s4':73,
  'se2':74, 'compilation':75, 'gl':76, 'ihm':77, 'pl':78,
  'proba_s5':79, 'economie':80, 'appmob':81, 'securiteinfo':82,
  'ia':83, 'dss':84, 'projet':85, 'redactionsci':86, 'startup':87
};

// New modules to create (not in DB yet)
const NEW_MODULES = [
  { nom: 'Terminologie', code: 'Term', semestre: 'S1', coeff: 1.0, credits: 1 },
  { nom: 'Anglais 1', code: 'Ang1_S2', semestre: 'S2', coeff: 1.0, credits: 1 },
  { nom: 'Probabilités et Statistiques', code: 'ProbaS2', semestre: 'S2', coeff: 3.0, credits: 4 },
  { nom: 'Outils Mathématiques', code: 'OM', semestre: 'S2', coeff: 2.0, credits: 3 },
  { nom: 'Technologies de l\'Information', code: 'TIC', semestre: 'S2', coeff: 2.0, credits: 2 },
  { nom: 'Physique 2', code: 'Phys2', semestre: 'S2', coeff: 2.0, credits: 3 },
];

// Group definitions per level
const GROUP_DEFS = {
  'L1': { count: 12, sections: { 'Section 1':[1,2,3,4], 'Section 2':[5,6,7,8], 'Section 3':[9,10,11,12] }},
  'L2': { count: 10, sections: { 'Section 1':[1,2,3,4,5], 'Section 2':[6,7,8,9,10] }},
  'L3': { count: 5,  sections: { 'Section 1':[1,2], 'Section 2':[3,4,5] }},
};

// ── Helpers ──

function normalizeModuleName(name, semestre, niveau) {
  const n = name.trim().toLowerCase()
    .replace(/[éèê]/g,'e').replace(/[àâ]/g,'a').replace(/[ùû]/g,'u')
    .replace(/[ôö]/g,'o').replace(/[îï]/g,'i').replace(/[ç]/g,'c');

  // Specific mappings for ambiguous names
  if (/^anglais$/i.test(name)) {
    if (semestre === 'S1') return 'anglais';         // L1 S1 → id 51
    if (semestre === 'S2') return 'anglais_s2';      // L1 S2 → new
    if (semestre === 'S3') return 'anglais_s3';      // L2 S3 → id 66
    if (semestre === 'S4') return 'anglais_s4';      // L2 S4 → id 73
  }
  if (/proba/i.test(name)) {
    if (semestre === 'S5') return 'proba_s5';        // L3 → id 79
    return 'proba_s2';                                // L1 S2 → new
  }
  if (/^analyse\s*1$/i.test(name)) return 'analyse1';
  if (/^analyse\s*2$/i.test(name)) return 'analyse2';
  if (/^algebre\s*1$/i.test(name)) return 'algebre1';
  if (/^algebre\s*2$/i.test(name)) return 'algebre2';
  if (/^asd\s*1$/i.test(name)) return 'asd1';
  if (/^asd\s*2$/i.test(name)) return 'asd2';
  if (/^asd\s*3$/i.test(name)) return 'asd3';
  if (/^sm\s*1$/i.test(name)) return 'sm1';
  if (/^sm\s*2$/i.test(name)) return 'sm2';
  if (/^ao$/i.test(name)) return 'ao';
  if (/^sif$/i.test(name)) return 'sif';
  if (/^th\s*g$/i.test(name)) return 'thg';
  if (/^mn$/i.test(name)) return 'mn';
  if (/^lm$/i.test(name)) return 'lm';
  if (/^thl$/i.test(name)) return 'thl';
  if (/^se\s*1$/i.test(name)) return 'se1';
  if (/^se\s*2$/i.test(name)) return 'se2';
  if (/^bd$/i.test(name)) return 'bd';
  if (/^poo$/i.test(name)) return 'poo';
  if (/^reseaux|réseau/i.test(name)) return 'reseaux';
  if (/^devweb/i.test(name)) return 'devweb';
  if (/^compilation$/i.test(name)) return 'compilation';
  if (/^gl$/i.test(name)) return 'gl';
  if (/^ihm$/i.test(name)) return 'ihm';
  if (/^pl$/i.test(name)) return 'pl';
  if (/^composant/i.test(name)) return 'composant';
  if (/^terminologie/i.test(name)) return 'terminologie';
  if (/^om$/i.test(name)) return 'om';
  if (/^tic$/i.test(name)) return 'tic';
  if (/^physique/i.test(name)) return 'physique2';
  if (/econom|économ/i.test(name)) return 'economie';
  if (/securite|sécurité/i.test(name)) return 'securiteinfo';
  if (/appmob/i.test(name)) return 'appmob';
  if (/^ia$/i.test(name)) return 'ia';
  if (/^dss$/i.test(name)) return 'dss';
  if (/redaction|rédaction/i.test(name)) return 'redactionsci';
  if (/start.?up/i.test(name)) return 'startup';

  return n.replace(/\s+/g, '_');
}

function parseGroupNumber(cible) {
  const m = cible.match(/gr\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function getSectionFromCible(cible) {
  const m = cible.match(/section\s+(\d+)/i);
  return m ? `Section ${m[1]}` : null;
}

function mapEdtType(type) {
  if (/cours/i.test(type)) return 'CM';
  if (/td/i.test(type)) return 'TD';
  if (/tp/i.test(type)) return 'TP';
  return 'TD';
}

// ── Main seed function ──
async function seed() {
  const conn = await db.getConnection();
  try {
    console.log('🔄 Starting EDT seed...\n');

    // ── Phase 1: Cleanup ──
    console.log('Phase 1: Cleanup old data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE emploi_du_temps');
    await conn.query('DELETE FROM absences');
    await conn.query('DELETE FROM affectations');
    await conn.query('UPDATE etudiants SET id_groupe = NULL');
    await conn.query('DELETE FROM groupes');
    // Keep existing users (admin, benali, kherfi, khadir)
    // Keep existing modules, sessions, notes structure
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  ✅ Old demo data cleaned\n');

    // ── Phase 2: Create missing modules ──
    console.log('Phase 2: Create missing modules...');
    for (const mod of NEW_MODULES) {
      const [existing] = await conn.query(
        'SELECT id_module FROM modules WHERE code_module = ?', [mod.code]
      );
      if (existing.length === 0) {
        const [result] = await conn.query(
          'INSERT INTO modules (nom_module, code_module, coefficient, semestre, credits) VALUES (?,?,?,?,?)',
          [mod.nom, mod.code, mod.coeff, mod.semestre, mod.credits]
        );
        console.log(`  + Created module: ${mod.nom} (id=${result.insertId})`);
        // Register in map
        const key = mod.code === 'Ang2_S2' ? 'anglais_s2'
          : mod.code === 'ProbaS2' ? 'proba_s2'
          : mod.code === 'OM' ? 'om'
          : mod.code === 'TIC' ? 'tic'
          : mod.code === 'Term' ? 'terminologie'
          : mod.code === 'Phys2' ? 'physique2'
          : mod.code.toLowerCase();
        KNOWN_MODULE_IDS[key] = result.insertId;
      } else {
        const key = mod.code === 'Ang2_S2' ? 'anglais_s2'
          : mod.code === 'ProbaS2' ? 'proba_s2'
          : mod.code === 'OM' ? 'om'
          : mod.code === 'TIC' ? 'tic'
          : mod.code === 'Term' ? 'terminologie'
          : mod.code === 'Phys2' ? 'physique2'
          : mod.code.toLowerCase();
        KNOWN_MODULE_IDS[key] = existing[0].id_module;
        console.log(`  = Module exists: ${mod.nom} (id=${existing[0].id_module})`);
      }
    }
    console.log('');

    // ── Phase 3: Create groups ──
    console.log('Phase 3: Create groups...');
    const groupIdMap = {}; // key: "L1_Gr3" → id_groupe
    for (const [niveau, def] of Object.entries(GROUP_DEFS)) {
      for (let i = 1; i <= def.count; i++) {
        // Determine section for this group
        let section = 'Section 1';
        for (const [sec, nums] of Object.entries(def.sections)) {
          if (nums.includes(i)) { section = sec; break; }
        }
        const libelle = `Gr${i}`;
        const [result] = await conn.query(
          'INSERT INTO groupes (libelle, niveau, section) VALUES (?,?,?)',
          [libelle, niveau, section]
        );
        groupIdMap[`${niveau}_${i}`] = result.insertId;
      }
      console.log(`  ✅ ${niveau}: ${def.count} groups created`);
    }
    console.log('');

    // ── Phase 4: Create teachers ──
    console.log('Phase 4: Create teacher accounts...');
    const teacherMap = {}; // normalized name → id_utilisateur

    // Register existing teachers
    const [existingUsers] = await conn.query(
      'SELECT id_utilisateur, nom, prenom FROM utilisateurs WHERE id_role = 2'
    );
    for (const u of existingUsers) {
      teacherMap[u.nom.toUpperCase()] = u.id_utilisateur;
      if (u.prenom) teacherMap[`${u.nom.toUpperCase()} ${u.prenom.charAt(0).toUpperCase()}`] = u.id_utilisateur;
    }

    // Extract unique teacher names from EDT
    const uniqueTeachers = new Set();
    for (const entry of edtRaw.data) {
      if (entry.enseignant && entry.enseignant !== 'champ_non_lisible') {
        uniqueTeachers.add(entry.enseignant.trim());
      }
    }

    // Create the factice teacher for champ_non_lisible
    const [facRes] = await conn.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES (?,?,?,?,?,?)',
      ['NON_LISIBLE', 'Enseignant', 'non_lisible@univ-oran.dz', DEFAULT_HASH, ROLE_ENSEIGNANT, 1]
    );
    teacherMap['champ_non_lisible'] = facRes.insertId;
    console.log(`  + Created factice teacher: NON_LISIBLE (id=${facRes.insertId})`);

    // Create accounts for each unique teacher
    let created = 0;
    for (const name of uniqueTeachers) {
      const upper = name.toUpperCase();
      if (teacherMap[upper]) continue; // Already exists

      // Parse name: "BOUCIF" or "AYAD S" or "Abdelatif T"
      const parts = name.trim().split(/\s+/);
      const nom = parts[0].toUpperCase();
      const prenom = parts.length > 1 ? parts.slice(1).join(' ') : '';
      const emailBase = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      const email = `${emailBase}@univ-oran.dz`;

      // Check if email already exists
      const [emailCheck] = await conn.query('SELECT id_utilisateur FROM utilisateurs WHERE email = ?', [email]);
      if (emailCheck.length > 0) {
        teacherMap[upper] = emailCheck[0].id_utilisateur;
        teacherMap[name.trim()] = emailCheck[0].id_utilisateur;
        continue;
      }

      const [result] = await conn.query(
        'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES (?,?,?,?,?,?)',
        [nom, prenom, email, DEFAULT_HASH, ROLE_ENSEIGNANT, 1]
      );
      teacherMap[upper] = result.insertId;
      teacherMap[name.trim()] = result.insertId;
      created++;
    }
    console.log(`  ✅ ${created} new teachers created, ${uniqueTeachers.size} total unique names\n`);

    // ── Phase 5: Create affectations + EDT entries ──
    console.log('Phase 5: Process EDT entries...');
    const affectationCache = {}; // key → id_affectation
    let edtInserted = 0;
    let affCreated = 0;
    let skipped = 0;

    for (const entry of edtRaw.data) {
      // Resolve teacher
      const teacherName = entry.enseignant?.trim() || 'champ_non_lisible';
      const teacherId = teacherMap[teacherName] || teacherMap[teacherName.toUpperCase()] || teacherMap['champ_non_lisible'];
      if (!teacherId) {
        console.log(`  ⚠ Teacher not found: ${teacherName}, skipping`);
        skipped++;
        continue;
      }

      // Resolve module
      const modKey = normalizeModuleName(entry.module, entry.semestre, entry.niveau);
      const moduleId = KNOWN_MODULE_IDS[modKey];
      if (!moduleId) {
        console.log(`  ⚠ Module not mapped: "${entry.module}" → key="${modKey}", skipping`);
        skipped++;
        continue;
      }

      // Resolve group/section
      const dbType = mapEdtType(entry.type_seance);
      let groupId = null;
      let section = null;
      let niveau = entry.niveau;
      const cible = entry.cible?.trim();

      if (cible === 'champ_non_lisible') {
        // For L3 S6 CM entries with unreadable cible, set section generically
        section = 'Section 1';
      } else {
        const grNum = parseGroupNumber(cible);
        const sec = getSectionFromCible(cible);

        if (grNum) {
          // Group-level assignment (TD, TP, or group-specific Cours like Anglais)
          groupId = groupIdMap[`${niveau}_${grNum}`];
          if (!groupId) {
            console.log(`  ⚠ Group not found: ${niveau}_Gr${grNum}, skipping`);
            skipped++;
            continue;
          }
        } else if (sec) {
          // Section-level CM
          section = sec;
        } else {
          // Unknown cible format
          section = 'Section 1';
        }
      }

      // Build affectation cache key
      const affKey = `${teacherId}_${moduleId}_${groupId || 'NULL'}_${dbType}`;

      let affId;
      if (affectationCache[affKey]) {
        affId = affectationCache[affKey];
      } else {
        // Check if affectation exists
        let query, params;
        if (groupId) {
          query = 'SELECT id_affectation FROM affectations WHERE id_utilisateur=? AND id_module=? AND id_groupe=? AND type_seance=?';
          params = [teacherId, moduleId, groupId, dbType];
        } else {
          query = 'SELECT id_affectation FROM affectations WHERE id_utilisateur=? AND id_module=? AND id_groupe IS NULL AND type_seance=? AND section=?';
          params = [teacherId, moduleId, dbType, section];
        }
        const [existing] = await conn.query(query, params);

        if (existing.length > 0) {
          affId = existing[0].id_affectation;
        } else {
          const [result] = await conn.query(
            'INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ, type_seance, section, niveau) VALUES (?,?,?,?,?,?,?)',
            [teacherId, moduleId, groupId, ANNEE, dbType, section, niveau]
          );
          affId = result.insertId;
          affCreated++;
        }
        affectationCache[affKey] = affId;
      }

      // Insert EDT entry
      await conn.query(
        'INSERT INTO emploi_du_temps (id_affectation, jour, heure_debut, heure_fin, salle, type_seance) VALUES (?,?,?,?,?,?)',
        [affId, entry.jour, entry.heure_debut, entry.heure_fin, entry.local || 'EAD', dbType]
      );
      edtInserted++;
    }

    console.log(`  ✅ ${affCreated} affectations created`);
    console.log(`  ✅ ${edtInserted} EDT entries inserted`);
    if (skipped > 0) console.log(`  ⚠ ${skipped} entries skipped`);

    // ── Phase 6: Verification ──
    console.log('\n📊 Verification:');
    const [mc] = await conn.query('SELECT COUNT(*) as c FROM modules');
    const [gc] = await conn.query('SELECT COUNT(*) as c FROM groupes');
    const [uc] = await conn.query('SELECT COUNT(*) as c FROM utilisateurs WHERE id_role = 2');
    const [ac] = await conn.query('SELECT COUNT(*) as c FROM affectations');
    const [ec] = await conn.query('SELECT COUNT(*) as c FROM emploi_du_temps');
    console.log(`  Modules: ${mc[0].c}`);
    console.log(`  Groupes: ${gc[0].c}`);
    console.log(`  Enseignants: ${uc[0].c}`);
    console.log(`  Affectations: ${ac[0].c}`);
    console.log(`  EDT entries: ${ec[0].c}`);

    console.log('\n✅ EDT seed completed successfully!');

  } catch (err) {
    console.error('\n❌ Error during seed:', err);
    throw err;
  } finally {
    conn.release();
    process.exit();
  }
}

seed();
