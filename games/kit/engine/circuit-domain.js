// The base a circuit domain stands on (games/DESIGN.md 6.3): its boards, its course read from content, and the checks
// every circuit level gets. A domain says what is particular to it — the cards a level gives its board, its parts,
// how a task's tests read and run — and gets the rest:
//
//   circuitBoard({ cards, ticks, right, gap }) → { ticks, FIXED, FIXED_PARTS, isFixed, portsIn, portsOut, labelOf,
//     sourceOf, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText }
//       cards  [{ type, side: 'left' | 'right', of(task) → [{ name, label }], params?(port), part?, group?(task) }]
//              in board order: the cards a level gives (its inputs, outputs, wires…), each a source on the left or a sink
//              on the right unless it gives its own part (a line heard, a line driven); group(task) → [{ name, label,
//              members: [port name] }] ports of a left card that stand on one card together, one output a member (a
//              board reads it as `group.member`), while the task's ports, and a part its board becomes, stay one each
//       ticks  the board runs tick by tick (../engine/ticks.js), so its wires may feed back
//     A task that gives the board it opens on (`starter`, blueprint text read like its answer) starts on a copy of it.
//   INPUTS, OUTPUTS   the cards most boards are given: a task's inputs down the left, its outputs down the right
//   circuitCourse(content, { board, parts, read?, test?, kinds?, pack?, holds?, replaces?, unwanted? }) → { LEVELS,
//     played, builtBy, CHAPTERS, course, partOf, BUILT, types, blueprints, wrong, offerIn, introductions, carried,
//     opening, syncOwn }
//       parts  { type: part } the game's primitives; read(task, say) → the task's own fields read (what it wants…),
//              test(test, task, say) → each of its tests and hidden tests read (its values…), each after checking what
//              its schema cannot say; holds: a built part keeps its own registers; a task that says what its board's
//              right must give (`want`) names each port there once, but those unwanted(task) names
//       kinds  { kind: read(task, say) → the task read } the tasks that are no board (a grid to fill in, a choice), by
//              their `kind`: the domain reads them and plays them on screens of its own; every other task is a board
//       pack(builds, say) → what else the part a level builds is (settings a player sets on it: params, fields…)
//     A task holds the parts its level adds and those its own tasks up to it add (`adds`), and brings in (`fresh`)
//     those it adds itself, the first task its level's too; its tray offers by them and by its own answer.
//   circuitSpec(domain, courseOf) → spec(content), the game's spec as npm run check reads one (../engine/check.js),
//     the course read as `circuit` (validate({ circuit }), the screen's game.circuit: ../shell/circuit-game.js)
//   GAME, levelSchema({ builds, page?, ports, test, checks?, more?, shared?, kinds? }), NAME, PORT   the schemas of
//     game.json and of a level, and of a card's name and a port, for the domain's vocabulary
//   runTests(runTest) → run(task, board, parts), every test of a task run by the domain's runTest: { runs, pass }
//   judgeTicks(ticks, { checked, want, got?, same?, show? }) → { ticks, fail? }   a tick board's run judged tick by
//     tick against what the task wants of its outputs
//   checkCircuitTasks(circuit, { run, entries, failure?, more?, kinds? }) → the domain's lines for npm run check
//       run(task, board) → { runs: [{ fail?, error? }], pass }; entries({ task, test, run, sample }) what the results
//       area can show of a test (../shell/CircuitScreen.jsx); failure(run) the words for a run that fails;
//       kinds { kind: check(task) → { problems, ok } } the domain's checks of a task that is no board
//
// A board is { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }; as text it is the kernel's
// blueprint (../circuit/text.js), read and checked there. The boards the player passed the building levels with live
// in the course read (syncOwn), one per content: two games of a domain in one process never share them.
import { stagesOf } from './stages.js'
import { assemblySeries } from './assembly-series.js'
import { print, read } from '../circuit/text.js'
import { packed, sink, source, withSettings } from './boards.js'
import { portsOf } from './circuit.js'
import { withHidden } from './tests.js'
import { taskLevel, taskLevels } from './tasks.js'
import { defineCourse, eraLevels, layout, offer, usable } from '../course.js'
import { S } from './schema.js'
import { GAME_VIEWS, RESULTS, SHOW, TASK_VIEWS, rowProblems, showProblems, valueText, viewsProblems } from './views.js'
import { T as t, keyOf } from '../shell/i18n.js'

/* ---------- the board ---------- */

export function circuitBoard({ cards, ticks = false, right = 980, gap = 140 }) {
  const FIXED = cards.map((c) => c.type)
  // A left card that groups ports gives each member as an output of its own.
  const grouping = source({ outputs: (node) => node.params?.members?.split(',') ?? null, eval: (_, node, ctx, key) => ctx.bind?.[node.params.members ? key : node.params.name] })
  const FIXED_PARTS = Object.fromEntries(cards.map((c) => [c.type, c.part ?? (c.side === 'left' ? (c.group ? grouping : source()) : sink())]))
  const side = (task, s) => cards.filter((c) => c.side === s).flatMap((c) => c.of(task).map((p) => ({ card: c, port: p })))
  const portsIn = (task) => side(task, 'left').map((x) => x.port)
  const portsOut = (task) => side(task, 'right').map((x) => x.port)
  const groupsOf = (task) => cards.flatMap((c) => c.group?.(task) ?? [])
  const groupOf = (task, name) => groupsOf(task).find((g) => g.members.includes(name))
  /** What a task's port, or a group of its ports, is called. */
  const labelOf = (task, name) => [...portsIn(task), ...portsOut(task), ...groupsOf(task)].find((p) => p.name === name)?.label ?? name
  /** Where a wire from one of a task's ports on the left starts: its card, or its output on its group's card. */
  const sourceOf = (task, name) => (groupOf(task, name) ? `${groupOf(task, name).name}#${name}` : name)
  // A side's cards: a port's own, or its group's, where the group's first member stands.
  const placed = (task, s) => side(task, s).flatMap(({ card, port }) => {
    const group = card.group && groupOf(task, port.name)
    if (!group) return [{ id: port.name, type: card.type, params: card.params ? card.params(port) : { name: port.name } }]
    return group.members[0] === port.name ? [{ id: group.name, type: card.type, params: { name: group.name, members: group.members.join(',') } }] : []
  })
  const fixedOf = (task) => [...placed(task, 'left').map((n, k) => ({ ...n, x: 20, y: 40 + k * gap })), ...placed(task, 'right').map((n, k) => ({ ...n, x: right, y: 40 + k * gap }))]
  const copy = (b) => ({ nodes: b.nodes.map((n) => ({ ...n, params: { ...n.params } })), wires: b.wires.map((w) => ({ ...w })) })
  const startBoard = (task) => (task.starter ? copy(task.starter) : { nodes: fixedOf(task), wires: [] })
  const isFixed = (type) => FIXED.includes(type)
  const sinks = new Set(cards.filter((c) => c.side === 'right').map((c) => c.type))

  /** Whether a saved board still fits its task: the task's fixed cards as they are set, and every card one the domain knows. */
  const fits = (board, task, partOf) => {
    const given = (nodes) => nodes.filter((n) => isFixed(n.type)).map((n) => JSON.stringify([n.id, n.type, Object.entries(n.params ?? {}).sort()])).sort().join()
    return given(board.nodes) === given(fixedOf(task)) && board.nodes.every((n) => partOf(n.type))
  }

  /** A board from another level brought onto `task`: its placed parts and their wires, and its wires to the fixed cards this task has too. */
  const carriedOnto = (task, board) => {
    const fixed = fixedOf(task)
    const placed = board.nodes.filter((n) => !isFixed(n.type))
    const own = new Map(fixed.map((n) => [n.id, n]))
    const ids = new Set([...fixed, ...placed].map((n) => n.id))
    const from = (w) => w.from.split('#')[0]
    const keeps = (w) => ids.has(from(w)) && ids.has(w.to) && (!own.has(w.to) || w.port === 'in') && (!own.has(from(w)) || board.nodes.find((n) => n.id === from(w))?.type === own.get(from(w)).type)
    return { ...board, nodes: [...fixed, ...placed], wires: board.wires.filter(keeps) }
  }

  /** How the editor and the blueprint reader wire a task's cards (../circuit/model.js parts): `circuit` is the course read. */
  const wiring = (task, circuit) => ({
    loops: ticks,
    // What keeps a value for the next tick: a card that stores a register, or a built part that holds its own.
    holds: (n) => Boolean(circuit.partOf(n.type)?.store || circuit.partOf(n.type)?.holds),
    // A setting is kept as the words it is written in ({ reg: 'A', start: '1' }); the parts read them.
    text: { read: (_node, _key, v) => String(v) },
    inputs: (n) => {
      if (sinks.has(n.type)) return ['in']
      if (isFixed(n.type)) return []
      if (circuit.BUILT[n.type]) return portsIn(circuit.builtBy(n.type)).map((p) => p.name)
      const part = circuit.partOf(n.type)
      return part ? portsOf(part, n) : []
    },
    role: (n) => (sinks.has(n.type) ? 'sink' : isFixed(n.type) ? 'source' : 'part'),
    packed: (n) => Boolean(circuit.BUILT[n.type]),
    // A built part's outputs are its board's; a part's (a group card's members, a game's part of several), its own.
    outputs: (n) => {
      if (circuit.BUILT[n.type]) {
        const outs = portsOut(circuit.builtBy(n.type))
        return outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
      }
      return circuit.partOf(n.type)?.outputs?.(n)?.map((key) => ({ key, label: isFixed(n.type) ? labelOf(task, key) : key })) ?? null
    },
  })

  /** The board blueprint lines describe on `task` (the kernel's reader); throws the first { line, zh, en } it cannot read. */
  const fromText = (lines, task, circuit) => {
    const got = read(lines.join('\n'), { nodes: fixedOf(task), wires: [] }, wiring(task, circuit), circuit.types())
    if (got.errors) throw got.errors[0]
    return got.graph
  }
  /** A board as blueprint lines, as content writes it (no header): what fromText reads back on the task. */
  const toText = (board, task, circuit) => print(board, wiring(task, circuit)).split('\n').filter((line) => line && !line.startsWith('#'))

  return { ticks, FIXED, FIXED_PARTS, isFixed, portsIn, portsOut, labelOf, sourceOf, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText }
}

/** A task's inputs down the left of its board, and its outputs down the right. */
export const INPUTS = { type: 'in', side: 'left', of: (task) => task.inputs ?? [] }
export const OUTPUTS = { type: 'out', side: 'right', of: (task) => task.outputs ?? [] }

/** A circuit of the game's primitives alone, no part built: what a board reads on outside a course (a test, a tool). */
export const primitivesOnly = (board, parts) => ({ BUILT: {}, partOf: (t) => board.FIXED_PARTS[t] ?? parts[t], types: () => Object.keys(parts).filter((t) => !board.isFixed(t)), builtBy: () => null })

/* ---------- the course ---------- */

export function circuitCourse(content, { board, parts, read: readOwn = (task) => task, test: readTest = (t) => t, kinds = {}, pack = () => ({}), holds = false, replaces = () => [], unwanted = () => [] }) {
  const { eras, primitives, levels, concept = {} } = content
  const wrong = []
  const say = (where, text) => wrong.push(`${where}: ${text}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')
  // The boards the player passed the building levels with (the shell's progress.built), by level id: this content's.
  const own = new Map()
  const BUILT = {}
  const revisions = []
  const readBuilders = new Map()
  const partOf = (type) => board.FIXED_PARTS[type] ?? parts[type] ?? BUILT[type]
  const blueprints = []
  const played = new Map()
  const builderOf = new Map(levels.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const circuit = { BUILT, partOf, types: () => [...Object.keys(parts), ...Object.keys(BUILT)].filter((t) => !board.isFixed(t)), builtBy: (type) => readBuilders.get(type) ?? null }

  const placeOf = (id, task) => ({ id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: task.adds ?? [] })
  const readTask = (id, task, where) => {
    if (kinds[task.kind]) return { ...kinds[task.kind](task, (text) => say(where, text)), ...placeOf(id, task) }
    const names = [...board.portsIn(task), ...board.portsOut(task)].map((p) => p.name)
    for (const name of new Set(names)) if (names.indexOf(name) !== names.lastIndexOf(name)) say(where, `two of its cards are called ${name}`)
    if (!board.portsOut(task).length) say(where, 'it has nothing on the right: nothing is checked')
    if (task.want) {
      const outs = board.portsOut(task).map((p) => p.name)
      for (const name of outs) if (!task.want[name] && !unwanted(task).includes(name)) say(where, `nothing is wanted of ${name}`)
      for (const name of Object.keys(task.want)) if (!outs.includes(name)) say(where, `wants ${name}, which is nothing on the board’s right`)
    }
    const sayHere = (text) => say(where, text)
    const read = readOwn(task, sayHere)
    const test = (t) => readTest(t, read, sayHere)
    const out = { ...read, ...placeOf(id, task), tests: task.tests.map(test), hidden: (task.hidden ?? []).map(test) }
    const boardOf = (lines, what, naive = false) => {
      try {
        const b = board.fromText(lines, out, circuit)
        blueprints.push({ level: id, task: task.task, key: task.taskId, board: b, write: (x) => board.toText(x, out, forTask(out)), read: (text) => board.fromText(text, out, forTask(out)), ...(naive ? { naive } : {}) })
        return b
      } catch (e) {
        say(where, `${what}: ${e.en ?? String(e)}`)
        return { nodes: [], wires: [] }
      }
    }
    out.solution = boardOf(task.solution, 'the answer')
    if (task.starter) out.starter = boardOf(task.starter, 'the starter')
    if (task.naive) out.naive = boardOf(task.naive, 'the naive answer', true)
    return out
  }
  const isBoard = (task) => !kinds[task.kind]

  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    // A task holds what the level adds and what its tasks up to it add; it brings in (`fresh`) its own, the first the level's too.
    const tasks = taskLevels(level).map((task, k) => ({ ...task, adds: [...new Set([...(level.adds ?? []), ...level.tasks.slice(0, k + 1).flatMap((T) => T.adds ?? [])])], fresh: [...(k === 0 ? level.adds ?? [] : []), ...(level.tasks[k].adds ?? [])] }))
    const read = tasks.map((task) => readTask(id, task, tasks.length > 1 ? `${id} task ${task.taskId}` : id))
    played.set(id, read)
    // Each revision keeps its last task’s interface and passed board; the series selects the published revision.
    const last = read.at(-1)
    if (level.builds && !isBoard(last)) say(id, 'it builds a part, and its last task is no board')
    else if (level.builds) {
      const fitting = new WeakMap()
      const running = () => {
        const b = own.get(id)
        if (!b) return last.solution
        if (!fitting.has(b)) fitting.set(b, board.fits(b, last, partOf))
        return fitting.get(b) ? b : last.solution
      }
      const part = packed({
        circuit: running,
        inputs: board.portsIn(last).map((p) => p.name),
        outputs: board.portsOut(last).map((p) => p.name),
        ...(holds ? { holds: true } : {}),
        built: level.builds,
        ...pack(level.builds, (text) => say(id, text)),
        // What the part runs, opened on a board: its board with the part's settings put on it, and the task it is.
        opens: (params) => ({ circuit: withSettings(running(), params, partOf), level: last }),
      })
      BUILT[level.builds.type] = part
      revisions.push({ task: last, part })
      readBuilders.set(level.builds.type, last)
    }
    return { ...level, id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: tasks.at(-1).adds }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  // A course level is a level, or one of its tasks (`task`, its index): what that task holds and its answer.
  const taskOf = (level) => (level.task === undefined ? null : played.get(level.id)?.[level.task] ?? null)
  const solutions = (level) => (taskOf(level) ? [taskOf(level)] : played.get(level.id)).filter(isBoard).map((T) => T.solution)
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    primitives,
    adds: (level) => (taskOf(level) ?? byId.get(level.id))?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    concept: (part) => concept[part] ?? part,
    naive: (level) => played.get(level.id)?.some((T) => T.naive) ?? false,
    needed: (level) => [...new Set(solutions(level).flatMap((b) => b.nodes).map((n) => n.type).filter((t) => !board.isFixed(t) && (!parts[t] || primitives.includes(t))))],
    boards: (level) => solutions(level),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    replaces,
    carries: (level) => played.get(level.id)?.map((T) => T.carry).filter(Boolean) ?? [],
    openParts: (level) => (played.get(level.id) ?? []).filter(isBoard).map((task) => {
      const shown = stagesOf({ task, board: task.solution, chain: result.stageChain(task), isFixed: (n) => board.isFixed(n.type) })
      return { task: task.taskId, staged: shown.stages.length > 0, count: shown.loose.length }
    }),
    abstraction: true,
  })
  const series = assemblySeries(revisions, { before: course.before, passed: (task) => own.has(task.id) })
  wrong.push(...series.problems())
  const scopes = new Map()
  const refresh = (target, task) => {
    for (const type of Object.keys(BUILT)) target[type] = series.resolve(type, task).part
  }
  circuit.builtBy = (type) => series.resolve(type)?.task ?? null
  const forTask = (task) => {
    if (!scopes.has(task.taskId)) {
      const built = {}
      refresh(built, task)
      scopes.set(task.taskId, { task, view: { ...result, BUILT: built, partOf: (type) => board.FIXED_PARTS[type] ?? parts[type] ?? built[type], builtBy: (type) => series.resolve(type, task)?.task ?? null } })
    }
    return scopes.get(task.taskId).view
  }
  const result = {
    LEVELS,
    played,
    builtBy: circuit.builtBy,
    forTask,
    CHAPTERS,
    course,
    partOf,
    BUILT,
    types: circuit.types,
    board,
    blueprints,
    wrong,
    // What a task's tray holds and shows: by its own parts and its own answer.
    offerIn: (task, flags) => {
      const offered = offer(course, { id: task.id, task: task.task }, new Set(flags))
      const self = byId.get(task.id)?.builds?.type
      return Object.fromEntries(Object.entries(offered).map(([key, types]) => [key, types.filter((type) => type !== self)]))
    },
    // The tasks of level `id` that bring in part `type`.
    introductions: (type, id) => (played.get(id) ?? []).filter((T) => T.fresh.includes(type)).map((T) => T.taskId),
    // The levels a task carries on from: passing them keeps the board (progress.built).
    carried: new Set(LEVELS.flatMap((L) => played.get(L.id).map((T) => T.carry)).filter(Boolean)),
    // The board a task opens on: the board of the level it carries on from (the player's, else its last task's
    // reference), or its fixed cards alone.
    opening: (task, built = {}, previous = null) => {
      const from = task.carry ? played.get(task.carry)?.at(-1) : task.carries ? played.get(task.id)?.[task.task - 1] : null
      const saved = built[from?.taskId]
      const b = previous ?? (saved?.nodes ? saved : from?.solution)
      if (!b) return board.startBoard(task)
      const carried = board.carriedOnto(task, b)
      const ids = new Set(carried.nodes.map((n) => n.id))
      const added = task.starter?.nodes.filter((n) => !board.isFixed(n.type) && !ids.has(n.id)) ?? []
      const addedIds = new Set(added.map((n) => n.id))
      const wires = task.starter?.wires.filter((w) => addedIds.has(w.to)) ?? []
      return { ...carried, nodes: [...carried.nodes, ...added], wires: [...carried.wires, ...wires] }
    },
    // The passed boards that led to this task, oldest first. Missing boards contribute no ownership.
    stageChain: (task, built = {}) => {
      const chain = []
      const seen = new Set([task.taskId])
      const visit = (current) => {
        const previous = current.carry ? played.get(current.carry)?.at(-1) : current.carries ? played.get(current.id)?.[current.task - 1] : null
        if (!previous || seen.has(previous.taskId)) return
        seen.add(previous.taskId)
        visit(previous)
        const saved = built[previous.taskId]
        const b = saved?.nodes ? saved : previous.solution
        if (b?.nodes) chain.push({ id: previous.taskId, label: previous.stage ?? byId.get(previous.id).title, board: b })
      }
      visit(task)
      return chain
    },
    views: content.views ?? null,
    // The shell keeps boards by task (../shell/progress.js): a level's part runs its last task's.
    syncOwn: (built = {}) => {
      own.clear()
      for (const L of LEVELS) {
        const b = built[played.get(L.id).at(-1).taskId]
        if (b?.nodes && board.fits(b, played.get(L.id).at(-1), partOf)) own.set(L.id, b)
      }
      refresh(BUILT)
      for (const { task, view } of scopes.values()) refresh(view.BUILT, task)
    },
  }
  return result
}

/* ---------- a level ---------- */

/** A card's name: a port's, a register's, a part's a level builds. */
export const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
/** A port of a task's board: one of its fixed cards, named and labelled. */
export const PORT = S.obj({ name: NAME, label: S.text() })

/** The part a level builds: its last task's board, packed (circuitCourse), named and described. */
export const BUILT_PART = { type: NAME, name: S.text(), desc: S.text() }
const BUILDS = S.opt(S.obj(BUILT_PART, { section: 'course', about: t('通过后最后一个任务的板成为元件 type：它的输入口和结果口就是那个任务的输入和输出', 'once passed the last task’s board is the part `type`: its ports are that task’s inputs and outputs') }))

/**
 * The schema of a level (./tasks.js taskLevel): what it says once, then its tasks, each a puzzle on its own board. The
 * domain gives what is its own: `builds` the schema of the part a level's last board becomes (S.opt; by default
 * BUILT_PART), `ports` a task's fixed cards ({ inputs, outputs, … }; outputs by default one or more PORTs), `test` one
 * test, `checks` what a task's outputs must be beyond what its tests say ({ want }), `more` the task's other fields,
 * `page` one page of an introduction ({ t } by default). A domain whose levels also hold tasks of other kinds
 * (circuitCourse kinds) gives `kinds` ({ kind: fields }): every task then says its `kind`, a board's being 'circuit',
 * and every task has `shared`'s fields too. An introduction page and the pass text may each show a value (./views.js
 * SHOW), drawn by the kit as a figure.
 */
export const levelSchema = ({ builds = BUILDS, page = S.obj({ t: S.text(), show: S.opt(SHOW) }), ports, test, checks = {}, more = {}, shared = {}, kinds = null }) => {
  const own = {
    ...shared,
    stage: S.opt(S.text({ section: 'read', about: t('这次升级留下的管线分段名称', 'the pipeline stage this upgrade contributes') })),
    brief: S.text(),
    hint: S.opt(S.list(S.text())),
    intro: S.opt(S.list(page, { section: 'read', about: t('这个任务自己的引言：第一次做到它时读（第一个任务的接在这一关的后面）', 'the task’s own intro: read the first time it is played (the first task’s after the level’s)') })),
    after: S.opt(S.text({ about: t('这个任务通过时说的话（最后一个任务用这一关的点题）', 'what passing the task says (the last task says the level’s pass text)') })),
  }
  const board = {
    ...own,
    ...ports,
    outputs: ports.outputs ?? S.list(PORT, { min: 1 }),
    tests: S.list(test, { min: 1, section: 'tests' }),
    hidden: S.opt(S.list(test, { section: 'tests', about: t('隐藏测试：每次运行一并检查，通关后公开；只合上可见测试的板过不了它', 'hidden tests: checked with every run and shown once passed; a board that only fits the visible tests fails them') })),
    ...checks,
    solution: S.board({ about: t('一块板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') }),
    naive: S.opt(S.list(S.str(), { about: t('直觉上的错解：看起来能做、其实过不了这个任务的板，必须失败', 'the naive answer: a board that looks right and is not, which must fail') })),
    results: RESULTS,
    views: TASK_VIEWS,
    ...more,
  }
  const kind = (k, fields) => S.obj({ kind: S.oneOf([k]), ...fields })
  return taskLevel({
    title: S.text(),
    intro: S.opt(S.list(page)),
    after: S.opt(S.text()),
    afterShow: S.opt({ ...SHOW, about: t('点题旁显示的一个值', 'a value shown beside the pass text') }),
    note: S.opt(S.text()),
    adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
    builds,
    showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：为什么', 'a new part may have a level that only places it: why') })),
  }, kinds ? S.by('kind', { circuit: kind('circuit', board), ...Object.fromEntries(Object.entries(kinds).map(([k, fields]) => [k, kind(k, { ...own, ...fields })])) }) : board)
}

/* ---------- game.json ---------- */

// The schema of a game.json on the base (a domain's vocabulary game): its eras laid out as ../course.js layout reads
// them and the primitives it starts from.
const ids = S.list(S.str())
const levels = S.list(S.level())
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels })) }))
const AFTER = S.either(S.level(), levels)
const ERA = S.obj({
  id: S.int(),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  title: S.text(),
  question: S.text(),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), after: S.opt(AFTER), requires: S.opt(ids), levels, title: S.opt(S.text()) }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(AFTER) }))),
})
export const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  primitives: S.list(S.ref('part')),
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念', 'parts that are one new idea together') })),
  eras: S.list(ERA, { min: 1 }),
  views: GAME_VIEWS,
})

/* ---------- the spec ---------- */

export const circuitSpec = (domain, courseOf) => (content) => {
  const circuit = courseOf(content)
  return {
    id: content.id,
    domain,
    title: content.title,
    course: circuit.course,
    levels: circuit.LEVELS,
    circuit,
    blueprints: circuit.blueprints,
    syncOwn: circuit.syncOwn,
    texts: { chapters: circuit.CHAPTERS, glossary: content.glossary.entries },
  }
}

/* ---------- a run ---------- */

/**
 * What a game calls its tests, in each place the screen and a blind session say it: a test's tab (`label(k)`), the note
 * on how many are hidden (`note(n)`) and what it says when some hidden ones fail (`failed(fails, n)`). A test is a test
 * unless the game's world gives it a name of its own (a bus game's are buses).
 */
export const TEST_WORDS = {
  label: (k) => t(`测试 ${k + 1}`, `Test ${k + 1}`),
  note: (n) => t(`另有 ${n} 个隐藏测试，每次运行一并检查，通关后公开。`, `${n} more hidden ${n === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`),
  failed: (fails, n) => t(`可见的测试全部通过，但 ${n} 个隐藏测试中有 ${fails} 个没有通过：这块板可能只是恰好合上了这几个测试。`, `Every test shown passes, but ${fails} of ${n} hidden ${n === 1 ? 'test fails' : 'tests fail'}: the board may only happen to fit these.`),
}


/**
 * A run's ticks ([{ tick, outputs, … }]) judged against what a task wants: the first tick on which a port of `checked`
 * ([{ name, label }]) gives other than `want(name)[tick]` (undefined: anything will do) is the run's `fail`
 * ({ tick, name, want, got }), and that tick gets `failed`, why in words. `got(tick, name)` is what the board gave
 * there (its output by default), `same(want, got)` whether that is what is wanted, `show` a value in words.
 * Returns { ticks, fail? }.
 */
export function judgeTicks(ticks, { checked, want, got = (tick, name) => tick.outputs[name] ?? null, same = (a, b) => a === b, show = valueText }) {
  const word = (v, lang) => (typeof show(v) === 'object' ? show(v)[lang] : show(v))
  for (const tick of ticks) {
    for (const { name, label } of checked) {
      const w = want(name)?.[tick.tick]
      const g = got(tick, name)
      if (w === undefined || same(w, g)) continue
      const failed = t(`第 ${tick.tick} 拍，「${label.zh ?? label}」应当是 ${word(w, 'zh')}，这块板给出 ${word(g, 'zh')}。`, `At tick ${tick.tick}, “${label.en ?? label}” should be ${word(w, 'en')}; the board gives ${word(g, 'en')}.`)
      return { ticks: ticks.map((x) => (x === tick ? { ...x, failed } : x)), fail: { tick: tick.tick, name, want: w, got: g } }
    }
  }
  return { ticks }
}

/** A task's every test on a board, each run by `runTest(task, board, test, parts)`: { runs, pass }. */
export const runTests = (runTest) => (task, board, parts) => {
  const runs = task.tests.map((test) => runTest(task, board, test, parts))
  return { runs, pass: runs.every((r) => !r.fail && !r.error) }
}

/* ---------- the checks ---------- */

/**
 * Level by level, task by task: the reference board passes every test and hidden test and uses only the parts the
 * level holds; the empty board fails them; so does the board a task carries on from, and every board that only wires
 * one card on the left straight to everything on the right; the naive board, where there is one, fails; a part a level
 * builds, placed alone and wired to the task's cards, passes them; and the rows the task lays out its results in
 * (`results`, ./views.js) show what it offers, in views that draw it. `more(task, k, tasks, held)` adds a domain's
 * own problems (held: the parts the task holds); a task of another kind is the domain's to check (`kinds`). A tick
 * board's line says how many ticks the reference ran.
 */
export function checkCircuitTasks(circuit, { run, entries, failure = () => '', more = () => [], kinds = {} }) {
  const { LEVELS, course, board } = circuit
  const noted = (ref) => (board.ticks ? `, ${ref.runs.reduce((n, r) => n + r.ticks.length, 0)} ticks` : '')
  const built = new Set(LEVELS.filter((L) => L.builds).map((L) => L.builds.type))
  const out = [...circuit.wrong, ...viewsProblems(circuit.views)].map((text) => ({ text, fail: true }))
  // The values a level's introduction pages and pass text show, its own and its tasks'.
  for (const level of LEVELS) {
    const shows = [...(level.intro ?? []).map((p, k) => [p.show, `intro[${k}].show`]), [level.afterShow, 'afterShow'], ...level.tasks.flatMap((task, j) => (task.intro ?? []).map((p, k) => [p.show, `tasks[${j}].intro[${k}].show`]))]
    for (const [show, where] of shows) if (show) out.push(...showProblems(show, `${level.id} ${where}`).map((text) => ({ level: level.id, text, fail: true })))
  }
  for (const level of LEVELS) {
    const tasks = circuit.played.get(level.id)
    const said = tasks.map((task, k) => {
      const here = circuit.forTask(task)
      const { partOf } = here
      const head = tasks.length > 1 ? `task ${task.taskId}: ` : ''
      if (kinds[task.kind]) {
        const own = kinds[task.kind](task)
        return { problems: own.problems, text: `${head}${own.problems.length ? own.problems.join('; ') : own.ok}` }
      }
      const held = new Set(usable(course, { id: level.id, task: k }, built))
      const problems = []
      const all = withHidden(task)
      const where = (j) => (j < task.tests.length ? `test ${j + 1}` : `hidden test ${j - task.tests.length + 1}`)
      const strays = (b, what) => b.nodes.filter((n) => !board.isFixed(n.type) && !held.has(n.type)).forEach((n) => problems.push(`${what} uses ${n.type}, which the level does not hold`))
      const passes = (b) => run(all, b, partOf).pass
      strays(task.solution, 'the answer')
      if (task.starter) strays(task.starter, 'the starter')
      const ref = run(all, task.solution, partOf)
      ref.runs.forEach((r, j) => {
        if (r.error || r.fail) problems.push(`the answer fails ${where(j)}${failure(r) ? ` ${failure(r)}` : ''}`)
      })
      const views = { ...circuit.views, ...task.views }
      problems.push(...viewsProblems(task.views), ...rowProblems(task.results, entries({ task, test: all.tests[0], run: ref.runs[0], sample: null }), views))
      if (passes(board.startBoard(task))) problems.push(task.starter ? 'the board it opens on passes' : 'the empty board passes')
      if (task.carry && passes(circuit.opening(task))) problems.push(`the board it carries on from (${task.carry}) passes as it is`)
      if (task.carries && tasks[k - 1]?.solution && passes(board.carriedOnto(task, tasks[k - 1].solution))) problems.push('the task before’s board passes as it is')
      if (task.solution.nodes.some((n) => !board.isFixed(n.type))) {
        const outs = board.portsOut(task).map((o) => o.name)
        for (const name of board.portsIn(task).map((i) => i.name)) {
          const from = board.sourceOf(task, name)
          if (passes({ nodes: board.fixedOf(task), wires: outs.map((to) => ({ from, to, port: 'in' })) })) problems.push(`the board that only wires ${name} straight through passes`)
        }
      }
      problems.push(...more(task, k, tasks, held))
      let naive = ''
      if (task.naive) {
        strays(task.naive, 'the naive answer')
        const first = run(all, task.naive, partOf).runs.findIndex((r) => r.fail || r.error)
        if (first < 0) problems.push('the naive answer passes')
        else naive = `, naive fails ${where(first)}`
      }
      const builds = level.builds && k === tasks.length - 1
      if (builds) {
        const outs = board.portsOut(task).map((o) => o.name)
        const box = board.fromText([`p = ${level.builds.type}(${board.portsIn(task).map((i) => board.sourceOf(task, i.name).replace('#', '.')).join(', ')})`, ...outs.map((o) => `${o} <- ${outs.length > 1 ? `p.${o}` : 'p'}`)], task, here)
        run(all, box, partOf).runs.forEach((r, j) => {
          if (r.fail || r.error) problems.push(`its part ${level.builds.type} alone fails ${where(j)}`)
        })
      }
      const hidden = task.hidden.length ? ` + ${task.hidden.length} hidden` : ''
      return { problems, text: `${head}${problems.length ? problems.join('; ') : `answer PASS (${task.tests.length} tests${hidden}${noted(ref)})${naive}${builds ? `, part ${level.builds.type} PASS` : ''}`}` }
    })
    out.push({ level: level.id, fail: said.some((x) => x.problems.length > 0), text: `${level.id} ${keyOf(level.title)}: ${said.map((x) => x.text).join(' · ')}` })
  }
  return out
}
