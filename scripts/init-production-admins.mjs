import 'dotenv/config';
import mysql from 'mysql2/promise';
import { getDbSslConfig } from '../db-ssl.js';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const EXPECTED_DB = 'sunu_moyenne_prod';
const EXPECTED_USER = 'sunu_moyenne_app';

const accounts = [
  {
    email: 'DEthiam@sunu-moyenne.com',
    name: 'DEthiam',
    role: 'principal',
    password: process.env.ADMIN_PRINCIPAL_INITIAL_PASSWORD
  },
  {
    email: 'Colonelgueye@sunu-moyenne.com',
    name: 'Colonelgueye',
    role: 'pedagogical',
    password: process.env.ADMIN_PEDAGOGICAL_INITIAL_PASSWORD
  }
];

function stop(message) {
  console.error(`\nINITIALISATION BLOQUÉE : ${message}`);
  process.exitCode = 1;
}

if (process.env.CONFIRM_PRODUCTION_ADMINS !== 'YES') {
  stop('Confirmation CONFIRM_PRODUCTION_ADMINS=YES obligatoire.');
} else if (
  process.env.DB_NAME !== EXPECTED_DB ||
  process.env.DB_USER !== EXPECTED_USER
) {
  stop('La base ou le compte MySQL ne correspond pas à la production attendue.');
} else if (process.env.DB_SSL !== 'true') {
  stop('DB_SSL doit être égal à true.');
} else if (!process.env.DB_PASSWORD) {
  stop('Mot de passe MySQL absent.');
} else if (accounts.some(a =>
  !a.password || a.password.length < 12 || a.password.length > 128
)) {
  stop('Les deux mots de passe doivent comporter entre 12 et 128 caractères.');
} else if (accounts[0].password === accounts[1].password) {
  stop('Les deux mots de passe doivent être différents.');
} else {
  let db;

  try {
    const ssl = await getDbSslConfig();

    if (!ssl || ssl.rejectUnauthorized !== true) {
      throw new Error('Configuration SSL sécurisée absente ou invalide.');
    }

    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl
    });

    const [identity] = await db.execute(
      'SELECT DATABASE() AS db, CURRENT_USER() AS account'
    );

    if (
      identity[0].db !== EXPECTED_DB ||
      !identity[0].account.startsWith(`${EXPECTED_USER}@`)
    ) {
      throw new Error('Identité réelle de la connexion incorrecte.');
    }

    console.log('Connexion de production vérifiée.');

    await db.beginTransaction();

    const [existing] = await db.execute(
      'SELECT COUNT(*) AS total FROM admin_users'
    );

    if (Number(existing[0].total) !== 0) {
      throw new Error(
        'La table admin_users n’est pas vide. Aucun compte ne sera modifié.'
      );
    }

    const roleIds = {};

    for (const role of ['principal', 'pedagogical']) {
      const [rows] = await db.execute(
        'SELECT id FROM roles WHERE name = ? LIMIT 1',
        [role]
      );

      if (rows.length !== 1) {
        throw new Error(`Rôle absent ou ambigu : ${role}.`);
      }

      roleIds[role] = rows[0].id;
    }

    for (const account of accounts) {
      const salt = randomBytes(16).toString('hex');

      const key = await scrypt(
        account.password,
        salt,
        64,
        {
          N: 16384,
          r: 8,
          p: 1,
          maxmem: 64 * 1024 * 1024
        }
      );

      const hash = `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;

      await db.execute(
        `INSERT INTO admin_users
          (email, full_name, password_hash, role_id,
           is_active, must_change_password)
         VALUES (?, ?, ?, ?, TRUE, TRUE)`,
        [account.email, account.name, hash, roleIds[account.role]]
      );

      console.log(`Compte créé : ${account.email}`);
    }

    const [verification] = await db.execute(
      `SELECT
         u.email,
         r.name AS role,
         u.is_active,
         u.must_change_password,
         (u.password_hash IS NOT NULL) AS has_password
       FROM admin_users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.email`
    );

    if (
      verification.length !== 2 ||
      verification.some(u =>
        !u.is_active ||
        !u.must_change_password ||
        !u.has_password
      )
    ) {
      throw new Error('La vérification finale des comptes a échoué.');
    }

    await db.commit();

    console.log('\nINITIALISATION RÉUSSIE.');
    console.table(verification);

  } catch (error) {
    if (db) {
      try {
        await db.rollback();
      } catch {}
    }

    console.error('\nÉCHEC :', error.message);
    process.exitCode = 1;

  } finally {
    if (db) {
      await db.end();
    }
  }
}