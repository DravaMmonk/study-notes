// Every piece of text a player reads is a { zh, en } pair with a real English side (../shell/i18n.js). A Chinese
// string outside a pair has no English. Circuits (solution, naive, alsoFails…) hold no text and are skipped, and so
// are functions (computed text is checked where it is written).
import { isPair } from '../shell/i18n.js'

const HAN = /\p{Script=Han}/u
const SKIP = new Set(['solution', 'naive', 'alsoFails'])

/** Problems with the text inside `value`, each as '<path> …'. */
export function untranslated(value, path, out = [], visited = new Set()) {
  if (typeof value === 'string') {
    if (HAN.test(value)) out.push(`${path} has no English: ${value.slice(0, 40)}`)
    return out
  }
  if (!value || typeof value !== 'object' || visited.has(value) || ArrayBuffer.isView(value)) return out
  visited.add(value)
  if (isPair(value)) {
    if (typeof value.en !== 'string' || !value.en.trim()) out.push(`${path} has an empty English side: ${String(value.zh).slice(0, 40)}`)
    else if (HAN.test(value.en)) out.push(`${path} has Chinese in its English side: ${value.en.slice(0, 40)}`)
    return out
  }
  for (const [key, inner] of Object.entries(value)) if (!SKIP.has(key)) untranslated(inner, `${path}.${key}`, out, visited)
  return out
}

export const REF = /<(level|part|wiki)-ref to="([^"]+)"><\/\1-ref>/g
// Ways of pointing at another level without a link: by position, or 「its title」 followed by 那一关.
const POINTING = { zh: /上一关|下一关|前一关|(?<!最)后一关|前两关|前几关|」那一?关/, en: /\b(the last|previous|next|earlier) levels?\b|\blevel on how\b/i }
const WHAT = { level: 'level', part: 'part', wiki: 'encyclopedia entry' }

/**
 * Problems with references inside `value` (../shell/refs.js), each as '<path> …'. A reference is written
 * <level-ref to="id">, <part-ref to="key"> or <wiki-ref to="id"> (closed at once), names something the game has, and
 * stands on both sides of a pair. A level is never pointed at by position ("上一关", "the last level"), and no level,
 * part or entry by 「its name」 instead of a link.
 * names: { level, part, wiki }, each a Map from id to its Chinese name; quotes: names that may stay quoted (a level
 * title that is also the name of an idea). An object with an `id` and a title or name is that thing: quoting its own
 * name inside it is fine.
 */
export function refProblems(value, path, names, quotes = [], out = [], visited = new Set()) {
  const byName = new Map()
  for (const kind of ['wiki', 'level', 'part']) for (const [id, name] of names[kind]) byName.set(name, { kind, id })
  const own = new Set(Object.values(names).flatMap((m) => [...m.keys()]))
  const refs = (s) => [...String(s).matchAll(REF)].map((m) => `${m[1]}:${m[2]}`).sort().join(' ')
  const check = (zh, en, at, owner) => {
    for (const r of refs(zh).split(' ').filter(Boolean)) {
      const [kind, id] = [r.slice(0, r.indexOf(':')), r.slice(r.indexOf(':') + 1)]
      if (!names[kind].has(id)) out.push(`${at} refers to a missing ${WHAT[kind]}: ${id}`)
    }
    if (refs(zh) !== refs(en)) out.push(`${at} has different references in Chinese and English: ${String(zh).slice(0, 40)}`)
    const pointing = String(zh).match(POINTING.zh)?.[0] ?? String(en).match(POINTING.en)?.[0]
    if (pointing) out.push(`${at} points at a level without a link (${pointing}): ${String(zh).slice(0, 50)}`)
    for (const m of String(zh).matchAll(/「([^」]{1,24})」/g)) {
      const it = byName.get(m[1])
      if (it && it.id !== owner && !quotes.includes(m[1])) out.push(`${at} quotes the name of ${WHAT[it.kind]} ${it.id} instead of linking it: 「${m[1]}」`)
    }
  }
  const walk = (v, at, mine) => {
    if (!v || typeof v !== 'object' || visited.has(v) || ArrayBuffer.isView(v)) return
    visited.add(v)
    if (isPair(v)) return check(v.zh, v.en, at, mine)
    const self = own.has(v.id) && (v.title || v.name) ? v.id : own.has(v.key) && v.name ? v.key : mine
    for (const [key, inner] of Object.entries(v)) if (!SKIP.has(key)) walk(inner, `${at}.${key}`, own.has(key) ? key : self)
  }
  walk(value, path, null)
  return out
}
