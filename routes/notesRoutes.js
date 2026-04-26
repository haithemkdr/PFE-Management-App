const express = require('express');
const router = express.Router();
const { getNotesByGroupe, upsertNote } = require('../controllers/notesController');
const verifierToken = require('../middleware/authMiddleware');

// ============================================================
// Routes de gestion des notes — Toutes protégées par JWT
// ============================================================

// GET /api/notes?id_module=X&id_groupe=Y
// Récupère les étudiants d'un groupe avec leurs notes pour un module
router.get('/', verifierToken, getNotesByGroupe);

// POST /api/notes/upsert
// Saisie ou modification d'une note avec calcul automatique des moyennes
router.post('/upsert', verifierToken, upsertNote);

module.exports = router;
