const db = require('../config/db');
async function main() {
  try {
    const [rows] = await db.query(`SELECT heure_debut FROM emploi_du_temps LIMIT 5`);
    rows.forEach(r => {
      const val = r.heure_debut;
      console.log(`value: "${val}", type: ${typeof val}, slice05: "${String(val).slice(0,5)}"`);
    });
    process.exit(0);
  } catch (err) { console.error(err.message); process.exit(1); }
}
main();
