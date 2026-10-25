/* SUNU MOYENNE — migration de notes via MySQL */
(() => {
  const NOTE_PREFIX = 'lynaqe_moyennes_';
  const PROFILE_KEY = 'lynaqe_student_profile';
  const OBJECTIVE_KEY = 'sunu_moyenne_objectif_personnel';

  const $ = (id) => document.getElementById(id);
  const createBtn = $('migration-create-btn');
  const importBtn = $('migration-import-btn');
  const input = $('migration-input');
  const created = $('migration-created');
  const urlInput = $('migration-url');
  const copyBtn = $('migration-copy-btn');
  const qr = $('migration-qr');
  const status = $('migration-status');
  const expiry = $('migration-expiry');
  if (!createBtn || !importBtn || !input) return;

  function tLocal(key) {
    return typeof window.t === 'function' ? window.t(key) : key;
  }

  function setStatus(message, type = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `migration-status${type ? ` is-${type}` : ''}`;
  }

  function collectData() {
    const data = { notes: {}, profile: {}, objective: null };
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(NOTE_PREFIX)) {
        try { data.notes[key] = JSON.parse(localStorage.getItem(key)); } catch {}
      }
    }
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      if (profile && typeof profile === 'object') data.profile = profile;
    } catch {}
    const objective = localStorage.getItem(OBJECTIVE_KEY);
    if (objective !== null) data.objective = objective;
    return data;
  }

  function noteCount(data) {
    return Object.values(data.notes || {}).reduce((sum, raw) => {
      if (!raw || typeof raw !== 'object') return sum;
      return sum + Object.keys(raw).length;
    }, 0);
  }

  function restoreData(data) {
    if (!data || typeof data !== 'object') throw new Error('invalid');
    const notes = data.notes && typeof data.notes === 'object' ? data.notes : {};
    Object.entries(notes).forEach(([key, value]) => {
      if (!key.startsWith(NOTE_PREFIX) || !value || typeof value !== 'object') return;
      localStorage.setItem(key, JSON.stringify(value));
    });
    if (data.profile && typeof data.profile === 'object') {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
    }
    if (data.objective !== null && data.objective !== undefined) {
      localStorage.setItem(OBJECTIVE_KEY, String(data.objective));
    }
  }

  function extractCode(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw, window.location.origin);
      const fromQuery = parsed.searchParams.get('migration');
      if (fromQuery) return fromQuery;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('migration');
      if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
    } catch {}
    return raw.startsWith('SM-') ? raw : '';
  }

  function showCreated(result) {
    if (!created || !urlInput) return;
    urlInput.value = result.url;
    created.hidden = false;
    if (expiry && result.expiresAt) {
      const date = new Date(result.expiresAt);
      expiry.textContent = `${tLocal('migration_security_text')} (${date.toLocaleString()})`;
    }
    if (qr) {
      qr.replaceChildren();
      try {
        if (typeof qrcode === 'function') {
          const code = qrcode(0, 'M');
          code.addData(result.url);
          code.make();
          // SVG vectoriel : reste net à toute taille et garde sa zone de silence blanche
          qr.innerHTML = code.createSvgTag({ cellSize: 4, scalable: true });
          const svg = qr.querySelector('svg');
          if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', tLocal('migration_qr_help')); }
        }
      } catch (error) {
        console.warn('QR Code:', error);
      }
    }
  }

  createBtn.addEventListener('click', async () => {
    const data = collectData();
    if (!noteCount(data)) {
      setStatus(tLocal('migration_no_notes'), 'error');
      return;
    }
    createBtn.disabled = true;
    setStatus(tLocal('migration_importing'));
    try {
      const response = await fetch('/api/migration/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data })
      });
      const result = await response.json().catch(() => ({}));
      // 503 = MySQL absent/mal configuré ; 404/405 ou réponse non JSON = le serveur Node
      // (npm start) ne tourne pas derrière ce site (ex. hébergement statique, Live Server).
      if (!response.ok) throw new Error(response.status === 503 || response.status === 404 || response.status === 405 ? 'mysql' : (result.error || 'server'));
      showCreated(result);
      setStatus(tLocal('migration_created'), 'success');
    } catch (error) {
      // TypeError = fetch impossible (serveur éteint / réseau coupé)
      const serverDown = error instanceof TypeError || error.message === 'mysql';
      setStatus(serverDown ? tLocal('migration_server') : tLocal('migration_error'), 'error');
    } finally { createBtn.disabled = false; }
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      const old = copyBtn.textContent;
      copyBtn.textContent = tLocal('migration_copied');
      setTimeout(() => { copyBtn.textContent = old; }, 1600);
    } catch { urlInput.select(); document.execCommand('copy'); }
  });

  importBtn.addEventListener('click', async () => {
    const code = extractCode(input.value);
    if (!code) { setStatus(tLocal('migration_invalid'), 'error'); return; }
    importBtn.disabled = true;
    setStatus(tLocal('migration_importing'));
    try {
      const response = await fetch('/api/migration/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 503 || response.status === 405 || (response.status === 404 && !result.error)) throw new Error('mysql');
        if (response.status === 404 || response.status === 410) throw new Error('expired');
        throw new Error('server');
      }
      restoreData(result.data);
      if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged({ imported: noteCount(result.data) });
      setStatus(tLocal('migration_success'), 'success');
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setStatus(error.message === 'expired' ? tLocal('migration_expired') : (error.message === 'mysql' || error instanceof TypeError) ? tLocal('migration_server') : tLocal('migration_error'), 'error');
    } finally { importBtn.disabled = false; }
  });

  // Un lien /migration/SM-... est redirigé par le serveur vers /?migration=SM-...
  // On ouvre alors l'espace Migration, on préremplit le champ puis on nettoie l'URL.
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const migrationIndex = pathParts.indexOf('migration');
  const queryCode = new URLSearchParams(window.location.search).get('migration');
  const incomingCode = queryCode || (migrationIndex >= 0 && pathParts[migrationIndex + 1]
    ? decodeURIComponent(pathParts[migrationIndex + 1]) : '');
  if (incomingCode) {
    input.value = `${window.location.origin}/migration/${encodeURIComponent(incomingCode)}`;
    document.querySelector('.app-tab[data-target-screen="migration"]')?.click();
    try { history.replaceState(null, '', `${window.location.origin}/#migration`); } catch {}
  }
})();