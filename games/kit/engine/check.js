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
import { refProblems, untranslated } from './text.js'
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
