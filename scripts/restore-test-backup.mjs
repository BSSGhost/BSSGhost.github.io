import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getDbSslConfig } from '../db-ssl.js';

const dbName = String(process.env.DB_NAME || '');
const backupPath = process.argv[2];
if (process.env.ALLOW_TEST_RESTORE !== 'YES') {
  console.error('Restauration bloquée : définis ALLOW_TEST_RESTORE=YES uniquement pour une base de TEST.');
  process.exit(1);
}
if (!/(?:^|[_-])(test|dev|local)(?:$|[_-])/i.test(dbName) || /^defaultdb$/i.test(dbName)) {
  console.error('Restauration bloquée : DB_NAME doit être une base de test distincte de la production.');
  process.exit(1);
}
if (!backupPath) {
  console.error('Usage : npm run restore-test-backup -- chemin\\vers\\sauvegarde.json');
  process.exit(1);
}
for (const key of ['DB_HOST','DB_USER','DB_NAME']) {
  if (!process.env[key]) { console.error(`Configuration manquante : ${key}`); process.exit(1); }
}

const tableOrder = [
  'roles','permissions','role_permissions','admin_users','audit_logs',
  'school_years','classes','students','enrollments','teachers','teacher_activity_logs','subjects','terms',
  'class_subjects','student_grades','teacher_class_access'
];
const backup = JSON.parse(await readFile(backupPath,'utf8'));
const { checksum, ...payload } = backup;
const actualChecksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if (backup.app !== 'SUNU MOYENNE' || backup.formatVersion !== 1 || checksum !== actualChecksum) {
  console.error('Sauvegarde invalide : application, version ou empreinte incorrecte.');
  process.exit(1);
}
if (!backup.tables || Object.keys(backup.tables).length !== tableOrder.length || tableOrder.some((table) => !Array.isArray(backup.tables[table]))) {
  console.error('Sauvegarde invalide : liste de tables inattendue.');
  process.exit(1);
}

const ssl = await getDbSslConfig();
const db = await mysql.createConnection({
  host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,
  password:process.env.DB_PASSWORD||'',database:dbName,...(ssl?{ssl}:{})
});
try {
  const [schemaRows] = await db.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (${tableOrder.map(()=>'?').join(',')})`,
    [dbName,...tableOrder]
  );
  const found = new Set(schemaRows.map((row)=>row.TABLE_NAME));
  if (tableOrder.some((table)=>!found.has(table))) throw new Error('Le schéma cible est incomplet. Installe d’abord le schéma de test.');

  const businessTables = ['school_years','classes','students','enrollments','teachers','subjects','terms','class_subjects','student_grades','teacher_class_access','teacher_activity_logs','audit_logs','admin_sessions','teacher_sessions'];
  for (const table of businessTables) {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM `' + table + '`');
    if (Number(rows[0].total) !== 0) throw new Error(`La table ${table} n’est pas vide. Restauration refusée pour éviter tout écrasement.`);
  }
  const [adminRows] = await db.execute('SELECT email,password_hash FROM admin_users');
  if (adminRows.some((row)=>row.password_hash !== null) || adminRows.length > 2) {
    throw new Error('Les comptes administrateurs de test ont déjà été initialisés. Utilise une base de test neuve.');
  }

  await db.beginTransaction();
  try {
    for (const table of tableOrder) {
      const rows = backup.tables[table];
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Ligne invalide dans ${table}.`);
        const columns = Object.keys(row);
        if (!columns.length || columns.some((column)=>!/^[_a-zA-Z0-9]+$/.test(column))) throw new Error(`Colonnes invalides dans ${table}.`);
        const values = columns.map((column)=>row[column]);
        const quotedColumns = columns.map((column)=>'`' + column + '`').join(',');
        const placeholders = columns.map(()=>'?').join(',');
        const updates = columns.filter((column)=>column!=='id' && !(table==='role_permissions' && ['role_id','permission_id'].includes(column)))
          .map((column)=>'`' + column + '`=VALUES(`' + column + '`)').join(',');
        const sql = 'INSERT INTO `' + table + '` (' + quotedColumns + ') VALUES (' + placeholders + ')' + (updates ? ' ON DUPLICATE KEY UPDATE ' + updates : '');
        await db.execute(sql,values);
      }
    }
    await db.commit();
    const verification = [];
    for (const table of tableOrder) {
      const [countRows] = await db.query('SELECT COUNT(*) AS total FROM `' + table + '`');
      const restored = Number(countRows[0].total);
      const expected = backup.tables[table].length;
      verification.push({ table, expected, restored });
      if (restored !== expected) throw new Error(`Vérification échouée pour ${table}: attendu ${expected}, restauré ${restored}.`);
    }
    console.log('Vérification post-restauration:', JSON.stringify(verification));
  } catch (error) { await db.rollback(); throw error; }
  console.log(`Restauration de test terminée dans ${dbName}. Les sessions actives n’ont pas été restaurées.`);
} finally {
  await db.end();
}
