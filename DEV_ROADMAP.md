# 🗺️ DEV_ROADMAP — PFE Application de Gestion Pédagogique

> **Source :** Synchronisé depuis le notebook NotebookLM "Portail de Gestion Pédagogique" + "Gestion Numérique des Notes"
> **Stack :** Node.js/Express (MVC) · MySQL/mysql2 · React.js (via Google Stitch) · Git/GitHub
> **Règle :** Avant chaque session de travail, relire ce fichier et cocher `[x]` les tâches terminées.
> **Dernière mise à jour :** 2026-05-22 — Phase 5 sécurité + intégrité terminée (rate limiting + check-data-integrity ✅)

---

## Phase 1 — Fondation (Backend + BDD)

> Objectif : Mettre en place l'infrastructure serveur et la base de données opérationnelle.

- [x] **1.1** Création du schéma SQL (`database/schema.sql`) — 9 tables avec FK
- [x] **1.2** Initialiser le projet Node.js (`npm init`) + installer les dépendances (`express`, `mysql2`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken`)
- [x] **1.3** Configurer la connexion MySQL avec `mysql2/promise` dans `config/db.js`
- [x] **1.4** Structurer le projet en MVC :
  - [x] `server.js` — Point d'entrée
  - [x] `config/` — Configuration BDD et variables d'environnement
  - [x] `routes/` — Définition des routes API REST
  - [x] `controllers/` — Logique de traitement des requêtes
  - [x] `middleware/` — Auth JWT, vérification des rôles
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

### 2A — Gestion des Notes (UC-E02) ✅
- [x] **2A.1** CRUD notes : `GET /api/notes?id_module=X&id_groupe=Y` · `POST /api/notes/upsert`
- [x] **2A.2** Logique de calcul des moyennes conforme au PV officiel :
  - `moy1 = poids_cc * note_cc + poids_ef * note_ef` *(pondérations dynamiques depuis BDD)*
  - `moy2 = poids_cc * note_cc + poids_ef * note_er` (rattrapage)
  - `moyenne_finale = MAX(moy1, moy2)`
  - `resultat = ADM si >= 10, RAT si >= 5, ELI si < 5`
- [x] **2A.3** Validation : chaque note comprise entre 0.00 et 20.00
- [x] **2A.4** Verrouillage : si `periode_saisie_ouverte = 0`, rejeter toute modification (intégrité pré-délibération)
- [x] **2A.5** Traçabilité : chaque saisie horodatée avec `saisie_par` (id enseignant via JWT `id_utilisateur`)

### 2B — Gestion des Absences (UC-E03) ✅
- [x] **2B.1** CRUD absences : `GET /api/absences/:affectationId` · `POST /api/absences` · `PUT /api/absences/:id`
- [x] **2B.2** Liste alphabétique des étudiants, tous "Présent" par défaut
- [ ] **2B.3** Calcul automatique du taux d'absence cumulé par étudiant *(Phase 4)*
- [ ] **2B.4** Modification possible dans les 48h suivant la séance *(Phase 4)*

### 2C — Gestion des Supports de Cours (UC-E04) ✅
- [x] **2C.1** Upload de fichiers (PDF, DOCX) via `multer`
- [x] **2C.2** Route `POST /api/supports/upload` · `GET /api/supports/:affectationId` · `DELETE /api/supports/:id`
- [x] **2C.3** Vérification du format et de la taille des fichiers

### 2D — Gestion des Utilisateurs & Affectations (Agent) ✅
- [x] **2D.1** CRUD utilisateurs (enseignants) : `GET` · `POST` · `PUT` · `PATCH statut`
- [x] **2D.2** CRUD affectations : associer enseignant → module → groupe → année
- [x] **2D.3** CRUD étudiants et groupes
- [x] **2.END** Commit & push : `feat: modules métier notes, absences, supports, affectations`

### 2E — Annonces & Messages aux Étudiants (UC-E05) ✅
- [x] **2E.1** Route `POST /api/annonces` — créer et envoyer une annonce à un groupe
- [x] **2E.2** Route `GET /api/annonces?id_enseignant=X` — liste des annonces envoyées
- [x] **2E.3** Route `DELETE /api/annonces/:id_annonce` — suppression d'une annonce
- [x] **2E.4** Validation : titre et contenu non vides, groupe destinataire valide
- [x] **2E.5** Ownership guard : JWT `id_utilisateur` vérifié avant suppression

### 2F — Emploi du Temps Enseignant (UC-E06) ✅
- [x] **2F.1** Route `GET /api/emploi-du-temps/:id_enseignant` — retourner les créneaux de la semaine courante
- [x] **2F.2** Ownership guard : l'enseignant ne peut modifier que ses propres créneaux
- [x] **2F.3** Réponse structurée : `{ jour, heure_debut, heure_fin, module, groupe, salle, type (CM/TD/TP) }`

### 2G — Agent Pédagogique — Conformité Complète (UC-A01 à UC-A06) ✅ *[NOUVEAU — 2026-05-16]*
- [x] **2G.1** REQ-1 : Gérer les comptes enseignants — `GET/POST /api/agent/enseignants` · `PUT /api/agent/enseignants/:id` · `PATCH /api/agent/enseignants/:id/statut`
  - Hash bcryptjs du mot de passe à la création
  - Vérification unicité email (HTTP 409)
  - Protection : seuls les comptes `id_role=2` peuvent être activés/désactivés
- [x] **2G.2** REQ-2 : Affecter les enseignants aux modules et groupes — `POST /api/agent/affectation` *(existait, confirmé)*
- [x] **2G.3** REQ-3 : Définir les règles de calcul des notes — `PUT /api/agent/modules/:id/regles-notes`
  - Validation mathématique : `poids_cc + poids_ef = 1.00` (HTTP 400 sinon)
  - Les notes sont recalculées dynamiquement à chaque saisie via ces poids
- [x] **2G.4** REQ-4 : Autoriser/verrouiller la saisie des notes — `PUT /api/agent/periode-saisie` *(existait, confirmé)*
- [x] **2G.5** REQ-5 : Superviser le dépôt des cours — `GET /api/agent/supports`
  - Vue enrichie 4 tables JOIN : fichier + enseignant + module + groupe + date
- [x] **2G.6** REQ-6 : Mettre à jour l'emploi du temps — `GET/POST/PUT /api/agent/edt` · `DELETE /api/agent/edt/:id`
  - Vérification existence de l'affectation avant CREATE/UPDATE
  - `upsertCreneauAgent` : même endpoint pour créer (sans `id_creneau`) et modifier (avec `id_creneau`)

- [x] **2.G.END** Commit & push : `feat: conformité complète agent pédagogique (6/6 UC-A)`

---

## Phase 3 — Interface Utilisateur (Figma / React via Google Stitch)

> Objectif : Créer et raffiner les maquettes UI, puis intégrer les composants React avec le backend.

### 3A — Maquettes Figma (Design System) ✅ *[Complété — 2026-05-17]*
- [x] **3A.1** Identité visuelle **TRACE** (Teacher Record and Academic Control Environment) appliquée sur toutes les vues.
- [x] **3A.2** Design system défini : tokens couleur (ex: `--primary` #1B3A5C, `--danger` #C62828), typographie, grille 1440×900.
- [x] **3A.3** 14 pages Figma créées et validées (alignées sur le MVP) :
  - Page 01 : Login (avec branding TRACE)
  - Pages 02–07 : Interfaces Enseignant (Dashboard, Notes, Absences, Supports, Annonces, EDT)
  - Page 08 : Agent Dashboard
  - Pages 09–14 : Interfaces Agent (09-Gestion Enseignants, 10-Gestion Affectations, 11-Règles des Notes, 12-Périodes de Saisie, 13-Supervision des Supports, 14-Gestion Emploi du Temps). La page "Gestion Étudiants" a été retirée du MVP.
- [x] **3A.4** Sidebar normalisée sur toutes les pages (icons Feather, spacing 16/14px, gap 12px).
  - Sidebar Agent stricte à 7 items : Tableau de bord + 6 Fonctions Obligatoires (A01-A06).
- [x] **3A.5** Navbar globale normalisée : Titre/Logo TRACE à gauche, Nom d'utilisateur et bouton "Déconnexion" (couleur `--danger` #C62828) à droite.

### 3B — Intégration React (En cours)
- [x] **3B.1** Initialiser le projet React (Vite) dans `client/` avec configuration du proxy API (`/api` → `http://localhost:5000`).
- [x] **3B.2** Implémenter le Layout Global et les composants partagés :
  - [x] `Navbar` : Branding TRACE, affichage du nom de l'utilisateur, bouton "Déconnexion" fonctionnel (clear token + redirect `/login`).
  - [x] `Sidebar` : Menu dynamique basé sur le `role` du JWT (Enseignant vs Agent) avec icônes Feather.
  - [x] `DataTable`, `Modal`, `ProtectedRoute`.
- [x] **3B.3** Page de connexion (`LoginPage`) — formulaire email/mot_de_passe → JWT → redirect selon rôle.
- [x] **3B.4** Interfaces Enseignant (Génération Stitch & Connexion API) :
  - [x] Dashboard (UC-E01) — stat cards + tableau mes affectations.
  - [x] Notes (UC-E02) — grille éditable CC/EF/ER.
  - [x] Absences (UC-E03) — liste avec toggle Présent/Absent.
  - [x] Supports (UC-E04) — upload + liste des fichiers.
  - [x] Annonces (UC-E05) — formulaire + tableau.
  - [x] Emploi du Temps (UC-E06) — grille hebdomadaire Lun–Sam.
- [x] **3B.5** Interfaces Agent (Génération Stitch & Connexion API) :
  - [x] `TeachersListPage` (A01) : CRUD Enseignants.
  - [x] `AssignmentsPage` (A02) : Affectations (enseignant → module → groupe).
  - [x] `GradeRulesPage` (A03) : Configuration des poids CC/EF par module.
  - [x] `GradePeriodPage` (A04) : Ouverture/fermeture des périodes de saisie.
  - [x] `ContinueonPage` (A05) : Vue globale des supports déposés.
  - [x] `EdtManagementPage` (A06) : Vue globale et CRUD des créneaux EDT.
- [x] **3B.6** Commit & push : `feat: intégration frontend React avec backend API`

---

## Phase 5 — Tests, Sécurité & Finalisation

> Objectif : Valider le fonctionnement complet et la conformité avec le cahier des charges.

- [x] **5.1** Tests manuels de chaque cas d'utilisation (scénarios nominaux + alternatifs)
- [x] **5.2** Vérification de la sécurité :
  - [x] Mots de passe hashés (bcryptjs) — jamais en clair
  - [x] Tokens JWT avec expiration
  - [x] RBAC fonctionnel (Enseignant ne peut pas accéder aux routes Agent)
  - [x] Ownership guards sur annonces et EDT
  - [x] Rate limiting sur `/api/auth/login` — `express-rate-limit` (10 req/15min/IP)
- [x] **5.3** Vérification de la conformité :
  - [x] Notes alignées sur le PV réel (pondérations dynamiques)
  - [x] Fiches d'absence alignées sur les séances
  - [x] Intégrité référentielle : `scripts/check-data-integrity.js` — 0 problèmes détectés ✅
- [x] **5.4** Captures d'écran pour le rapport PFE (chapitre Implémentation)
- [x] **5.5** Déploiement local final + documentation README
- [ ] **5.6** Commit & push : `release: v1.0 application PFE complète`

---

## 📊 Tableau de Bord de Conformité

| Rôle | UC | Fonction | Backend | Figma | React |
|------|-----|----------|---------|-------|-------|
| **Enseignant** | UC-E01 | Consulter modules & groupes affectés | ✅ | ✅ P02 | ✅ |
| **Enseignant** | UC-E02 | Saisir les notes (CC, TD, TP, Examen) | ✅ | ✅ P03 | ✅ |
| **Enseignant** | UC-E03 | Effectuer l'appel (présences/absences) | ✅ | ✅ P04 | ✅ |
| **Enseignant** | UC-E04 | Déposer des supports de cours | ✅ | ✅ P05 | ✅ |
| **Enseignant** | UC-E05 | Envoyer des annonces aux étudiants | ✅ | ✅ P06 | ✅ |
| **Enseignant** | UC-E06 | Consulter son emploi du temps | ✅ | ✅ P07 | ✅ |
| **Agent Péd.** | UC-A01 | Gérer les comptes enseignants | ✅ | ✅ P09 | ✅ |
| **Agent Péd.** | UC-A02 | Affecter enseignants aux modules/groupes | ✅ | ✅ P10 | ✅ |
| **Agent Péd.** | UC-A03 | Définir les règles de calcul des notes | ✅ | ✅ P11 | ✅ |
| **Agent Péd.** | UC-A04 | Autoriser/verrouiller la saisie des notes | ✅ | ✅ P12 | ✅ |
| **Agent Péd.** | UC-A05 | Superviser le dépôt des cours | ✅ | ✅ P13 | ✅ |
| **Agent Péd.** | UC-A06 | Mettre à jour l'emploi du temps | ✅ | ✅ P14 | ✅ |

**Légende :** ✅ Terminé · ⬜ À faire · 🔄 En cours

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
