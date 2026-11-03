
import { readFile } from 'node:fs/promises';

function splitStatements(source) {
  return source
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

const files = [
  'database/migrations/admin-system.sql',
  'database/migrations/school-core.sql'
];

let allStatements = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  allStatements.push(...splitStatements(source));
}

console.log('Nombre total :', allStatements.length);

for (let i = 17; i < allStatements.length; i++) {
  console.log(`\n========== INSTRUCTION ${i + 1} ==========`);
  console.log(allStatements[i]);
}
