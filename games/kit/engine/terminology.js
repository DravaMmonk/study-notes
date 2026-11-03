// A game's glossary is its term registry. Definitions stay in body; aliases name the same entry, never a
// second explanation. This module checks data and literal references, not whether arbitrary prose is technical.
import { REF } from './text.js'

const sides = (v) => typeof v === 'string' ? { zh: v, en: v } : v ?? {}
const normal = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
const plain = (s) => String(s ?? '').replace(REF, '').replace(/<[^>]*>/g, '').trim()
const problem = (rule, at, says) => ({ rule, at, says })

/** Compile canonical names and aliases. The existing body is the only explanation. */
export function termRegistry(glossary) {
  const entries = new Map()
  const names = { zh: new Map(), en: new Map() }
  const failures = []
  for (const entry of glossary.entries) {
    const at = `glossary:${entry.id}`
    if (entries.has(entry.id)) failures.push(problem('term-id', at, 'duplicate entry id'))
    entries.set(entry.id, entry)
    for (const side of ['zh', 'en']) {
      if (!plain(sides(entry.title)[side])) failures.push(problem('term-name', `${at}.title.${side}`, 'the canonical name is empty'))
      if (!(entry.body ?? []).some((p) => plain(sides(p)[side]))) failures.push(problem('term-definition', `${at}.body.${side}`, 'the entry body has no explanatory text'))
      for (const [k, text] of [entry.title, ...(entry.aliases ?? [])].entries()) {
        const name = normal(sides(text)[side])
        const where = `${at}.${k ? `aliases[${k - 1}]` : 'title'}.${side}`
        if (!name) {
          if (k) failures.push(problem('term-name', where, 'an alias is empty'))
          continue
        }
        const previous = names[side].get(name)
        if (previous && previous !== entry.id) failures.push(problem('term-name-conflict', where, `“${name}” also names entry ${previous}`))
        else names[side].set(name, entry.id)
      }
    }
  }
  return { entries, names, failures }
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const LATIN = /[\p{Script=Latin}\p{N}_]/u

/** Longest literal names first. Latin word boundaries avoid matching "net" inside "network". */
function bareNames(text, names) {
  const hidden = text.replace(REF, (m) => ' '.repeat(m.length)).replace(/<[^>]*>/g, (m) => ' '.repeat(m.length))
  const occupied = []
  const found = new Set()
  for (const [name, id] of [...names].sort(([a], [b]) => b.length - a.length)) {
    for (const match of hidden.matchAll(new RegExp(escape(name).replace(/ +/g, String.raw`\s+`), 'giu'))) {
      const start = match.index
      const end = start + match[0].length
      if ((LATIN.test(name[0]) && LATIN.test(hidden[start - 1] ?? '')) ||
          (LATIN.test(name.at(-1)) && LATIN.test(hidden[end] ?? ''))) continue
      if (occupied.some(([a, b]) => start < b && end > a)) continue
      occupied.push([start, end])
      found.add(id)
    }
  }
  return found
}

/**
 * places: schema-declared player texts with {at, side, text, level?, entry?, label?}. before(a,b) is the course's
 * guaranteed prerequisite relation, not numeric/file order. Raw names are review candidates, never proof of misuse.
 */
export function termUsage(registry, places, before) {
  const failures = []
  const reports = []
  const available = (entry, level) => !entry.at || entry.at === level || Boolean(level && before(entry.at, level))
  for (const place of places) {
    if (place.description) {
      if (/<\/?(?:wiki|part|level)-ref\b/.test(place.text)) failures.push(problem('part-description-reference', place.at, 'component descriptions are plain text; write names without reference markup'))
      continue
    }
    if (/<\/?wiki-ref\b/.test(place.text.replace(REF, ''))) failures.push(problem('term-reference-format', place.at, 'malformed term reference; use a closed wiki-ref with a registered id'))
    const linked = new Set([...place.text.matchAll(REF)].filter((m) => m[1] === 'wiki').map((m) => m[2]))
    for (const id of linked) {
      const entry = registry.entries.get(id)
      if (!entry) failures.push(problem('term-reference', place.at, `the term ${id} is not registered in this game's glossary`))
      else if (!available(entry, place.level)) failures.push(problem('term-unavailable', place.at, `the explanation for ${id} opens at ${entry.at}, which is not available here`))
    }
    if (place.label) continue
    for (const id of bareNames(place.text, registry.names[place.side])) {
      if (id === place.entry || linked.has(id)) continue // Self-definitions and repeated mentions share the available entry or tag.
      const entry = registry.entries.get(id)
      reports.push({ ...problem('term-unlinked', place.at, `literal name/alias of ${id} without a term reference; check whether this is technical usage${available(entry, place.level) ? '' : ` (its explanation opens at ${entry.at})`}`), report: true })
    }
  }
  return { failures, reports }
}
