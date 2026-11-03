
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { getDbSslConfig } from '../db-ssl.js';

const EXPECTED_DB = 'sunu_moyenne_prod';
const EXPECTED_USER = 'sunu_moyenne_app';

const expectedTables = [
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

if (process.env.DB_NAME !== EXPECTED_DB) {
  throw new Error('Base incorrecte : installation refusée.');
}

if (process.env.DB_USER !== EXPECTED_USER) {
  throw new Error('Utilisateur incorrect : installation refusée.');
}

if (process.env.CONFIRM_SCHOOL_SCHEMA_INSTALL !== 'YES') {
  throw new Error('Confirmation de production manquante.');
}

const source = await readFile(
  new URL('../database/migrations/school-core.sql', import.meta.url),
  'utf8'
);

const statements = source
  .replace(/^\s*--.*$/gm, '')
  .split(';')
  .map(s => s.trim())
  .filter(Boolean);

if (statements.length !== 12) {
  throw new Error(
    `12 instructions attendues, ${statements.length} trouvées. Installation refusée.`
  );
}

if (!statements.every(s => /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(s))) {
  throw new Error('Une instruction inattendue a été détectée.');
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

let currentInstruction = 0;

try {
  const [identity] = await db.execute(`
    SELECT DATABASE() AS base, CURRENT_USER() AS compte
  `);

  console.log('Connexion vérifiée :', identity[0]);

  if (
    identity[0].base !== EXPECTED_DB ||
    !identity[0].compte.startsWith(EXPECTED_USER + '@')
  ) {
    throw new Error('Identité MySQL incorrecte. Installation refusée.');
  }

  const [existing] = await db.execute(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  `);

  const existingNames = existing.map(row => row.TABLE_NAME);
  const alreadyPresent = expectedTables.filter(
    name => existingNames.includes(name)
  );

  if (alreadyPresent.length > 0) {
    throw new Error(
      `Certaines tables scolaires existent déjà : ${alreadyPresent.join(', ')}. Aucune instruction exécutée.`
    );
  }

  console.log('Tables scolaires à créer :', expectedTables.length);
  console.log('Début de l’installation...');

  for (let i = 0; i < statements.length; i++) {
    currentInstruction = i + 1;
    await db.execute(statements[i]);
    console.log(`Instruction ${i + 1}/12 exécutée.`);
  }

  const [verification] = await db.execute(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  `);

  const finalNames = verification.map(row => row.TABLE_NAME);
  const missing = expectedTables.filter(
    name => !finalNames.includes(name)
  );

  if (missing.length > 0 || finalNames.length !== 18) {
    throw new Error(
      `Vérification finale incorrecte. Tables manquantes : ${missing.join(', ')}. Total : ${finalNames.length}.`
    );
  }

  console.log('\nINSTALLATION SCOLAIRE RÉUSSIE.');
  console.log('Tables totales :', finalNames.length);
  console.log('Tables scolaires créées :', expectedTables.length);

} catch (error) {
  console.error('\nÉCHEC de l’installation.');
  console.error('Instruction concernée :', currentInstruction || 'Pré-vérification');
  console.error('Code :', error.code || 'ERREUR');
  if (error.sqlMessage) {
    console.error('Détail SQL :', error.sqlMessage);
  }
  console.error(
    'Ne relance pas le script avant vérification des tables présentes.'
  );
  process.exitCode = 1;

} finally {
  await db.end();
}
