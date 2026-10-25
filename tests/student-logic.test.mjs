import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
await import(path.join(root, 'student-logic.js'));
const L = globalThis.StudentLogic;

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} attendu ${b}, obtenu ${a}`);

/* Extrait une fonction de script.js pour vérifier que le module reprend les mêmes règles. */
function extractFn(name) {
  const src = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} introuvable dans script.js`);
  let depth = 0; let i = src.indexOf('{', start);
  const begin = i;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') { depth -= 1; if (depth === 0) break; }
  }
  return new Function(`${src.slice(start, i + 1)}; return ${name};`)();
}

const rec = (d1, d2, compo, coef) => {
  const hasComposition = compo !== null;
  const md = (d1 + d2) / 2;
  const moyenne = hasComposition ? (md + compo) / 2 : md;
  return { devoir1: d1, devoir2: d2, composition: compo, hasComposition, coefficient: coef, moyenne, points: moyenne * coef };
};
const deepFreeze = (o) => { Object.values(o).forEach((v) => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };

const baseNotes = () => ({
  Mathématiques: rec(10, 13, 11, 4),   // moyenne 11,25
  Français: rec(12, 14, null, 3),      // 13
  'Sciences Physiques': rec(8, 9, 10, 4) // 9,0833…
});

/* ---------- Parité avec script.js ---------- */

test('weightedAverage reprend computeMoyenneBrute de script.js', () => {
  const computeMoyenneBrute = extractFn('computeMoyenneBrute');
  const notes = baseNotes();
  near(L.weightedAverage(notes), computeMoyenneBrute(notes));
  assert.equal(L.weightedAverage({}), null);
  assert.equal(computeMoyenneBrute({}), null);
});

test('parseNote accepte exactement les notes de isValidDecimalNote (formes officielles)', () => {
  const isValid = extractFn('isValidDecimalNote');
  for (const raw of ['0', '7', '15', '20', '15,25', '15.5', '15,50', '12.75', '20,25', '21', '-1', '12,3', '', 'abc', '1,125']) {
    const officiel = isValid(raw);
    const nouveau = L.parseNote(raw) !== null;
    if (officiel) assert.ok(nouveau, `${raw} valide dans l'app, refusée ici`);
  }
  assert.equal(L.parseNote('15,5'), 15.5);   // tolérance : 15,5 = 15,50
  assert.equal(L.parseNote('20,25'), null);
  assert.equal(L.parseNote('12,3'), null);   // pas un quart de point
  assert.equal(L.parseNote(''), null);
  assert.equal(L.parseNote(null), null);
});

test('subjectAverage reproduit calculerMoyenneDeMatiere (avec et sans composition)', () => {
  near(L.subjectAverage(rec(10, 13, 11, 4)), ((10 + 13) / 2 + 11) / 2);
  near(L.subjectAverage(rec(12, 14, null, 3)), 13);
});

/* ---------- Simulation ---------- */

test('simulate : nouvelle moyenne de matière et impact sur la moyenne générale', () => {
  const notes = baseNotes();
  const r = L.simulate(notes, [{ matiere: 'Mathématiques', key: 'composition', value: 16 }]);
  const s = r.subjects[0];
  near(s.before, 11.25);
  near(s.after, ((10 + 13) / 2 + 16) / 2);
  near(s.delta, s.after - s.before);
  const avgBefore = (11.25 * 4 + 13 * 3 + (((8 + 9) / 2 + 10) / 2) * 4) / 11;
  near(r.semesterBefore, avgBefore);
  near(r.semesterAfter, (s.after * 4 + 13 * 3 + (((8 + 9) / 2 + 10) / 2) * 4) / 11);
  near(r.semesterDelta, r.semesterAfter - r.semesterBefore);
});

test('simulate : plusieurs notes successives, la dernière valeur d\'une même évaluation l\'emporte', () => {
  const notes = baseNotes();
  const r = L.simulate(notes, [
    { matiere: 'Mathématiques', key: 'devoir2', value: 5 },
    { matiere: 'Mathématiques', key: 'devoir2', value: 18 },
    { matiere: 'Français', key: 'devoir1', value: 20 }
  ]);
  assert.equal(r.subjects.length, 2);
  near(r.subjects.find((s) => s.matiere === 'Mathématiques').after, ((10 + 18) / 2 + 11) / 2);
  near(r.subjects.find((s) => s.matiere === 'Français').after, (20 + 14) / 2);
});

test('simulation isolée : les notes réelles ne sont jamais modifiées (objet gelé, aucune exception)', () => {
  const notes = deepFreeze(baseNotes());
  const snapshot = JSON.stringify(notes);
  const out = L.applyScenario(notes, [
    { matiere: 'Mathématiques', key: 'devoir1', value: 20, coefficient: 8 },
    { matiere: 'Français', key: 'devoir2', value: 0 }
  ]);
  assert.equal(JSON.stringify(notes), snapshot);
  assert.notEqual(out.Mathématiques, notes.Mathématiques);
  assert.equal(out.Mathématiques.coefficient, 8);
  assert.equal(notes.Mathématiques.coefficient, 4);
  L.simulate(notes, [{ matiere: 'Mathématiques', key: 'devoir1', value: 20 }]);
  L.requiredNote(notes, { matiere: 'Mathématiques', key: 'composition', target: 14, scope: 'semestre' });
  assert.equal(JSON.stringify(notes), snapshot);
});

test('simulation isolée : aucun accès au stockage (pas de localStorage dans le module)', () => {
  const src = fs.readFileSync(path.join(root, 'student-logic.js'), 'utf8');
  assert.ok(!/localStorage|sessionStorage|document\./.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
});

test('coefficient hypothétique : pris en compte dans la moyenne générale, validé comme dans l\'app (entier 1 à 8)', () => {
  const notes = baseNotes();
  const r = L.simulate(notes, [{ matiere: 'Français', key: 'devoir1', value: 12, coefficient: 6 }]);
  const s = r.subjects[0];
  assert.equal(s.coefficientBefore, 3);
  assert.equal(s.coefficientAfter, 6);
  const sim = L.applyScenario(notes, [{ matiere: 'Français', key: 'devoir1', value: 12, coefficient: 6 }]);
  near(L.weightedAverage(sim), (11.25 * 4 + 13 * 6 + (((8 + 9) / 2 + 10) / 2) * 4) / 14);
  for (const bad of [0, 9, 2.5, 'x']) {
    assert.equal(L.validateChange(notes, { matiere: 'Français', key: 'devoir1', value: 12, coefficient: bad }).reason, 'coefficient_invalide');
  }
});

test('validateChange : cas limites', () => {
  const notes = baseNotes();
  assert.equal(L.validateChange(notes, { matiere: 'Inconnue', key: 'devoir1', value: 10 }).reason, 'matiere_inconnue');
  assert.equal(L.validateChange(notes, { matiere: 'Français', key: 'composition', value: 10 }).reason, 'evaluation_indisponible');
  assert.equal(L.validateChange(notes, { matiere: 'Français', key: 'devoir1', value: 21 }).reason, 'note_invalide');
  assert.equal(L.validateChange(notes, { matiere: 'Français', key: 'devoir1', value: 12.3 }).reason, 'note_invalide');
  assert.equal(L.validateChange(notes, { matiere: 'Français', key: 'devoir1', value: '12' }).reason, 'note_invalide');
  const legacy = { Histoire: { moyenne: 12, coefficient: 2 } };
  assert.equal(L.validateChange(legacy, { matiere: 'Histoire', key: 'devoir1', value: 12 }).reason, 'donnees_incompletes');
  assert.ok(L.validateChange(notes, { matiere: 'Français', key: 'devoir1', value: 0 }).ok);
  assert.ok(L.validateChange(notes, { matiere: 'Français', key: 'devoir1', value: 20 }).ok);
});

test('simulate ignore les hypothèses invalides sans planter et sans rien changer', () => {
  const notes = baseNotes();
  const r = L.simulate(notes, [{ matiere: 'Inconnue', key: 'devoir1', value: 10 }, { matiere: 'Français', key: 'devoir1', value: 99 }]);
  assert.equal(r.ignored, 2);
  assert.equal(r.subjects.length, 0);
  near(r.semesterAfter, r.semesterBefore);
  assert.deepEqual(L.simulate({}, []).semesterBefore, null);
});

/* ---------- Note nécessaire ---------- */

test('requiredNote (matière) : la note arrondie au quart supérieur atteint bien l\'objectif', () => {
  const notes = baseNotes();
  for (const key of ['devoir1', 'devoir2', 'composition']) {
    for (const target of [10, 12, 13.5, 15]) {
      const r = L.requiredNote(notes, { matiere: 'Mathématiques', key, target, scope: 'matiere' });
      if (r.status !== 'reachable') continue;
      const sim = L.applyScenario(notes, [{ matiere: 'Mathématiques', key, value: r.minNote }]);
      assert.ok(sim.Mathématiques.moyenne >= target - 1e-9, `${key} ${target}: ${sim.Mathématiques.moyenne}`);
      if (r.minNote >= 0.25) {
        const below = L.applyScenario(notes, [{ matiere: 'Mathématiques', key, value: r.minNote - 0.25 }]);
        assert.ok(below.Mathématiques.moyenne < target, 'un quart de point en moins ne suffit plus');
      }
    }
  }
});

test('requiredNote : valeur exacte attendue (composition de Mathématiques pour 14/20)', () => {
  const r = L.requiredNote(baseNotes(), { matiere: 'Mathématiques', key: 'composition', target: 14, scope: 'matiere' });
  assert.equal(r.status, 'reachable');
  near(r.exact, 2 * 14 - 11.5);   // (11,5 + x)/2 = 14 -> x = 16,5
  assert.equal(r.minNote, 16.5);
});

test('requiredNote (semestre) : atteint la moyenne générale visée', () => {
  const notes = baseNotes();
  const target = 12.5;
  const r = L.requiredNote(notes, { matiere: 'Sciences Physiques', key: 'composition', target, scope: 'semestre' });
  assert.equal(r.status, 'reachable');
  const sim = L.applyScenario(notes, [{ matiere: 'Sciences Physiques', key: 'composition', value: r.minNote }]);
  assert.ok(L.weightedAverage(sim) >= target - 1e-9);
  const less = L.applyScenario(notes, [{ matiere: 'Sciences Physiques', key: 'composition', value: Math.max(0, r.minNote - 0.25) }]);
  assert.ok(L.weightedAverage(less) < target);
});

test('requiredNote : objectif déjà atteint, impossible, et données insuffisantes', () => {
  const notes = baseNotes();
  assert.equal(L.requiredNote(notes, { matiere: 'Français', key: 'devoir1', target: 5, scope: 'matiere' }).status, 'already');
  const imp = L.requiredNote(notes, { matiere: 'Sciences Physiques', key: 'composition', target: 19, scope: 'matiere' });
  assert.equal(imp.status, 'impossible');
  assert.equal(imp.reason, 'inatteignable');
  near(imp.maxAchievable, (8.5 + 20) / 2);
  const impSem = L.requiredNote(notes, { matiere: 'Sciences Physiques', key: 'composition', target: 19, scope: 'semestre' });
  assert.equal(impSem.status, 'impossible');
  assert.equal(L.requiredNote({ X: { moyenne: 12, coefficient: 2 } }, { matiere: 'X', key: 'devoir1', target: 14, scope: 'matiere' }).reason, 'donnees_incompletes');
  assert.equal(L.requiredNote(notes, { matiere: 'Français', key: 'composition', target: 14, scope: 'matiere' }).status, 'impossible');
  const tooHigh = L.requiredNote(notes, { matiere: 'Français', key: 'devoir1', target: 20, scope: 'matiere' });
  assert.equal(tooHigh.status, 'impossible');   // (x + 14) / 2 = 20 -> x = 26 > 20
  near(tooHigh.exact, 26);
});

/* ---------- Analyse et recommandations ---------- */

test('analyseSubjects : meilleure et plus faible matière, tendances, sans inventer de données', () => {
  const cur = baseNotes();
  const prev = { Mathématiques: rec(8, 8, 8, 4), 'Sciences Physiques': rec(14, 14, 14, 4) };
  const a = L.analyseSubjects(cur, prev, 12);
  assert.equal(a.best.matiere, 'Français');
  assert.equal(a.worst.matiere, 'Sciences Physiques');
  assert.equal(a.subjects.find((s) => s.matiere === 'Mathématiques').trend, 'up');
  assert.equal(a.subjects.find((s) => s.matiere === 'Sciences Physiques').trend, 'down');
  assert.equal(a.subjects.find((s) => s.matiere === 'Français').trend, null);
  assert.deepEqual(a.weak.map((s) => s.matiere).sort(), ['Mathématiques', 'Sciences Physiques']);
});

test('analyseSubjects : une seule matière -> aucun classement, aucune matière forte', () => {
  const a = L.analyseSubjects({ Français: rec(12, 14, null, 3) }, null, null);
  assert.equal(a.canRank, false);
  assert.equal(a.best, null);
  assert.equal(a.worst, null);
  assert.deepEqual(a.strong, []);
  assert.equal(L.analyseSubjects({}, null, 12).subjects.length, 0);
  assert.equal(L.analyseSubjects({}, null, 12).general, null);
});

test('goalLever et recommandations : action concrète calculée, objectif atteint ou aucune donnée', () => {
  const notes = baseNotes();
  const g = L.goalLever(notes, 13);
  assert.ok(g.lever);
  const sim = L.applyScenario(notes, []);
  const rec1 = g.lever;
  sim[rec1.matiere] = { ...sim[rec1.matiere], moyenne: rec1.needed, points: rec1.needed * rec1.coefficient };
  near(L.weightedAverage(sim), 13);
  assert.equal(L.goalLever(notes, 5), null);
  assert.equal(L.goalLever(notes, null), null);

  const analysis = L.analyseSubjects(notes, null, 13);
  const recs = L.buildRecommendations(analysis, notes, 13);
  assert.ok(recs.length > 0 && recs.length <= 4);
  assert.ok(recs.some((r) => r.type === 'goal'));
  assert.deepEqual(L.buildRecommendations(L.analyseSubjects({}, null, 13), {}, 13), []);
  const done = L.buildRecommendations(L.analyseSubjects(notes, null, 5), notes, 5);
  assert.ok(done.some((r) => r.key === 'rec_goal_reached'));
});

/* ---------- Graphiques ---------- */

test('buildPeriodSeries : ne relie jamais deux périodes séparées par un vide ou incomplètes', () => {
  const s = L.buildPeriodSeries([
    { label: '6e S1', value: 11, complete: true },
    { label: '6e S2', value: null, complete: false },
    { label: '5e S1', value: 12, complete: true },
    { label: '5e S2', value: 12.1, complete: true },
    { label: '4e S1', value: 9, complete: false }
  ]);
  assert.deepEqual(s.segments, [[2, 3]]);
  assert.equal(s.knownCount, 3);
  near(s.latestDelta, 0.1);
  assert.equal(s.latestTrend, 'flat');
  near(s.overallDelta, 1.1);
  assert.equal(s.overallTrend, 'up');
});

test('buildPeriodSeries : sans donnée ou avec un seul point, aucune tendance', () => {
  assert.equal(L.buildPeriodSeries([]).knownCount, 0);
  const one = L.buildPeriodSeries([{ label: 'a', value: 10, complete: true }]);
  assert.equal(one.overallTrend, null);
  assert.deepEqual(one.segments, []);
});

test('compareSemesters : contributions par matière cohérentes avec la variation commune', () => {
  const n1 = { Maths: rec(10, 10, 10, 4), Français: rec(12, 12, 12, 3), Histoire: rec(14, 14, 14, 2) };
  const n2 = { Maths: rec(14, 14, 14, 4), Français: rec(11, 11, 11, 3), Anglais: rec(10, 10, 10, 2) };
  const c = L.compareSemesters(n1, n2);
  assert.deepEqual(c.onlyS1, ['Histoire']);
  assert.deepEqual(c.onlyS2, ['Anglais']);
  assert.equal(c.rows[0].matiere, 'Maths');
  const common = ((14 * 4 + 11 * 3) / 7) - ((10 * 4 + 12 * 3) / 7);
  near(c.commonDelta, common);
  near(c.rows.reduce((a, r) => a + r.contribution, 0), common);
  near(c.delta, L.weightedAverage(n2) - L.weightedAverage(n1));
  assert.equal(L.compareSemesters({}, {}).delta, null);
});

/* ---------- Notifications ---------- */

const period = (notes, complete) => ({ notes, complete });

test('notifications : première exécution = simple référence, aucun événement', () => {
  const next = L.buildSnapshot({ '3e|Semestre1': period(baseNotes(), true) });
  assert.deepEqual(L.diffSnapshots(null, next, 12), []);
});

test('notifications : bulletin prêt, objectif atteint, progrès et baisse', () => {
  const before = baseNotes();
  const after = { ...baseNotes(), Mathématiques: rec(16, 16, 16, 4), 'Sciences Physiques': rec(2, 2, 2, 4) };
  const prev = L.buildSnapshot({ '3e|Semestre1': period(before, false) });
  const next = L.buildSnapshot({ '3e|Semestre1': period(after, true) });
  const ev = L.diffSnapshots(prev, next, 11);
  const types = ev.map((e) => e.type).sort();
  assert.ok(types.includes('bulletin'));
  assert.ok(types.includes('progres'));
  assert.ok(types.includes('baisse'));
  const avg = L.weightedAverage(after);
  assert.equal(types.includes('objectif'), avg >= 11);
  assert.equal(new Set(ev.map((e) => e.id)).size, ev.length);
});

test('notifications : un objectif non atteint ou un semestre incomplet ne produit rien de fictif', () => {
  const prev = L.buildSnapshot({ '3e|Semestre1': period({ Français: rec(10, 10, null, 3) }, false) });
  const next = L.buildSnapshot({ '3e|Semestre1': period({ Français: rec(11, 11, null, 3) }, false) });
  assert.deepEqual(L.diffSnapshots(prev, next, 5), []);
  const complete = L.buildSnapshot({ '3e|Semestre1': period(baseNotes(), true) });
  assert.ok(!L.diffSnapshots(next, complete, 19).some((e) => e.type === 'objectif'));
  assert.deepEqual(L.diffSnapshots(complete, complete, 5), []);
});

test('notifications : pas de doublon, même après suppression, et persistance via sanitizeStore', () => {
  const ev = [{ id: 'bulletin:3e|Semestre1', type: 'bulletin', key: 'notif_bulletin_ready', target: 'bulletin', params: { classe: '3e', sem: 'Semestre1' } }];
  let store = { items: [], seen: [] };
  const t0 = Date.UTC(2026, 9, 24);
  let r = L.mergeEvents(store, ev, t0);
  assert.equal(r.added.length, 1);
  store = r.store;
  r = L.mergeEvents(store, ev, t0 + 1000);
  assert.equal(r.added.length, 0);
  assert.equal(r.store.items.length, 1);
  const afterDelete = { items: [], seen: store.seen };
  assert.equal(L.mergeEvents(afterDelete, ev, t0 + 2000).added.length, 0);
  const reloaded = L.sanitizeStore(JSON.parse(JSON.stringify(store)));
  assert.deepEqual(reloaded, store);
  assert.equal(L.mergeEvents(reloaded, ev, t0 + 3000).added.length, 0);
});

test('notifications : sanitizeStore rejette les données corrompues sans planter', () => {
  assert.deepEqual(L.sanitizeStore(null), { items: [], seen: [] });
  assert.deepEqual(L.sanitizeStore('x'), { items: [], seen: [] });
  const dirty = L.sanitizeStore({ items: [null, 5, { id: 1 }, { id: 'a', type: 'inconnu', key: 'k', createdAt: 1 }, { id: 'ok', type: 'baisse', key: 'k', createdAt: 5, read: 1, params: 'x' }], seen: [1, 'a'] });
  assert.equal(dirty.items.length, 1);
  assert.equal(dirty.items[0].read, true);
  assert.deepEqual(dirty.items[0].params, {});
  assert.deepEqual(dirty.seen, ['a']);
});

test('notifications : nettoyage des anciennes et plafond (les non lues sont gardées en priorité)', () => {
  const now = Date.UTC(2026, 9, 24);
  const day = 86400000;
  const old = { id: 'old', type: 'progres', key: 'k', params: {}, target: null, createdAt: now - (L.MAX_AGE_DAYS + 1) * day, read: false };
  assert.equal(L.pruneNotifications([old], now).length, 0);
  const many = Array.from({ length: L.MAX_NOTIFICATIONS + 10 }, (_, i) => ({ id: `n${i}`, type: 'progres', key: 'k', params: {}, target: null, createdAt: now - i * 1000, read: i % 2 === 0 }));
  const kept = L.pruneNotifications(many, now);
  assert.equal(kept.length, L.MAX_NOTIFICATIONS);
  assert.equal(kept.filter((n) => !n.read).length, many.filter((n) => !n.read).length);
  assert.ok(kept[0].createdAt >= kept[kept.length - 1].createdAt);
});

test('notifications : un changement d\'objectif déclenche « atteint » seulement s\'il vient d\'être satisfait', () => {
  const snap = L.buildSnapshot({ '3e|Semestre1': period(baseNotes(), true) });
  const avg = L.weightedAverage(baseNotes());
  const lower = Math.floor(avg);
  const higher = Math.ceil(avg) + 1;
  // objectif abaissé sous la moyenne : événement
  assert.ok(L.diffSnapshots(snap, snap, lower, higher).some((e) => e.type === 'objectif'));
  // objectif relevé au-dessus de la moyenne : rien
  assert.ok(!L.diffSnapshots(snap, snap, higher, lower).some((e) => e.type === 'objectif'));
  // objectif inchangé déjà atteint : rien
  assert.ok(!L.diffSnapshots(snap, snap, lower, lower).some((e) => e.type === 'objectif'));
  // abaissé alors que l'ancien objectif était déjà atteint : rien
  assert.ok(!L.diffSnapshots(snap, snap, lower - 1, lower).some((e) => e.type === 'objectif'));
});
