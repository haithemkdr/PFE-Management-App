-- ============================================================
-- Migration : Ajouter niveau et section à la table groupes
-- Déjà exécuté — ce fichier sert de documentation.
-- ============================================================

-- Colonnes ajoutées :
--   niveau  VARCHAR(50) DEFAULT 'L3'
--   section VARCHAR(50) DEFAULT 'A'

-- Données existantes mises à jour :
--   G1/G2/G3 => niveau=L3, section=A

-- Vérification :
-- SELECT id_groupe, libelle, niveau, section, type_seance FROM groupes;
