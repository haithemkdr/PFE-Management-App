const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'pfe_app'
    });
    
    const [roles] = await pool.query('SELECT * FROM roles');
    console.log('Roles:', roles);
    
    const [cols] = await pool.query('DESCRIBE utilisateurs');
    console.log('Utilisateurs columns:', cols);
    
    pool.end();
}

check().catch(console.error);
