/*
   OUTILS ÉLÈVE — SUNU MOYENNE
   - Simulateur de notes (écran « Simuler ») : calculs hypothétiques isolés,
     jamais enregistrés (état en mémoire uniquement).
   - Analyse de progression (écran « Évolution ») : graphiques SVG légers.
   - Centre de notifications (cloche de l'en-tête) : stockage local.
   - Aides de données partagées avec dashboard.js (window.StudentTools).
   Les calculs viennent de student-logic.js ; les notes réelles sont lues avec
   getStoredNotesForClasse() (script.js) et jamais écrites ici.
*/
(function () {
  'use strict';

  const L = window.StudentLogic;
  if (!L) {
    console.error('student-logic.js est requis par student-tools.js');
    return;
  }

  const NOTIF_KEY = 'lynaqe_notifications';
  const SNAP_KEY = 'lynaqe_notif_snapshot';
  const UPDATED_KEY = 'lynaqe_last_update';
  const CLASSES = ['6e', '5e', '4e', '3e', '2nde', '1er', 'Tle'];
  const SEMS = ['Semestre1', 'Semestre2'];

  /* ---------- Traductions ---------- */

  const FR = {
    tab_simulateur: 'Simuler',

    sim_title: 'Simulateur de notes',
    sim_subtitle: 'Teste une note hypothétique et vois tout de suite l\'effet sur ta moyenne.',
    sim_banner: 'Simulation : aucune de tes notes enregistrées n\'est modifiée. Les résultats ci-dessous sont des estimations.',
    sim_empty_title: 'Rien à simuler pour le moment',
    sim_empty_text: 'Enregistre d\'abord au moins une matière dans l\'onglet Calculer pour pouvoir tester des notes.',
    sim_empty_cta: 'Aller à Calculer',
    sim_no_class: 'Choisis ta classe dans ton profil ou dans l\'onglet Calculer pour utiliser le simulateur.',
    sim_label_semestre: 'Semestre',
    sim_label_matiere: 'Matière',
    sim_label_eval: 'Évaluation concernée',
    sim_label_note: 'Note hypothétique (sur 20)',
    sim_label_coef: 'Coefficient de la matière (facultatif)',
    sim_hint_note: 'Quarts de point uniquement : 15, 15,25, 15,5 ou 15,75.',
    sim_hint_coef: 'Entier de 1 à 8. Vide = coefficient actuel ({coef}).',
    sim_choose_matiere: 'Choisis une matière',
    sim_matiere_unavailable: ' (détail des notes indisponible)',
    sim_eval_devoir1: 'Devoir 1',
    sim_eval_devoir2: 'Devoir 2',
    sim_eval_composition: 'Composition',
    sim_current_avg: 'Ta moyenne actuelle en {matiere} est de {moyenne}/20.',
    sim_current_detail: 'Devoir 1 : {d1} · Devoir 2 : {d2}',
    sim_current_detail_compo: ' · Composition : {compo}',
    sim_current_eval: 'Note actuelle à cette évaluation : {valeur}/20.',
    sim_result_title: 'Résultat estimé',
    sim_estimate_tag: 'Estimation',
    sim_enter_note: 'Saisis une note pour voir le résultat.',
    sim_result_sentence: 'Si tu obtiens {note}/20 à {eval} en {matiere}, ta moyenne en {matiere} deviendra {apres}/20 ({delta}).',
    sim_result_coef: 'Avec un coefficient de {coef} au lieu de {ancien}.',
    sim_result_general: 'Moyenne générale du semestre : {avant} → {apres} ({delta}).',
    sim_result_provisional: 'Calcul provisoire : seules les matières déjà saisies comptent ({n} sur {total}).',
    sim_result_provisional_unknown: 'Calcul provisoire : seules les {n} matière(s) déjà saisies comptent.',
    sim_add_btn: 'Ajouter à la simulation',
    sim_reset_btn: 'Réinitialiser la simulation',
    sim_scenario_title: 'Notes simulées ({n})',
    sim_scenario_item: '{matiere} · {eval} : {note}/20',
    sim_scenario_item_coef: ' · coefficient {coef}',
    sim_remove_btn: 'Retirer',
    sim_remove_aria: 'Retirer cette note simulée : {item}',
    sim_scenario_subject: '{matiere} : {avant} → {apres}/20 ({delta})',
    sim_scenario_total: 'Avec toutes ces notes : moyenne générale {avant} → {apres} ({delta}).',
    sim_err_note: 'Note invalide : entre une valeur de 0 à 20 par quarts de point (ex. 14,25).',
    sim_err_coef: 'Coefficient invalide : entre un entier de 1 à 8.',
    sim_err_incomplete: 'Cette matière n\'a pas de détail de notes enregistré : enregistre-la à nouveau dans l\'onglet Calculer pour pouvoir la simuler.',
    sim_goal_title: 'Quelle note pour atteindre mon objectif ?',
    sim_goal_scope: 'Moyenne visée',
    sim_goal_scope_matiere: 'Moyenne de la matière',
    sim_goal_scope_semestre: 'Moyenne générale',
    sim_goal_target: 'Valeur visée (sur 20)',
    sim_goal_hint: 'Calcul pour l\'évaluation et la matière choisies ci-dessus, avec les notes simulées déjà ajoutées.',
    sim_goal_enter: 'Entre une moyenne visée pour connaître la note nécessaire.',
    sim_goal_invalid: 'Valeur invalide : entre un nombre de 0 à 20.',
    sim_goal_need: 'Pour que ta {scope} atteigne {cible}/20, il te faut au moins {note}/20 à {eval} en {matiere}.',
    sim_goal_already: 'Objectif déjà assuré : même avec 0/20 à {eval}, ta {scope} serait d\'au moins {cible}/20.',
    sim_goal_impossible: 'Impossible avec cette seule évaluation : même avec 20/20 à {eval}, ta {scope} ne dépasserait pas {max}/20.',
    sim_goal_unavailable: 'Calcul impossible : les notes détaillées de cette matière ne sont pas disponibles.',
    sim_scope_word_matiere: 'moyenne en {matiere}',
    sim_scope_word_semestre: 'moyenne générale',
    unit_pt: ' pt',

    dash2_prev_label: 'Période précédente',
    dash2_no_prev: 'Aucune période précédente enregistrée.',
    dash2_provisional: 'Provisoire · {n}/{total} matières',
    dash2_provisional_unknown: 'Provisoire · {n} matière(s) saisie(s)',
    dash2_complete: 'Moyenne complète',
    dash2_delta_hidden: 'L\'écart apparaît quand toutes les matières des deux périodes sont saisies.',
    dash2_card_count: 'Matières évaluées',
    dash2_count_of: 'sur {total} attendues',
    dash2_card_best: 'Meilleure matière',
    dash2_card_worst: 'À travailler en priorité',
    dash2_need_two: 'Enregistre au moins deux matières pour les comparer.',
    dash2_card_goal: 'Objectif de moyenne',
    dash2_goal_none: 'Non défini',
    dash2_goal_set: 'Définir mon objectif',
    dash2_goal_edit: 'Modifier',
    dash2_goal_save: 'Enregistrer',
    dash2_goal_remove: 'Retirer l\'objectif',
    dash2_goal_label: 'Mon objectif de moyenne générale (sur 20)',
    dash2_goal_invalid: 'Objectif invalide : entre une valeur de 0 à 20.',
    dash2_goal_progress: 'Progression vers l\'objectif',
    dash2_goal_reached: 'Objectif atteint ✓',
    dash2_goal_remaining: 'Il te reste {diff} pt pour atteindre {obj}/20.',
    dash2_goal_noavg: 'Enregistre des matières pour suivre ta progression vers l\'objectif.',
    dash2_goal_provisional: 'Calcul provisoire sur les matières déjà saisies.',
    dash2_goal_nogoal: 'Définis un objectif pour suivre ta progression.',
    dash2_updated: 'Dernière mise à jour des résultats : {date}',
    dash2_strong: 'Points forts',
    dash2_weak: 'À améliorer',
    dash2_up: 'En progression',
    dash2_down: 'En baisse',
    dash2_strong_help_goal: 'Au-dessus de ton objectif et de ta moyenne générale.',
    dash2_strong_help_nogoal: 'Au-dessus de 10/20 et de ta moyenne générale.',
    dash2_weak_help_goal: 'Sous ton objectif ({ref}/20).',
    dash2_weak_help_nogoal: 'Sous la moyenne de 10/20.',
    dash2_up_help: 'Hausse d\'au moins 0,5 pt par rapport à la période précédente.',
    dash2_down_help: 'Baisse d\'au moins 0,5 pt par rapport à la période précédente.',
    dash2_strong_none: 'Aucune matière ne se détache encore.',
    dash2_weak_none: 'Aucune matière sous ce seuil. Bravo !',
    dash2_trend_noprev: 'Pas de période précédente à comparer pour le moment.',
    dash2_trend_none: 'Aucune variation marquée.',
    dash2_gap_below: '{n} pt sous le seuil',
    dash2_reco_title: 'Recommandations',
    dash2_reco_note: 'Conseils calculés à partir de tes résultats réels, avec des règles simples (sans intelligence artificielle).',
    dash2_reco_empty: 'Les recommandations apparaîtront dès que tu auras enregistré des matières.',
    dash2_btn_simulateur: 'Simuler une note',
    dash2_matieres_hint: 'Moyenne de chaque matière enregistrée',
    rec_work_goal: 'Consacre plus de temps à {matiere} : ta moyenne y est de {moyenne}/20, soit {ecart} pt sous ton objectif.',
    rec_work_basic: 'Consacre plus de temps à {matiere} : ta moyenne y est de {moyenne}/20, sous la moyenne de 10.',
    rec_revise: 'Révise {matiere} avant ta prochaine évaluation : ta moyenne y a baissé de {baisse} pt.',
    rec_encourage: 'Bravo, {matiere} progresse de {hausse} pt. Continue sur cette lancée !',
    rec_goal_lever: 'Il te manque {manque} pt de moyenne générale pour ton objectif : passer {matiere} de {de} à {a}/20 suffirait.',
    rec_goal_spread: 'Il te manque {manque} pt de moyenne générale pour ton objectif : une seule matière ne suffira pas, vise plusieurs progrès à la fois.',
    rec_goal_reached: 'Tu as atteint ton objectif de {objectif}/20. Tu peux le relever pour continuer à progresser.',

    ana_title: 'Analyse de ta progression',
    ana_subtitle: 'Compare tes moyennes dans le temps, par matière et entre semestres.',
    ana_tablist: 'Type de graphique',
    ana_tab_periods: 'Moyennes',
    ana_tab_subjects: 'Matières',
    ana_tab_semesters: 'Semestres',
    ana_empty: 'Pas encore de données à représenter. Enregistre des matières dans l\'onglet Calculer.',
    ana_periods_help: 'Chaque point plein est la moyenne d\'un semestre complet. Un point creux est provisoire (toutes les matières ne sont pas saisies) et n\'est relié à rien.',
    ana_trend_up: 'Tendance générale : en hausse de {delta} pt entre le premier et le dernier semestre complet.',
    ana_trend_down: 'Tendance générale : en baisse de {delta} pt entre le premier et le dernier semestre complet.',
    ana_trend_flat: 'Tendance générale : stable (variation de moins de 0,25 pt).',
    ana_latest: 'Dernière variation : {delta} pt.',
    ana_need_two: 'Il faut au moins deux semestres complets pour calculer une tendance.',
    ana_values: 'Voir les valeurs exactes',
    ana_th_period: 'Période',
    ana_th_avg: 'Moyenne',
    ana_th_state: 'État',
    ana_state_complete: 'Complet',
    ana_state_partial: 'Provisoire',
    ana_state_none: 'Aucune donnée',
    ana_chart_periods_label: 'Moyennes par semestre : {summary}',
    ana_pick_class: 'Classe',
    ana_pick_sem: 'Semestre',
    ana_goal_short: 'Objectif',
    ana_goal_line: 'Repère : ton objectif ({obj}/20)',
    ana_nogoal_line: 'Repère : 10/20 (aucun objectif défini)',
    ana_above: 'au-dessus du repère',
    ana_below: 'sous le repère',
    ana_equal: 'au niveau du repère',
    ana_sem_need_both: 'Enregistre des matières dans les deux semestres de {classe} pour les comparer.',
    ana_sem_avg: 'Moyenne {semestre}',
    ana_sem_delta: 'Variation du semestre 1 au semestre 2 : {delta} pt',
    ana_sem_note: 'Les contributions concernent les {n} matière(s) présentes dans les deux semestres.',
    ana_sem_explain: 'Matières qui expliquent le mieux la variation',
    ana_sem_contrib: 'contribution {c} pt',
    ana_sem_only: 'Matières présentes dans un seul semestre (non comparées) : {list}',
    ana_sem_partial: 'Au moins un des deux semestres est provisoire : la variation peut changer quand toutes les matières seront saisies.',
    ana_sem_none_common: 'Aucune matière commune aux deux semestres : impossible de détailler la variation.',

    notif_bell_label: 'Notifications',
    notif_bell_unread: 'Notifications ({n} non lues)',
    notif_title: 'Notifications',
    notif_mark_all: 'Tout marquer comme lu',
    notif_mark_read: 'Marquer comme lue',
    notif_delete: 'Supprimer',
    notif_unread: 'Non lue',
    notif_close: 'Fermer',
    notif_empty_title: 'Aucune notification',
    notif_empty_text: 'Tu seras prévenu ici quand un bulletin sera prêt, qu\'un objectif sera atteint ou qu\'une note évoluera nettement.',
    notif_type_objectif: 'Objectif',
    notif_type_progres: 'Progrès',
    notif_type_baisse: 'Baisse',
    notif_type_bulletin: 'Bulletin',
    notif_type_donnees: 'Données',
    notif_open_evolution: 'Voir l\'évolution',
    notif_open_bulletin: 'Voir le bulletin',
    notif_goal_reached: 'Objectif atteint ! Ta moyenne en {classe}, {sem} est de {moyenne}/20 (objectif : {objectif}/20).',
    notif_subject_up: 'Belle progression en {matiere} ({classe}, {sem}) : de {de} à {a}/20.',
    notif_subject_down: 'Baisse en {matiere} ({classe}, {sem}) : de {de} à {a}/20. Pense à réviser avant la prochaine évaluation.',
    notif_sem_up: 'Ta moyenne en {classe}, {sem} progresse : de {de} à {a}/20.',
    notif_sem_down: 'Ta moyenne en {classe}, {sem} baisse : de {de} à {a}/20.',
    notif_bulletin_ready: 'Toutes les matières de {classe}, {sem} sont saisies : ton bulletin est prêt à être téléchargé.',
    notif_data_import: 'Données importées depuis un autre appareil : {n} matière(s) enregistrée(s).'
  };

  const EN = {
    tab_simulateur: 'Simulate',

    sim_title: 'Grade simulator',
    sim_subtitle: 'Try a hypothetical grade and instantly see the effect on your average.',
    sim_banner: 'Simulation: none of your saved grades are changed. The results below are estimates.',
    sim_empty_title: 'Nothing to simulate yet',
    sim_empty_text: 'First save at least one subject in the Calculate tab to be able to test grades.',
    sim_empty_cta: 'Go to Calculate',
    sim_no_class: 'Choose your class in your profile or in the Calculate tab to use the simulator.',
    sim_label_semestre: 'Semester',
    sim_label_matiere: 'Subject',
    sim_label_eval: 'Assessment',
    sim_label_note: 'Hypothetical grade (out of 20)',
    sim_label_coef: 'Subject coefficient (optional)',
    sim_hint_note: 'Quarter points only: 15, 15.25, 15.5 or 15.75.',
    sim_hint_coef: 'Whole number from 1 to 8. Empty = current coefficient ({coef}).',
    sim_choose_matiere: 'Choose a subject',
    sim_matiere_unavailable: ' (grade details unavailable)',
    sim_eval_devoir1: 'Assignment 1',
    sim_eval_devoir2: 'Assignment 2',
    sim_eval_composition: 'Exam',
    sim_current_avg: 'Your current average in {matiere} is {moyenne}/20.',
    sim_current_detail: 'Assignment 1: {d1} · Assignment 2: {d2}',
    sim_current_detail_compo: ' · Exam: {compo}',
    sim_current_eval: 'Current grade for this assessment: {valeur}/20.',
    sim_result_title: 'Estimated result',
    sim_estimate_tag: 'Estimate',
    sim_enter_note: 'Enter a grade to see the result.',
    sim_result_sentence: 'If you get {note}/20 in {eval} for {matiere}, your {matiere} average becomes {apres}/20 ({delta}).',
    sim_result_coef: 'With a coefficient of {coef} instead of {ancien}.',
    sim_result_general: 'Semester overall average: {avant} → {apres} ({delta}).',
    sim_result_provisional: 'Provisional calculation: only the subjects already entered count ({n} of {total}).',
    sim_result_provisional_unknown: 'Provisional calculation: only the {n} subject(s) already entered count.',
    sim_add_btn: 'Add to the simulation',
    sim_reset_btn: 'Reset the simulation',
    sim_scenario_title: 'Simulated grades ({n})',
    sim_scenario_item: '{matiere} · {eval}: {note}/20',
    sim_scenario_item_coef: ' · coefficient {coef}',
    sim_remove_btn: 'Remove',
    sim_remove_aria: 'Remove this simulated grade: {item}',
    sim_scenario_subject: '{matiere}: {avant} → {apres}/20 ({delta})',
    sim_scenario_total: 'With all these grades: overall average {avant} → {apres} ({delta}).',
    sim_err_note: 'Invalid grade: enter a value from 0 to 20 in quarter points (e.g. 14.25).',
    sim_err_coef: 'Invalid coefficient: enter a whole number from 1 to 8.',
    sim_err_incomplete: 'This subject has no saved grade details: save it again in the Calculate tab to simulate it.',
    sim_goal_title: 'Which grade do I need to reach my goal?',
    sim_goal_scope: 'Target average',
    sim_goal_scope_matiere: 'Subject average',
    sim_goal_scope_semestre: 'Overall average',
    sim_goal_target: 'Target value (out of 20)',
    sim_goal_hint: 'Calculated for the assessment and subject chosen above, including the simulated grades already added.',
    sim_goal_enter: 'Enter a target average to see the grade you need.',
    sim_goal_invalid: 'Invalid value: enter a number from 0 to 20.',
    sim_goal_need: 'For your {scope} to reach {cible}/20, you need at least {note}/20 in {eval} for {matiere}.',
    sim_goal_already: 'Goal already secured: even with 0/20 in {eval}, your {scope} would be at least {cible}/20.',
    sim_goal_impossible: 'Not possible with this assessment alone: even with 20/20 in {eval}, your {scope} would not exceed {max}/20.',
    sim_goal_unavailable: 'Cannot calculate: the grade details of this subject are not available.',
    sim_scope_word_matiere: '{matiere} average',
    sim_scope_word_semestre: 'overall average',
    unit_pt: ' pt',

    dash2_prev_label: 'Previous period',
    dash2_no_prev: 'No previous period saved.',
    dash2_provisional: 'Provisional · {n}/{total} subjects',
    dash2_provisional_unknown: 'Provisional · {n} subject(s) entered',
    dash2_complete: 'Complete average',
    dash2_delta_hidden: 'The difference appears once all subjects of both periods are entered.',
    dash2_card_count: 'Subjects assessed',
    dash2_count_of: 'out of {total} expected',
    dash2_card_best: 'Best subject',
    dash2_card_worst: 'Needs most work',
    dash2_need_two: 'Save at least two subjects to compare them.',
    dash2_card_goal: 'Average goal',
    dash2_goal_none: 'Not set',
    dash2_goal_set: 'Set my goal',
    dash2_goal_edit: 'Edit',
    dash2_goal_save: 'Save',
    dash2_goal_remove: 'Remove the goal',
    dash2_goal_label: 'My overall average goal (out of 20)',
    dash2_goal_invalid: 'Invalid goal: enter a value from 0 to 20.',
    dash2_goal_progress: 'Progress towards the goal',
    dash2_goal_reached: 'Goal reached ✓',
    dash2_goal_remaining: '{diff} pt left to reach {obj}/20.',
    dash2_goal_noavg: 'Save subjects to follow your progress towards the goal.',
    dash2_goal_provisional: 'Provisional calculation based on the subjects already entered.',
    dash2_goal_nogoal: 'Set a goal to follow your progress.',
    dash2_updated: 'Results last updated: {date}',
    dash2_strong: 'Strengths',
    dash2_weak: 'To improve',
    dash2_up: 'Improving',
    dash2_down: 'Declining',
    dash2_strong_help_goal: 'Above your goal and your overall average.',
    dash2_strong_help_nogoal: 'Above 10/20 and your overall average.',
    dash2_weak_help_goal: 'Below your goal ({ref}/20).',
    dash2_weak_help_nogoal: 'Below the 10/20 pass mark.',
    dash2_up_help: 'Up at least 0.5 pt compared with the previous period.',
    dash2_down_help: 'Down at least 0.5 pt compared with the previous period.',
    dash2_strong_none: 'No subject stands out yet.',
    dash2_weak_none: 'No subject below this threshold. Well done!',
    dash2_trend_noprev: 'No previous period to compare with yet.',
    dash2_trend_none: 'No marked change.',
    dash2_gap_below: '{n} pt below the threshold',
    dash2_reco_title: 'Recommendations',
    dash2_reco_note: 'Advice computed from your real results using simple rules (no artificial intelligence).',
    dash2_reco_empty: 'Recommendations will appear once you have saved subjects.',
    dash2_btn_simulateur: 'Simulate a grade',
    dash2_matieres_hint: 'Average of each saved subject',
    rec_work_goal: 'Spend more time on {matiere}: your average there is {moyenne}/20, {ecart} pt below your goal.',
    rec_work_basic: 'Spend more time on {matiere}: your average there is {moyenne}/20, below the pass mark of 10.',
    rec_revise: 'Revise {matiere} before your next assessment: your average there dropped by {baisse} pt.',
    rec_encourage: 'Well done, {matiere} is up by {hausse} pt. Keep it up!',
    rec_goal_lever: 'You are {manque} pt short of your overall goal: raising {matiere} from {de} to {a}/20 would be enough.',
    rec_goal_spread: 'You are {manque} pt short of your overall goal: no single subject will be enough, aim for progress in several at once.',
    rec_goal_reached: 'You reached your goal of {objectif}/20. You can raise it to keep improving.',

    ana_title: 'Your progress analysis',
    ana_subtitle: 'Compare your averages over time, by subject and between semesters.',
    ana_tablist: 'Chart type',
    ana_tab_periods: 'Averages',
    ana_tab_subjects: 'Subjects',
    ana_tab_semesters: 'Semesters',
    ana_empty: 'No data to display yet. Save subjects in the Calculate tab.',
    ana_periods_help: 'Each filled dot is the average of a complete semester. A hollow dot is provisional (not all subjects are entered) and is not linked to anything.',
    ana_trend_up: 'Overall trend: up {delta} pt between the first and the last complete semester.',
    ana_trend_down: 'Overall trend: down {delta} pt between the first and the last complete semester.',
    ana_trend_flat: 'Overall trend: stable (change below 0.25 pt).',
    ana_latest: 'Latest change: {delta} pt.',
    ana_need_two: 'At least two complete semesters are needed to compute a trend.',
    ana_values: 'Show exact values',
    ana_th_period: 'Period',
    ana_th_avg: 'Average',
    ana_th_state: 'Status',
    ana_state_complete: 'Complete',
    ana_state_partial: 'Provisional',
    ana_state_none: 'No data',
    ana_chart_periods_label: 'Averages by semester: {summary}',
    ana_pick_class: 'Class',
    ana_pick_sem: 'Semester',
    ana_goal_short: 'Goal',
    ana_goal_line: 'Marker: your goal ({obj}/20)',
    ana_nogoal_line: 'Marker: 10/20 (no goal set)',
    ana_above: 'above the marker',
    ana_below: 'below the marker',
    ana_equal: 'at the marker',
    ana_sem_need_both: 'Save subjects in both semesters of {classe} to compare them.',
    ana_sem_avg: '{semestre} average',
    ana_sem_delta: 'Change from semester 1 to semester 2: {delta} pt',
    ana_sem_note: 'Contributions cover the {n} subject(s) present in both semesters.',
    ana_sem_explain: 'Subjects that best explain the change',
    ana_sem_contrib: 'contribution {c} pt',
    ana_sem_only: 'Subjects in only one semester (not compared): {list}',
    ana_sem_partial: 'At least one of the two semesters is provisional: the change may differ once all subjects are entered.',
    ana_sem_none_common: 'No subject is common to both semesters: the change cannot be broken down.',

    notif_bell_label: 'Notifications',
    notif_bell_unread: 'Notifications ({n} unread)',
    notif_title: 'Notifications',
    notif_mark_all: 'Mark all as read',
    notif_mark_read: 'Mark as read',
    notif_delete: 'Delete',
    notif_unread: 'Unread',
    notif_close: 'Close',
    notif_empty_title: 'No notifications',
    notif_empty_text: 'You will be told here when a report card is ready, a goal is reached or a grade changes noticeably.',
    notif_type_objectif: 'Goal',
    notif_type_progres: 'Progress',
    notif_type_baisse: 'Drop',
    notif_type_bulletin: 'Report card',
    notif_type_donnees: 'Data',
    notif_open_evolution: 'View progress',
    notif_open_bulletin: 'View report card',
    notif_goal_reached: 'Goal reached! Your {classe} average, {sem} is {moyenne}/20 (goal: {objectif}/20).',
    notif_subject_up: 'Great progress in {matiere} ({classe}, {sem}): from {de} to {a}/20.',
    notif_subject_down: 'Drop in {matiere} ({classe}, {sem}): from {de} to {a}/20. Consider revising before the next assessment.',
    notif_sem_up: 'Your {classe} average, {sem} is up: from {de} to {a}/20.',
    notif_sem_down: 'Your {classe} average, {sem} is down: from {de} to {a}/20.',
    notif_bulletin_ready: 'All subjects of {classe}, {sem} are entered: your report card is ready to download.',
    notif_data_import: 'Data imported from another device: {n} subject(s) saved.'
  };

  if (typeof translations !== 'undefined') {
    Object.assign(translations.fr, FR);
    Object.assign(translations.en, EN);
  }

  /* ---------- Utilitaires ---------- */

  const tr = (key, vars) => (typeof window.t === 'function' ? window.t(key, vars) : key);
  const lang = () => (typeof getLang === 'function' ? getLang() : 'fr');
  const $ = (id) => document.getElementById(id);

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  function fr(value, digits = 2) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const s = Number(value).toFixed(digits);
    return lang() === 'en' ? s : s.replace('.', ',');
  }

  /* +1,25 / −0,50 / 0,00 */
  function signed(value, digits = 2) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const rounded = Number(Number(value).toFixed(digits));
    if (rounded === 0) return fr(0, digits);
    return `${rounded > 0 ? '+' : '−'}${fr(Math.abs(rounded), digits)}`;
  }

  const signedPt = (v) => `${signed(v)}${tr('unit_pt')}`;

  function matiereName(m) {
    return typeof translateMatiere === 'function' ? translateMatiere(m) : m;
  }

  function semLabel(sem) {
    return tr(sem === 'Semestre1' ? 'table_semestre1_full' : 'table_semestre2_full');
  }

  function semShort(sem) {
    return sem === 'Semestre1' ? 'Sem1' : 'Sem2';
  }

  function formatDate(ts) {
    try {
      return new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function screenActive(name) {
    const screen = document.querySelector(`.app-screen[data-screen="${name}"]`);
    return Boolean(screen && screen.classList.contains('is-active'));
  }

  /* ---------- Accès aux données réelles (lecture seule) ---------- */

  function profile() {
    return typeof getStudentProfile === 'function' ? getStudentProfile() : {};
  }

  function classeCourante() {
    const p = profile();
    if (p.classe) return p.classe;
    const select = $('classe');
    return select && select.value ? select.value : '';
  }

  function currentSem() {
    return typeof getSemestreActuel === 'function' ? getSemestreActuel() : 'Semestre1';
  }

  function notes(classe, sem) {
    if (!classe || typeof getStoredNotesForClasse !== 'function') return {};
    try {
      return getStoredNotesForClasse(classe, sem) || {};
    } catch {
      return {};
    }
  }

  const hasNotes = (classe, sem) => Object.keys(notes(classe, sem)).length > 0;

  /* Semestre complet : même règle que « Mon parcours » (script.js). */
  function isComplete(classe, sem) {
    try {
      return typeof computeMoyenneSemestreParcours === 'function' && computeMoyenneSemestreParcours(classe, sem) !== null;
    } catch {
      return false;
    }
  }

  function expectedCount(classe) {
    try {
      const list = typeof getMatieresAttenduesParcours === 'function' ? getMatieresAttenduesParcours(classe) : null;
      return list ? list.length : null;
    } catch {
      return null;
    }
  }

  /* Période précédente : S1 -> S2 de la classe précédente, S2 -> S1. */
  function previousPeriod(classe, sem) {
    if (sem === 'Semestre2') return { classe, sem: 'Semestre1' };
    const i = CLASSES.indexOf(classe);
    return i > 0 ? { classe: CLASSES[i - 1], sem: 'Semestre2' } : null;
  }

  function goal() {
    const g = typeof getObjectifPersonnel === 'function' ? getObjectifPersonnel() : null;
    return Number.isFinite(g) ? g : null;
  }

  function lastUpdate() {
    const ts = Number(localStorage.getItem(UPDATED_KEY));
    return Number.isFinite(ts) && ts > 0 ? ts : null;
  }

  function collectPeriods() {
    const periods = {};
    CLASSES.forEach((classe) => {
      SEMS.forEach((sem) => {
        const n = notes(classe, sem);
        if (Object.keys(n).length) periods[`${classe}|${sem}`] = { notes: n, complete: isComplete(classe, sem) };
      });
    });
    return periods;
  }

  /* ================= SIMULATEUR ================= */

  const sim = {
    ctx: '',
    sem: null,
    matiere: '',
    key: '',
    noteRaw: '',
    coefRaw: '',
    goalScope: null,
    goalRaw: null,
    scenario: [] /* en mémoire uniquement : jamais écrit dans localStorage */
  };

  const EVAL_KEYS = { devoir1: 'sim_eval_devoir1', devoir2: 'sim_eval_devoir2', composition: 'sim_eval_composition' };
  const evalLabel = (key) => tr(EVAL_KEYS[key]);

  function simContext() {
    const classe = classeCourante();
    if (sim.sem === null) sim.sem = currentSem();
    const ctx = `${classe}|${sim.sem}`;
    if (ctx !== sim.ctx) {
      sim.ctx = ctx;
      sim.matiere = '';
      sim.key = '';
      sim.noteRaw = '';
      sim.coefRaw = '';
      sim.goalRaw = null;
      sim.scenario = [];
    }
    const data = notes(classe, sim.sem);
    if (sim.matiere && !data[sim.matiere]) {
      sim.matiere = '';
      sim.key = '';
    }
    if (sim.matiere) {
      const keys = L.evaluationKeys(data[sim.matiere]);
      if (!keys.includes(sim.key)) sim.key = keys[0] || '';
    }
    if (sim.goalScope === null) sim.goalScope = goal() !== null ? 'semestre' : 'matiere';
    if (sim.goalRaw === null) sim.goalRaw = goal() !== null ? String(goal()) : '';
    return { classe, data };
  }

  function simDraft(data) {
    if (!sim.matiere || !sim.key) return { state: 'none' };
    const rec = data[sim.matiere];
    if (!L.isSimulable(rec)) return { state: 'incomplete' };
    const raw = sim.noteRaw.trim();
    const coefRaw = sim.coefRaw.trim();
    const coefficient = coefRaw === '' ? null : L.parseCoefficient(coefRaw);
    const errors = {};
    let value = null;
    if (raw !== '') {
      value = L.parseNote(raw);
      if (value === null) errors.note = 'sim_err_note';
    }
    if (coefRaw !== '' && coefficient === null) errors.coef = 'sim_err_coef';
    if (value === null || errors.coef) return { state: raw === '' && !errors.coef ? 'empty' : 'invalid', errors };
    return { state: 'ok', errors, change: { matiere: sim.matiere, key: sim.key, value, coefficient } };
  }

  function provisionalLine(classe, sem, count) {
    if (isComplete(classe, sem)) return '';
    const total = expectedCount(classe);
    const text = total
      ? tr('sim_result_provisional', { n: count, total })
      : tr('sim_result_provisional_unknown', { n: count });
    return `<p class="sim-provisional">${esc(text)}</p>`;
  }

  function scenarioItemText(change) {
    let text = tr('sim_scenario_item', {
      matiere: matiereName(change.matiere),
      eval: evalLabel(change.key),
      note: fr(change.value)
    });
    if (change.coefficient) text += tr('sim_scenario_item_coef', { coef: change.coefficient });
    return text;
  }

  function simResultsHTML(classe, data, draft) {
    const changes = sim.scenario.slice();
    if (draft.state === 'ok') changes.push(draft.change);
    if (!changes.length) {
      return `<p class="sim-hint-line">${esc(tr('sim_enter_note'))}</p>`;
    }
    const result = L.simulate(data, changes);
    let html = '';

    if (draft.state === 'ok') {
      const subject = result.subjects.find((s) => s.matiere === draft.change.matiere);
      const sentence = tr('sim_result_sentence', {
        note: fr(draft.change.value),
        eval: evalLabel(draft.change.key),
        matiere: matiereName(draft.change.matiere),
        apres: fr(subject.after),
        delta: signedPt(subject.delta)
      });
      html += `<p class="sim-sentence"><span class="sim-tag">${esc(tr('sim_estimate_tag'))}</span> ${esc(sentence)}</p>`;
      if (draft.change.coefficient && subject.coefficientAfter !== subject.coefficientBefore) {
        html += `<p class="sim-sub">${esc(tr('sim_result_coef', { coef: subject.coefficientAfter, ancien: subject.coefficientBefore }))}</p>`;
      }
    }

    if (result.semesterBefore !== null && result.semesterAfter !== null) {
      const line = tr(sim.scenario.length && draft.state !== 'ok' ? 'sim_scenario_total' : 'sim_result_general', {
        avant: fr(result.semesterBefore),
        apres: fr(result.semesterAfter),
        delta: signedPt(result.semesterDelta)
      });
      html += `<p class="sim-general"><strong>${esc(line)}</strong></p>`;
      html += provisionalLine(classe, sim.sem, Object.keys(data).length);
    }
    return html;
  }

  function simScenarioHTML(data) {
    if (!sim.scenario.length) return '';
    const result = L.simulate(data, sim.scenario);
    const items = sim.scenario.map((change, i) => {
      const text = scenarioItemText(change);
      return `<li class="sim-scenario-item"><span>${esc(text)}</span>
        <button type="button" class="ghost-button sim-remove" data-sim-remove="${i}" aria-label="${esc(tr('sim_remove_aria', { item: text }))}">${esc(tr('sim_remove_btn'))}</button></li>`;
    }).join('');
    const subjects = result.subjects.map((s) => `<li>${esc(tr('sim_scenario_subject', {
      matiere: matiereName(s.matiere), avant: fr(s.before), apres: fr(s.after), delta: signedPt(s.delta)
    }))}</li>`).join('');
    const total = result.semesterBefore !== null
      ? `<p class="sim-general"><strong>${esc(tr('sim_scenario_total', {
        avant: fr(result.semesterBefore), apres: fr(result.semesterAfter), delta: signedPt(result.semesterDelta)
      }))}</strong></p>`
      : '';
    return `<section class="sim-scenario" aria-labelledby="sim-scenario-title">
      <h4 id="sim-scenario-title">${esc(tr('sim_scenario_title', { n: sim.scenario.length }))}</h4>
      <ul class="sim-scenario-list">${items}</ul>
      <ul class="sim-subject-list">${subjects}</ul>
      ${total}
    </section>`;
  }

  function simGoalHTML(data) {
    if (!sim.matiere || !sim.key) return '';
    const rec = data[sim.matiere];
    if (!L.isSimulable(rec)) return `<p class="sim-hint-line">${esc(tr('sim_goal_unavailable'))}</p>`;
    const raw = sim.goalRaw.trim();
    if (raw === '') return `<p class="sim-hint-line">${esc(tr('sim_goal_enter'))}</p>`;
    const target = Number(raw.replace(',', '.'));
    if (!Number.isFinite(target) || target < 0 || target > 20) {
      return `<p class="sim-err" role="alert">${esc(tr('sim_goal_invalid'))}</p>`;
    }
    const applied = L.applyScenario(data, sim.scenario);
    const r = L.requiredNote(applied, { matiere: sim.matiere, key: sim.key, target, scope: sim.goalScope });
    const scope = sim.goalScope === 'semestre'
      ? tr('sim_scope_word_semestre')
      : tr('sim_scope_word_matiere', { matiere: matiereName(sim.matiere) });
    const vars = { scope, cible: fr(target), eval: evalLabel(sim.key), matiere: matiereName(sim.matiere) };
    if (r.status === 'reachable') return `<p class="sim-goal-ok"><span class="sim-tag">${esc(tr('sim_estimate_tag'))}</span> ${esc(tr('sim_goal_need', { ...vars, note: fr(r.minNote) }))}</p>`;
    if (r.status === 'already') return `<p class="sim-goal-ok"><span class="sim-tag">${esc(tr('sim_estimate_tag'))}</span> ${esc(tr('sim_goal_already', vars))}</p>`;
    if (r.reason === 'inatteignable') return `<p class="sim-goal-no"><span class="sim-tag">${esc(tr('sim_estimate_tag'))}</span> ${esc(tr('sim_goal_impossible', { ...vars, max: fr(r.maxAchievable) }))}</p>`;
    return `<p class="sim-hint-line">${esc(tr('sim_goal_unavailable'))}</p>`;
  }

  function updateSimResults() {
    const root = $('sim-root');
    if (!root || !$('sim-results')) return;
    const { classe, data } = simContext();
    const draft = simDraft(data);

    $('sim-results').innerHTML = simResultsHTML(classe, data, draft);
    $('sim-scenario-zone').innerHTML = simScenarioHTML(data);
    $('sim-goal-result').innerHTML = simGoalHTML(data);

    const noteErr = $('sim-note-err');
    const coefErr = $('sim-coef-err');
    if (noteErr) noteErr.textContent = draft.errors && draft.errors.note ? tr(draft.errors.note) : '';
    if (coefErr) coefErr.textContent = draft.errors && draft.errors.coef ? tr(draft.errors.coef) : '';
    $('sim-note')?.setAttribute('aria-invalid', draft.errors && draft.errors.note ? 'true' : 'false');
    $('sim-coef')?.setAttribute('aria-invalid', draft.errors && draft.errors.coef ? 'true' : 'false');

    const add = $('sim-add');
    if (add) add.disabled = draft.state !== 'ok';
    const reset = $('sim-reset');
    if (reset) reset.disabled = !sim.scenario.length && !sim.noteRaw && !sim.coefRaw;
  }

  function renderSimulator(focusId) {
    const root = $('sim-root');
    if (!root) return;
    const { classe, data } = simContext();
    const names = Object.keys(data).sort((a, b) => a.localeCompare(b));

    const head = `<header class="sim-head">
        <h2>${esc(tr('sim_title'))}</h2>
        <p>${esc(tr('sim_subtitle'))}</p>
      </header>
      <p class="sim-banner" role="note"><span aria-hidden="true">🧪</span> ${esc(tr('sim_banner'))}</p>`;

    if (!classe) {
      root.innerHTML = `${head}<div class="sim-empty"><p>${esc(tr('sim_no_class'))}</p>
        <button type="button" class="primary-button" data-sim-goto="calculer">${esc(tr('sim_empty_cta'))}</button></div>`;
      return;
    }

    const semRadios = SEMS.map((s) => `<label class="sim-radio"><input type="radio" name="sim-sem" value="${s}" ${sim.sem === s ? 'checked' : ''}> <span>${esc(semLabel(s))}</span></label>`).join('');
    const context = `<div class="sim-context"><span class="sim-class-chip">${esc(classe)}</span>
        <fieldset class="sim-sem-group"><legend>${esc(tr('sim_label_semestre'))}</legend>${semRadios}</fieldset></div>`;

    if (!names.length) {
      root.innerHTML = `${head}${context}<div class="sim-empty"><strong>${esc(tr('sim_empty_title'))}</strong>
        <p>${esc(tr('sim_empty_text'))}</p>
        <button type="button" class="primary-button" data-sim-goto="calculer">${esc(tr('sim_empty_cta'))}</button></div>`;
      return;
    }

    const matiereOptions = [`<option value="">${esc(tr('sim_choose_matiere'))}</option>`]
      .concat(names.map((m) => {
        const ok = L.isSimulable(data[m]);
        return `<option value="${esc(m)}" ${m === sim.matiere ? 'selected' : ''} ${ok ? '' : 'disabled'}>${esc(matiereName(m))}${ok ? '' : esc(tr('sim_matiere_unavailable'))}</option>`;
      })).join('');

    const rec = sim.matiere ? data[sim.matiere] : null;
    const evalKeys = rec ? L.evaluationKeys(rec) : [];
    const evalOptions = evalKeys.map((k) => `<option value="${k}" ${k === sim.key ? 'selected' : ''}>${esc(evalLabel(k))}</option>`).join('');

    let current = '';
    if (rec && L.isSimulable(rec)) {
      current = `<p class="sim-current-line"><strong>${esc(tr('sim_current_avg', { matiere: matiereName(sim.matiere), moyenne: fr(rec.moyenne) }))}</strong></p>
        <p class="sim-sub">${esc(tr('sim_current_detail', { d1: fr(rec.devoir1), d2: fr(rec.devoir2) }))}${L.hasComposition(rec) ? esc(tr('sim_current_detail_compo', { compo: fr(rec.composition) })) : ''}
        ${sim.key ? ' · ' + esc(tr('sim_current_eval', { valeur: fr(rec[sim.key]) })) : ''}</p>`;
    } else if (rec) {
      current = `<p class="sim-err" role="alert">${esc(tr('sim_err_incomplete'))}</p>`;
    }

    const coefHint = tr('sim_hint_coef', { coef: rec ? Number(rec.coefficient) : '—' });
    const scopeRadios = ['matiere', 'semestre'].map((s) => `<label class="sim-radio"><input type="radio" name="sim-goal-scope" value="${s}" ${sim.goalScope === s ? 'checked' : ''}> <span>${esc(tr('sim_goal_scope_' + s))}</span></label>`).join('');

    root.innerHTML = `${head}${context}
      <div class="sim-grid">
        <div class="sim-field">
          <label for="sim-matiere">${esc(tr('sim_label_matiere'))}</label>
          <select id="sim-matiere">${matiereOptions}</select>
        </div>
        <div class="sim-field">
          <label for="sim-eval">${esc(tr('sim_label_eval'))}</label>
          <select id="sim-eval" ${evalKeys.length ? '' : 'disabled'}>${evalOptions}</select>
        </div>
        <div class="sim-field">
          <label for="sim-note">${esc(tr('sim_label_note'))}</label>
          <input id="sim-note" type="text" inputmode="decimal" autocomplete="off" value="${esc(sim.noteRaw)}" ${rec && L.isSimulable(rec) ? '' : 'disabled'} aria-describedby="sim-note-hint sim-note-err" aria-invalid="false">
          <small id="sim-note-hint">${esc(tr('sim_hint_note'))}</small>
          <small id="sim-note-err" class="sim-err" role="alert"></small>
        </div>
        <div class="sim-field">
          <label for="sim-coef">${esc(tr('sim_label_coef'))}</label>
          <input id="sim-coef" type="text" inputmode="numeric" autocomplete="off" value="${esc(sim.coefRaw)}" ${rec && L.isSimulable(rec) ? '' : 'disabled'} aria-describedby="sim-coef-hint sim-coef-err" aria-invalid="false">
          <small id="sim-coef-hint">${esc(coefHint)}</small>
          <small id="sim-coef-err" class="sim-err" role="alert"></small>
        </div>
      </div>
      <div class="sim-current" aria-live="polite">${current}</div>
      <div class="sim-actions">
        <button type="button" id="sim-add" class="primary-button" disabled>${esc(tr('sim_add_btn'))}</button>
        <button type="button" id="sim-reset" class="ghost-button">${esc(tr('sim_reset_btn'))}</button>
      </div>
      <section class="sim-result" aria-labelledby="sim-result-title">
        <h3 id="sim-result-title">${esc(tr('sim_result_title'))}</h3>
        <div id="sim-results" aria-live="polite"></div>
      </section>
      <div id="sim-scenario-zone"></div>
      <section class="sim-goal" aria-labelledby="sim-goal-title">
        <h3 id="sim-goal-title">${esc(tr('sim_goal_title'))}</h3>
        <p class="sim-sub">${esc(tr('sim_goal_hint'))}</p>
        <div class="sim-grid">
          <fieldset class="sim-field sim-scope-group"><legend>${esc(tr('sim_goal_scope'))}</legend>${scopeRadios}</fieldset>
          <div class="sim-field">
            <label for="sim-goal-target">${esc(tr('sim_goal_target'))}</label>
            <input id="sim-goal-target" type="text" inputmode="decimal" autocomplete="off" value="${esc(sim.goalRaw)}" ${rec && L.isSimulable(rec) ? '' : 'disabled'}>
          </div>
        </div>
        <div id="sim-goal-result" aria-live="polite"></div>
      </section>`;

    updateSimResults();
    if (focusId) {
      const node = $(focusId);
      if (node) {
        node.focus();
        if (node.tagName === 'INPUT' && node.type === 'text') {
          const end = node.value.length;
          try { node.setSelectionRange(end, end); } catch { /* sans effet */ }
        }
      }
    }
  }

  function wireSimulator() {
    const root = $('sim-root');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';

    root.addEventListener('input', (event) => {
      const id = event.target.id;
      if (id === 'sim-note') sim.noteRaw = event.target.value;
      else if (id === 'sim-coef') sim.coefRaw = event.target.value;
      else if (id === 'sim-goal-target') sim.goalRaw = event.target.value;
      else return;
      updateSimResults();
    });

    root.addEventListener('change', (event) => {
      const target = event.target;
      if (target.id === 'sim-matiere') {
        sim.matiere = target.value;
        sim.key = '';
        renderSimulator('sim-matiere');
      } else if (target.id === 'sim-eval') {
        sim.key = target.value;
        renderSimulator('sim-eval');
      } else if (target.name === 'sim-sem') {
        sim.sem = target.value;
        renderSimulator();
        document.querySelector('input[name="sim-sem"]:checked')?.focus();
      } else if (target.name === 'sim-goal-scope') {
        sim.goalScope = target.value;
        updateSimResults();
      }
    });

    root.addEventListener('click', (event) => {
      const goto = event.target.closest('[data-sim-goto]');
      if (goto) {
        if (typeof window.activateScreen === 'function') window.activateScreen(goto.dataset.simGoto);
        return;
      }
      const remove = event.target.closest('[data-sim-remove]');
      if (remove) {
        sim.scenario.splice(Number(remove.dataset.simRemove), 1);
        renderSimulator('sim-note');
        return;
      }
      if (event.target.closest('#sim-add')) {
        const { data } = simContext();
        const draft = simDraft(data);
        if (draft.state !== 'ok') return;
        sim.scenario.push({ ...draft.change });
        sim.noteRaw = '';
        renderSimulator('sim-note');
        return;
      }
      if (event.target.closest('#sim-reset')) {
        sim.scenario = [];
        sim.noteRaw = '';
        sim.coefRaw = '';
        renderSimulator('sim-note');
      }
    });
  }

  /* ================= ANALYSE (GRAPHIQUES) ================= */

  const ana = { tab: 'periods', classe: null, sem: null };

  function periodRows() {
    const rows = [];
    CLASSES.forEach((classe) => {
      if (!SEMS.some((s) => hasNotes(classe, s))) return;
      SEMS.forEach((sem) => {
        const n = notes(classe, sem);
        const has = Object.keys(n).length > 0;
        rows.push({
          classe,
          sem,
          label: `${classe} ${semShort(sem)}`,
          value: has ? L.weightedAverage(n) : null,
          complete: has && isComplete(classe, sem),
          has
        });
      });
    });
    return rows;
  }

  function periodsChartSVG(rows, series) {
    const n = rows.length;
    const W = Math.max(320, n * 76 + 50);
    const H = 236;
    const pl = 34; const pr = 14; const pt = 28; const pb = 46;
    const pw = W - pl - pr;
    const ph = H - pt - pb;
    const x = (i) => pl + (pw / n) * (i + 0.5);
    const y = (v) => pt + ph - (Math.min(20, Math.max(0, v)) / 20) * ph;
    const g = goal();

    let svg = '';
    [0, 5, 10, 15, 20].forEach((m) => {
      svg += `<line class="ana-grid${m === 10 ? ' is-ref' : ''}" x1="${pl}" y1="${y(m)}" x2="${W - pr}" y2="${y(m)}"/>`;
      svg += `<text class="ana-axis" x="${pl - 6}" y="${y(m) + 4}" text-anchor="end">${m}</text>`;
    });
    if (g !== null) {
      svg += `<line class="ana-goal" x1="${pl}" y1="${y(g)}" x2="${W - pr}" y2="${y(g)}"/>`;
      svg += `<text class="ana-goal-label" x="${W - pr}" y="${y(g) - 4}" text-anchor="end">${esc(tr('ana_goal_short'))} ${fr(g)}</text>`;
    }
    series.segments.forEach(([a, b]) => {
      svg += `<line class="ana-seg" x1="${x(a)}" y1="${y(rows[a].value)}" x2="${x(b)}" y2="${y(rows[b].value)}"/>`;
    });
    rows.forEach((r, i) => {
      const cx = x(i);
      if (r.value !== null) {
        const state = r.complete ? tr('ana_state_complete') : tr('ana_state_partial');
        svg += `<g><title>${esc(`${r.label} : ${fr(r.value)}/20 (${state})`)}</title>`;
        svg += `<circle class="ana-pt ${r.complete ? 'is-complete' : 'is-partial'}" cx="${cx}" cy="${y(r.value)}" r="5.5"/>`;
        svg += `<text class="ana-val${r.complete ? '' : ' is-partial'}" x="${cx}" y="${y(r.value) - 10}" text-anchor="middle">${fr(r.value)}</text></g>`;
      } else {
        svg += `<text class="ana-none" x="${cx}" y="${y(0) - 8}" text-anchor="middle">—</text>`;
      }
      svg += `<text class="ana-x" x="${cx}" y="${H - 24}" text-anchor="middle"><tspan x="${cx}">${esc(r.classe)}</tspan><tspan x="${cx}" dy="13">${semShort(r.sem)}</tspan></text>`;
    });

    const summary = rows.map((r) => `${r.label} ${r.value === null ? tr('ana_state_none') : fr(r.value)}`).join(' ; ');
    return `<svg class="ana-svg" viewBox="0 0 ${W} ${H}" style="min-width:${W}px;max-width:${Math.max(W, 560)}px" role="img" aria-label="${esc(tr('ana_chart_periods_label', { summary }))}">${svg}</svg>`;
  }

  function trendText(series) {
    if (series.overallTrend === null) return tr('ana_need_two');
    const key = series.overallTrend === 'up' ? 'ana_trend_up' : series.overallTrend === 'down' ? 'ana_trend_down' : 'ana_trend_flat';
    let text = tr(key, { delta: fr(Math.abs(series.overallDelta)) });
    if (series.latestDelta !== null) text += ' ' + tr('ana_latest', { delta: signed(series.latestDelta) });
    return text;
  }

  function periodsPanelHTML() {
    const rows = periodRows();
    if (!rows.length) return `<p class="ana-empty">${esc(tr('ana_empty'))}</p>`;
    const series = L.buildPeriodSeries(rows.map((r) => ({ label: r.label, value: r.value, complete: r.complete })));
    const arrow = series.overallTrend === 'up' ? '▲' : series.overallTrend === 'down' ? '▼' : series.overallTrend === 'flat' ? '■' : '';
    const table = rows.map((r) => `<tr><th scope="row">${esc(r.classe)} · ${esc(semLabel(r.sem))}</th>
      <td>${r.value === null ? '—' : esc(fr(r.value))}</td>
      <td>${esc(r.value === null ? tr('ana_state_none') : r.complete ? tr('ana_state_complete') : tr('ana_state_partial'))}</td></tr>`).join('');
    return `<p class="ana-help">${esc(tr('ana_periods_help'))}</p>
      <div class="ana-scroll" tabindex="0" role="region" aria-label="${esc(tr('ana_tab_periods'))}">${periodsChartSVG(rows, series)}</div>
      <p class="ana-trend is-${series.overallTrend || 'none'}"><span aria-hidden="true">${arrow}</span> ${esc(trendText(series))}</p>
      <details class="ana-details"><summary>${esc(tr('ana_values'))}</summary>
        <div class="table-wrap"><table class="ana-table"><thead><tr><th>${esc(tr('ana_th_period'))}</th><th>${esc(tr('ana_th_avg'))}</th><th>${esc(tr('ana_th_state'))}</th></tr></thead><tbody>${table}</tbody></table></div>
      </details>`;
  }

  function classesWithData() {
    return CLASSES.filter((c) => SEMS.some((s) => hasNotes(c, s)));
  }

  function anaContext() {
    const list = classesWithData();
    if (!list.length) return { list, classe: '', sem: ana.sem || currentSem() };
    const preferred = classeCourante();
    if (!ana.classe || !list.includes(ana.classe)) ana.classe = list.includes(preferred) ? preferred : list[list.length - 1];
    const sems = SEMS.filter((s) => hasNotes(ana.classe, s));
    if (!ana.sem || !sems.includes(ana.sem)) ana.sem = sems.includes(currentSem()) ? currentSem() : sems[0];
    return { list, classe: ana.classe, sem: ana.sem };
  }

  function classSelectHTML(list, classe) {
    return `<div class="ana-pick"><label for="ana-class">${esc(tr('ana_pick_class'))}</label>
      <select id="ana-class">${list.map((c) => `<option value="${c}" ${c === classe ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`;
  }

  function subjectsPanelHTML() {
    const { list, classe, sem } = anaContext();
    if (!list.length) return `<p class="ana-empty">${esc(tr('ana_empty'))}</p>`;
    const data = notes(classe, sem);
    const entries = Object.entries(data).filter(([, r]) => r && Number.isFinite(Number(r.moyenne)))
      .sort(([, a], [, b]) => Number(b.moyenne) - Number(a.moyenne));
    const g = goal();
    const ref = g !== null ? g : 10;
    const semRadios = SEMS.filter((s) => hasNotes(classe, s)).map((s) => `<label class="sim-radio"><input type="radio" name="ana-sem" value="${s}" ${s === sem ? 'checked' : ''}> <span>${esc(semLabel(s))}</span></label>`).join('');

    const rows = entries.map(([m, r]) => {
      const v = Number(r.moyenne);
      const diff = v - ref;
      const cls = Math.abs(diff) < 0.005 ? 'is-equal' : diff > 0 ? 'is-above' : 'is-below';
      const glyph = cls === 'is-above' ? '▲' : cls === 'is-below' ? '▼' : '■';
      const word = cls === 'is-above' ? tr('ana_above') : cls === 'is-below' ? tr('ana_below') : tr('ana_equal');
      return `<li class="ana-bar-row">
        <span class="ana-bar-name">${esc(matiereName(m))}</span>
        <div class="ana-bar-track" role="img" aria-label="${esc(`${matiereName(m)} : ${fr(v)}/20`)}">
          <div class="ana-bar-fill ${cls}" style="width:${Math.min(100, (v / 20) * 100)}%"></div>
          <div class="ana-bar-ref" style="left:${(ref / 20) * 100}%"></div>
        </div>
        <b class="ana-bar-val">${fr(v)}</b>
        <span class="ana-bar-gap ${cls}"><span aria-hidden="true">${glyph}</span> ${esc(signedPt(diff))} · ${esc(word)}</span>
      </li>`;
    }).join('');

    return `<div class="ana-pickers">${classSelectHTML(list, classe)}<fieldset class="sim-sem-group"><legend>${esc(tr('ana_pick_sem'))}</legend>${semRadios}</fieldset></div>
      <p class="ana-help">${esc(g !== null ? tr('ana_goal_line', { obj: fr(g) }) : tr('ana_nogoal_line'))}</p>
      <ul class="ana-bars">${rows}</ul>`;
  }

  function semestersPanelHTML() {
    const list = classesWithData();
    if (!list.length) return `<p class="ana-empty">${esc(tr('ana_empty'))}</p>`;
    const { classe } = anaContext();
    const n1 = notes(classe, 'Semestre1');
    const n2 = notes(classe, 'Semestre2');
    const picker = `<div class="ana-pickers">${classSelectHTML(list, classe)}</div>`;
    if (!Object.keys(n1).length || !Object.keys(n2).length) {
      return `${picker}<p class="ana-empty">${esc(tr('ana_sem_need_both', { classe }))}</p>`;
    }
    const c = L.compareSemesters(n1, n2);
    const partial = !isComplete(classe, 'Semestre1') || !isComplete(classe, 'Semestre2');
    const maxAbs = Math.max(0.0001, ...c.rows.map((r) => Math.abs(r.contribution)));
    const rows = c.rows.map((r) => {
      const dir = r.contribution > 0.005 ? 'up' : r.contribution < -0.005 ? 'down' : 'flat';
      const glyph = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
      const pct = (Math.abs(r.contribution) / maxAbs) * 50;
      return `<li class="ana-div-row">
        <span class="ana-bar-name">${esc(matiereName(r.matiere))}</span>
        <div class="ana-div-track" role="img" aria-label="${esc(`${matiereName(r.matiere)} : ${signedPt(r.delta)}`)}">
          <div class="ana-div-zero"></div>
          <div class="ana-div-fill is-${dir}" style="${dir === 'down' ? `right:50%;width:${pct}%` : `left:50%;width:${pct}%`}"></div>
        </div>
        <span class="ana-bar-gap is-${dir === 'up' ? 'above' : dir === 'down' ? 'below' : 'equal'}"><span aria-hidden="true">${glyph}</span> ${esc(fr(r.m1))} → ${esc(fr(r.m2))} (${esc(signedPt(r.delta))}) · ${esc(tr('ana_sem_contrib', { c: signed(r.contribution) }))}</span>
      </li>`;
    }).join('');
    const only = c.onlyS1.concat(c.onlyS2).map(matiereName);
    const dirAll = c.delta === null ? 'flat' : c.delta >= 0.25 ? 'up' : c.delta <= -0.25 ? 'down' : 'flat';
    return `${picker}
      <div class="ana-sem-stats">
        <div class="ana-sem-stat"><small>${esc(tr('ana_sem_avg', { semestre: semLabel('Semestre1') }))}</small><b>${esc(fr(c.avg1))}</b></div>
        <div class="ana-sem-stat"><small>${esc(tr('ana_sem_avg', { semestre: semLabel('Semestre2') }))}</small><b>${esc(fr(c.avg2))}</b></div>
      </div>
      <p class="ana-trend is-${dirAll}"><span aria-hidden="true">${dirAll === 'up' ? '▲' : dirAll === 'down' ? '▼' : '■'}</span> ${esc(tr('ana_sem_delta', { delta: signed(c.delta) }))}</p>
      ${partial ? `<p class="sim-provisional">${esc(tr('ana_sem_partial'))}</p>` : ''}
      ${c.rows.length
        ? `<h4 class="ana-subtitle">${esc(tr('ana_sem_explain'))}</h4><p class="ana-help">${esc(tr('ana_sem_note', { n: c.rows.length }))}</p><ul class="ana-bars">${rows}</ul>`
        : `<p class="ana-empty">${esc(tr('ana_sem_none_common'))}</p>`}
      ${only.length ? `<p class="ana-help">${esc(tr('ana_sem_only', { list: only.join(', ') }))}</p>` : ''}`;
  }

  function renderAnalysis() {
    const root = $('analyse-root');
    if (!root) return;
    const tabs = [['periods', 'ana_tab_periods'], ['subjects', 'ana_tab_subjects'], ['semesters', 'ana_tab_semesters']];
    const body = ana.tab === 'subjects' ? subjectsPanelHTML() : ana.tab === 'semesters' ? semestersPanelHTML() : periodsPanelHTML();
    root.innerHTML = `<header class="ana-head"><h3>${esc(tr('ana_title'))}</h3><p>${esc(tr('ana_subtitle'))}</p></header>
      <div class="ana-tabs" role="tablist" aria-label="${esc(tr('ana_tablist'))}">
        ${tabs.map(([id, key]) => `<button type="button" role="tab" id="ana-tab-${id}" class="ana-tab ${ana.tab === id ? 'is-active' : ''}" data-ana-tab="${id}" aria-selected="${ana.tab === id}" aria-controls="ana-panel" tabindex="${ana.tab === id ? 0 : -1}">${esc(tr(key))}</button>`).join('')}
      </div>
      <div id="ana-panel" class="ana-panel" role="tabpanel" aria-labelledby="ana-tab-${ana.tab}">${body}</div>`;
  }

  function wireAnalysis() {
    const root = $('analyse-root');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';

    root.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-ana-tab]');
      if (!tab) return;
      ana.tab = tab.dataset.anaTab;
      renderAnalysis();
      $(`ana-tab-${ana.tab}`)?.focus();
    });

    root.addEventListener('keydown', (event) => {
      const tab = event.target.closest('[data-ana-tab]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const ids = ['periods', 'subjects', 'semesters'];
      let i = ids.indexOf(ana.tab);
      if (event.key === 'ArrowRight') i = (i + 1) % ids.length;
      else if (event.key === 'ArrowLeft') i = (i + ids.length - 1) % ids.length;
      else if (event.key === 'Home') i = 0;
      else i = ids.length - 1;
      event.preventDefault();
      ana.tab = ids[i];
      renderAnalysis();
      $(`ana-tab-${ana.tab}`)?.focus();
    });

    root.addEventListener('change', (event) => {
      if (event.target.id === 'ana-class') {
        ana.classe = event.target.value;
        ana.sem = null;
        renderAnalysis();
        $('ana-class')?.focus();
      } else if (event.target.name === 'ana-sem') {
        ana.sem = event.target.value;
        renderAnalysis();
        document.querySelector('input[name="ana-sem"]:checked')?.focus();
      }
    });
  }

  /* ================= NOTIFICATIONS ================= */

  const ICONS = {
    objectif: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    progres: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="14 6 21 6 21 13"/></svg>',
    baisse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 7 9 13 13 9 21 18"/><polyline points="14 18 21 18 21 11"/></svg>',
    bulletin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>',
    donnees: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>'
  };

  function loadStore() {
    return L.sanitizeStore(readJSON(NOTIF_KEY));
  }

  function saveStore(store) {
    return writeJSON(NOTIF_KEY, store);
  }

  function notificationText(item) {
    const p = item.params || {};
    const vars = { ...p };
    if (p.matiere) vars.matiere = matiereName(p.matiere);
    if (p.sem) vars.sem = semLabel(p.sem);
    ['de', 'a', 'moyenne', 'objectif'].forEach((k) => {
      if (typeof p[k] === 'number') vars[k] = fr(p[k]);
    });
    return tr(item.key, vars);
  }

  function updateBell() {
    const bell = $('notif-bell-btn');
    const badge = $('notif-badge');
    if (!bell || !badge) return;
    const unread = loadStore().items.filter((n) => !n.read).length;
    badge.hidden = unread === 0;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    bell.setAttribute('aria-label', unread ? tr('notif_bell_unread', { n: unread }) : tr('notif_bell_label'));
  }

  function panelOpen() {
    const panel = $('notif-panel');
    return Boolean(panel && !panel.hidden);
  }

  function renderPanel() {
    const panel = $('notif-panel');
    if (!panel) return;
    const store = loadStore();
    const items = store.items;
    const unread = items.filter((n) => !n.read).length;

    const list = items.length
      ? `<ul class="notif-list">${items.map((n) => {
        const target = n.target === 'bulletin' ? 'notif_open_bulletin' : n.target === 'evolution' ? 'notif_open_evolution' : null;
        return `<li class="notif-item notif-${n.type}${n.read ? '' : ' is-unread'}" data-id="${esc(n.id)}">
          <div class="notif-item-head">
            <span class="notif-type">${ICONS[n.type] || ''}<span>${esc(tr('notif_type_' + n.type))}</span></span>
            ${n.read ? '' : `<span class="notif-unread-flag">${esc(tr('notif_unread'))}</span>`}
          </div>
          <p class="notif-text">${esc(notificationText(n))}</p>
          <time class="notif-date" datetime="${new Date(n.createdAt).toISOString()}">${esc(formatDate(n.createdAt))}</time>
          <div class="notif-actions">
            ${target ? `<button type="button" class="notif-link" data-notif-action="open">${esc(tr(target))}</button>` : ''}
            ${n.read ? '' : `<button type="button" class="notif-link" data-notif-action="read">${esc(tr('notif_mark_read'))}</button>`}
            <button type="button" class="notif-link is-danger" data-notif-action="delete">${esc(tr('notif_delete'))}</button>
          </div>
        </li>`;
      }).join('')}</ul>`
      : `<div class="notif-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <strong>${esc(tr('notif_empty_title'))}</strong>
          <p>${esc(tr('notif_empty_text'))}</p>
        </div>`;

    panel.innerHTML = `<div class="notif-panel-head">
        <h2 id="notif-panel-title" tabindex="-1">${esc(tr('notif_title'))}</h2>
        <button type="button" class="notif-close" data-notif-action="close" aria-label="${esc(tr('notif_close'))}">✕</button>
      </div>
      ${items.length ? `<div class="notif-toolbar"><button type="button" class="notif-link" data-notif-action="read-all" ${unread ? '' : 'disabled'}>${esc(tr('notif_mark_all'))}</button></div>` : ''}
      ${list}`;
  }

  function openPanel() {
    const panel = $('notif-panel');
    const bell = $('notif-bell-btn');
    if (!panel || !bell) return;
    renderPanel();
    panel.hidden = false;
    bell.setAttribute('aria-expanded', 'true');
    $('notif-panel-title')?.focus();
  }

  function closePanel(returnFocus = true) {
    const panel = $('notif-panel');
    const bell = $('notif-bell-btn');
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    bell?.setAttribute('aria-expanded', 'false');
    if (returnFocus) bell?.focus();
  }

  function wireNotifications() {
    const bell = $('notif-bell-btn');
    const panel = $('notif-panel');
    if (!bell || !panel || bell.dataset.wired) return;
    bell.dataset.wired = '1';

    bell.addEventListener('click', () => (panelOpen() ? closePanel() : openPanel()));

    panel.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-notif-action]');
      if (!btn) return;
      const action = btn.dataset.notifAction;
      const li = btn.closest('.notif-item');
      const id = li ? li.dataset.id : null;
      const store = loadStore();

      if (action === 'close') { closePanel(); return; }
      if (action === 'read-all') {
        store.items.forEach((n) => { n.read = true; });
        saveStore(store);
      } else if (action === 'read' && id) {
        const item = store.items.find((n) => n.id === id);
        if (item) item.read = true;
        saveStore(store);
      } else if (action === 'delete' && id) {
        store.items = store.items.filter((n) => n.id !== id);
        saveStore(store);
      } else if (action === 'open' && id) {
        const item = store.items.find((n) => n.id === id);
        if (item) {
          item.read = true;
          saveStore(store);
          updateBell();
          closePanel(false);
          if (item.target && typeof window.activateScreen === 'function') window.activateScreen(item.target);
        }
        return;
      }
      updateBell();
      renderPanel();
      $('notif-panel-title')?.focus();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panelOpen()) closePanel();
    });

    document.addEventListener('click', (event) => {
      if (!panelOpen()) return;
      /* composedPath() : le bouton cliqué peut déjà avoir été retiré du DOM
         par le rendu du panneau, ce qui ferait échouer closest(). */
      const path = event.composedPath ? event.composedPath() : [];
      if (path.includes($('notif-panel')) || path.includes($('notif-bell-btn'))) return;
      closePanel(false);
    });
  }

  /* Point d'entrée appelé par script.js / migration.js après chaque
     changement de données : compare l'état actuel au dernier instantané et
     crée uniquement les notifications correspondant à de vrais événements. */
  function notifyDataChanged(opts) {
    try {
      const options = opts || {};
      const now = Date.now();
      const next = L.buildSnapshot(collectPeriods());
      const g = goal();
      const stored = readJSON(SNAP_KEY);
      const prev = stored && stored.periods && typeof stored.periods === 'object' ? stored.periods : null;

      let events = [];
      if (options.imported > 0) {
        events = [{ id: `import:${now}`, type: 'donnees', key: 'notif_data_import', target: 'evolution', params: { n: options.imported } }];
      } else if (prev) {
        events = L.diffSnapshots(prev, next, g, stored.objectif === undefined ? g : stored.objectif);
      }

      if ((prev && JSON.stringify(prev) !== JSON.stringify(next)) || options.imported > 0) {
        try { localStorage.setItem(UPDATED_KEY, String(now)); } catch { /* quota */ }
      }
      writeJSON(SNAP_KEY, { v: 1, periods: next, objectif: g });

      const store = loadStore();
      const merged = events.length ? L.mergeEvents(store, events, now).store : { items: L.pruneNotifications(store.items, now), seen: store.seen };
      if (events.length || merged.items.length !== store.items.length) saveStore(merged);

      updateBell();
      if (panelOpen()) renderPanel();
      if (screenActive('simulateur')) renderSimulator();
      if (screenActive('evolution')) renderAnalysis();
    } catch (error) {
      console.error('Notifications : mise à jour impossible', error);
    }
  }

  /* Réinitialisation complète du site : efface aussi ces données locales. */
  window.resetStudentToolsData = function () {
    [NOTIF_KEY, SNAP_KEY, UPDATED_KEY].forEach((key) => {
      try { localStorage.removeItem(key); } catch { /* sans effet */ }
    });
    sim.scenario = [];
    sim.noteRaw = '';
    sim.coefRaw = '';
    updateBell();
    if (panelOpen()) renderPanel();
  };

  /* ================= Exposition et initialisation ================= */

  function refreshAll() {
    updateBell();
    if (panelOpen()) renderPanel();
    if (screenActive('simulateur')) renderSimulator();
    renderAnalysis();
  }

  window.StudentTools = {
    notes,
    hasNotes,
    isComplete,
    expectedCount,
    previousPeriod,
    classeCourante,
    currentSem,
    lastUpdate,
    formatDate,
    fr,
    signed,
    signedPt,
    notifyDataChanged,
    refreshAll
  };
  window.notifyDataChanged = notifyDataChanged;
  window.refreshSimulatorScreen = () => renderSimulator();
  window.refreshAnalysisCard = () => renderAnalysis();

  /* La langue change via refreshDashboardTexts() (script.js) : on s'y greffe. */
  const previousRefresh = window.refreshDashboardTexts;
  window.refreshDashboardTexts = function () {
    if (typeof previousRefresh === 'function') previousRefresh();
    refreshAll();
  };

  document.addEventListener('DOMContentLoaded', () => {
    wireSimulator();
    wireAnalysis();
    wireNotifications();
    renderAnalysis();
    notifyDataChanged();
    if (screenActive('simulateur')) renderSimulator();
  });

  /* Données modifiées depuis un autre onglet du navigateur. */
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.startsWith('lynaqe_moyennes_') || event.key === 'sunu_moyenne_objectif_personnel') {
      notifyDataChanged();
    }
  });
})();
