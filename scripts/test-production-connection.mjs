import 'dotenv/config';
import mysql from 'mysql2/promise';
import { getDbSslConfig } from '../db-ssl.js';

let db;

try {
  const ssl = await getDbSslConfig();

  console.log('Certificat SSL chargé :', Boolean(ssl?.ca));
  console.log('Vérification TLS :', ssl?.rejectUnauthorized);

  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    ssl,
    connectTimeout: 30000,
    enableKeepAlive: true
  });

 const [rows] = await db.query(`
  SELECT
    email,
    full_name,
    is_active,
    must_change_password,
    (password_hash IS NOT NULL) AS has_password
  FROM admin_users
  ORDER BY email
`);

console.log('COMPTES ADMINISTRATEURS :');
console.table(rows);
console.log('Nombre de comptes :', rows.length);

} catch (error) {
  console.error('ERREUR MYSQL :', error.code || error.name);
  console.error('Message :', error.message);

} finally {
  if (db) await db.end();
}