const db = require('../config/db');

(async () => {
    try {
        await db.query(`ALTER TABLE utilisateurs ADD COLUMN mot_de_passe_clair VARCHAR(255) DEFAULT NULL AFTER mot_de_passe`);
        console.log('Column mot_de_passe_clair added.');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column mot_de_passe_clair already exists.');
        } else {
            throw e;
        }
    }

    await db.query("UPDATE utilisateurs SET mot_de_passe_clair = 'admin123' WHERE id_role = 2 AND mot_de_passe_clair IS NULL");
    console.log('Existing teacher passwords filled with admin123.');

    // Also fill agent accounts
    await db.query("UPDATE utilisateurs SET mot_de_passe_clair = 'admin123' WHERE id_role = 1 AND mot_de_passe_clair IS NULL");
    console.log('Done.');
    process.exit(0);
})();
