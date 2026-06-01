const jwt = require('jsonwebtoken');

// ============================================================
// Middleware d'authentification — Vérifie le token JWT
// ============================================================

/**
 * Vérifie que la requête contient un token JWT valide dans le header Authorization.
 * Format attendu : "Bearer <token>"
 * Si le token est valide, les données de l'utilisateur sont ajoutées à req.user
 */
const verifierToken = (req, res, next) => {
    // Récupérer le header Authorization
    const authHeader = req.headers['authorization'];

    // Vérifier que le header existe et commence par "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: "Accès refusé. Aucun token fourni."
        });
    }

    // Extraire le token (enlever le préfixe "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // Vérifier et décoder le token avec la clé secrète
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Ajouter les infos de l'utilisateur à l'objet requête
        // Disponible dans les contrôleurs via req.user
        req.user = decoded;

        // Passer au middleware ou contrôleur suivant
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Token invalide ou expiré."
        });
    }
};

module.exports = verifierToken;
