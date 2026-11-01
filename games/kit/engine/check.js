/* global process */
// npm run check [-- <game id>…] — every game against the rules every game follows: a data game's content against its
// domain's vocabulary (./vocabulary.js), the course audit (../course.js), the level count on the hub (../../games.js),
// unique level ids that require only real levels, every text a { zh, en } pair with a real English side, and then its
// domain's own checks (reference answers pass, naive ones fail, …).
//
// A game is checked through its spec, which runs under node:
//   { id, domain, title, course, levels, texts?, quotes?, audit?() → [{ rule, level, part, text? }] }
// A data game's spec comes from its domain (../domains/<domain>/domain.js: { vocabulary, spec(content),
// validate(spec) }), over its content read from disk (./content-node.js); a game not yet moved to data exports it from
// games/<id>/spec.js, and its domain's checks from ../domains/<domain>/validate.js.
// `texts` are the objects whose strings a player reads (levels are always included); `quotes` the level titles that
// are also names of parts or ideas, which a text may quote (any other reference to a level, part or encyclopedia
// entry is a link, ../shell/refs.js);
// `audit` adds the game's own course problems to the shared audit's. A data game's game.json may leave findings open
// (`open`, the work list in its design doc): they are listed, not failed, and one met since fails until it is dropped.
import { GAMES } from '../../games.js'
import { RULE_TEXT, againstOpen, audit } from '../course.js'
import { REF, refProblems, untranslated } from './text.js'
import { closeGames, loadGame } from './games.mjs'
import { isDataGame, readContent } from './content-node.js'
import { checkContent } from './vocabulary.js'

/** A game's spec and its domain's checks, and whatever is wrong with its content as data. */
async function specOf(id) {
  if (!isDataGame(id)) {
    const spec = (await import(`../../${id}/spec.js`)).default
    return { spec, validate: (await import(`../domains/${spec.domain}/validate.js`)).validate, content: [] }
  }
  const content = readContent(id)
  const domain = (await import(`../domains/${content.domain}/domain.js`)).default
  const wrong = checkContent(domain.vocabulary, content)
  // Content that does not fit the vocabulary is not built into a course: what is wrong with it is all there is to say.
  return { spec: wrong.length ? null : domain.spec(content), validate: domain.validate, content: wrong, title: content.title, open: content.open ?? {} }
}

const asked = process.argv.slice(2)
const ids = asked.length ? asked : GAMES.map((game) => game.id)
let problems = 0

for (const id of ids) {
  const { spec, validate, content, title, open } = await specOf(id)
  const lines = []
  const fail = (text) => {
    problems++
    lines.push(`FAIL ${text}`)
  }
  for (const p of content) fail(`content: ${p.at}: ${p.says}`)
  if (!spec) {
    console.log(`\n${title.zh} ${title.en}`)
    for (const line of lines) console.log(`  ${line}`)
    continue
  }

  for (const { rule, fresh, left, gone } of againstOpen([...audit(spec.course), ...(spec.audit?.() ?? [])], open)) {
    const text = RULE_TEXT[rule]
    if (!text) { fail(`game.json.open: ${rule} is no rule of the audit`); continue }
    if (fresh.length) fail(`course: ${text} (${fresh.length}): ${fresh.join('  ')}`)
    if (gone.length) fail(`course: left open in game.json, but met now (${rule}): drop ${gone.join('  ')}`)
    if (left.length) lines.push(`OPEN course: ${text} (${left.length}, on the game's work list): ${left.join('  ')}`)
  }

  const listed = GAMES.find((game) => game.id === id).levels
  if (listed !== spec.levels.length) fail(`hub: games.js lists ${listed} levels, the game has ${spec.levels.length}`)

  const seen = new Set()
  for (const level of spec.levels) {
    if (seen.has(level.id)) fail(`${level.id}: duplicate id`)
    seen.add(level.id)
    for (const r of level.requires ?? []) if (!spec.levels.some((l) => l.id === r)) fail(`${level.id}: requires missing level ${r}`)
  }

  for (const [name, value] of Object.entries({ levels: spec.levels, ...(spec.texts ?? {}) })) for (const problem of untranslated(value, name)) fail(`text ${problem}`)
  // References to levels, parts and entries: the names come from the game as the shell gets it.
  const game = await loadGame(id)
  const names = {
    level: new Map(game.levels.map((l) => [l.id, String(l.title?.zh ?? l.title)])),
    part: new Map((game.parts?.all ?? []).map((p) => [p.key, String(p.name?.zh ?? p.name)])),
    wiki: new Map((game.glossary?.entries ?? []).map((e) => [e.id, String(e.title?.zh ?? e.title)])),
  }
  const parts = (game.parts?.all ?? []).map((p) => ({ key: p.key, name: p.name, desc: p.desc, revisions: p.revisions }))
  for (const [name, value] of Object.entries({ levels: spec.levels, ...(spec.texts ?? {}), parts })) for (const problem of refProblems(value, name, names, spec.quotes)) fail(`text ${problem}`)

  // An entry is linked only where it is open already: in a level it opens at or after, in an entry opening no earlier.
  const entries = new Map((game.glossary?.entries ?? []).map((e) => [e.id, e]))
  const opensBy = (at, where) => !at || at === where || (where && spec.course.before(at, where))
  const linked = (v, out = [], kind = 'wiki') => {
    if (typeof v === 'string') out.push(...[...v.matchAll(REF)].filter((m) => m[1] === kind).map((m) => m[2]))
    else if (Array.isArray(v)) v.forEach((x) => linked(x, out, kind))
    else if (v && typeof v === 'object') for (const key of ['zh', 'intro', 'after', 'brief', 'hint', 'tasks', 't', 'body']) linked(v[key], out, kind)
    return out
  }
  for (const level of spec.levels) for (const id of linked(level)) if (entries.has(id) && !opensBy(entries.get(id).at, level.id)) fail(`${level.id} links the entry ${id}, which opens later (at ${entries.get(id).at})`)
  // A part likewise: linked in the level that earns it or one after (that level's own intro may name what it builds).
  const earnedAt = (part) => game.levels.find((l) => l.unlocks?.includes(part.key) || part.at?.includes(l.id))?.id
  const partsByKey = new Map((game.parts?.all ?? []).map((p) => [p.key, p]))
  for (const level of spec.levels) for (const key of linked(level, [], 'part')) if (partsByKey.has(key) && !opensBy(earnedAt(partsByKey.get(key)), level.id)) fail(`${level.id} links the part ${key}, earned later (at ${earnedAt(partsByKey.get(key))})`)
  for (const entry of entries.values()) for (const id of linked(entry)) if (entries.has(id) && !opensBy(entries.get(id).at, entry.at)) fail(`entry ${entry.id} links the entry ${id}, which opens later (at ${entries.get(id).at})`)

  for (const line of await validate(spec)) {
    if (line.fail) fail(line.text)
    else lines.push(line.text)
  }

  console.log(`\n${spec.title.zh} ${spec.title.en}`)
  for (const line of lines) console.log(`  ${line}`)
}

console.log(problems ? `\n${problems} problem(s)` : '\nall games ok')
await closeGames()
process.exit(problems ? 1 : 0)
