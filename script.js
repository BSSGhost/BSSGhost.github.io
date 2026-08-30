/* =========================================================
   SYSTEME DE TRADUCTION FR / EN
   ========================================================= */
const LANG_KEY = 'sunu_moyenne_lang';

function getLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang === 'en' ? 'en' : 'fr'); } catch {}
}

const translations = {
  fr: {
    device_modal_eyebrow: "Bienvenue sur SUNU MOYENNE",
    device_modal_title: "Quel appareil utilisez-vous ?",
    device_modal_subtitle: "Ce choix permet d'adapter automatiquement l'affichage du site à votre écran.",
    device_phone: "Téléphone",
    device_tablet: "Tablette",
    device_computer: "Ordinateur",
    change_device_btn: "Changer d'appareil",
    lang_switch_btn: "English",
    hero_eyebrow: "Outil scolaire officiel",
    hero_h1: "Calculez votre moyenne de matière et semestrielle en quelques secondes",
    hero_subtitle: "Renseignez vos matières, vos notes et leurs coefficients pour obtenir votre moyenne en quelques secondes. Générez ensuite un bulletin scolaire clair, téléchargeable en PDF, aussi bien sur téléphone que sur ordinateur.",
    stat_devoirs_label: "Devoirs",
    stat_composition_label: "Composition",
    stat_coeff_label: "Coeff.",
    stat_coeff_value: "Personnalisé",
    stat_classes_label: "Classes couvertes (6e → Tle)",
    stat_matieres_label: "Matières disponibles",
    stat_gratuit_label: "Gratuit, en ligne comme hors-ligne",
    hero_preview_tag: "Aperçu du bulletin",
    hero_preview_subject1: "Mathématiques",
    hero_preview_subject2: "Français",
    hero_preview_subject3: "Sciences Physiques",
    hero_preview_total_label: "Moyenne générale",
    hero_preview_mention: "Très bon travail",
    next_subject_btn: "Matière suivante",
    next_subject_done: "Toutes les matières sont renseignées ✓",
    quote_of_day_label: "Conseil du jour",
    calculator_h2: "Formulaire",
    step1_label: "Renseigner les infos",
    step2_label: "Ajouter les matières",
    step3_label: "Télécharger le bulletin",
    label_nom: "Nom",
    placeholder_nom: "Ex : Diop",
    label_prenom: "Prénom",
    placeholder_prenom: "Ex : Mamadou",
    label_classe: "Classe",
    option_classe_default: "-- Sélectionner votre classe --",
    legend_semestre: "Semestre",
    radio_semestre1: "Semestre 1",
    radio_semestre2: "Semestre 2",
    legend_langue: "Quelle langue choisissez-vous ?",
    opt_espagnol: "Espagnol",
    opt_arabe: "Arabe",
    legend_serie: "Quelle série suivez-vous ?",
    opt_serie_s1: "S1",
    opt_serie_s2: "S2",
    coefficient_badge_text: "Coefficient officiel suggéré — modifiable si besoin",
    label_matiere: "Matière",
    option_matiere_default: "-- Sélectionner une matière --",
    label_coefficient: "Coefficient",
    placeholder_coefficient: "Ex : 4",
    label_devoir1: "Note de devoir 1",
    placeholder_devoir1: "Ex : 15,25",
    label_devoir2: "Note de devoir 2",
    placeholder_devoir2: "Ex : 12,25",
    legend_composition: "La matière comporte-t-elle une composition ?",
    radio_oui: "Oui",
    radio_non: "Non",
    label_composition: "Note de composition",
    placeholder_composition: "Ex : 17,25",
    btn_calculer_matiere: "Calculer la moyenne de la matière",
    btn_calculer_semestre: "Calculer ma moyenne du semestre",
    btn_calculer_annee: "Calculer ma moyenne annuelle",
    btn_reset: "Réinitialiser les données",
    result_label: "Résultat",
    result_placeholder_h3: "Votre moyenne apparaîtra ici.",
    advisor_header_h3: "Conseiller scolaire",
    subjects_h3: "Matières enregistrées",
    th_matiere: "Matière",
    th_moyenne: "Moyenne",
    th_coefficient: "Coefficient",
    th_points: "Points",
    th_actions: "Actions",
    empty_state_title: "Aucune matière enregistrée pour le moment",
    empty_state_subtitle: "Ajoutez votre première matière ci-dessus pour voir apparaître votre tableau.",
    comparison_h3: "Comparaison Semestre 1 / Semestre 2",
    faq_h3: "Comment ça marche ?",
    faq_subtitle: "Comprendre le calcul de votre moyenne en quelques points",
    faq_q1: "Les coefficients officiels sont-ils pré-remplis automatiquement ?",
    faq_a1: "Oui, pour les classes de 2nde, 1ère et Terminale, le site vous suggère automatiquement les coefficients officiels de chaque matière (basés sur la grille des épreuves du Baccalauréat sénégalais) dès que vous choisissez votre série. Ce coefficient reste modifiable si votre établissement en utilise un différent.",
    faq_q2: "Qu'est-ce qu'un coefficient et à quoi sert-il ?",
    faq_a2: "Le coefficient représente l'importance d'une matière dans votre semestre. Une matière à fort coefficient (ex : 4 ou 5) pèse davantage dans votre moyenne générale qu'une matière à faible coefficient (ex : 1 ou 2). Les points d'une matière sont calculés en multipliant sa moyenne par son coefficient.",
    faq_q3: "Comment est calculée la moyenne du semestre ?",
    faq_a3: "On additionne les points de toutes les matières de la classe (moyenne × coefficient de chaque matière), puis on divise le total par la somme de tous les coefficients. C'est donc une moyenne pondérée.",
    faq_q4: "Comment est calculée la moyenne annuelle ?",
    faq_a4: "La moyenne annuelle est la moyenne simple des moyennes des semestres 1 et 2, calculée sur la base des matières renseignées dans les deux semestres. Pensez à remplir toutes les matières pour les deux semestres pour obtenir un résultat fiable.",
    faq_q5: "Mes notes sont-elles sauvegardées ?",
    faq_a5: "Oui, vos notes sont enregistrées automatiquement sur votre appareil (localStorage) pendant que vous les calculez. Elles restent disponibles lors de vos prochaines visites sur ce même appareil. Pensez à télécharger votre bulletin en PDF pour garder une trace de vos résultats.",
    footer_rights: "Tous droits réservés",
    footer_credit_label: "Fait par",

    theme_btn_to_light: "Mode clair",
    theme_btn_to_dark: "Mode sombre",
    sound_on: "Son activé",
    sound_off: "Son désactivé",

    mention_insuffisant: "Insuffisant",
    mention_peux_mieux_faire: "Peux mieux faire",
    mention_bon_travail: "Bon travail",
    mention_tres_bon_travail: "Très bon travail",
    mention_excellent_travail: "Excellent travail",

    msg_champs_manquants: "Veuillez renseigner votre nom, prénom, classe et matière.",
    msg_notes_invalides: "Les notes doivent être comprises entre 0 et 20 et utiliser uniquement ,25, ,50 ou ,75.",
    msg_coefficient_invalide: "Veuillez entrer un coefficient valide entre 1 et 8.",
    msg_composition_invalide: "La composition doit être comprise entre 0 et 20 et utiliser uniquement ,25, ,50 ou ,75.",
    msg_classe_requise_semestre: "Veuillez d'abord sélectionner une classe pour calculer votre moyenne du semestre.",
    msg_langue_requise_semestre: "Veuillez choisir votre langue pour cette classe avant de calculer la moyenne du semestre.",
    msg_classe_requise_annee: "Veuillez d'abord sélectionner une classe pour calculer votre moyenne annuelle.",
    msg_langue_requise_annee: "Veuillez choisir votre langue pour cette classe avant de calculer la moyenne annuelle.",
    msg_matieres_manquantes: "Vous devez d'abord calculer toutes les matières de la classe. Matières manquantes : {list}.",
    msg_aucun_coefficient: "Aucun coefficient disponible pour calculer la moyenne du semestre.",
    msg_semestre_incomplet: "Il manque des notes au {semestre} pour toutes les matières de la classe. Complétez les deux semestres avant de calculer la moyenne annuelle.",
    msg_semestre1_court: "semestre 1",
    msg_semestre2_court: "semestre 2",
    msg_matiere_supprimee: "La matière {matiere} a été supprimée.",
    msg_matiere_prete_modif: "Les données de {matiere} sont prêtes à être modifiées.",
    msg_donnees_reinitialisees: "Les données ont été réinitialisées avec succès.",
    confirm_supprimer_matiere: "Supprimer la matière « {matiere} » ?",
    confirm_reset_classe: "Toutes les notes de la classe {classe} (Semestre 1 et 2) seront définitivement supprimées. Voulez-vous continuer ?",
    confirm_reset_all: "Toutes les données enregistrées (toutes les classes et matières) seront définitivement supprimées. Voulez-vous continuer ?",
    confirm_modal_title: "Êtes-vous sûr ?",
    confirm_modal_ok: "Confirmer",
    confirm_modal_cancel: "Annuler",
    confirm_modal_close: "Fermer",
    confirm_modal_info_title: "Information",
    msg_erreur_pdf: "Une erreur est survenue pendant la génération du bulletin. Veuillez réessayer.",
    msg_jspdf_manquant: "Erreur: La bibliothèque jsPDF n'est pas chargée.",
    msg_aucune_note_pdf: "Aucune note enregistrée pour cette classe et ce semestre. Veuillez remplir les notes d'abord.",

    table_modifier: "Modifier",
    table_supprimer: "Supprimer",
    table_classe_label: "Classe : {classe} • {semestre}",
    table_aucune_classe: "Aucune classe sélectionnée",
    table_semestre1_full: "Semestre 1",
    table_semestre2_full: "Semestre 2",

    progress_label_default: "{done} / {total} matières renseignées",
    progress_label_complete: "{done} / {total} matières • Bulletin prêt !",

    compare_btn_open: "Comparer Sem1 / Sem2",
    compare_btn_close: "Fermer la comparaison",
    compare_subtitle: "Classe : {classe} • {n} matière{s} au total",
    compare_empty: "Aucune matière à comparer pour le moment.",
    compare_new: "Nouveau",
    compare_stable: "— Stable",

    advisor_points_forts_prefix: "Tes points forts : {list}",
    advisor_points_forts_empty: "Continue tes efforts, aucune matière ne se démarque encore nettement.",
    advisor_a_ameliorer_prefix: "À améliorer : {list}",
    advisor_a_ameliorer_empty: "Aucune matière en difficulté particulière, bravo pour cet équilibre !",
    advisor_objectif_excellent: "Excellent niveau ({value}/20) : continue sur cette lancée pour viser l'excellence.",
    advisor_objectif_template: "Pour atteindre {objectif}/20 : {leviers}",
    advisor_leviers_with_subjects: "augmente principalement tes résultats en {list}.",
    advisor_leviers_none: "continue à consolider l'ensemble de tes matières.",

    result_pill_semestre: "Moyenne du {semestre}",
    result_pill_annee: "Moyenne annuelle",
    result_coefficient_text: "Coefficient {n}",

    pdf_republique: "RÉPUBLIQUE DU SÉNÉGAL",
    pdf_devise: "Un Peuple - Un But - Une Foi",
    pdf_ministere: "MINISTÈRE DE L'ÉDUCATION NATIONALE",
    pdf_lycee: "Lycée Nation-Armée pour la Qualité et l'Equité",
    pdf_bulletin_titre: "BULLETIN DE NOTES - {semestre}",
    pdf_semestre1_full: "1er Semestre",
    pdf_semestre2_full: "2ème Semestre",
    pdf_eleve: "Élève : {nom}",
    pdf_classe: "Classe : {classe}",
    pdf_moyenne_generale: "Moyenne Générale : {value} / 20",
    pdf_th_discipline: "Discipline",
    pdf_th_devoir1: "Devoir 1",
    pdf_th_devoir2: "Devoir 2",
    pdf_th_compo: "Compo.",
    pdf_th_coeff: "Coeff.",
    pdf_th_moyenne: "Moyenne",
    pdf_th_appreciation: "Appréciation",
    pdf_total_coefficients: "Total Coefficients : {n}",
    pdf_total_points: "Total Points : {n}",
    pdf_moyenne_semestrielle: "Moyenne Semestrielle : {value} / 20",
    pdf_mention: "Mention : {label}",
    pdf_obs_parents: "Observation & Signature des Parents",
    pdf_prof_principal: "Le Professeur Principal",
    pdf_commandant: "Le Commandant d'école",
    pdf_signature_cachet: "Signature et Cachet Officiel",
    pdf_footer_doc: "Document officiel généré par SUNU MOYENNE - Lycée Nation-Armée pour la Qualité et l'Equité",
    pdf_appreciation_insuffisant: "Insuffisant",
    pdf_appreciation_passable: "Passable",
    pdf_appreciation_assez_bien: "Assez Bien",
    pdf_appreciation_bien: "Bien",
    pdf_appreciation_tres_bien: "Très Bien",
    pdf_appreciation_excellent: "Excellent",

    pdf_button_default: "Télécharger mon bulletin (PDF)",
    pdf_button_generating: "Génération en cours…",
    pdf_button_success: "Bulletin téléchargé"
  },
  en: {
    device_modal_eyebrow: "Welcome to SUNU MOYENNE",
    device_modal_title: "Which device are you using?",
    device_modal_subtitle: "This choice automatically adapts the site's display to your screen.",
    device_phone: "Phone",
    device_tablet: "Tablet",
    device_computer: "Computer",
    change_device_btn: "Change device",
    lang_switch_btn: "Français",
    hero_eyebrow: "Official school tool",
    hero_h1: "Calculate your subject and semester average in seconds",
    hero_subtitle: "Enter your subjects, grades and their coefficients to get your average in seconds. Then generate a clear report card, downloadable as a PDF, on both phone and computer.",
    stat_devoirs_label: "Assignments",
    stat_composition_label: "Exam",
    stat_coeff_label: "Coeff.",
    stat_coeff_value: "Custom",
    stat_classes_label: "Grade levels covered (6th → 12th)",
    stat_matieres_label: "Subjects available",
    stat_gratuit_label: "Free, online and offline",
    hero_preview_tag: "Report card preview",
    hero_preview_subject1: "Mathematics",
    hero_preview_subject2: "French",
    hero_preview_subject3: "Physics",
    hero_preview_total_label: "Overall average",
    hero_preview_mention: "Very good work",
    next_subject_btn: "Next subject",
    next_subject_done: "All subjects have been entered ✓",
    quote_of_day_label: "Tip of the day",
    calculator_h2: "Form",
    step1_label: "Enter your info",
    step2_label: "Add subjects",
    step3_label: "Download report card",
    label_nom: "Last name",
    placeholder_nom: "e.g. Diop",
    label_prenom: "First name",
    placeholder_prenom: "e.g. Mamadou",
    label_classe: "Grade level",
    option_classe_default: "-- Select your grade level --",
    legend_semestre: "Semester",
    radio_semestre1: "Semester 1",
    radio_semestre2: "Semester 2",
    legend_langue: "Which language do you choose?",
    opt_espagnol: "Spanish",
    opt_arabe: "Arabic",
    legend_serie: "Which series are you in?",
    opt_serie_s1: "S1",
    opt_serie_s2: "S2",
    coefficient_badge_text: "Suggested official coefficient — editable if needed",
    label_matiere: "Subject",
    option_matiere_default: "-- Select a subject --",
    label_coefficient: "Coefficient",
    placeholder_coefficient: "e.g. 4",
    label_devoir1: "Assignment 1 grade",
    placeholder_devoir1: "e.g. 15.25",
    label_devoir2: "Assignment 2 grade",
    placeholder_devoir2: "e.g. 12.25",
    legend_composition: "Does this subject include an exam?",
    radio_oui: "Yes",
    radio_non: "No",
    label_composition: "Exam grade",
    placeholder_composition: "e.g. 17.25",
    btn_calculer_matiere: "Calculate subject average",
    btn_calculer_semestre: "Calculate my semester average",
    btn_calculer_annee: "Calculate my annual average",
    btn_reset: "Reset data",
    result_label: "Result",
    result_placeholder_h3: "Your average will appear here.",
    advisor_header_h3: "School advisor",
    subjects_h3: "Recorded subjects",
    th_matiere: "Subject",
    th_moyenne: "Average",
    th_coefficient: "Coefficient",
    th_points: "Points",
    th_actions: "Actions",
    empty_state_title: "No subject recorded yet",
    empty_state_subtitle: "Add your first subject above to see your table appear.",
    comparison_h3: "Semester 1 / Semester 2 Comparison",
    faq_h3: "How does it work?",
    faq_subtitle: "Understanding how your average is calculated",
    faq_q1: "Are official coefficients filled in automatically?",
    faq_a1: "Yes, for grades 2nde, 1ère and Terminale, the site automatically suggests the official coefficient for each subject (based on the Senegalese Baccalaureate exam grid) as soon as you choose your series. This coefficient remains editable if your school uses a different one.",
    faq_q2: "What is a coefficient and what is it for?",
    faq_a2: "The coefficient represents how important a subject is in your semester. A subject with a high coefficient (e.g. 4 or 5) weighs more in your overall average than a subject with a low coefficient (e.g. 1 or 2). A subject's points are calculated by multiplying its average by its coefficient.",
    faq_q3: "How is the semester average calculated?",
    faq_a3: "The points of all subjects in the class are added together (average × coefficient of each subject), then the total is divided by the sum of all coefficients. It is therefore a weighted average.",
    faq_q4: "How is the annual average calculated?",
    faq_a4: "The annual average is the simple average of the semester 1 and semester 2 averages, calculated based on the subjects entered in both semesters. Remember to fill in all subjects for both semesters to get a reliable result.",
    faq_q5: "Are my grades saved?",
    faq_a5: "Yes, your grades are automatically saved on your device (localStorage) as you calculate them. They remain available on your next visits from the same device. Remember to download your report card as a PDF to keep a record of your results.",
    footer_rights: "All rights reserved",
    footer_credit_label: "Made by",

    theme_btn_to_light: "Light mode",
    theme_btn_to_dark: "Dark mode",
    sound_on: "Sound on",
    sound_off: "Sound off",

    mention_insuffisant: "Insufficient",
    mention_peux_mieux_faire: "Could do better",
    mention_bon_travail: "Good work",
    mention_tres_bon_travail: "Very good work",
    mention_excellent_travail: "Excellent work",

    msg_champs_manquants: "Please fill in your last name, first name, grade level and subject.",
    msg_notes_invalides: "Grades must be between 0 and 20 and use only .25, .50 or .75.",
    msg_coefficient_invalide: "Please enter a valid coefficient between 1 and 8.",
    msg_composition_invalide: "The exam grade must be between 0 and 20 and use only .25, .50 or .75.",
    msg_classe_requise_semestre: "Please select a grade level first to calculate your semester average.",
    msg_langue_requise_semestre: "Please choose your language for this grade level before calculating the semester average.",
    msg_classe_requise_annee: "Please select a grade level first to calculate your annual average.",
    msg_langue_requise_annee: "Please choose your language for this grade level before calculating the annual average.",
    msg_matieres_manquantes: "You must first calculate all subjects for the class. Missing subjects: {list}.",
    msg_aucun_coefficient: "No coefficient available to calculate the semester average.",
    msg_semestre_incomplet: "Grades are missing for {semestre} for all subjects in the class. Complete both semesters before calculating the annual average.",
    msg_semestre1_court: "semester 1",
    msg_semestre2_court: "semester 2",
    msg_matiere_supprimee: "The subject {matiere} has been deleted.",
    msg_matiere_prete_modif: "The data for {matiere} is ready to be edited.",
    msg_donnees_reinitialisees: "The data has been successfully reset.",
    confirm_supprimer_matiere: "Delete the subject \"{matiere}\"?",
    confirm_reset_classe: "All grades for grade level {classe} (Semester 1 and 2) will be permanently deleted. Do you want to continue?",
    confirm_reset_all: "All saved data (all grade levels and subjects) will be permanently deleted. Do you want to continue?",
    confirm_modal_title: "Are you sure?",
    confirm_modal_ok: "Confirm",
    confirm_modal_cancel: "Cancel",
    confirm_modal_close: "Close",
    confirm_modal_info_title: "Information",
    msg_erreur_pdf: "An error occurred while generating the report card. Please try again.",
    msg_jspdf_manquant: "Error: The jsPDF library is not loaded.",
    msg_aucune_note_pdf: "No grades recorded for this grade level and semester. Please fill in the grades first.",

    table_modifier: "Edit",
    table_supprimer: "Delete",
    table_classe_label: "Class: {classe} • {semestre}",
    table_aucune_classe: "No class selected",
    table_semestre1_full: "Semester 1",
    table_semestre2_full: "Semester 2",

    progress_label_default: "{done} / {total} subjects entered",
    progress_label_complete: "{done} / {total} subjects • Report card ready!",

    compare_btn_open: "Compare Sem1 / Sem2",
    compare_btn_close: "Close comparison",
    compare_subtitle: "Class: {classe} • {n} subject{s} total",
    compare_empty: "No subject to compare yet.",
    compare_new: "New",
    compare_stable: "— Stable",

    advisor_points_forts_prefix: "Your strengths: {list}",
    advisor_points_forts_empty: "Keep up your efforts, no subject stands out clearly yet.",
    advisor_a_ameliorer_prefix: "To improve: {list}",
    advisor_a_ameliorer_empty: "No subject in particular difficulty, well done for this balance!",
    advisor_objectif_excellent: "Excellent level ({value}/20): keep up this momentum to aim for excellence.",
    advisor_objectif_template: "To reach {objectif}/20: {leviers}",
    advisor_leviers_with_subjects: "mainly improve your results in {list}.",
    advisor_leviers_none: "keep consolidating all your subjects.",

    result_pill_semestre: "{semestre} average",
    result_pill_annee: "Annual average",
    result_coefficient_text: "Coefficient {n}",

    pdf_republique: "REPUBLIC OF SENEGAL",
    pdf_devise: "One People - One Goal - One Faith",
    pdf_ministere: "MINISTRY OF NATIONAL EDUCATION",
    pdf_lycee: "Lycée Nation-Armée pour la Qualité et l'Equité",
    pdf_bulletin_titre: "REPORT CARD - {semestre}",
    pdf_semestre1_full: "1st Semester",
    pdf_semestre2_full: "2nd Semester",
    pdf_eleve: "Student: {nom}",
    pdf_classe: "Grade level: {classe}",
    pdf_moyenne_generale: "Overall Average: {value} / 20",
    pdf_th_discipline: "Subject",
    pdf_th_devoir1: "Assign. 1",
    pdf_th_devoir2: "Assign. 2",
    pdf_th_compo: "Exam",
    pdf_th_coeff: "Coeff.",
    pdf_th_moyenne: "Average",
    pdf_th_appreciation: "Remarks",
    pdf_total_coefficients: "Total Coefficients: {n}",
    pdf_total_points: "Total Points: {n}",
    pdf_moyenne_semestrielle: "Semester Average: {value} / 20",
    pdf_mention: "Grade: {label}",
    pdf_obs_parents: "Parents' Observation & Signature",
    pdf_prof_principal: "The Head Teacher",
    pdf_commandant: "The School Commander",
    pdf_signature_cachet: "Official Signature and Stamp",
    pdf_footer_doc: "Official document generated by SUNU MOYENNE - Lycée Nation-Armée pour la Qualité et l'Equité",
    pdf_appreciation_insuffisant: "Insufficient",
    pdf_appreciation_passable: "Pass",
    pdf_appreciation_assez_bien: "Fairly Good",
    pdf_appreciation_bien: "Good",
    pdf_appreciation_tres_bien: "Very Good",
    pdf_appreciation_excellent: "Excellent",

    pdf_button_default: "Download my report card (PDF)",
    pdf_button_generating: "Generating…",
    pdf_button_success: "Report card downloaded"
  }
};

/* Traductions d'affichage pour les noms de matières.
   La clé (côté FR) reste la valeur canonique utilisée pour le stockage
   localStorage / <option> ; seul l'affichage change selon la langue. */
const MATIERE_LABELS = {
  'Mathématiques': { fr: 'Mathématiques', en: 'Mathematics' },
  'Français': { fr: 'Français', en: 'French' },
  'SVT': { fr: 'SVT', en: 'Life & Earth Sciences (SVT)' },
  'Anglais': { fr: 'Anglais', en: 'English' },
  'Histoire Géographie': { fr: 'Histoire Géographie', en: 'History & Geography' },
  'EC': { fr: 'EC', en: 'Civic Education (EC)' },
  'EPS': { fr: 'EPS', en: 'Physical Education (EPS)' },
  'Informatique': { fr: 'Informatique', en: 'Computer Science' },
  'E2C': { fr: 'E2C', en: 'E2C' },
  'ECOFAM': { fr: 'ECOFAM', en: 'Family & Social Economics (ECOFAM)' },
  'Sciences Physiques': { fr: 'Sciences Physiques', en: 'Physical Sciences' },
  'Philosophie': { fr: 'Philosophie', en: 'Philosophy' },
  'Espagnol': { fr: 'Espagnol', en: 'Spanish' },
  'Arabe': { fr: 'Arabe', en: 'Arabic' }
};

function translateMatiere(nomMatiere) {
  const entry = MATIERE_LABELS[nomMatiere];
  if (!entry) return nomMatiere;
  return entry[getLang()] || nomMatiere;
}

/* t(key, vars) : renvoie la chaîne traduite pour la langue active,
   en remplaçant les {placeholders} par les valeurs fournies. */
function t(key, vars) {
  const dict = translations[getLang()] || translations.fr;
  let str = dict[key] ?? translations.fr[key] ?? key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
    });
  }
  return str;
}

/* Applique les traductions statiques du HTML : tout élément portant
   data-i18n, data-i18n-placeholder ou data-i18n-title est mis à jour. */
function applyStaticTranslations() {
  document.documentElement.lang = getLang();

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });

  const langBtnLabel = document.querySelector('#toggle-lang-btn .lang-label');
  if (langBtnLabel) langBtnLabel.textContent = t('lang_switch_btn');
}

/* Redessine tout le contenu généré dynamiquement en JS, pour qu'il
   reflète immédiatement un changement de langue sans recharger la page. */
function refreshDynamicTranslatedTexts() {
  updateSoundButtonUI();
  if (typeof applyThemeLabels === 'function') applyThemeLabels();
  afficherCitationDuJour();
  updateMatieres();
  renderTableMatiere();
  updateStepsTimeline();
  if (comparaisonPanel && !comparaisonPanel.hidden) {
    renderComparaisonSemestres();
    if (compareToggleBtn) {
      compareToggleBtn.innerHTML = `<span aria-hidden="true">✕</span> ${t('compare_btn_close')}`;
    }
  } else if (compareToggleBtn && !compareToggleBtn.hidden) {
    compareToggleBtn.innerHTML = `<span aria-hidden="true">⇄</span> ${t('compare_btn_open')}`;
  }
  setPdfButtonLabel(t('pdf_button_default'));
}

const form = document.getElementById('moyenne-form');
const resultat = document.getElementById('resultat');

const loadingScreen = document.getElementById('loading-screen');

window.addEventListener('load', () => {
  const hide = () => {
    if (!loadingScreen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      loadingScreen.style.display = 'none';
      return;
    }
    loadingScreen.classList.add('is-hidden');
    loadingScreen.addEventListener(
      'animationend',
      () => {
        loadingScreen.style.display = 'none';
      },
      { once: true }
    );
  };
  setTimeout(hide, 900);
  // Safety fallback: the loading screen must never be able to block the site.
  setTimeout(hide, 2500);
});

// Extra fallback for browsers where the load event is delayed by a blocked external resource.
setTimeout(() => {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.classList.add('is-hidden');
    screen.style.display = 'none';
    screen.style.pointerEvents = 'none';
  }
}, 3000);

const compositionGroup = document.getElementById('composition-group');
const compositionInput = document.getElementById('composition');
const classeSelect = document.getElementById('classe');
const matiereSelect = document.getElementById('matiere');
const langueGroup = document.getElementById('langue-group');
const langueRadios = document.querySelectorAll('input[name="langue"]');
const serieGroup = document.getElementById('serie-group');
const serieRadios = document.querySelectorAll('input[name="serie"]');
const coefficientInput = document.getElementById('coefficient');
const coefficientBadge = document.getElementById('coefficient-badge');
const boutonSemestre = document.getElementById('calculer-semestre');
const boutonReset = document.getElementById('reset-donnees');
const boutonTelechargerPdf = document.getElementById('telecharger-bulletin');
const tableBody = document.getElementById('matiere-table-body');

/* Icône + message plus engageant pour le tableau de matières vide,
   réutilisé ici et identique au contenu statique présent dans le HTML au chargement. */
const EMPTY_SUBJECTS_ROW_HTML = `
  <tr>
    <td colspan="5" class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 14a3 3 0 0 1 3-3h9l3 4h18a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V14Z"></path>
        <path d="M18 27l4 4 8-9"></path>
      </svg>
      <p class="empty-state-title">Aucune matière enregistrée pour le moment</p>
      <p class="empty-state-subtitle">Ajoutez votre première matière ci-dessus pour voir apparaître votre tableau.</p>
    </td>
  </tr>
`;

const classeLabel = document.getElementById('classe-label');
const nextSubjectBtn = document.getElementById('next-subject-btn');
const partnerVisuals = document.querySelectorAll('.partner-visual');
const progressTracker = document.getElementById('progress-tracker');
const progressTrackerFill = document.getElementById('progress-tracker-fill');
const progressTrackerLabel = document.getElementById('progress-tracker-label');
const calculatorCard = document.querySelector('.calculator-card');
const deviceViewportOuter = document.getElementById('device-viewport-outer');
const deviceViewport = document.getElementById('device-viewport');
const compareToggleBtn = document.getElementById('toggle-comparaison-btn');
const comparaisonPanel = document.getElementById('comparaison-panel');
const comparaisonList = document.getElementById('comparaison-list');
const comparaisonSubtitle = document.getElementById('comparaison-subtitle');

const DEVICE_REFERENCE_WIDTHS = {
  phone: 430,
  tablette: 834,
  ordinateur: 1280
};

let currentDevice = null;

function updateViewportScale() {
  if (!deviceViewport || !deviceViewportOuter || !currentDevice) return;

  const refWidth = DEVICE_REFERENCE_WIDTHS[currentDevice];
  const actualWidth = deviceViewportOuter.clientWidth;
  const scale = Math.min(actualWidth / refWidth, 1);

  deviceViewport.style.transform = `scale(${scale})`;

  const naturalHeight = deviceViewport.offsetHeight;
  deviceViewportOuter.style.height = `${naturalHeight * scale}px`;
}

function setDeviceReference(device) {
  currentDevice = device;
  const refWidth = DEVICE_REFERENCE_WIDTHS[device];

  if (!deviceViewport || !refWidth) return;

  deviceViewport.style.width = `${refWidth}px`;
  requestAnimationFrame(updateViewportScale);
}

let scaleUpdateFrame = null;
function scheduleViewportScaleUpdate() {
  if (scaleUpdateFrame) cancelAnimationFrame(scaleUpdateFrame);
  scaleUpdateFrame = requestAnimationFrame(updateViewportScale);
}

window.addEventListener('resize', scheduleViewportScaleUpdate);

if (deviceViewport && 'ResizeObserver' in window) {
  const viewportResizeObserver = new ResizeObserver(() => scheduleViewportScaleUpdate());
  viewportResizeObserver.observe(deviceViewport);
}

const deviceModal = document.getElementById('device-modal');
const deviceOptions = document.querySelectorAll('.device-option');
const changeDeviceBtn = document.getElementById('change-device-btn');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEVICE_CLASSES = ['device-phone', 'device-tablette', 'device-ordinateur'];

function applyDeviceClass(device) {
  DEVICE_CLASSES.forEach((cls) => document.body.classList.remove(cls));
  document.body.classList.add(`device-${device}`);
  setDeviceReference(device);
}

function closeDeviceModal() {
  if (!deviceModal) return;

  if (prefersReducedMotion) {
    deviceModal.style.display = 'none';
    return;
  }

  deviceModal.classList.add('is-closing');
  deviceModal.addEventListener(
    'animationend',
    () => {
      deviceModal.style.display = 'none';
      deviceModal.classList.remove('is-closing');
    },
    { once: true }
  );
}

function openDeviceModal() {
  if (!deviceModal) return;
  deviceModal.classList.remove('is-closing');
  deviceModal.style.display = 'flex';
  deviceOptions[0]?.focus();
}

deviceOptions.forEach((button) => {
  button.addEventListener('click', () => {
    const device = button.dataset.device;
    applyDeviceClass(device);
    closeDeviceModal();
  });
});

changeDeviceBtn?.addEventListener('click', openDeviceModal);

function gradeClass(value) {
  if (value < 10) return 'grade-faible';
  if (value < 14) return 'grade-moyen';
  return 'grade-bien';
}

function getMention(value) {
  if (value < 10) return { label: t('mention_insuffisant'), cls: 'mention-insuffisant' };
  if (value < 14) return { label: t('mention_peux_mieux_faire'), cls: 'mention-peux-mieux-faire' };
  if (value < 16) return { label: t('mention_bon_travail'), cls: 'mention-bon-travail' };
  if (value < 18) return { label: t('mention_tres_bon_travail'), cls: 'mention-tres-bon-travail' };
  return { label: t('mention_excellent_travail'), cls: 'mention-excellent-travail' };
}

/* Icône associée à chaque mention : étoile pour les meilleurs résultats,
   médaille pour un bon travail, flèche ascendante pour encourager la suite. */
function getMentionIcon(cls) {
  const star = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.06 6.6.79-4.9 4.5 1.28 6.6L12 17.3l-5.88 3.15 1.28-6.6-4.9-4.5 6.6-.79L12 2.5Z"/></svg>';
  const medal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="6"></circle><path d="M9 2h6l-2 6.2h-2L9 2Z"></path><path d="M10.3 12.6l1.2 2.6 1.2-2.6"></path></svg>';
  const trending = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 15 10 9 14 13 20 6"></polyline><polyline points="14 6 20 6 20 12"></polyline></svg>';

  if (cls === 'mention-excellent-travail' || cls === 'mention-tres-bon-travail') {
    return { svg: star, isTop: true };
  }
  if (cls === 'mention-bon-travail') {
    return { svg: medal, isTop: false };
  }
  return { svg: trending, isTop: false };
}

function animateValue(el, from, to, duration = 900) {
  if (prefersReducedMotion || duration <= 0) {
    el.textContent = to.toFixed(2);
    return;
  }

  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = current.toFixed(2);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = to.toFixed(2);
    }
  }

  requestAnimationFrame(tick);
}

/* Confettis discrets, déclenchés uniquement pour une moyenne excellente (>= 16).
   Respecte prefers-reduced-motion et se nettoie automatiquement du DOM. */
const CONFETTI_COLORS = ['#e8c875', '#cf8a45', '#4eaa7e', '#fffaf0', '#b8752f'];

function launchConfetti(container) {
  if (prefersReducedMotion || !container) return;

  const fragment = document.createDocumentFragment();
  const pieceCount = 18;

  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const x = (Math.random() - 0.5) * 220;
    const y = 90 + Math.random() * 100;
    const rot = (Math.random() - 0.5) * 540;
    const delay = Math.random() * 150;

    piece.style.setProperty('--confetti-x', `${x}px`);
    piece.style.setProperty('--confetti-y', `${y}px`);
    piece.style.setProperty('--confetti-rot', `${rot}deg`);
    piece.style.animationDelay = `${delay}ms`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];

    fragment.appendChild(piece);
  }

  container.appendChild(fragment);

  window.setTimeout(() => {
    container.querySelectorAll('.confetti-piece').forEach((el) => el.remove());
  }, 1500);
}

function pulseCard() {
  if (prefersReducedMotion || !calculatorCard) return;
  calculatorCard.classList.remove('just-saved');
  void calculatorCard.offsetWidth;
  calculatorCard.classList.add('just-saved');
}

/* ---------- Favicon dynamique selon la dernière moyenne ---------- */

const LAST_MOYENNE_STORAGE_KEY = 'lynaqe_last_moyenne';

function setFaviconHref(dataUrl) {
  const oldLink = document.querySelector('link[rel="icon"]');
  const newLink = document.createElement('link');
  newLink.rel = 'icon';
  newLink.type = 'image/png';
  newLink.href = dataUrl;
  if (oldLink) {
    oldLink.replaceWith(newLink);
  } else {
    document.head.appendChild(newLink);
  }
}

const BADGE_IMAGE_SRC = 'LYNAQE.png';
let badgeImagePromise = null;

function getBadgeImage() {
  if (!badgeImagePromise) {
    badgeImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = BADGE_IMAGE_SRC;
    });
  }
  return badgeImagePromise;
}

async function updateFaviconBadge(value) {
  try {
    const img = await getBadgeImage();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* On dessine le badge LYNAQE tel quel */
    ctx.drawImage(img, 0, 0, 64, 64);

    /* Puis on applique une teinte selon la moyenne, en ne colorant
       que les pixels non transparents du badge (source-atop) */
    let tintColor;
    if (value < 10) {
      tintColor = 'rgba(194, 59, 59, 0.5)';
    } else if (value < 14) {
      tintColor = 'rgba(210, 168, 74, 0.45)';
    } else {
      tintColor = 'rgba(29, 106, 82, 0.4)';
    }

    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, 64, 64);
    ctx.globalCompositeOperation = 'source-over';

    setFaviconHref(canvas.toDataURL('image/png'));

    try {
      localStorage.setItem(LAST_MOYENNE_STORAGE_KEY, String(value));
    } catch {
      /* stockage indisponible, on ignore silencieusement */
    }
  } catch (e) {
    console.log("Impossible de mettre à jour le favicon :", e);
  }
}

function restoreFaviconBadgeFromStorage() {
  try {
    const stored = Number(localStorage.getItem(LAST_MOYENNE_STORAGE_KEY));
    if (Number.isFinite(stored)) {
      updateFaviconBadge(stored);
    }
  } catch {
    /* pas de localStorage disponible, on garde le favicon par défaut */
  }
}

/* ---------- Son discret et optionnel au moment du résultat ---------- */

const SOUND_STORAGE_KEY = 'lynaqe_sound_enabled';
let audioContextInstance = null;

function isSoundEnabled() {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function getAudioContext() {
  if (audioContextInstance) return audioContextInstance;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContextInstance = new AudioContextClass();
  return audioContextInstance;
}

function playTone(ctx, freq, startTime, duration, gainValue = 0.07) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function playResultSound(value) {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  if (value >= 14) {
    playTone(ctx, 660, now, 0.16);
    playTone(ctx, 880, now + 0.11, 0.22);
  } else if (value >= 10) {
    playTone(ctx, 540, now, 0.2);
  } else {
    playTone(ctx, 330, now, 0.24, 0.055);
  }
}

function updateSoundButtonUI() {
  const boutonSon = document.getElementById('toggle-son-btn');
  if (!boutonSon) return;

  const enabled = isSoundEnabled();
  const iconOn = boutonSon.querySelector('.son-icon-on');
  const iconOff = boutonSon.querySelector('.son-icon-off');
  const label = boutonSon.querySelector('.son-label');

  boutonSon.setAttribute('aria-pressed', String(enabled));
  boutonSon.classList.toggle('is-muted', !enabled);
  if (iconOn) iconOn.hidden = !enabled;
  if (iconOff) iconOff.hidden = enabled;
  if (label) label.textContent = enabled ? t('sound_on') : t('sound_off');
}

document.getElementById('toggle-son-btn')?.addEventListener('click', () => {
  const nextEnabled = !isSoundEnabled();
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(nextEnabled));
  } catch {
    /* stockage indisponible, le réglage ne persistera pas */
  }
  updateSoundButtonUI();
  if (nextEnabled) {
    playResultSound(16);
  }
});

updateSoundButtonUI();

/* ---------- Frise d'étapes du formulaire ---------- */

function updateProgressTracker(classeVal, notes) {
  if (!progressTracker || !progressTrackerFill || !progressTrackerLabel) return;

  if (!classeVal) {
    progressTracker.hidden = true;
    return;
  }

  const totalMatieres = getMatieresDisponiblesPourClasse(classeVal).length;
  const doneMatieres = Object.keys(notes).length;
  const percent = totalMatieres > 0 ? Math.min((doneMatieres / totalMatieres) * 100, 100) : 0;
  const isComplete = totalMatieres > 0 && doneMatieres >= totalMatieres;

  progressTracker.hidden = false;
  progressTracker.classList.toggle('is-complete', isComplete);
  progressTrackerFill.style.width = `${percent}%`;
  progressTrackerLabel.textContent = isComplete
    ? t('progress_label_complete', { done: doneMatieres, total: totalMatieres })
    : t('progress_label_default', { done: doneMatieres, total: totalMatieres });
}

function updateStepsTimeline() {
  const steps = document.querySelectorAll('.step-item');
  if (!steps.length) return;

  const classeVal = classeSelect.value.trim();
  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const hasBasicInfo = Boolean(nom && prenom && classeVal);

  const notes = classeVal ? getStoredNotesForClasse(classeVal) : {};
  const hasAtLeastOneMatiere = Object.keys(notes).length > 0;

  updateProgressTracker(classeVal, notes);

  steps.forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.remove('is-active', 'is-done');

    if (stepNumber === 1) {
      if (hasBasicInfo) {
        step.classList.add('is-done');
      } else {
        step.classList.add('is-active');
      }
    } else if (stepNumber === 2) {
      if (hasAtLeastOneMatiere) {
        step.classList.add('is-done');
      } else if (hasBasicInfo) {
        step.classList.add('is-active');
      }
    } else if (stepNumber === 3 && hasAtLeastOneMatiere) {
      step.classList.add('is-active');
    }
  });
}

document.getElementById('nom')?.addEventListener('input', updateStepsTimeline);
document.getElementById('prenom')?.addEventListener('input', updateStepsTimeline);

/* ---------- Validation en temps réel des champs de notes ---------- */
/* Donne un retour visuel (bordure verte/rouge) dès la saisie, plutôt que
   d'attendre la soumission du formulaire pour signaler une erreur. */

function updateNoteInputValidity(input) {
  const value = input.value.trim();

  if (!value) {
    // Champ vide : on n'affiche ni erreur ni validation, pour ne pas
    // décourager l'utilisateur avant même qu'il ait commencé à taper.
    input.classList.remove('is-valid', 'is-invalid');
    return;
  }

  const isValid = input.checkValidity();
  input.classList.toggle('is-valid', isValid);
  input.classList.toggle('is-invalid', !isValid);
}

document.querySelectorAll('.note-input').forEach((input) => {
  input.addEventListener('input', () => updateNoteInputValidity(input));
  input.addEventListener('blur', () => updateNoteInputValidity(input));
});


function renderMoyenneResult({ pillText, value, subtitleText, coefficientText, mention = false }) {
  resultat.classList.remove('error', 'shake');
  const resultContent = resultat.querySelector('.result-content');
  resultContent.replaceChildren();

  const grade = gradeClass(value);

  const summary = document.createElement('div');
  summary.className = 'result-summary';

  if (mention) {
    const { label, cls } = getMention(value);
    const { svg, isTop } = getMentionIcon(cls);
    const iconWrap = document.createElement('div');
    iconWrap.className = `mention-icon-wrap${isTop ? ' mention-icon-top' : ''}`;
    iconWrap.innerHTML = svg;
    summary.appendChild(iconWrap);
  }

  const resultPill = document.createElement('span');
  resultPill.className = 'result-pill';
  resultPill.textContent = pillText;

  const resultValue = document.createElement('strong');
  resultValue.className = 'result-value';
  resultValue.textContent = '0.00';

  const gauge = document.createElement('div');
  gauge.className = `moyenne-gauge ${grade}`;
  const gaugeTrack = document.createElement('div');
  gaugeTrack.className = 'moyenne-gauge-track';
  const gaugeFill = document.createElement('div');
  gaugeFill.className = 'moyenne-gauge-fill';
  gaugeTrack.appendChild(gaugeFill);
  gauge.appendChild(gaugeTrack);

  summary.append(resultPill, resultValue, gauge);

  if (mention) {
    const { label, cls } = getMention(value);
    const mentionBadge = document.createElement('span');
    mentionBadge.className = `mention-badge ${cls}`;
    mentionBadge.textContent = label;
    summary.appendChild(mentionBadge);
  }

  if (coefficientText) {
    const coeffLine = document.createElement('small');
    coeffLine.className = 'result-coeff';
    coeffLine.textContent = coefficientText;
    summary.appendChild(coeffLine);
  }

  const resultStudent = document.createElement('small');
  resultStudent.textContent = subtitleText;
  summary.appendChild(resultStudent);

  resultContent.appendChild(summary);

  requestAnimationFrame(() => {
    gaugeFill.style.width = `${Math.min((value / 20) * 100, 100)}%`;
  });

  animateValue(resultValue, 0, value);
  resultat.classList.remove('error');

  /* Dégradé de fond + effet d'apparition "récompense" cohérents avec la note */
  resultat.classList.remove('grade-faible', 'grade-moyen', 'grade-bien', 'is-revealing', 'is-exceptional');
  resultat.classList.add(grade);
  const isExceptional = value >= 16;
  if (isExceptional) {
    resultat.classList.add('is-exceptional');
  }
  void resultat.offsetWidth;
  resultat.classList.add('is-revealing');

  if (isExceptional) {
    launchConfetti(resultat);
  }

  updateFaviconBadge(value);
  playResultSound(value);
}

const matieresCommunesBase = [
  'Mathématiques',
  'Français',
  'SVT',
  'Anglais',
  'Histoire Géographie',
  'EC',
  'EPS',
  'Informatique',
  'E2C',
  'ECOFAM'
];

/* =========================================================
   COEFFICIENTS OFFICIELS SUGGERES
   Source lycée (S1/S2) : grille des épreuves du Baccalauréat
   sénégalais (Office du Bac), complétée pour les matières de
   bulletin non examinées au Bac (Espagnol, EPS) sur confirmation
   du porteur du projet. La 6e→3e n'a pas encore de grille
   officielle confirmée : le pré-remplissage y reste désactivé
   tant qu'une source fiable n'est pas fournie.
   ========================================================= */
const COEFFICIENTS_OFFICIELS = {
  lycee: {
    S1: {
      'Français': 3,
      'Philosophie': 2,
      'Histoire Géographie': 2,
      'Anglais': 2,
      'Mathématiques': 8,
      'Sciences Physiques': 8,
      'SVT': 2,
      'Espagnol': 2,
      'EPS': 1
    },
    S2: {
      'Français': 3,
      'Philosophie': 2,
      'Histoire Géographie': 2,
      'Anglais': 2,
      'Mathématiques': 5,
      'Sciences Physiques': 6,
      'SVT': 6,
      'Espagnol': 2,
      'EPS': 1
    }
  }
};

const CLASSES_LYCEE = ['2nde', '1er', 'Tle'];

function getCoefficientOfficiel(classe, matiere) {
  if (!CLASSES_LYCEE.includes(classe)) return null;

  const serie = document.querySelector('input[name="serie"]:checked')?.value;
  if (!serie) return null;

  const valeur = COEFFICIENTS_OFFICIELS.lycee[serie]?.[matiere];
  return typeof valeur === 'number' ? valeur : null;
}

function showCoefficientBadge() {
  if (!coefficientBadge) return;
  coefficientBadge.hidden = false;
  coefficientInput.dataset.suggested = 'true';
}

function hideCoefficientBadge() {
  if (!coefficientBadge) return;
  coefficientBadge.hidden = true;
  delete coefficientInput.dataset.suggested;
}

function updateCoefficientSuggestion() {
  const classe = classeSelect.value;
  const matiere = matiereSelect.value;
  const suggestion = matiere ? getCoefficientOfficiel(classe, matiere) : null;

  if (suggestion !== null) {
    coefficientInput.value = suggestion;
    showCoefficientBadge();
  } else {
    hideCoefficientBadge();
  }
}

const STORAGE_PREFIX = 'lynaqe_moyennes';

function getSemestreActuel() {
  return document.querySelector('input[name="semestre"]:checked')?.value || 'Semestre1';
}

function getClassStorageKey(classe, semestre = getSemestreActuel()) {
  return `${STORAGE_PREFIX}_${classe.replace(/\s+/g, '_')}_${semestre}`;
}

function getStoredNotesForClasse(classe, semestre = getSemestreActuel()) {
  const raw = localStorage.getItem(getClassStorageKey(classe, semestre));
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMatiereNote(classe, matiere, data) {
  const notes = getStoredNotesForClasse(classe);
  notes[matiere] = data;
  localStorage.setItem(getClassStorageKey(classe), JSON.stringify(notes));
  renderTableMatiere();
}

function getMatieresPourClasse(classe) {
  const baseMatieres = [...matieresCommunesBase];
  const matieresSansEconomie = baseMatieres.filter(
    matiere => matiere !== 'Economie Familiale et Sociale'
  );
  const matieresSansEconomieEtCivisme = matieresSansEconomie.filter(
    matiere => matiere !== 'Education au Civisme et à la Citoyenneté'
  );
  const matieresSansCivisme = baseMatieres.filter(
    matiere => matiere !== 'Education au Civisme et à la Citoyenneté'
  );

  if (classe === 'Tle') {
    return [...matieresSansEconomieEtCivisme, 'Sciences Physiques', 'Philosophie'];
  }

  if (classe === '1er') {
    return [...matieresSansEconomieEtCivisme, 'Sciences Physiques'];
  }

  if (classe === '2nde') {
    return [...matieresSansEconomie, 'Sciences Physiques'];
  }

  if (['4e', '3e'].includes(classe)) {
    return [...matieresSansCivisme, 'Sciences Physiques'];
  }

  return baseMatieres;
}

function getMatieresDisponiblesPourClasse(classe) {
  const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
  let matieres = getMatieresPourClasse(classe);

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe) && selectedLangue) {
    matieres = [...matieres, selectedLangue];
  }

  return [...new Set(matieres)];
}

function renderTableMatiere() {
  const classe = classeSelect.value;
  const semestre = getSemestreActuel();
  const notes = classe ? getStoredNotesForClasse(classe, semestre) : {};
  const entries = Object.entries(notes).sort(([a], [b]) => a.localeCompare(b));

  classeLabel.textContent = classe
    ? t('table_classe_label', { classe, semestre: semestre === 'Semestre1' ? t('table_semestre1_full') : t('table_semestre2_full') })
    : t('table_aucune_classe');

  updateCompareToggleVisibility();

  if (!entries.length) {
    tableBody.innerHTML = EMPTY_SUBJECTS_ROW_HTML;
    renderRadarChart([]);
    return;
  }

  tableBody.replaceChildren();

  entries.forEach(([matiere, data], index) => {
    const row = document.createElement('tr');
    row.className = 'row-in';
    row.style.animationDelay = prefersReducedMotion ? '0s' : `${index * 45}ms`;
    const moyenne = Number(data.moyenne);
    const coefficient = Number(data.coefficient);
    const points = Number(data.points ?? moyenne);

    [translateMatiere(matiere), moyenne.toFixed(2), coefficient, points.toFixed(2)].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionsCell = document.createElement('td');
    actionsCell.className = 'table-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'table-action edit-action';
    editButton.dataset.action = 'edit';
    editButton.dataset.matiere = matiere;
    editButton.textContent = t('table_modifier');

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'table-action delete-action';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.matiere = matiere;
    deleteButton.textContent = t('table_supprimer');

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);
    tableBody.appendChild(row);
  });

  renderRadarChart(entries);
  updateStepsTimeline();

  if (comparaisonPanel && !comparaisonPanel.hidden) {
    renderComparaisonSemestres();
  }
}

/* =========================================================
   COMPARAISON SEMESTRE 1 / SEMESTRE 2
   ========================================================= */
function updateCompareToggleVisibility() {
  if (!compareToggleBtn) return;
  const classe = classeSelect.value;

  if (!classe) {
    compareToggleBtn.hidden = true;
    hideComparaisonPanel();
    return;
  }

  const notesS1 = getStoredNotesForClasse(classe, 'Semestre1');
  const notesS2 = getStoredNotesForClasse(classe, 'Semestre2');
  const hasBoth = Object.keys(notesS1).length > 0 && Object.keys(notesS2).length > 0;

  compareToggleBtn.hidden = !hasBoth;
  if (!hasBoth) {
    hideComparaisonPanel();
  }
}

function hideComparaisonPanel() {
  if (!comparaisonPanel || comparaisonPanel.hidden) return;
  comparaisonPanel.hidden = true;
  if (compareToggleBtn) {
    compareToggleBtn.classList.remove('is-active');
    compareToggleBtn.innerHTML = `<span aria-hidden="true">⇄</span> ${t('compare_btn_open')}`;
  }
}

function renderComparaisonSemestres() {
  if (!comparaisonList) return;
  const classe = classeSelect.value;
  if (!classe) return;

  const notesS1 = getStoredNotesForClasse(classe, 'Semestre1');
  const notesS2 = getStoredNotesForClasse(classe, 'Semestre2');
  const matieres = [...new Set([...Object.keys(notesS1), ...Object.keys(notesS2)])].sort((a, b) =>
    a.localeCompare(b)
  );

  if (comparaisonSubtitle) {
    comparaisonSubtitle.textContent = t('compare_subtitle', { classe, n: matieres.length, s: matieres.length > 1 ? 's' : '' });
  }

  if (!matieres.length) {
    comparaisonList.innerHTML = `<p class="compare-empty">${t('compare_empty')}</p>`;
    return;
  }

  comparaisonList.innerHTML = matieres
    .map((matiere, index) => {
      const moyS1 = notesS1[matiere] ? Number(notesS1[matiere].moyenne) : null;
      const moyS2 = notesS2[matiere] ? Number(notesS2[matiere].moyenne) : null;

      let deltaHtml = `<span class="compare-delta compare-delta-new">${t('compare_new')}</span>`;
      if (moyS1 !== null && moyS2 !== null) {
        const delta = moyS2 - moyS1;
        if (delta > 0.05) {
          deltaHtml = `<span class="compare-delta compare-delta-up">▲ +${delta.toFixed(2)}</span>`;
        } else if (delta < -0.05) {
          deltaHtml = `<span class="compare-delta compare-delta-down">▼ ${delta.toFixed(2)}</span>`;
        } else {
          deltaHtml = `<span class="compare-delta compare-delta-stable">${t('compare_stable')}</span>`;
        }
      }

      const widthS1 = moyS1 !== null ? Math.min(100, (moyS1 / 20) * 100) : 0;
      const widthS2 = moyS2 !== null ? Math.min(100, (moyS2 / 20) * 100) : 0;
      const delay = prefersReducedMotion ? '0s' : `${index * 40}ms`;

      return `
        <div class="compare-row" style="animation-delay:${delay}">
          <div class="compare-row-head">
            <span class="compare-subject">${escapeXml(translateMatiere(matiere))}</span>
            ${deltaHtml}
          </div>
          <div class="compare-bars">
            <div class="compare-bar-line">
              <span class="compare-bar-label">Sem1</span>
              <div class="compare-bar-track"><div class="compare-bar-fill compare-bar-s1" style="width:${widthS1}%"></div></div>
              <span class="compare-bar-value">${moyS1 !== null ? moyS1.toFixed(2) : '—'}</span>
            </div>
            <div class="compare-bar-line">
              <span class="compare-bar-label">Sem2</span>
              <div class="compare-bar-track"><div class="compare-bar-fill compare-bar-s2" style="width:${widthS2}%"></div></div>
              <span class="compare-bar-value">${moyS2 !== null ? moyS2.toFixed(2) : '—'}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

compareToggleBtn?.addEventListener('click', () => {
  if (!comparaisonPanel) return;

  if (comparaisonPanel.hidden) {
    renderComparaisonSemestres();
    comparaisonPanel.hidden = false;
    compareToggleBtn.classList.add('is-active');
    compareToggleBtn.innerHTML = `<span aria-hidden="true">✕</span> ${t('compare_btn_close')}`;
    comparaisonPanel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  } else {
    hideComparaisonPanel();
  }
});

function updateMatieres() {
  const selectedClasse = classeSelect.value;

  matiereSelect.innerHTML = `<option value="">${t('option_matiere_default')}</option>`;

  if (!selectedClasse) {
    langueGroup.hidden = true;
    serieGroup.hidden = true;
    hideCoefficientBadge();
    renderTableMatiere();
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(selectedClasse)) {
    langueGroup.hidden = false;
  } else {
    langueGroup.hidden = true;
  }

  if (CLASSES_LYCEE.includes(selectedClasse)) {
    serieGroup.hidden = false;
  } else {
    serieGroup.hidden = true;
    hideCoefficientBadge();
  }

  const matieres = getMatieresDisponiblesPourClasse(selectedClasse);

  matieres.forEach(matiere => {
    const option = document.createElement('option');
    option.value = matiere;
    option.textContent = translateMatiere(matiere);
    matiereSelect.appendChild(option);
  });

  renderTableMatiere();
}

langueRadios.forEach(radio => radio.addEventListener('change', updateMatieres));

document.querySelectorAll('input[name="semestre"]').forEach((radio) => {
  radio.addEventListener('change', renderTableMatiere);
});

function setResult(message, isError = false) {
  resultat.classList.toggle('error', isError);
  resultat.classList.remove('grade-faible', 'grade-moyen', 'grade-bien', 'is-revealing');
  const resultContent = resultat.querySelector('.result-content');
  resultContent.replaceChildren();

  const resultTitle = document.createElement('h3');
  resultTitle.textContent = message;
  resultContent.appendChild(resultTitle);

  if (isError && !prefersReducedMotion) {
    resultat.classList.remove('shake');
    void resultat.offsetWidth;
    resultat.classList.add('shake');
  }

  if (nextSubjectBtn) nextSubjectBtn.hidden = true;
  masquerConseillerScolaire();
}

classeSelect.addEventListener('change', function () {
  langueRadios.forEach((radio) => {
    radio.checked = false;
  });
  serieRadios.forEach((radio) => {
    radio.checked = false;
  });
  updateMatieres();
  if (nextSubjectBtn) nextSubjectBtn.hidden = true;
});

matiereSelect.addEventListener('change', updateCoefficientSuggestion);

serieRadios.forEach((radio) => radio.addEventListener('change', updateCoefficientSuggestion));

coefficientInput.addEventListener('input', hideCoefficientBadge);

function toggleCompositionField() {
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value === 'oui';
  compositionGroup.classList.toggle('hidden', !hasComposition);
  compositionInput.required = hasComposition;

  if (!hasComposition) {
    compositionInput.value = '';
  }
}

document.querySelectorAll('input[name="hasComposition"]').forEach((radio) => {
  radio.addEventListener('change', toggleCompositionField);
});

toggleCompositionField();

partnerVisuals.forEach((visual) => {
  visual.addEventListener('pointerenter', () => visual.classList.add('is-hovered'));
  visual.addEventListener('pointerleave', () => visual.classList.remove('is-hovered'));
  visual.addEventListener('pointercancel', () => visual.classList.remove('is-hovered'));
});

const officialSiteLogo = document.querySelector('.official-site-logo');

if (officialSiteLogo && !prefersReducedMotion) {
  officialSiteLogo.closest('.official-site-button')?.addEventListener('click', () => {
    officialSiteLogo.classList.remove('is-tapped');
    void officialSiteLogo.offsetWidth;
    officialSiteLogo.classList.add('is-tapped');
  });
}

function isValidDecimalNote(value) {
  const raw = String(value).trim();
  if (!raw) return false;
  if (!/^(?:\d|1\d|20)(?:[.,](?:25|50|75))?$/.test(raw)) {
    return false;
  }

  const normalized = raw.replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 && number <= 20;
}

function parseDecimalNote(value) {
  return Number(String(value).trim().replace(',', '.'));
}

function calculerMoyenneDeMatiere() {
  const nom = document.getElementById('nom').value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const classe = document.getElementById('classe').value.trim();
  const matiere = document.getElementById('matiere').value.trim();
  const coefficient = Number(document.getElementById('coefficient').value);
  const devoir1Raw = document.getElementById('devoir1').value;
  const devoir2Raw = document.getElementById('devoir2').value;
  const hasComposition = document.querySelector('input[name="hasComposition"]:checked')?.value === 'oui';
  const compositionRaw = compositionInput.value;

  if (!nom || !prenom || !classe || !matiere) {
    setResult(t('msg_champs_manquants'), true);
    return null;
  }

  if (![devoir1Raw, devoir2Raw].every((value) => isValidDecimalNote(value))) {
    setResult(t('msg_notes_invalides'), true);
    return null;
  }

  if (!Number.isInteger(coefficient) || coefficient < 1 || coefficient > 8) {
    setResult(t('msg_coefficient_invalide'), true);
    return null;
  }

  if (hasComposition) {
    if (!isValidDecimalNote(compositionRaw)) {
      setResult(t('msg_composition_invalide'), true);
      return null;
    }
  }

  const devoir1 = parseDecimalNote(devoir1Raw);
  const devoir2 = parseDecimalNote(devoir2Raw);
  const composition = hasComposition ? parseDecimalNote(compositionRaw) : null;
  const moyenneDevoirs = (devoir1 + devoir2) / 2;
  const moyenneMatiere = hasComposition
    ? (moyenneDevoirs + composition) / 2
    : moyenneDevoirs;
  const points = moyenneMatiere * coefficient;

  saveMatiereNote(classe, matiere, {
    moyenne: moyenneMatiere,
    points,
    coefficient,
    devoir1,
    devoir2,
    composition,
    hasComposition,
    nom,
    prenom
  });

  renderMoyenneResult({
    pillText: translateMatiere(matiere),
    value: moyenneMatiere,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    coefficientText: t('result_coefficient_text', { n: coefficient }),
    mention: true
  });
  masquerConseillerScolaire();
  pulseCard();
  updateNextSubjectButton(classe);
  return { moyenneMatiere, coefficient };
}

form.addEventListener('submit', function (event) {
  event.preventDefault();
  calculerMoyenneDeMatiere();
});

/* =========================================================
   RACCOURCI "MATIÈRE SUIVANTE"
   ========================================================= */
function getMatieresRestantes(classe) {
  const semestre = getSemestreActuel();
  const notes = getStoredNotesForClasse(classe, semestre);
  const matieres = getMatieresDisponiblesPourClasse(classe);
  return matieres.filter((matiere) => !(matiere in notes));
}

function updateNextSubjectButton(classe) {
  if (!nextSubjectBtn) return;
  const restantes = getMatieresRestantes(classe);

  if (!restantes.length) {
    nextSubjectBtn.hidden = true;
    return;
  }

  nextSubjectBtn.hidden = false;
  nextSubjectBtn.dataset.nextMatiere = restantes[0];
}

nextSubjectBtn?.addEventListener('click', () => {
  const classe = classeSelect.value.trim();
  if (!classe) return;

  const restantes = getMatieresRestantes(classe);

  if (!restantes.length) {
    nextSubjectBtn.hidden = true;
    return;
  }

  const prochaine = restantes[0];
  if ([...matiereSelect.options].some((option) => option.value === prochaine)) {
    matiereSelect.value = prochaine;
  }

  document.getElementById('coefficient').value = '';
  document.getElementById('devoir1').value = '';
  document.getElementById('devoir2').value = '';
  compositionInput.value = '';

  document.querySelectorAll('.note-input').forEach((input) => {
    input.classList.remove('is-valid', 'is-invalid');
  });

  nextSubjectBtn.hidden = true;

  const calculatorCard = document.querySelector('.calculator-card');
  calculatorCard?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });

  window.setTimeout(() => {
    document.getElementById('coefficient')?.focus();
  }, prefersReducedMotion ? 0 : 350);
});

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[c]));
}

function renderRadarChart(entries) {
  const radarWrap = document.getElementById('radar-wrap');
  const svg = document.getElementById('radar-chart');
  if (!radarWrap || !svg) return;

  if (!entries.length) {
    radarWrap.hidden = true;
    svg.innerHTML = '';
    return;
  }

  radarWrap.hidden = false;

  const size = 360;
  const center = size / 2;
  const maxRadius = 120;
  const maxValue = 20;
  const levels = 4;
  const count = entries.length;
  const angleStep = (Math.PI * 2) / count;

  const pointFor = (index, value) => {
    const angle = angleStep * index - Math.PI / 2;
    const radius = (Math.min(value, maxValue) / maxValue) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  let svgContent = '';

  for (let level = 1; level <= levels; level += 1) {
    const r = (maxRadius / levels) * level;
    const points = entries
      .map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(' ');
    svgContent += `<polygon class="radar-grid" points="${points}" />`;
  }

  entries.forEach(([matiere], i) => {
    const angle = angleStep * i - Math.PI / 2;
    const x2 = center + maxRadius * Math.cos(angle);
    const y2 = center + maxRadius * Math.sin(angle);
    svgContent += `<line class="radar-axis" x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" />`;

    const labelRadius = maxRadius + 22;
    const lx = center + labelRadius * Math.cos(angle);
    const ly = center + labelRadius * Math.sin(angle);
    const displayName = translateMatiere(matiere);
    const shortLabel = displayName.length > 16 ? `${displayName.slice(0, 14)}…` : displayName;
    const anchor = Math.cos(angle) > 0.25 ? 'start' : Math.cos(angle) < -0.25 ? 'end' : 'middle';
    svgContent += `<text class="radar-label" x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(shortLabel)}</text>`;
  });

  const shapePoints = entries
    .map(([, data], i) => {
      const p = pointFor(i, Number(data.moyenne));
      return `${p.x},${p.y}`;
    })
    .join(' ');
  svgContent += `<polygon class="radar-shape" points="${shapePoints}" />`;

  entries.forEach(([, data], i) => {
    const p = pointFor(i, Number(data.moyenne));
    svgContent += `<circle class="radar-point" cx="${p.x}" cy="${p.y}" r="3.5" />`;
  });

  svg.innerHTML = svgContent;
}

const CITATIONS_DU_JOUR = {
  fr: [
    "La réussite est la somme de petits efforts répétés jour après jour.",
    "Un examen ne mesure pas ton intelligence, seulement ta préparation du moment.",
    "Relis tes cours le soir même : c’est le moment où la mémoire retient le mieux.",
    "Une bonne moyenne se construit devoir après devoir, pas la veille de la composition.",
    "Pose des questions en classe : ce n’est jamais une perte de temps.",
    "Un planning de révision simple vaut mieux qu’un plan parfait jamais suivi.",
    "Le sommeil avant un examen compte autant que les révisions.",
    "Comprendre un exercice vaut mieux que le mémoriser sans le comprendre.",
    "Chaque matière compte : ne néglige pas celles qui te semblent moins importantes.",
    "Fixe-toi un petit objectif clair pour chaque séance de révision.",
    "Les erreurs corrigées sont les meilleures leçons pour le prochain devoir.",
    "Travailler un peu chaque jour vaut mieux que tout réviser en une nuit.",
    "Note tes points faibles après chaque devoir pour savoir où progresser.",
    "La régularité bat le talent quand le talent ne travaille pas régulièrement.",
    "Un bon élève n’est pas celui qui ne se trompe jamais, mais celui qui persévère.",
    "Prends soin de ta concentration : coupe les distractions pendant que tu révises.",
    "Explique un cours à quelqu’un d’autre : c’est la meilleure façon de vérifier que tu l’as compris.",
    "Chaque semestre est une nouvelle chance de progresser, quel que soit le précédent.",
    "Ne te compare pas aux autres : compare-toi à toi-même et à tes progrès.",
    "La confiance en soi se construit par la préparation et la pratique, pas par la chance.",
    "Même un petit progrès chaque jour finit par faire une grande différence sur le long terme.",
    "Les révisions actives (exercices, questions) sont plus efficaces que la simple lecture.",
    "Un esprit reposé retient mieux : n’oublie pas de faire des pauses pendant tes révisions.",
  ],
  en: [
    "Success is the sum of small efforts repeated day after day.",
    "An exam doesn't measure your intelligence, only how prepared you are right now.",
    "Review your lessons the same evening: that's when memory retains best.",
    "A good average is built assignment after assignment, not the night before the exam.",
    "Ask questions in class: it's never a waste of time.",
    "A simple revision plan beats a perfect plan that's never followed.",
    "Sleep before an exam matters as much as revision.",
    "Understanding an exercise is worth more than memorizing it without understanding.",
    "Every subject counts: don't neglect the ones that seem less important.",
    "Set yourself one clear, small goal for each revision session.",
    "Corrected mistakes are the best lessons for the next assignment.",
    "Working a little every day beats cramming everything in one night.",
    "Note your weak points after each assignment to know where to improve.",
    "Consistency beats talent when talent doesn't work consistently.",
    "A good student isn't one who never makes mistakes, but one who perseveres.",
    "Look after your focus: cut out distractions while you revise.",
    "Explain a lesson to someone else: it's the best way to check you've understood it.",
    "Every semester is a new chance to improve, whatever happened before.",
    "Don't compare yourself to others: compare yourself to your own progress.",
    "Self-confidence is built through preparation and practice, not luck.",
    "Even small daily progress adds up to a big difference over time.",
    "Active revision (exercises, questions) is more effective than simple reading.",
    "A rested mind retains better: don't forget to take breaks while revising.",
  ]
};

function afficherCitationDuJour() {
  const quoteEl = document.getElementById('quote-of-day-text');
  if (!quoteEl) return;

  const debutAnnee = new Date(new Date().getFullYear(), 0, 0);
  const diffJours = Math.floor((new Date() - debutAnnee) / 86400000);
  const citations = CITATIONS_DU_JOUR[getLang()] || CITATIONS_DU_JOUR.fr;
  const citation = citations[diffJours % citations.length];
  quoteEl.textContent = citation;
}

function computeMoyennePonderee(matieres, notes) {
  const matieresCalculees = matieres
    .map(matiere => ({ matiere, note: notes[matiere] }))
    .filter(entry => entry.note);

  if (matieresCalculees.length !== matieres.length) {
    const matieresManquantes = matieres.filter(matiere => !notes[matiere]);
    return { complete: false, matieresManquantes };
  }

  const sommePoints = matieresCalculees.reduce(
    (total, item) => total + Number(item.note.points ?? item.note.moyenne),
    0
  );
  const sommeCoefficients = matieresCalculees.reduce((total, item) => total + Number(item.note.coefficient), 0);

  if (sommeCoefficients === 0) {
    return { complete: false, matieresManquantes: [] };
  }

  return { complete: true, value: sommePoints / sommeCoefficients, matieresCalculees };
}

const advisorSection = document.getElementById('conseiller-scolaire');
const advisorPointsFortsEl = document.getElementById('advisor-points-forts');
const advisorAAmeliorerEl = document.getElementById('advisor-a-ameliorer');
const advisorObjectifEl = document.getElementById('advisor-objectif');

function combineMatieresAnnuelles(resultS1, resultS2) {
  const map = new Map();

  (resultS1.matieresCalculees || []).forEach((item) => {
    map.set(item.matiere, {
      matiere: item.matiere,
      note: { moyenne: Number(item.note.moyenne), coefficient: Number(item.note.coefficient) }
    });
  });

  (resultS2.matieresCalculees || []).forEach((item) => {
    const existing = map.get(item.matiere);
    if (existing) {
      existing.note.moyenne = (existing.note.moyenne + Number(item.note.moyenne)) / 2;
    } else {
      map.set(item.matiere, {
        matiere: item.matiere,
        note: { moyenne: Number(item.note.moyenne), coefficient: Number(item.note.coefficient) }
      });
    }
  });

  return Array.from(map.values());
}

function getConseilScolaire(matieresCalculees, moyenneGenerale) {
  const sorted = [...matieresCalculees].sort((a, b) => Number(b.note.moyenne) - Number(a.note.moyenne));

  let pointsForts = sorted.filter((item) => Number(item.note.moyenne) >= 14).slice(0, 3);
  if (pointsForts.length === 0) {
    pointsForts = sorted.slice(0, Math.min(2, sorted.length));
  }

  let aAmeliorer = [...sorted].reverse().filter((item) => Number(item.note.moyenne) < 10).slice(0, 3);
  if (aAmeliorer.length === 0) {
    const faibles = [...sorted]
      .reverse()
      .filter((item) => Number(item.note.moyenne) < moyenneGenerale - 1);
    aAmeliorer = faibles.slice(0, 2);
  }

  let objectifText;

  if (moyenneGenerale >= 18) {
    objectifText = t('advisor_objectif_excellent', { value: moyenneGenerale.toFixed(2) });
  } else {
    let objectif = Math.ceil((moyenneGenerale + 1.5) * 2) / 2;
    objectif = Math.min(objectif, 20);

    const leviers = [...matieresCalculees]
      .filter((item) => Number(item.note.moyenne) < objectif)
      .sort((a, b) => {
        const coeffDiff = Number(b.note.coefficient) - Number(a.note.coefficient);
        if (coeffDiff !== 0) return coeffDiff;
        return Number(a.note.moyenne) - Number(b.note.moyenne);
      })
      .slice(0, 2)
      .map((item) => item.matiere);

    const leviersText = leviers.length
      ? t('advisor_leviers_with_subjects', { list: leviers.map(translateMatiere).join(getLang() === 'en' ? ' and ' : ' et ') })
      : t('advisor_leviers_none');

    objectifText = t('advisor_objectif_template', { objectif, leviers: leviersText });
  }

  return {
    pointsForts: pointsForts.map((item) => item.matiere),
    aAmeliorer: aAmeliorer.map((item) => item.matiere),
    objectifText
  };
}

function afficherConseillerScolaire(matieresCalculees, moyenneGenerale) {
  if (!advisorSection || !matieresCalculees || matieresCalculees.length < 2) {
    masquerConseillerScolaire();
    return;
  }

  const conseil = getConseilScolaire(matieresCalculees, moyenneGenerale);

  advisorPointsFortsEl.querySelector('.advisor-text').textContent = conseil.pointsForts.length
    ? t('advisor_points_forts_prefix', { list: conseil.pointsForts.map(translateMatiere).join(', ') })
    : t('advisor_points_forts_empty');

  advisorAAmeliorerEl.querySelector('.advisor-text').textContent = conseil.aAmeliorer.length
    ? t('advisor_a_ameliorer_prefix', { list: conseil.aAmeliorer.map(translateMatiere).join(', ') })
    : t('advisor_a_ameliorer_empty');

  advisorObjectifEl.querySelector('.advisor-text').textContent = conseil.objectifText;

  advisorSection.hidden = false;
  advisorSection.classList.remove('is-revealing');
  void advisorSection.offsetWidth;
  advisorSection.classList.add('is-revealing');
}

function masquerConseillerScolaire() {
  if (advisorSection) advisorSection.hidden = true;
}

boutonSemestre.addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const nom = document.getElementById('nom').value.trim();
  const semestre = getSemestreActuel();

  if (!classe) {
    setResult(t('msg_classe_requise_semestre'), true);
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe)) {
    const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
    if (!selectedLangue) {
      setResult(t('msg_langue_requise_semestre'), true);
      return;
    }
  }

  const matieres = getMatieresDisponiblesPourClasse(classe);
  const notes = getStoredNotesForClasse(classe, semestre);
  const result = computeMoyennePonderee(matieres, notes);

  if (!result.complete) {
    setResult(
      result.matieresManquantes.length
        ? t('msg_matieres_manquantes', { list: result.matieresManquantes.map(translateMatiere).join(', ') })
        : t('msg_aucun_coefficient'),
      true
    );
    return;
  }

  renderMoyenneResult({
    pillText: t('result_pill_semestre', { semestre: semestre === 'Semestre1' ? t('table_semestre1_full') : t('table_semestre2_full') }),
    value: result.value,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    mention: true
  });

  afficherConseillerScolaire(result.matieresCalculees, result.value);
});

document.getElementById('calculer-annee').addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const prenom = document.getElementById('prenom').value.trim();
  const nom = document.getElementById('nom').value.trim();

  if (!classe) {
    setResult(t('msg_classe_requise_annee'), true);
    return;
  }

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe)) {
    const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
    if (!selectedLangue) {
      setResult(t('msg_langue_requise_annee'), true);
      return;
    }
  }

  const matieres = getMatieresDisponiblesPourClasse(classe);
  const resultS1 = computeMoyennePonderee(matieres, getStoredNotesForClasse(classe, 'Semestre1'));
  const resultS2 = computeMoyennePonderee(matieres, getStoredNotesForClasse(classe, 'Semestre2'));

  if (!resultS1.complete || !resultS2.complete) {
    setResult(
      t('msg_semestre_incomplet', { semestre: !resultS1.complete ? t('msg_semestre1_court') : t('msg_semestre2_court') }),
      true
    );
    return;
  }

  const moyenneAnnuelle = (resultS1.value + resultS2.value) / 2;

  renderMoyenneResult({
    pillText: t('result_pill_annee'),
    value: moyenneAnnuelle,
    subtitleText: `${prenom} ${nom} • ${classe}`,
    mention: true
  });

  afficherConseillerScolaire(combineMatieresAnnuelles(resultS1, resultS2), moyenneAnnuelle);
});

// PDF Premium Generation Function
function generatePDFBulletin() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    showInfoDialog(t('msg_jspdf_manquant'));
    return;
  }

  const nom = document.getElementById('nom').value.trim() || 'DIOP';
  const prenom = document.getElementById('prenom').value.trim() || 'Mamadou';
  const classe = document.getElementById('classe').value.trim() || '2nde';
  const semestreVal = getSemestreActuel();
  const semestreText = semestreVal === 'Semestre1' ? t('pdf_semestre1_full') : t('pdf_semestre2_full');
  const notes = getStoredNotesForClasse(classe, semestreVal);
  const entries = Object.entries(notes);

  if (entries.length === 0) {
    showInfoDialog(t('msg_aucune_note_pdf'));
    return;
  }

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297

  // Double Cadre Soigné
  doc.setDrawColor(16, 47, 40); // Vert Foncé Premium (#102F28)
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(210, 168, 74); // Doré (#D2A84A)
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // Filigrane (Watermark en arrière-plan)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(232, 238, 234);
  doc.text("LYNAQE SÉDHIOU", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35
  });

  // Logo Intégré (taille normale, proportions respectées)
  const logoImg = document.querySelector('.brand-logo') || document.querySelector('.official-site-logo');
  if (logoImg && logoImg.complete && logoImg.naturalWidth !== 0) {
    try {
      const logoMaxHeight = 24; // hauteur de référence, en mm
      const logoMaxWidth = 22; // largeur maximale disponible, en mm
      const ratio = logoImg.naturalWidth / logoImg.naturalHeight;

      let logoHeight = logoMaxHeight;
      let logoWidth = logoHeight * ratio;

      if (logoWidth > logoMaxWidth) {
        logoWidth = logoMaxWidth;
        logoHeight = logoWidth / ratio;
      }

      doc.addImage(logoImg, 'PNG', 14, 13, logoWidth, logoHeight);
    } catch(e) {
      console.log("Erreur lors de l'intégration du logo :", e);
    }
  }

  // En-tête officiel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 47, 40);
  doc.text(t('pdf_republique'), pageWidth - 14, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(t('pdf_devise'), pageWidth - 14, 19, { align: "right" });
  doc.text(t('pdf_ministere'), pageWidth - 14, 23, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(t('pdf_lycee'), pageWidth - 14, 27, { align: "right" });

  // Ligne de séparation élégante
  doc.setDrawColor(16, 47, 40);
  doc.setLineWidth(0.8);
  doc.line(14, 43, pageWidth - 14, 43);
  doc.setDrawColor(210, 168, 74);
  doc.setLineWidth(0.4);
  doc.line(14, 44.2, pageWidth - 14, 44.2);

  // Bannière Titre
  doc.setFillColor(16, 47, 40);
  doc.roundedRect(14, 48, pageWidth - 28, 12, 2, 2, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(t('pdf_bulletin_titre', { semestre: semestreText.toUpperCase() }), pageWidth / 2, 55.5, { align: "center" });

  // Cartouche Informations Élève
  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(220, 220, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 64, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(16, 47, 40);
  doc.text(t('pdf_eleve', { nom: `${prenom.toUpperCase()} ${nom.toUpperCase()}` }), 18, 71);
  doc.text(t('pdf_classe', { classe }), 18, 78);

  const totalCoeff = entries.reduce((acc, [, item]) => acc + Number(item.coefficient), 0);
  const totalPoints = entries.reduce((acc, [, item]) => acc + Number(item.points ?? (item.moyenne * item.coefficient)), 0);
  const moyenneGen = totalCoeff > 0 ? (totalPoints / totalCoeff) : 0;
  const mentionObj = getMention(moyenneGen);

function getAnneeScolaire() {
  const aujourdhui = new Date();
  const annee = aujourdhui.getFullYear();
  const mois = aujourdhui.getMonth();

  if (mois < 8) {
    return `${annee - 1}-${annee}`;
  } else {
    return `${annee}-${annee + 1}`;
  }
}

const anneeScolaireEl = document.getElementById("annee-scolaire");
if (anneeScolaireEl) anneeScolaireEl.textContent = getAnneeScolaire();
  doc.text(t('pdf_moyenne_generale', { value: moyenneGen.toFixed(2) }), pageWidth - 18, 78, { align: "right" });

  // Tableau des Notes Soigné avec Colonne d'Appréciation
  const startY = 92;
  const colWidths = [45, 20, 20, 22, 20, 22, 33]; // Somme = 182
  const headers = [t('pdf_th_discipline'), t('pdf_th_devoir1'), t('pdf_th_devoir2'), t('pdf_th_compo'), t('pdf_th_coeff'), t('pdf_th_moyenne'), t('pdf_th_appreciation')];

  let curY = startY;

  // En-tête du tableau
  doc.setFillColor(23, 75, 61);
  doc.rect(14, curY, pageWidth - 28, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  let curX = 14;
  const colAligns = ["left", "center", "center", "center", "center", "center", "left"];

  headers.forEach((h, i) => {
    let xPos = curX + (colAligns[i] === "center" ? colWidths[i] / 2 : (colAligns[i] === "right" ? colWidths[i] - 2 : 2));
    doc.text(h, xPos, curY + 5.5, { align: colAligns[i] });
    curX += colWidths[i];
  });

  curY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  function getAppreciation(moy) {
    if (moy < 8) return t('pdf_appreciation_insuffisant');
    if (moy < 10) return t('pdf_appreciation_passable');
    if (moy < 12) return t('pdf_appreciation_assez_bien');
    if (moy < 14) return t('pdf_appreciation_bien');
    if (moy < 16) return t('pdf_appreciation_tres_bien');
    return t('pdf_appreciation_excellent');
  }

  // Lignes du tableau
  entries.forEach(([matiere, item], idx) => {
    const moy = Number(item.moyenne);
    const d1 = item.devoir1 !== undefined && item.devoir1 !== null ? Number(item.devoir1).toFixed(2) : '-';
    const d2 = item.devoir2 !== undefined && item.devoir2 !== null ? Number(item.devoir2).toFixed(2) : '-';
    const comp = item.hasComposition ? (item.composition !== null ? Number(item.composition).toFixed(2) : '-') : 'N/A';
    const coeff = item.coefficient;
    const app = getAppreciation(moy);

    if (idx % 2 === 0) {
      doc.setFillColor(250, 249, 245);
      doc.rect(14, curY, pageWidth - 28, 7, 'F');
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(14, curY + 7, pageWidth - 14, curY + 7);

    doc.setTextColor(30, 30, 30);
    let x = 14;

    const rowData = [translateMatiere(matiere), d1, d2, comp, String(coeff), moy.toFixed(2), app];

    rowData.forEach((val, i) => {
      let xPos = x + (colAligns[i] === "center" ? colWidths[i] / 2 : (colAligns[i] === "right" ? colWidths[i] - 2 : 2));
      if (i === 5) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      doc.text(val, xPos, curY + 4.8, { align: colAligns[i] });
      x += colWidths[i];
    });

    curY += 7;
  });

  // Bordure extérieure du tableau
  doc.setDrawColor(16, 47, 40);
  doc.setLineWidth(0.5);
  doc.rect(14, startY, pageWidth - 28, curY - startY);

  // Synthèse Finale
  curY += 6;
  doc.setFillColor(243, 241, 233);
  doc.setDrawColor(16, 47, 40);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, curY, pageWidth - 28, 16, 1.5, 1.5, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 47, 40);
  doc.text(t('pdf_total_coefficients', { n: totalCoeff }), 18, curY + 6);
  doc.text(t('pdf_total_points', { n: totalPoints.toFixed(2) }), 18, curY + 12);

  doc.text(t('pdf_moyenne_semestrielle', { value: moyenneGen.toFixed(2) }), pageWidth / 2 - 10, curY + 6);

  doc.setTextColor(210, 100, 30);
  doc.text(t('pdf_mention', { label: mentionObj.label }), pageWidth - 18, curY + 9, { align: "right" });

  // Bloc Cadre de Signatures
  curY += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(16, 47, 40);

  // Cadre 1 : Parents
  doc.text(t('pdf_obs_parents'), 14, curY);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(14, curY + 3, 55, 25);

  // Cadre 2 : Professeur Principal
  doc.text(t('pdf_prof_principal'), pageWidth / 2 - 27.5, curY);
  doc.rect(pageWidth / 2 - 27.5, curY + 3, 55, 25);

  // Cadre 3 : Le Proviseur
  doc.text(t('pdf_commandant'), pageWidth - 69, curY);
  doc.rect(pageWidth - 69, curY + 3, 55, 25);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(t('pdf_signature_cachet'), pageWidth - 41.5, curY + 16, { align: "center" });

  // Bas de page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(t('pdf_footer_doc'), pageWidth / 2, pageHeight - 12, { align: "center" });

  doc.save(`Bulletin_${prenom}_${nom}_${classe}_${semestreVal}.pdf`);
}

function PDF_BUTTON_DEFAULT_LABEL_FN() { return t('pdf_button_default'); }
function PDF_BUTTON_SUCCESS_LABEL_FN() { return t('pdf_button_success'); }

function setPdfButtonLabel(text) {
  const label = boutonTelechargerPdf?.querySelector('.pdf-button-label');
  if (label) label.textContent = text;
}

function handleTelechargerBulletinClick() {
  if (!boutonTelechargerPdf || boutonTelechargerPdf.classList.contains('is-loading')) return;

  boutonTelechargerPdf.classList.remove('is-success');
  boutonTelechargerPdf.classList.add('is-loading');
  boutonTelechargerPdf.disabled = true;
  boutonTelechargerPdf.setAttribute('aria-busy', 'true');
  setPdfButtonLabel(t('pdf_button_generating'));

  const finishLoading = (success) => {
    boutonTelechargerPdf.classList.remove('is-loading');

    if (success) {
      // Bref état de succès (coche + barre pleine) avant de revenir à l'état initial :
      // donne une confirmation claire que le bulletin a bien été généré.
      boutonTelechargerPdf.classList.add('is-success');
      setPdfButtonLabel(PDF_BUTTON_SUCCESS_LABEL_FN());

      window.setTimeout(() => {
        boutonTelechargerPdf.classList.remove('is-success');
        boutonTelechargerPdf.disabled = false;
        boutonTelechargerPdf.removeAttribute('aria-busy');
        setPdfButtonLabel(PDF_BUTTON_DEFAULT_LABEL_FN());
      }, 1300);
    } else {
      boutonTelechargerPdf.disabled = false;
      boutonTelechargerPdf.removeAttribute('aria-busy');
      setPdfButtonLabel(PDF_BUTTON_DEFAULT_LABEL_FN());
    }
  };

  // On laisse le navigateur peindre le spinner et la barre de progression avant de lancer
  // la génération (synchrone et potentiellement lourde) du PDF, sinon l'UI resterait figée
  // sans retour visuel.
  window.setTimeout(() => {
    try {
      generatePDFBulletin();
      finishLoading(true);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      setResult(t('msg_erreur_pdf'), true);
      finishLoading(false);
    }
  }, 30);
}

boutonTelechargerPdf?.addEventListener('click', handleTelechargerBulletinClick);

tableBody.addEventListener('click', function (event) {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;

  const classe = classeSelect.value.trim();
  const matiere = actionButton.dataset.matiere;
  const notes = getStoredNotesForClasse(classe);
  const note = notes[matiere];

  if (!classe || !note) return;

  if (actionButton.dataset.action === 'delete') {
    showConfirmDialog({
      message: t('confirm_supprimer_matiere', { matiere: translateMatiere(matiere) }),
      onConfirm: () => {
        delete notes[matiere];
        localStorage.setItem(getClassStorageKey(classe), JSON.stringify(notes));
        renderTableMatiere();
        setResult(t('msg_matiere_supprimee', { matiere: translateMatiere(matiere) }));
      },
    });
    return;
  }

  matiereSelect.value = matiere;
  document.getElementById('coefficient').value = note.coefficient ?? '';
  hideCoefficientBadge();
  document.getElementById('devoir1').value = note.devoir1 ?? '';
  document.getElementById('devoir2').value = note.devoir2 ?? '';
  compositionInput.value = note.composition ?? '';
  document.getElementById('nom').value = note.nom ?? '';
  document.getElementById('prenom').value = note.prenom ?? '';
  document.querySelectorAll('.note-input').forEach((input) => updateNoteInputValidity(input));

  const compositionRadio = document.querySelector(
    `input[name="hasComposition"][value="${note.hasComposition === false ? 'non' : 'oui'}"]`
  );
  if (compositionRadio) compositionRadio.checked = true;
  toggleCompositionField();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setResult(t('msg_matiere_prete_modif', { matiere: translateMatiere(matiere) }));
});

boutonReset.addEventListener('click', function () {
  const classe = classeSelect.value.trim();
  const confirmMessage = classe
    ? t('confirm_reset_classe', { classe })
    : t('confirm_reset_all');

  showConfirmDialog({
    message: confirmMessage,
    onConfirm: () => {
      if (classe) {
        localStorage.removeItem(getClassStorageKey(classe, 'Semestre1'));
        localStorage.removeItem(getClassStorageKey(classe, 'Semestre2'));
      } else {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
          .forEach((key) => localStorage.removeItem(key));
      }

      form.reset();
      document.querySelectorAll('.note-input').forEach((input) => {
        input.classList.remove('is-valid', 'is-invalid');
      });
      toggleCompositionField();

      renderTableMatiere();
      setResult(t('msg_donnees_reinitialisees'), false);
      if (!classe) {
        matiereSelect.innerHTML = `<option value="">${t('option_matiere_default')}</option>`;
        classeSelect.value = '';
        langueGroup.hidden = true;
      }
    },
  });
});

afficherCitationDuJour();
updateMatieres();
renderTableMatiere();
restoreFaviconBadgeFromStorage();
animateHeroPreview();

/* =========================================================
   APERÇU ANIMÉ DU BULLETIN (hero)
   ========================================================= */
function animateHeroPreview() {
  const heroPreviewValue = document.getElementById('hero-preview-value');
  if (!heroPreviewValue) return;

  const targetValue = 16;

  if (prefersReducedMotion) {
    heroPreviewValue.textContent = targetValue.toFixed(2);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateValue(heroPreviewValue, 0, targetValue, 1100);
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });

  observer.observe(heroPreviewValue.closest('.hero-preview'));
}

/* =========================================================
   MODE CLAIR/SOMBRE
   ========================================================= */
(() => {
  const THEME_KEY = 'sunu_moyenne_theme';
  const REVEAL_MS = 480;
  let themeAnimating = false;

  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  }
  function save(key, value) { try { localStorage.setItem(key, value); } catch {} }

  function applyTheme() {
    const dark = getTheme() === 'dark';
    document.documentElement.classList.toggle('dark-mode', dark);
    const btn = document.getElementById('toggle-theme-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      const label = btn.querySelector('.theme-label');
      const icon = btn.querySelector('.theme-icon');
      if (label) label.textContent = dark ? t('theme_btn_to_light') : t('theme_btn_to_dark');
      if (icon) icon.textContent = dark ? '☀️' : '🌙';
    }
  }

  window.applyThemeLabels = applyTheme;
  applyTheme();

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();

    document.getElementById('toggle-theme-btn')?.addEventListener('click', (event) => {
      if (themeAnimating) return;

      const btn = event.currentTarget;
      const nextIsDark = getTheme() !== 'dark';
      const commitChange = () => {
        save(THEME_KEY, nextIsDark ? 'dark' : 'light');
        applyTheme();
      };

      // Petite pop sur l'icône lune/soleil, à chaque clic
      const icon = btn.querySelector('.theme-icon');
      if (icon && !prefersReducedMotion) {
        icon.classList.remove('pop');
        void icon.offsetWidth; // force reflow pour pouvoir rejouer l'animation
        icon.classList.add('pop');
      }

      if (prefersReducedMotion) {
        commitChange();
        return;
      }

      const overlay = document.getElementById('theme-reveal-overlay');
      if (!overlay) {
        commitChange();
        return;
      }

      // Voile circulaire léger : un simple <div> qui grandit depuis le
      // bouton pour couvrir l'écran, on bascule le thème pendant qu'il est
      // caché dessous, puis le voile se referme pour révéler le résultat.
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      overlay.style.setProperty('--theme-x', `${x}px`);
      overlay.style.setProperty('--theme-y', `${y}px`);
      overlay.style.setProperty('--theme-radius', `${maxRadius}px`);
      overlay.style.background = nextIsDark ? '#101915' : '#f5f1e8';

      themeAnimating = true;
      overlay.classList.remove('shrink');
      // reflow pour garantir le départ à 0 avant de lancer la croissance
      void overlay.offsetWidth;
      overlay.classList.add('grow');

      window.setTimeout(() => {
        commitChange();
        overlay.classList.remove('grow');
        overlay.classList.add('shrink');

        window.setTimeout(() => {
          overlay.classList.remove('shrink');
          themeAnimating = false;
        }, REVEAL_MS);
      }, REVEAL_MS);
    });
  });
})();

/* =========================================================
   LANGUE FR / EN
   ========================================================= */
(() => {
  const LANG_FADE_MS = 180;

  function applyLangButton() {
    const btn = document.getElementById('toggle-lang-btn');
    if (!btn) return;
    const label = btn.querySelector('.lang-label');
    const icon = btn.querySelector('.lang-icon');
    const switchingToEnglish = getLang() === 'fr';
    if (label) label.textContent = t('lang_switch_btn');
    if (icon) {
      const code = switchingToEnglish ? 'gb' : 'fr';
      icon.src = `https://flagcdn.com/w40/${code}.png`;
      icon.srcset = `https://flagcdn.com/w80/${code}.png 2x`;
    }
    btn.setAttribute('aria-label', switchingToEnglish ? 'Passer en anglais' : 'Switch to French');
  }

  applyStaticTranslations();
  applyLangButton();
  setPdfButtonLabel(t('pdf_button_default'));

  document.addEventListener('DOMContentLoaded', () => {
    applyStaticTranslations();
    applyLangButton();
    setPdfButtonLabel(t('pdf_button_default'));

    document.getElementById('toggle-lang-btn')?.addEventListener('click', (event) => {
      const btn = event.currentTarget;
      const icon = btn.querySelector('.lang-icon');
      const shell = document.querySelector('.page-shell');

      const swapContent = () => {
        setLang(getLang() === 'fr' ? 'en' : 'fr');
        applyStaticTranslations();
        applyLangButton();
        refreshDynamicTranslatedTexts();
      };

      // Petite pop sur l'icône globe, à chaque clic
      if (icon && !prefersReducedMotion) {
        icon.classList.remove('pop');
        void icon.offsetWidth; // force reflow pour pouvoir rejouer l'animation
        icon.classList.add('pop');
      }

      if (prefersReducedMotion || !shell) {
        swapContent();
        return;
      }

      // Léger fondu du contenu pendant que tous les textes changent
      shell.classList.add('lang-fade');
      window.setTimeout(() => {
        swapContent();
        shell.classList.remove('lang-fade');
      }, LANG_FADE_MS);
    });
  });
})();

/* =========================================================
   FAQ — animation d'ouverture / fermeture
   ========================================================= */
(() => {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  // Durée de l'animation, alignée sur la transition CSS (0.4s).
  const ANIM_DURATION = 400;

  items.forEach((item) => {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.faq-answer');
    if (!summary || !answer) return;

    // Le contenu doit toujours rester dans le DOM pour pouvoir animer
    // aussi bien la fermeture que l'ouverture. On maintient donc le
    // <details> ouvert en permanence et on pilote l'affichage via la
    // classe is-faq-closed (qui replie la grille à hauteur 0).
    item.open = true;
    answer.classList.add('is-faq-closed');

    let animating = false;

    function toggleFaq() {
      // En reduced motion l'animation est instantanée (CSS désactivé) :
      // on ne bloque pas les clics.
      if (animating && !prefersReducedMotion) return;
      animating = true;

      answer.classList.toggle('is-faq-closed');

      // On laisse la transition CSS se terminer avant d'admettre un
      // nouveau clic (sauf en reduced motion où c'est instantané).
      window.setTimeout(() => {
        animating = false;
      }, prefersReducedMotion ? 0 : ANIM_DURATION);
    }

    // Clic souris / tactile : on neutralise le basculement natif du
    // <details> (déjà maintenu ouvert) pour piloter l'animation nous-mêmes.
    summary.addEventListener('click', (event) => {
      event.preventDefault();
      toggleFaq();
    });

    // Accessibilité clavier : Entrée et Espace déclenchent aussi l'animation.
    summary.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFaq();
      }
    });
  });
})();

/* =========================================================
   MODALE DE CONFIRMATION PERSONNALISÉE
   Remplace window.confirm() par une modale stylée du site.
   ========================================================= */
const confirmModal = {
  el: document.getElementById('confirm-modal'),
  titleEl: document.getElementById('confirm-modal-title'),
  iconSvg: document.querySelector('#confirm-modal .confirm-modal-icon svg'),
  messageEl: document.getElementById('confirm-modal-message'),
  okBtn: document.getElementById('confirm-modal-ok'),
  cancelBtn: document.getElementById('confirm-modal-cancel'),
  onConfirm: null,
  closing: false,

  show({ message, onConfirm, danger = true, info = false }) {
    if (!this.el) return;
    this.onConfirm = onConfirm || null;
    this.messageEl.textContent = message;
    this.el.hidden = false;
    this.closing = false;
    this.el.classList.remove('is-closing', 'is-danger-soft', 'is-info');
    if (info) {
      this.el.classList.add('is-info');
      this.cancelBtn.hidden = true;
      this.okBtn.textContent = t('confirm_modal_close');
      this.titleEl.textContent = t('confirm_modal_info_title');
      this.titleEl.removeAttribute('data-i18n');
      this.iconSvg.innerHTML =
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<line x1="12" y1="16" x2="12" y2="12"></line>' +
        '<line x1="12" y1="8" x2="12.01" y2="8"></line>';
    } else {
      this.cancelBtn.hidden = false;
      this.okBtn.textContent = t('confirm_modal_ok');
      this.titleEl.textContent = t('confirm_modal_title');
      this.titleEl.setAttribute('data-i18n', 'confirm_modal_title');
      this.iconSvg.innerHTML =
        '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
        '<line x1="12" y1="9" x2="12" y2="13"></line>' +
        '<line x1="12" y1="17" x2="12.01" y2="17"></line>';
    }
    if (!danger && !info) this.el.classList.add('is-danger-soft');
    this.okBtn.focus({ preventScroll: true });
  },

  hide() {
    if (this.closing || !this.el) return;
    this.closing = true;
    this.el.classList.add('is-closing');
    const done = () => {
      this.el.hidden = true;
      this.el.classList.remove('is-closing');
      this.closing = false;
      this.onConfirm = null;
    };
    window.setTimeout(done, prefersReducedMotion ? 0 : 250);
  },

  confirm() {
    const fn = this.onConfirm;
    this.onConfirm = null;
    this.hide();
    if (fn) fn();
  },
};

if (confirmModal.el) {
  confirmModal.okBtn.addEventListener('click', () => confirmModal.confirm());
  confirmModal.cancelBtn.addEventListener('click', () => confirmModal.hide());

  confirmModal.el.addEventListener('click', (event) => {
    if (event.target === confirmModal.el) confirmModal.hide();
  });

  document.addEventListener('keydown', (event) => {
    if (confirmModal.el.hidden) return;
    if (event.key === 'Escape') confirmModal.hide();
  });
}

function showConfirmDialog(options) {
  confirmModal.show(options);
}

function showInfoDialog(message) {
  confirmModal.show({ message, info: true });
}