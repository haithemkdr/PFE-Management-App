const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ============================================================
// Contrôleur d'authentification — Gère le login des utilisateurs
// ============================================================

/**
 * POST /api/auth/login
 * Vérifie l'email et le mot de passe, puis renvoie un token JWT
 */
const login = async (req, res) => {
    try {
        const { email, mot_de_passe } = req.body;

        // Validation : vérifier que les champs sont remplis
        if (!email || !mot_de_passe) {
            return res.status(400).json({
                message: "Veuillez fournir un email et un mot de passe."
            });
        }

        // Requête SQL : chercher l'utilisateur par email avec son rôle
        const sql = `
            SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.mot_de_passe, u.actif,
                   r.libelle AS role
            FROM utilisateurs u
            LEFT JOIN roles r ON u.id_role = r.id_role
            WHERE u.email = ?
        `;
        const [rows] = await db.query(sql, [email]);

        // Vérifier si l'utilisateur existe dans la base
        if (rows.length === 0) {
            return res.status(401).json({
                message: "Email ou mot de passe incorrect."
            });
        }

        const utilisateur = rows[0];

        // Vérifier si le compte est actif
        if (!utilisateur.actif) {
            return res.status(403).json({
                message: "Ce compte est désactivé. Contactez l'administrateur."
            });
        }

        // Comparer le mot de passe saisi avec le hash stocké en BDD (bcrypt)
        const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

        if (!motDePasseValide) {
            return res.status(401).json({
                message: "Email ou mot de passe incorrect."
            });
        }

        // Créer le payload du token JWT (données embarquées dans le token)
        const payload = {
            id_utilisateur: utilisateur.id_utilisateur,
            email: utilisateur.email,
            role: utilisateur.role
        };

        // Générer le token JWT avec une durée de validité de 8 heures
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Réponse réussie : renvoyer le token et les infos de l'utilisateur
        res.status(200).json({
            message: "Connexion réussie !",
            token,
            utilisateur: {
                id: utilisateur.id_utilisateur,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                email: utilisateur.email,
                role: utilisateur.role
            }
        });

    } catch (error) {
        console.error("❌ Erreur lors du login :", error.message);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
};

module.exports = { login };
