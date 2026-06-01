/**
 * gradeEngine.js — Moteur de calcul LMD centralisé
 * 
 * Toute la logique de notation passe par ce service.
 * Aucun contrôleur ne doit recalculer manuellement.
 * 
 * Système 3-way : Exam (EF/ER) + TD + TP
 * 
 * Formules :
 *   moy1 = note_td × poids_td  +  note_tp × poids_tp  +  note_ef × poids_exam
 *   moy2 = note_td × poids_td  +  note_tp × poids_tp  +  note_er × poids_exam
 *   moyenne_finale = max(moy1, moy2)
 *   resultat = ADM (≥10), RAT (<10), pas d'ELI (supprimé du LMD)
 */

// ────────────────────────────────────────────────────
// 1. Calcul de la note individuelle d'un module
// ────────────────────────────────────────────────────

/**
 * Calcule les moyennes d'un étudiant pour un module donné.
 * 
 * @param {Object} notes - { note_td, note_tp, note_ef, note_er }
 * @param {Object} poids - { poids_exam, poids_td, poids_tp }
 * @returns {Object} { moy1, moy2, moyenne_finale, resultat }
 */
function calculeNote(notes, poids) {
    const { note_td, note_tp, note_ef, note_er } = notes;
    const { poids_exam, poids_td, poids_tp } = poids;

    let moy1 = null;
    let moy2 = null;
    let moyenne_finale = null;
    let resultat = null;

    // ── Partie CC (TD + TP) ──
    // On calcule la partie CC si au moins une des deux notes CC existe
    const hasTD = note_td !== null && note_td !== undefined;
    const hasTP = note_tp !== null && note_tp !== undefined;
    const hasEF = note_ef !== null && note_ef !== undefined;
    const hasER = note_er !== null && note_er !== undefined;

    // Contribution CC = note_td × poids_td + note_tp × poids_tp
    // Si un des deux (TD ou TP) n'existe pas et son poids est 0, c'est OK
    // Si le poids est > 0 mais la note manque, on ne peut pas calculer
    const canCalcCC =
        (poids_td === 0 || hasTD) &&
        (poids_tp === 0 || hasTP);

    const partCC = canCalcCC
        ? (hasTD ? note_td * poids_td : 0) + (hasTP ? note_tp * poids_tp : 0)
        : null;

    // ── Moyenne session normale (moy1) ──
    if (partCC !== null && hasEF) {
        moy1 = round2(partCC + note_ef * poids_exam);
    }

    // ── Moyenne rattrapage (moy2) ──
    if (partCC !== null && hasER) {
        moy2 = round2(partCC + note_er * poids_exam);
    }

    // ── Moyenne finale = max(moy1, moy2) ──
    if (moy1 !== null && moy2 !== null) {
        moyenne_finale = Math.max(moy1, moy2);
    } else if (moy1 !== null) {
        moyenne_finale = moy1;
    } else if (moy2 !== null) {
        moyenne_finale = moy2;
    }

    if (moyenne_finale !== null) {
        moyenne_finale = round2(moyenne_finale);
    }

    // ── Résultat module ──
    // ADM ≥ 10, RAT < 10 (pas d'ELI dans le système LMD, la compensation UE s'en charge)
    if (moyenne_finale !== null) {
        resultat = moyenne_finale >= 10 ? 'ADM' : 'RAT';
    }

    return { moy1, moy2, moyenne_finale, resultat };
}


// ────────────────────────────────────────────────────
// 2. Calcul de la moyenne d'une Unité d'Enseignement
// ────────────────────────────────────────────────────

/**
 * Calcule la moyenne pondérée d'une UE et détermine si elle est acquise.
 * 
 * @param {Array} modulesNotes - [{ moyenne_finale, coefficient, credits }]
 * @param {number} creditsUE - Total des crédits de l'UE
 * @returns {Object} { moyenne_ue, credits_acquis, compensee }
 */
function calculeMoyenneUE(modulesNotes, creditsUE) {
    if (!modulesNotes || modulesNotes.length === 0) {
        return { moyenne_ue: null, credits_acquis: 0, compensee: false };
    }

    let sommeCoefMoy = 0;
    let sommeCoef = 0;
    let tousCalcules = true;

    for (const mod of modulesNotes) {
        if (mod.moyenne_finale === null || mod.moyenne_finale === undefined) {
            tousCalcules = false;
            continue;
        }
        const coef = parseFloat(mod.coefficient) || 1;
        sommeCoefMoy += mod.moyenne_finale * coef;
        sommeCoef += coef;
    }

    if (sommeCoef === 0 || !tousCalcules) {
        return { moyenne_ue: null, credits_acquis: 0, compensee: false };
    }

    const moyenne_ue = round2(sommeCoefMoy / sommeCoef);

    // Règle LMD : si moyenne_ue ≥ 10, tous les crédits de l'UE sont acquis
    // (compensation intra-UE : un module < 10 est compensé si la moyenne UE ≥ 10)
    const compensee = moyenne_ue >= 10;
    const credits_acquis = compensee ? (creditsUE || 0) : 0;

    return { moyenne_ue, credits_acquis, compensee };
}


// ────────────────────────────────────────────────────
// 3. Calcul de délibérations complet
// ────────────────────────────────────────────────────

/**
 * Calcule le bilan d'un semestre pour un étudiant.
 * 
 * @param {Array} ues - [{
 *   moyenne_ue, credits_acquis, compensee, coefficient,
 *   credits_total, modules: [{ moyenne_finale, coefficient, credits }]
 * }]
 * @returns {Object} { moyenne_semestre, total_credits, credits_max, resultat_final }
 */
function calculeBilanSemestre(ues) {
    if (!ues || ues.length === 0) {
        return { moyenne_semestre: null, total_credits: 0, credits_max: 0, resultat_final: null };
    }

    let sommeCoefMoy = 0;
    let sommeCoef = 0;
    let total_credits = 0;
    let credits_max = 0;
    let tousCalcules = true;

    for (const ue of ues) {
        credits_max += ue.credits_total || 0;

        if (ue.moyenne_ue === null || ue.moyenne_ue === undefined) {
            tousCalcules = false;
            continue;
        }

        const coef = parseFloat(ue.coefficient) || 1;
        sommeCoefMoy += ue.moyenne_ue * coef;
        sommeCoef += coef;
        total_credits += ue.credits_acquis || 0;
    }

    if (sommeCoef === 0 || !tousCalcules) {
        return { moyenne_semestre: null, total_credits, credits_max, resultat_final: null };
    }

    const moyenne_semestre = round2(sommeCoefMoy / sommeCoef);

    // Résultat final du semestre :
    // Admis si moyenne_semestre ≥ 10 (compensation inter-UE)
    // Ajourné sinon
    const resultat_final = moyenne_semestre >= 10 ? 'Admis' : 'Ajourné';

    return { moyenne_semestre, total_credits, credits_max, resultat_final };
}


// ────────────────────────────────────────────────────
// 4. Utilitaires
// ────────────────────────────────────────────────────

/**
 * Valide qu'une note est entre 0 et 20.
 * @param {number|null} note 
 * @param {string} label 
 * @returns {string|null} Message d'erreur ou null si valide
 */
function valideNote(note, label) {
    if (note === null || note === undefined) return null;
    const n = parseFloat(note);
    if (isNaN(n)) return `${label} n'est pas un nombre valide.`;
    if (n < 0 || n > 20) return `${label} doit être entre 0 et 20.`;
    return null;
}

/**
 * Valide que les 3 poids totalisent 1.00.
 * @param {number} poids_exam 
 * @param {number} poids_td 
 * @param {number} poids_tp 
 * @returns {string|null} Message d'erreur ou null si valide
 */
function validePoids(poids_exam, poids_td, poids_tp) {
    const pe = parseFloat(poids_exam) || 0;
    const pt = parseFloat(poids_td)   || 0;
    const pp = parseFloat(poids_tp)   || 0;

    // Cas spécial : 0/0/0 = règle effacée intentionnellement (suppression)
    if (pe === 0 && pt === 0 && pp === 0) return null;

    const total = round2(pe + pt + pp);
    if (Math.abs(total - 1.00) > 0.01) {
        return `La somme des poids doit être 1.00 (actuellement : ${total}).`;
    }
    return null;
}

/** Arrondi à 2 décimales */
function round2(n) {
    return Math.round(n * 100) / 100;
}


// ────────────────────────────────────────────────────
// 5. Session de validation
// ────────────────────────────────────────────────────

/**
 * Détermine si un module a été validé en session normale ou rattrapage.
 *
 * @param {number|null} moy1 - Moyenne session normale
 * @param {number|null} moy2 - Moyenne session rattrapage
 * @param {number|null} moyenne_finale - max(moy1, moy2)
 * @returns {'NORMALE'|'RATTRAPAGE'|null}
 */
function calculeSessionValidation(moy1, moy2, moyenne_finale) {
    if (moyenne_finale === null || moyenne_finale === undefined) return null;
    // Si moy2 existe et est celle retenue → rattrapage
    if (moy2 !== null && moy2 !== undefined && moy2 === moyenne_finale && moy2 > (moy1 || 0)) {
        return 'RATTRAPAGE';
    }
    return 'NORMALE';
}


// ────────────────────────────────────────────────────
// 6. Bilan annuel (fusion de 2 semestres)
// ────────────────────────────────────────────────────

/**
 * Calcule le bilan annuel à partir de deux bilans semestriels.
 *
 * @param {Object} bilanS1 - { moyenne_semestre, total_credits, credits_max }
 * @param {Object} bilanS2 - { moyenne_semestre, total_credits, credits_max }
 * @returns {Object} { moyenne_annuelle, credits_acquis, credits_max }
 */
function calculeBilanAnnuel(bilanS1, bilanS2) {
    const s1 = bilanS1 || { moyenne_semestre: null, total_credits: 0, credits_max: 0 };
    const s2 = bilanS2 || { moyenne_semestre: null, total_credits: 0, credits_max: 0 };

    const credits_acquis = (s1.total_credits || 0) + (s2.total_credits || 0);
    const credits_max = (s1.credits_max || 0) + (s2.credits_max || 0);

    let moyenne_annuelle = null;
    if (s1.moyenne_semestre !== null && s2.moyenne_semestre !== null) {
        // Moyenne simple des deux semestres (pondération égale)
        moyenne_annuelle = round2((s1.moyenne_semestre + s2.moyenne_semestre) / 2);
    } else if (s1.moyenne_semestre !== null) {
        moyenne_annuelle = s1.moyenne_semestre;
    } else if (s2.moyenne_semestre !== null) {
        moyenne_annuelle = s2.moyenne_semestre;
    }

    return { moyenne_annuelle, credits_acquis, credits_max };
}


// ────────────────────────────────────────────────────
// 7. Décision du jury (5 statuts officiels)
// ────────────────────────────────────────────────────

/** Seuil de crédits minimum pour passer avec dettes */
const SEUIL_CREDITS_DETTES = 30;

/**
 * Détermine la décision du jury selon les règles officielles.
 * Le rachat n'est PAS géré ici (c'est une action bulk séparée).
 *
 * @param {number|null} moyenneAnnuelle
 * @param {number} creditsAcquis
 * @param {number} creditsMax - Normalement 60
 * @param {boolean} hasRattrapage - true si au moins 1 module validé en rattrapage
 * @returns {string} L'une des 5 décisions officielles (hors Rachat)
 */
function calculeDecisionJury(moyenneAnnuelle, creditsAcquis, creditsMax, hasRattrapage) {
    if (moyenneAnnuelle === null || moyenneAnnuelle === undefined) {
        return 'Ajourné(e)';
    }

    // ── 60 crédits + moyenne ≥ 10 → Admis ──
    if (creditsAcquis >= creditsMax && moyenneAnnuelle >= 10) {
        if (hasRattrapage) {
            return 'Admis(e) (session rattrapage)';
        }
        return 'Admis(e) (session normale)';
    }

    // ── Moyenne < 10 mais ≥ 30 crédits → Admis avec dettes ──
    if (creditsAcquis >= SEUIL_CREDITS_DETTES) {
        return 'Admis(e) avec dettes';
    }

    // ── Sinon → Ajourné ──
    return 'Ajourné(e)';
}


// ────────────────────────────────────────────────────
// 8. Rachat en masse
// ────────────────────────────────────────────────────

/**
 * Applique le rachat en masse à un tableau d'étudiants.
 * Filtre : moyenne_annuelle >= seuilRachat ET < 10.00
 * Résultat : moyenne_annuelle forcée à 10.00, crédits à max, decision = Rachat
 *
 * @param {Array} etudiants - [{ id_etudiant, moyenne_annuelle, credits_acquis, credits_max, ... }]
 * @param {number} seuilRachat - ex: 9.90
 * @returns {Array} Étudiants modifiés (copies, non-destructif)
 */
function appliqueRachatBulk(etudiants, seuilRachat) {
    if (!etudiants || !seuilRachat || seuilRachat >= 10) return [];

    return etudiants
        .filter(e =>
            e.moyenne_annuelle !== null &&
            e.moyenne_annuelle >= seuilRachat &&
            e.moyenne_annuelle < 10
        )
        .map(e => ({
            ...e,
            moyenne_originale: e.moyenne_annuelle,
            moyenne_annuelle: 10.00,
            credits_acquis: e.credits_max || 60,
            decision: 'Admis(e) (Rachat)',
            rachat: 1,
            seuil_rachat: seuilRachat
        }));
}


// ────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────
module.exports = {
    calculeNote,
    calculeMoyenneUE,
    calculeBilanSemestre,
    valideNote,
    validePoids,
    round2,
    // Nouvelles fonctions — Délibérations v2
    calculeSessionValidation,
    calculeBilanAnnuel,
    calculeDecisionJury,
    appliqueRachatBulk,
    SEUIL_CREDITS_DETTES
};

