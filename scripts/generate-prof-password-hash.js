import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const rl = createInterface({ input: stdin, output: stdout });
try {
  const password = await rl.question('Nouveau mot de passe professeur (saisie visible) : ');
  if (password.length < 14) {
    console.error('Choisissez au moins 14 caractères.');
    process.exitCode = 1;
  } else {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    console.log('\nValeur à enregistrer dans Render > Environment :');
    console.log(`PROF_PASSWORD_HASH=${salt.toString('hex')}:${hash.toString('hex')}`);
    console.log('\nNe publiez pas cette valeur et ne la committez pas dans Git.');
  }
} finally {
  rl.close();
}
