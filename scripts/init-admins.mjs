import 'dotenv/config';
import mysql from 'mysql2/promise';
import { getDbSslConfig } from '../db-ssl.js';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const initialPasswords = {
  principal: process.env.ADMIN_PRINCIPAL_INITIAL_PASSWORD,
  pedagogical: process.env.ADMIN_PEDAGOGICAL_INITIAL_PASSWORD
};
for (const [role, password] of Object.entries(initialPasswords)) {
  if (!password || password.length < 12 || password.length > 128) {
    console.error(`Définis ADMIN_${role.toUpperCase()}_INITIAL_PASSWORD (12 à 128 caractères).`);
    process.exit(1);
  }
}
if (initialPasswords.principal === initialPasswords.pedagogical) {
  console.error('Les deux administrateurs doivent avoir des mots de passe initiaux différents.');
  process.exit(1);
}
const dbName = String(process.env.DB_NAME || '');
if (process.env.ALLOW_ADMIN_INIT_TEST !== 'YES' || !/(?:^|[_-])(test|dev|local)(?:$|[_-])/i.test(dbName) || /^defaultdb$/i.test(dbName)) {
  console.error('Initialisation bloquée : cette version du script est réservée à une base de TEST.');
  process.exit(1);
}
const required = ['DB_HOST','DB_USER','DB_NAME'];
if (required.some(k => !process.env[k])) { console.error('Configuration DB incomplète (.env).'); process.exit(1); }
async function makeHash(value) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(value, salt, 64, { N:16384, r:8, p:1, maxmem:64*1024*1024 });
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;
}
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
  await db.beginTransaction();
  const accounts = [
    ['DEthiam@sunu-moyenne.com','DEthiam','principal',initialPasswords.principal],
    ['Colonelgueye@sunu-moyenne.com','Colonelgueye','pedagogical',initialPasswords.pedagogical]
  ];
  for (const [email,name,role,password] of accounts) {
    const hash = await makeHash(password);
    const [existing] = await db.execute('SELECT id,password_hash FROM admin_users WHERE LOWER(email)=LOWER(?) LIMIT 1',[email]);
    if (existing.length) {
      if (existing[0].password_hash) { console.log(`${email}: déjà initialisé, aucun changement effectué.`); continue; }
      await db.execute('UPDATE admin_users SET password_hash=?,must_change_password=TRUE,is_active=TRUE WHERE id=?',[hash,existing[0].id]);
    } else {
      const [roles] = await db.execute('SELECT id FROM roles WHERE name=?',[role]);
      if (!roles.length) throw new Error(`Rôle absent: ${role}. Applique d'abord la migration sur la base de test.`);
      await db.execute('INSERT INTO admin_users (email,full_name,password_hash,role_id,is_active,must_change_password) VALUES (?,?,?,?,TRUE,TRUE)',[email,name,hash,roles[0].id]);
    }
    console.log(`${email}: initialisé (changement obligatoire à la première connexion).`);
  }
  await db.commit();
} catch (error) {
  try { await db.rollback(); } catch {}
  throw error;
} finally { await db.end(); }
