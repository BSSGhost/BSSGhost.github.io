import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');
const professor = await readFile(new URL('../prof.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('le serveur expose une authentification professeur individuelle', () => {
  for (const route of ['/api/teacher/login', '/api/teacher/me', '/api/teacher/logout', '/api/teacher/change-password', '/api/teacher/workspace']) {
    assert.ok(server.includes(route), `route absente: ${route}`);
  }
});

test('les sessions professeur sont stockées côté serveur et non dans un jeton lisible', () => {
  assert.match(server, /teacher_sessions/);
  assert.match(server, /teacher_session=.*HttpOnly/);
  assert.match(server, /passwordMatches\(password, teacher\.password_hash\)/);
});

test('le navigateur ne contient plus de hash de mot de passe professeur prédéfini', () => {
  assert.doesNotMatch(professor, /PROF_PASSWORD_HASH/);
  assert.doesNotMatch(professor, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(professor, /profApi\('\/api\/teacher\/login'/);
  assert.match(professor, /profApi\('\/api\/teacher\/workspace'/);
  assert.match(professor, /queueWorkspaceSync/);
});

test('la connexion professeur demande une adresse e-mail', () => {
  assert.match(html, /<input[^>]*type="email"[^>]*id="prof-email"/);
});
