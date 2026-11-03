const BLOCKED_DIRECTORIES = new Set([
  '.git', '.vscode', 'node_modules', 'certs', 'database', 'backend',
  'backup', 'scripts', 'tests', 'data', 'extensions', 'security'
]);
const BLOCKED_FILES = new Set([
  'server.js', 'db-ssl.js', 'db-ssl.js.before-ssl-fix.bak',
  'package.json', 'package-lock.json', 'backup.html', 'admin/admin.js',
  'check_db.mjs', 'check_all_db.mjs', 'check_migration.js', 'replace_auth.py', 'fix_routes.py'
]);
const BLOCKED_EXTENSIONS = new Set(['.env', '.pem', '.key', '.sql', '.bak', '.log', '.md', '.txt', '.mjs', '.py', '.map']);

export function isPublicStaticPath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(String(pathname || '')); }
  catch { return false; }
  const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return true;
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.startsWith('.'))) return false;
  if (segments.some((segment) => BLOCKED_DIRECTORIES.has(segment.toLowerCase()))) return false;
  const relative = segments.join('/').toLowerCase();
  if (BLOCKED_FILES.has(relative)) return false;
  const filename = segments.at(-1).toLowerCase();
  if (filename === '.env' || filename.startsWith('.env.')) return false;
  const dot = filename.lastIndexOf('.');
  const extension = dot >= 0 ? filename.slice(dot) : '';
  if (BLOCKED_EXTENSIONS.has(extension)) return false;
  if (/^(?:check_|init-|install-)/i.test(filename) && /\.(?:mjs|js|py)$/.test(filename)) return false;
  return true;
}
