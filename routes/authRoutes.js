const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// ============================================================
// Routes d'authentification
// ============================================================

// POST /api/auth/login — Connexion d'un utilisateur
router.post('/login', login);

module.exports = router;
