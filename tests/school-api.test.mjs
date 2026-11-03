import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../admin/index.html', import.meta.url), 'utf8');
const professor = await readFile(new URL('../prof.js', import.meta.url), 'utf8');
const schema = await readFile(new URL('../database/migrations/school-core.sql', import.meta.url), 'utf8');
const calculations = await import('../school-calculations.js');
await import('../student-logic.js');
const legacyLogic = globalThis.StudentLogic;

test('les API administrateur couvrent les principaux référentiels scolaires', () => {
  for (const route of ['/api/admin/school-years','/api/admin/classes','/api/admin/students','/api/admin/teachers','/api/admin/subjects','/api/admin/terms','/api/admin/class-subjects','/api/admin/results']) {
    assert.ok(server.includes(route), `route absente: ${route}`);
  }
});

test('les référentiels peuvent être désactivés sans suppression physique', () => {
  assert.match(server, /url\.pathname\.match\(\/\^\\\/api\\\/admin\\\/\(classes\|students\|teachers\|subjects\)/);
  assert.match(server, /UPDATE students SET[\s\S]{0,300}is_active=COALESCE/);
  assert.match(server, /UPDATE teacher_sessions SET|DELETE FROM teacher_sessions WHERE teacher_id/);
});

test('l’administration propose les formulaires et listes des référentiels', () => {
  for (const id of ['year-form','class-form','student-form','teacher-form','subject-form','assignment-form']) {
    assert.ok(adminHtml.includes(`id="${id}"`), `formulaire absent: ${id}`);
  }
});

test('le stockage de l’espace professeur est synchronisé avec les API serveur', () => {
  assert.ok(server.includes('/api/teacher/workspace'));
  assert.match(professor, /await profApi\('\/api\/teacher\/workspace'/);
  assert.match(professor, /queueWorkspaceSync/);
});

test('les matières sont affectées par semestre et les élèves ont un identifiant externe stable', () => {
  assert.match(schema, /external_id VARCHAR\(120\)/);
  assert.match(schema, /term_id BIGINT UNSIGNED NOT NULL/);
  assert.match(schema, /UNIQUE KEY uq_class_subject \(class_id, subject_id, term_id\)/);
});

test('la sauvegarde complète est réservée à l’administrateur principal', () => {
  assert.match(server, /url\.pathname === '\/api\/admin\/backup'[\s\S]{0,120}user\.role_name !== 'principal'/);
  assert.match(adminHtml, /download-backup/);
});


test('les moyennes centralisées reproduisent exactement la formule historique', () => {
  const cases = [
    { devoir1: 12, devoir2: 16, composition: 14, hasComposition: true },
    { devoir1: 12.5, devoir2: 15.25, composition: null, hasComposition: false }
  ];
  for (const item of cases) {
    const actual = calculations.calculateSubjectAverage(item);
    const legacy = legacyLogic.subjectAverage({
      devoir1: item.devoir1, devoir2: item.devoir2, composition: item.composition,
      hasComposition: item.hasComposition, coefficient: 2
    });
    assert.equal(actual, legacy);
  }
});

test('la moyenne générale centrale reste masquée si une matière est incomplète', () => {
  assert.equal(calculations.calculateGeneralAverage([{average:12,coefficient:2},{average:null,coefficient:1}]),null);
  assert.equal(calculations.calculateGeneralAverage([{average:12,coefficient:2},{average:15,coefficient:1}]),13);
});

test('la validation centrale conserve les quarts de point et les coefficients officiels', () => {
  assert.equal(calculations.parseGradeValue('14,25'),14.25);
  assert.throws(()=>calculations.parseGradeValue('14,2'),/note_invalide/);
  assert.equal(calculations.isValidCoefficient(8),true);
  assert.equal(calculations.isValidCoefficient(8.5),false);
});
