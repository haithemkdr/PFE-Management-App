// Migration: Add type_seance, section, niveau to affectations
const db = require('../config/db');

async function migrate() {
  console.log('=== Migration: type_seance + section + niveau ===');

  // 1. Add type_seance column
  try {
    await db.query("ALTER TABLE affectations ADD COLUMN type_seance ENUM('CM','TD','TP') NOT NULL DEFAULT 'TD'");
    console.log('1. Column type_seance added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('1. Column type_seance already exists (skip)');
    else throw e;
  }

  // 2. Add section column
  try {
    await db.query("ALTER TABLE affectations ADD COLUMN section VARCHAR(50) NULL");
    console.log('2. Column section added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('2. Column section already exists (skip)');
    else throw e;
  }

  // 3. Add niveau column
  try {
    await db.query("ALTER TABLE affectations ADD COLUMN niveau VARCHAR(50) NULL");
    console.log('3. Column niveau added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('3. Column niveau already exists (skip)');
    else throw e;
  }

  // 4. Migrate existing data: deduce type_seance from groupes.type_seance
  const [rows] = await db.query(`
    SELECT a.id_affectation, a.id_groupe, g.type_seance, g.section, g.niveau
    FROM affectations a
    LEFT JOIN groupes g ON a.id_groupe = g.id_groupe
  `);

  for (const r of rows) {
    const ts = (r.id_groupe === null || r.type_seance === 'CM') ? 'CM'
             : r.type_seance === 'TP' ? 'TP'
             : 'TD';
    await db.query(
      'UPDATE affectations SET type_seance=?, section=?, niveau=? WHERE id_affectation=?',
      [ts, r.section || 'A', r.niveau || 'L3', r.id_affectation]
    );
  }
  console.log(`4. Migrated ${rows.length} existing affectations`);

  // 5. Synchronize EDT type_seance with affectation
  try {
    const [edtRes] = await db.query(`
      UPDATE emploi_du_temps edt
      JOIN affectations a ON edt.id_affectation = a.id_affectation
      SET edt.type_seance = a.type_seance
      WHERE edt.type_seance != a.type_seance
    `);
    console.log(`5. Synchronized ${edtRes.affectedRows} EDT records with affectation type_seance`);
  } catch (e) {
    console.log('5. Failed to synchronize EDT:', e.message);
  }

  // 6. Verify
  const [verify] = await db.query(
    'SELECT id_affectation, type_seance, id_groupe, section, niveau FROM affectations'
  );
  console.table(verify);

  console.log('=== Migration complete ===');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
