# Application de Gestion de la Scolarité (PFE)

Bienvenue dans l'application web de gestion de la scolarité, un projet développé dans le cadre d'un Projet de Fin d'Études (PFE).

## 🚀 Fonctionnalités Principales

Ce système est divisé en deux rôles principaux avec un routage protégé :

### 👨‍🏫 Espace Enseignant (Professeur)
- **Tableau de bord** : Vue globale des affectations.
- **Gestion des Notes** : Saisie des notes CC, EF, ER avec calcul automatique de la moyenne selon les règles du module.
- **Absences** : Suivi des absences par séance.
- **Supports de Cours** : Partage et gestion des fichiers pour les étudiants.
- **Annonces** : Communication ciblée vers les groupes.
- **Emploi du Temps** : Affichage de l'emploi du temps de la semaine.

### 🏢 Espace Agent de Scolarité
- **Gestion des Enseignants** : CRUD des profils professeurs.
- **Affectations** : Lier un enseignant à un module et un groupe.
- **Règles d'Évaluation** : Définition des pondérations (CC/EF) pour chaque module.
- **Périodes de Saisie** : Ouverture et fermeture des saisies de notes.
- **Supervision des Supports** : Vue d'ensemble des cours partagés.
- **Emploi du Temps (Admin)** : Planification des séances (Salle, Module, Enseignant, Groupe).

## 🛠️ Stack Technique

- **Frontend** : React 18 (Vite), React Router, Axios, Lucide-React.
- **Backend** : Node.js, Express, MySQL.
- **Sécurité** : 
  - Authentification par JWT (JSON Web Tokens).
  - Hachage des mots de passe avec bcryptjs.
  - Protection des routes API (RBAC) via middleware.
  - Uploads sécurisés via Multer.

## ⚙️ Prérequis

- Node.js (v16+)
- MySQL (v8+)
- XAMPP / WAMP (optionnel, pour faire tourner MySQL)

## 📦 Installation & Déploiement local

1. **Cloner le dépôt**
   ```bash
   git clone <votre-url-repo>
   cd PFE_Application
   ```

2. **Base de données**
   - Créez une base de données nommée `pfe_db`.
   - Importez le fichier SQL situé dans `database/` ou exécutez le script d'initialisation de la BDD.
   - Modifiez le fichier de configuration de la base de données : `config/db.js` avec vos identifiants MySQL.

3. **Backend**
   ```bash
   # Installer les dépendances
   npm install

   # Démarrer le serveur backend (par défaut port 5000)
   npm run dev
   ```

4. **Frontend**
   ```bash
   # Ouvrir un nouveau terminal
   cd client

   # Installer les dépendances
   npm install

   # Démarrer le serveur de développement React
   npm run dev
   ```

5. **Test des Comptes (par défaut)**
   - **Enseignant** : `benali@univ-oran.dz` / `admin123`
   - **Agent** : `agent@univ-oran.dz` / `admin123`

## 🛡️ Structure du Projet

```text
/PFE_Application
├── /client                 # Application React (Frontend)
│   ├── /src/pages/teacher  # Pages dédiées à l'enseignant
│   ├── /src/pages/agent    # Pages dédiées à l'agent
│   ├── /src/components     # Composants réutilisables (Navbar, Sidebar, etc.)
│   └── /src/utils          # Utilitaires (API axios configuré avec interceptor)
├── /controllers            # Logique métier des endpoints API (Backend)
├── /routes                 # Définition des routes Express
├── /middleware             # Middlewares (Ex: vérification JWT et RBAC)
├── /scripts                # Scripts de maintenance (intégrité BDD, etc.)
├── /uploads                # Répertoire de stockage des supports de cours
└── server.js               # Point d'entrée principal de l'API Node.js
```

## 📝 Licence
Projet académique PFE.
