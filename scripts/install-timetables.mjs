/* Installe (ou vérifie) le module « Emplois du temps » : database/migrations/timetables.sql
   Usage (PowerShell) :
     npm run check-timetables                      → lecture seule : vérifie la base visée et les prérequis
     $env:CONFIRM_TIMETABLE_INSTALL="YES"; npm run install-timetables
   Garde-fous :
   - refuse la base par défaut d'Aiven (defaultdb) et toute base système : le schéma SUNU MOYENNE n'y est jamais installé ;
   - n'accepte que sunu_moyenne_prod (avec l'utilisateur sunu_moyenne_app) ou une base de test (nom contenant « _test »),
     comme les autres scripts du projet. Autre nom : TIMETABLE_ALLOW_DB=<nom exact>. Jamais defaultdb ;
   - vérifie les prérequis AVANT d'écrire ; migration additive et idempotente (aucune donnée existante touchée). */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { getDbSslConfig } from '../db-ssl.js';

const CHECK_ONLY = process.argv.includes('--check');
const fail = (msg) => { console.error(`\nARRÊT : ${msg}\n`); process.exit(1); };

if (['DB_HOST', 'DB_USER', 'DB_NAME'].some((k) => !process.env[k])) fail('Configuration MySQL incomplète (DB_HOST, DB_USER, DB_NAME dans .env).');
const dbName = String(process.env.DB_NAME).trim();
const dbUser = String(process.env.DB_USER).trim();
const SYSTEM_DBS = ['defaultdb', 'information_schema', 'mysql', 'sys', 'performance_schema'];

console.log(`Base visée par .env : ${dbName} (utilisateur ${dbUser})`);
if (SYSTEM_DBS.includes(dbName.toLowerCase())) {
  fail(`DB_NAME="${dbName}" est une base par défaut/système : les tables de SUNU MOYENNE n'y existent pas et n'y seront jamais installées.\n` +
    `Mettez dans .env le nom de la base de l'application (en production : sunu_moyenne_prod avec DB_USER=sunu_moyenne_app, ou une base de test sunu_moyenne_test).`);
}
const isProd = dbName === 'sunu_moyenne_prod';
const isTest = dbName.toLowerCase().includes('_test');
const allowed = process.env.TIMETABLE_ALLOW_DB === dbName;
if (!isProd && !isTest && !allowed) fail(`Base "${dbName}" non reconnue (attendu : sunu_moyenne_prod ou une base contenant « _test »). Si c'est bien la bonne base : $env:TIMETABLE_ALLOW_DB="${dbName}".`);
if (isProd && dbUser !== 'sunu_moyenne_app') fail('En production, DB_USER doit être sunu_moyenne_app.');
if (!CHECK_ONLY && process.env.CONFIRM_TIMETABLE_INSTALL !== 'YES') fail('Confirmation manquante : définissez CONFIRM_TIMETABLE_INSTALL=YES (ou utilisez npm run check-timetables pour une simple vérification).');

const source = await readFile(new URL('../database/migrations/timetables.sql', import.meta.url), 'utf8');
const statements = source.replace(/^\s*--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean);
if (statements.length !== 6) fail(`6 instructions attendues, ${statements.length} trouvées.`);
if (!statements.every((s) => /^(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+timetable|INSERT\s+IGNORE\s+INTO\s+(permissions|role_permissions))/i.test(s))) fail('Instruction inattendue dans la migration.');

const ssl = await getDbSslConfig();
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: dbUser, password: process.env.DB_PASSWORD || '', database: dbName, ...(ssl ? { ssl } : {}) });
const names = async (sql, params = []) => (await db.execute(sql, params))[0];
try {
  const [[v]] = await db.query('SELECT VERSION() AS version, DATABASE() AS base, CURRENT_USER() AS compte');
  console.log(`Connecté : MySQL ${v.version} · base ${v.base} · compte ${v.compte}`);
  if (v.base !== dbName) fail(`La connexion est sur "${v.base}" au lieu de "${dbName}".`);

  /* 1. Prérequis : l'application doit déjà être installée dans CETTE base. */
  const need = ['classes', 'subjects', 'teachers', 'admin_users', 'roles', 'permissions', 'role_permissions'];
  const present = (await names(`SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()`)).map((r) => r.table_name);
  const missing = need.filter((n) => !present.includes(n));
  console.log(`Tables présentes dans ${dbName} : ${present.length}`);
  if (missing.length) {
    const elsewhere = await names(`SELECT DISTINCT TABLE_SCHEMA AS schema_name FROM information_schema.TABLES WHERE TABLE_NAME='classes' AND TABLE_SCHEMA NOT IN ('information_schema','mysql','sys','performance_schema')`);
    console.error(`\nPrérequis absents dans "${dbName}" : ${missing.join(', ')}.`);
    if (elsewhere.length) console.error(`Les tables de l'application existent dans : ${elsewhere.map((r) => r.schema_name).join(', ')} → corrigez DB_NAME (et DB_USER) dans .env.`);
    else console.error(`Aucune base accessible par ce compte ne contient la table « classes ». Le socle n'est pas installé : exécutez d'abord, dans cet ordre,\n  1) database/migrations/admin-system.sql (administration, rôles, permissions)\n  2) database/migrations/school-core.sql (années, classes, élèves, professeurs, matières, affectations)\nvia les scripts existants (install-test-schema pour une base de test, install-production-schema pour la production), puis relancez.`);
    fail('prérequis manquants — aucune écriture effectuée.');
  }
  const roles = (await names('SELECT name FROM roles')).map((r) => r.name);
  const noRole = ['principal', 'pedagogical'].filter((r) => !roles.includes(r));
  if (noRole.length) fail(`Rôles absents : ${noRole.join(', ')} (la migration admin-system.sql n'est pas complète). Aucune écriture effectuée.`);
  const uq = await names(`SELECT 1 AS ok FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND INDEX_NAME='uq_classes_id_year'`);
  if (!uq.length) fail("Index uq_classes_id_year absent de la table classes (school-core.sql incomplet) : la clé étrangère composite des emplois du temps ne peut pas être créée.");
  console.log('Prérequis : OK (7 tables, rôles principal et pedagogical, index classes/année).');

  const state = async () => {
    const t = (await names(`SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('timetables','timetable_sessions','timetable_documents')`)).map((r) => r.table_name);
    const p = (await names(`SELECT name FROM permissions WHERE name LIKE 'timetable.%' ORDER BY name`)).map((r) => r.name);
    const g = await names(`SELECT r.name AS role, COUNT(*) AS n FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id WHERE p.name LIKE 'timetable.%' GROUP BY r.name`);
    return { tables: t, perms: p, grants: Object.fromEntries(g.map((x) => [x.role, Number(x.n)])) };
  };
  const complete = (s) => s.tables.length === 3 && s.perms.length === 6 && s.grants.principal === 6 && s.grants.pedagogical === 5;
  const before = await state();
  console.log(`État actuel : tables ${before.tables.length}/3 · permissions ${before.perms.length}/6 · attributions ${JSON.stringify(before.grants)}`);
  if (CHECK_ONLY) { console.log(complete(before) ? 'Module Emplois du temps : installé et complet.' : 'Module Emplois du temps : non installé ou incomplet (lancez npm run install-timetables).'); process.exit(complete(before) ? 0 : 2); }

  /* 2. Installation (additive, idempotente). */
  for (let i = 0; i < statements.length; i++) { await db.query(statements[i]); console.log(`Instruction ${i + 1}/${statements.length} exécutée.`); }

  /* 3. Vérification réelle du résultat. */
  const after = await state();
  console.log(`Après installation : tables ${after.tables.join(', ')} · permissions ${after.perms.join(', ')} · attributions ${JSON.stringify(after.grants)}`);
  if (!complete(after)) fail("installation INCOMPLÈTE (voir l'état ci-dessus). Ne déployez pas avant d'avoir corrigé.");
  console.log('Installation terminée et vérifiée.');
} finally { await db.end(); }
