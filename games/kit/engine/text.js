// References inside the text a player reads (../shell/refs.js). Circuits (solution, naive, alsoFails…) hold no text
// and are skipped.
import { isPair } from '../shell/i18n.js'

const SKIP = new Set(['solution', 'naive', 'alsoFails'])

export const REF = /<(level|part|wiki)-ref to="([^"]+)"><\/\1-ref>/g
/** The references (as kind:id) `other` holds more often than `text`: what one side of a pair still lacks. */
export function lacking(other, text) {
  const count = new Map()
  for (const m of String(text).matchAll(REF)) count.set(`${m[1]}:${m[2]}`, (count.get(`${m[1]}:${m[2]}`) ?? 0) + 1)
  const out = []
  for (const m of String(other).matchAll(REF)) {
    const v = `${m[1]}:${m[2]}`
    if (count.get(v)) count.set(v, count.get(v) - 1)
    else if (!out.includes(v)) out.push(v)
  }
  return out
}
// Ways of pointing at another level without a link: by position, or 「its title」 followed by 那一关.
const POINTING = { zh: /上一关|下一关|前一关|(?<!最)后一关|前两关|前几关|」那一?关/, en: /\b(the last|previous|next|earlier) levels?\b|\blevel on how\b/i }
const WHAT = { level: 'level', part: 'part', wiki: 'encyclopedia entry' }

/**
 * Problems with references inside `value` (../shell/refs.js), each as '<path> …'. A reference is written
 * <level-ref to="id">, <part-ref to="key"> or <wiki-ref to="id"> (closed at once) and names something the game has;
 * whether a translation keeps its text's links is the overlay's to answer (./i18n.js). A level is never pointed at by position ("上一关", "the last level"), and no level,
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
