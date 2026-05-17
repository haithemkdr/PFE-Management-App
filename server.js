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

const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');
const absencesRoutes = require('./routes/absencesRoutes');
const supportsRoutes = require('./routes/supportsRoutes');
const agentRoutes = require('./routes/agentRoutes');
const annoncesRoutes = require('./routes/annoncesRoutes');
const emploiDuTempsRoutes = require('./routes/emploiDuTempsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/supports', supportsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/annonces', annoncesRoutes);
app.use('/api/emploi-du-temps', emploiDuTempsRoutes);

// Je rends le dossier uploads/ accessible publiquement pour que le front puisse télécharger les fichiers
app.use('/uploads', express.static('uploads'));

// Route protégée de test (nécessite un token JWT valide)
const verifierToken = require('./middleware/authMiddleware');
app.get('/api/profil', verifierToken, (req, res) => {
    res.json({ message: "Accès autorisé !", utilisateur: req.user });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
