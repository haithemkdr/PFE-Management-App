-- Table `roles` — Rôles et autorisations des utilisateurs dans le système.
CREATE TABLE IF NOT EXISTS roles (
    id_role INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL,
    description TEXT
);

-- Table `utilisateurs` — Comptes d'accès au système (enseignants, agents, admin).
CREATE TABLE IF NOT EXISTS utilisateurs (
    id_utilisateur INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    matricule VARCHAR(50) DEFAULT NULL,
    grade VARCHAR(20) DEFAULT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    id_role INT,
    actif TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_role) REFERENCES roles(id_role) ON DELETE SET NULL
);

-- Table `modules` — Catalogue des matières enseignées.
-- poids_cc et poids_ef : pondérations configurables par l'Agent (ex: 0.40 et 0.60)
CREATE TABLE IF NOT EXISTS modules (
    id_module INT AUTO_INCREMENT PRIMARY KEY,
    nom_module VARCHAR(100) NOT NULL,
    coefficient DECIMAL(3,1) NOT NULL,
    semestre ENUM('S1', 'S2') NOT NULL,
    poids_cc DECIMAL(3,2) DEFAULT 0.40,
    poids_ef DECIMAL(3,2) DEFAULT 0.60,
    type_eval ENUM('Mixte', '100% Examen') DEFAULT 'Mixte',
    note_eliminatoire DECIMAL(4,2) DEFAULT 5.00,
    credits INT DEFAULT 6
);

-- Table `groupes` — Les groupes d'étudiants (TD, TP, Cours).
CREATE TABLE IF NOT EXISTS groupes (
    id_groupe INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL,
    type_seance VARCHAR(50),
    id_module INT,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE SET NULL
);

-- Table `etudiants` — Liste des étudiants du département.
CREATE TABLE IF NOT EXISTS etudiants (
    id_etudiant INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    id_groupe INT,
    FOREIGN KEY (id_groupe) REFERENCES groupes(id_groupe) ON DELETE SET NULL
);

-- Table `affectations` — Relie un enseignant à un module et un groupe pour une année donnée.
-- periode_saisie_ouverte : 0 = fermée (par défaut), 1 = ouverte par l'Agent avant les délibérations
CREATE TABLE IF NOT EXISTS affectations (
    id_affectation INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT,
    id_module INT,
    id_groupe INT,
    annee_univ VARCHAR(20),
    periode_saisie_ouverte TINYINT(1) DEFAULT 0,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_groupe) REFERENCES groupes(id_groupe) ON DELETE CASCADE
);

-- Table `notes` — Relevés de notes alignés sur le PV officiel.
-- Note: periode_saisie_ouverte a été déplacé dans la table `affectations`
CREATE TABLE IF NOT EXISTS notes (
    id_note INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT,
    id_module INT,
    note_cc DECIMAL(4,2) NULL,
    note_ef DECIMAL(4,2) NULL,
    moy1 DECIMAL(4,2) NULL,
    note_er DECIMAL(4,2) NULL,
    moy2 DECIMAL(4,2) NULL,
    moyenne_finale DECIMAL(4,2) NULL,
    resultat ENUM('ADM','RAT','ELI','EXC') NULL,
    saisie_par INT,
    date_saisie DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (saisie_par) REFERENCES utilisateurs(id_utilisateur) ON DELETE SET NULL
);

-- Table `absences` — Fiche de présence par séance.
CREATE TABLE IF NOT EXISTS absences (
    id_absence INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT,
    id_affectation INT,
    date_seance DATE NOT NULL,
    numero_seance INT,
    statut VARCHAR(20),
    justifiee TINYINT(1) DEFAULT 0,
    FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_affectation) REFERENCES affectations(id_affectation) ON DELETE CASCADE
);

-- Table `supports_cours` — Fichiers partagés avec les étudiants (PDF, Docx...).
CREATE TABLE IF NOT EXISTS supports_cours (
    id_support INT AUTO_INCREMENT PRIMARY KEY,
    id_affectation INT,
    titre VARCHAR(255) NOT NULL,
    chemin_fichier VARCHAR(255) NOT NULL,
    type_fichier VARCHAR(50),
    uploaded_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_affectation) REFERENCES affectations(id_affectation) ON DELETE CASCADE
);

-- ============================================================
-- Données de base (Seed) — Rôles, utilisateurs, modules, groupes, étudiants
-- ============================================================

-- Rôles du système
INSERT INTO roles (libelle, description) VALUES
('Administrateur', 'Accès total au système'),
('Enseignant', 'Gestion des notes, absences et supports de cours'),
('Agent', 'Agent de scolarité pour consultation et gestion basique');

-- Compte administrateur (mot de passe : admin123, hashé avec bcrypt)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES
('Admin', 'Super', 'admin@univ-oran.dz', '$2b$10$ij/2B2pQeoh7IuaWl/ylP.QQ2MWJx9XLf8jCXDMoh0HIFh4EbF8AG', 1, 1);

-- Compte enseignant de test (mot de passe : prof123, hashé avec bcrypt)
-- Le hash sera généré et mis à jour lors du premier lancement
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES
('Benali', 'Mohamed', 'benali@univ-oran.dz', '$2b$10$ij/2B2pQeoh7IuaWl/ylP.QQ2MWJx9XLf8jCXDMoh0HIFh4EbF8AG', 2, 1);

-- Compte agent de test (mot de passe : agent123)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES
('Kherfi', 'Amina', 'kherfi@univ-oran.dz', '$2b$10$ij/2B2pQeoh7IuaWl/ylP.QQ2MWJx9XLf8jCXDMoh0HIFh4EbF8AG', 3, 1);

-- Modules enseignés (semestre 1 et 2)
INSERT INTO modules (nom_module, coefficient, semestre) VALUES
('Bases de Données', 3.0, 'S1'),
('Programmation Web', 2.5, 'S1'),
('Réseaux Informatiques', 2.0, 'S2');

-- Groupes d'étudiants
INSERT INTO groupes (libelle, type_seance, id_module) VALUES
('L3-G1', 'TD', 1),
('L3-G2', 'TD', 1),
('L3-G1', 'TP', 2);

-- Étudiants du département (6 étudiants répartis dans les groupes)
INSERT INTO etudiants (matricule, nom, prenom, id_groupe) VALUES
('202100001', 'Boudiaf', 'Yacine', 1),
('202100002', 'Mebarki', 'Sara', 1),
('202100003', 'Hamidi', 'Karim', 1),
('202100004', 'Ziani', 'Fatima', 2),
('202100005', 'Boudaoud', 'Amine', 2),
('202100006', 'Cherifi', 'Nadia', 2);

-- Affectations : enseignant → module → groupe → année
INSERT INTO affectations (id_utilisateur, id_module, id_groupe, annee_univ) VALUES
(2, 1, 1, '2025-2026'),
(2, 1, 2, '2025-2026'),
(2, 2, 3, '2025-2026');

-- ============================================================
-- Table `annonces` — Messages envoyés par un enseignant à un groupe (UC-E05)
-- ============================================================
CREATE TABLE IF NOT EXISTS annonces (
    id_annonce     INT AUTO_INCREMENT PRIMARY KEY,
    id_enseignant  INT NOT NULL,
    id_groupe      INT NOT NULL,
    titre          VARCHAR(255) NOT NULL,
    contenu        TEXT NOT NULL,
    date_envoi     DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_enseignant) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_groupe)     REFERENCES groupes(id_groupe)           ON DELETE CASCADE
);

-- ============================================================
-- Table `emploi_du_temps` — Créneaux hebdomadaires d'un enseignant (UC-E06)
-- ============================================================
CREATE TABLE IF NOT EXISTS emploi_du_temps (
    id_creneau     INT AUTO_INCREMENT PRIMARY KEY,
    id_affectation INT NOT NULL,
    jour           ENUM('Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
    heure_debut    TIME NOT NULL,
    heure_fin      TIME NOT NULL,
    salle          VARCHAR(50),
    type_seance    ENUM('CM','TD','TP') NOT NULL,
    FOREIGN KEY (id_affectation) REFERENCES affectations(id_affectation) ON DELETE CASCADE
);

-- Données de démonstration — emploi du temps de l'enseignant Benali (id=2)
INSERT INTO emploi_du_temps (id_affectation, jour, heure_debut, heure_fin, salle, type_seance) VALUES
(1, 'Lundi',    '08:00:00', '09:30:00', 'Amphi A', 'CM'),
(1, 'Mercredi', '09:30:00', '11:00:00', 'TP 04',   'TP'),
(2, 'Mardi',    '11:00:00', '12:30:00', 'TD 02',   'TD'),
(2, 'Mardi',    '15:00:00', '16:30:00', 'Salle 08','TD'),
(3, 'Jeudi',    '08:00:00', '09:30:00', 'Amphi B', 'CM'),
(3, 'Vendredi', '13:30:00', '15:00:00', 'TP 02',   'TP');

