import { OBJECT_SCHEMAS } from '../objects.js'
// Search across a game's content, and replace as operations (games/DESIGN.md 7.1). What is searched: every localized text
// of the levels, game.json and the encyclopedia (each side on its own; a link tag is never matched inside, so a
// replace cannot break one), every line of every board, and the ids of levels and entries. A replace is never an edit
// of its own: it is the operations that make it — text.set for each language it changes, level.blueprint with the board's
// new text — for a changeset to preview, check and apply like any other. Ids are found, never replaced (ids cannot change). Node-safe and browser-safe: the studio searches as one types with this
// module, and the MCP's search and replace tools (tools.js) are this module too.
//
//   query: { find, regex?, caseSensitive?, word?, kinds?: ['text', 'board', 'id'] }
//   a hit: { file, level?, in?, path, kind, side?, line?, text (the string searched), at: [[start, end]…] }
import { PARTS_FILE } from '../parts/schema.js'
import { find } from '../schema.js'
import { textEntries } from '../i18n.js'
import { ENTRY } from '../vocabulary.js'

const REF_TAG = /<(level|part|wiki)-ref to="[^"]+"><\/\1-ref>/g
const KINDS = ['text', 'board', 'id']

/** The query as a global regular expression, or null when there is nothing to find (or the pattern does not read). */
export function patternOf({ find: what, regex = false, caseSensitive = false }) {
  if (!what) return null
  try {
    return new RegExp(regex ? what : what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), `gu${caseSensitive ? '' : 'i'}`)
  } catch {
    return null
  }
}

const WORD = /[\p{L}\p{N}_]/u
/** Whether a match stands as a whole word (`word` asked): no letter, digit or _ right before or after it. */
const whole = (text, start, end, word) => !word || (!WORD.test(text[start - 1] ?? '') && !WORD.test(text[end] ?? ''))

/** The spans of `text` that are link tags: a match overlapping one is not a match. */
const tagSpans = (text) => [...text.matchAll(REF_TAG)].map((m) => [m.index, m.index + m[0].length])
const inTag = (spans, start, end) => spans.some(([a, b]) => start < b && end > a)

/** The matches of `re` in `text` outside link tags: [[start, end]…]. */
function spansIn(re, text, tags = true, word = false) {
  const spans = tags ? tagSpans(text) : []
  const out = []
  re.lastIndex = 0
  for (const m of text.matchAll(re)) {
    if (!m[0].length) continue
    if (!inTag(spans, m.index, m.index + m[0].length) && whole(text, m.index, m.index + m[0].length, word)) out.push([m.index, m.index + m[0].length])
  }
  return out
}

/**
 * The places of a content that can be searched, in play order: [{ file, level?, in?, path, kind, side?, line?, text }].
 * `vocabulary`: the game's (its level and game schemas say where texts and boards are).
 */
export function searchable(content, vocabulary, kinds = KINDS) {
  const out = []
  const texts = (value, schema, at, prefix = []) => {
    for (const { path: ownPath, value: v } of find(schema, value, 'text', { vocabulary })) {
      const path = [...prefix, ...ownPath]
      if (typeof v === 'string') out.push({ ...at, path, kind: 'text', text: v })
      else for (const [side, text] of textEntries(v)) out.push({ ...at, path, kind: 'text', side, text })
    }
  }
  const { id: _g, levels, glossary, vocabulary: _v, open: _o, blueprint: _b, partDefs, ...game } = content
  for (const { id, ...level } of levels) {
    const at = { file: `levels/${id}.json`, level: id }
    if (kinds.includes('id')) out.push({ ...at, path: [], kind: 'id', text: id })
    if (kinds.includes('text')) texts(level, vocabulary.level, at)
    if (kinds.includes('board')) {
      for (const { path, value } of find(vocabulary.level, level, 'board', { vocabulary })) {
        value.forEach((line, k) => out.push({ ...at, path, kind: 'board', line: k, text: line }))
      }
    }
  }
  if (kinds.includes('text')) {
    texts(game, vocabulary.game, { file: 'game.json', in: 'game' })
    for (const { id, group: _group, ...entry } of glossary.entries) texts(entry, ENTRY, { file: `entries/${id}.json`, entry: id })
    for (const [name, tag] of Object.entries(content.tags ?? {})) if (tag.kind === 'entry') texts(tag, OBJECT_SCHEMAS.tags, { file: `tags/${tag.kind}/${name}.json`, tag: name })
    for (const [id, piece] of Object.entries(partDefs?.parts ?? {})) texts(piece, PARTS_FILE.fields.parts.of, { file: `pieces/${id}.json`, in: 'pieces' }, ['parts', id])
  }
  if (kinds.includes('id')) glossary.entries.forEach((e) => out.push({ file: `entries/${e.id}.json`, entry: e.id, path: [], kind: 'id', text: e.id }))
  return out
}

/** Every hit of `query` in a content: the searchable places with at least one match, each with its matches (`at`). */
export function searchContent(content, vocabulary, query) {
  const re = patternOf(query)
  if (!re) return []
  const hits = []
  for (const place of searchable(content, vocabulary, query.kinds ?? KINDS)) {
    const at = spansIn(re, place.text, place.kind === 'text', query.word)
    if (at.length) hits.push({ ...place, at })
  }
  return hits
}

/** `replacement` for one match, as String.prototype.replace reads it for a pattern ($&, $1…, $$), or as it is. */
const expand = (replacement, m, regex) => (regex
  ? replacement.replace(/\$(\$|&|\d{1,2})/g, (_, k) => (k === '$' ? '$' : k === '&' ? m[0] : m[Number(k)] ?? ''))
  : replacement)

/** `text` with every match of the query outside link tags replaced (`only`: the indices of the matches to replace). */
export function replaced(text, query, replacement, { tags = true, only = null } = {}) {
  const re = patternOf(query)
  if (!re) return text
  const spans = tags ? tagSpans(text) : []
  let k = -1
  return text.replace(re, (...args) => {
    const groups = typeof args.at(-1) === 'object' ? args.slice(0, -3) : args.slice(0, -2)
    const offset = typeof args.at(-1) === 'object' ? args.at(-3) : args.at(-2)
    const match = args[0]
    if (!match.length || inTag(spans, offset, offset + match.length) || !whole(text, offset, offset + match.length, query.word)) return match
    k += 1
    if (only && !only.includes(k)) return match
    return expand(replacement, groups, query.regex)
  })
}

const key = (hit) => JSON.stringify([hit.file, hit.path])

/**
 * The operations that replace the query's matches with `replacement` (`pick`: the hits to replace, as `${file}|${path}|
 * ${side or line}` keys; all by default). One text.set per language field, one level.blueprint per
 * board. Returns { ops, changes: [{ file, level?, path, kind, side?, line?, before, after }], skipped: [hit] } — the
 * ids found, which a replace leaves alone.
 */
export function replaceOps(content, vocabulary, query, replacement, pick = null) {
  const hits = searchContent(content, vocabulary, query)
  const chosen = (h) => !pick || pick.includes(hitKey(h))
  const changes = []
  const texts = []
  const boards = new Map()
  const skipped = []
  for (const hit of hits) {
    if (hit.kind === 'id') { skipped.push(hit); continue }
    if (!chosen(hit)) continue
    const after = replaced(hit.text, query, replacement, { tags: hit.kind === 'text' })
    if (after === hit.text) continue
    changes.push({ file: hit.file, ...(hit.level !== undefined && { level: hit.level }), path: hit.path, kind: hit.kind, ...(hit.side && { side: hit.side }), ...(hit.line !== undefined && { line: hit.line }), before: hit.text, after })
    if (hit.kind === 'text') {
      texts.push({ op: 'text.set', ...(hit.level !== undefined ? { level: hit.level } : hit.entry !== undefined ? { entry: hit.entry } : hit.tag !== undefined ? { tag: hit.tag } : { in: hit.in }), path: hit.path,
        ...(hit.side ? { lang: hit.side } : {}), value: after })
    } else {
      const lines = boards.get(key(hit)) ?? { level: hit.level, path: hit.path, lines: [...levelAt(content, hit.level, hit.path)] }
      lines.lines[hit.line] = after
      boards.set(key(hit), lines)
    }
  }
  const ops = [...texts, ...[...boards.values()].map((b) => ({ op: 'level.blueprint', level: b.level, path: b.path, text: b.lines.join('\n') }))]
  return { ops, changes, skipped }
}

/** What a hit is called when picking which to replace: its file, path and side (or board line). */
export const hitKey = (hit) => `${hit.file}|${JSON.stringify(hit.path)}|${hit.side ?? hit.line ?? ''}`

const levelAt = (content, level, path) => path.reduce((v, k) => v?.[k], content.levels.find((l) => l.id === level))
