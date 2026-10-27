/* global process */
// npm run check [-- <game id>…] — every game against the rules every game follows: the course audit (../course.js),
// the level count on the hub (../../games.js), unique level ids that require only real levels, every text a { zh, en } pair with a real English side, and then
// its domain's own checks (../domains/<domain>/validate.js: reference answers pass, naive ones fail, …).
//
// A game is checked through its spec, games/<id>/spec.js, which runs under node:
//   export default { id, domain, title, course, levels, texts?, quotes?, audit?() → [{ rule, level, part, text? }] }
// `texts` are the objects whose strings a player reads (levels are always included); `quotes` the level titles that
// are also names of parts or ideas, which a text may quote (any other reference to a level, part or encyclopedia
// entry is a link, ../shell/refs.js);
// `audit` adds the game's own course problems to the shared audit's.
import { GAMES } from '../../games.js'
import { RULE_TEXT, audit } from '../course.js'
import { REF, refProblems, untranslated } from './text.js'
import { closeGames, loadGame } from './games.mjs'

const asked = process.argv.slice(2)
const ids = asked.length ? asked : GAMES.map((game) => game.id)
let problems = 0

for (const id of ids) {
  const spec = (await import(`../../${id}/spec.js`)).default
  const { validate } = await import(`../domains/${spec.domain}/validate.js`)
  const lines = []
  const fail = (text) => {
    problems++
    lines.push(`FAIL ${text}`)
  }

  const found = [...audit(spec.course), ...(spec.audit?.() ?? [])]
  for (const [rule, text] of Object.entries(RULE_TEXT)) {
    const hits = found.filter((f) => f.rule === rule)
    if (hits.length) fail(`course: ${text} (${hits.length}): ${hits.map((f) => `${f.part}@${f.level}`).join('  ')}`)
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
