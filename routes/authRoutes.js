const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimitMiddleware');

// ============================================================
// Routes d'authentification
// ============================================================

// POST /api/auth/login — Connexion d'un utilisateur
// Protégé par rate limiting : 10 tentatives max par 15 minutes par IP
router.post('/login', loginLimiter, login);

module.exports = router;
