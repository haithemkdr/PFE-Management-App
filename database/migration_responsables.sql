-- ============================================================
-- Migration: Système de rôles LMD (Responsable Matière)
-- Date: 2026-05-31
-- ============================================================

-- 1. Corriger les grades des enseignants ayant des CM
-- Un enseignant avec une affectation CM doit être au minimum MAA
UPDATE utilisateurs u
SET u.grade = 'MAA'
WHERE u.id_role = 2 
  AND (u.grade IN ('MAB', 'Assistant') OR u.grade IS NULL)
  AND EXISTS (
      SELECT 1 FROM affectations a 
      WHERE a.id_utilisateur = u.id_utilisateur AND a.type_seance = 'CM'
  );

-- 2. Ajouter le flag "responsable matière" sur les affectations
-- Seul l'enseignant CM désigné comme responsable pourra modifier les pondérations et valider
ALTER TABLE affectations
    ADD COLUMN est_responsable_matiere TINYINT(1) DEFAULT 0;

-- 3. Ajouter le statut de saisie pour le workflow de soumission TD/TP
-- EN_COURS = l'enseignant peut encore modifier ses notes
-- SOUMIS   = notes verrouillées, en attente de validation par le coordinateur
ALTER TABLE affectations
    ADD COLUMN statut_saisie ENUM('EN_COURS', 'SOUMIS') DEFAULT 'EN_COURS';

-- 4. Auto-désigner les enseignants CM existants comme responsables matière
-- (par défaut, l'enseignant CM est le coordinateur)
UPDATE affectations 
SET est_responsable_matiere = 1 
WHERE type_seance = 'CM';
