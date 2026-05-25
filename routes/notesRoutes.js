const express = require('express');
const router = express.Router();
const { getNotesByGroupe, upsertNote, getMesAffectations, getBilanEnseignant } = require('../controllers/notesController');
const verifierToken = require('../middleware/authMiddleware');

// ============================================================
// Routes de gestion des notes — Toutes protégées par JWT
// ============================================================

// GET /api/notes/mes-affectations
// Récupère les affectations de l'enseignant connecté (pour les dropdowns du frontend)
router.get('/mes-affectations', verifierToken, getMesAffectations);

// GET /api/notes?id_module=X&id_groupe=Y
// Récupère les étudiants d'un groupe avec leurs notes pour un module
router.get('/', verifierToken, getNotesByGroupe);

// POST /api/notes/upsert
// Saisie ou modification d'une note avec calcul automatique des moyennes
router.post('/upsert', verifierToken, upsertNote);

// GET /api/notes/bilan?semestre=S5
// Bilan semestriel en lecture seule — scopé aux modules/groupes de l'enseignant
router.get('/bilan', verifierToken, getBilanEnseignant);

module.exports = router;
