const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\admin/js\\students.import.js', 'utf-8');

// Remove export prefixes for top-level declarations
c = c.replace(/^export function/mg, 'function');
c = c.replace(/^export const /mg, 'const ');
c = c.replace(/^export const KNOWN_FIELDS/mg, 'const KNOWN_FIELDS');
c = c.replace(/^export const knownFieldKeys/mg, 'const knownFieldKeys');
c = c.replace(/^export async function/mg, 'async function');
c = c.replace(/^export function StudentsImportWizard/mg, 'function StudentsImportWizard');

// Remove the problematic console.warn line with map
c = c.replace(
  "console.warn('En-têtes non appariés dans l'import: ' + unmatchedHeaders.map(u => u.original).join(', '));",
  "console.warn('En-têtes non appariés dans l'import: ' + unmatchedHeaders.map(function(u) { return u.original; }).join(', '));"
);

try {
  new Function(c);
  console.log('Syntax OK');
} catch(e) {
  console.log('Error:', e.message);
  // Print the line where error occurs
  const lines = c.split('\n');
  for(let i = 0; i < lines.length; i++) {
    if(lines[i].includes('unmatchedHeaders') || lines[i].includes('.map(')) {
      console.log('Line ' + (i+1) + ':', lines[i].substring(0, 100));
    }
  }
}