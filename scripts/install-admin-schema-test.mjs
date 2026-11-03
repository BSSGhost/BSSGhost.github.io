import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDbSslConfig } from '../db-ssl.js';

const databaseName = String(process.env.DB_NAME || '').trim();
const target = String(process.env.ADMIN_SCHEMA_INSTALL_TARGET || '').trim();
const confirmation = String(process.env.ADMIN_SCHEMA_INSTALL_DB_CONFIRM || '').trim();

if (!databaseName || !process.env.DB_HOST || !process.env.DB_USER) {
  console.error('Configuration DB incomplète : DB_HOST, DB_USER et DB_NAME sont requis.');
  process.exit(1);
}
if (databaseName.toLowerCase() === 'defaultdb') {
  console.error('Installation refusée : defaultdb est protégée. Crée une base de test dédiée.');
  process.exit(1);
}
if (target !== 'TEST' || confirmation !== databaseName) {
  console.error('Installation refusée. Pour une base de TEST uniquement, définis :');
  console.error('$env:ADMIN_SCHEMA_INSTALL_TARGET = "TEST"');
  console.error('$env:ADMIN_SCHEMA_INSTALL_DB_CONFIRM = "<nom exact de DB_NAME>"');
  process.exit(1);
}

const expectedTables = [
  'roles', 'permissions', 'role_permissions',
  'admin_users', 'admin_sessions', 'audit_logs'
];
const ssl = await getDbSslConfig();
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
  multipleStatements: true,
  ...(ssl ? { ssl } : {})
});

try {
  const [existing] = await db.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${expectedTables.map(() => '?').join(',')})`,
    expectedTables
  );
  if (existing.length) {
    console.error('Installation arrêtée : au moins une table administrative existe déjà.');
    console.error('Vérifie sa structure avec npm run check-admin-schema avant toute modification.');
    process.exitCode = 2;
  } else {
    const sql = await readFile(
      resolve(process.cwd(), 'database/migrations/admin-system.sql'),
      'utf8'
    );
    await db.query(sql);

    const [created] = await db.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (${expectedTables.map(() => '?').join(',')})`,
      expectedTables
    );
    const createdNames = new Set(created.map((row) => row.TABLE_NAME));
    const missing = expectedTables.filter((name) => !createdNames.has(name));
    if (missing.length) {
      throw new Error(`Installation incomplète. Tables absentes : ${missing.join(', ')}`);
    }
    console.log(`Schéma administratif installé et vérifié dans la base de TEST "${databaseName}".`);
    console.log('Aucun compte administrateur n’a encore de mot de passe initial.');
    console.log('Étape suivante : npm run init-admins avec ADMIN_INITIAL_PASSWORD défini temporairement.');
  }
} finally {
  await db.end();
}
