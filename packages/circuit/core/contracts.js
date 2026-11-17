import { sameJson, validate as fits } from 'kernel'
import { trayMembers } from './trays.js'
import { RULE_TEXT, audit } from './course.js'
const isFn = value => typeof value === 'function'
const isText = value => typeof value === 'string' || value && (typeof value.en === 'string' || typeof value.zh === 'string')
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string')
const isBoard = value => Boolean(value) && Array.isArray(value.nodes) && Array.isArray(value.wires)
function* schemasIn(schema, at) {
  if (!schema || typeof schema !== 'object') return
  yield [schema, at]
  if (schema.of) for (const [index, value] of (Array.isArray(schema.of) ? schema.of : [schema.of]).entries()) yield* schemasIn(value, `${at}[${index}]`)
  for (const [key, value] of Object.entries(schema.fields ?? schema.cases ?? {})) yield* schemasIn(value, `${at}.${key}`)
}
export const plainBoard = (b) => ({
  nodes: b.nodes.map((n) => ({ id: n.id, type: n.type, params: n.params ?? {}, ...(n.in ? { in: n.in } : {}) })).sort((x, y) => (x.id < y.id ? -1 : 1)),
  wires: b.wires.map((w) => ({ from: w.from, to: w.to, port: String(w.port) })).sort((x, y) => (`${x.to}.${x.port}.${x.from}` < `${y.to}.${y.port}.${y.from}` ? -1 : 1)),
})

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
    list('opens', course.opens(level))
    list('gives', course.gives(level))
    list('withholds', course.withholds(level))
    list('uses', course.uses(level))
    const tray = course.tray(level)
    if (tray !== null && !strings(tray)) say(`tray(${at}) is neither a list of trays nor null`)
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
  }
  for (const [name, list] of Object.entries(course.trays)) if (!Array.isArray(list.items) || !strings(trayMembers(list))) say(`tray ${name} does not resolve to a list of parts`)
  for (const p of parts) {
    if (!strings(course.replaces(p))) say(`replaces(${p}) is not a list of parts`)
    if (typeof course.local(p) !== 'boolean') say(`local(${p}) is not true or false`)
    const flag = course.needs(p)
    if (flag !== null && typeof flag !== 'string') say(`needs(${p}) is neither a flag nor null`)
  }
  for (const f of audit(course)) if (!RULE_TEXT[f.rule]) say(`the audit reports ${f.rule}, which is no rule`)
  return out
}

export function specProblems(domain, content, spec) {
  const out = []
  const say = (text) => out.push(`spec: ${text}`)
  if (spec.id !== content.id) say(`id ${spec.id}, the content's is ${content.id}`)
  // Every kind of name the vocabulary's schemas take (S.name) is given: the encyclopedia's and the level groups' by the kernel, the rest by names(content).
  const given = new Set([...Object.keys(content.registries ?? {}), 'entry', 'group', 'tag', 'relation', 'section', 'circuit/tray', ...Object.keys(domain.names?.(content) ?? {})])
  const kinds = new Set([domain.vocabulary.game, domain.vocabulary.level].flatMap((s) => [...schemasIn(s, '')].filter(([x]) => x.type === 'name').map(([x]) => x.kind)))
  for (const kind of kinds) if (!given.has(kind)) say(`its schemas name ${kind}s, which neither the kernel nor runtime.js names(content) gives`)
  if (!sameJson(spec.title, content.title)) say('its title is not the content’s')
  if (!spec.course?.levels || !isFn(spec.course.before)) return [...out, 'spec: no course (../course.js defineCourse)']
  if (!Array.isArray(spec.levels)) return [...out, 'spec: levels is no list']
  const ids = spec.levels.map((l) => l.id)
  if (new Set(ids).size !== ids.length) say('a level id twice')
  if (!sameJson([...ids].sort(), content.levels.map((l) => l.id).sort())) say('its levels are not the content’s levels')
  if (!sameJson(spec.course.levels.map((l) => l.id), ids)) say('the course’s levels are not its levels, in play order')
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
    else if (!sameJson(plainBoard(back), plainBoard(board))) out.push(`${at}: read back, it is another board:\n${text.join('\n')}`)
    else if (!sameJson(write(back), text)) out.push(`${at}: written twice, it reads differently`)
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
    if (sameJson(next, level) || fits(domain.vocabulary.level, fields, { vocabulary: domain.vocabulary }).length) return level
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

