// A game's course on the net domain, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says
// what may be in it): the play order and level tree from its eras (../../course.js layout), each level's tests — what
// arrives on each wire in (wire.js: the sender's segments, the wire's delay, the flips), the inputs, the queue — and
// what its outputs and wires out must be (wants.js), its hidden tests likewise, its reference board and naive board,
// the parts the levels build (each running the board the player passed it with: a packed part that keeps its own
// registers, its ports the level's wires, inputs and outputs), and the course the shared audit checks.
//
// A test runs for `ticks` ticks, by default until two ticks after the last thing it gives arrives.
// Returns { LEVELS, CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built), blueprints, wrong }: `wrong`, what
// reading the content found that its schema cannot say (a board that does not read, an output with nothing wanted).
import { packed } from '../../engine/boards.js'
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { arrived, said } from './wire.js'
import { fits, fromText, portsIn, portsOut, toText } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'

/** The boards the player passed the building levels with, by level id (the shell's progress.built). */
const OWN = new Map()

/** A test as content writes it, run out: what arrives on each wire in, tick by tick, and how many ticks it runs. */
function testOf(level, t) {
  const sent = Object.fromEntries((level.wires?.in ?? []).map((w) => [w.name, said(t.wires?.[w.name]?.send ?? [])]))
  const delay = (name) => level.wires.in.find((w) => w.name === name).delay ?? 0
  const longest = Math.max(0, ...Object.entries(sent).map(([name, bits]) => bits.length + delay(name)), ...Object.values(t.inputs ?? {}).map((v) => v.length))
  const ticks = t.ticks ?? longest + 2
  const wires = Object.fromEntries(Object.entries(sent).map(([name, bits]) => [name, arrived(bits, { delay: delay(name), flips: t.wires?.[name]?.flips ?? [] }, ticks)]))
  return { ...t, ticks, wires, inputs: t.inputs ?? {}, queue: t.queue ?? [] }
}

export function netCourse(content) {
  const { eras, primitives, levels, concept = {} } = content
  const wrong = []
  const say = (level, text) => wrong.push(`${level}: ${text}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')

  // Each built part runs the board its level was passed with (while it still fits the level), or the level's reference.
  const BUILT = {}
  const partOf = (type) => PARTS[type] ?? BUILT[type]
  // Every board the content writes as blueprint text, with how it reads back on its level (domain.js blueprints).
  const blueprints = []
  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const names = portsOut(level).map((o) => o.name)
    const pulled = level.pulls ? [level.pulls.input, level.pulls.last].filter(Boolean) : []
    const all = [...portsIn(level).map((p) => p.name), ...names]
    for (const name of all) if (all.indexOf(name) !== all.lastIndexOf(name)) say(id, `two of its wires, inputs and outputs are called ${name}`)
    if (level.pulls) {
      for (const name of pulled) if (!(level.inputs ?? []).some((i) => i.name === name)) say(id, `it pulls into ${name}, which is no input`)
      if (!(level.outputs ?? []).some((o) => o.name === level.pulls.next)) say(id, `it asks for the next byte on ${level.pulls.next}, which is no output`)
    }
    if (!names.length) say(id, 'the level has no wire out and no output: nothing is checked')
    for (const name of names) if (!level.want[name] && name !== level.pulls?.next) say(id, `nothing is wanted of ${name}`)
    for (const name of Object.keys(level.want)) if (!names.includes(name)) say(id, `wants ${name}, which is no output and no wire out`)
    for (const t of [...level.tests, ...(level.hidden ?? [])]) {
      for (const i of level.inputs ?? []) if (!pulled.includes(i.name) && !t.inputs?.[i.name]) say(id, `a test gives nothing on the input ${i.name}`)
      for (const name of Object.keys(t.wires ?? {})) if (!(level.wires?.in ?? []).some((w) => w.name === name)) say(id, `a test sends on ${name}, which is no wire in`)
      if (level.pulls && !t.queue) say(id, 'a test gives the board no queue to pull from')
    }
    const out = {
      ...level,
      era: eraOf.get(id).id,
      requires: plan.requires.get(id) ?? [],
      adds: level.adds ?? [],
      tests: level.tests.map((t) => testOf(level, t)),
      hidden: (level.hidden ?? []).map((t) => testOf(level, t)),
      want: wantOf(level.want),
    }
    const read = (lines, what, naive = false) => {
      try {
        const board = fromText(lines, out, partOf)
        blueprints.push({ level: id, board, write: (b) => toText(b, partOf), read: (text) => fromText(text, out, partOf), ...(naive ? { naive } : {}) })
        return board
      } catch (e) {
        say(id, `${what}: ${e.en ?? String(e)}`)
        return { nodes: [], wires: [] }
      }
    }
    out.solution = read(level.solution, 'the answer')
    if (level.naive) out.naive = read(level.naive, 'the naive answer', true)
    if (level.builds) {
      const fitting = new WeakMap()
      const own = () => {
        const b = OWN.get(id)
        if (!b) return out.solution
        if (!fitting.has(b)) fitting.set(b, fits(b, out, partOf))
        return fitting.get(b) ? b : out.solution
      }
      BUILT[level.builds.type] = packed({
        circuit: own,
        inputs: portsIn(level).map((i) => i.name),
        outputs: names,
        holds: true,
        built: level.builds,
        // What the part runs, opened on a board: the player's board (or the reference) and the level that builds it.
        opens: () => ({ circuit: own(), level: out }),
      })
    }
    return out
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const builderOf = new Map(LEVELS.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    primitives,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    concept: (part) => concept[part] ?? part,
    naive: (level) => Boolean(byId.get(level.id)?.naive),
    needed: (level) => [...new Set(byId.get(level.id).solution.nodes.map((n) => n.type).filter((t) => !PARTS[t] || primitives.includes(t)))],
    boards: (level) => [byId.get(level.id).solution],
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  return {
    LEVELS,
    CHAPTERS,
    course,
    partOf,
    BUILT,
    wrong,
    blueprints,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    syncOwn: (built = {}) => {
      OWN.clear()
      for (const [id, circuit] of Object.entries(built)) if (circuit?.nodes) OWN.set(id, circuit)
    },
  }
}
