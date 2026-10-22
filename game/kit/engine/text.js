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

const REF = /<level-ref to="([^"]+)"><\/level-ref>/g
// Ways of pointing at another level without a link: by position, or 「its title」 followed by 那一关.
const POINTING = { zh: /上一关|下一关|前一关|(?<!最)后一关|前两关|前几关|」那一?关/, en: /\b(the last|previous|next|earlier) levels?\b|\blevel on how\b/i }

/**
 * Problems with references to other levels inside `value` (../shell/levelRef.js), each as '<path> …': a reference is
 * written <level-ref to="id"></level-ref>, names a level of the game, and stands on both sides of a pair; a level is
 * never pointed at by position ("上一关", "the last level") or by 「its title」. levels: the game's levels;
 * quotes: titles that are also the names of parts or ideas, which may be quoted. Inside a level (or an object keyed
 * by a level's id), quoting that level's own title is fine.
 */
export function levelRefProblems(value, path, levels, quotes = [], owner = null, out = [], visited = new Set()) {
  const ids = new Set(levels.map((l) => l.id))
  const titles = new Map(levels.map((l) => [String(l.title?.zh ?? ''), l.id]))
  const refs = (s) => [...String(s).matchAll(REF)].map((m) => m[1]).sort().join(' ')
  const check = (zh, en, at, owner) => {
    for (const id of refs(zh).split(' ').filter(Boolean)) if (!ids.has(id)) out.push(`${at} refers to a missing level: ${id}`)
    if (refs(zh) !== refs(en)) out.push(`${at} has different level references in Chinese and English: ${String(zh).slice(0, 40)}`)
    const pointing = String(zh).match(POINTING.zh)?.[0] ?? String(en).match(POINTING.en)?.[0]
    if (pointing) out.push(`${at} points at a level without a link (${pointing}): ${String(zh).slice(0, 50)}`)
    for (const m of String(zh).matchAll(/「([^」]{1,24})」/g)) {
      const id = titles.get(m[1])
      if (id && id !== owner && !quotes.includes(m[1])) out.push(`${at} quotes the title of ${id} instead of linking it: 「${m[1]}」`)
    }
  }
  const walk = (v, at, own) => {
    if (!v || typeof v !== 'object' || visited.has(v) || ArrayBuffer.isView(v)) return
    visited.add(v)
    if (isPair(v)) return check(v.zh, v.en, at, own)
    const self = ids.has(v.id) && v.title ? v.id : own
    for (const [key, inner] of Object.entries(v)) if (!SKIP.has(key)) walk(inner, `${at}.${key}`, ids.has(key) ? key : self)
  }
  walk(value, path, owner)
  return out
}
