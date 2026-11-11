// The domain contract (games/DESIGN.md 6.3): what a domain gives the kernel, checked mechanically. A domain that
// passes it is one `npm run check`, the shell, and every tool built on them (the operation set, the MCP, the blind-play
// harness, the studio) can take without knowing anything about it. contract.test.js runs it over every domain and
// every data game; the scaffold (scaffold.js) generates domains that pass it.
//
//   domainProblems(name, domain)            domain.js: { vocabulary, spec, validate } and nothing unknown
//   vocabularyProblems(name, vocabulary)    the vocabulary describes itself as data: kinds, items, schemas
//   specProblems(domain, content, spec)     spec(content): its course, levels, texts; the course hooks' shapes; the
//                                           boards round-trip through blueprint text
//   validateProblems(domain, content, spec) validate(spec) on the content with every naive answer in its reference's
//                                           place (each such level fails, none but those after it), and with every built part
//                                           running its board unplugged (syncOwn: each builder level fails, but one whose
//                                           parts the spec lists as builtIn, which must not)
//   gameProblems(content, spec, game)       game.jsx's game (the shell's description) plays the same levels
//
// Each returns what is wrong as [string], empty when the contract holds (validateProblems: { problems, … }).
import { RULE_TEXT, audit } from '../course.js'
import { HINTS, S, validate as fits } from './schema.js'
import { describe } from './vocabulary.js'
import { taskShapes, tasksSchema } from './tasks.js'

/** What domain.js exports: the three entries, and the extension points tools add (each optional). */
export const ENTRIES = ['vocabulary', 'spec', 'validate']
const isFn = (f) => typeof f === 'function'
// Each extension point and the shape it must have. A tool that needs more of every domain adds its hook here.
//   play                { open(ctx), attempt(ctx, text) }: the blind-play harness's hook (games/DESIGN.md 6.6)
//   scene               scene(spec, level) → an SVG string or null: a level drawn headlessly (the MCP's render, the
//                       studio; games/DESIGN.md 6.7)
//   names               names(content) → { kind: Set }: what the content defines that its schema names (S.name)
//   languages           { lang: (text) → why it cannot be read, or null }: the readers of the vocabulary's languages
//                       (schema.js syntax), one for each it names
export const EXTENSIONS = {
  names: isFn,
  languages: (l) => Boolean(l) && typeof l === 'object' && Object.values(l).every(isFn),
  play: (p) => Boolean(p) && isFn(p.open) && isFn(p.attempt),
  scene: isFn,
}

const isText = (v) => typeof v === 'string' || (v && typeof v.zh === 'string')
const strings = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')
const isBoard = (b) => Boolean(b) && Array.isArray(b.nodes) && Array.isArray(b.wires)

export function domainProblems(name, domain) {
  const out = []
  if (!domain || typeof domain !== 'object') return [`${name}: domain.js has no default export`]
  for (const key of ENTRIES) if (!domain[key]) out.push(`${name}: domain.js gives no ${key}`)
  if (domain.spec && !isFn(domain.spec)) out.push(`${name}: spec is not a function`)
  if (domain.validate && !isFn(domain.validate)) out.push(`${name}: validate is not a function`)
  for (const key of Object.keys(domain)) if (!ENTRIES.includes(key) && !(key in EXTENSIONS)) out.push(`${name}: domain.js gives ${key}, which is no entry of the contract`)
  for (const [key, fits] of Object.entries(EXTENSIONS)) if (key in domain && !fits(domain[key])) out.push(`${name}: ${key} has not the shape its extension point asks for`)
  if (domain.vocabulary) out.push(...vocabularyProblems(name, domain.vocabulary))
  const named = Object.keys(domain.vocabulary?.languages ?? {})
  const read = Object.keys(domain.languages ?? {})
  for (const lang of named) if (!read.includes(lang)) out.push(`${name}: the vocabulary names the language ${lang}, which domain.js does not read`)
  for (const lang of read) if (!named.includes(lang)) out.push(`${name}: domain.js reads ${lang}, which the vocabulary does not name`)
  return out
}

/** Every schema inside a schema, with its path. */
function* schemasIn(s, at) {
  if (!s || typeof s !== 'object') return
  yield [s, at]
  if (s.of) for (const [k, x] of (Array.isArray(s.of) ? s.of : [s.of]).entries()) yield* schemasIn(x, `${at}${Array.isArray(s.of) ? `|${k}` : '[]'}`)
  if (s.fields) for (const [k, x] of Object.entries(s.fields)) yield* schemasIn(x, `${at}.${k}`)
  if (s.cases) for (const [k, x] of Object.entries(s.cases)) yield* schemasIn(x, `${at}<${k}>`)
}

// The schema types are what schema.js makes (opt is a flag on another type, not a type of its own).
const TYPES = Object.keys(S).filter((k) => k !== 'opt')

export function vocabularyProblems(name, v) {
  const out = []
  const say = (text) => out.push(`${name}: vocabulary: ${text}`)
  if (v.domain !== name) say(`it is ${v.domain}'s, in the folder ${name}`)
  if (!Number.isInteger(v.version) || v.version < 1) say(`version ${v.version} is no whole number from 1`)
  if (!v.kinds || !Object.keys(v.kinds).length) say('it has no kinds')
  const schemas = [['game', v.game], ['level', v.level]]
  for (const [kind, items] of Object.entries(v.kinds ?? {})) {
    if (!Object.keys(items).length) say(`the kind ${kind} has no items`)
    for (const [item, it] of Object.entries(items)) {
      if (!isText(it.about)) say(`${kind}.${item} says nothing of what it is (about)`)
      if (it.params) schemas.push([`${kind}.${item}`, it.params])
      if (kind === 'op' && !(Array.isArray(it.args) && it.args.every((a) => typeof a?.name === 'string'))) say(`op.${item} lists no arguments (args: [{ name }])`)
      if (kind === 'op' && it.params && it.params.type !== 'obj') say(`op.${item}: its named parameters are an S.obj`)
    }
  }
  // A level is a list of tasks (tasks.js taskLevel), and what a player keeps of a task goes by its id: a level's tasks,
  // whatever their shape, each have one.
  const tasks = v.level ? tasksSchema(v) : null
  if (v.level && !tasks) say('a level is a list of tasks (tasks.js taskLevel)')
  if (tasks && taskShapes(tasks).some((shape) => !shape.fields?.id || shape.fields.id.optional)) say('a level’s tasks need an id each (tasks.js TASK_ID_FIELD)')
  for (const [lang, it] of Object.entries(v.languages ?? {})) if (!isText(it?.about)) say(`the language ${lang} says nothing of what it is (about)`)
  if (v.kinds?.op && v.kinds.part) say('it gives engine resources and parts in code: a domain with resources defines its parts in each game’s parts.json')
  if (v.kinds?.op && !v.kinds.family) say('it gives engine resources but no families to colour parts by')
  for (const [where, schema] of schemas) {
    if (!schema) { say(`no ${where} schema`); continue }
    for (const [s, at] of schemasIn(schema, where)) {
      if (!TYPES.includes(s.type)) say(`${at}: ${JSON.stringify(s.type)} is no schema type`)
      // A domain with engine resources gives its parts in each game's parts.json: its part kind is the content's.
      if (s.type === 'syntax' && !v.languages?.[s.lang]) say(`${at}: names the language ${s.lang}, which the vocabulary has not`)
      if ((s.type === 'ref' || s.type === 'call') && !v.kinds?.[s.kind] && !(s.kind === 'part' && v.kinds?.op)) say(`${at}: names the kind ${s.kind}, which the vocabulary has not`)
      for (const [hint, values] of Object.entries(HINTS)) if (s[hint] !== undefined && !values.includes(s[hint])) say(`${at}: ${hint} ${JSON.stringify(s[hint])} is none of ${values.join(', ')}`)
    }
  }
  // Code anywhere in it would be lost on printing (describe): it must be data all through.
  const code = []
  const walk = (x, at) => {
    if (typeof x === 'function' || typeof x === 'symbol' || typeof x === 'bigint' || (typeof x === 'number' && !Number.isFinite(x))) code.push(at)
    else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) walk(y, `${at}.${k}`)
  }
  walk(v, 'vocabulary')
  for (const at of code.slice(0, 5)) say(`${at} is not data`)
  if (!code.length && !same(describe(v), v)) say('it does not print as itself')
  return out
}

/** A board as it computes: its nodes (id, type, settings, region) and wires, in a fixed order; layout left out. */
export const plainBoard = (b) => ({
  nodes: b.nodes.map((n) => ({ id: n.id, type: n.type, params: n.params ?? {}, ...(n.in ? { in: n.in } : {}) })).sort((x, y) => (x.id < y.id ? -1 : 1)),
  wires: b.wires.map((w) => ({ from: w.from, to: w.to, port: String(w.port) })).sort((x, y) => (`${x.to}.${x.port}.${x.from}` < `${y.to}.${y.port}.${y.from}` ? -1 : 1)),
})
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** The course hooks (../course.js defineCourse) on every level, by the shape each must give. */
function hookProblems(course) {
  const out = []
  const say = (text) => out.push(`course: ${text}`)
  const parts = new Set(course.primitives)
  for (const level of course.levels) {
    const at = level.id
    const list = (hook, v) => (strings(v) ? v : (say(`${hook}(${at}) is not a list of names`), []))
    if (!strings(level.unlocks ?? [])) say(`${at}: unlocks is not a list of flags`)
    list('adds', course.adds(level)).forEach((p) => parts.add(p))
    list('builds', course.builds(level)).forEach((p) => parts.add(p))
    list('granted', course.granted(level))
    list('uses', course.uses(level))
    const tray = course.tray(level)
    if (tray !== null && typeof tray !== 'string') say(`tray(${at}) is neither a tray nor null`)
    list('declares', course.declares(level))
    list('carries', course.carries(level))
    const needed = course.needed(level)
    if (needed !== null) list('needed', needed)
    const boards = course.boards(level)
    if (!Array.isArray(boards) || !boards.every(isBoard)) say(`boards(${at}) is not a list of boards`)
    const machine = course.machine(level)
    if (machine !== null && typeof machine !== 'string' && typeof machine !== 'number') say(`machine(${at}) is neither a name nor null`)
    if (machine !== null) {
      const can = course.can(machine)
      if (can !== null && !strings(can)) say(`can(${machine}) is neither a list of mechanisms nor null`)
    }
    const world = course.world(level)
    if (world !== null && typeof world !== 'string') say(`world(${at}) is neither a name nor null`)
    if (typeof course.naive(level) !== 'boolean') say(`naive(${at}) is not true or false`)
    const showcase = course.showcase(level)
    if (showcase !== null && !isText(showcase)) say(`showcase(${at}) is neither a reason nor null`)
  }
  for (const [name, list] of Object.entries(course.trays)) if (!strings(list)) say(`tray ${name} is not a list of parts`)
  for (const p of parts) {
    const c = course.concept(p)
    if (c !== null && typeof c !== 'string') say(`concept(${p}) is neither a name nor null`)
    if (!strings(course.replaces(p))) say(`replaces(${p}) is not a list of parts`)
    if (typeof course.local(p) !== 'boolean') say(`local(${p}) is not true or false`)
    const flag = course.needs(p)
    if (flag !== null && typeof flag !== 'string') say(`needs(${p}) is neither a flag nor null`)
  }
  if (typeof course.abstraction !== 'boolean') say('abstraction is not true or false')
  for (const f of audit(course)) if (!RULE_TEXT[f.rule]) say(`the audit reports ${f.rule}, which is no rule`)
  return out
}

export function specProblems(domain, content, spec) {
  const out = []
  const say = (text) => out.push(`spec: ${text}`)
  if (spec.id !== content.id) say(`id ${spec.id}, the content's is ${content.id}`)
  if (spec.domain !== domain.vocabulary.domain) say(`domain ${spec.domain}, not ${domain.vocabulary.domain}`)
  // Every kind of name the vocabulary's schemas take (S.name) is given: the encyclopedia's by the kernel, the rest by names(content).
  const given = new Set(['entry', 'group', ...Object.keys(domain.names?.(content) ?? {})])
  const kinds = new Set([domain.vocabulary.game, domain.vocabulary.level].flatMap((s) => [...schemasIn(s, '')].filter(([x]) => x.type === 'name').map(([x]) => x.kind)))
  for (const kind of kinds) if (!given.has(kind)) say(`its schemas name ${kind}s, which neither the kernel nor domain.js names(content) gives`)
  if (!same(spec.title, content.title)) say('its title is not the content’s')
  if (!spec.course?.levels || !isFn(spec.course.before)) return [...out, 'spec: no course (../course.js defineCourse)']
  if (!Array.isArray(spec.levels)) return [...out, 'spec: levels is no list']
  const ids = spec.levels.map((l) => l.id)
  if (new Set(ids).size !== ids.length) say('a level id twice')
  if (!same([...ids].sort(), content.levels.map((l) => l.id).sort())) say('its levels are not the content’s levels')
  if (!same(spec.course.levels.map((l) => l.id), ids)) say('the course’s levels are not its levels, in play order')
  for (const l of spec.levels) {
    if (!strings(l.requires ?? [])) say(`${l.id}: requires is not a list of level ids`)
    if (!isText(l.title)) say(`${l.id}: no title`)
  }
  if (spec.texts !== undefined && (typeof spec.texts !== 'object' || Array.isArray(spec.texts))) say('texts is not { name: what a player reads }')
  if (spec.quotes !== undefined && !strings(spec.quotes)) say('quotes is not a list of names')
  if (spec.audit !== undefined) {
    if (!isFn(spec.audit)) say('audit is not a function')
    else for (const f of spec.audit()) if (!f.rule || !f.level) say(`its own audit reports ${JSON.stringify(f)}: no { rule, level, part }`)
  }
  out.push(...hookProblems(spec.course))
  out.push(...blueprintProblems(spec))
  const builds = spec.course.levels.some((l) => spec.course.builds(l).length)
  if (builds && !isFn(spec.syncOwn)) say('the course builds parts, but the spec has no syncOwn(built)')
  if (spec.builtIn !== undefined) {
    const built = new Set(spec.course.levels.flatMap((l) => spec.course.builds(l)))
    if (!strings(spec.builtIn)) say('builtIn is not a list of parts')
    else for (const p of spec.builtIn.filter((x) => !built.has(x))) say(`builtIn lists ${p}, which no level builds`)
  }
  return out
}

/**
 * spec.blueprints: [{ level, task, key, board, write(board) → lines, read(lines) → board, naive? }]
 * every board the content writes as blueprint text (`naive` for a naive answer; `task`, the index of the task it is a
 * board of, `key` that task's id, its key in the saves, ../shell/progress.js), and how the domain writes it and reads
 * it back on its task; the level's screen keeps the board itself.
 * A course whose levels hold boards (course.boards) lists them; every one reads back as itself: written (the domain's
 * `write`) and read again on its level (`read`), it computes the same, and writing it again gives the same text.
 */
export function blueprintProblems(spec) {
  const out = []
  if (!spec.course.levels.some((l) => spec.course.boards(l).length)) return out
  if (!Array.isArray(spec.blueprints) || !spec.blueprints.length) return ['spec: levels hold boards, but the spec lists no blueprints']
  for (const [k, { level, task, key, board, write, read }] of spec.blueprints.entries()) {
    const at = `blueprint ${k + 1} (${level})`
    if (!isBoard(board) || !isFn(write) || !isFn(read) || !Number.isInteger(task) || typeof key !== 'string') { out.push(`${at}: not { level, task, key, board, write, read }`); continue }
    let text, back
    try {
      text = write(board)
      back = read(text)
    } catch (e) {
      out.push(`${at}: does not read back: ${e.en ?? e.message ?? String(e)}${text ? `\n${text.join('\n')}` : ''}`)
      continue
    }
    if (!strings(text)) out.push(`${at}: written, it is not a list of lines`)
    else if (!same(plainBoard(back), plainBoard(board))) out.push(`${at}: read back, it is another board:\n${text.join('\n')}`)
    else if (!same(write(back), text)) out.push(`${at}: written twice, it reads differently`)
  }
  return out
}

/** A content with every level's naive answer in its reference's place, and the ids of the levels changed. */
function naiveInPlace(domain, content, keep) {
  const changed = []
  const swap = (one) => {
    if (one.naive === undefined) return one
    const ref = ['solution', 'answer'].find((k) => one[k] !== undefined)
    return ref ? { ...one, [ref]: one.naive } : one
  }
  const levels = content.levels.map((level) => {
    if (!keep(level.id)) return level
    const next = { ...swap(level), tasks: level.tasks.map(swap) }
    const { id, ...fields } = next
    if (same(next, level) || fits(domain.vocabulary.level, fields, { vocabulary: domain.vocabulary }).length) return level
    changed.push(id)
    return next
  })
  return { content: { ...content, levels }, changed }
}

const failing = (lines) => lines.filter((l) => l.fail)
const named = (lines) => [...new Set(lines.map((l) => l.level))]

/**
 * validate(spec) against the contract, on changed content: every level's naive answer in its reference's place (each
 * such level fails, and no other level but one after it), then every builder level's part running its board unplugged:
 * each such level fails, but one whose every part the spec lists as builtIn (a built-in implementation, not the
 * player's board), which must pass, so the list only shrinks. Returns { problems, builders, runsOwn }: the levels that
 * build parts, and those whose part runs the board syncOwn hands it.
 */
export async function validateProblems(domain, content, spec) {
  const out = []
  const course = spec.course
  const builders = course.levels.filter((l) => course.builds(l).length).map((l) => l.id)
  // The naive answers, each where the reference stands, on levels whose board no other level runs.
  const { content: naive, changed } = naiveInPlace(domain, content, (id) => !builders.includes(id))
  if (changed.length) {
    let lines
    try {
      lines = await domain.validate(domain.spec(naive))
    } catch (e) {
      return { problems: [`validate: throws on a naive answer in a reference's place: ${e.message}`], runsOwn: [], builders }
    }
    const fails = failing(lines)
    for (const id of changed) if (!fails.some((l) => l.level === id)) out.push(`validate: ${id} passes with its naive answer as its reference`)
    // A later level may stand on an earlier one's answer (a type it declared, a function it defined); no other may fail.
    const downstream = (id) => changed.some((c) => course.before(c, id))
    for (const id of named(fails)) if (!changed.includes(id) && !(id && downstream(id))) out.push(`validate: ${id ?? 'a line naming no level'} fails, though only naive answers moved: ${fails.find((l) => l.level === id).text}`)
  }
  // The built parts run what syncOwn hands them: each builder level's last reference board unplugged (its wires into
  // the level's own nodes dropped, `out <- a`), kept as the level's screen keeps it, under its task's key in the
  // saves, makes that level fail.
  const unplugged = builders.flatMap((id) => {
    const bp = spec.blueprints?.filter((b) => b.level === id && !b.naive).at(-1)
    return bp ? [{ id, key: bp.key, board: bp.read(bp.write(bp.board).filter((line) => !line.includes('<-'))) }] : []
  })
  const runsOwn = []
  if (unplugged.length) {
    spec.syncOwn(Object.fromEntries(unplugged.map((u) => [u.key, u.board])))
    const fails = failing(await domain.validate(spec))
    spec.syncOwn({})
    for (const { id } of unplugged) if (fails.some((l) => l.level === id)) runsOwn.push(id)
  }
  const builtIn = new Set(spec.builtIn ?? [])
  for (const id of builders) {
    const own = !course.builds(course.levels.find((l) => l.id === id)).every((p) => builtIn.has(p))
    if (own && !runsOwn.includes(id)) out.push(`syncOwn: ${id} passes with its board unplugged: its part does not run the board syncOwn hands it (a built-in implementation goes in spec.builtIn)`)
    if (!own && runsOwn.includes(id)) out.push(`syncOwn: ${id} builds only parts the spec lists as builtIn, but its part runs the board syncOwn hands it: drop them from builtIn`)
  }
  return { problems: out, runsOwn, builders }
}

/** The game game.jsx makes of a content (the shell's description, ../shell/index.js defineGame) against the spec. */
export function gameProblems(content, spec, game) {
  const out = []
  const say = (text) => out.push(`game.jsx: ${text}`)
  if (game.id !== content.id) say(`id ${game.id}, the content's is ${content.id}`)
  for (const key of ['title', 'kicker', 'lede']) if (!isText(game[key])) say(`no ${key}`)
  if (!Array.isArray(game.chapters) || !Array.isArray(game.levels)) return [...out, 'game.jsx: no chapters or no levels']
  if (!same(game.levels.map((l) => l.id), spec.levels.map((l) => l.id))) say('its levels are not the spec’s, in play order')
  const chapters = new Set(game.chapters.map((c) => c.id))
  for (const l of game.levels) {
    if (!game.kinds?.[l.kind] || !isFn(game.kinds[l.kind].Screen)) say(`${l.id}: the kind ${l.kind} has no Screen`)
    if (!chapters.has(l.chapter)) say(`${l.id}: in no chapter`)
  }
  const keys = (game.parts?.all ?? []).map((p) => p.key)
  if (new Set(keys).size !== keys.length) say('a part twice in the components box')
  if (!same(game.glossary, content.glossary)) say('its encyclopedia is not the content’s glossary')
  return out
}
