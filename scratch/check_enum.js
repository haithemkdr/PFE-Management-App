const db = require('../config/db');
async function main() {
    try {
        let [rows] = await db.query("SHOW COLUMNS FROM notes LIKE 'resultat'");
        console.log(JSON.stringify(rows, null, 2));
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
}
main();
