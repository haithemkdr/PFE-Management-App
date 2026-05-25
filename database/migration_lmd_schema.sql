-- ============================================================
-- Migration LMD : Schéma complet pour le système de notation
-- Exécuter UNE SEULE FOIS sur la base pfe_app existante
-- ============================================================

-- ────────────────────────────────────────────────────────
-- 1. Table `formations` — Programmes d'études LMD
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formations (
    id_formation INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    nom_complet VARCHAR(100),
    domaine VARCHAR(100),
    branche VARCHAR(100),
    cycle VARCHAR(20),
    niveau INT,
    annee_debut VARCHAR(10),
    annee_expiration VARCHAR(10) NULL
);

-- ────────────────────────────────────────────────────────
-- 2. Table `unites_enseignement` — UE liées à une formation
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unites_enseignement (
    id_ue INT AUTO_INCREMENT PRIMARY KEY,
    id_formation INT NOT NULL,
    code_ue VARCHAR(20) NOT NULL,
    titre VARCHAR(100),
    semestre VARCHAR(5) NOT NULL,
    coefficient DECIMAL(3,1),
    credits INT DEFAULT 0,
    credits_origine INT DEFAULT 0,
    FOREIGN KEY (id_formation) REFERENCES formations(id_formation) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────
-- 3. Migration de la table `modules`
--    - Élargir semestre ENUM → VARCHAR(5) pour S1-S6
--    - Ajouter code_module, id_ue, id_formation
--    - Ajouter poids_exam/poids_td/poids_tp (3-way)
--    - Supprimer poids_cc, poids_ef, note_eliminatoire, type_eval
-- ────────────────────────────────────────────────────────

-- 3a. Élargir le champ semestre (ENUM → VARCHAR pour S1-S6)
ALTER TABLE modules MODIFY COLUMN semestre VARCHAR(5) NOT NULL;

-- 3b. Ajouter les nouvelles colonnes
ALTER TABLE modules
    ADD COLUMN code_module VARCHAR(20) NULL AFTER nom_module,
    ADD COLUMN id_ue INT NULL AFTER credits,
    ADD COLUMN id_formation INT NULL AFTER id_ue,
    ADD COLUMN poids_exam DECIMAL(3,2) DEFAULT 0.60 AFTER credits,
    ADD COLUMN poids_td DECIMAL(3,2) DEFAULT 0.20 AFTER poids_exam,
    ADD COLUMN poids_tp DECIMAL(3,2) DEFAULT 0.20 AFTER poids_td;

-- 3c. Migrer les anciens poids vers les nouveaux (avant suppression)
UPDATE modules SET
    poids_exam = COALESCE(poids_ef, 0.60),
    poids_td   = COALESCE(poids_cc, 0.40),
    poids_tp   = 0.00;

-- 3d. Supprimer les colonnes obsolètes
ALTER TABLE modules DROP COLUMN IF EXISTS poids_cc;
ALTER TABLE modules DROP COLUMN IF EXISTS poids_ef;
ALTER TABLE modules DROP COLUMN IF EXISTS note_eliminatoire;
ALTER TABLE modules DROP COLUMN IF EXISTS type_eval;

-- 3e. Ajouter les clés étrangères
ALTER TABLE modules
    ADD FOREIGN KEY (id_ue) REFERENCES unites_enseignement(id_ue) ON DELETE SET NULL,
    ADD FOREIGN KEY (id_formation) REFERENCES formations(id_formation) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────
-- 4. Migration de la table `notes`
--    - Renommer note_cc → note_td
--    - Ajouter note_tp
-- ────────────────────────────────────────────────────────

-- 4a. Renommer note_cc en note_td
ALTER TABLE notes CHANGE COLUMN note_cc note_td DECIMAL(4,2) NULL;

-- 4b. Ajouter la colonne note_tp après note_td
ALTER TABLE notes ADD COLUMN note_tp DECIMAL(4,2) NULL AFTER note_td;

-- ────────────────────────────────────────────────────────
-- 5. Terminé
-- ────────────────────────────────────────────────────────
SELECT 'Migration LMD terminée avec succès.' AS status;
