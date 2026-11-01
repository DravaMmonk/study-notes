// The words of a blind play (./play.js), as plain text in one language: a game's text is { zh, en } pairs (or a
// domain's own self-rendering text, ../../shell/i18n.js), often HTML with links to levels, parts and encyclopedia
// entries (../../shell/refs.js). A player reads a link as the thing's name, which is what the page shows.

import { REF } from '../../shell/refs.js'

/** One side of a text: a pair's `lang` side, a domain's own text object as it renders, a string or number as it is. */
export function side(v, lang) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map((x) => side(x, lang)).join(' ')
  if (typeof v === 'object' && typeof v.zh === 'string') return String(lang === 'en' ? v.en ?? v.zh : v.zh)
  return String(v)
}

// The markup a game's text uses; anything else in angle brackets is words (a placeholder such as <name>).
const TAG = /<\/?(a|b|i|u|s|em|strong|code|kbd|sub|sup|small|span|div|p|ul|ol|li|br|hr|h\d|svg|path|g|rect|circle|line|mark|q|var)(\s[^>]*)?\/?>/gi

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', thinsp: ' ', middot: '·', times: '×', minus: '−', larr: '←', rarr: '→', hellip: '…' }

/**
 * A text as plain words: links read as the names they show (`names(kind, id)` → name or null), line breaks and
 * paragraphs become new lines, every other tag goes, entities are decoded.
 */
export function plain(v, lang, names = () => null) {
  return side(v, lang)
    .replace(REF, (_, kind, id) => `“${names(kind, id) ?? id}”`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(TAG, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Every reference of `kind` in a text (both sides), in order, once each. */
export function refsIn(v, kind) {
  const out = []
  const walk = (x) => {
    if (typeof x === 'string') {
      for (const m of x.matchAll(REF)) if (m[1] === kind && !out.includes(m[2])) out.push(m[2])
    } else if (Array.isArray(x)) x.forEach(walk)
    else if (x && typeof x === 'object') Object.values(x).forEach(walk)
  }
  walk(v)
  return out
}
