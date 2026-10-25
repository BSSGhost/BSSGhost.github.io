/*
   LOGIQUE ÉLÈVE — SUNU MOYENNE
   Fonctions pures (aucun accès au DOM ni au localStorage) utilisées par
   student-tools.js : simulateur de notes, analyse par matière,
   recommandations, séries de graphiques et génération de notifications.

   Les formules reprennent exactement celles de script.js :
   - moyenne d'une matière = (devoir1 + devoir2) / 2, puis moyenne avec la
     composition si la matière en comporte une (calculerMoyenneDeMatiere) ;
   - moyenne du semestre = somme des points / somme des coefficients
     (computeMoyenneBrute / computeMoyennePonderee) ;
   - notes saisies par quarts de point uniquement (isValidDecimalNote).
   Aucun arrondi n'est appliqué aux calculs : seul l'affichage arrondit.
*/
(function (root, factory) {
  const api = factory();
  if (root) root.StudentLogic = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const EPS = 1e-9;
  /* Écart minimal (en points sur 20) pour parler de hausse ou de baisse. */
  const TREND_THRESHOLD = 0.5;
  const PERIOD_TREND_THRESHOLD = 0.25;
  /* Seuils des notifications d'évolution. */
  const SUBJECT_JUMP = 2;
  const SEMESTER_JUMP = 1.5;

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

  /* ---------- Notes ---------- */

  /* Lit une note saisie ("15", "15,25", "15.5") : renvoie un nombre ou null.
     Comme dans l'application, seuls les quarts de point entre 0 et 20 sont
     acceptés ; "15,5" est lu comme 15,50. */
  function parseNote(raw) {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().replace(',', '.');
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null;
    const n = Number(s);
    if (!(n >= 0 && n <= 20)) return null;
    if (Math.abs(n * 4 - Math.round(n * 4)) > EPS) return null;
    return n;
  }

  function parseCoefficient(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const n = Number(String(raw).trim());
    return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
  }

  /* ---------- Matière ---------- */

  function hasComposition(rec) {
    if (typeof rec.hasComposition === 'boolean') return rec.hasComposition;
    return isNum(rec.composition);
  }

  /* Une matière est simulable si ses notes d'origine sont connues. */
  function isSimulable(rec) {
    if (!rec || typeof rec !== 'object') return false;
    if (!isNum(rec.devoir1) || !isNum(rec.devoir2)) return false;
    if (hasComposition(rec) && !isNum(rec.composition)) return false;
    return isNum(Number(rec.coefficient)) && Number(rec.coefficient) > 0;
  }

  function evaluationKeys(rec) {
    if (!isSimulable(rec)) return [];
    return hasComposition(rec) ? ['devoir1', 'devoir2', 'composition'] : ['devoir1', 'devoir2'];
  }

  /* Même formule que calculerMoyenneDeMatiere (script.js). */
  function subjectAverage(rec) {
    const moyenneDevoirs = (rec.devoir1 + rec.devoir2) / 2;
    return hasComposition(rec) ? (moyenneDevoirs + rec.composition) / 2 : moyenneDevoirs;
  }

  function recordPoints(rec) {
    return Number(rec.points ?? Number(rec.moyenne) * Number(rec.coefficient));
  }

  /* Même formule que computeMoyenneBrute (script.js). */
  function weightedAverage(notes) {
    const entries = Object.values(notes || {}).filter((r) => r && typeof r === 'object');
    if (!entries.length) return null;
    const totalCoeff = entries.reduce((acc, r) => acc + Number(r.coefficient || 0), 0);
    const totalPoints = entries.reduce((acc, r) => acc + recordPoints(r), 0);
    return totalCoeff > 0 ? totalPoints / totalCoeff : null;
  }

  /* ---------- Simulation ---------- */

  /* change = { matiere, key: 'devoir1'|'devoir2'|'composition', value, coefficient? } */
  function validateChange(notes, change) {
    if (!change || !notes || !notes[change.matiere]) return { ok: false, reason: 'matiere_inconnue' };
    const rec = notes[change.matiere];
    if (!isSimulable(rec)) return { ok: false, reason: 'donnees_incompletes' };
    if (!evaluationKeys(rec).includes(change.key)) return { ok: false, reason: 'evaluation_indisponible' };
    if (!isNum(change.value) || parseNote(change.value) === null) return { ok: false, reason: 'note_invalide' };
    if (change.coefficient !== undefined && change.coefficient !== null && parseCoefficient(change.coefficient) === null) {
      return { ok: false, reason: 'coefficient_invalide' };
    }
    return { ok: true };
  }

  /* Renvoie une COPIE des notes avec les hypothèses appliquées, dans l'ordre.
     Les notes d'origine ne sont jamais modifiées. */
  function applyScenario(notes, changes) {
    const out = {};
    Object.keys(notes || {}).forEach((m) => {
      out[m] = notes[m] && typeof notes[m] === 'object' ? { ...notes[m] } : notes[m];
    });
    const touched = new Set();
    (changes || []).forEach((change) => {
      if (!validateChange(out, change).ok) return;
      const rec = out[change.matiere];
      rec[change.key] = change.value;
      const coef = change.coefficient === undefined || change.coefficient === null
        ? null
        : parseCoefficient(change.coefficient);
      if (coef !== null) rec.coefficient = coef;
      touched.add(change.matiere);
    });
    touched.forEach((m) => {
      const rec = out[m];
      rec.moyenne = subjectAverage(rec);
      rec.points = rec.moyenne * Number(rec.coefficient);
    });
    return out;
  }

  function simulate(notes, changes) {
    const valid = (changes || []).filter((c) => validateChange(notes, c).ok);
    const simulated = applyScenario(notes, valid);
    const names = Array.from(new Set(valid.map((c) => c.matiere)));
    const subjects = names.map((matiere) => {
      const before = Number(notes[matiere].moyenne);
      const after = Number(simulated[matiere].moyenne);
      return {
        matiere,
        before,
        after,
        delta: after - before,
        coefficientBefore: Number(notes[matiere].coefficient),
        coefficientAfter: Number(simulated[matiere].coefficient)
      };
    });
    const semesterBefore = weightedAverage(notes);
    const semesterAfter = weightedAverage(simulated);
    return {
      subjects,
      semesterBefore,
      semesterAfter,
      semesterDelta: semesterBefore !== null && semesterAfter !== null ? semesterAfter - semesterBefore : null,
      ignored: (changes || []).length - valid.length
    };
  }

  /* Note à obtenir à l'évaluation `key` de `matiere` pour atteindre `target`,
     pour la moyenne de la matière (scope 'matiere') ou la moyenne générale
     des matières saisies (scope 'semestre'). La moyenne est linéaire en la
     note : on résout donc l'équation exactement, puis on arrondit au quart
     de point supérieur (seules valeurs acceptables dans l'application). */
  function requiredNote(notes, { matiere, key, target, scope }) {
    const rec = notes && notes[matiere];
    if (!rec || !isSimulable(rec) || !evaluationKeys(rec).includes(key) || !isNum(target)) {
      return { status: 'impossible', reason: 'donnees_incompletes' };
    }
    const coef = Number(rec.coefficient);
    const at0 = subjectAverage({ ...rec, [key]: 0 });
    const slope = subjectAverage({ ...rec, [key]: 1 }) - at0;
    if (!(slope > 0) || !(coef > 0)) return { status: 'impossible', reason: 'donnees_incompletes' };

    let neededAverage = target;
    let maxSemester = null;
    if (scope === 'semestre') {
      const totalCoeff = Object.values(notes).reduce((acc, r) => acc + Number(r.coefficient || 0), 0);
      const others = Object.entries(notes)
        .filter(([name]) => name !== matiere)
        .reduce((acc, [, r]) => acc + recordPoints(r), 0);
      neededAverage = (target * totalCoeff - others) / coef;
      maxSemester = (others + coef * (at0 + slope * 20)) / totalCoeff;
    }
    const exact = (neededAverage - at0) / slope;
    const maxAchievable = scope === 'semestre' ? maxSemester : at0 + slope * 20;

    if (exact <= EPS) return { status: 'already', exact, maxAchievable };
    if (exact > 20 + EPS) return { status: 'impossible', reason: 'inatteignable', exact, maxAchievable };
    const minNote = Math.min(20, Math.ceil(exact * 4 - EPS) / 4);
    return { status: 'reachable', exact, minNote, maxAchievable };
  }

  /* ---------- Analyse par matière ---------- */

  function trendOf(delta) {
    if (delta === null || delta === undefined) return null;
    if (delta >= TREND_THRESHOLD) return 'up';
    if (delta <= -TREND_THRESHOLD) return 'down';
    return 'flat';
  }

  /* current / previous : tables de notes { matière: enregistrement }.
     objectif : moyenne générale visée (ou null). */
  function analyseSubjects(current, previous, objectif) {
    const entries = Object.entries(current || {}).filter(
      ([, r]) => r && isNum(Number(r.moyenne)) && r.moyenne !== null && r.moyenne !== ''
    );
    const general = weightedAverage(Object.fromEntries(entries));
    const ref = isNum(objectif) ? objectif : 10;

    const subjects = entries.map(([matiere, r]) => {
      const moyenne = Number(r.moyenne);
      const prevRec = previous && previous[matiere];
      const prev = prevRec && prevRec.moyenne !== null && isNum(Number(prevRec.moyenne)) ? Number(prevRec.moyenne) : null;
      const delta = prev === null ? null : moyenne - prev;
      return {
        matiere,
        moyenne,
        coefficient: Number(r.coefficient),
        prev,
        delta,
        trend: trendOf(delta),
        gap: ref - moyenne
      };
    });

    const canRank = subjects.length >= 2;
    const byMoyenne = subjects.slice().sort((a, b) => b.moyenne - a.moyenne);
    const best = canRank ? byMoyenne[0] : null;
    const worst = canRank && byMoyenne[byMoyenne.length - 1].moyenne < byMoyenne[0].moyenne
      ? byMoyenne[byMoyenne.length - 1]
      : null;

    const strong = canRank
      ? byMoyenne.filter((s) => s.moyenne >= Math.max(ref, general ?? 0) && s.moyenne >= 10).slice(0, 3)
      : [];
    const weak = subjects
      .filter((s) => s.moyenne < ref)
      .sort((a, b) => b.gap * b.coefficient - a.gap * a.coefficient)
      .slice(0, 3);

    return {
      general,
      ref,
      hasObjectif: isNum(objectif),
      subjects,
      canRank,
      best,
      worst,
      strong,
      weak,
      improving: subjects.filter((s) => s.trend === 'up').sort((a, b) => b.delta - a.delta),
      declining: subjects.filter((s) => s.trend === 'down').sort((a, b) => a.delta - b.delta)
    };
  }

  /* Matière dont une hausse atteindrait l'objectif général avec le moins
     d'efforts (plus petite hausse de sa propre moyenne). */
  function goalLever(notes, objectif) {
    if (!isNum(objectif)) return null;
    const entries = Object.entries(notes || {}).filter(([, r]) => r && isNum(Number(r.moyenne)));
    const general = weightedAverage(Object.fromEntries(entries));
    if (general === null || general >= objectif) return null;
    const totalCoeff = entries.reduce((acc, [, r]) => acc + Number(r.coefficient || 0), 0);
    const missingPoints = (objectif - general) * totalCoeff;

    const options = entries
      .map(([matiere, r]) => {
        const coef = Number(r.coefficient);
        const current = Number(r.moyenne);
        const needed = current + missingPoints / coef;
        return { matiere, current, needed, increase: needed - current, coefficient: coef };
      })
      .filter((o) => o.needed <= 20 + EPS)
      .sort((a, b) => a.increase - b.increase);

    return {
      general,
      missing: objectif - general,
      lever: options.length ? options[0] : null
    };
  }

  /* Recommandations par règles déterministes (aucune IA). Chaque entrée :
     { type, key (clé i18n), params }. Maximum 4. */
  function buildRecommendations(analysis, notes, objectif) {
    const recs = [];
    if (!analysis.subjects.length) return recs;

    analysis.weak.slice(0, 2).forEach((s) => {
      recs.push({
        type: 'work',
        key: analysis.hasObjectif ? 'rec_work_goal' : 'rec_work_basic',
        params: { matiere: s.matiere, moyenne: s.moyenne, ecart: s.gap }
      });
    });

    analysis.declining.slice(0, 1).forEach((s) => {
      recs.push({
        type: 'revise',
        key: 'rec_revise',
        params: { matiere: s.matiere, baisse: Math.abs(s.delta) }
      });
    });

    analysis.improving.slice(0, 1).forEach((s) => {
      recs.push({
        type: 'encourage',
        key: 'rec_encourage',
        params: { matiere: s.matiere, hausse: s.delta }
      });
    });

    const lever = goalLever(notes, objectif);
    if (lever) {
      if (lever.lever) {
        recs.push({
          type: 'goal',
          key: 'rec_goal_lever',
          params: {
            matiere: lever.lever.matiere,
            de: lever.lever.current,
            a: lever.lever.needed,
            manque: lever.missing
          }
        });
      } else {
        recs.push({ type: 'goal', key: 'rec_goal_spread', params: { manque: lever.missing } });
      }
    } else if (analysis.hasObjectif && analysis.general !== null && analysis.general >= objectif) {
      recs.push({ type: 'encourage', key: 'rec_goal_reached', params: { objectif } });
    }

    return recs.slice(0, 4);
  }

  /* ---------- Séries pour les graphiques ---------- */

  /* periods : [{ label, value (moyenne ou null), complete }] dans l'ordre
     chronologique. Renvoie les points, les segments à tracer (uniquement
     entre périodes CONSÉCUTIVES complètes) et la tendance. */
  function buildPeriodSeries(periods) {
    const points = periods.map((p, i) => ({ ...p, index: i }));
    const segments = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (a.complete && b.complete && isNum(a.value) && isNum(b.value)) segments.push([i, i + 1]);
    }
    const known = points.filter((p) => p.complete && isNum(p.value));
    let overall = null;
    let latest = null;
    if (known.length >= 2) {
      latest = known[known.length - 1].value - known[known.length - 2].value;
      overall = known[known.length - 1].value - known[0].value;
    }
    const trend = (d) => (d === null ? null : d >= PERIOD_TREND_THRESHOLD ? 'up' : d <= -PERIOD_TREND_THRESHOLD ? 'down' : 'flat');
    return { points, segments, knownCount: known.length, latestDelta: latest, overallDelta: overall, latestTrend: trend(latest), overallTrend: trend(overall) };
  }

  /* Comparaison de deux semestres : variation globale et contribution de
     chaque matière COMMUNE aux deux semestres (coefficient du semestre 2) à la
     variation de la moyenne des matières communes. */
  function compareSemesters(notes1, notes2) {
    const e1 = Object.entries(notes1 || {}).filter(([, r]) => r && isNum(Number(r.moyenne)));
    const e2 = Object.entries(notes2 || {}).filter(([, r]) => r && isNum(Number(r.moyenne)));
    const avg1 = weightedAverage(Object.fromEntries(e1));
    const avg2 = weightedAverage(Object.fromEntries(e2));

    const common = e2.filter(([m]) => e1.some(([n]) => n === m));
    const totalCoeff = common.reduce((acc, [, r]) => acc + Number(r.coefficient), 0);
    const rows = common.map(([matiere, r2]) => {
      const m1 = Number(notes1[matiere].moyenne);
      const m2 = Number(r2.moyenne);
      const delta = m2 - m1;
      return {
        matiere,
        m1,
        m2,
        delta,
        coefficient: Number(r2.coefficient),
        contribution: totalCoeff > 0 ? (Number(r2.coefficient) * delta) / totalCoeff : 0
      };
    }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      avg1,
      avg2,
      delta: avg1 !== null && avg2 !== null ? avg2 - avg1 : null,
      commonDelta: rows.reduce((acc, r) => acc + r.contribution, 0),
      rows,
      onlyS1: e1.filter(([m]) => !e2.some(([n]) => n === m)).map(([m]) => m),
      onlyS2: e2.filter(([m]) => !e1.some(([n]) => n === m)).map(([m]) => m)
    };
  }

  /* ---------- Notifications ---------- */

  const NOTIFICATION_TYPES = ['objectif', 'progres', 'baisse', 'bulletin', 'donnees'];
  const MAX_NOTIFICATIONS = 50;
  const MAX_AGE_DAYS = 90;
  const MAX_SEEN = 300;

  /* periods : { 'classe|Semestre1': { notes, complete } } -> instantané compact. */
  function buildSnapshot(periods) {
    const snap = {};
    Object.entries(periods || {}).forEach(([key, p]) => {
      const subjects = {};
      Object.entries(p.notes || {}).forEach(([m, r]) => {
        if (r && isNum(Number(r.moyenne))) subjects[m] = Number(r.moyenne);
      });
      if (!Object.keys(subjects).length) return;
      snap[key] = {
        subjects,
        avg: weightedAverage(p.notes),
        count: Object.keys(subjects).length,
        complete: Boolean(p.complete)
      };
    });
    return snap;
  }

  function sameSubjectSet(a, b) {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
  }

  /* Compare deux instantanés et renvoie les événements réels survenus.
     Sans instantané précédent (première exécution), on ne génère rien :
     l'état initial sert seulement de référence. */
  function diffSnapshots(prev, next, objectif, prevObjectif) {
    if (!prev || typeof prev !== 'object') return [];
    const events = [];
    const goal = isNum(objectif) ? objectif : null;
    /* Objectif en vigueur lors de l'instantané précédent : s'il change,
       « atteint » se juge par rapport à l'ancien objectif. */
    const oldGoal = prevObjectif === undefined ? goal : (isNum(prevObjectif) ? prevObjectif : null);

    Object.entries(next).forEach(([key, cur]) => {
      const [classe, sem] = key.split('|');
      const before = prev[key];
      const base = { target: 'evolution', period: { classe, sem } };

      if (before) {
        Object.entries(cur.subjects).forEach(([matiere, moy]) => {
          const old = before.subjects[matiere];
          if (!isNum(old)) return;
          const d = moy - old;
          if (d >= SUBJECT_JUMP) {
            events.push({ ...base, id: `progres:${key}:${matiere}:${moy.toFixed(2)}`, type: 'progres', key: 'notif_subject_up', params: { matiere, classe, sem, de: old, a: moy } });
          } else if (d <= -SUBJECT_JUMP) {
            events.push({ ...base, id: `baisse:${key}:${matiere}:${moy.toFixed(2)}`, type: 'baisse', key: 'notif_subject_down', params: { matiere, classe, sem, de: old, a: moy } });
          }
        });

        if (cur.complete && before.complete && isNum(cur.avg) && isNum(before.avg) && sameSubjectSet(cur.subjects, before.subjects)) {
          const d = cur.avg - before.avg;
          if (d >= SEMESTER_JUMP) {
            events.push({ ...base, id: `progres-sem:${key}:${cur.avg.toFixed(2)}`, type: 'progres', key: 'notif_sem_up', params: { classe, sem, de: before.avg, a: cur.avg } });
          } else if (d <= -SEMESTER_JUMP) {
            events.push({ ...base, id: `baisse-sem:${key}:${cur.avg.toFixed(2)}`, type: 'baisse', key: 'notif_sem_down', params: { classe, sem, de: before.avg, a: cur.avg } });
          }
        }
      }

      if (cur.complete && !(before && before.complete)) {
        events.push({ id: `bulletin:${key}`, type: 'bulletin', key: 'notif_bulletin_ready', target: 'bulletin', period: { classe, sem }, params: { classe, sem } });
      }

      if (goal !== null && cur.complete && isNum(cur.avg) && cur.avg >= goal) {
        const wasReached = before && before.complete && isNum(before.avg) && oldGoal !== null && before.avg >= oldGoal;
        if (!wasReached) {
          events.push({ ...base, id: `objectif:${key}:${goal}`, type: 'objectif', key: 'notif_goal_reached', params: { classe, sem, moyenne: cur.avg, objectif: goal } });
        }
      }
    });
    return events;
  }

  function sanitizeStore(raw) {
    const empty = { items: [], seen: [] };
    if (!raw || typeof raw !== 'object') return empty;
    const items = Array.isArray(raw.items) ? raw.items : [];
    const clean = items
      .filter((n) => n && typeof n === 'object' && typeof n.id === 'string' && typeof n.key === 'string' && isNum(n.createdAt) && NOTIFICATION_TYPES.includes(n.type))
      .map((n) => ({
        id: n.id,
        type: n.type,
        key: n.key,
        params: n.params && typeof n.params === 'object' ? n.params : {},
        target: typeof n.target === 'string' ? n.target : null,
        createdAt: n.createdAt,
        read: Boolean(n.read)
      }));
    const seen = Array.isArray(raw.seen) ? raw.seen.filter((s) => typeof s === 'string') : [];
    return { items: clean, seen };
  }

  /* Nettoyage : suppression des notifications trop anciennes puis plafond. */
  function pruneNotifications(items, now) {
    const maxAge = MAX_AGE_DAYS * 86400000;
    let kept = items.filter((n) => now - n.createdAt <= maxAge);
    if (kept.length > MAX_NOTIFICATIONS) {
      const sorted = kept.slice().sort((a, b) => b.createdAt - a.createdAt);
      const unread = sorted.filter((n) => !n.read);
      const read = sorted.filter((n) => n.read);
      kept = unread.concat(read).slice(0, MAX_NOTIFICATIONS);
    }
    return kept.sort((a, b) => b.createdAt - a.createdAt);
  }

  /* Ajoute les événements nouveaux (jamais vus) au magasin. Un identifiant
     déjà présent ou déjà vu (même supprimé) n'est pas recréé. */
  function mergeEvents(store, events, now) {
    const seen = new Set(store.seen);
    const items = store.items.slice();
    const added = [];
    events.forEach((ev) => {
      if (seen.has(ev.id)) return;
      seen.add(ev.id);
      const item = { id: ev.id, type: ev.type, key: ev.key, params: ev.params || {}, target: ev.target || null, createdAt: now, read: false };
      items.push(item);
      added.push(item);
    });
    return {
      store: { items: pruneNotifications(items, now), seen: Array.from(seen).slice(-MAX_SEEN) },
      added
    };
  }

  return {
    EPS,
    TREND_THRESHOLD,
    parseNote,
    parseCoefficient,
    hasComposition,
    isSimulable,
    evaluationKeys,
    subjectAverage,
    weightedAverage,
    validateChange,
    applyScenario,
    simulate,
    requiredNote,
    trendOf,
    analyseSubjects,
    goalLever,
    buildRecommendations,
    buildPeriodSeries,
    compareSemesters,
    NOTIFICATION_TYPES,
    MAX_NOTIFICATIONS,
    MAX_AGE_DAYS,
    buildSnapshot,
    diffSnapshots,
    sanitizeStore,
    pruneNotifications,
    mergeEvents
  };
});
