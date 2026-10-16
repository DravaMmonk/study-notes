// Circuit kit: the reading language, shared by every game in games/, by Fieldnotes and by the notes site (same
// storage key, so a choice made in one carries to the others). Without a stored choice the browser's language
// decides: any Chinese locale reads Chinese, everything else English.

export const LANGS = [['zh', '中文'], ['en', 'English']];
const KEY = 'fieldnotes.lang';

export function currentLang() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch { /* fall through to the browser language */ }
  return /^zh\b/i.test(navigator.language || '') ? 'zh' : 'en';
}

export const otherLang = l => (l === 'en' ? 'zh' : 'en');
export const langLabel = l => (LANGS.find(([id]) => id === l) || LANGS[0])[1];

/** Pick the string for the current language: tr('中文', 'English'). */
export const tr = (zh, en) => (currentLang() === 'en' ? en : zh);

/** Apply a language, remember it, mark <html lang>, and tell the page with a `langchange` event. */
export function applyLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* the language still applies for this visit */ }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  window.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}
