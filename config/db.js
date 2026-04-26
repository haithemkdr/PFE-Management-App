const mysql = require('mysql2/promise');
require('dotenv').config();

// Création du pool de connexion MySQL (performant pour les accès simultanés)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test de connexion asynchrone (utile pour vérifier si la BDD est accessible)
const checkConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connecté à la base de données MySQL.');
        connection.release();
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données :', error.message);
    }
};

checkConnection();

module.exports = pool;
