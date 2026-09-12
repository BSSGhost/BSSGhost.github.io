/* =========================================================
   SYSTEME DE TRADUCTION FR / EN
   ========================================================= */
const LANG_KEY = 'sunu_moyenne_lang';

/* Clés de stockage de l'espace professeur (définies ici aussi pour que la
   réinitialisation globale du site puisse les purger ; prof.js conserve ses
   propres constantes dans son IIFE). */
const PROF_STORE_KEY = 'lynaqe_prof_classes';
const PROF_AUTH_KEY = 'lynaqe_prof_token';
const PROF_ROWS_PREFIX = 'lynaqe_prof_rows';

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
    device_modal_eyebrow: "Paramètres d'affichage",
    device_modal_title: "Adapter l'affichage",
    device_modal_subtitle: "Le site détecte automatiquement la taille de votre écran. Vous pouvez forcer un affichage ci-dessous si besoin.",
    device_auto: "Automatique",
    device_phone: "Téléphone",
    device_tablet: "Tablette",
    device_computer: "Ordinateur",
    change_device_btn: "Affichage",
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
    back_to_calculer_btn: "Revenir à l'écran calculer",
    see_evolution_btn: "Voir mon évolution",
    bulletin_ready_text: "Votre bulletin est prêt ! Vous pouvez le télécharger dans l'onglet Bulletin.",
    goto_bulletin_btn: "Voir mon bulletin",
    bulletin_preview_empty: "Vos matières apparaîtront ici au fur et à mesure.",
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
    lang_change_title: "Changer de langue",
    lang_change_message: "Vous avez déjà enregistré des notes en {langue}. Voulez-vous choisir {newLangue} à la place ?",
    lang_change_replace: "Remplacer",
    lang_change_keep_both: "Conserver les deux",
    lang_change_replaced: "Les notes en {langue} ont été supprimées.",
    lang_change_kept_both: "La langue {langue} est conservée : les deux langues font désormais partie des matières de la classe.",
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
    about_h3: "À propos de SUNU MOYENNE",
    about_subtitle: "Le projet, ses fonctionnalités et vos données",
    about_intro: "SUNU MOYENNE est un outil numérique qui permet aux élèves du LYNAQE de Sédhiou de calculer, suivre et analyser leurs résultats scolaires, du collège (6e) au lycée (Terminale).",
    about_features_title: "Ce que fait l'application",
    about_feature_1: "Calcul des moyennes de matière, de semestre et annuelle",
    about_feature_2: "Suivi de la progression par semestre",
    about_feature_3: "Comparaison entre le semestre 1 et le semestre 2",
    about_feature_4: "Génération d'un bulletin scolaire en PDF",
    about_feature_5: "Sauvegarde automatique sur l'appareil",
    about_feature_6: "Fonctionnement hors ligne une fois le site déjà visité",
    about_privacy_title: "Confidentialité",
    about_privacy_text: "Vos notes restent sur votre appareil. Elles ne sont jamais envoyées ni stockées sur un serveur.",
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
    confirm_reset_all: "Toutes les données enregistrées seront définitivement supprimées : vos notes et matières, vos classes de l'espace professeur, votre profil élève et votre objectif personnel. Voulez-vous continuer ?",
    confirm_modal_title: "Êtes-vous sûr ?",
    confirm_modal_ok: "Confirmer",
    confirm_modal_cancel: "Annuler",
    confirm_modal_close: "Fermer",
    confirm_modal_info_title: "Information",
    msg_erreur_pdf: "Une erreur est survenue pendant la génération du bulletin. Veuillez réessayer.",
    msg_jspdf_manquant: "Erreur: La bibliothèque jsPDF n'est pas chargée.",
    msg_erreur_generation_pdf: "Une erreur est survenue pendant la génération du PDF. Veuillez réessayer.",
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

    historique_open_btn: "Mon parcours",
    historique_h3: "Mon parcours scolaire",
    historique_subtitle: "Votre progression, de la 6e à la Terminale",
    historique_back_btn: "Revenir à l'écran évolution",
    historique_empty: "Aucune donnée enregistrée pour le moment sur cet appareil. Renseignez vos matières pour voir apparaître votre parcours ici.",

    advisor_points_forts_prefix: "Tes points forts : {list}",
    advisor_points_forts_empty: "Continue tes efforts, aucune matière ne se démarque encore nettement.",
    advisor_a_ameliorer_prefix: "À améliorer : {list}",
    advisor_a_ameliorer_empty: "Aucune matière en difficulté particulière, bravo pour cet équilibre !",
    advisor_objectif_excellent: "Excellent niveau ({value}/20) : continue sur cette lancée pour viser l'excellence.",
    advisor_objectif_template: "Pour atteindre {objectif}/20 : {leviers}",
    advisor_objectif_personnel_template: "Pour atteindre ton objectif personnel de {objectif}/20 : {leviers}",
    advisor_objectif_personnel_atteint: "Bravo, tu as déjà atteint ton objectif personnel de {objectif}/20 (moyenne actuelle : {value}/20) ! Continue sur cette lancée pour viser encore plus haut.",
    advisor_leviers_with_subjects: "augmente principalement tes résultats en {list}.",
    advisor_leviers_none: "continue à consolider l'ensemble de tes matières.",
    advisor_evolution_prefix: "Évolution : {delta} depuis le semestre précédent.",
    advisor_evolution_empty: "Renseigne les deux semestres pour observer ton évolution.",
    advisor_conseil_progression: "Une progression de {delta} point est observée.",
    advisor_conseil_baisse: "Une baisse de {delta} point est observée.",
    advisor_conseil_stable: "Ta moyenne est stable.",
    advisor_title_analyse: "Analyse de {prenom}",

    objectif_label: "Mon objectif de moyenne",
    objectif_placeholder: "Ex : 14",
    objectif_no_data: "Ajoutez des matières ci-dessus pour suivre votre progression vers cet objectif.",
    objectif_reached: "Objectif atteint ! Moyenne actuelle : {value}/20 🎉",
    objectif_gap: "Il vous manque {diff} point(s) pour atteindre votre objectif (moyenne actuelle : {value}/20).",

    result_pill_semestre: "Moyenne du {semestre}",
    result_pill_annee: "Moyenne annuelle",
    result_coefficient_text: "Coefficient {n}",

    tab_calculer: "Calculer",
    tab_resultats: "Résultats",
    tab_evolution: "Évolution",
    tab_bulletin: "Bulletin",
    tab_conseils: "Conseils",
    bulletin_screen_title: "Mon bulletin",
    bulletin_screen_subtitle: "Téléchargez un récapitulatif de vos notes en PDF, dès que toutes les matières de la classe sont renseignées.",

    pdf_app_name: "SUNU MOYENNE",
    pdf_app_subtitle: "Bulletin récapitulatif généré par SUNU MOYENNE",
    pdf_etablissement: "LYNAQE Sédhiou",
    pdf_bulletin_titre: "Récapitulatif - {semestre}",
    pdf_semestre1_full: "1er Semestre",
    pdf_semestre2_full: "2ème Semestre",
    pdf_eleve: "Élève : {nom}",
    pdf_classe: "Classe : {classe}",
    pdf_annee_scolaire: "Année scolaire : {annee}",
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
    pdf_footer_doc: "Document numérique généré à titre informatif. Les résultats doivent être vérifiés auprès de l'établissement.",
    pdf_appreciation_insuffisant: "Insuffisant",
    pdf_appreciation_passable: "Passable",
    pdf_appreciation_assez_bien: "Assez Bien",
    pdf_appreciation_bien: "Bien",
    pdf_appreciation_tres_bien: "Très Bien",
    pdf_appreciation_excellent: "Excellent",

    pdf_button_default: "Télécharger mon bulletin (PDF)",
    pdf_button_generating: "Génération en cours…",
    pdf_button_success: "Bulletin téléchargé",
    pdf_button_incomplete_title: "Renseignez la moyenne de toutes les matières de la classe pour débloquer le téléchargement",
    msg_matieres_incompletes: "Le bulletin n'est téléchargeable que lorsque toutes les matières de la classe ont leur moyenne renseignée.",

    tab_professeur: "Prof",
    prof_login_eyebrow: "Espace réservé",
    prof_login_title: "Espace Professeur",
    prof_login_subtitle: "Mode réservé aux enseignants et surveillants : calculez en quelques secondes la moyenne de matière de chaque élève de la classe à partir du relevé de notes (photo ou PDF).",
    prof_password_label: "Mot de passe",
    prof_password_placeholder: "Entrez le mot de passe",
    prof_login_btn: "Se connecter",
    prof_login_error: "Mot de passe incorrect. Veuillez réessayer.",
    prof_login_hint: "Réservé au corps enseignant du LYNAQE Sédhiou.",
    prof_console_title: "Calcul des moyennes de matière",
    prof_console_subtitle: "Indiquez la matière, le coefficient puis chargez le relevé de notes (photo ou PDF). Les moyennes de chaque élève sont calculées instantanément.",
    prof_logout_btn: "Se déconnecter",
    prof_upload_label: "Relevé de notes de la matière",
    prof_dropzone_title: "Glissez le relevé (photo ou PDF) ici",
    prof_dropzone_subtitle: "ou cliquez pour parcourir vos fichiers",
    prof_dropzone_aria: "Charger un relevé de notes (photo ou PDF)",
    prof_file_remove: "Retirer",
    prof_upload_note: "Le relevé sert d'aide visuelle pour la saisie. Reportez simplement les notes de chaque élève dans le tableau ci-dessous : les moyennes se calculent en direct.",
    prof_preview_label: "Relevé importé",
    prof_students_title: "Notes des élèves",
    prof_th_eleve: "Élève",
    prof_th_moyenne: "Moyenne",
    prof_no_students: "Aucun élève ajouté pour le moment. Ajoutez des élèves depuis l'onglet « Élèves » de la classe puis reportez les notes depuis le relevé.",
    prof_remove_student: "Supprimer l'élève",
    prof_summary_title: "Résultats de la classe",
    prof_export_pdf: "Télécharger le relevé (PDF)",
    prof_export_csv: "Exporter en CSV",
    prof_matiere_custom_option: "Autre : saisir le nom…",
    prof_matiere_custom_label: "Autre matière",
    prof_matiere_custom_placeholder: "Saisissez le nom de la matière",
    prof_name_placeholder: "Nom",
    prof_prenom_placeholder: "Prénom",
    prof_stat_effectifs: "Effectif",
    prof_stat_eleves_label: "Élèves",
    prof_stat_matieres_label: "Matières",
    prof_stat_classes: "classes",
    prof_stat_class: "classe",
    prof_stat_eleves: "élèves",
    prof_stat_classe_avg: "Moyenne de la classe",
    prof_stat_best: "Meilleure moyenne",
    prof_stat_worst: "Moyenne la plus basse",
    prof_file_type_error: "Format non pris en charge. Veuillez charger une photo (JPG, PNG…) ou un fichier PDF.",
    prof_msg_classe_requise: "Veuillez sélectionner une classe pour calculer les moyennes.",
    prof_msg_matiere_requise: "Veuillez sélectionner la matière concernée.",
    prof_msg_coefficient_requis: "Veuillez renseigner un coefficient valide, entre 1 et 8.",
    prof_msg_aucun_eleve: "Ajoutez au moins un élève avant d'exporter le relevé.",
    prof_pdf_title: "Relevé de notes — {matiere}",
    prof_pdf_mention_col: "Mention",
    prof_pdf_eleve_col: "Élève",
    prof_ocr_scan_btn: "Scanner le relevé (OCR)",
    prof_ocr_scanning: "Analyse en cours…",
    prof_ocr_progress: "Extraction du texte… {pct} %",
    prof_ocr_verify_title: "Vérifier les données extraites",
    prof_ocr_verify_subtitle: "Corrigez les erreurs ci-dessous avant d'appliquer au tableau.",
    prof_ocr_confidence: "Confiance",
    prof_ocr_apply: "Appliquer au tableau",
    prof_ocr_cancel: "Annuler",
    prof_ocr_overwrite_confirm: "{count} note(s) déjà saisie(s) seraient remplacées par les valeurs scannées. Continuer ?",
    prof_ocr_overwrite_confirm_ok: "Remplacer",
    prof_ocr_rescan: "Ré-scanner",
    prof_ocr_add_row: "Ajouter une ligne",
    prof_ocr_remove_row: "Supprimer",
    prof_ocr_no_data: "Aucune donnée extraite. Essayez avec une photo plus nette.",
    prof_ocr_error: "Erreur lors de l'analyse. Veuillez réessayer.",
    prof_ocr_only_images: "Le scanner OCR fonctionne uniquement avec les photos (JPG, PNG…) ou les PDF.",
    prof_ocr_loading_deps: "Chargement du module OCR…",
    prof_ocr_no_file: "Veuillez charger une photo ou un PDF du relevé de notes avant de lancer le scan.",
    prof_ocr_pdf_conversion: "Conversion du PDF en image…",
    prof_ocr_pdf_error: "Impossible de convertir le PDF. Essayez avec une photo du relevé.",
    prof_save_success: "Notes sauvegardées avec succès !",
    prof_save_btn: "Sauvegarder les notes",
    prof_back_classes: "Mes classes",
    prof_back_class: "Retour à la classe",
    prof_classes_title: "Mes classes",
    prof_classes_subtitle: "Choisissez une classe, puis ouvrez vos élèves et vos matières.",
    prof_new_class_placeholder: "Nouvelle classe (ex : 2nde S04)",
    prof_add_class: "Ajouter",
    prof_class_edit_title: "Modifier le nom de la classe",
    prof_rename_class: "Renommer",
    prof_delete_class: "Supprimer",
    prof_class_open: "Ouvrir",
    prof_class_actions_label: "Actions de la classe",
    prof_open_class_btn: "Ouvrir la classe",
    prof_class_progress_label: "État de la classe",
    prof_create_class_title: "Créer une classe",
    prof_create_class_desc: "Ajoutez une nouvelle classe pour gérer vos élèves.",
    prof_new_class_btn: "Nouvelle classe",
    prof_level_6e: "Classe de 6ème",
    prof_level_5e: "Classe de 5ème",
    prof_level_4e: "Classe de 4ème",
    prof_level_3e: "Classe de 3ème",
    prof_level_2nde: "Classe de 2nde",
    prof_level_1er: "Classe de 1ère",
    prof_level_tle: "Classe de Terminale",
    prof_class_students: "Élèves",
    prof_student_add: "Ajouter un élève",
    prof_student_form_ok: "Valider",
    prof_student_edit: "Modifier",
    prof_student_delete: "Supprimer",
    prof_student_bulletin: "Voir le bulletin",
    prof_th_rang: "Rang",
    prof_class_subjects: "Matières du semestre",
    prof_add_subject: "Ajouter une matière",
    prof_subject_create: "Créer",
    prof_subject_open: "Saisir les notes",
    prof_subject_delete: "Supprimer",
    prof_subjects_empty: "Aucune matière renseignée pour ce semestre.",
    prof_students_empty: "Aucun élève dans cette classe pour ce semestre.",
    prof_confirm_delete_class: "Supprimer la classe « {classe} » ? Toutes ses notes seront perdues.",
    prof_confirm_delete_student: "Supprimer cet élève de la classe ? Ses notes seront aussi supprimées.",
    prof_confirm_delete_subject: "Supprimer la matière « {matiere} » ? Ses notes seront perdues.",
    prof_msg_class_exists: "Cette classe existe déjà.",
    prof_msg_class_name_empty: "Veuillez saisir un nom pour la classe.",
    prof_msg_subject_exists: "Cette matière existe déjà pour ce semestre.",
    prof_msg_subject_select: "Veuillez choisir une matière.",
    prof_edit_annuler: "Annuler",
    prof_edit_enregistrer: "Enregistrer",
    prof_edit_banner_title: "Modification de « {matiere} »",
    prof_edit_old_value: "Ancienne valeur : {v}",
    prof_edit_new_value: "Nouvelle valeur : {v}",
    prof_bulletin_title: "Bulletin de {eleve}",
    prof_bulletin_semester_avg: "Moyenne du semestre",
    prof_bulletin_mention: "Mention",
    prof_bulletin_close: "Fermer",
    prof_tab_dash: "Tableau de bord",
    prof_tab_classes: "Mes classes",
    prof_dash_greeting: "Bonjour, Professeur 👋",
    prof_dash_subtitle: "Voici un aperçu complet de votre espace : suivez les moyennes, les classements et les élèves à aider.",
    prof_dash_stat_classes: "classes",
    prof_dash_stat_students: "élèves",
    prof_dash_stat_subjects: "matières",
    prof_dash_stat_average: "Moyenne générale",
    prof_dash_quick_classes: "Mes classes",
    prof_dash_quick_classes_desc: "Gérer vos classes et saisir les notes",
    prof_dash_quick_students: "Mes élèves",
    prof_dash_quick_students_desc: "Rechercher et filtrer les élèves",
    prof_dash_quick_stats: "Statistiques",
    prof_dash_quick_stats_desc: "Moyennes, médiane, distribution",
    prof_dash_quick_ranking: "Classement",
    prof_dash_quick_ranking_desc: "Rangs et meilleures performances",
    prof_dash_quick_difficult: "Élèves en difficulté",
    prof_dash_quick_difficult_desc: "Moyennes inférieures à 10",
    prof_dash_quick_top: "Meilleures performances",
    prof_dash_quick_top_desc: "Les élèves au-dessus de 15",
    prof_dash_rank_title: "Classement des élèves",
    prof_dash_rank_all_subjects: "Moyenne générale",
    prof_dash_rank_col_rank: "Rang",
    prof_dash_rank_col_student: "Élève",
    prof_dash_rank_col_avg: "Moyenne",
    prof_dash_rank_col_evolution: "Évolution",
    prof_dash_rank_col_mention: "Mention",
    prof_dash_stats_title: "Statistiques de la classe",
    prof_dash_students_title: "Mes élèves",
    prof_dash_search_placeholder: "🔍 Rechercher un élève…",
    prof_dash_filter_all: "Toutes",
    prof_dash_filter_class: "Classe",
    prof_dash_filter_perf: "Performance",
    prof_dash_filter_rank: "Rang",
    prof_dash_filter_high: "≥ 15",
    prof_dash_filter_mid: "10 – 15",
    prof_dash_filter_low: "< 10",
    prof_dash_filter_top5: "Top 5",
    prof_dash_filter_top10: "Top 10",
    prof_dash_filter_improve: "À améliorer",
    prof_dash_summary_title: "Résumé",
    prof_dash_summary_avg: "Moyenne de la classe",
    prof_dash_summary_best: "Meilleure moyenne",
    prof_dash_summary_worst: "Plus faible moyenne",
    prof_dash_summary_median: "Médiane",
    prof_dash_summary_count: "Nombre d'élèves",
    prof_dash_summary_pass: "Élèves ≥ 10",
    prof_dash_summary_fail: "Élèves < 10",
    prof_dash_summary_success: "Taux de réussite",
    prof_dash_distribution: "Distribution des moyennes",
    prof_dash_avg_by_subject: "Moyenne par matière",
    prof_dash_comparison: "Comparaison Semestre 1 / Semestre 2",
    prof_dash_mentions: "Répartition des mentions",
    prof_dash_mention_excellent: "Excellent",
    prof_dash_mention_tb: "Très bien",
    prof_dash_mention_bien: "Bien",
    prof_dash_mention_ab: "Assez bien",
    prof_dash_mention_passable: "Passable",
    prof_dash_mention_insuffisant: "Insuffisant",
    prof_dash_empty_classes: "Aucune classe pour le moment. Créez votre première classe pour démarrer.",
    prof_dash_empty_btn: "Créer une classe",
    prof_dash_empty_rank: "Aucun élève avec une moyenne calculée.",
    prof_dash_empty_stats: "Renseignez des notes pour afficher les statistiques.",
    prof_dash_empty_students: "Aucun élève ne correspond à la recherche.",
    prof_dash_profile_title: "Profil de l'élève",
    prof_dash_profile_rank_of: "{rang}e / {total}",
    prof_dash_profile_year: "Année",
    prof_dash_profile_s1: "Semestre 1",
    prof_dash_profile_s2: "Semestre 2",
    prof_dash_profile_subjects: "Ses matières",
    prof_dash_profile_subject: "Matière",
    prof_dash_profile_subject_avg: "Moyenne",
    prof_dash_profile_subject_evolution: "Évolution",
    prof_dash_profile_close: "Fermer",
    prof_dash_profile_no_subjects: "Aucune matière renseignée.",
    prof_dash_profile_evolution_title: "Évolution des moyennes (Semestre 1 → Semestre 2)",
    prof_img_rotate_left: "Pivoter ↶",
    prof_img_rotate_right: "Pivoter ↷",
    prof_img_crop: "Recadrer",
    prof_img_enhance: "Améliorer",
    prof_crop_title: "Recadrer l'image",
    prof_crop_apply: "Appliquer",
    prof_crop_cancel: "Annuler",
    prof_crop_hint: "Tirez pour délimiter la zone à conserver.",
    prof_crop_reset: "Réinitialiser"
  },
  en: {
    device_modal_eyebrow: "Display settings",
    device_modal_title: "Adjust the display",
    device_modal_subtitle: "The site automatically detects your screen size. You can force a display below if needed.",
    device_auto: "Automatic",
    device_phone: "Phone",
    device_tablet: "Tablet",
    device_computer: "Computer",
    change_device_btn: "Display",
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
    back_to_calculer_btn: "Back to the calculator screen",
    see_evolution_btn: "See my progress",
    bulletin_ready_text: "Your report card is ready! You can download it from the Report card tab.",
    goto_bulletin_btn: "View my report card",
    bulletin_preview_empty: "Your subjects will appear here as you add them.",
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
    lang_change_title: "Switch language",
    lang_change_message: "You already have grades saved in {langue}. Do you want to choose {newLangue} instead?",
    lang_change_replace: "Replace",
    lang_change_keep_both: "Keep both",
    lang_change_replaced: "Grades saved in {langue} have been deleted.",
    lang_change_kept_both: "The {langue} language is kept: both languages are now part of the class subjects.",
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
    about_h3: "About SUNU MOYENNE",
    about_subtitle: "The project, its features and your data",
    about_intro: "SUNU MOYENNE is a digital tool that lets LYNAQE Sédhiou students calculate, track and analyze their school results, from middle school (6e) to high school (Terminale).",
    about_features_title: "What the app does",
    about_feature_1: "Calculating subject, semester and annual averages",
    about_feature_2: "Tracking progress by semester",
    about_feature_3: "Comparing semester 1 and semester 2",
    about_feature_4: "Generating a school report card as a PDF",
    about_feature_5: "Automatic saving on your device",
    about_feature_6: "Offline use once the site has already been visited",
    about_privacy_title: "Privacy",
    about_privacy_text: "Your grades stay on your device. They are never sent to or stored on a server.",
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
    confirm_reset_all: "All saved data will be permanently deleted: your grades and subjects, your teacher-space classes, your student profile and your personal goal. Do you want to continue?",
    confirm_modal_title: "Are you sure?",
    confirm_modal_ok: "Confirm",
    confirm_modal_cancel: "Cancel",
    confirm_modal_close: "Close",
    confirm_modal_info_title: "Information",
    msg_erreur_pdf: "An error occurred while generating the report card. Please try again.",
    msg_jspdf_manquant: "Error: The jsPDF library is not loaded.",
    msg_erreur_generation_pdf: "An error occurred while generating the PDF. Please try again.",
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

    historique_open_btn: "My journey",
    historique_h3: "My school journey",
    historique_subtitle: "Your progress, from 6th grade to Terminale",
    historique_back_btn: "Back to the progress screen",
    historique_empty: "No data saved yet on this device. Enter your subjects to see your journey appear here.",

    advisor_points_forts_prefix: "Your strengths: {list}",
    advisor_points_forts_empty: "Keep up your efforts, no subject stands out clearly yet.",
    advisor_a_ameliorer_prefix: "To improve: {list}",
    advisor_a_ameliorer_empty: "No subject in particular difficulty, well done for this balance!",
    advisor_objectif_excellent: "Excellent level ({value}/20): keep up this momentum to aim for excellence.",
    advisor_objectif_template: "To reach {objectif}/20: {leviers}",
    advisor_objectif_personnel_template: "To reach your personal goal of {objectif}/20: {leviers}",
    advisor_objectif_personnel_atteint: "Well done, you've already reached your personal goal of {objectif}/20 (current average: {value}/20)! Keep it up and aim even higher.",
    advisor_leviers_with_subjects: "mainly improve your results in {list}.",
    advisor_leviers_none: "keep consolidating all your subjects.",
    advisor_evolution_prefix: "Trend: {delta} from the previous semester.",
    advisor_evolution_empty: "Fill in both semesters to track your trend.",
    advisor_conseil_progression: "An improvement of {delta} point is observed.",
    advisor_conseil_baisse: "A drop of {delta} point is observed.",
    advisor_conseil_stable: "Your average is stable.",
    advisor_title_analyse: "Analysis of {prenom}",

    objectif_label: "My target average",
    objectif_placeholder: "E.g. 14",
    objectif_no_data: "Add subjects above to track your progress toward this goal.",
    objectif_reached: "Goal reached! Current average: {value}/20 🎉",
    objectif_gap: "You need {diff} more point(s) to reach your goal (current average: {value}/20).",

    result_pill_semestre: "{semestre} average",
    result_pill_annee: "Annual average",
    result_coefficient_text: "Coefficient {n}",

    tab_calculer: "Calculate",
    tab_resultats: "Results",
    tab_evolution: "Progress",
    tab_bulletin: "Report card",
    tab_conseils: "Advice",
    bulletin_screen_title: "My report card",
    bulletin_screen_subtitle: "Download a PDF summary of your grades once every subject for the class has been filled in.",

    pdf_app_name: "SUNU MOYENNE",
    pdf_app_subtitle: "Summary report generated by SUNU MOYENNE",
    pdf_etablissement: "LYNAQE Sédhiou",
    pdf_bulletin_titre: "Summary - {semestre}",
    pdf_semestre1_full: "1st Semester",
    pdf_semestre2_full: "2nd Semester",
    pdf_eleve: "Student: {nom}",
    pdf_classe: "Grade level: {classe}",
    pdf_annee_scolaire: "School year: {annee}",
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
    pdf_footer_doc: "Digital document generated for informational purposes only. Results should be verified with the school.",
    pdf_appreciation_insuffisant: "Insufficient",
    pdf_appreciation_passable: "Pass",
    pdf_appreciation_assez_bien: "Fairly Good",
    pdf_appreciation_bien: "Good",
    pdf_appreciation_tres_bien: "Very Good",
    pdf_appreciation_excellent: "Excellent",

    pdf_button_default: "Download my report card (PDF)",
    pdf_button_generating: "Generating…",
    pdf_button_success: "Report card downloaded",
    pdf_button_incomplete_title: "Fill in the average for every subject in the class to unlock the download",
    msg_matieres_incompletes: "The report card can only be downloaded once every subject in the class has its average filled in.",

    tab_professeur: "Teacher",
    prof_login_eyebrow: "Restricted area",
    prof_login_title: "Teacher area",
    prof_login_subtitle: "Restricted to teachers and supervisors: compute the subject average for every student in the class in seconds, from the grade sheet (photo or PDF).",
    prof_password_label: "Password",
    prof_password_placeholder: "Enter the password",
    prof_login_btn: "Sign in",
    prof_login_error: "Incorrect password. Please try again.",
    prof_login_hint: "For LYNAQE Sédhiou teaching staff only.",
    prof_console_title: "Subject averages for the class",
    prof_console_subtitle: "Enter the subject, the coefficient, then upload the grade sheet (photo or PDF). Every student's average is computed live.",
    prof_logout_btn: "Sign out",
    prof_upload_label: "Grade sheet for the subject",
    prof_dropzone_title: "Drop the grade sheet (photo or PDF) here",
    prof_dropzone_subtitle: "or click to browse your files",
    prof_dropzone_aria: "Upload a grade sheet (photo or PDF)",
    prof_file_remove: "Remove",
    prof_upload_note: "The sheet is a visual aid for data entry. Simply copy each student's grades into the table below: averages are computed instantly.",
    prof_preview_label: "Imported sheet",
    prof_students_title: "Student grades",
    prof_th_eleve: "Student",
    prof_th_moyenne: "Average",
    prof_no_students: "No student added yet. Add students from the \"Students\" tab of the class, then copy the grades from the sheet.",
    prof_remove_student: "Delete the student",
    prof_summary_title: "Class results",
    prof_export_pdf: "Download the grade sheet (PDF)",
    prof_export_csv: "Export as CSV",
    prof_matiere_custom_option: "Other: type the name…",
    prof_matiere_custom_label: "Other subject",
    prof_matiere_custom_placeholder: "Type the subject name",
    prof_name_placeholder: "Last name",
    prof_prenom_placeholder: "First name",
    prof_stat_effectifs: "Students",
    prof_stat_eleves_label: "Students",
    prof_stat_matieres_label: "Subjects",
    prof_stat_classes: "classes",
    prof_stat_class: "class",
    prof_stat_eleves: "students",
    prof_stat_classe_avg: "Class average",
    prof_stat_best: "Best average",
    prof_stat_worst: "Lowest average",
    prof_file_type_error: "Unsupported format. Please upload a photo (JPG, PNG…) or a PDF file.",
    prof_msg_classe_requise: "Please select a class to compute the averages.",
    prof_msg_matiere_requise: "Please select the relevant subject.",
    prof_msg_coefficient_requis: "Please enter a valid coefficient, between 1 and 8.",
    prof_msg_aucun_eleve: "Add at least one student before exporting the sheet.",
    prof_pdf_title: "Grade sheet — {matiere}",
    prof_pdf_mention_col: "Grade",
    prof_pdf_eleve_col: "Student",
    prof_ocr_scan_btn: "Scan the grade sheet (OCR)",
    prof_ocr_scanning: "Analyzing…",
    prof_ocr_progress: "Extracting text… {pct} %",
    prof_ocr_verify_title: "Verify extracted data",
    prof_ocr_verify_subtitle: "Fix any errors below before applying to the table.",
    prof_ocr_confidence: "Confidence",
    prof_ocr_apply: "Apply to table",
    prof_ocr_cancel: "Cancel",
    prof_ocr_overwrite_confirm: "{count} already-entered grade(s) would be replaced by the scanned values. Continue?",
    prof_ocr_overwrite_confirm_ok: "Replace",
    prof_ocr_rescan: "Rescan",
    prof_ocr_add_row: "Add a row",
    prof_ocr_remove_row: "Remove",
    prof_ocr_no_data: "No data extracted. Try a clearer photo.",
    prof_ocr_error: "Analysis failed. Please try again.",
    prof_ocr_only_images: "OCR scanning only works with photos (JPG, PNG…) or PDFs.",
    prof_ocr_loading_deps: "Loading OCR module…",
    prof_ocr_no_file: "Please upload a photo or PDF of the grade sheet before scanning.",
    prof_ocr_pdf_conversion: "Converting PDF to image…",
    prof_ocr_pdf_error: "Could not convert the PDF. Try with a photo of the grade sheet.",
    prof_save_success: "Notes saved successfully!",
    prof_save_btn: "Save notes",
    prof_back_classes: "My classes",
    prof_back_class: "Back to class",
    prof_classes_title: "My classes",
    prof_classes_subtitle: "Pick a class, then open your students and your subjects.",
    prof_new_class_placeholder: "New class (e.g. Grade 9 B)",
    prof_add_class: "Add",
    prof_class_edit_title: "Edit the class name",
    prof_rename_class: "Rename",
    prof_delete_class: "Delete",
    prof_class_open: "Open",
    prof_class_actions_label: "Class actions",
    prof_open_class_btn: "Open class",
    prof_class_progress_label: "Class status",
    prof_create_class_title: "Create a class",
    prof_create_class_desc: "Add a new class to manage your students.",
    prof_new_class_btn: "New class",
    prof_level_6e: "Grade 6 class",
    prof_level_5e: "Grade 5 class",
    prof_level_4e: "Grade 4 class",
    prof_level_3e: "Grade 3 class",
    prof_level_2nde: "Grade 10 class",
    prof_level_1er: "Grade 11 class",
    prof_level_tle: "Grade 12 class",
    prof_class_students: "Students",
    prof_student_add: "Add a student",
    prof_student_form_ok: "Save",
    prof_student_edit: "Edit",
    prof_student_delete: "Delete",
    prof_student_bulletin: "View report card",
    prof_th_rang: "Rank",
    prof_class_subjects: "Subjects of the semester",
    prof_add_subject: "Add a subject",
    prof_subject_create: "Create",
    prof_subject_open: "Enter grades",
    prof_subject_delete: "Delete",
    prof_subjects_empty: "No subject set for this semester.",
    prof_students_empty: "No student in this class for this semester.",
    prof_confirm_delete_class: "Delete the class \"{classe}\"? All its grades will be lost.",
    prof_confirm_delete_student: "Remove this student from the class? Their grades will also be removed.",
    prof_confirm_delete_subject: "Delete the subject \"{matiere}\"? Its grades will be lost.",
    prof_msg_class_exists: "This class already exists.",
    prof_msg_class_name_empty: "Please enter a name for the class.",
    prof_msg_subject_exists: "This subject already exists for this semester.",
    prof_msg_subject_select: "Please choose a subject.",
    prof_edit_annuler: "Cancel",
    prof_edit_enregistrer: "Save",
    prof_edit_banner_title: "Editing \"{matiere}\"",
    prof_edit_old_value: "Old value: {v}",
    prof_edit_new_value: "New value: {v}",
    prof_bulletin_title: "Report card of {eleve}",
    prof_bulletin_semester_avg: "Semester average",
    prof_bulletin_mention: "Grade",
    prof_bulletin_close: "Close",
    prof_tab_dash: "Dashboard",
    prof_tab_classes: "My classes",
    prof_dash_greeting: "Hello, Teacher 👋",
    prof_dash_subtitle: "Here is a complete overview of your space: track averages, rankings and students who need help.",
    prof_dash_stat_classes: "classes",
    prof_dash_stat_students: "students",
    prof_dash_stat_subjects: "subjects",
    prof_dash_stat_average: "Overall average",
    prof_dash_quick_classes: "My classes",
    prof_dash_quick_classes_desc: "Manage your classes and enter grades",
    prof_dash_quick_students: "My students",
    prof_dash_quick_students_desc: "Search and filter students",
    prof_dash_quick_stats: "Statistics",
    prof_dash_quick_stats_desc: "Averages, median, distribution",
    prof_dash_quick_ranking: "Ranking",
    prof_dash_quick_ranking_desc: "Ranks and best performances",
    prof_dash_quick_difficult: "Students struggling",
    prof_dash_quick_difficult_desc: "Averages below 10",
    prof_dash_quick_top: "Top performances",
    prof_dash_quick_top_desc: "Students above 15",
    prof_dash_rank_title: "Student ranking",
    prof_dash_rank_all_subjects: "Overall average",
    prof_dash_rank_col_rank: "Rank",
    prof_dash_rank_col_student: "Student",
    prof_dash_rank_col_avg: "Average",
    prof_dash_rank_col_evolution: "Trend",
    prof_dash_rank_col_mention: "Honour",
    prof_dash_stats_title: "Class statistics",
    prof_dash_students_title: "My students",
    prof_dash_search_placeholder: "🔍 Search for a student…",
    prof_dash_filter_all: "All",
    prof_dash_filter_class: "Class",
    prof_dash_filter_perf: "Performance",
    prof_dash_filter_rank: "Rank",
    prof_dash_filter_high: "≥ 15",
    prof_dash_filter_mid: "10 – 15",
    prof_dash_filter_low: "< 10",
    prof_dash_filter_top5: "Top 5",
    prof_dash_filter_top10: "Top 10",
    prof_dash_filter_improve: "Needs improvement",
    prof_dash_summary_title: "Summary",
    prof_dash_summary_avg: "Class average",
    prof_dash_summary_best: "Best average",
    prof_dash_summary_worst: "Lowest average",
    prof_dash_summary_median: "Median",
    prof_dash_summary_count: "Number of students",
    prof_dash_summary_pass: "Students ≥ 10",
    prof_dash_summary_fail: "Students < 10",
    prof_dash_summary_success: "Pass rate",
    prof_dash_distribution: "Average distribution",
    prof_dash_avg_by_subject: "Average by subject",
    prof_dash_comparison: "Semester 1 / Semester 2 comparison",
    prof_dash_mentions: "Honour breakdown",
    prof_dash_mention_excellent: "Excellent",
    prof_dash_mention_tb: "Very good",
    prof_dash_mention_bien: "Good",
    prof_dash_mention_ab: "Fairly good",
    prof_dash_mention_passable: "Passable",
    prof_dash_mention_insuffisant: "Insufficient",
    prof_dash_empty_classes: "No classes yet. Create your first class to get started.",
    prof_dash_empty_btn: "Create a class",
    prof_dash_empty_rank: "No student with a calculated average yet.",
    prof_dash_empty_stats: "Enter some grades to display the statistics.",
    prof_dash_empty_students: "No student matches the search.",
    prof_dash_profile_title: "Student profile",
    prof_dash_profile_rank_of: "{rang}th / {total}",
    prof_dash_profile_year: "Year",
    prof_dash_profile_s1: "Semester 1",
    prof_dash_profile_s2: "Semester 2",
    prof_dash_profile_subjects: "Their subjects",
    prof_dash_profile_subject: "Subject",
    prof_dash_profile_subject_avg: "Average",
    prof_dash_profile_subject_evolution: "Trend",
    prof_dash_profile_close: "Close",
    prof_dash_profile_no_subjects: "No subject set.",
    prof_dash_profile_evolution_title: "Average trend (Semester 1 → Semester 2)",
    prof_img_rotate_left: "Rotate ↶",
    prof_img_rotate_right: "Rotate ↷",
    prof_img_crop: "Crop",
    prof_img_enhance: "Enhance",
    prof_crop_title: "Crop the image",
    prof_crop_apply: "Apply",
    prof_crop_cancel: "Cancel",
    prof_crop_hint: "Drag to select the area to keep.",
    prof_crop_reset: "Reset"
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
  if (typeof window.refreshBulletinPreview === 'function') {
    window.refreshBulletinPreview();
  }
  const historiqueScreen = document.querySelector('.app-screen[data-screen="historique"]');
  if (historiqueScreen && historiqueScreen.classList.contains('is-active') && typeof window.refreshHistoriqueScreen === 'function') {
    window.refreshHistoriqueScreen();
  }
  const professeurScreen = document.querySelector('.app-screen[data-screen="professeur"]');
  if (professeurScreen && professeurScreen.classList.contains('is-active') && typeof window.refreshProfesseurTexts === 'function') {
    window.refreshProfesseurTexts();
  }
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

/* Icône + message plus engageant pour le tableau de matières vide.
   Générée dynamiquement via t() pour rester traduite après un premier
   rendu (contrairement à une chaîne HTML statique figée en français). */
function getEmptySubjectsRowHtml() {
  return `
    <tr>
      <td colspan="5" class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 14a3 3 0 0 1 3-3h9l3 4h18a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V14Z"></path>
          <path d="M18 27l4 4 8-9"></path>
        </svg>
        <p class="empty-state-title">${escapeXml(t('empty_state_title'))}</p>
        <p class="empty-state-subtitle">${escapeXml(t('empty_state_subtitle'))}</p>
      </td>
    </tr>
  `;
}

/* =========================================================
   OBJECTIF PERSONNEL DE MOYENNE
   Permet à l'élève de fixer sa propre cible de moyenne et de
   suivre visuellement l'écart au fil des matières saisies.
   ========================================================= */
const OBJECTIF_PERSONNEL_KEY = 'sunu_moyenne_objectif_personnel';

function getObjectifPersonnel() {
  try {
    const stored = localStorage.getItem(OBJECTIF_PERSONNEL_KEY);
    const value = parseFloat(stored);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function setObjectifPersonnel(value) {
  try {
    if (value === null) {
      localStorage.removeItem(OBJECTIF_PERSONNEL_KEY);
    } else {
      localStorage.setItem(OBJECTIF_PERSONNEL_KEY, String(value));
    }
  } catch {}
}

const objectifInput = document.getElementById('objectif-personnel-input');
const objectifProgress = document.getElementById('objectif-progress');
const objectifProgressFill = document.getElementById('objectif-progress-fill');
const objectifProgressTarget = document.getElementById('objectif-progress-target');
const objectifProgressText = document.getElementById('objectif-progress-text');

/* Recalcule et affiche l'écart entre la moyenne pondérée des
   matières actuellement renseignées (pour la classe/semestre
   affiché) et l'objectif personnel choisi par l'élève. */
function updateObjectifProgress(entries) {
  if (!objectifProgress || !objectifInput) return;

  const objectif = getObjectifPersonnel();
  if (objectif === null) {
    objectifProgress.hidden = true;
    return;
  }

  objectifProgress.hidden = false;

  const sommeCoeff = entries.reduce((total, [, data]) => total + Number(data.coefficient), 0);
  const sommePoints = entries.reduce(
    (total, [, data]) => total + Number(data.points ?? (data.moyenne * data.coefficient)),
    0
  );
  const moyenneActuelle = sommeCoeff > 0 ? sommePoints / sommeCoeff : 0;
  const diff = objectif - moyenneActuelle;
  const reached = entries.length > 0 && diff <= 0;

  objectifProgress.classList.toggle('is-reached', reached);
  if (objectifProgressFill) {
    objectifProgressFill.style.width = `${Math.min(100, Math.max(0, (moyenneActuelle / 20) * 100))}%`;
  }
  if (objectifProgressTarget) {
    objectifProgressTarget.style.left = `${Math.min(100, Math.max(0, (objectif / 20) * 100))}%`;
  }
  if (objectifProgressText) {
    if (entries.length === 0) {
      objectifProgressText.textContent = t('objectif_no_data');
    } else if (reached) {
      objectifProgressText.textContent = t('objectif_reached', { value: moyenneActuelle.toFixed(2) });
    } else {
      objectifProgressText.textContent = t('objectif_gap', {
        diff: diff.toFixed(2),
        value: moyenneActuelle.toFixed(2)
      });
    }
  }
}

if (objectifInput) {
  const storedObjectif = getObjectifPersonnel();
  if (storedObjectif !== null) objectifInput.value = storedObjectif;

  objectifInput.addEventListener('change', () => {
    const raw = objectifInput.value.trim();
    if (raw === '') {
      setObjectifPersonnel(null);
    } else {
      const value = Math.min(20, Math.max(0, Number(raw)));
      objectifInput.value = value;
      setObjectifPersonnel(value);
    }
    renderTableMatiere();

    if (dernierConseilContext && advisorSection && !advisorSection.hidden) {
      afficherConseillerScolaire(dernierConseilContext.matieresCalculees, dernierConseilContext.moyenneGenerale);
    }
  });
}

const classeLabel = document.getElementById('classe-label');
const nextSubjectBtn = document.getElementById('next-subject-btn');
const backToCalculerBtn = document.getElementById('back-to-calculer-btn');
const seeEvolutionBtn = document.getElementById('see-evolution-btn');
const bulletinReadyBanner = document.getElementById('bulletin-ready-banner');
const gotoBulletinBtn = document.getElementById('goto-bulletin-btn');
const openHistoriqueBtn = document.getElementById('open-historique-btn');
const backToEvolutionBtn = document.getElementById('back-to-evolution-btn');

/* Masque les trois boutons d'action du résultat (matière suivante,
   revenir au calculateur, voir mon évolution) avant d'afficher un
   nouveau résultat ou une erreur, pour éviter tout cumul visuel. */
function hideResultActionButtons() {
  if (nextSubjectBtn) nextSubjectBtn.hidden = true;
  if (backToCalculerBtn) backToCalculerBtn.hidden = true;
  if (seeEvolutionBtn) seeEvolutionBtn.hidden = true;
}
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

/* Détection automatique de l'appareil à partir de la largeur d'écran.
   Un utilisateur peut forcer un affichage via le bouton "⚙️ Affichage" ;
   ce choix est alors mémorisé et prime sur la détection automatique. */
const DEVICE_PREF_KEY = 'lynaqe_device_pref';

function detectDeviceFromWidth() {
  const w = window.innerWidth;
  if (w < 640) return 'phone';
  if (w < 1080) return 'tablette';
  return 'ordinateur';
}

function getStoredDevicePref() {
  try {
    const stored = localStorage.getItem(DEVICE_PREF_KEY);
    return DEVICE_REFERENCE_WIDTHS[stored] ? stored : null;
  } catch {
    return null;
  }
}

function setStoredDevicePref(device) {
  try {
    if (device) {
      localStorage.setItem(DEVICE_PREF_KEY, device);
    } else {
      localStorage.removeItem(DEVICE_PREF_KEY);
    }
  } catch {}
}

function resolveDevice() {
  return getStoredDevicePref() || detectDeviceFromWidth();
}

let currentDevice = null;

/* Sur "Téléphone", on n'utilise plus la mise à l'échelle (transform: scale)
   d'un canevas de largeur fixe (430px) : sur un vrai téléphone, cette astuce
   forçait un rendu légèrement rétréci et cassait le tactile natif (le défilement
   horizontal des tableaux, le focus clavier lors de l'ajout d'un élève, les
   animations). Le rendu est maintenant fluide à 100% de la largeur réelle de
   l'écran, et ce sont les media queries de styles.css qui gèrent l'adaptation.
   La mise à l'échelle "canevas figé" reste utile uniquement pour prévisualiser
   Tablette/Ordinateur (usage à la souris, sans contrainte tactile). */
function updateViewportScale() {
  if (!deviceViewport || !deviceViewportOuter || !currentDevice) return;

  if (currentDevice === 'phone') {
    deviceViewport.style.transform = 'none';
    deviceViewport.style.width = '100%';
    deviceViewportOuter.style.height = 'auto';
    deviceViewportOuter.style.overflow = 'visible';
    return;
  }

  deviceViewportOuter.style.overflow = 'hidden';

  const refWidth = DEVICE_REFERENCE_WIDTHS[currentDevice];
  const actualWidth = deviceViewportOuter.clientWidth;
  const scale = Math.min(actualWidth / refWidth, 1);

  deviceViewport.style.transform = `scale(${scale})`;

  const naturalHeight = deviceViewport.offsetHeight;
  deviceViewportOuter.style.height = `${naturalHeight * scale}px`;
}

function setDeviceReference(device) {
  currentDevice = device;

  if (!deviceViewport) return;

  if (device === 'phone') {
    deviceViewport.style.width = '100%';
    requestAnimationFrame(updateViewportScale);
    return;
  }

  const refWidth = DEVICE_REFERENCE_WIDTHS[device];
  if (!refWidth) return;

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

function highlightCurrentDeviceOption() {
  const activePref = getStoredDevicePref();
  deviceOptions.forEach((button) => {
    const isCurrent = activePref
      ? button.dataset.device === activePref
      : button.dataset.device === 'auto';
    button.classList.toggle('is-current', isCurrent);
  });
}

function openDeviceModal() {
  if (!deviceModal) return;
  highlightCurrentDeviceOption();
  deviceModal.classList.remove('is-closing');
  deviceModal.style.display = 'flex';
  deviceOptions[0]?.focus();
}

deviceOptions.forEach((button) => {
  button.addEventListener('click', () => {
    const device = button.dataset.device;
    if (device === 'auto') {
      setStoredDevicePref(null);
      applyDeviceClass(detectDeviceFromWidth());
    } else {
      setStoredDevicePref(device);
      applyDeviceClass(device);
    }
    closeDeviceModal();
  });
});

changeDeviceBtn?.addEventListener('click', openDeviceModal);

// Applique immédiatement l'affichage détecté (ou le choix mémorisé) : plus
// aucune question n'est posée à l'arrivée sur le site.
applyDeviceClass(resolveDevice());

// Si aucun affichage n'a été forcé manuellement, on réévalue la détection
// quand la fenêtre change de largeur (redimensionnement, rotation d'écran),
// pour rester réactif comme un site responsive classique.
let resizeDetectFrame = null;
window.addEventListener('resize', () => {
  if (getStoredDevicePref()) return;
  if (resizeDetectFrame) clearTimeout(resizeDetectFrame);
  resizeDetectFrame = setTimeout(() => {
    const detected = detectDeviceFromWidth();
    if (detected !== currentDevice) applyDeviceClass(detected);
  }, 200);
});

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
const CONFETTI_COLORS = ['#e8c875', '#cf8a45', '#4e71aa', '#fffaf0', '#b8752f'];

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
  updateDownloadButtonAvailability(classeVal, notes);

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

document.getElementById('nom')?.addEventListener('input', function () {
  updateStepsTimeline();
  saveStudentProfile({ nom: this.value.trim() });
});
document.getElementById('prenom')?.addEventListener('input', function () {
  updateStepsTimeline();
  saveStudentProfile({ prenom: this.value.trim() });
});

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

/* Langues vivantes proposées (4e → Tle) : la langue choisie est une
   matière comme les autres, avec un vrai coefficient au bulletin. */
const LANGUE_OPTIONS = ['Espagnol', 'Arabe'];

/* =========================================================
   COEFFICIENTS OFFICIELS SUGGERES
   Source lycée (S1/S2) : grille des épreuves du Baccalauréat
   sénégalais (Office du Bac), complétée pour les matières de
   bulletin non examinées au Bac (Espagnol, Arabe, EPS) sur
   confirmation du porteur du projet. La 6e→3e n'a pas encore de grille
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
      'Arabe': 2,
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
      'Arabe': 2,
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

/* =========================================================
   PROFIL ÉLÈVE (nom, prénom, classe)
   Avant, nom/prénom étaient dupliqués dans chaque matière
   enregistrée. Ils sont maintenant stockés une seule fois ici,
   séparément des notes par matière, pour éviter la duplication
   et permettre de restaurer l'identité de l'élève dès le
   chargement de la page (plus besoin de rouvrir une matière
   déjà saisie pour les retrouver).
   ========================================================= */
const STUDENT_PROFILE_KEY = 'lynaqe_student_profile';

function getStudentProfile() {
  try {
    const raw = localStorage.getItem(STUDENT_PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStudentProfile(partialProfile) {
  const updated = { ...getStudentProfile(), ...partialProfile };
  localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(updated));
}

/* Migration : si un profil élève n'existe pas encore mais que des
   matières enregistrées avant cette mise à jour contiennent encore
   nom/prénom, on les récupère une seule fois pour ne rien perdre. */
function migrateLegacyStudentProfile() {
  const profile = getStudentProfile();
  if (profile.nom || profile.prenom) return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(`${STORAGE_PREFIX}_`)) continue;

    try {
      const notes = JSON.parse(localStorage.getItem(key)) || {};
      const firstEntry = Object.values(notes)[0];
      if (firstEntry && (firstEntry.nom || firstEntry.prenom)) {
        const classe = key.replace(`${STORAGE_PREFIX}_`, '').replace(/_(Semestre1|Semestre2)$/, '');
        saveStudentProfile({
          nom: firstEntry.nom || '',
          prenom: firstEntry.prenom || '',
          classe,
        });
        return;
      }
    } catch {
      // Entrée corrompue : on l'ignore et on continue la recherche.
    }
  }
}

/* Restaure le profil élève dans le formulaire au chargement de la page. */
function restoreStudentProfile() {
  const profile = getStudentProfile();
  const nomInput = document.getElementById('nom');
  const prenomInput = document.getElementById('prenom');

  if (profile.nom && nomInput) nomInput.value = profile.nom;
  if (profile.prenom && prenomInput) prenomInput.value = profile.prenom;

  // Restaurer langue/série AVANT updateMatieres() : la liste des matières
  // disponibles (et le coefficient officiel suggéré) en dépendent.
  if (profile.langue) {
    const langueRadio = document.querySelector(`input[name="langue"][value="${profile.langue}"]`);
    if (langueRadio) langueRadio.checked = true;
  }
  if (profile.serie) {
    const serieRadio = document.querySelector(`input[name="serie"][value="${profile.serie}"]`);
    if (serieRadio) serieRadio.checked = true;
  }

  if (profile.classe && classeSelect) {
    classeSelect.value = profile.classe;
    updateMatieres();
    updateCoefficientSuggestion();
  }
  updateStepsTimeline();
}

migrateLegacyStudentProfile();
restoreStudentProfile();

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
    matiere => matiere !== 'ECOFAM'
  );
  const matieresSansEconomieEtCivisme = matieresSansEconomie.filter(
    matiere => matiere !== 'EC'
  );
  const matieresSansCivisme = baseMatieres.filter(
    matiere => matiere !== 'EC'
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

/* Langues déjà enregistrées dans les notes de la classe (S1 ou S2).
   Permet de garder une langue même après en avoir choisi une autre :
   elle reste alors dans la liste des matières de la classe. */
function getStoredLanguesPourClasse(classe) {
  if (!classe) return [];
  const found = [];
  LANGUE_OPTIONS.forEach((langue) => {
    const hasNotes =
      Object.prototype.hasOwnProperty.call(getStoredNotesForClasse(classe, 'Semestre1'), langue) ||
      Object.prototype.hasOwnProperty.call(getStoredNotesForClasse(classe, 'Semestre2'), langue);
    if (hasNotes) found.push(langue);
  });
  return found;
}

/* Supprime les notes d'une langue dans la classe (S1 + S2). */
function removeLangueNotes(classe, langue) {
  if (!classe) return;
  ['Semestre1', 'Semestre2'].forEach((semestre) => {
    const notes = getStoredNotesForClasse(classe, semestre);
    if (!Object.prototype.hasOwnProperty.call(notes, langue)) return;
    delete notes[langue];
    if (Object.keys(notes).length) {
      localStorage.setItem(getClassStorageKey(classe, semestre), JSON.stringify(notes));
    } else {
      localStorage.removeItem(getClassStorageKey(classe, semestre));
    }
  });
}

function getMatieresDisponiblesPourClasse(classe) {
  const selectedLangue = document.querySelector('input[name="langue"]:checked')?.value;
  let matieres = getMatieresPourClasse(classe);

  if (['4e', '3e', '2nde', '1er', 'Tle'].includes(classe)) {
    if (selectedLangue) matieres = [...matieres, selectedLangue];
    matieres = [...matieres, ...getStoredLanguesPourClasse(classe)];
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
    tableBody.innerHTML = getEmptySubjectsRowHtml();
    renderRadarChart([]);
    updateObjectifProgress([]);
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
  updateObjectifProgress(entries);
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

/* =========================================================
   HISTORIQUE MULTI-ANNÉES ("Mon parcours scolaire")
   Contrairement au flux principal (qui exige que toutes les matières
   officielles d'une classe soient renseignées), cet écran affiche une
   moyenne pondérée "brute" à partir de ce qui a été rempli pour chaque
   classe/semestre — pour donner une vue d'ensemble même sur des
   données partielles ou une classe qu'on ne consulte plus au quotidien.
   ========================================================= */
const CLASSES_ORDRE = ['6e', '5e', '4e', '3e', '2nde', '1er', 'Tle'];

function computeMoyenneBrute(notes) {
  const entries = Object.values(notes || {});
  if (!entries.length) return null;

  const totalCoeff = entries.reduce((acc, item) => acc + Number(item.coefficient || 0), 0);
  const totalPoints = entries.reduce(
    (acc, item) => acc + Number(item.points ?? (item.moyenne * item.coefficient)),
    0
  );
  return totalCoeff > 0 ? totalPoints / totalCoeff : null;
}

function renderHistoriqueChart(points) {
  const wrap = document.getElementById('historique-chart-wrap');
  const svg = document.getElementById('historique-chart');
  if (!wrap || !svg) return;

  const known = points.filter((p) => p.value !== null);
  if (known.length < 2) {
    wrap.hidden = true;
    svg.innerHTML = '';
    return;
  }

  wrap.hidden = false;

  const width = 340;
  const height = 140;
  const paddingX = 18;
  const paddingY = 16;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const xFor = (i) => paddingX + stepX * i;
  const yFor = (value) => paddingY + plotHeight - (Math.min(value, 20) / 20) * plotHeight;

  let svgContent = '';

  [0, 10, 20].forEach((mark) => {
    const y = yFor(mark);
    svgContent += `<line class="historique-grid-line" x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" />`;
    svgContent += `<text class="historique-grid-label" x="2" y="${y + 3}">${mark}</text>`;
  });

  // Ne relie que les classes consécutives ayant toutes deux une moyenne
  // annuelle connue, pour ne pas tracer un trait trompeur au-dessus
  // d'une classe sans données.
  for (let i = 0; i < points.length - 1; i += 1) {
    if (points[i].value === null || points[i + 1].value === null) continue;
    svgContent += `<line class="historique-line-segment" x1="${xFor(i)}" y1="${yFor(points[i].value)}" x2="${xFor(i + 1)}" y2="${yFor(points[i + 1].value)}" />`;
  }

  points.forEach((p, i) => {
    const x = xFor(i);
    svgContent += `<text class="historique-x-label" x="${x}" y="${height - 2}" text-anchor="middle">${escapeXml(p.classe)}</text>`;
    if (p.value !== null) {
      const y = yFor(p.value);
      svgContent += `<circle class="historique-point" cx="${x}" cy="${y}" r="4" />`;
    }
  });

  svg.innerHTML = svgContent;
}

function refreshHistoriqueScreen() {
  const listEl = document.getElementById('historique-list');
  if (!listEl) return;

  const rows = CLASSES_ORDRE.map((classe) => {
    const moyS1 = computeMoyenneBrute(getStoredNotesForClasse(classe, 'Semestre1'));
    const moyS2 = computeMoyenneBrute(getStoredNotesForClasse(classe, 'Semestre2'));
    const moyAnnee = moyS1 !== null && moyS2 !== null ? (moyS1 + moyS2) / 2 : null;
    return { classe, moyS1, moyS2, moyAnnee, hasData: moyS1 !== null || moyS2 !== null };
  });

  renderHistoriqueChart(rows.map((row) => ({ classe: row.classe, value: row.moyAnnee })));

  if (!rows.some((row) => row.hasData)) {
    listEl.innerHTML = `<p class="historique-empty">${escapeXml(t('historique_empty'))}</p>`;
    return;
  }

  const barLine = (label, value, cls) => {
    const width = value !== null ? Math.min(100, (value / 20) * 100) : 0;
    return `
      <div class="compare-bar-line">
        <span class="compare-bar-label">${label}</span>
        <div class="compare-bar-track"><div class="compare-bar-fill ${cls}" style="width:${width}%"></div></div>
        <span class="compare-bar-value">${value !== null ? value.toFixed(2) : '—'}</span>
      </div>
    `;
  };

  listEl.innerHTML = rows
    .map((row, index) => {
      const delay = prefersReducedMotion ? '0s' : `${index * 40}ms`;
      return `
        <div class="compare-row historique-row${row.hasData ? '' : ' historique-row-empty'}" style="animation-delay:${delay}">
          <div class="compare-row-head">
            <span class="compare-subject">${escapeXml(row.classe)}</span>
            ${row.moyAnnee !== null ? `<span class="compare-delta historique-delta-annee">${row.moyAnnee.toFixed(2)}/20</span>` : ''}
          </div>
          <div class="compare-bars">
            ${barLine('Sem 1', row.moyS1, 'compare-bar-s1')}
            ${barLine('Sem 2', row.moyS2, 'compare-bar-s2')}
          </div>
        </div>
      `;
    })
    .join('');
}

window.refreshHistoriqueScreen = refreshHistoriqueScreen;

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

/* Changement de langue : si une autre langue a déjà des notes dans la
   classe, on demande à l'élève de préciser l'intention pour éviter de
   retrouver des notes orphelines ou une matière « manquante » au bulletin.
   - Remplacer        → supprime les notes de l'ancienne langue.
   - Conserver les deux → l'ancienne langue reste dans la classe (avec ses notes).
   - Annuler          → on revient au choix précédent. */
function requestLangueChange(newLangue) {
  /* Au moment où le radio change, il est déjà coché à la nouvelle valeur :
     l'ancienne langue est donc celle encore enregistrée dans le profil. */
  const oldLangue = getStudentProfile().langue || null;
  const oldRadio = document.querySelector(`input[name="langue"][value="${oldLangue}"]`);
  const classe = classeSelect.value;

  const applyChange = () => {
    saveStudentProfile({ langue: newLangue });
    updateMatieres();
  };

  const hasOldRisk = Boolean(oldLangue && oldLangue !== newLangue && classe && getStoredLanguesPourClasse(classe).includes(oldLangue));

  if (!hasOldRisk) {
    applyChange();
    return;
  }

  const doReplace = () => {
    removeLangueNotes(classe, oldLangue);
    applyChange();
    if (typeof showInfoDialog === 'function') {
      showInfoDialog(t('lang_change_replaced', { langue: translateMatiere(oldLangue) }));
    }
  };

  const doKeepBoth = () => {
    applyChange();
    if (typeof showInfoDialog === 'function') {
      showInfoDialog(t('lang_change_kept_both', { langue: translateMatiere(oldLangue) }));
    }
  };

  const doCancel = () => {
    if (oldRadio) oldRadio.checked = true;
  };

  if (typeof confirmModal !== 'undefined' && confirmModal.el) {
    confirmModal.show({
      title: t('lang_change_title'),
      message: t('lang_change_message', {
        langue: translateMatiere(oldLangue),
        newLangue: translateMatiere(newLangue)
      }),
      okLabel: t('lang_change_replace'),
      altLabel: t('lang_change_keep_both'),
      onConfirm: doReplace,
      onAlt: doKeepBoth,
      onDismiss: doCancel
    });
  } else {
    applyChange();
  }
}

langueRadios.forEach((radio) => radio.addEventListener('change', () => {
  requestLangueChange(radio.value);
}));

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

  hideResultActionButtons();
  masquerConseillerScolaire();
}

classeSelect.addEventListener('change', function () {
  langueRadios.forEach((radio) => {
    radio.checked = false;
  });
  serieRadios.forEach((radio) => {
    radio.checked = false;
  });
  saveStudentProfile({ classe: classeSelect.value, langue: null, serie: null });
  updateMatieres();
  hideResultActionButtons();
});

matiereSelect.addEventListener('change', updateCoefficientSuggestion);

serieRadios.forEach((radio) => radio.addEventListener('change', () => {
  saveStudentProfile({ serie: radio.value });
  updateCoefficientSuggestion();
}));

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

  saveStudentProfile({ nom, prenom, classe });

  saveMatiereNote(classe, matiere, {
    moyenne: moyenneMatiere,
    points,
    coefficient,
    devoir1,
    devoir2,
    composition,
    hasComposition
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
  window.activateScreen?.('resultats');
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

  if (seeEvolutionBtn) seeEvolutionBtn.hidden = true;

  if (!restantes.length) {
    // Toutes les matières de la classe ont une note : plus de
    // "matière suivante" possible, on propose de revenir au
    // formulaire de calcul (par ex. pour calculer la moyenne du
    // semestre ou revoir une matière).
    nextSubjectBtn.hidden = true;
    if (backToCalculerBtn) backToCalculerBtn.hidden = false;
    return;
  }

  if (backToCalculerBtn) backToCalculerBtn.hidden = true;
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

  window.activateScreen?.('calculer');

  const calculatorCard = document.querySelector('.calculator-card');
  calculatorCard?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });

  window.setTimeout(() => {
    document.getElementById('coefficient')?.focus();
  }, prefersReducedMotion ? 0 : 350);
});

backToCalculerBtn?.addEventListener('click', () => {
  backToCalculerBtn.hidden = true;

  window.activateScreen?.('calculer');

  const calculatorCard = document.querySelector('.calculator-card');
  calculatorCard?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
});

seeEvolutionBtn?.addEventListener('click', () => {
  window.activateScreen?.('evolution');

  if (bulletinReadyBanner) bulletinReadyBanner.hidden = false;

  const subjectsCard = document.querySelector('.subjects-card');
  subjectsCard?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
});

gotoBulletinBtn?.addEventListener('click', () => {
  window.activateScreen?.('bulletin');

  const bulletinCard = document.querySelector('.bulletin-screen-card');
  bulletinCard?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
});

openHistoriqueBtn?.addEventListener('click', () => {
  window.activateScreen?.('historique');
});

backToEvolutionBtn?.addEventListener('click', () => {
  window.activateScreen?.('evolution');

  const subjectsCard = document.querySelector('.subjects-card');
  subjectsCard?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
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

/* Chaque citation est un objet { text, author? }. Les citations sans
   "author" sont des conseils génériques (pas d'attribution affichée).
   Les proverbes sénégalais/wolof portent leur source, pour l'ancrage
   culturel voulu sur ce widget. */
const CITATIONS_DU_JOUR = {
  fr: [
    { text: "La réussite est la somme de petits efforts répétés jour après jour." },
    { text: "Un examen ne mesure pas ton intelligence, seulement ta préparation du moment." },
    { text: "Relis tes cours le soir même : c’est le moment où la mémoire retient le mieux." },
    { text: "Une bonne moyenne se construit devoir après devoir, pas la veille de la composition." },
    { text: "Pose des questions en classe : ce n’est jamais une perte de temps." },
    { text: "Un planning de révision simple vaut mieux qu’un plan parfait jamais suivi." },
    { text: "Le sommeil avant un examen compte autant que les révisions." },
    { text: "Comprendre un exercice vaut mieux que le mémoriser sans le comprendre." },
    { text: "Chaque matière compte : ne néglige pas celles qui te semblent moins importantes." },
    { text: "Fixe-toi un petit objectif clair pour chaque séance de révision." },
    { text: "Les erreurs corrigées sont les meilleures leçons pour le prochain devoir." },
    { text: "Travailler un peu chaque jour vaut mieux que tout réviser en une nuit." },
    { text: "Note tes points faibles après chaque devoir pour savoir où progresser." },
    { text: "La régularité bat le talent quand le talent ne travaille pas régulièrement." },
    { text: "Un bon élève n’est pas celui qui ne se trompe jamais, mais celui qui persévère." },
    { text: "Prends soin de ta concentration : coupe les distractions pendant que tu révises." },
    { text: "Explique un cours à quelqu’un d’autre : c’est la meilleure façon de vérifier que tu l’as compris." },
    { text: "Chaque semestre est une nouvelle chance de progresser, quel que soit le précédent." },
    { text: "Ne te compare pas aux autres : compare-toi à toi-même et à tes progrès." },
    { text: "La confiance en soi se construit par la préparation et la pratique, pas par la chance." },
    { text: "Même un petit progrès chaque jour finit par faire une grande différence sur le long terme." },
    { text: "Les révisions actives (exercices, questions) sont plus efficaces que la simple lecture." },
    { text: "Un esprit reposé retient mieux : n’oublie pas de faire des pauses pendant tes révisions." },
    { text: "Relire un contrôle corrigé t’apprend souvent plus que le contrôle lui-même." },
    { text: "Un cahier bien tenu fait gagner un temps précieux au moment des révisions." },
    { text: "Réviser à plusieurs, à condition de rester concentrés, peut renforcer la compréhension." },
    { text: "La curiosité est le meilleur moteur pour apprendre durablement." },
    { text: "Un objectif écrit noir sur blanc est plus facile à tenir qu’une simple idée en tête." },
    { text: "Il vaut mieux dix minutes de révision concentrée qu’une heure distrait par le téléphone." },
    { text: "Se tromper en classe fait partie de l’apprentissage, pas de l’échec." },
    { text: "La persévérance transforme les difficultés d’aujourd’hui en réussites de demain." },
    { text: "Un élève organisé gagne du temps qu’il peut réinvestir dans ses matières faibles." },
    { text: "Ndank-ndank mooy jàpp golo ci ñaay : c’est doucement, avec patience, qu’on attrape même le singe le plus agile — la persévérance finit toujours par payer.", author: "Proverbe wolof" },
    { text: "Garab gu mag, du ab bess mooy taqal : un grand arbre ne pousse pas en un jour — les grandes réussites scolaires se construisent, elles ne tombent pas du ciel.", author: "Proverbe wolof" },
    { text: "Mugn mooy faral, ku mugn a yor loxo : la patience est une force active, et c’est elle qui finit par tenir la victoire.", author: "Proverbe wolof" },
    { text: "Ku begg a dem toll, war na gis ndank : qui veut aller loin doit avancer doucement mais sûrement, sans se précipiter.", author: "Proverbe wolof" },
    { text: "Lo doonul talibeem, mënulo doone serignam : on ne devient jamais maître d’une chose qu’on n’a pas d’abord apprise en élève.", author: "Proverbe wolof" },
    { text: "Kenn du aar sa baat te doo ko làkk : personne ne veille sur tes affaires à ta place — c’est à toi d’agir pour ta propre réussite.", author: "Proverbe wolof" },
    { text: "Njaboot ak xam-xam, du feeñ ci ab bess : le savoir ne se révèle pas en un jour, il demande du temps, de l’expérience et de l’humilité.", author: "Proverbe wolof" },
    { text: "Nit nitay garabu nit : l’homme est le remède de l’homme — s’entraider entre camarades de classe fait progresser tout le monde.", author: "Proverbe wolof" },
    { text: "Ku am mugn am na lenn : celui qui a la patience possède déjà une richesse, plus précieuse que bien des biens matériels.", author: "Proverbe wolof" },
    { text: "Un Peuple, Un But, Une Foi — la devise du Sénégal rappelle qu’un objectif clair et une volonté commune mènent loin, y compris sur le chemin de la réussite scolaire.", author: "Devise nationale du Sénégal" },
  ],
  en: [
    { text: "Success is the sum of small efforts repeated day after day." },
    { text: "An exam doesn't measure your intelligence, only how prepared you are right now." },
    { text: "Review your lessons the same evening: that's when memory retains best." },
    { text: "A good average is built assignment after assignment, not the night before the exam." },
    { text: "Ask questions in class: it's never a waste of time." },
    { text: "A simple revision plan beats a perfect plan that's never followed." },
    { text: "Sleep before an exam matters as much as revision." },
    { text: "Understanding an exercise is worth more than memorizing it without understanding." },
    { text: "Every subject counts: don't neglect the ones that seem less important." },
    { text: "Set yourself one clear, small goal for each revision session." },
    { text: "Corrected mistakes are the best lessons for the next assignment." },
    { text: "Working a little every day beats cramming everything in one night." },
    { text: "Note your weak points after each assignment to know where to improve." },
    { text: "Consistency beats talent when talent doesn't work consistently." },
    { text: "A good student isn't one who never makes mistakes, but one who perseveres." },
    { text: "Look after your focus: cut out distractions while you revise." },
    { text: "Explain a lesson to someone else: it's the best way to check you've understood it." },
    { text: "Every semester is a new chance to improve, whatever happened before." },
    { text: "Don't compare yourself to others: compare yourself to your own progress." },
    { text: "Self-confidence is built through preparation and practice, not luck." },
    { text: "Even small daily progress adds up to a big difference over time." },
    { text: "Active revision (exercises, questions) is more effective than simple reading." },
    { text: "A rested mind retains better: don't forget to take breaks while revising." },
    { text: "Reviewing a corrected test often teaches you more than the test itself." },
    { text: "A well-kept notebook saves precious time when revision season comes." },
    { text: "Studying with others can deepen understanding, as long as you stay focused." },
    { text: "Curiosity is the best engine for learning that actually lasts." },
    { text: "A goal written down is easier to stick to than one left as a vague idea." },
    { text: "Ten focused minutes of revision beat an hour distracted by your phone." },
    { text: "Making mistakes in class is part of learning, not a sign of failure." },
    { text: "Perseverance turns today's difficulties into tomorrow's achievements." },
    { text: "An organized student saves time that can be reinvested in weaker subjects." },
    { text: "Ndank-ndank mooy jàpp golo ci ñaay: slowly and patiently, one can catch even the swiftest monkey — perseverance always pays off in the end.", author: "Wolof proverb" },
    { text: "Garab gu mag, du ab bess mooy taqal: a great tree doesn't grow in a day — real academic success is built over time, not overnight.", author: "Wolof proverb" },
    { text: "Mugn mooy faral, ku mugn a yor loxo: patience is an active strength, and it is patience that ultimately wins.", author: "Wolof proverb" },
    { text: "Ku begg a dem toll, war na gis ndank: whoever wants to go far must move slowly but surely, without rushing.", author: "Wolof proverb" },
    { text: "Lo doonul talibeem, mënulo doone serignam: you can never master something you haven't first learned as a student.", author: "Wolof proverb" },
    { text: "Kenn du aar sa baat te doo ko làkk: no one looks after your interests for you — it's up to you to act for your own success.", author: "Wolof proverb" },
    { text: "Njaboot ak xam-xam, du feeñ ci ab bess: knowledge doesn't reveal itself in a day — it takes time, experience and humility.", author: "Wolof proverb" },
    { text: "Nit nitay garabu nit: people are the remedy for people — helping classmates out lifts everyone's progress.", author: "Wolof proverb" },
    { text: "Ku am mugn am na lenn: whoever has patience already owns a kind of wealth, more valuable than many material things.", author: "Wolof proverb" },
    { text: "One People, One Goal, One Faith — Senegal's national motto is a reminder that a clear goal and shared determination go a long way, including on the road to academic success.", author: "National motto of Senegal" },
  ]
};

function afficherCitationDuJour() {
  const quoteEl = document.getElementById('quote-of-day-text');
  const authorEl = document.getElementById('quote-of-day-author');
  if (!quoteEl) return;

  const citations = CITATIONS_DU_JOUR[getLang()] || CITATIONS_DU_JOUR.fr;
  if (!citations.length) return;

  const debutAnnee = new Date(new Date().getFullYear(), 0, 0);
  const diffJours = Math.floor((new Date() - debutAnnee) / 86400000);
  const citation = citations[diffJours % citations.length];

  quoteEl.textContent = citation.text;
  if (authorEl) {
    if (citation.author) {
      authorEl.textContent = `— ${citation.author}`;
      authorEl.hidden = false;
    } else {
      authorEl.textContent = '';
      authorEl.hidden = true;
    }
  }
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

function computeLeviersPourObjectif(matieresCalculees, objectif) {
  return [...matieresCalculees]
    .filter((item) => Number(item.note.moyenne) < objectif)
    .sort((a, b) => {
      const coeffDiff = Number(b.note.coefficient) - Number(a.note.coefficient);
      if (coeffDiff !== 0) return coeffDiff;
      return Number(a.note.moyenne) - Number(b.note.moyenne);
    })
    .slice(0, 2)
    .map((item) => item.matiere);
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
  const objectifPersonnel = getObjectifPersonnel();
  const isPersonnel = objectifPersonnel !== null;

  if (isPersonnel) {
    if (moyenneGenerale >= objectifPersonnel) {
      objectifText = t('advisor_objectif_personnel_atteint', {
        objectif: objectifPersonnel,
        value: moyenneGenerale.toFixed(2)
      });
    } else {
      const leviers = computeLeviersPourObjectif(matieresCalculees, objectifPersonnel);
      const leviersText = leviers.length
        ? t('advisor_leviers_with_subjects', { list: leviers.map(translateMatiere).join(getLang() === 'en' ? ' and ' : ' et ') })
        : t('advisor_leviers_none');

      objectifText = t('advisor_objectif_personnel_template', { objectif: objectifPersonnel, leviers: leviersText });
    }
  } else if (moyenneGenerale >= 18) {
    objectifText = t('advisor_objectif_excellent', { value: moyenneGenerale.toFixed(2) });
  } else {
    let objectif = Math.ceil((moyenneGenerale + 1.5) * 2) / 2;
    objectif = Math.min(objectif, 20);

    const leviers = computeLeviersPourObjectif(matieresCalculees, objectif);
    const leviersText = leviers.length
      ? t('advisor_leviers_with_subjects', { list: leviers.map(translateMatiere).join(getLang() === 'en' ? ' and ' : ' et ') })
      : t('advisor_leviers_none');

    objectifText = t('advisor_objectif_template', { objectif, leviers: leviersText });
  }

  return {
    pointsForts: pointsForts.map((item) => item.matiere),
    aAmeliorer: aAmeliorer.map((item) => item.matiere),
    objectifText,
    isPersonnel
  };
}

function afficherConseillerScolaire(matieresCalculees, moyenneGenerale) {
  if (!advisorSection || !matieresCalculees || matieresCalculees.length < 2) {
    masquerConseillerScolaire();
    return;
  }

  dernierConseilContext = { matieresCalculees, moyenneGenerale };

  const conseil = getConseilScolaire(matieresCalculees, moyenneGenerale);

  advisorPointsFortsEl.querySelector('.advisor-text').textContent = conseil.pointsForts.length
    ? t('advisor_points_forts_prefix', { list: conseil.pointsForts.map(translateMatiere).join(', ') })
    : t('advisor_points_forts_empty');

  advisorAAmeliorerEl.querySelector('.advisor-text').textContent = conseil.aAmeliorer.length
    ? t('advisor_a_ameliorer_prefix', { list: conseil.aAmeliorer.map(translateMatiere).join(', ') })
    : t('advisor_a_ameliorer_empty');

  advisorObjectifEl.querySelector('.advisor-text').textContent = conseil.objectifText;
  advisorObjectifEl.classList.toggle('advisor-goal--personnel', conseil.isPersonnel);

  advisorSection.hidden = false;
  advisorSection.classList.remove('is-revealing');
  void advisorSection.offsetWidth;
  advisorSection.classList.add('is-revealing');
}

function masquerConseillerScolaire() {
  if (advisorSection) advisorSection.hidden = true;
}

/* Mémorise le dernier contexte utilisé pour afficher le conseiller
   scolaire, afin de pouvoir le rafraîchir immédiatement si l'élève
   modifie son objectif personnel pendant que la carte est visible. */
let dernierConseilContext = null;

boutonSemestre.addEventListener('click', function () {
  window.activateScreen?.('resultats');
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

  hideResultActionButtons();
  if (seeEvolutionBtn) seeEvolutionBtn.hidden = false;

  afficherConseillerScolaire(result.matieresCalculees, result.value);
});

document.getElementById('calculer-annee').addEventListener('click', function () {
  window.activateScreen?.('resultats');
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

  hideResultActionButtons();
  if (seeEvolutionBtn) seeEvolutionBtn.hidden = false;

  afficherConseillerScolaire(combineMatieresAnnuelles(resultS1, resultS2), moyenneAnnuelle);
});

/* Renvoie l'année scolaire en cours au format "2025-2026". Avant
   septembre (mois < 8), on considère qu'on est encore sur l'année
   scolaire qui a commencé l'année précédente. */
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

const anneeScolaireEl = document.getElementById('annee-scolaire');
if (anneeScolaireEl) anneeScolaireEl.textContent = getAnneeScolaire();

// PDF Premium Generation Function
function generatePDFBulletin() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    showInfoDialog(t('msg_jspdf_manquant'));
    return false;
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
    return false;
  }

  try {
    const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297

  // Cadre simple et discret (pas de double cadre ni de filigrane)
  doc.setDrawColor(210, 168, 74); // Doré (#D2A84A), fin liseré décoratif
  doc.setLineWidth(0.4);
  doc.rect(9, 9, pageWidth - 18, pageHeight - 18);

  // Logo Intégré (taille normale, proportions respectées)
  const logoImg = document.querySelector('.brand-logo') || document.querySelector('.official-site-logo');
  if (logoImg && logoImg.complete && logoImg.naturalWidth !== 0) {
    try {
      const logoMaxHeight = 20; // hauteur de référence, en mm
      const logoMaxWidth = 18; // largeur maximale disponible, en mm
      const ratio = logoImg.naturalWidth / logoImg.naturalHeight;

      let logoHeight = logoMaxHeight;
      let logoWidth = logoHeight * ratio;

      if (logoWidth > logoMaxWidth) {
        logoWidth = logoMaxWidth;
        logoHeight = logoWidth / ratio;
      }

      doc.addImage(logoImg, 'PNG', 14, 13, logoWidth, logoHeight);
    } catch(e) {
      console.error("Erreur lors de l'intégration du logo :", e);
    }
  }

  // En-tête léger : SUNU MOYENNE + sous-titre + établissement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(16, 28, 47);
  doc.text(t('pdf_app_name'), pageWidth - 14, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(t('pdf_app_subtitle'), pageWidth - 14, 24, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.text(t('pdf_etablissement'), pageWidth - 14, 29, { align: "right" });

  // Ligne de séparation discrète
  doc.setDrawColor(210, 168, 74);
  doc.setLineWidth(0.4);
  doc.line(14, 37, pageWidth - 14, 37);

  // Bannière Titre
  doc.setFillColor(16, 28, 47);
  doc.roundedRect(14, 42, pageWidth - 28, 12, 2, 2, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(t('pdf_bulletin_titre', { semestre: semestreText.toUpperCase() }), pageWidth / 2, 49.5, { align: "center" });

  // Cartouche Informations Élève
  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(220, 220, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 58, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(16, 28, 47);
  doc.text(t('pdf_eleve', { nom: `${prenom.toUpperCase()} ${nom.toUpperCase()}` }), 18, 65);
  doc.text(t('pdf_classe', { classe }), 18, 72);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(t('pdf_annee_scolaire', { annee: getAnneeScolaire() }), 18, 78.5);

  const totalCoeff = entries.reduce((acc, [, item]) => acc + Number(item.coefficient), 0);
  const totalPoints = entries.reduce((acc, [, item]) => acc + Number(item.points ?? (item.moyenne * item.coefficient)), 0);
  const moyenneGen = totalCoeff > 0 ? (totalPoints / totalCoeff) : 0;
  const mentionObj = getMention(moyenneGen);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(16, 28, 47);
  doc.text(t('pdf_moyenne_generale', { value: moyenneGen.toFixed(2) }), pageWidth - 18, 72, { align: "right" });

  // Tableau des Notes Soigné avec Colonne d'Appréciation
  const startY = 90;
  const colWidths = [45, 20, 20, 22, 20, 22, 33]; // Somme = 182
  const headers = [t('pdf_th_discipline'), t('pdf_th_devoir1'), t('pdf_th_devoir2'), t('pdf_th_compo'), t('pdf_th_coeff'), t('pdf_th_moyenne'), t('pdf_th_appreciation')];

  let curY = startY;

  // En-tête du tableau
  doc.setFillColor(23, 43, 75);
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
  doc.setDrawColor(16, 28, 47);
  doc.setLineWidth(0.5);
  doc.rect(14, startY, pageWidth - 28, curY - startY);

  // Synthèse Finale
  curY += 6;
  doc.setFillColor(243, 241, 233);
  doc.setDrawColor(16, 28, 47);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, curY, pageWidth - 28, 16, 1.5, 1.5, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 28, 47);
  doc.text(t('pdf_total_coefficients', { n: totalCoeff }), 18, curY + 6);
  doc.text(t('pdf_total_points', { n: totalPoints.toFixed(2) }), 18, curY + 12);

  doc.text(t('pdf_moyenne_semestrielle', { value: moyenneGen.toFixed(2) }), pageWidth / 2 - 10, curY + 6);

  doc.setTextColor(210, 100, 30);
  doc.text(t('pdf_mention', { label: mentionObj.label }), pageWidth - 18, curY + 9, { align: "right" });

  // Pas de cadres de signatures ni de cachet : ce document reste un
  // récapitulatif informatif généré par l'application, pas un bulletin
  // administratif officiel.

  // Bas de page : mention claire du caractère informatif du document
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(t('pdf_footer_doc'), pageWidth / 2, pageHeight - 14, { align: "center", maxWidth: pageWidth - 28 });

  const nomFichier = `Bulletin_${prenom}_${nom}_${classe}_${semestreVal}.pdf`;

  // Sur iOS (Safari, ou l'app installée en PWA), le téléchargement direct
  // via doc.save() ne déclenche pas toujours une vraie sauvegarde de fichier,
  // même en synchrone. On ouvre alors le PDF dans un nouvel onglet : l'élève
  // peut ensuite l'enregistrer ou le partager via le bouton natif de Safari.
  const estIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (estIOS) {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(nomFichier);
  }
    return true;
  } catch (e) {
    console.error('Erreur lors de la génération du PDF :', e);
    showInfoDialog(t('msg_erreur_generation_pdf'));
    return false;
  }
}

function PDF_BUTTON_DEFAULT_LABEL_FN() { return t('pdf_button_default'); }
function PDF_BUTTON_SUCCESS_LABEL_FN() { return t('pdf_button_success'); }

function setPdfButtonLabel(text) {
  const label = boutonTelechargerPdf?.querySelector('.pdf-button-label');
  if (label) label.textContent = text;
}

// Le bulletin ne doit être téléchargeable que lorsque TOUTES les matières
// de la classe sélectionnée ont leur moyenne de matière renseignée.
function isBulletinComplet(classeVal, notes) {
  if (!classeVal) return false;
  const totalMatieres = getMatieresDisponiblesPourClasse(classeVal).length;
  const doneMatieres = Object.keys(notes || {}).length;
  return totalMatieres > 0 && doneMatieres >= totalMatieres;
}

// Active/désactive le bouton de téléchargement selon la complétude des matières.
// N'intervient pas pendant un chargement ou l'état de succès en cours, pour ne
// pas interrompre le retour visuel déjà en place.
function updateDownloadButtonAvailability(classeVal, notes) {
  if (!boutonTelechargerPdf) return;
  if (boutonTelechargerPdf.classList.contains('is-loading') || boutonTelechargerPdf.classList.contains('is-success')) return;

  const complet = isBulletinComplet(classeVal, notes);
  boutonTelechargerPdf.disabled = !complet;
  boutonTelechargerPdf.classList.toggle('is-locked', !complet);

  if (!complet) {
    boutonTelechargerPdf.title = t('pdf_button_incomplete_title');
  } else {
    boutonTelechargerPdf.removeAttribute('title');
  }
}

function handleTelechargerBulletinClick() {
  if (!boutonTelechargerPdf || boutonTelechargerPdf.classList.contains('is-loading')) return;

  const classeVal = classeSelect.value.trim();
  const notes = classeVal ? getStoredNotesForClasse(classeVal) : {};

  if (!isBulletinComplet(classeVal, notes)) {
    setResult(t('msg_matieres_incompletes'), true);
    updateDownloadButtonAvailability(classeVal, notes);
    return;
  }

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
        boutonTelechargerPdf.removeAttribute('aria-busy');
        setPdfButtonLabel(PDF_BUTTON_DEFAULT_LABEL_FN());
        const currentClasse = classeSelect.value.trim();
        const currentNotes = currentClasse ? getStoredNotesForClasse(currentClasse) : {};
        updateDownloadButtonAvailability(currentClasse, currentNotes);
      }, 1300);
    } else {
      boutonTelechargerPdf.removeAttribute('aria-busy');
      setPdfButtonLabel(PDF_BUTTON_DEFAULT_LABEL_FN());
      const currentClasse = classeSelect.value.trim();
      const currentNotes = currentClasse ? getStoredNotesForClasse(currentClasse) : {};
      updateDownloadButtonAvailability(currentClasse, currentNotes);
    }
  };

  // Génération lancée de manière SYNCHRONE, dans le même tick que le clic :
  // sur mobile (Safari iOS notamment, et certains navigateurs Android), un
  // téléchargement de fichier déclenché après un setTimeout/délai n'est plus
  // reconnu comme une action directe de l'utilisateur, et le navigateur
  // bloque le téléchargement silencieusement, sans la moindre erreur visible.
  // On sacrifie donc le petit temps de pose qui laissait peindre le spinner,
  // au profit d'un téléchargement qui fonctionne réellement sur tous les appareils.
  try {
    const success = generatePDFBulletin();
    finishLoading(success);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF :', error);
    setResult(t('msg_erreur_pdf'), true);
    finishLoading(false);
  }
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
  const profile = getStudentProfile();
  document.getElementById('nom').value = profile.nom || note.nom || '';
  document.getElementById('prenom').value = profile.prenom || note.prenom || '';
  document.querySelectorAll('.note-input').forEach((input) => updateNoteInputValidity(input));

  const compositionRadio = document.querySelector(
    `input[name="hasComposition"][value="${note.hasComposition === false ? 'non' : 'oui'}"]`
  );
  if (compositionRadio) compositionRadio.checked = true;
  toggleCompositionField();
  window.activateScreen?.('calculer');
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
        /* Réinitialisation complète : on efface toutes les données de
           l'application (calculatrice élève, objectif personnel, espace
           professeur) tout en conservant les préférences (langue, thème,
           son, choix du terminal). */
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
          .forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem(STUDENT_PROFILE_KEY);
        localStorage.removeItem(OBJECTIF_PERSONNEL_KEY);
        localStorage.removeItem(PROF_STORE_KEY);
        localStorage.removeItem(PROF_AUTH_KEY);
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`${PROF_ROWS_PREFIX}_`))
          .forEach((key) => localStorage.removeItem(key));

        if (objectifInput) objectifInput.value = '';
        if (typeof window.resetProfesseurData === 'function') window.resetProfesseurData();
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
      } else {
        // Reset limité à une classe : le profil élève (nom/prénom/classe)
        // reste valable, on le réaffiche après le form.reset().
        restoreStudentProfile();
      }
    },
  });
});

afficherCitationDuJour();
updateMatieres();
renderTableMatiere();
animateHeroPreview();
revealHeroPreviewGauges();

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

/* Joue une seule fois, au premier chargement, l'animation d'apparition
   des lignes/jauges du mini-aperçu du bulletin, puis retire la classe
   .is-revealing : le style "visible" (défini dans styles.css) devient
   alors définitivement le style de repos de ces éléments. Ainsi, changer
   d'onglet (Résultats, Évolution, ...) puis revenir sur "Calculer" ne
   dépend plus jamais d'un rejeu de l'animation CSS pour rester visible —
   certains navigateurs mobiles ne la rejouent pas de façon fiable quand
   un ancêtre repasse de display:none à display:block, ce qui laissait
   auparavant cette zone entièrement blanche au retour sur l'écran.
   ========================================================= */
function revealHeroPreviewGauges() {
  if (prefersReducedMotion) return;

  const elements = document.querySelectorAll('.hero-preview-row, .hero-preview-fill');
  if (!elements.length) return;

  elements.forEach((el) => el.classList.add('is-revealing'));

  const clear = () => elements.forEach((el) => el.classList.remove('is-revealing'));

  elements.forEach((el) => {
    el.addEventListener('animationend', () => el.classList.remove('is-revealing'), { once: true });
  });

  // Filet de sécurité si un 'animationend' ne se déclenche pas pour une
  // raison ou une autre (durée max ~0.9s + délai max ~590ms dans le CSS).
  setTimeout(clear, 2000);
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
      overlay.style.background = nextIsDark ? '#101319' : '#f5f1e8';

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
    const iconGb = btn.querySelector('.lang-icon-gb');
    const iconFr = btn.querySelector('.lang-icon-fr');
    const switchingToEnglish = getLang() === 'fr';
    if (label) label.textContent = t('lang_switch_btn');
    // Drapeaux en SVG inline (pas de dépendance réseau ni de souci de
    // repaint mobile). Important : contrairement aux éléments HTML,
    // un <svg> ne répercute pas la propriété JS `.hidden` sur son
    // attribut réel — il faut donc manipuler l'attribut directement
    // via setAttribute/removeAttribute pour que le CSS [hidden]
    // s'applique effectivement.
    if (iconGb) {
      if (switchingToEnglish) { iconGb.removeAttribute('hidden'); iconGb.style.display = ''; }
      else { iconGb.setAttribute('hidden', ''); iconGb.style.display = 'none'; }
    }
    if (iconFr) {
      if (switchingToEnglish) { iconFr.setAttribute('hidden', ''); iconFr.style.display = 'none'; }
      else { iconFr.removeAttribute('hidden'); iconFr.style.display = ''; }
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
      const iconWrap = btn.querySelector('.lang-icon-wrap');
      const shell = document.querySelector('.page-shell');

      const swapContent = () => {
        setLang(getLang() === 'fr' ? 'en' : 'fr');
        applyStaticTranslations();
        applyLangButton();
        refreshDynamicTranslatedTexts();
      };

      // Petite pop sur le drapeau, à chaque clic (sur le conteneur, pas
      // sur l'image elle-même, pour ne jamais gêner sa mise à jour)
      if (iconWrap && !prefersReducedMotion) {
        iconWrap.classList.remove('pop');
        void iconWrap.offsetWidth; // force reflow pour pouvoir rejouer l'animation
        iconWrap.classList.add('pop');
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
  altBtn: document.getElementById('confirm-modal-alt'),
  cancelBtn: document.getElementById('confirm-modal-cancel'),
  onConfirm: null,
  onAlt: null,
  closing: false,

  show({ message, onConfirm, onAlt, onDismiss, danger = true, info = false, okLabel, altLabel, title }) {
    if (!this.el) return;
    this.onConfirm = onConfirm || null;
    this.onAlt = onAlt || null;
    this.onDismiss = onDismiss || null;
    this.messageEl.textContent = message;

    if (this.altBtn) {
      this.altBtn.hidden = !altLabel;
      if (altLabel) this.altBtn.textContent = altLabel;
    }

    this.el.hidden = false;
    this.closing = false;
    this.el.classList.remove('is-closing', 'is-danger-soft', 'is-info');
    if (info) {
      this.el.classList.add('is-info');
      this.cancelBtn.hidden = true;
      this.altBtn.hidden = true;
      this.okBtn.textContent = t('confirm_modal_close');
      this.titleEl.textContent = t('confirm_modal_info_title');
      this.titleEl.removeAttribute('data-i18n');
      this.iconSvg.innerHTML =
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<line x1="12" y1="16" x2="12" y2="12"></line>' +
        '<line x1="12" y1="8" x2="12.01" y2="8"></line>';
    } else {
      this.cancelBtn.hidden = false;
      this.okBtn.textContent = okLabel || t('confirm_modal_ok');
      this.titleEl.textContent = title || t('confirm_modal_title');
      if (title) this.titleEl.removeAttribute('data-i18n');
      else this.titleEl.setAttribute('data-i18n', 'confirm_modal_title');
      this.iconSvg.innerHTML =
        '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
        '<line x1="12" y1="9" x2="12" y2="13"></line>' +
        '<line x1="12" y1="17" x2="12.01" y2="17"></line>';
    }
    if (!danger && !info) this.el.classList.add('is-danger-soft');
    this.okBtn.focus({ preventScroll: true });
  },

  hide(dismiss = true) {
    if (this.closing || !this.el) return;
    this.closing = true;
    this.el.classList.add('is-closing');
    const dismissFn = dismiss ? this.onDismiss : null;
    this.onConfirm = null;
    this.onAlt = null;
    this.onDismiss = null;
    const done = () => {
      this.el.hidden = true;
      this.el.classList.remove('is-closing');
      this.closing = false;
    };
    window.setTimeout(done, prefersReducedMotion ? 0 : 250);
    if (dismissFn) dismissFn();
  },

  confirm() {
    const fn = this.onConfirm;
    this.onConfirm = null;
    this.onAlt = null;
    this.onDismiss = null;
    this.hide(false);
    if (fn) fn();
  },

  alt() {
    const fn = this.onAlt;
    this.onAlt = null;
    this.onConfirm = null;
    this.onDismiss = null;
    this.hide(false);
    if (fn) fn();
  },
};

if (confirmModal.el) {
  confirmModal.okBtn.addEventListener('click', () => confirmModal.confirm());
  confirmModal.cancelBtn.addEventListener('click', () => confirmModal.hide());
  if (confirmModal.altBtn) {
    confirmModal.altBtn.addEventListener('click', () => confirmModal.alt());
  }

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
/* =========================================================
   NAVIGATION PAR ÉCRANS (Calculer / Résultats / Évolution /
   Bulletin / Conseils). Purement visuel : les sections gardent
   leurs ids et leur logique d'origine, seule leur visibilité
   change selon l'onglet actif.
   ========================================================= */
(function setupScreenNavigation() {
  const tabs = Array.from(document.querySelectorAll('.app-tab'));
  const screens = Array.from(document.querySelectorAll('.app-screen'));
  if (!tabs.length || !screens.length) return;

  const validScreens = screens.map((screen) => screen.dataset.screen);

  function activateScreen(screenName, { updateHash = true } = {}) {
    let matched = false;
    screens.forEach((screen) => {
      const isMatch = screen.dataset.screen === screenName;
      screen.classList.toggle('is-active', isMatch);
      if (isMatch) matched = true;
    });
    if (!matched) return;

    if (screenName === 'bulletin' && typeof window.refreshBulletinPreview === 'function') {
      window.refreshBulletinPreview();
    }
    if (screenName === 'historique' && typeof window.refreshHistoriqueScreen === 'function') {
      window.refreshHistoriqueScreen();
    }

    tabs.forEach((tab) => {
      // L'écran "historique" n'a pas d'onglet dédié dans la barre de
      // navigation (on y accède depuis "Évolution") : on garde cet
      // onglet visuellement actif pour ne pas perdre le repère de
      // navigation pendant que l'élève consulte son parcours.
      const isActive = tab.dataset.targetScreen === screenName
        || (screenName === 'historique' && tab.dataset.targetScreen === 'evolution');
      tab.classList.toggle('is-active', isActive);
      if (isActive) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    // Persiste l'onglet actif dans le hash de l'URL (#evolution, #bulletin…)
    // pour qu'un rechargement de page (F5, retour depuis une autre appli)
    // rouvre le même écran plutôt que de revenir systématiquement sur
    // "Calculer". replaceState évite d'empiler une entrée d'historique
    // à chaque clic d'onglet.
    if (updateHash) {
      const newHash = `#${screenName}`;
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }
    }

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateScreen(tab.dataset.targetScreen));
  });

  // Permet aussi la navigation via le bouton précédent/suivant du
  // navigateur, ou un lien externe pointant directement vers un onglet.
  window.addEventListener('hashchange', () => {
    const target = window.location.hash.replace('#', '');
    if (validScreens.includes(target)) {
      activateScreen(target, { updateHash: false });
    }
  });

  // Expose pour permettre aux autres actions (calcul, etc.) de
  // basculer automatiquement l'écran affiché.
  window.activateScreen = activateScreen;

  // Au chargement : si l'URL contient déjà un hash valide (retour sur le
  // site, rechargement de page), on rouvre directement cet onglet-là.
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && validScreens.includes(initialHash)) {
    activateScreen(initialHash, { updateHash: false });
  }
})();