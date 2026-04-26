// ============================================================
// Middleware de contrôle des rôles (RBAC)
// ============================================================

/**
 * Vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
 * Ce middleware doit être utilisé APRÈS le middleware authMiddleware (verifierToken).
 *
 * Utilisation dans les routes :
 *   router.get('/admin', verifierToken, autoriserRoles('Administrateur'), controller)
 *   router.get('/notes', verifierToken, autoriserRoles('Enseignant', 'Administrateur'), controller)
 *
 * @param  {...string} rolesAutorises - Liste des rôles ayant accès à la route
 */
const autoriserRoles = (...rolesAutorises) => {
    return (req, res, next) => {
        // req.user est défini par le middleware verifierToken (authMiddleware)
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                message: "Accès refusé. Utilisateur non authentifié."
            });
        }

        // Vérifier si le rôle de l'utilisateur fait partie des rôles autorisés
        if (!rolesAutorises.includes(req.user.role)) {
            return res.status(403).json({
                message: "Accès interdit. Vous n'avez pas les droits nécessaires."
            });
        }

        // Le rôle est autorisé, passer au suivant
        next();
    };
};

module.exports = autoriserRoles;
