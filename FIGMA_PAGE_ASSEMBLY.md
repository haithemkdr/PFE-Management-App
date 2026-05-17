# 🗺️ FIGMA PAGE ASSEMBLY — PFE Management Application

> **Rôle :** Blueprint d'assemblage des pages dans Figma.
> **Réf. :** `FIGMA_COMPONENTS_CHECKLIST.md` (numéros #) · `DESIGN_SYSTEM_TOKENS.md` (tokens)

---

## Règles Globales d'Assemblage

### Frame Desktop Standard
- **Taille :** 1440 × 900px (min-height auto si contenu long)
- **Grille :** 12 colonnes, gouttière 24px, marge externe 32px
- **Fond de page :** `--bg-page` (#F5F7FA)

### Shell de Navigation (toutes les pages sauf Login)
```
┌────────────────────────────────────────────── 1440px ──┐
│  NAVBAR  (fixe, 64px, z-index haut)                     │
├───────────┬────────────────────────────────────────────┤
│ SIDEBAR   │  MAIN CONTENT                               │
│ 260px     │  Padding: 32px. Max-width contenu: 1100px. │
│ fixe      │  Fond: --bg-page                            │
└───────────┴────────────────────────────────────────────┘
```

### Navbar — Contenu Standard (Composant #27)
| Zone | Contenu | Détail |
|------|---------|--------|
| Gauche | Logo texte "PFE Management" | Poppins 18px/600, `--primary` |
| Centre | — | vide |
| Droite | Badge rôle (#25) + Nom utilisateur + Button/Ghost "Déconnexion" (#5) | Gap 16px |

---

## Page 1 — Login Page

### Frame
- **Taille :** 1440 × 900px
- **Grille :** Non applicable (page centrée)
- **Fond :** `--bg-page` avec motif géométrique subtil optionnel

### Structure
```
┌─────────────────────────────── 1440px ──┐
│                                          │
│         [Logo / Titre Application]       │  Poppins 24px/600, --primary
│                                          │
│         ┌──────────────────────┐         │
│         │     LoginForm (#39)  │         │  Largeur: 400px, --shadow-md
│         │  - Input Email (#7)  │         │  --radius-lg, --bg-card
│         │  - Input Password(#8)│         │  Padding: 32px
│         │  - Button Primary(#1)│         │
│         │  - ErrorMessage (#13)│         │
│         └──────────────────────┘         │
│                                          │
│    "Portail de Gestion Pédagogique"      │  Inter 13px, --text-muted
│    Université • Année 2025-2026          │
└──────────────────────────────────────────┘
```

### Placement des Composants
| # Composant | Rôle | Position |
|------------|------|----------|
| `LoginForm` (#39) | Formulaire complet | Centre absolu (H+V) |
| `Input/Text` (#7) | Champ email | Dans LoginForm |
| `Input/Password` (#8) | Champ mot de passe | Dans LoginForm |
| `Button/Primary` (#1) | "Se connecter" | Dans LoginForm, pleine largeur |
| `ErrorMessage` (#13) | "Email ou mot de passe incorrect" | Conditionnel, sous le bouton |

### Comportement Responsive
- **Tablet (768px) :** LoginForm, largeur 90%, padding réduit à 24px.
- **Mobile (< 768px) :** LoginForm pleine largeur, margins 16px, logo en haut.

---

## Page 2 — Teacher Dashboard

### Frame
- **Taille :** 1440 × 900px
- **Shell :** Navbar + Sidebar Enseignant

### Structure du Main Content
```
MAIN CONTENT (padding 32px, gap 24px vertical)
├── WelcomeCard (#35)                    Pleine largeur
├── [Row — 3 StatCards en colonnes 4/4/4]
│   ├── StatCard (#36): "Modules"        4 colonnes
│   ├── StatCard (#36): "Groupes"        4 colonnes
│   └── StatCard (#36): "Absences"       4 colonnes
```

### Placement des Composants
| # Composant | Contenu | Largeur |
|------------|---------|---------|
| `Navbar` (#27) | Logo + Badge rôle "Enseignant" + Nom + Déconnexion | 100% |
| `Sidebar` (#29) | Items: Accueil (actif), Notes, Absences, Supports | 260px |
| `WelcomeCard` (#35) | "Bienvenue, Mohamed Benali" + Badge + date | 100% |
| `StatCard` (#36) × 3 | Modules assignés / Groupes / Séances effectuées | 1/3 chacun |

### Sidebar — Items Enseignant
| Icône | Label | Route |
|-------|-------|-------|
| 🏠 | Accueil | `/enseignant` |
| 📝 | Notes | `/enseignant/notes` |
| 📋 | Absences | `/enseignant/absences` |
| 📁 | Supports | `/enseignant/supports` |

### Comportement Responsive
- **Tablet :** Sidebar rétractable, icône hamburger dans Navbar.
- **Mobile :** Sidebar masquée par défaut. StatCards en colonne unique.

---

## Page 3 — Grades Page (Saisie des Notes)

### Frame
- **Taille :** 1440 × 960px (hauteur augmentée pour le tableau)
- **Shell :** Navbar + Sidebar Enseignant (item "Notes" actif)

### Structure du Main Content
```
MAIN CONTENT (padding 32px, gap 24px vertical)
├── Titre de page                        "Saisie des Notes" — Poppins 28px/700
├── ModuleGroupeSelector (#40)           Row: 2 Select + Bouton
├── [Conditionnel] Alert/Locked (#52)    Si période fermée → bandeau rouge pleine largeur
└── DataTable / GradesTable (#34)        Pleine largeur
    ├── TableHeader (#30): Matricule | Nom | Prénom | CC | EF | ER | Moy. Finale | Résultat | Action
    ├── TableRow/Editable (#32) × N      Inputs numériques pour CC, EF, ER
    │   └── Badge/Result (#14/15/16)     ADM/RAT/ELI dans colonne Résultat
    └── TableEmptyState (#33)            Si aucun étudiant chargé
```

### Colonnes du GradesTable — Détail
| Colonne | Largeur | Type | Composant |
|---------|---------|------|-----------|
| Matricule | 120px | Texte mono | `JetBrains Mono 13px` |
| Nom | 130px | Texte | Inter 14px |
| Prénom | 120px | Texte | Inter 14px |
| Note CC | 90px | Input | `Input/Number` (#9) |
| Note EF | 90px | Input | `Input/Number` (#9) |
| Note ER | 90px | Input | `Input/Number` (#9) |
| Moy. Finale | 100px | Texte bold | Inter 14px/600 |
| Résultat | 90px | Badge | `Badge/Result` (#14-16) |
| Action | 100px | Bouton | `Button/Accent` "Enr." (#2) |

### Comportement Responsive
- **Tablet :** Tableau avec scroll horizontal. Colonnes ER et Moy. Finale masquées.
- **Mobile :** Chaque étudiant = carte verticale au lieu d'une ligne.

---

## Page 4 — Attendance Page (Fiche d'Appel)

### Frame
- **Taille :** 1440 × 960px
- **Shell :** Navbar + Sidebar Enseignant (item "Absences" actif)

### Structure du Main Content
```
MAIN CONTENT (padding 32px, gap 24px vertical)
├── Titre de page                        "Fiche d'Appel" — Poppins 28px/700
├── AttendanceDateSelector (#41)         Row: Select Module + Select Groupe + Input Date + Bouton
└── AttendanceList (#45)                 Pleine largeur
    ├── TableHeader (#30): Matricule | Nom | Prénom | Statut | Justifiée
    └── AttendanceRow (#44) × N
        ├── Matricule (mono)
        ├── Nom / Prénom
        ├── Toggle (#26) + Badge/Presence (#17/18/19) auto-mis à jour
        └── Checkbox "Justifiée"
```

### Comportement des Toggles
| Toggle | State → Badge affiché |
|--------|----------------------|
| ON (vert) | Badge "Présent" (#17) |
| OFF (rouge) | Badge "Absent" (#18) |
| Retard | Badge "Retard" (#19) (sélection via menu contextuel) |
| Justifiée cochée | Badge "Justifié" (#20) remplace Absent |

### Comportement Responsive
- **Tablet :** Même layout, colonnes réduites.
- **Mobile :** Chaque ligne = card. Toggle grand format (tactile).

---

## Page 5 — Course Materials Page

### Frame
- **Taille :** 1440 × 900px
- **Shell :** Navbar + Sidebar Enseignant (item "Supports" actif)

### Structure du Main Content
```
MAIN CONTENT (padding 32px, gap 32px vertical)
├── Titre de page                        "Supports de Cours"
├── SupportUploadForm (#43)              Card --bg-card, --shadow-sm, --radius-lg
│   ├── Input/Text (#7): "Titre"
│   ├── Select (#11): "Affectation"
│   ├── Zone upload (border dashed)
│   └── Button/Primary "Uploader" (#1)
└── SupportsList (#49)                   Pleine largeur
    ├── TableHeader: Titre | Type | Date | Télécharger | Supprimer
    └── SupportRow (#48) × N
        ├── Titre (Inter 14px)
        ├── Badge/FileType PDF/DOCX (#23/24)
        ├── Date (Inter 13px --text-muted)
        ├── Lien "Télécharger" (--text-link)
        └── IconButton Supprimer → Modal confirmation (#37/38)
```

---

## Page 6 — Agent Dashboard

### Frame
- **Taille :** 1440 × 900px
- **Shell :** Navbar + Sidebar Agent

### Structure du Main Content
```
MAIN CONTENT (padding 32px, gap 24px)
├── WelcomeCard (#35)                    "Bienvenue, Amina Kherfi" + Badge "Agent"
└── [Row — 2 StatCards col 6/6]
    ├── StatCard (#36): "Enseignants"
    └── StatCard (#36): "Affectations"
```

### Sidebar — Items Agent
| Icône | Label | Route |
|-------|-------|-------|
| 🏠 | Accueil | `/agent` |
| 👥 | Enseignants | `/agent/enseignants` |
| 🔗 | Affectations | `/agent/affectations` |
| 🔓 | Périodes de Saisie | `/agent/periodes` |

---

## Page 7 — Teachers List Page

### Frame : 1440 × 900px | Shell : Navbar + Sidebar Agent ("Enseignants" actif)

```
MAIN CONTENT (padding 32px)
├── Titre "Gestion des Enseignants"
└── DataTable (#34)
    ├── TableHeader: ID | Nom | Prénom | Email
    └── TableRow (#31) × N
```

---

## Page 8 — Assignments Page

### Frame : 1440 × 900px | Shell : Navbar + Sidebar Agent ("Affectations" actif)

```
MAIN CONTENT (padding 32px, gap 32px)
├── Titre "Gestion des Affectations"
├── AssignmentForm (#42)         Card, max-width 560px
│   ├── Select: Enseignant
│   ├── Select: Module
│   ├── Select: Groupe
│   ├── Input/Text: Année univ.
│   └── Button/Accent "Affecter"
└── Toast/Success ou Toast/Error (#50/51)  Coin bas-droite, auto-dismiss 3s
```

---

## Page 9 — Grade Period Page

### Frame : 1440 × 900px | Shell : Navbar + Sidebar Agent ("Périodes" actif)

```
MAIN CONTENT (padding 32px)
├── Titre "Périodes de Saisie des Notes"
└── PeriodeToggleList (#47)
    ├── TableHeader: Module | Statut | Action
    └── PeriodeToggleRow (#46) × N
        ├── Nom module (Inter 14px)
        ├── Badge/Period Ouverte/Fermée (#21/22)
        └── Toggle (#26) — met à jour via PUT /api/agent/periode-saisie
```

---

## Récapitulatif des Frames Figma à créer

| # | Page | Taille | Sidebar | Priorité |
|---|------|--------|---------|----------|
| 1 | LoginPage | 1440×900 | Non | 🔴 Critique |
| 2 | TeacherDashboard | 1440×900 | Enseignant | 🔴 Critique |
| 3 | GradesPage | 1440×960 | Enseignant | 🔴 Critique |
| 4 | AttendancePage | 1440×960 | Enseignant | 🔴 Critique |
| 5 | CourseMaterialPage | 1440×900 | Enseignant | 🟡 Important |
| 6 | AgentDashboard | 1440×900 | Agent | 🔴 Critique |
| 7 | TeachersListPage | 1440×900 | Agent | 🟡 Important |
| 8 | AssignmentsPage | 1440×900 | Agent | 🟡 Important |
| 9 | GradePeriodPage | 1440×900 | Agent | 🟡 Important |
| 10 | NotFoundPage | 1440×900 | Non | 🟢 Optionnel |

---

> **Ordre de travail recommandé :**
> 1. Tokens → Variables Figma (`DESIGN_SYSTEM_TOKENS.md`)
> 2. Composants → Master Components (`FIGMA_COMPONENTS_CHECKLIST.md`)
> 3. Assemblage → Frames de pages (ce document)
> 4. Prototypage → Liens entre frames pour le flux Login → Dashboard → Pages
