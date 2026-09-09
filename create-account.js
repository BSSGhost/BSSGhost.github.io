/* =========================================================
   SUNU MOYENNE — Gestion des comptes professeur
   ----------------------------------------------------------
   Créé, réinitialise, liste ou supprime les comptes de
   l'espace professeur (la base est la même que celle du
   serveur : data/lynaqe.db).

   Usage :
     node create-account.js add <username> [nom affiché]   (ou réinitialise le mot de passe)
     node create-account.js list
     node create-account.js remove <username>
   ========================================================= */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';

const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const DB_PATH = join(DATA_DIR, 'lynaqe.db');
const MIN_PASSWORD_LENGTH = 8;

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL DEFAULT '',
    role          TEXT    NOT NULL DEFAULT 'prof',
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    username   TEXT    NOT NULL REFERENCES users(username),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at INTEGER NOT NULL
  );
`);

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function hiddenQuestion(readline, question) {
  return new Promise((resolve) => {
    const origWrite = readline._writeToOutput;
    let first = true;
    readline._writeToOutput = (data) => {
      if (first) {
        first = false;
        origWrite.call(readline, data);
      } else {
        origWrite.call(readline, '*');
      }
    };
    readline.question(question, (answer) => {
      readline._writeToOutput = origWrite;
      readline.output.write('\n');
      resolve(answer.trim());
    });
  });
}

function prompt(readline, question, hide) {
  if (!hide) {
    return new Promise((resolve) => readline.question(question, (answer) => resolve(answer.trim())));
  }
  return hiddenQuestion(readline, question);
}

/* Saisie masquée sur terminal interactif (raw mode : écho remplacé par *). */
function hiddenPrompt(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let input = '';
    const onData = (char) => {
      char = String(char);
      if (char === '\u0003') {
        stdin.setRawMode(false);
        process.exit(130);
      }
      if (char === '\r' || char === '\n') {
        stdout.write('\n');
        cleanup();
        resolve(input);
        return;
      }
      if (char === '\u007f' || char === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }
      input += char;
      stdout.write('*');
    };
    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.pause();
    };
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

function readStdinText() {
  return new Promise((resolve) => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      text += chunk;
    });
    process.stdin.on('end', () => resolve(text));
  });
}

function validatePair(password, confirm) {
  const pass = String(password || '').trim();
  const conf = String(confirm || '').trim();
  if (pass.length < MIN_PASSWORD_LENGTH) {
    console.log(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
    process.exit(1);
  }
  if (pass !== conf) {
    console.log('Les deux mots de passe ne correspondent pas.');
    process.exit(1);
  }
  return pass;
}

async function readPassword() {
  if (process.stdin.isTTY) {
    console.log('Saisie du mot de passe :');
    const password = await hiddenPrompt(`  Mot de passe (min. ${MIN_PASSWORD_LENGTH} caractères) : `);
    const confirm = await hiddenPrompt('  Confirmez le mot de passe : ');
    return validatePair(password, confirm);
  }

  const text = await readStdinText();
  const values = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return validatePair(values[0] || '', values[1] || '');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(
      'Usage :\n' +
        '  node create-account.js add <username> [nom affiché]  — créer ou réinitialiser un compte\n' +
        '  node create-account.js list                          — lister les comptes\n' +
        '  node create-account.js remove <username>             — supprimer un compte'
    );
    process.exit(1);
  }

  if (command === 'list') {
    const users = db.prepare('SELECT username, name, role, created_at FROM users ORDER BY username').all();
    if (!users.length) {
      console.log('Aucun compte professeur pour le moment.');
      return;
    }
    console.log('Comptes professeur :');
    users.forEach((u) => {
      console.log(`  - ${u.username}${u.name ? ' (' + u.name + ')' : ''} [${u.role}], créé le ${u.created_at}`);
    });
    return;
  }

  if (command === 'remove') {
    const username = String(args[1] || '').trim().toLowerCase();
    if (!username) {
      console.log('Précisez le nom d\'utilisateur à supprimer.');
      process.exit(1);
    }
    const result = db.prepare('DELETE FROM users WHERE username = ?').run(username);
    db.prepare('DELETE FROM sessions WHERE username = ?').run(username);
    console.log(result.changes ? `Compte « ${username} » supprimé.` : `Aucun compte « ${username} ».`);
    return;
  }

  if (command === 'add') {
    const username = String(args[1] || '').trim().toLowerCase();
    if (!username) {
      console.log('Précisez le nom d\'utilisateur.');
      process.exit(1);
    }
    const name = String(args[2] || '').trim();

    const password = await readPassword();

    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ?, name = ? WHERE username = ?')
        .run(hashPassword(password), name, username);
      console.log(`Mot de passe de « ${username} » réinitialisé.`);
    } else {
      db.prepare('INSERT INTO users (username, name, role, password_hash) VALUES (?, ?, ?, ?)')
        .run(username, name, 'prof', hashPassword(password));
      console.log(`Compte « ${username} » créé.`);
    }
    return;
  }

  console.log(`Commande inconnue : « ${command} »`);
  process.exit(1);
}

main().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});