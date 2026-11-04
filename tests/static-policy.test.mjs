import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicStaticPath } from '../security/static-policy.js';

test('les ressources publiques nécessaires restent accessibles', () => {
  for (const path of ['/index.html', '/styles.css', '/script.js', '/prof.js', '/admin/index.html', '/admin/admin.css', '/admin/app.css', '/admin/js/app.js', '/admin/js/ui.js', '/admin/js/icons.js', '/fonts/plus-jakarta-sans-400.woff2']) {
    assert.equal(isPublicStaticPath(path), true, path);
  }
});

test('les fichiers de configuration, certificats et SQL ne sont jamais servis', () => {
  for (const path of ['/.env', '/.env.example', '/certs/aiven-ca.pem', '/database/migrations/school-core.sql', '/package.json', '/server.js', '/db-ssl.js', '/ADMIN-INSTALLATION.md', '/scripts/init-admins.mjs', '/security/static-policy.js', '/admin/admin.js']) {
    assert.equal(isPublicStaticPath(path), false, path);
  }
});

test('les répertoires internes et anciennes sauvegardes ne sont pas servis', () => {
  for (const path of ['/node_modules/mysql2/index.js', '/backend/services/auth.service.js', '/backup/server.js', '/scripts/init-admins.mjs', '/backup.html']) {
    assert.equal(isPublicStaticPath(path), false, path);
  }
});

test('les chemins cachés, traversées et encodages invalides sont refusés', () => {
  for (const path of ['/%2eenv', '/%2e%2e/server.js', '/foo/../server.js', '/%ZZ']) {
    assert.equal(isPublicStaticPath(path), false, path);
  }
});
