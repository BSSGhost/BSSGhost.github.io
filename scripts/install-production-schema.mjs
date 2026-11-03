
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { getDbSslConfig } from '../db-ssl.js';

const EXPECTED_DB = 'sunu_moyenne_prod';

const expectedTables = [
  'roles',
  'permissions',
  'role_permissions',
  'admin_users',
  'admin_sessions',
  'audit_logs',
  'school_years',
  'classes',
  'students',
  'enrollments',
  'teachers',
  'subjects',
  'terms',
  'class_subjects',
  'student_grades',
  'teacher_sessions',
  'teacher_class_access',
  'teacher_activity_logs'
];

function splitStatements(source) {
  return source
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

if (process.env.DB_NAME !== EXPECTED_DB) {
  throw new Error('ARRÊT : DB_NAME doit être exactement sunu_moyenne_prod.');
}

if (process.env.DB_USER !== 'sunu_moyenne_app') {
  throw new Error('ARRÊT : compte MySQL inattendu.');
}

if (
  !process.env.DB_HOST ||
  !process.env.DB_PORT ||
  !process.env.DB_PASSWORD
) {
  throw new Error('Configuration de connexion incomplète.');
}

if (process.env.CONFIRM_PRODUCTION_SCHEMA_INSTALL !== 'YES') {
  throw new Error('ARRÊT : confirmation de production absente.');
}

const adminSql = await readFile(
  new URL('../database/migrations/admin-system.sql', import.meta.url),
  'utf8'
);

const schoolSql = await readFile(
  new URL('../database/migrations/school-core.sql', import.meta.url),
  'utf8'
);

const statements = [
  ...splitStatements(adminSql),
  ...splitStatements(schoolSql)
];

const createStatements = statements.filter(
  statement => /^CREATE TABLE IF NOT EXISTS/i.test(statement)
);

if (createStatements.length !== 18) {
  throw new Error(
    `ARRÊT : 18 créations attendues, ${createStatements.length} trouvées.`
  );
}

const ssl = await getDbSslConfig();

let db;

try {
  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: EXPECTED_DB,
    multipleStatements: false,
    ...(ssl ? { ssl } : {})
  });

  const [identity] = await db.query(
    'SELECT DATABASE() AS db, CURRENT_USER() AS account'
  );

  if (identity[0].db !== EXPECTED_DB) {
    throw new Error('ARRÊT : identité de base incorrecte.');
  }

  if (!identity[0].account.startsWith('sunu_moyenne_app@')) {
    throw new Error('ARRÊT : compte MySQL inattendu.');
  }

  const [existing] = await db.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ?`,
    [EXPECTED_DB]
  );

  if (existing.length !== 0) {
    throw new Error(
      `ARRÊT : ${existing.length} table(s) déjà présente(s). Aucune installation lancée.`
    );
  }

  console.log('Base vérifiée :', EXPECTED_DB);
  console.log('Compte :', identity[0].account);
  console.log('Instructions SQL :', statements.length);
  console.log('Tables attendues : 18');
  console.log('Début de l’installation...');

  for (let i = 0; i < statements.length; i++) {
    await db.execute(statements[i]);
    console.log(`Instruction ${i + 1}/${statements.length} exécutée.`);
  }

  const [created] = await db.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [EXPECTED_DB]
  );

  const actual = new Set(created.map(row => row.TABLE_NAME));
  const missing = expectedTables.filter(name => !actual.has(name));
  const unexpected = [...actual].filter(name => !expectedTables.includes(name));

  if (missing.length || unexpected.length || actual.size !== 18) {
    throw new Error(
      `Vérification finale incorrecte. Manquantes : ${missing.join(', ')}.`
    );
  }

  const [roles] = await db.query('SELECT COUNT(*) AS total FROM roles');
  const [permissions] = await db.query(
    'SELECT COUNT(*) AS total FROM permissions'
  );
  const [admins] = await db.query(
    'SELECT COUNT(*) AS total FROM admin_users'
  );

  console.log('--------------------------------');
  console.log('INSTALLATION DU SCHÉMA TERMINÉE');
  console.log('Tables :', actual.size);
  console.log('Rôles :', roles[0].total);
  console.log('Permissions :', permissions[0].total);
  console.log('Comptes administrateurs :', admins[0].total);
  console.log('--------------------------------');

} catch (error) {
  console.error('ÉCHEC :', error.code || error.message);
  console.error(
    'Attention : les opérations DDL MySQL peuvent être validées individuellement. Vérifie les tables présentes avant toute reprise.'
  );
  process.exitCode = 1;
} finally {
  if (db) await db.end();
}
