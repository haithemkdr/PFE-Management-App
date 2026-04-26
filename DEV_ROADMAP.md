# 🗺️ DEV_ROADMAP — PFE Application de Gestion Pédagogique

> **Source :** Synchronisé depuis le notebook NotebookLM "Portail de Gestion Pédagogique" + "Gestion Numérique des Notes"
> **Stack :** Node.js/Express (MVC) · MySQL/mysql2 · React.js (via Google Stitch) · Git/GitHub
> **Règle :** Avant chaque session de travail, relire ce fichier et cocher `[x]` les tâches terminées.

---

## Phase 1 — Fondation (Backend + BDD)

> Objectif : Mettre en place l'infrastructure serveur et la base de données opérationnelle.

- [x] **1.1** Création du schéma SQL (`database/schema.sql`) — 9 tables avec FK
- [x] **1.2** Initialiser le projet Node.js (`npm init`) + installer les dépendances (`express`, `mysql2`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken`)
- [x] **1.3** Configurer la connexion MySQL avec `mysql2/promise` dans `config/db.js`
- [x] **1.4** Structurer le projet en MVC :
  - [ ] `server.js` — Point d'entrée
  - [ ] `config/` — Configuration BDD et variables d'environnement
  - [ ] `routes/` — Définition des routes API REST
  - [ ] `controllers/` — Logique de traitement des requêtes
  - [ ] `middleware/` — Auth JWT, vérification des rôles
- [x] **1.5** Implémenter le module d'authentification :
  - [x] Route `POST /api/auth/login` — Connexion avec email/mot_de_passe
  - [x] Hachage bcrypt du mot de passe
  - [x] Génération et vérification du token JWT
  - [x] Middleware `authMiddleware.js` pour protéger les routes
  - [x] Middleware `roleMiddleware.js` pour le contrôle RBAC (Enseignant / Agent)
- [x] **1.6** Exécuter le `schema.sql` sur MySQL et vérifier les tables via phpMyAdmin
- [x] **1.7** Commit & push : `feat: fondation backend MVC avec auth JWT`

---

## Phase 2 — Modules Métier (CRUD + Logique)

> Objectif : Développer les API REST pour chaque cas d'utilisation du rapport.

### 2A — Gestion des Notes (UC-E02)
- [ ] **2A.1** CRUD notes : `GET /api/notes/:moduleId/:groupeId` · `POST /api/notes` · `PUT /api/notes/:id`
- [ ] **2A.2** Logique de calcul des moyennes conforme au PV officiel :
  - `moy1 = 0.40 * note_cc + 0.60 * note_ef`
  - `moy2 = 0.40 * note_cc + 0.60 * note_er` (rattrapage)
  - `moyenne_finale = MAX(moy1, moy2)`
  - `resultat = ADM si >= 10, RAT si session2 possible, ELI sinon`
- [ ] **2A.3** Validation : chaque note comprise entre 0.00 et 20.00
- [ ] **2A.4** Verrouillage : si `periode_saisie_ouverte = 0`, rejeter toute modification (intégrité pré-délibération)
- [ ] **2A.5** Traçabilité : chaque saisie horodatée avec `saisie_par` (id enseignant)

### 2B — Gestion des Absences (UC-E03)
- [ ] **2B.1** CRUD absences : `GET /api/absences/:affectationId` · `POST /api/absences` · `PUT /api/absences/:id`
- [ ] **2B.2** Liste alphabétique des étudiants, tous "Présent" par défaut
- [ ] **2B.3** Calcul automatique du taux d'absence cumulé par étudiant
- [ ] **2B.4** Modification possible dans les 48h suivant la séance

### 2C — Gestion des Supports de Cours (UC-E04)
- [ ] **2C.1** Upload de fichiers (PDF, DOCX) via `multer`
- [ ] **2C.2** Route `POST /api/supports` · `GET /api/supports/:affectationId` · `DELETE /api/supports/:id`
- [ ] **2C.3** Vérification du format et de la taille des fichiers

### 2D — Gestion des Utilisateurs & Affectations (Agent)
- [ ] **2D.1** CRUD utilisateurs (enseignants) : `GET` · `POST` · `PUT` · `DELETE`
- [ ] **2D.2** CRUD affectations : associer enseignant → module → groupe → année
- [ ] **2D.3** CRUD étudiants et groupes
- [ ] **2D.4** Ouverture/fermeture des périodes de saisie par l'agent

- [ ] **2.END** Commit & push : `feat: modules métier notes, absences, supports, affectations`

---

## Phase 3 — Interface Utilisateur (React via Google Stitch)

> Objectif : Intégrer les composants UI générés par Google Stitch avec le backend API.

- [ ] **3.1** Initialiser le projet React (Vite ou CRA) dans `client/`
- [ ] **3.2** Configurer le proxy API vers le backend Express
- [ ] **3.3** Page de connexion (login) — formulaire email/mot_de_passe → JWT
- [ ] **3.4** Tableau de bord Enseignant :
  - [ ] Vue emploi du temps (UC-E01) — calendrier hebdomadaire
  - [ ] Tableau de saisie des notes (UC-E02) — grille éditable
  - [ ] Formulaire d'appel (UC-E03) — liste avec toggle Présent/Absent
  - [ ] Section supports de cours (UC-E04) — upload + liste des fichiers
- [ ] **3.5** Tableau de bord Agent :
  - [ ] Gestion des comptes enseignants
  - [ ] Gestion des affectations module/groupe
  - [ ] Ouverture/fermeture des périodes de saisie
- [ ] **3.6** Composants réutilisables : `Navbar`, `Sidebar`, `DataTable`, `Modal`
- [ ] **3.7** Commit & push : `feat: intégration frontend React avec backend API`

---

## Phase 4 — Tests, Sécurité & Finalisation

> Objectif : Valider le fonctionnement complet et la conformité avec le cahier des charges.

- [ ] **4.1** Tests manuels de chaque cas d'utilisation (scénarios nominaux + alternatifs)
- [ ] **4.2** Vérification de la sécurité :
  - [ ] Mots de passe hashés (bcrypt) — jamais en clair
  - [ ] Tokens JWT avec expiration
  - [ ] RBAC fonctionnel (Enseignant ne peut pas accéder aux routes Agent)
  - [ ] Permissions départementales et de données
- [ ] **4.3** Vérification de la conformité :
  - [ ] Notes alignées sur le PV réel (Annexe 1)
  - [ ] Fiches d'absence alignées sur les séances S1-S10 (Annexe 2)
  - [ ] Intégrité référentielle : pas de note orpheline, pas d'étudiant sans groupe
- [ ] **4.4** Captures d'écran pour le rapport PFE (chapitre Implémentation)
- [ ] **4.5** Déploiement local final + documentation README
- [ ] **4.6** Commit & push : `release: v1.0 application PFE complète`

---

## 📌 Engagement de Workflow

> À chaque nouvelle session de travail, l'agent :
> 1. **Lit** ce fichier `DEV_ROADMAP.md`
> 2. **Identifie** la prochaine tâche non cochée `[ ]`
> 3. **Exécute** la tâche
> 4. **Coche** la tâche `[x]` une fois terminée
> 5. **Commit** les changements avec un message descriptif
>
> Ce fichier est la **source de vérité** pour l'avancement du projet.
