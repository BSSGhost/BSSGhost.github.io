import fs from 'fs';
const sql = fs.readFileSync('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\database\\migrations\\admin-system.sql', 'utf8');
const checks = [
  ['File size', sql.length, 'chars'],
  ['Contains CREATE TABLE', sql.includes('CREATE TABLE')],
  ['Contains INSERT roles', sql.includes('INSERT IGNORE INTO roles')],
  ['Contains INSERT permissions', sql.includes('INSERT IGNORE INTO permissions')],
  ['Contains INSERT role_permissions', sql.includes('INSERT IGNORE INTO role_permissions')],
  ['Contains INSERT admin_users', sql.includes('INSERT IGNORE INTO admin_users')],
  ['Contains CREATE audit_logs', sql.includes('CREATE TABLE IF NOT EXISTS audit_logs')]
];

checks.forEach(([name, value, unit]) => {
  console.log(name + ':', value + (unit ? ' ' + unit : ''));
});