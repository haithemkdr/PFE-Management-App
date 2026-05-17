# 🎨 DESIGN SYSTEM TOKENS — PFE Management Application

> **Rôle :** Source de vérité unique pour Figma et React.
> **Style :** Académique / Professionnel — sobre, lisible, fonctionnel.
> **Aligné sur :** `UI_UX_MASTER_PLAN.md` + `VALIDATION_AUDIT.md`

---

## 1. Color Tokens

### 1.1 Brand Colors

| Token              | Hex       | RGB              | Usage                                    |
|--------------------|-----------|------------------|------------------------------------------|
| `--primary`        | `#1B3A5C` | `27, 58, 92`     | Navbar, sidebar active, titres de pages  |
| `--primary-light`  | `#264D73` | `38, 77, 115`    | Hover sur éléments primary               |
| `--primary-dark`   | `#122840` | `18, 40, 64`     | Texte sur fond clair, headers compacts   |
| `--secondary`      | `#2E7D32` | `46, 125, 50`    | Succès, validation, badge ADM            |
| `--secondary-light`| `#4CAF50` | `76, 175, 80`    | Hover succès, toggle "Présent"           |
| `--accent`         | `#F57C00` | `245, 124, 0`    | Boutons CTA, liens d'action              |
| `--accent-light`   | `#FF9800` | `255, 152, 0`    | Hover sur boutons CTA                    |

### 1.2 Semantic Colors (État du système)

| Token              | Hex       | Usage                                           |
|--------------------|-----------|--------------------------------------------------|
| `--success`        | `#2E7D32` | Badge ADM, période ouverte, présent             |
| `--success-bg`     | `#E8F5E9` | Fond des badges/alertes succès                  |
| `--danger`         | `#C62828` | Badge ELI, absence, erreurs, suppression        |
| `--danger-bg`      | `#FFEBEE` | Fond des badges/alertes erreur                  |
| `--warning`        | `#F9A825` | Badge RAT, avertissements, retard               |
| `--warning-bg`     | `#FFF8E1` | Fond des badges/alertes avertissement           |
| `--info`           | `#1565C0` | Liens informatifs, aide contextuelle            |
| `--info-bg`        | `#E3F2FD` | Fond des badges/alertes info                    |

### 1.3 Surface Colors (Fonds & Conteneurs)

| Token              | Hex       | Usage                                           |
|--------------------|-----------|--------------------------------------------------|
| `--bg-page`        | `#F5F7FA` | Fond de toute la page (derrière le contenu)     |
| `--bg-card`        | `#FFFFFF` | Fond des cartes, tableaux, formulaires          |
| `--bg-sidebar`     | `#1B3A5C` | Fond de la sidebar (même que primary)           |
| `--bg-navbar`      | `#FFFFFF` | Fond de la navbar                               |
| `--bg-input`       | `#FFFFFF` | Fond des champs de formulaire                   |
| `--bg-input-focus` | `#F0F4FF` | Fond du champ actif (focus)                     |
| `--bg-hover-row`   | `#F8FAFC` | Fond d'une ligne de tableau au survol           |
| `--bg-selected`    | `#EBF0F7` | Fond d'un élément sélectionné (sidebar active)  |

### 1.4 Text Colors

| Token              | Hex       | Usage                                           |
|--------------------|-----------|--------------------------------------------------|
| `--text-primary`   | `#1A1A2E` | Texte principal (corps, titres)                 |
| `--text-secondary` | `#6B7280` | Texte secondaire (labels, descriptions)         |
| `--text-muted`     | `#9CA3AF` | Texte désactivé, placeholders                   |
| `--text-inverse`   | `#FFFFFF` | Texte sur fond foncé (sidebar, navbar, badges)  |
| `--text-link`      | `#1565C0` | Liens cliquables                                |
| `--text-link-hover`| `#0D47A1` | Liens au survol                                 |

### 1.5 Border Colors

| Token              | Hex       | Usage                                           |
|--------------------|-----------|--------------------------------------------------|
| `--border-default` | `#E5E7EB` | Bordures de tableaux, séparateurs, cartes       |
| `--border-input`   | `#D1D5DB` | Bordures des champs de formulaire               |
| `--border-focus`   | `#1B3A5C` | Bordure du champ actif (focus) — 2px            |
| `--border-error`   | `#C62828` | Bordure d'un champ en erreur                    |

---

## 2. Typography Scale

### 2.1 Font Families

| Token              | Famille                        | Usage                              |
|--------------------|--------------------------------|------------------------------------|
| `--font-heading`   | `'Poppins', sans-serif`        | Titres de pages (h1, h2, h3)      |
| `--font-body`      | `'Inter', sans-serif`          | Corps de texte, labels, tableaux   |
| `--font-mono`      | `'JetBrains Mono', monospace`  | Matricules, codes, données brutes  |

> **Import Google Fonts :**
> ```
> https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap
> ```

### 2.2 Type Scale

| Niveau            | Font Family    | Size   | Weight | Line Height | Usage                                |
|-------------------|----------------|--------|--------|-------------|--------------------------------------|
| **Display**       | Poppins        | 28px   | 700    | 36px        | Titre de page principal (h1)         |
| **Heading 1**     | Poppins        | 24px   | 600    | 32px        | Titre de section (h2)               |
| **Heading 2**     | Poppins        | 20px   | 600    | 28px        | Sous-titre de section (h3)          |
| **Heading 3**     | Poppins        | 16px   | 600    | 24px        | Titre de carte / modale (h4)        |
| **Body Large**    | Inter          | 16px   | 400    | 24px        | Paragraphe principal, descriptions   |
| **Body**          | Inter          | 14px   | 400    | 22px        | Texte standard, contenu de tableau   |
| **Body Bold**     | Inter          | 14px   | 600    | 22px        | En-têtes de colonnes de tableau      |
| **Small**         | Inter          | 13px   | 400    | 18px        | Labels de formulaire, légendes       |
| **Caption**       | Inter          | 12px   | 400    | 16px        | Texte d'aide, timestamps, badges     |
| **Mono Data**     | JetBrains Mono | 13px   | 400    | 18px        | Matricules (`202100001`), notes      |

### 2.3 Contexte d'application

| Contexte            | Font           | Size  | Weight | Exemple                            |
|---------------------|----------------|-------|--------|------------------------------------|
| Titre de page       | Poppins        | 28px  | 700    | "Saisie des Notes"                 |
| En-tête de tableau  | Inter          | 14px  | 600    | "Matricule — Nom — Note CC"       |
| Cellule de tableau  | Inter          | 14px  | 400    | "Boudiaf — Yacine — 14.50"        |
| Matricule           | JetBrains Mono | 13px  | 400    | "202100001"                        |
| Label de formulaire | Inter          | 13px  | 500    | "Module :"                         |
| Input de formulaire | Inter          | 14px  | 400    | Texte saisi par l'utilisateur      |
| Placeholder         | Inter          | 14px  | 400    | "votre.email@univ.dz" (--text-muted)|
| Badge résultat      | Inter          | 12px  | 600    | "ADM" / "RAT" / "ELI"             |
| Bouton              | Inter          | 14px  | 600    | "Enregistrer" / "Se connecter"     |
| Bouton petit        | Inter          | 13px  | 500    | "Supprimer" / "Annuler"           |

---

## 3. Spacing & Grid

### 3.1 Spacing Scale (Base : 4px)

| Token     | Value | Usage                                            |
|-----------|-------|--------------------------------------------------|
| `--sp-1`  | 4px   | Écart interne minimal (padding badge)            |
| `--sp-2`  | 8px   | Écart entre éléments inline, padding input       |
| `--sp-3`  | 12px  | Padding interne des cellules de tableau          |
| `--sp-4`  | 16px  | Padding des cartes, marge entre composants       |
| `--sp-5`  | 20px  | Marge entre sections de formulaire               |
| `--sp-6`  | 24px  | Marge entre sections de page                     |
| `--sp-8`  | 32px  | Marge autour du contenu principal                |
| `--sp-10` | 40px  | Espacement vertical entre blocs majeurs          |
| `--sp-12` | 48px  | Padding top/bottom des sections de page          |

### 3.2 Grid System

| Propriété             | Valeur          | Notes                                   |
|-----------------------|-----------------|-----------------------------------------|
| Colonnes              | 12              | Grille desktop standard                 |
| Gouttière             | 24px            | Espace entre colonnes                   |
| Marge extérieure      | 32px            | Marge gauche/droite du conteneur        |
| Largeur max conteneur | 1200px          | Largeur maximale de la zone de contenu  |
| Sidebar fixe          | 260px           | Largeur de la sidebar (desktop)         |
| Navbar hauteur        | 64px            | Hauteur fixe de la barre de navigation  |

### 3.3 Breakpoints (Responsive)

| Nom        | Largeur min | Usage                                       |
|------------|-------------|----------------------------------------------|
| Mobile     | 0px         | Sidebar masquée, contenu plein écran         |
| Tablet     | 768px       | Sidebar rétractable, grille 8 colonnes       |
| Desktop    | 1024px      | Layout complet sidebar + contenu             |
| Wide       | 1440px      | Contenu centré, marges augmentées            |

---

## 4. Border Radius

| Token              | Value | Usage                                      |
|--------------------|-------|--------------------------------------------|
| `--radius-sm`      | 4px   | Badges, tags, petits boutons               |
| `--radius-md`      | 8px   | Cartes, inputs, boutons standards          |
| `--radius-lg`      | 12px  | Modales, conteneurs principaux             |
| `--radius-xl`      | 16px  | Carte de bienvenue (dashboard)             |
| `--radius-full`    | 9999px| Avatars, badges circulaires                |

---

## 5. Elevation & Shadows

| Niveau        | Token            | CSS Value                                  | Usage                              |
|---------------|------------------|--------------------------------------------|------------------------------------|
| **Level 0**   | `--shadow-none`  | `none`                                     | Éléments plats (tableaux inline)   |
| **Level 1**   | `--shadow-sm`    | `0 1px 3px rgba(0, 0, 0, 0.08)`           | Cartes au repos, navbar            |
| **Level 2**   | `--shadow-md`    | `0 4px 12px rgba(0, 0, 0, 0.12)`          | Cartes au survol, dropdowns        |
| **Level 3**   | `--shadow-lg`    | `0 8px 24px rgba(0, 0, 0, 0.16)`          | Modales, overlays                  |

---

## 6. Component-Specific Tokens

### 6.1 Badges d'état (Notes — Résultat)

| État   | Texte color  | Background     | Border          | Label |
|--------|-------------|----------------|-----------------|-------|
| **ADM**| `#1B5E20`   | `--success-bg` | `1px solid #A5D6A7` | Admis   |
| **RAT**| `#E65100`   | `--warning-bg` | `1px solid #FFE082` | Rattrapage |
| **ELI**| `#B71C1C`   | `--danger-bg`  | `1px solid #EF9A9A` | Éliminé |

### 6.2 Badges de présence (Absences)

| État        | Texte color | Background     | Label      |
|-------------|-------------|----------------|------------|
| **Présent** | `#1B5E20`   | `--success-bg` | Présent    |
| **Absent**  | `#B71C1C`   | `--danger-bg`  | Absent     |
| **Retard**  | `#E65100`   | `--warning-bg` | Retard     |
| **Justifié**| `#0D47A1`   | `--info-bg`    | Justifié   |

### 6.3 Période de saisie (Agent)

| État        | Texte color | Background     | Label     |
|-------------|-------------|----------------|-----------|
| **Ouverte** | `#1B5E20`   | `--success-bg` | Ouverte   |
| **Fermée**  | `#B71C1C`   | `--danger-bg`  | Fermée    |

### 6.4 Types de fichier (Supports)

| Type    | Texte color | Background | Label |
|---------|-------------|------------|-------|
| **PDF** | `#B71C1C`   | `#FFEBEE`  | PDF   |
| **DOCX**| `#0D47A1`   | `#E3F2FD`  | DOCX  |

### 6.5 Boutons

| Variante     | Background    | Text color    | Border         | Hover BG       |
|-------------|---------------|---------------|----------------|----------------|
| **Primary** | `--primary`   | `--text-inverse` | none        | `--primary-light` |
| **Accent**  | `--accent`    | `--text-inverse` | none        | `--accent-light`  |
| **Danger**  | `--danger`    | `--text-inverse` | none        | `#D32F2F`         |
| **Outline** | transparent   | `--primary`      | `1px solid --primary` | `--bg-selected` |
| **Ghost**   | transparent   | `--text-secondary`| none       | `--bg-hover-row`  |

### 6.6 Inputs

| État       | Border color     | Background        | Shadow                        |
|------------|------------------|--------------------|-------------------------------|
| **Default**| `--border-input` | `--bg-input`       | none                          |
| **Focus**  | `--border-focus` | `--bg-input-focus` | `0 0 0 3px rgba(27,58,92,0.1)`|
| **Error**  | `--border-error` | `#FFF5F5`          | `0 0 0 3px rgba(198,40,40,0.1)`|
| **Disabled**| `#E5E7EB`       | `#F9FAFB`          | none                          |

---

## 7. Iconography

| Contexte          | Taille | Style recommandé                          |
|-------------------|--------|-------------------------------------------|
| Sidebar menu      | 20px   | Outline, stroke 1.5px                     |
| Boutons inline    | 16px   | Outline, stroke 1.5px                     |
| Tableau (actions) | 18px   | Outline, stroke 1.5px                     |
| Badge de rôle     | 14px   | Filled                                    |

> **Bibliothèque conseillée :** Lucide Icons (open source, cohérent, disponible en React et Figma).

---

## 8. Motion & Transitions

| Propriété              | Valeur                | Usage                             |
|------------------------|-----------------------|-----------------------------------|
| `--transition-fast`    | `150ms ease-in-out`   | Hover boutons, toggles            |
| `--transition-normal`  | `250ms ease-in-out`   | Ouverture/fermeture dropdown      |
| `--transition-slow`    | `350ms ease-in-out`   | Sidebar collapse, modales         |

---

## 9. Checklist d'alignement Audit

Vérification que chaque état identifié dans `VALIDATION_AUDIT.md` possède un token visuel :

| État système                     | Token visuel           | ✅ Couvert |
|----------------------------------|------------------------|-----------|
| Note ADM (≥ 10)                  | Badge vert `--success` | ✅        |
| Note RAT (≥ 5 et < 10)          | Badge jaune `--warning`| ✅        |
| Note ELI (< 5)                   | Badge rouge `--danger` | ✅        |
| Étudiant Présent                 | Badge vert             | ✅        |
| Étudiant Absent                  | Badge rouge            | ✅        |
| Étudiant en Retard               | Badge orange           | ✅        |
| Absence Justifiée                | Badge bleu `--info`    | ✅        |
| Période saisie Ouverte           | Badge vert             | ✅        |
| Période saisie Fermée            | Badge rouge            | ✅        |
| Support PDF                      | Badge rouge typé       | ✅        |
| Support DOCX                     | Badge bleu typé        | ✅        |
| Input en erreur (note hors 0-20) | Bordure `--border-error`| ✅       |
| Saisie bloquée (HTTP 403)        | Alerte `--danger-bg`   | ✅        |

---

> **Ce document est votre checklist Figma.** Chaque couleur, taille, ombre et badge
> listé ici doit être créé comme style/variable dans votre fichier Figma avant
> de générer les composants.
