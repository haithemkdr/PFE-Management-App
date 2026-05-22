# ✅ FIGMA COMPONENTS CHECKLIST — PFE Management Application

> **Rôle :** Checklist stricte pour construire les Master Components dans Figma.
> **Méthode :** Auto Layout + Variants. Cocher `[x]` après chaque composant construit.
> **Réf. :** `DESIGN_SYSTEM_TOKENS.md` (couleurs, typo, ombres) · `UI_UX_MASTER_PLAN.md` (pages, flux)

---

## 1. Atoms — Éléments de base

### 1.1 Boutons

Chaque bouton = **1 Component Set** avec les propriétés Variant suivantes :
- **Type** : Primary / Accent / Danger / Outline / Ghost
- **State** : Default / Hover / Disabled
- **Size** : Medium (40px h) / Small (32px h)

| # | Composant | Variants à créer | Tokens | ☐ |
|---|-----------|-------------------|--------|---|
| 1 | `Button/Primary` | Default: `--primary` bg, white text | `--primary`, `--primary-light` hover, opacity 50% disabled | ☐ |
| 2 | `Button/Accent` | Default: `--accent` bg, white text | `--accent`, `--accent-light` hover | ☐ |
| 3 | `Button/Danger` | Default: `--danger` bg, white text | `--danger`, `#D32F2F` hover | ☐ |
| 4 | `Button/Outline` | Default: transparent bg, `--primary` border+text | `--bg-selected` hover | ☐ |
| 5 | `Button/Ghost` | Default: transparent bg, `--text-secondary` text | `--bg-hover-row` hover | ☐ |
| 6 | `IconButton` | Variante avec icône seule (ex: Supprimer 🗑️) | 32×32px, `--radius-md` | ☐ |

> **Typo bouton :** Inter 14px/600 (Medium), Inter 13px/500 (Small).
> **Radius :** `--radius-md` (8px). **Padding :** 12px horizontal, 8px vertical.

---

### 1.2 Inputs de formulaire

Chaque input = **1 Component Set** avec :
- **State** : Default / Focused / Error / Disabled

| # | Composant | States | Tokens clés | ☐ |
|---|-----------|--------|-------------|---|
| 7 | `Input/Text` | Default: `--border-input`. Focus: `--border-focus` 2px + `--bg-input-focus`. Error: `--border-error` + texte rouge. Disabled: `#F9FAFB` bg. | Shadow focus: `0 0 0 3px rgba(27,58,92,0.1)` | ☐ |
| 8 | `Input/Password` | Idem Text + icône œil toggle | Même tokens que Text | ☐ |
| 9 | `Input/Number` | Pour notes (0-20). Idem Text | Mono font `JetBrains Mono 13px` pour la valeur | ☐ |
| 10 | `Input/Date` | Pour date séance. Idem Text | Icône calendrier à droite | ☐ |
| 11 | `Select/Dropdown` | Default + Open (avec liste déroulante) | Chevron icône, `--shadow-md` sur le menu ouvert | ☐ |
| 12 | `Label` | Texte au-dessus de l'input | Inter 13px/500, `--text-secondary` | ☐ |
| 13 | `ErrorMessage` | Texte sous l'input en erreur | Inter 12px/400, `--danger` | ☐ |

> **Dimensions :** Hauteur input = 40px. Padding interne = 8px 12px. Radius = `--radius-md`.

---

### 1.3 Badges d'état

Chaque badge = **1 Component Set** avec propriété **Variant = type d'état**.

| # | Composant | Variant | Couleurs (text / bg / border) | ☐ |
|---|-----------|---------|-------------------------------|---|
| 14 | `Badge/Result/ADM` | — | `#1B5E20` / `--success-bg` / `1px #A5D6A7` | ☐ |
| 15 | `Badge/Result/RAT` | — | `#E65100` / `--warning-bg` / `1px #FFE082` | ☐ |
| 16 | `Badge/Result/ELI` | — | `#B71C1C` / `--danger-bg` / `1px #EF9A9A` | ☐ |
| 17 | `Badge/Presence/Present` | — | `#1B5E20` / `--success-bg` | ☐ |
| 18 | `Badge/Presence/Absent` | — | `#B71C1C` / `--danger-bg` | ☐ |
| 19 | `Badge/Presence/Retard` | — | `#E65100` / `--warning-bg` | ☐ |
| 20 | `Badge/Presence/Justifie` | — | `#0D47A1` / `--info-bg` | ☐ |
| 21 | `Badge/Period/Ouverte` | — | `#1B5E20` / `--success-bg` | ☐ |
| 22 | `Badge/Period/Fermee` | — | `#B71C1C` / `--danger-bg` | ☐ |
| 23 | `Badge/FileType/PDF` | — | `#B71C1C` / `#FFEBEE` | ☐ |
| 24 | `Badge/FileType/DOCX` | — | `#0D47A1` / `#E3F2FD` | ☐ |
| 25 | `Badge/Role` | Enseignant / Agent | `--primary` bg, white text | ☐ |

> **Typo badge :** Inter 12px/600. **Padding :** 4px 8px. **Radius :** `--radius-sm` (4px).

---

### 1.4 Toggle / Switch

| # | Composant | Variants | Tokens | ☐ |
|---|-----------|----------|--------|---|
| 26 | `Toggle` | ON (vert `--secondary-light`) / OFF (gris `#D1D5DB`) | Cercle blanc 18px, piste 36×22px | ☐ |

---

## 2. Molecules — Composants composés

### 2.1 Navigation

| # | Composant | Spécifications | Variants/States | ☐ |
|---|-----------|----------------|-----------------|---|
| 27 | `Navbar` | Hauteur 64px, `--bg-navbar`, `--shadow-sm` en bas. Contient : Logo texte "PFE Management" (Poppins 18px/600), Badge rôle, Nom utilisateur (Inter 14px), Bouton "Déconnexion" (Ghost) | — | ☐ |
| 28 | `SidebarItem` | Auto Layout horizontal. Icône 20px + Label Inter 14px/500. Padding 12px 16px. | **Active :** `--bg-selected` bg, `--primary` text, barre gauche 3px `--accent`. **Inactive :** transparent bg, `--text-inverse` text. **Hover :** `rgba(255,255,255,0.1)` bg | ☐ |
| 29 | `Sidebar` | Largeur 260px, `--bg-sidebar`. Logo en haut, liste de `SidebarItem`, séparateur `rgba(255,255,255,0.15)`. | **Enseignant :** Accueil, Notes, Absences, Supports. **Agent :** Accueil, Enseignants, Affectations, Périodes. | ☐ |

---

### 2.2 Tableau de données

| # | Composant | Spécifications | ☐ |
|---|-----------|----------------|---|
| 30 | `TableHeader` | Auto Layout row. Chaque cellule : Inter 14px/600 `--text-secondary`. Bg `#F9FAFB`. Border bottom `--border-default`. Padding 12px. | ☐ |
| 31 | `TableRow` | Auto Layout row. Inter 14px/400 `--text-primary`. Matricule en `JetBrains Mono 13px`. Border bottom `--border-default`. Hover bg `--bg-hover-row`. Padding 12px. | ☐ |
| 32 | `TableRow/Editable` | Variante avec `Input/Number` dans certaines cellules (pour la saisie des notes CC/EF/ER). | ☐ |
| 33 | `TableEmptyState` | Icône + texte "Aucune donnée" centré, Inter 14px `--text-muted`. | ☐ |
| 34 | `DataTable` | Composition : `TableHeader` + N × `TableRow` + cadre `--bg-card`, `--shadow-sm`, `--radius-lg`. | ☐ |

---

### 2.3 Cartes

| # | Composant | Spécifications | ☐ |
|---|-----------|----------------|---|
| 35 | `WelcomeCard` | Bg `--bg-card`, `--shadow-sm`, `--radius-xl` (16px). Contenu : "Bienvenue, [Prénom Nom]" (Poppins 20px/600), Badge rôle, date du jour (Inter 13px `--text-muted`). | ☐ |
| 36 | `StatCard` | Bg `--bg-card`, `--shadow-sm`, `--radius-lg`. Icône 24px colorée, Valeur (Poppins 28px/700), Label (Inter 13px `--text-secondary`). Padding 24px. | ☐ |

---

### 2.4 Modal

| # | Composant | Spécifications | ☐ |
|---|-----------|----------------|---|
| 37 | `Modal/Overlay` | Fond semi-transparent `rgba(0,0,0,0.5)`. | ☐ |
| 38 | `Modal/Content` | Bg `--bg-card`, `--shadow-lg`, `--radius-lg`. Max-width 480px. Header : Poppins 18px/600 + bouton fermer (IconButton ✕). Body : padding 24px. Footer : 2 boutons alignés à droite (Outline "Annuler" + Primary/Danger "Confirmer"). | ☐ |

---

### 2.5 Formulaires composés

| # | Composant | Contenu | ☐ |
|---|-----------|---------|---|
| 39 | `LoginForm` | 2 inputs (Email + Password) + Button/Primary "Se connecter" + ErrorMessage conditionnel. Bg card, `--shadow-md`, `--radius-lg`, centré. | ☐ |
| 40 | `ModuleGroupeSelector` | 2 Select (Module, Groupe) en row + Button/Primary "Charger". Auto Layout horizontal gap 16px. | ☐ |
| 41 | `AttendanceDateSelector` | 2 Select (Module, Groupe) + Input/Date + Button/Primary "Charger la fiche". | ☐ |
| 42 | `AssignmentForm` | 3 Select (Enseignant, Module, Groupe) + Input/Text (Année) + Button/Accent "Affecter". Vertical stack gap 16px. | ☐ |
| 43 | `SupportUploadForm` | Input/Text (Titre) + Select (Affectation) + Zone upload (border dashed `--border-input`, icône upload) + Button/Primary "Uploader". | ☐ |

---

### 2.6 Listes spécialisées

| # | Composant | Contenu | ☐ |
|---|-----------|---------|---|
| 44 | `AttendanceRow` | Matricule (mono) + Nom + Prénom + Toggle (Présent/Absent) + Checkbox (Justifiée). Auto Layout. | ☐ |
| 45 | `AttendanceList` | TableHeader + N × `AttendanceRow`. | ☐ |
| 46 | `PeriodeToggleRow` | Nom module + Badge/Period + Toggle. Auto Layout horizontal. | ☐ |
| 47 | `PeriodeToggleList` | TableHeader + N × `PeriodeToggleRow`. | ☐ |
| 48 | `SupportRow` | Titre + Badge/FileType + Date (Inter 13px) + Lien "Télécharger" + IconButton Supprimer. | ☐ |
| 49 | `SupportsList` | TableHeader + N × `SupportRow`. | ☐ |

---

### 2.7 Feedback & Alertes

| # | Composant | Variants | ☐ |
|---|-----------|----------|---|
| 50 | `Toast/Success` | Bg `--success-bg`, texte `#1B5E20`, icône ✓, auto-dismiss. | ☐ |
| 51 | `Toast/Error` | Bg `--danger-bg`, texte `#B71C1C`, icône ✕. | ☐ |
| 52 | `Alert/Locked` | Bg `--danger-bg`, texte "Période fermée", icône 🔒. Pleine largeur. | ☐ |

---

## 3. Organisms — Pages complètes

Assembler les molecules ci-dessus dans des frames de page (1440×900 desktop).

| # | Page | Composants utilisés | ☐ |
|---|------|---------------------|---|
| 53 | `01 - Login` | LoginForm centré, fond `--bg-page`. | ☐ |
| 54 | `02 - Teacher Dashboard` | Navbar + Sidebar(Enseignant) + WelcomeCard + 3× StatCard. | ☐ |
| 55 | `03 - Notes` | Navbar + Sidebar + ModuleGroupeSelector + DataTable(GradesTable éditable) + Alert/Locked (si fermée). | ☐ |
| 56 | `04 - Absences` | Navbar + Sidebar + AttendanceDateSelector + AttendanceList. | ☐ |
| 57 | `05 - Supports` | Navbar + Sidebar + SupportUploadForm + SupportsList. | ☐ |
| 58 | `06 - Annonces` | Navbar + Sidebar + Formulaire + DataTable. | ☐ |
| 59 | `07 - Emploi du Temps` | Navbar + Sidebar + Grille EDT. | ☐ |
| 60 | `08 - Agent Dashboard` | Navbar + Sidebar(Agent) + WelcomeCard + 2× StatCard. | ☐ |
| 61 | `09 - Gestion Enseignants` | Navbar + Sidebar + DataTable(TeachersTable). | ☐ |
| 62 | `10 - Gestion Affectations` | Navbar + Sidebar + AssignmentForm + Toast feedback. | ☐ |
| 63 | `11 - Regles des Notes` | Navbar + Sidebar + Configuration des règles. | ☐ |
| 64 | `12 - Periodes de Saisie` | Navbar + Sidebar + PeriodeToggleList. | ☐ |
| 65 | `13 - Supervision des Supports` | Navbar + Sidebar + Tableau de bord des supports. | ☐ |
| 66 | `14 - Gestion Emploi du Temps` | Navbar + Sidebar + Grille EDT Agent. | ☐ |

---

## 4. Récapitulatif de progression

| Catégorie | Total | Construit | % |
|-----------|-------|-----------|---|
| Atoms (Boutons, Inputs, Badges, Toggle) | 26 | _ / 26 | _ % |
| Molecules (Nav, Tables, Cards, Modals, Forms, Lists, Feedback) | 26 | _ / 26 | _ % |
| Pages (Organisms) | 14 | _ / 14 | _ % |
| **TOTAL** | **66** | **_ / 66** | **_ %** |

---

> **Workflow Figma :** Construire dans l'ordre Atoms → Molecules → Pages.
> Utiliser **Auto Layout** sur chaque composant et **Variants** pour les états.
> Référencer `DESIGN_SYSTEM_TOKENS.md` pour chaque couleur, taille et ombre.
