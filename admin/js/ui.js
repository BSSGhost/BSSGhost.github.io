/* Composants UI réutilisables : helpers, badges, états vides, modales, confirmations, toasts, pagination. */
import { icon } from './icons.js';

export const $ = (id) => document.getElementById(id);
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

export function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function relTime(v) {
  const d = new Date(v); if (Number.isNaN(d.getTime())) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return fmtDate(v);
}

export const badge = (text, tone = 'neutral') => `<span class="ui-badge ui-badge--${tone}">${esc(text)}</span>`;
export const statusBadge = (active, on = 'Actif', off = 'Inactif') => badge(active ? on : off, active ? 'green' : 'neutral');

export function empty(iconName, title, text = '', actionHtml = '') {
  return `<div class="ui-empty"><span class="ui-empty-icon">${icon(iconName)}</span><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${actionHtml}</div>`;
}
export const skeleton = (n = 4) => `<div class="ui-skel-wrap" aria-busy="true" aria-label="Chargement">${Array.from({ length: n }, () => '<div class="ui-skel"></div>').join('')}</div>`;

/* ---- Pagination ---- */
export function paginate(rows, page, size = 12) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { items: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length, from: rows.length ? (p - 1) * size + 1 : 0, to: Math.min(p * size, rows.length) };
}
export function pager(pg, key) {
  if (pg.total === 0) return '';
  return `<div class="ui-pager"><span>${pg.from}–${pg.to} sur ${pg.total}</span><div>
    <button type="button" class="ui-icon-btn" data-page="${key}:${pg.page - 1}" ${pg.page <= 1 ? 'disabled' : ''} aria-label="Page précédente">${icon('chevron-left')}</button>
    <span class="ui-pager-num">${pg.page} / ${pg.pages}</span>
    <button type="button" class="ui-icon-btn" data-page="${key}:${pg.page + 1}" ${pg.page >= pg.pages ? 'disabled' : ''} aria-label="Page suivante">${icon('chevron-right')}</button></div></div>`;
}

/* ---- Toasts ---- */
export function toast(message, type = 'success') {
  const host = $('toasts'); if (!host) return;
  const el = document.createElement('div');
  el.className = `ui-toast ui-toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'circle-x' : type === 'info' ? 'info' : 'circle-check')}<span>${esc(message)}</span>`;
  host.appendChild(el);
  const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 250); };
  setTimeout(remove, type === 'error' ? 6500 : 4000);
  el.addEventListener('click', remove);
}

/* ---- Modales (élément <dialog> natif : focus piégé, Échap, accessible) ---- */
export function modal({ title, body = '', footer = '', size = 'md', onClose }) {
  const dlg = document.createElement('dialog');
  dlg.className = `ui-modal ui-modal--${size}`;
  dlg.setAttribute('aria-labelledby', 'modal-title');
  dlg.innerHTML = `<div class="ui-modal-box"><header class="ui-modal-head"><h2 id="modal-title">${esc(title)}</h2><button type="button" class="ui-icon-btn" data-close aria-label="Fermer">${icon('x')}</button></header><div class="ui-modal-body">${body}</div>${footer ? `<footer class="ui-modal-foot">${footer}</footer>` : ''}</div>`;
  document.body.appendChild(dlg);
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
  dlg.addEventListener('close', () => { dlg.remove(); onClose?.(); });
  dlg.showModal();
  dlg.querySelector('input:not([type=hidden]),select,textarea')?.focus();
  return { el: dlg, close };
}

export function confirmDialog({ title, message, confirmText = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const m = modal({
      title, size: 'sm',
      body: `<p class="ui-confirm-text">${message}</p>`,
      footer: `<button type="button" class="ui-btn ui-btn--ghost" data-close>Annuler</button><button type="button" class="ui-btn ${danger ? 'ui-btn--danger' : 'ui-btn--primary'}" data-ok>${esc(confirmText)}</button>`,
      onClose: () => { if (!answered) resolve(false); }
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { answered = true; resolve(true); m.close(); });
  });
}

/* Modale de formulaire : gère l'état de chargement et l'erreur inline. */
export function formModal({ title, fields, submitLabel = 'Enregistrer', size = 'md', onSubmit, extraFooter = '' }) {
  const id = `fm-${Math.random().toString(36).slice(2, 8)}`;
  const m = modal({
    title, size,
    body: `<form id="${id}" class="ui-form" novalidate>${fields}<p class="ui-form-error" role="alert"></p></form>`,
    footer: `${extraFooter}<button type="button" class="ui-btn ui-btn--ghost" data-close>Annuler</button><button type="submit" form="${id}" class="ui-btn ui-btn--primary" data-submit><span class="ui-spin"></span><span>${esc(submitLabel)}</span></button>`
  });
  const form = m.el.querySelector('form'); const btn = m.el.querySelector('[data-submit]'); const err = form.querySelector('.ui-form-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    if (!form.checkValidity()) { form.reportValidity(); return; }
    btn.disabled = true; btn.classList.add('is-loading');
    try { await onSubmit(new FormData(form), m); }
    catch (error) { err.textContent = error.message || 'Une erreur est survenue.'; }
    finally { btn.disabled = false; btn.classList.remove('is-loading'); }
  });
  return m;
}

export const field = (label, control, hint = '') => `<label class="ui-field"><span class="ui-label">${esc(label)}</span>${control}${hint ? `<span class="ui-hint">${esc(hint)}</span>` : ''}</label>`;
export const input = (name, o = {}) => `<input class="ui-input" name="${name}" ${Object.entries(o).map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(' ')}>`;
export const select = (name, options, selected = '', attrs = '') => `<select class="ui-input" name="${name}" ${attrs}>${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;

/* ---- Graphique en barres SVG (données réelles uniquement) ---- */
export function barChart(items, { unit = '' } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const W = 560, H = 220, pad = 28, bw = Math.min(64, (W - pad * 2) / items.length - 18);
  const step = (W - pad * 2) / items.length;
  const bars = items.map((it, i) => {
    const h = Math.round((it.value / max) * (H - 70)); const x = pad + i * step + (step - bw) / 2; const y = H - 36 - h;
    return `<g class="ui-bar" style="--d:${i * 70}ms"><rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 2)}" rx="8"/><text class="ui-bar-val" x="${x + bw / 2}" y="${y - 8}" text-anchor="middle">${it.value}${unit}</text><text class="ui-bar-lab" x="${x + bw / 2}" y="${H - 14}" text-anchor="middle">${esc(it.label)}</text></g>`;
  }).join('');
  return `<svg class="ui-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique en barres"><line x1="${pad}" y1="${H - 36}" x2="${W - pad}" y2="${H - 36}" class="ui-axis"/>${bars}</svg>`;
}
