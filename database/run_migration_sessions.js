const db = require('../config/db');

async function run() {
  console.log('=== Creating sessions table ===');
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id_session    INT AUTO_INCREMENT PRIMARY KEY,
      annee_univ    VARCHAR(20) NOT NULL,
      semestre      VARCHAR(5)  NOT NULL,
      type_session  ENUM('NORMALE','RATTRAPAGE') DEFAULT 'NORMALE',
      verrouille    TINYINT DEFAULT 0,
      UNIQUE KEY unique_session (annee_univ, semestre)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✅ sessions');

  console.log('=== Creating deliberations table ===');
  await db.query(`
    CREATE TABLE IF NOT EXISTS deliberations (
      id_deliberation   INT AUTO_INCREMENT PRIMARY KEY,
      id_etudiant       INT NOT NULL,
      annee_univ        VARCHAR(20) NOT NULL,
      niveau            VARCHAR(5) NOT NULL,
      semestre_1        VARCHAR(5),
      semestre_2        VARCHAR(5),
      moyenne_s1        DECIMAL(4,2),
      moyenne_s2        DECIMAL(4,2),
      moyenne_annuelle  DECIMAL(4,2),
      moyenne_originale DECIMAL(4,2),
      credits_acquis    INT DEFAULT 0,
      credits_max       INT DEFAULT 60,
      seuil_rachat      DECIMAL(4,2) DEFAULT NULL,
      decision ENUM(
        'Admis(e) (session normale)',
        'Admis(e) (session rattrapage)',
        'Admis(e) (Rachat)',
        'Admis(e) avec dettes',
        'Ajourné(e)'
      ) NOT NULL,
      rachat            TINYINT DEFAULT 0,
      delibere_par      INT,
      date_deliberation DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant),
      UNIQUE KEY unique_delib (id_etudiant, annee_univ)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✅ deliberations');

  console.log('=== Adding session_validation column ===');
  try {
    await db.query("ALTER TABLE notes ADD COLUMN session_validation ENUM('NORMALE','RATTRAPAGE') DEFAULT NULL");
    console.log('  ✅ session_validation added');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('  ⏭️  Already exists');
    else throw err;
  }

  console.log('=== Seeding sessions ===');
  const semesters = ['S1','S2','S3','S4','S5','S6'];
  for (const sem of semesters) {
    try {
      await db.query(
        "INSERT INTO sessions (annee_univ, semestre, type_session, verrouille) VALUES (?, ?, 'NORMALE', 0)",
        ['2025-2026', sem]
      );
    } catch (e) {
      // duplicate = already seeded
    }
  }
  console.log('  ✅ Sessions seeded');

  // Verify
  const [t1] = await db.query("SHOW TABLES LIKE 'sessions'");
  const [t2] = await db.query("SHOW TABLES LIKE 'deliberations'");
  const [c]  = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notes' AND COLUMN_NAME='session_validation'");
  const [s]  = await db.query('SELECT * FROM sessions');

  console.log('\n=== Verification ===');
  console.log('  sessions:', t1.length > 0 ? '✅' : '❌');
  console.log('  deliberations:', t2.length > 0 ? '✅' : '❌');
  console.log('  notes.session_validation:', c.length > 0 ? '✅' : '❌');
  console.log('  Sessions count:', s.length);
  s.forEach(r => console.log('   ', r.annee_univ, r.semestre, r.type_session));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
