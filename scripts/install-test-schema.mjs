import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { getDbSslConfig } from '../db-ssl.js';

const dbName = String(process.env.DB_NAME || '');
if (process.env.ALLOW_TEST_SCHEMA_INSTALL !== 'YES') {
  console.error('Installation bloquée : définis ALLOW_TEST_SCHEMA_INSTALL=YES uniquement après avoir créé une base de TEST.');
  process.exit(1);
}
if (!/(?:^|[_-])(test|dev|local)(?:$|[_-])/i.test(dbName) || /^defaultdb$/i.test(dbName)) {
  console.error('Installation bloquée : DB_NAME doit désigner explicitement une base de test (nom contenant test, dev ou local).');
  process.exit(1);
}
for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
  if (!process.env[key]) {
    console.error(`Configuration manquante : ${key}`);
    process.exit(1);
  }
}

const ssl = await getDbSslConfig();
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  multipleStatements: false,
  ...(ssl ? { ssl } : {})
});

function splitStatements(source) {
  return source
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

try {
  const adminSql = await readFile(new URL('../database/migrations/admin-system.sql', import.meta.url), 'utf8');
  const schoolSql = await readFile(new URL('../database/migrations/school-core.sql', import.meta.url), 'utf8');
  const statements = [...splitStatements(adminSql), ...splitStatements(schoolSql)];
  console.log(`Base de test ciblée : ${dbName}`);
  console.log(`${statements.length} instructions SQL additives à appliquer.`);
  for (let index = 0; index < statements.length; index += 1) {
    await db.execute(statements[index]);
  }
  console.log('Schémas administration et scolaire installés. Aucun compte n’a encore de mot de passe.');
  console.log('Étape suivante : initialiser les comptes avec deux mots de passe distincts, puis lancer les tests d’intégration.');
} finally {
  await db.end();
}
