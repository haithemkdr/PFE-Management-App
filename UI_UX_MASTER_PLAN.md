# 🎨 UI/UX Master Plan — PFE Management Application

> Blueprint pour la génération des composants React via Google Stitch.
> Basé sur l'analyse complète du backend (schema.sql, controllers, routes, middleware).

---

## 1. Architecture Globale

### 1.1 Stack Frontend
- **Framework** : React 18+ (Vite)
- **Routing** : React Router v6
- **State** : React Context + useState (simple, niveau L3)
- **HTTP** : fetch natif avec wrapper `api.js`
- **Style** : CSS Modules ou Vanilla CSS (thème académique)

### 1.2 Thème & Couleurs (Style Académique)

| Token            | Valeur      | Usage                          |
|------------------|-------------|--------------------------------|
| `--primary`      | `#1B3A5C`   | Bleu université (navbar, titres) |
| `--secondary`    | `#2E7D32`   | Vert validation (ADM, succès)  |
| `--accent`       | `#F57C00`   | Orange action (boutons CTA)    |
| `--danger`       | `#C62828`   | Rouge (ELI, erreurs, absences) |
| `--warning`      | `#F9A825`   | Jaune (RAT, avertissements)    |
| `--bg-light`     | `#F5F7FA`   | Fond de page                   |
| `--bg-card`      | `#FFFFFF`   | Fond des cartes                |
| `--text-primary` | `#1A1A2E`   | Texte principal                |
| `--text-muted`   | `#6B7280`   | Texte secondaire               |
| `--border`       | `#E5E7EB`   | Bordures des tableaux          |

### 1.3 Typographie
- **Titres** : `Inter` ou `Poppins` (Google Fonts)
- **Corps** : `Inter`, 14px base
- **Monospace** : `JetBrains Mono` (matricules, codes)

### 1.4 Layout Global

```
┌─────────────────────────────────────────────┐
│                  Navbar                      │
│  [Logo PFE]  [Nom Utilisateur]  [Déconnexion]│
├──────────┬──────────────────────────────────┤
│          │                                   │
│ Sidebar  │         Main Content              │
│          │                                   │
│ - Menu 1 │   ┌─────────────────────────┐    │
│ - Menu 2 │   │    Page Component       │    │
│ - Menu 3 │   │                         │    │
│          │   └─────────────────────────┘    │
│          │                                   │
└──────────┴──────────────────────────────────┘
```

---

## 2. Pages & Vues

### 2.1 Pages Communes
| Page         | Route          | Rôle     | Description                        |
|--------------|----------------|----------|------------------------------------|
| LoginPage    | `/login`       | Tous     | Formulaire email + mot de passe    |
| NotFoundPage | `/*`           | Tous     | Page 404                           |

### 2.2 Pages Enseignant
| Page               | Route                          | Description                           |
|--------------------|--------------------------------|---------------------------------------|
| TeacherDashboard   | `/enseignant`                  | Vue d'accueil avec stats rapides      |
| GradesPage         | `/enseignant/notes`            | Saisie des notes par module/groupe    |
| AttendancePage     | `/enseignant/absences`         | Fiche d'appel par séance              |
| CourseMaterialPage | `/enseignant/supports`         | Upload et gestion des supports        |
| AnnouncementsPage  | `/enseignant/annonces`         | Envoyer des annonces aux étudiants    |
| SchedulePage       | `/enseignant/emploi-du-temps`  | Consulter son emploi du temps hebdo   |

### 2.3 Pages Agent
| Page                  | Route                       | Description                                      |
|-----------------------|-----------------------------|--------------------------------------------------|
| AgentDashboard        | `/agent`                    | Vue d'accueil agent — KPIs + alertes              |
| TeachersListPage      | `/agent/enseignants`        | CRUD enseignants (créer/modifier/activer)         |
| AssignmentsPage       | `/agent/affectations`       | Affecter enseignant → module → groupe             |
| GradeRulesPage        | `/agent/regles-notes`       | Définir poids CC/EF par module *(REQ-3 — NOUVEAU)*|
| GradePeriodPage       | `/agent/periodes`           | Ouvrir/verrouiller la saisie des notes            |
| SupportsSupervisionPage | `/agent/supports`         | Vue globale de tous les dépôts de cours *(REQ-5 — NOUVEAU)*|
| EdtManagementPage     | `/agent/edt`                | Gérer tous les créneaux EDT *(REQ-6 — NOUVEAU)*  |

---

## 3. Component Breakdown (Pour Google Stitch)

### 3.0 Composants Réutilisables

#### `Navbar`
- **Purpose** : Barre de navigation supérieure persistante
- **UI Elements** : Logo/titre "PFE Management", nom de l'utilisateur connecté (`utilisateur.prenom + nom`), badge du rôle, bouton Déconnexion
- **Data** : Lit depuis le contexte Auth (token décodé)

#### `Sidebar`
- **Purpose** : Menu latéral de navigation adapté au rôle
- **UI Elements** :
  - **Enseignant** (6 items) : Accueil · Notes · Absences · Supports · Annonces · Emploi du temps
  - **Agent MVP** (6 items, un par exigence) :

| # | Label sidebar         | Route                   | Icône Feather  | REQ  |
|---|-----------------------|-------------------------|----------------|------|
| 1 | Tableau de bord       | `/agent`                | `home`         | —    |
| 2 | Enseignants           | `/agent/enseignants`    | `users`        | A01  |
| 3 | Affectations          | `/agent/affectations`   | `link`         | A02  |
| 4 | Règles des notes      | `/agent/regles-notes`   | `sliders`      | A03  |
| 5 | Périodes de saisie    | `/agent/periodes`       | `lock`         | A04  |
| 6 | Supervision cours     | `/agent/supports`       | `folder`       | A05  |
| 7 | Emploi du temps       | `/agent/edt`            | `calendar`     | A06  |

- **Data** : `role` depuis le JWT
- **Design** : Icons Feather (stroke 1.5px, MITER), padding 16px/14px, gap 12px entre items, item actif fond `--primary` opacité 15% + texte `--primary`
- **Note MVP** : Items Étudiants / Modules / Filières / Statistiques / Configuration réservés pour Phase 4

#### `DataTable`
- **Purpose** : Tableau de données réutilisable avec en-têtes triables
- **UI Elements** : En-têtes de colonnes, lignes de données, état vide "Aucune donnée"

#### `Modal`
- **Purpose** : Fenêtre modale pour confirmations et formulaires
- **UI Elements** : Titre, contenu, boutons Annuler/Confirmer

#### `ProtectedRoute`
- **Purpose** : Wrapper de route qui vérifie le token JWT et le rôle
- **Data** : Token depuis localStorage, rôle depuis le JWT décodé

---

### 3.1 LoginPage

#### `LoginForm`
- **Purpose** : Formulaire de connexion
- **API Mapping** : `POST /api/auth/login`
  - **Request body** : `{ email, mot_de_passe }`
  - **Response** : `{ token, utilisateur: { id, nom, prenom, email, role } }`
- **UI Elements** :
  - Input email (type email, placeholder "votre.email@univ.dz")
  - Input mot de passe (type password)
  - Bouton "Se connecter" (style `--primary`)
  - Message d'erreur en rouge si 401
- **Post-login** : Stocker le token dans `localStorage`, rediriger selon `role` :
  - `Enseignant` → `/enseignant`
  - `Agent` → `/agent`
  - `Administrateur` → `/agent`

---

### 3.2 TeacherDashboard

#### `TeacherWelcomeCard`
- **Purpose** : Message de bienvenue avec infos de l'enseignant
- **API Mapping** : `GET /api/profil` (headers: `Authorization: Bearer <token>`)
  - **Response** : `{ utilisateur: { id_utilisateur, email, role } }`
- **UI Elements** : "Bienvenue, Mohamed Benali", badge "Enseignant", date du jour

---

### 3.3 GradesPage (Saisie des Notes)

#### `ModuleGroupeSelector`
- **Purpose** : Sélecteurs déroulants pour choisir le module et le groupe
- **UI Elements** :
  - Select "Module" (ex: Bases de Données, Programmation Web)
  - Select "Groupe" (ex: L3-G1, L3-G2)
  - Bouton "Charger" pour lancer la requête
- **Note** : Les listes de modules/groupes peuvent être codées en dur ou venir d'une future API

#### `GradesTable`
- **Purpose** : Grille de saisie des notes avec calcul automatique
- **API Mapping** :
  - **Lecture** : `GET /api/notes?id_module=X&id_groupe=Y`
    - **Response** : `[{ id_etudiant, matricule, nom, prenom, id_note, note_cc, note_ef, note_er, moyenne_finale, resultat }]`
  - **Écriture** : `POST /api/notes/upsert`
    - **Request** : `{ id_etudiant, id_module, note_cc, note_ef, note_er }`
    - **Response** : `{ message: "La note est bien enregistrée" }`
- **UI Elements** (colonnes du tableau) :

| Colonne        | Type     | Éditable | Source                |
|----------------|----------|----------|-----------------------|
| Matricule      | Texte    | Non      | `matricule`           |
| Nom            | Texte    | Non      | `nom`                 |
| Prénom         | Texte    | Non      | `prenom`              |
| Note CC (/20)  | Input    | Oui      | `note_cc`             |
| Note EF (/20)  | Input    | Oui      | `note_ef`             |
| Note ER (/20)  | Input    | Oui      | `note_er`             |
| Moyenne Finale | Texte    | Non      | `moyenne_finale`      |
| Résultat       | Badge    | Non      | `resultat` (ADM/RAT/ELI) |
| Action         | Bouton   | —        | "Enregistrer"         |

- **Badges Résultat** :
  - `ADM` → badge vert (`--secondary`)
  - `RAT` → badge jaune (`--warning`)
  - `ELI` → badge rouge (`--danger`)
- **Validation** : Notes entre 0 et 20, champs numériques uniquement

---

### 3.4 AttendancePage (Fiche d'Appel)

#### `AttendanceDateSelector`
- **Purpose** : Sélecteur de module, groupe et date de séance
- **UI Elements** :
  - Select "Module"
  - Select "Groupe"
  - Input date (type date, défaut = aujourd'hui)
  - Bouton "Charger la fiche"

#### `AttendanceList`
- **Purpose** : Liste des étudiants avec toggle Présent/Absent
- **API Mapping** :
  - **Lecture** : `GET /api/absences/appel/:id_module/:id_groupe/:date_seance`
    - **Response** : `[{ id_etudiant, matricule, nom, prenom, id_absence, statut, justifiee }]`
  - **Écriture** : `POST /api/absences/enregistrer`
    - **Request** : `{ id_etudiant, id_affectation, date_seance, statut }`
    - **Response** : `{ message: "Le statut a été enregistré" }`
- **UI Elements** :

| Colonne    | Type          | Description                              |
|------------|---------------|------------------------------------------|
| Matricule  | Texte         | `matricule`                              |
| Nom        | Texte         | `nom`                                    |
| Prénom     | Texte         | `prenom`                                 |
| Statut     | Toggle/Switch | Présent (vert) ↔ Absent (rouge)          |
| Justifiée  | Checkbox      | Case à cocher si absence justifiée       |

- **Comportement** : Chaque toggle envoie immédiatement un `POST /api/absences/enregistrer`
- **Note** : `id_affectation` doit être résolu côté front à partir du module+groupe sélectionnés

---

### 3.5 CourseMaterialPage (Supports de Cours)

#### `SupportUploadForm`
- **Purpose** : Formulaire d'upload de fichiers PDF/DOCX
- **API Mapping** : `POST /api/supports/upload` (multipart/form-data)
  - **Request** : FormData avec `fichier` (File), `titre` (string), `id_affectation` (int)
  - **Response** : `{ message, fichier: "nom_du_fichier" }`
- **UI Elements** :
  - Input "Titre du document"
  - Select "Affectation" (module + groupe)
  - Zone de drop / bouton "Choisir un fichier" (PDF, DOC, DOCX uniquement)
  - Bouton "Uploader"

#### `SupportsList`
- **Purpose** : Liste des supports uploadés pour une affectation
- **API Mapping** :
  - **Lecture** : `GET /api/supports/:id_affectation`
    - **Response** : `[{ id_support, id_affectation, titre, chemin_fichier, type_fichier, uploaded_at }]`
  - **Suppression** : `DELETE /api/supports/:id_support`
    - **Response** : `{ message: "Le support a été supprimé" }`
- **UI Elements** :

| Colonne      | Type    | Description                              |
|--------------|---------|------------------------------------------|
| Titre        | Texte   | `titre`                                  |
| Type         | Badge   | PDF (rouge) / DOCX (bleu)               |
| Date         | Texte   | `uploaded_at` formaté                    |
| Télécharger  | Lien    | `http://localhost:5000/uploads/{chemin}`  |
| Supprimer    | Bouton  | Icône poubelle → confirmation modal      |

---

### 3.6 AnnouncementsPage (Annonces)

#### `AnnouncementForm`
- **Purpose** : Formulaire pour rédiger et envoyer une annonce à un groupe
- **UI Elements** :
  - Input "Titre de l'annonce"
  - Select "Groupe destinataire" (tous les groupes affectés)
  - Textarea "Contenu du message"
  - Bouton "Envoyer" (style `--primary`)

#### `AnnouncementList`
- **Purpose** : Tableau des annonces déjà envoyées
- **UI Elements** :

| Colonne | Type | Description |
|---------|------|-------------|
| Titre | Texte | Sujet de l'annonce |
| Groupe | Badge bleu | Groupe destinataire |
| Date envoyée | Texte | Date de publication |
| Statut | Badge vert "Envoyé" | Confirmation |
| Action | Bouton "Supprimer" | Suppression avec confirmation |

---

### 3.7 SchedulePage (Emploi du Temps)

#### `WeeklyScheduleGrid`
- **Purpose** : Grille hebdomadaire des séances de l'enseignant
- **UI Elements** :
  - Sélecteur de semestre + navigation `< Semaine N >`
  - Grille : 6 colonnes (Lun–Sam) × 6 créneaux (08h00–16h30)
  - `SessionCard` par créneau :
    - Nom du module (bold)
    - Groupe (texte muted)
    - Salle (avec icône 📍)
    - Badge type : `CM` (bleu) / `TD` (vert) / `TP` (orange)
    - Bande colorée gauche par module

---

### 3.8 AgentDashboard

#### `AgentWelcomeCard`
- **Purpose** : Accueil agent avec statistiques rapides
- **UI Elements** : Message de bienvenue, compteurs (nb enseignants, nb affectations)

---

### 3.7 TeachersListPage (Gestion Enseignants — REQ-1)

#### `TeachersTable`
- **Purpose** : Afficher et gérer la liste des enseignants
- **API Mapping** :
  - **Lecture** : `GET /api/agent/enseignants` → `[{ id_utilisateur, nom, prenom, email, actif }]`
  - **Création** : `POST /api/agent/enseignants` → `{ nom, prenom, email, mot_de_passe }`
  - **Modification** : `PUT /api/agent/enseignants/:id` → `{ nom, prenom, email }`
  - **Activer/Désactiver** : `PATCH /api/agent/enseignants/:id/statut` → `{ actif: 0|1 }`
- **UI Elements** :

| Colonne | Type   | Source            |
|---------|--------|-------------------|
| ID      | Texte  | `id_utilisateur`  |
| Nom     | Texte  | `nom`             |
| Prénom  | Texte  | `prenom`          |
| Email   | Texte  | `email`           |
| Statut  | Badge  | `actif` → vert "Actif" / rouge "Inactif" |
| Actions | Boutons| Modifier (bleu) · Activer/Désactiver (toggle) |

---

### 3.8 GradeRulesPage (Règles de Calcul — REQ-3) *[NOUVEAU]*

#### `GradeRulesForm`
- **Purpose** : Définir les pondérations CC et EF par module
- **API Mapping** : `PUT /api/agent/modules/:id/regles-notes`
  - **Request** : `{ poids_cc: 0.40, poids_ef: 0.60 }` *(somme doit = 1.00)*
  - **Response** : `{ message, poids_cc, poids_ef }`
- **UI Elements** :
  - Liste des modules avec `poids_cc` et `poids_ef` actuels
  - Inputs numériques (0.00–1.00) pour modifier les poids
  - Barre de progression visuelle montrant le rapport CC/EF
  - Message d'avertissement si `poids_cc + poids_ef ≠ 1.00`
  - Bouton "Appliquer"

---

### 3.9 AssignmentsPage (Affectations — REQ-2)

#### `AssignmentForm`
- **Purpose** : Formulaire pour affecter un enseignant à un module/groupe
- **API Mapping** : `POST /api/agent/affectation`
  - **Request** : `{ id_utilisateur, id_module, id_groupe, annee_univ }`
  - **Response** : `{ message: "L'enseignant a bien été affecté au groupe." }`
- **UI Elements** :
  - Select "Enseignant" (alimenté par `GET /api/agent/enseignants`)
  - Select "Module"
  - Select "Groupe"
  - Input "Année universitaire" (ex: "2025-2026")
  - Bouton "Affecter"
- **Feedback** : Toast de succès vert ou message d'erreur rouge

---

### 3.10 GradePeriodPage (Périodes de Saisie — REQ-4)

#### `PeriodeToggleList`
- **Purpose** : Ouvrir/fermer la saisie des notes par module/groupe
- **API Mapping** : `PUT /api/agent/periode-saisie`
  - **Request** : `{ id_module, id_groupe?, periode_saisie_ouverte }` (1 = ouvert, 0 = fermé)
  - **Response** : `{ message: "La période de saisie a été mise à jour." }`
- **UI Elements** :

| Colonne             | Type          | Description                         |
|---------------------|---------------|-------------------------------------|
| Module              | Texte         | Nom du module                       |
| Groupe              | Texte         | Libellé groupe (optionnel)          |
| Statut              | Badge         | "Ouverte" (vert) / "Fermée" (rouge) |
| Action              | Toggle/Switch | Ouvrir ↔ Fermer                     |

---

### 3.11 SupportsSupervisionPage (Supervision Cours — REQ-5) *[NOUVEAU]*

#### `SupportsGlobalTable`
- **Purpose** : Vue administrateur de tous les supports déposés
- **API Mapping** : `GET /api/agent/supports`
  - **Response** : `[{ id_support, titre, chemin_fichier, type_fichier, uploaded_at, nom_enseignant, prenom_enseignant, nom_module, libelle_groupe }]`
- **UI Elements** :

| Colonne     | Type    | Description                       |
|-------------|---------|-----------------------------------|
| Titre       | Texte   | `titre`                           |
| Enseignant  | Texte   | `prenom_enseignant nom_enseignant` |
| Module      | Texte   | `nom_module`                      |
| Groupe      | Badge   | `libelle_groupe`                  |
| Type        | Badge   | PDF (rouge) / DOCX (bleu)         |
| Date dépôt  | Texte   | `uploaded_at` formaté             |
| Télécharger | Lien    | `/uploads/{chemin_fichier}`       |

---

### 3.12 EdtManagementPage (Emploi du Temps — REQ-6) *[NOUVEAU]*

#### `EdtGlobalGrid`
- **Purpose** : Vue et gestion globale de tous les créneaux horaires
- **API Mapping** :
  - **Lecture** : `GET /api/agent/edt` → vue complète enseignant + module + groupe
  - **Créer** : `POST /api/agent/edt` → `{ id_affectation, jour, heure_debut, heure_fin, salle, type_seance }`
  - **Modifier** : `PUT /api/agent/edt` → même body + `id_creneau`
  - **Supprimer** : `DELETE /api/agent/edt/:id`
- **UI Elements** :
  - Grille hebdomadaire globale (filtrable par enseignant / module)
  - Bouton "Ajouter un créneau" → Modal formulaire
  - Icônes Modifier/Supprimer sur chaque créneau

---

## 4. User Flow (Flux Utilisateur)

### 4.1 Flux de Connexion

```
[LoginPage] → POST /api/auth/login
    ├── 200 OK → Stocker token → Décoder JWT
    │       ├── role = "Enseignant" → redirect /enseignant
    │       ├── role = "Agent"      → redirect /agent
    │       └── role = "Administrateur" → redirect /agent
    └── 401/403 → Afficher erreur "Email ou mot de passe incorrect"
```

### 4.2 Flux Enseignant

```
/enseignant (Dashboard)
    ├── Sidebar: "Notes" → /enseignant/notes
    │       └── Sélectionner module + groupe → Charger grille
    │           └── Saisir note CC/EF/ER → POST /api/notes/upsert
    │               └── Moyenne et résultat calculés côté serveur
    ├── Sidebar: "Absences" → /enseignant/absences
    │       └── Sélectionner module + groupe + date → Charger liste
    │           └── Toggle Présent/Absent → POST /api/absences/enregistrer
    └── Sidebar: "Supports" → /enseignant/supports
            ├── Upload PDF/DOCX → POST /api/supports/upload
            └── Liste des fichiers → GET /api/supports/:id
                └── Supprimer → DELETE /api/supports/:id
```

### 4.3 Flux Agent Pédagogique (6 fonctions obligatoires)

```
/agent (Dashboard)
    ├── REQ-1 "Enseignants" → /agent/enseignants
    │       ├── GET  /api/agent/enseignants         → liste + statut actif
    │       ├── POST /api/agent/enseignants         → créer compte (hash mdp)
    │       ├── PUT  /api/agent/enseignants/:id     → modifier nom/email
    │       └── PATCH /api/agent/enseignants/:id/statut → activer/désactiver
    ├── REQ-2 "Affectations" → /agent/affectations
    │       └── POST /api/agent/affectation         → enseignant → module → groupe
    ├── REQ-3 "Règles Notes" → /agent/regles-notes
    │       └── PUT  /api/agent/modules/:id/regles-notes → poids_cc + poids_ef = 1.00
    ├── REQ-4 "Périodes" → /agent/periodes
    │       └── PUT  /api/agent/periode-saisie      → ouvrir/verrouiller
    ├── REQ-5 "Supports" → /agent/supports
    │       └── GET  /api/agent/supports            → tous dépôts (4 tables JOIN)
    └── REQ-6 "Emploi du Temps" → /agent/edt
            ├── GET    /api/agent/edt               → vue globale
            ├── POST   /api/agent/edt               → créer créneau
            ├── PUT    /api/agent/edt               → modifier créneau
            └── DELETE /api/agent/edt/:id           → supprimer créneau
```

---

## 5. Récapitulatif des Composants Stitch

| #  | Composant                | Page                      | Type         | REQ |
|----|--------------------------|---------------------------|--------------|-----|
| 1  | `Navbar`                 | Global                    | Layout       | —   |
| 2  | `Sidebar`                | Global                    | Layout       | —   |
| 3  | `LoginForm`              | LoginPage                 | Form         | —   |
| 4  | `TeacherWelcomeCard`     | TeacherDashboard          | Card         | —   |
| 5  | `ModuleGroupeSelector`   | GradesPage                | Form         | E02 |
| 6  | `GradesTable`            | GradesPage                | Table        | E02 |
| 7  | `AttendanceDateSelector` | AttendancePage            | Form         | E03 |
| 8  | `AttendanceList`         | AttendancePage            | Table+Toggle | E03 |
| 9  | `SupportUploadForm`      | CourseMaterialPage        | Form+Upload  | E04 |
| 10 | `SupportsList`           | CourseMaterialPage        | Table        | E04 |
| 11 | `AnnouncementForm`       | AnnouncementsPage         | Form         | E05 |
| 12 | `AnnouncementList`       | AnnouncementsPage         | Table        | E05 |
| 13 | `WeeklyScheduleGrid`     | SchedulePage              | Grid         | E06 |
| 14 | `AgentWelcomeCard`       | AgentDashboard            | Card         | —   |
| 15 | `TeachersTable`          | TeachersListPage          | Table+CRUD   | A01 |
| 16 | `AssignmentForm`         | AssignmentsPage           | Form         | A02 |
| 17 | `GradeRulesForm`         | GradeRulesPage            | Form         | A03 |
| 18 | `PeriodeToggleList`      | GradePeriodPage           | Table+Toggle | A04 |
| 19 | `SupportsGlobalTable`    | SupportsSupervisionPage   | Table        | A05 |
| 20 | `EdtGlobalGrid`          | EdtManagementPage         | Grid+CRUD    | A06 |
| 21 | `DataTable`              | Réutilisable              | Utility      | —   |
| 22 | `Modal`                  | Réutilisable              | Utility      | —   |
| 23 | `ProtectedRoute`         | Réutilisable              | Utility      | —   |

---

## 6. API Endpoints Summary

### 6.1 Auth
| Méthode | Endpoint              | Auth | Rôle(s) | Composant lié |
|---------|-----------------------|------|---------|---------------|
| POST    | `/api/auth/login`     | Non  | Tous    | LoginForm     |
| GET     | `/api/profil`         | JWT  | Tous    | WelcomeCards  |

### 6.2 Enseignant — Notes (UC-E02)
| Méthode | Endpoint                               | Auth | Composant lié |
|---------|----------------------------------------|------|---------------|
| GET     | `/api/notes?id_module=X&id_groupe=Y`   | JWT  | GradesTable   |
| POST    | `/api/notes/upsert`                    | JWT  | GradesTable   |

### 6.3 Enseignant — Absences (UC-E03)
| Méthode | Endpoint                                      | Auth | Composant lié  |
|---------|-----------------------------------------------|------|----------------|
| GET     | `/api/absences/appel/:mod/:grp/:date`         | JWT  | AttendanceList |
| POST    | `/api/absences/enregistrer`                   | JWT  | AttendanceList |

### 6.4 Enseignant — Supports (UC-E04)
| Méthode | Endpoint                          | Auth | Composant lié     |
|---------|-----------------------------------|------|-------------------|
| POST    | `/api/supports/upload`            | JWT  | SupportUploadForm |
| GET     | `/api/supports/:id_affectation`   | JWT  | SupportsList      |
| DELETE  | `/api/supports/:id_support`       | JWT  | SupportsList      |

### 6.5 Enseignant — Annonces (UC-E05)
| Méthode | Endpoint                          | Auth | Composant lié    |
|---------|-----------------------------------|------|------------------|
| POST    | `/api/annonces`                   | JWT  | AnnouncementForm |
| GET     | `/api/annonces?id_enseignant=X`   | JWT  | AnnouncementList |
| DELETE  | `/api/annonces/:id_annonce`       | JWT  | AnnouncementList |

### 6.6 Enseignant — Emploi du Temps (UC-E06)
| Méthode | Endpoint                                | Auth | Composant lié      |
|---------|-----------------------------------------|------|--------------------||
| GET     | `/api/emploi-du-temps/:id_enseignant`   | JWT  | WeeklyScheduleGrid |

### 6.7 Agent Pédagogique — 6 Fonctions Obligatoires
| Méthode | Endpoint                                  | REQ | Composant lié           |
|---------|-------------------------------------------|-----|-------------------------|
| GET     | `/api/agent/enseignants`                  | A01 | TeachersTable           |
| POST    | `/api/agent/enseignants`                  | A01 | TeachersTable           |
| PUT     | `/api/agent/enseignants/:id`              | A01 | TeachersTable           |
| PATCH   | `/api/agent/enseignants/:id/statut`       | A01 | TeachersTable           |
| POST    | `/api/agent/affectation`                  | A02 | AssignmentForm          |
| PUT     | `/api/agent/modules/:id/regles-notes`     | A03 | GradeRulesForm          |
| PUT     | `/api/agent/periode-saisie`               | A04 | PeriodeToggleList       |
| GET     | `/api/agent/supports`                     | A05 | SupportsGlobalTable     |
| GET     | `/api/agent/edt`                          | A06 | EdtGlobalGrid           |
| POST    | `/api/agent/edt`                          | A06 | EdtGlobalGrid           |
| PUT     | `/api/agent/edt`                          | A06 | EdtGlobalGrid           |
| DELETE  | `/api/agent/edt/:id`                      | A06 | EdtGlobalGrid           |

> **Auth requise pour toutes les routes `/api/agent/*` :** JWT + rôle `Agent` ou `Administrateur`

---

> **Ce document sert de blueprint pour la génération Stitch.**
> Chaque composant listé en Section 5 sera généré individuellement dans Google Stitch,
> puis intégré dans le projet React (`client/src/components/`).
> **Dernière mise à jour :** 2026-05-16 — 23 composants planifiés, 12 routes Agent exposées.
