-- Migration : Ajouter une colonne mot_de_passe_clair pour permettre à l'agent
-- de consulter les mots de passe des comptes enseignants.
ALTER TABLE utilisateurs ADD COLUMN mot_de_passe_clair VARCHAR(255) DEFAULT NULL AFTER mot_de_passe;

-- Remplir les mots de passe existants avec le mot de passe par défaut (admin123)
UPDATE utilisateurs SET mot_de_passe_clair = 'admin123' WHERE id_role = 2 AND mot_de_passe_clair IS NULL;
