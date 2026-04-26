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
    mot_de_passe VARCHAR(255) NOT NULL,
    id_role INT,
    actif TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_role) REFERENCES roles(id_role) ON DELETE SET NULL
);

-- Table `modules` — Catalogue des matières enseignées.
CREATE TABLE IF NOT EXISTS modules (
    id_module INT AUTO_INCREMENT PRIMARY KEY,
    nom_module VARCHAR(100) NOT NULL,
    coefficient DECIMAL(3,1) NOT NULL,
    semestre ENUM('S1', 'S2') NOT NULL
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
CREATE TABLE IF NOT EXISTS affectations (
    id_affectation INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT,
    id_module INT,
    id_groupe INT,
    annee_univ VARCHAR(20),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_groupe) REFERENCES groupes(id_groupe) ON DELETE CASCADE
);

-- Table `notes` — Relevés de notes alignés sur le PV officiel.
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
    resultat ENUM('ADM','RAT','ELI') NULL,
    periode_saisie_ouverte TINYINT(1) DEFAULT 0,
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

-- Insertion des données de base (Seed) pour les rôles et l'administrateur
INSERT INTO roles (libelle, description) VALUES
('Administrateur', 'Accès total au système'),
('Enseignant', 'Gestion des notes, absences et supports de cours'),
('Agent', 'Agent de scolarité pour consultation et gestion basique');

INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, id_role, actif) VALUES
('Admin', 'Super', 'admin@univ-oran.dz', 'admin123', 1, 1);
