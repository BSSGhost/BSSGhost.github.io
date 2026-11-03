import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../database/migrations/school-core.sql', import.meta.url), 'utf8');
const expectedTables = [
  'school_years', 'classes', 'students', 'enrollments', 'teachers',
  'subjects', 'terms', 'class_subjects', 'student_grades', 'teacher_sessions', 'teacher_class_access', 'teacher_activity_logs'
];

test('le schéma scolaire crée toutes les tables métier attendues', () => {
  for (const table of expectedTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`, 'i'), `table absente: ${table}`);
  }
});

test('le schéma scolaire ne contient aucune instruction destructive', () => {
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\s+TABLE\b/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test('les notes reprennent les trois évaluations utilisées par l’espace professeur', () => {
  for (const field of ['devoir1', 'devoir2', 'composition']) {
    assert.match(sql, new RegExp(`\\b${field}\\s+DECIMAL`, 'i'));
  }
});

test('les relations métier sont protégées par des clés étrangères', () => {
  assert.ok((sql.match(/FOREIGN KEY/g) || []).length >= 13);
});
