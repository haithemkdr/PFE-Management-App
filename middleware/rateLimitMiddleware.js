const rateLimit = require('express-rate-limit');

// ============================================================
// Rate Limiter pour la route de connexion
// ============================================================
// Limite : 10 tentatives par fenêtre de 15 minutes par IP.
// Protège contre les attaques par force brute sur le mot de passe.

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 tentatives maximum par fenêtre
    standardHeaders: true,     // Retourne les en-têtes `RateLimit-*`
    legacyHeaders: false,      // Désactive les en-têtes `X-RateLimit-*`
    message: {
        success: false,
        message: "Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes."
    },
});

module.exports = { loginLimiter };
