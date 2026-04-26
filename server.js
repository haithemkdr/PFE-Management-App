const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialisation de la connexion BDD (pour vérifier la connexion au démarrage)
require('./config/db');

const app = express();

// Middlewares
app.use(cors()); // Permet les requêtes cross-origin depuis l'application React
app.use(express.json()); // Permet de parser le corps des requêtes en JSON

// Route de test basique
app.get('/api/status', (req, res) => {
    res.json({ message: "Le serveur MVC PFE fonctionne correctement ! 🚀" });
});

// Importation des routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Route protégée de test (nécessite un token JWT valide)
const verifierToken = require('./middleware/authMiddleware');
app.get('/api/profil', verifierToken, (req, res) => {
    res.json({ message: "Accès autorisé !", utilisateur: req.user });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
