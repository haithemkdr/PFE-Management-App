const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjusted path if we put it in scripts

async function testAbsences() {
    let db;
    try {
        db = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'root',
            database: process.env.DB_NAME || 'pfe_app'
        });

        console.log("Testing getListeAppel query...");
        
        // Find a valid affectation first
        const [affectations] = await db.query('SELECT * FROM affectations LIMIT 1');
        if (affectations.length === 0) {
            console.log("No affectations found.");
            return;
        }
        
        const aff = affectations[0];
        console.log(`Using affectation: Module ${aff.id_module}, Groupe ${aff.id_groupe}`);
        
        // The query from absencesController.js
        let sql = `SELECT e.id_etudiant, e.matricule, e.nom, e.prenom, a.id_absence, a.statut, a.justifiee, n.resultat 
                   FROM etudiants e 
                   LEFT JOIN affectations aff ON e.id_groupe = aff.id_groupe AND aff.id_module = ? 
                   LEFT JOIN absences a ON e.id_etudiant = a.id_etudiant AND a.id_affectation = aff.id_affectation AND a.date_seance = ? 
                   LEFT JOIN notes n ON e.id_etudiant = n.id_etudiant AND n.id_module = aff.id_module
                   WHERE e.id_groupe = ? ORDER BY e.nom ASC`;
        
        const date_seance = new Date().toISOString().split('T')[0];
        const [result] = await db.query(sql, [aff.id_module, date_seance, aff.id_groupe]);
        
        console.log("Query success! Result count:", result.length);
        if (result.length > 0) {
            console.log("Sample row:", result[0]);
        }
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        if (db) await db.end();
    }
}

testAbsences();
