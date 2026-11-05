// The base a circuit domain stands on (games/DESIGN.md 6.3): its boards, its course read from content, and the checks
// every circuit level gets. A domain says what is particular to it — the cards a level gives its board, its parts,
// how a task's tests read and run — and gets the rest:
//
//   circuitBoard({ cards, ticks, right, gap }) → { FIXED, FIXED_PARTS, portsIn, portsOut, fixedOf, startBoard, fits,
//     carriedOnto, wiring, fromText, toText }
//       cards  [{ type, side: 'left' | 'right', of(task) → [{ name, label }], params?(port), part? }] in board order:
//              the cards a level gives (its inputs, outputs, wires…), each a source on the left or a sink on the right
//              unless it gives its own part (a line heard, a line driven)
//       ticks  the board runs tick by tick (../engine/ticks.js), so its wires may feed back
//   circuitCourse(content, { board, parts, read?, holds?, replaces? }) → { LEVELS, played, builtBy, CHAPTERS,
//     course, partOf, BUILT, types, blueprints, wrong, offerIn, carried, opening, syncOwn }
//       parts  { type: part } the game's primitives; read(task, say) → the task's own fields read (its tests…), after
//              checking what its schema cannot say; holds: a built part keeps its own registers
//   checkCircuitTasks(circuit, { run, failure?, more?, note? }) → the domain's lines for npm run check
//       run(task, board) → { runs: [{ fail?, error? }], pass }; failure(run) the words for a run that fails
//
// A board is { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }; as text it is the kernel's
// blueprint (../circuit/text.js), read and checked there. The boards the player passed the building levels with live
// in the course read (syncOwn), one per content: two games of a domain in one process never share them.
import { print, read } from '../circuit/text.js'
import { packed, sink, source } from './boards.js'
import { portsOf } from './circuit.js'
import { withHidden } from './tests.js'
import { taskLevels } from './tasks.js'
import { defineCourse, eraLevels, layout, offer, usable } from '../course.js'
import { keyOf } from '../shell/i18n.js'

/* ---------- the board ---------- */

export function circuitBoard({ cards, ticks = false, right = 980, gap = 140 }) {
  const FIXED = cards.map((c) => c.type)
  const FIXED_PARTS = Object.fromEntries(cards.map((c) => [c.type, c.part ?? (c.side === 'left' ? source() : sink())]))
  const side = (task, s) => cards.filter((c) => c.side === s).flatMap((c) => c.of(task).map((p) => ({ card: c, port: p })))
  const portsIn = (task) => side(task, 'left').map((x) => x.port)
  const portsOut = (task) => side(task, 'right').map((x) => x.port)
  const node = ({ card, port }) => ({ id: port.name, type: card.type, params: card.params ? card.params(port) : { name: port.name } })
  const fixedOf = (task) => [...side(task, 'left').map((x, k) => ({ ...node(x), x: 20, y: 40 + k * gap })), ...side(task, 'right').map((x, k) => ({ ...node(x), x: right, y: 40 + k * gap }))]
  const startBoard = (task) => ({ nodes: fixedOf(task), wires: [] })
  const isFixed = (type) => FIXED.includes(type)
  const sinks = new Set(cards.filter((c) => c.side === 'right').map((c) => c.type))

  /** Whether a saved board still fits its task: the task's fixed cards, and every card one the domain knows. */
  const fits = (board, task, partOf) => {
    const ids = (b) => b.nodes.filter((n) => isFixed(n.type)).map((n) => n.id).sort().join()
    return ids(board) === ids(startBoard(task)) && board.nodes.every((n) => partOf(n.type))
  }

  /** A board from another level brought onto `task`: its placed parts and their wires, and its wires to the fixed cards this task has too. */
  const carriedOnto = (task, board) => {
    const fixed = fixedOf(task)
    const placed = board.nodes.filter((n) => !isFixed(n.type))
    const own = new Map(fixed.map((n) => [n.id, n]))
    const ids = new Set([...fixed, ...placed].map((n) => n.id))
    const from = (w) => w.from.split('#')[0]
    const keeps = (w) => ids.has(from(w)) && ids.has(w.to) && (!own.has(w.to) || w.port === 'in') && (!own.has(from(w)) || board.nodes.find((n) => n.id === from(w))?.type === own.get(from(w)).type)
    return { nodes: [...fixed, ...placed], wires: board.wires.filter(keeps) }
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
    outputs: (n) => {
      const outs = circuit.BUILT[n.type] && portsOut(circuit.builtBy(n.type))
      return outs && outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
    },
  })

  /** The board blueprint lines describe on `task` (the kernel's reader); throws the first { line, zh, en } it cannot read. */
  const fromText = (lines, task, circuit) => {
    const got = read(lines.join('\n'), startBoard(task), wiring(task, circuit), circuit.types())
    if (got.errors) throw got.errors[0]
    return got.graph
  }
  /** A board as blueprint lines, as content writes it (no header): what fromText reads back on the task. */
  const toText = (board, task, circuit) => print(board, wiring(task, circuit)).split('\n').filter((line) => line && !line.startsWith('#'))

  return { FIXED, FIXED_PARTS, isFixed, portsIn, portsOut, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText }
}

/** A circuit of the game's primitives alone, no part built: what a board reads on outside a course (a test, a tool). */
export const primitivesOnly = (board, parts) => ({ BUILT: {}, partOf: (t) => board.FIXED_PARTS[t] ?? parts[t], types: () => Object.keys(parts).filter((t) => !board.isFixed(t)), builtBy: () => null })

/* ---------- the course ---------- */

export function circuitCourse(content, { board, parts, read: readOwn = (task) => task, holds = false, replaces = () => [] }) {
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
  const partOf = (type) => board.FIXED_PARTS[type] ?? parts[type] ?? BUILT[type]
  const blueprints = []
  const played = new Map()
  const builderOf = new Map(levels.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const circuit = { BUILT, partOf, types: () => [...Object.keys(parts), ...Object.keys(BUILT)].filter((t) => !board.isFixed(t)), builtBy: (type) => (builderOf.has(type) ? played.get(builderOf.get(type).id)?.at(-1) ?? null : null) }

  const readTask = (id, task, where) => {
    const names = [...board.portsIn(task), ...board.portsOut(task)].map((p) => p.name)
    for (const name of new Set(names)) if (names.indexOf(name) !== names.lastIndexOf(name)) say(where, `two of its cards are called ${name}`)
    if (!board.portsOut(task).length) say(where, 'it has nothing on the right: nothing is checked')
    const out = { ...readOwn(task, (text) => say(where, text)), id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: task.adds ?? [] }
    out.hidden = out.hidden ?? []
    const boardOf = (lines, what, naive = false) => {
      try {
        const b = board.fromText(lines, out, circuit)
        blueprints.push({ level: id, task: task.task, key: task.taskId, board: b, write: (x) => board.toText(x, out, circuit), read: (text) => board.fromText(text, out, circuit), ...(naive ? { naive } : {}) })
        return b
      } catch (e) {
        say(where, `${what}: ${e.en ?? String(e)}`)
        return { nodes: [], wires: [] }
      }
    }
    out.solution = boardOf(task.solution, 'the answer')
    if (task.naive) out.naive = boardOf(task.naive, 'the naive answer', true)
    return out
  }

  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const tasks = taskLevels(level)
    const read = tasks.map((task) => readTask(id, task, tasks.length > 1 ? `${id} task ${task.taskId}` : id))
    played.set(id, read)
    // The part a level builds runs its last task's board: the player's, while it fits, else the reference.
    const last = read.at(-1)
    if (level.builds) {
      const fitting = new WeakMap()
      const running = () => {
        const b = own.get(id)
        if (!b) return last.solution
        if (!fitting.has(b)) fitting.set(b, board.fits(b, last, partOf))
        return fitting.get(b) ? b : last.solution
      }
      BUILT[level.builds.type] = packed({
        circuit: running,
        inputs: board.portsIn(last).map((p) => p.name),
        outputs: board.portsOut(last).map((p) => p.name),
        ...(holds ? { holds: true } : {}),
        built: level.builds,
        opens: () => ({ circuit: running(), level: last }),
      })
    }
    return { ...level, id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: level.adds ?? [] }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const solutions = (id) => played.get(id).map((T) => T.solution)
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    primitives,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    concept: (part) => concept[part] ?? part,
    naive: (level) => played.get(level.id)?.some((T) => T.naive) ?? false,
    needed: (level) => [...new Set(solutions(level.id).flatMap((b) => b.nodes).map((n) => n.type).filter((t) => !board.isFixed(t) && (!parts[t] || primitives.includes(t))))],
    boards: (level) => solutions(level.id),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    replaces,
    carries: (level) => played.get(level.id)?.map((T) => T.carry).filter(Boolean) ?? [],
    abstraction: true,
  })
  return {
    LEVELS,
    played,
    builtBy: circuit.builtBy,
    CHAPTERS,
    course,
    partOf,
    BUILT,
    types: circuit.types,
    board,
    blueprints,
    wrong,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    // The levels a task carries on from: passing them keeps the board (progress.built).
    carried: new Set(LEVELS.flatMap((L) => played.get(L.id).map((T) => T.carry)).filter(Boolean)),
    // The board a task opens on: the board of the level it carries on from (the player's, else its last task's
    // reference), or its fixed cards alone.
    opening: (task, built = {}) => {
      if (!task.carry) return board.startBoard(task)
      const from = played.get(task.carry)?.at(-1)
      const b = built[from?.taskId]?.nodes ? built[from.taskId] : from?.solution
      return b ? board.carriedOnto(task, b) : board.startBoard(task)
    },
    // The shell keeps boards by task (../shell/progress.js): a level's part runs its last task's.
    syncOwn: (built = {}) => {
      own.clear()
      for (const L of LEVELS) {
        const b = built[played.get(L.id).at(-1).taskId]
        if (b?.nodes) own.set(L.id, b)
      }
    },
  }
}

/* ---------- the checks ---------- */

/**
 * Level by level, task by task: the reference board passes every test and hidden test and uses only the parts the
 * level holds; the empty board fails them; so does the board a task carries on from, and every board that only wires
 * one card on the left straight to everything on the right; the naive board, where there is one, fails; and a part a
 * level builds, placed alone and wired to the task's cards, passes them. `more(task, k, tasks)` adds a domain's own
 * problems; `note(ref)` a word on the reference's run.
 */
export function checkCircuitTasks(circuit, { run, failure = () => '', more = () => [], note = () => '' }) {
  const { LEVELS, course, partOf, board } = circuit
  const built = new Set(LEVELS.filter((L) => L.builds).map((L) => L.builds.type))
  const out = circuit.wrong.map((text) => ({ text, fail: true }))
  for (const level of LEVELS) {
    const tasks = circuit.played.get(level.id)
    const held = new Set(usable(course, { id: level.id }, built))
    const said = tasks.map((task, k) => {
      const problems = []
      const all = withHidden(task)
      const where = (j) => (j < task.tests.length ? `test ${j + 1}` : `hidden test ${j - task.tests.length + 1}`)
      const strays = (b, what) => b.nodes.filter((n) => !board.isFixed(n.type) && !held.has(n.type)).forEach((n) => problems.push(`${what} uses ${n.type}, which the level does not hold`))
      const passes = (b) => run(all, b, partOf).pass
      strays(task.solution, 'the answer')
      const ref = run(all, task.solution, partOf)
      ref.runs.forEach((r, j) => {
        if (r.error || r.fail) problems.push(`the answer fails ${where(j)}${failure(r) ? ` ${failure(r)}` : ''}`)
      })
      if (passes(board.startBoard(task))) problems.push('the empty board passes')
      if (task.carry && passes(circuit.opening(task))) problems.push(`the board it carries on from (${task.carry}) passes as it is`)
      if (task.carries && k > 0 && passes(board.carriedOnto(task, tasks[k - 1].solution))) problems.push('the task before’s board passes as it is')
      if (task.solution.nodes.some((n) => !board.isFixed(n.type))) {
        const outs = board.portsOut(task).map((o) => o.name)
        for (const from of board.portsIn(task).map((i) => i.name)) {
          if (passes({ nodes: board.startBoard(task).nodes, wires: outs.map((to) => ({ from, to, port: 'in' })) })) problems.push(`the board that only wires ${from} straight through passes`)
        }
      }
      problems.push(...more(task, k, tasks))
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
        const box = board.fromText([`p = ${level.builds.type}(${board.portsIn(task).map((i) => i.name).join(', ')})`, ...outs.map((o) => `${o} <- ${outs.length > 1 ? `p.${o}` : 'p'}`)], task, circuit)
        run(all, box, partOf).runs.forEach((r, j) => {
          if (r.fail || r.error) problems.push(`its part ${level.builds.type} alone fails ${where(j)}`)
        })
      }
      const hidden = task.hidden.length ? ` + ${task.hidden.length} hidden` : ''
      const head = tasks.length > 1 ? `task ${task.taskId}: ` : ''
      return { problems, text: `${head}${problems.length ? problems.join('; ') : `answer PASS (${task.tests.length} tests${hidden}${note(ref)})${naive}${builds ? `, part ${level.builds.type} PASS` : ''}`}` }
    })
    out.push({ level: level.id, fail: said.some((x) => x.problems.length > 0), text: `${level.id} ${keyOf(level.title)}: ${said.map((x) => x.text).join(' · ')}` })
  }
  return out
}
