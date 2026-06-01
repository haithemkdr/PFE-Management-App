-- ============================================================
-- Migration: Sessions + Délibérations + session_validation
-- Délibérations — Refonte PV officiels
-- ============================================================

-- 1. Table sessions : paramètre global par semestre
CREATE TABLE IF NOT EXISTS sessions (
  id_session    INT AUTO_INCREMENT PRIMARY KEY,
  annee_univ    VARCHAR(20) NOT NULL,
  semestre      VARCHAR(5)  NOT NULL,
  type_session  ENUM('NORMALE','RATTRAPAGE') DEFAULT 'NORMALE',
  verrouille    TINYINT DEFAULT 0,
  UNIQUE KEY unique_session (annee_univ, semestre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table deliberations : décisions annuelles du jury
CREATE TABLE IF NOT EXISTS deliberations (
  id_deliberation   INT AUTO_INCREMENT PRIMARY KEY,
  id_etudiant       INT NOT NULL,
  annee_univ        VARCHAR(20) NOT NULL,
  niveau            VARCHAR(5) NOT NULL,
  semestre_1        VARCHAR(5),
  semestre_2        VARCHAR(5),
  moyenne_s1        DECIMAL(4,2),
  moyenne_s2        DECIMAL(4,2),
  moyenne_annuelle  DECIMAL(4,2),
  moyenne_originale DECIMAL(4,2),
  credits_acquis    INT DEFAULT 0,
  credits_max       INT DEFAULT 60,
  seuil_rachat      DECIMAL(4,2) DEFAULT NULL,
  decision ENUM(
    'Admis(e) (session normale)',
    'Admis(e) (session rattrapage)',
    'Admis(e) (Rachat)',
    'Admis(e) avec dettes',
    'Ajourné(e)'
  ) NOT NULL,
  rachat            TINYINT DEFAULT 0,
  delibere_par      INT,
  date_deliberation DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant),
  UNIQUE KEY unique_delib (id_etudiant, annee_univ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Colonne session_validation sur notes
-- (ALTER TABLE est idempotent grâce au IF NOT EXISTS de la procédure)
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notes'
    AND COLUMN_NAME = 'session_validation'
);

SET @sql = IF(@col_exists = 0,
  "ALTER TABLE notes ADD COLUMN session_validation ENUM('NORMALE','RATTRAPAGE') DEFAULT NULL",
  "SELECT 'Column session_validation already exists'"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Seed session courante (2025-2026)
INSERT IGNORE INTO sessions (annee_univ, semestre, type_session, verrouille)
VALUES
  ('2025-2026', 'S1', 'NORMALE', 0),
  ('2025-2026', 'S2', 'NORMALE', 0),
  ('2025-2026', 'S3', 'NORMALE', 0),
  ('2025-2026', 'S4', 'NORMALE', 0),
  ('2025-2026', 'S5', 'NORMALE', 0),
  ('2025-2026', 'S6', 'NORMALE', 0);
