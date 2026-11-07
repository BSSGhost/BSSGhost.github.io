// Simple syntax check script
const fs = require('fs');
const path = 'C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\admin/js\\students.import.js';
const c = fs.readFileSync(path, 'utf-8');
console.log('File length:', c.length);
console.log('First 80 chars:', c.substring(0, 80));