import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { getDbSslConfig } from '../db-ssl.js';

if (process.env.DB_NAME !== 'sunu_moyenne_prod') {
  throw new Error('Base incorrecte : opération refusée.');
}

if (process.env.DB_USER !== 'sunu_moyenne_app') {
  throw new Error('Utilisateur incorrect : opération refusée.');
}

if (process.env.CONFIRM_PRODUCTION_PERMISSIONS !== 'YES') {
  throw new Error('Confirmation manquante.');
}

const source = await readFile(
  new URL('../database/migrations/admin-system.sql', import.meta.url),
  'utf8'
);

const statements = source
  .replace(/^\s*--.*$/gm, '')
  .split(';')
  .map(s => s.trim())
  .filter(Boolean);

// Instructions 18 à 21 du fichier SQL.
const selected = statements.slice(17, 21);

if (selected.length !== 4) {
  throw new Error('Nombre inattendu d’instructions SQL.');
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: await getDbSslConfig(),
  multipleStatements: false
});

try {
  const [identity] = await db.execute(`
    SELECT DATABASE() AS base, CURRENT_USER() AS compte
  `);

  console.log('Connexion vérifiée :', identity[0]);

  if (identity[0].base !== 'sunu_moyenne_prod') {
    throw new Error('La base connectée ne correspond pas.');
  }

  for (let i = 0; i < selected.length; i++) {
    await db.execute(selected[i]);
    console.log(`Instruction ${i + 18}/21 exécutée.`);
  }

  const [rows] = await db.execute(`
    SELECT r.name AS role, COUNT(rp.permission_id) AS total
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);

  console.log('Associations des rôles :', rows);
} catch (error) {
  console.error('Échec :', error.code || error.message);
  if (error.sqlMessage) console.error('Détail SQL :', error.sqlMessage);
  process.exitCode = 1;
} finally {
  await db.end();
}