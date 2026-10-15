// Shared DOM, formatting and feedback helpers.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/** The desktop workbench layout (see styles.css). */
export const wide = () => matchMedia('(min-width: 1100px)').matches;
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } };
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const OPS = { sum: a => a.reduce((s, x) => s + x, 0), min: a => Math.min(...a), max: a => Math.max(...a) };
export const opLabel = { sum: '加起来', min: '取较小', max: '取较大' };

/** Number formatting for board cells; null renders empty. */
export const fmt = v => (v === Infinity ? '∞' : v === -Infinity ? '✗' : typeof v === 'number' ? v.toLocaleString('en-US') : v == null ? '' : String(v));
/** Signal formatting for circuit values: null is "no route", booleans are yes/no. */
export const signal = v => (v === null ? '—' : v === true ? '是' : v === false ? '否' : fmt(v));

export const ICON = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  part: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor"/><path d="M10.5 7h4.5a2 2 0 0 1 2 2v4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
  skip: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5v14l9-7zM13 5v14l9-7z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5 7.6 7.6 0 1 0 19.5 14.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  rail: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 4.5v15" stroke="currentColor" stroke-width="2"/></svg>',
  wire: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><circle cx="6" cy="5" r="2.4" fill="currentColor"/><circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 7.5c0 7 12 2 12 9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

let toastTimer = 0;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
