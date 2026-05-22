const db = require('../config/db');
async function main() {
    try {
        await db.query("ALTER TABLE notes MODIFY COLUMN resultat ENUM('ADM','RAT','ELI','EXC') NULL");
        console.log('OK - resultat ENUM updated to include EXC');
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
}
main();
