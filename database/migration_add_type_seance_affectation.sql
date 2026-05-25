-- ============================================================
-- Migration : Ajouter type_seance à la table affectations
-- + rendre id_groupe nullable (pour les affectations CM)
-- + ajouter section/niveau (pour les affectations CM)
-- ============================================================
-- Objectif : Implémenter les règles d'attribution officielles :
--   CM  → affectation à une section entière (id_groupe NULL)
--   TD  → affectation à un groupe spécifique
--   TP  → affectation à un groupe spécifique
-- ============================================================

-- 1. Ajouter la colonne type_seance à affectations
ALTER TABLE affectations
  ADD COLUMN type_seance ENUM('CM','TD','TP') NOT NULL DEFAULT 'TD';

-- 2. Rendre id_groupe nullable (CM n'a pas de groupe, il a une section)
ALTER TABLE affectations
  MODIFY COLUMN id_groupe INT NULL;

-- 3. Ajouter section et niveau pour les affectations CM
ALTER TABLE affectations
  ADD COLUMN section VARCHAR(50) NULL,
  ADD COLUMN niveau VARCHAR(50) NULL;

-- 4. Migrer les données existantes : déduire le type depuis groupes.type_seance
UPDATE affectations a
  JOIN groupes g ON a.id_groupe = g.id_groupe
  SET a.type_seance = CASE
    WHEN g.type_seance = 'CM' THEN 'CM'
    WHEN g.type_seance = 'TP' THEN 'TP'
    ELSE 'TD'
  END;

-- 5. Pour les affectations existantes, copier section/niveau depuis le groupe lié
UPDATE affectations a
  JOIN groupes g ON a.id_groupe = g.id_groupe
  SET a.section = g.section,
      a.niveau  = g.niveau;

-- ============================================================
-- Vérification :
-- SELECT a.id_affectation, a.type_seance, a.id_groupe, a.section, a.niveau,
--        u.nom AS enseignant, m.nom_module
-- FROM affectations a
-- JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
-- JOIN modules m ON a.id_module = m.id_module
-- LEFT JOIN groupes g ON a.id_groupe = g.id_groupe;
-- ============================================================
