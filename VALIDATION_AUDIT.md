# 🕵️‍♂️ VALIDATION AUDIT — PFE Management Application

> **Date :** May 2026
> **Objectif :** Vérification stricte de l'alignement entre les exigences initiales (Cahier des charges & Notebooks) et l'implémentation locale (Backend, BDD, Roadmap, UI/UX Plan) avant d'entamer le développement Frontend React.

---

## 1. 🟢 Alignements Réussis (Ce qui fonctionne)

L'audit confirme que les fondations principales du système sont robustes et conformes aux exigences du projet :

### 1.1 Architecture & Sécurité
- **Modèle RBAC :** Le contrôle d'accès basé sur les rôles (Enseignant, Agent, Administrateur) est bien implémenté via JWT et le middleware `roleMiddleware.js`.
- **Traçabilité :** Le schéma de base de données trace l'auteur des modifications des notes (`saisie_par`) et la date (`date_saisie`).
- **Conception L3 Mode :** Le code du backend utilise une logique claire, commentée et facile à maintenir pour des étudiants.

### 1.2 Fonctionnalités Enseignant
- **Gestion des Notes (UC-E02) :** Validation stricte des notes (0 à 20) et automatisation du calcul des moyennes (`moy1`, `moy2`, `moyenne_finale`) ainsi que de l'état de réussite (ADM, RAT, ELI).
- **Fiches d'Appel (UC-E03) :** Système fonctionnel pour l'enregistrement des absences, retards et présences par séance.
- **Supports de Cours (UC-E04) :** Upload et téléchargement des documents pédagogiques sécurisés et liés aux affectations.

### 1.3 Fonctionnalités Agent Pédagogique
- **Gestion des Affectations :** Association fluide entre un Enseignant, un Module, un Groupe et une Année Universitaire.
- **Gestion des Enseignants :** L'agent peut gérer les comptes des utilisateurs de son département.

---

## 2. 🔴 Écarts et Fonctionnalités Manquantes (Gaps)

En croisant les sources de vérité (Notebooks) et le code local, plusieurs divergences ou manques ont été identifiés :

### 2.1 Manquements dans la Base de Données & Backend
1. **Période de Saisie des Notes (Problème de conception) :**
   - *Problème :* Dans le `UI_UX_MASTER_PLAN.md` et le rôle de l'Agent, on gère l'ouverture/fermeture par *Module* (`PUT /api/agent/periode-saisie`). Cependant, dans `schema.sql`, le champ `periode_saisie_ouverte` est situé dans la table `notes`.
   - *Conséquence :* Il est illogique de stocker l'état d'ouverture sur chaque ligne de note. Cela devrait appartenir à la table `modules` ou `affectations`.
2. **Paramétrage des Calculs (Pondérations) :**
   - *Exigence :* L'Agent doit pouvoir configurer les pondérations (ex: 40% CC, 60% EF).
   - *Réalité :* Actuellement, la table `modules` ne stocke que le `coefficient`. La logique (0.4 / 0.6) est écrite en dur dans `notesController.js`.
3. **Absences Cumulées :**
   - *Exigence :* Calcul automatique du taux d'absentéisme cumulé.
   - *Réalité :* Non défini explicitement dans une requête SQL du backend, bien que les données brutes soient présentes dans `absences`.

### 2.2 Fonctionnalités Complètement Absentes
1. **Emploi du Temps (UC-E01) :**
   - *Exigence :* L'enseignant doit consulter son emploi du temps détaillé (horaires, salles). Mentionné dans l'UI/UX Master Plan.
   - *Réalité :* Aucune table (`seances`, `salles`, `horaires`) dans la BDD, et aucune API backend.
2. **Système d'Annonces / Notifications :**
   - *Exigence :* L'enseignant doit pouvoir envoyer des annonces aux étudiants de ses groupes.
   - *Réalité :* Aucune table `annonces` ou `notifications`, aucune API.

---

## 3. 🛠️ Actions Correctives Proposées (Avant le Frontend)

Pour que l'application React corresponde parfaitement aux exigences académiques, les correctifs suivants doivent être appliqués dans le backend :

### Action 1 : Correction de la base de données (Urgent)
- Retirer le champ `periode_saisie_ouverte` de la table `notes`.
- Ajouter `periode_saisie_ouverte TINYINT(1) DEFAULT 0` à la table `affectations` ou `modules`.
- Ajouter des champs `poids_cc` (ex: 0.40) et `poids_ef` (ex: 0.60) dans la table `modules` pour éviter les calculs en dur dans le contrôleur.

### Action 2 : Ajout des modules manquants (Emploi du Temps & Annonces)
*Optionnel mais recommandé pour respecter à 100% le rapport :*
- Créer une table `annonces` (id, id_affectation, titre, contenu, date) et son contrôleur.
- Créer une vue simplifiée pour les plannings ou ajouter les notions de `salle` et `heure` dans les `affectations` ou `groupes`.

### Action 3 : Mise à jour de l'API Notes
- Refactoriser `notesController.js` pour qu'il lise `poids_cc` et `poids_ef` depuis la base de données.
- Corriger le verrouillage de saisie pour qu'il vérifie la table `affectations` ou `modules`.

---

**Conclusion de l'Audit :** Le projet est globalement sur une excellente voie technique. Toutefois, **la Phase 2 n'est pas encore totalement achevée**. Il est impératif d'ajuster le schéma SQL et les API (Période de saisie, Emploi du temps, Annonces) avant de générer l'interface avec Google Stitch pour éviter des blocages ultérieurs.
