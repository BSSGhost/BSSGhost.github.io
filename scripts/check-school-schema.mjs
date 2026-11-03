import 'dotenv/config';
import mysql from 'mysql2/promise';
import { getDbSslConfig } from '../db-ssl.js';

const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
if (required.some((key) => !process.env[key])) {
  console.error('Configuration MySQL incomplète.');
  process.exit(1);
}

const expected = [
  'school_years', 'classes', 'students', 'enrollments', 'teachers',
  'subjects', 'terms', 'class_subjects', 'student_grades', 'teacher_sessions', 'teacher_class_access', 'teacher_activity_logs'
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
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (${expected.map(() => '?').join(',')})`,
    [process.env.DB_NAME, ...expected]
  );
  const found = new Set(rows.map((row) => row.TABLE_NAME));
  console.log(`Base vérifiée : ${process.env.DB_NAME}`);
  for (const table of expected) console.log(`${found.has(table) ? '[OK]' : '[ABSENTE]'} ${table}`);
  console.log(`\nRésultat : ${found.size}/${expected.length} tables métier présentes.`);
  if (found.size !== expected.length) process.exitCode = 2;
} finally {
  await db.end();
}
