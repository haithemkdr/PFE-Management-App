-- ============================================================
-- Schéma de la base de données `pfe_app`
-- Synchronisé avec la base de données de production
-- Dernière mise à jour : 2026-06-02
-- ============================================================

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
    mot_de_passe_clair VARCHAR(255) DEFAULT NULL,
    id_role INT,
    actif TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_role) REFERENCES roles(id_role) ON DELETE SET NULL
);

-- Table `formations` — Formations (maquettes LMD) du département.
CREATE TABLE IF NOT EXISTS formations (
    id_formation INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    nom_complet VARCHAR(200) DEFAULT NULL,
    domaine VARCHAR(100) DEFAULT NULL,
    branche VARCHAR(100) DEFAULT NULL,
    cycle VARCHAR(50) DEFAULT 'licence',
    niveau INT DEFAULT 1,
    annee_debut VARCHAR(20) DEFAULT NULL,
    annee_expiration VARCHAR(20) DEFAULT NULL
);

-- Table `unites_enseignement` — Unités d'enseignement rattachées à une formation.
CREATE TABLE IF NOT EXISTS unites_enseignement (
    id_ue INT AUTO_INCREMENT PRIMARY KEY,
    id_formation INT NOT NULL,
    code_ue VARCHAR(50) NOT NULL,
    titre VARCHAR(200) DEFAULT NULL,
    semestre VARCHAR(10) DEFAULT NULL,
    coefficient DECIMAL(3,1) DEFAULT 1.0,
    credits INT DEFAULT 0,
    credits_origine INT DEFAULT 0,
    FOREIGN KEY (id_formation) REFERENCES formations(id_formation) ON DELETE CASCADE
);

-- Table `modules` — Catalogue des matières enseignées.
-- poids_exam, poids_td, poids_tp : pondérations configurables (ex: 0.60, 0.20, 0.20)
CREATE TABLE IF NOT EXISTS modules (
    id_module INT AUTO_INCREMENT PRIMARY KEY,
    nom_module VARCHAR(100) NOT NULL,
    code_module VARCHAR(50) DEFAULT NULL,
    coefficient DECIMAL(3,1) NOT NULL,
    semestre ENUM('S1','S2','S3','S4','S5','S6') NOT NULL DEFAULT 'S1',
    credits INT DEFAULT 6,
    id_ue INT DEFAULT NULL,
    id_formation INT DEFAULT NULL,
    poids_exam DECIMAL(3,2) DEFAULT 0.60,
    poids_td DECIMAL(3,2) DEFAULT 0.20,
    poids_tp DECIMAL(3,2) DEFAULT 0.20,
    est_cloture TINYINT(1) DEFAULT 0,
    FOREIGN KEY (id_ue) REFERENCES unites_enseignement(id_ue) ON DELETE SET NULL,
    FOREIGN KEY (id_formation) REFERENCES formations(id_formation) ON DELETE SET NULL
);

-- Table `groupes` — Les groupes d'étudiants (TD, TP, Cours).
CREATE TABLE IF NOT EXISTS groupes (
    id_groupe INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL,
    niveau VARCHAR(50) DEFAULT 'L3',
    section VARCHAR(50) DEFAULT 'A',
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
-- est_responsable_matiere : 0 = enseignant ordinaire, 1 = responsable de module (peut gérer tous les groupes)
-- statut_saisie : EN_COURS = saisie en cours, SOUMIS = notes soumises pour validation
-- type_seance : CM → affectation à une section entière (id_groupe NULL)
--              TD/TP → affectation à un groupe spécifique
CREATE TABLE IF NOT EXISTS affectations (
    id_affectation INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT,
    id_module INT,
    id_groupe INT NULL,
    annee_univ VARCHAR(20),
    periode_saisie_ouverte TINYINT(1) DEFAULT 0,
    type_seance ENUM('CM','TD','TP') NOT NULL DEFAULT 'TD',
    section VARCHAR(50) NULL,
    niveau VARCHAR(50) NULL,
    est_responsable_matiere TINYINT(1) DEFAULT 0,
    statut_saisie ENUM('EN_COURS','SOUMIS') DEFAULT 'EN_COURS',
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_groupe) REFERENCES groupes(id_groupe) ON DELETE CASCADE,
    UNIQUE KEY uq_affectation (id_utilisateur, id_module, id_groupe, type_seance)
);

-- Table `notes` — Relevés de notes alignés sur le PV officiel.
-- note_td, note_tp : notes de contrôle continu (TD et TP séparées)
-- session_validation : indique si la note finale est issue de la session normale ou rattrapage
CREATE TABLE IF NOT EXISTS notes (
    id_note INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT,
    id_module INT,
    note_td DECIMAL(4,2) NULL,
    note_tp DECIMAL(4,2) NULL,
    note_ef DECIMAL(4,2) NULL,
    moy1 DECIMAL(4,2) NULL,
    note_er DECIMAL(4,2) NULL,
    moy2 DECIMAL(4,2) NULL,
    moyenne_finale DECIMAL(4,2) NULL,
    resultat ENUM('ADM','RAT','ELI','EXC') NULL,
    saisie_par INT,
    date_saisie DATETIME DEFAULT NOW(),
    session_validation ENUM('NORMALE','RATTRAPAGE') NULL,
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
    type_fichier VARCHAR(255),
    uploaded_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_affectation) REFERENCES affectations(id_affectation) ON DELETE CASCADE
);

-- Table `annonces` — Messages envoyés par un enseignant à un groupe.
CREATE TABLE IF NOT EXISTS annonces (
    id_annonce INT AUTO_INCREMENT PRIMARY KEY,
    id_enseignant INT NOT NULL,
    id_groupe INT NOT NULL,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT NOW(),
    FOREIGN KEY (id_enseignant) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_groupe) REFERENCES groupes(id_groupe) ON DELETE CASCADE
);

-- Table `emploi_du_temps` — Créneaux hebdomadaires d'un enseignant.
CREATE TABLE IF NOT EXISTS emploi_du_temps (
    id_creneau INT AUTO_INCREMENT PRIMARY KEY,
    id_affectation INT NOT NULL,
    jour ENUM('Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    salle VARCHAR(50),
    type_seance ENUM('CM','TD','TP') NOT NULL,
    FOREIGN KEY (id_affectation) REFERENCES affectations(id_affectation) ON DELETE CASCADE
);

-- Table `sessions` — Sessions de validation (normale / rattrapage) par semestre.
CREATE TABLE IF NOT EXISTS sessions (
    id_session INT AUTO_INCREMENT PRIMARY KEY,
    annee_univ VARCHAR(20) NOT NULL,
    semestre VARCHAR(5) NOT NULL,
    type_session ENUM('NORMALE','RATTRAPAGE') DEFAULT 'NORMALE',
    verrouille TINYINT DEFAULT 0,
    UNIQUE KEY unique_session (annee_univ, semestre)
);

-- Table `deliberations` — Résultats des délibérations annuelles par étudiant.
CREATE TABLE IF NOT EXISTS deliberations (
    id_deliberation INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NOT NULL,
    annee_univ VARCHAR(20) NOT NULL,
    niveau VARCHAR(5) NOT NULL,
    semestre_1 VARCHAR(5) DEFAULT NULL,
    semestre_2 VARCHAR(5) DEFAULT NULL,
    moyenne_s1 DECIMAL(4,2) DEFAULT NULL,
    moyenne_s2 DECIMAL(4,2) DEFAULT NULL,
    moyenne_annuelle DECIMAL(4,2) DEFAULT NULL,
    moyenne_originale DECIMAL(4,2) DEFAULT NULL,
    credits_acquis INT DEFAULT 0,
    credits_max INT DEFAULT 60,
    seuil_rachat DECIMAL(4,2) DEFAULT NULL,
    decision ENUM(
        'Admis(e) (session normale)',
        'Admis(e) (session rattrapage)',
        'Admis(e) (Rachat)',
        'Admis(e) avec dettes',
        'Ajourné(e)'
    ) NOT NULL,
    rachat TINYINT DEFAULT 0,
    delibere_par INT DEFAULT NULL,
    date_deliberation DATETIME DEFAULT NOW(),
    UNIQUE KEY unique_delib (id_etudiant, annee_univ),
    FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant)
);
