import 'dotenv/config';
import mysql from 'mysql2/promise';
import { getDbSslConfig } from '../db-ssl.js';

const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
if (required.some((key) => !process.env[key])) {
  console.error('Configuration DB incomplète : DB_HOST, DB_USER et DB_NAME sont requis.');
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
  database: process.env.DB_NAME,
  ...(ssl ? { ssl } : {})
});

try {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${expectedTables.map(() => '?').join(',')})`,
    expectedTables
  );
  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  console.log(`Base inspectée : ${process.env.DB_NAME}`);
  console.log('Vérification en lecture seule — aucune table ni donnée modifiée.');
  for (const table of expectedTables) {
    console.log(`${existing.has(table) ? '[EXISTE]' : '[ABSENTE]'} ${table}`);
    if (existing.has(table)) {
      const [columns] = await db.execute(
        `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
        [table]
      );
      for (const column of columns) console.log(`   - ${column.COLUMN_NAME}: ${column.COLUMN_TYPE}`);
    }
  }
  console.log('\nCette vérification ne remplace pas une sauvegarde et ne lance pas la migration SQL.');
} finally {
  await db.end();
}
