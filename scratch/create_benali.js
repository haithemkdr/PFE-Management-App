const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAccount() {
    try {
        const pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'pfe_app'
        });

        const email = 'benali@univ-oran.dz';
        const passwordText = 'admin123';
        const roleId = 2; // Enseignant
        const nom = 'Benali';
        const prenom = 'Prof';

        // Check if user exists
        const [existing] = await pool.query('SELECT * FROM utilisateurs WHERE email = ?', [email]);
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordText, salt);

        if (existing.length > 0) {
            console.log('User already exists, updating password and role...');
            await pool.query('UPDATE utilisateurs SET mot_de_passe = ?, id_role = ?, actif = 1 WHERE email = ?', [hashedPassword, roleId, email]);
            console.log('User updated successfully.');
        } else {
            console.log('Creating new user...');
            await pool.query('INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES (?, ?, ?, ?, ?, 1)', 
                [nom, prenom, email, hashedPassword, roleId]);
            console.log('User created successfully.');
        }

        pool.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

createAccount();
