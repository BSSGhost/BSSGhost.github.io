
import mysql from 'mysql2/promise';
import { getDbSslConfig } from '../db-ssl.js';

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: await getDbSslConfig()
});

try {
  const [associations] = await db.query(`
    SELECT r.name AS role, COUNT(rp.permission_id) AS total
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    GROUP BY r.id, r.name
  `);

  const [admins] = await db.query(`
    SELECT email, password_hash IS NULL AS sans_mot_de_passe
    FROM admin_users
  `);

  const [tables] = await db.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);

  console.log('\n--- ASSOCIATIONS DES RÔLES ---');
  console.table(associations);

  console.log('\n--- COMPTES ADMINISTRATEURS ---');
  console.table(admins);

  console.log('\n--- TABLES PRÉSENTES ---');
  console.log(tables.map(t => t.TABLE_NAME));

  console.log('\nNombre total de tables :', tables.length);

} finally {
  await db.end();
}
