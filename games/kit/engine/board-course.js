// A circuit game's course read from its content (games/DESIGN.md 6.3): its tasks with their tests and boards, the play
// order and level tree from its eras, and the parts its levels build, registered as pieces (./pieces.js) whose inside
// is the board a task was passed with. A domain says how its own fields and tests read:
//
//   circuitCourse(content, { board, parts, read?, test?, kinds?, pack?, holds?, replaces?, unwanted? }) → { LEVELS,
//     played, builtBy, CHAPTERS, course, partOf, BUILT, types, blueprints, wrong, offerIn, introductions, carried,
//     opening, syncOwn }
//       board  its circuitBoard (./board-cards.js)
//       parts  { type: part } the game's primitives; read(task, say) → the task's own fields read (what it wants…),
//              test(test, task, say) → each of its tests and hidden tests read (its values…), each after checking what
//              its schema cannot say; holds: a built part keeps its own registers; a task that says what its board's
//              right must give (`want`) names each port there once, but those unwanted(task) names
//       kinds  { kind: read(task, say) → the task read } the tasks that are no board (a grid to fill in, a choice), by
//              their `kind`: the domain reads them and plays them on screens of its own; every other task is a board
//       pack(builds, say) → what else the part a level builds is (settings a player sets on it: params, fields…)
//     A task holds the parts its level adds and those its own tasks up to it add (`adds`), and brings in (`fresh`)
//     those it adds itself, the first task its level's too; its tray offers by them and by its own answer.
//   definedCourse(content, { board, ops, read? }) → circuitCourse's, with { defs, defaultsOf }: the course of a domain
//     whose games define their own parts (parts.json, ./parts/define.js) over its engine resources `ops`, and whose
//     tests give a value on every input and expect one of every output (`inputs`, `expect`); read(value, name, say) →
//     a value as content writes it made a value on the wires
//
// The boards the player passed the building levels with live in the course read (syncOwn), one per content: two games
// of a domain in one process never share them.
import { stagesOf } from './stages.js'
import { pieceReferences } from './pieces.js'
import { packed, withSettings } from './boards.js'
import { defineParts } from './parts/define.js'
import { formed } from './forms.js'
import { taskLevels } from './tasks.js'
import { trayIn } from './trays.js'
import { defineCourse, eraLevels, holds as holding, layout, offer, readItem } from '../course.js'
import { T as t } from '../shell/i18n.js'

export function circuitCourse(content, { board, parts, read: readOwn = (task) => task, test: readTest = (t) => t, kinds = {}, pack = () => ({}), holds = false, replaces = () => [], unwanted = () => [] }) {
  const { eras, trays, primitives, levels, concept = {} } = content
  const notes = content.mode === 'notes'
  const wrong = []
  const say = (where, text) => wrong.push(`${where}: ${text}`)
  const plan = layout(eras, { notes })
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')
  // The boards the player passed the building levels with (the shell's progress.built), by level id: this content's.
  const own = new Map()
  const BUILT = {}
  const revisions = []
  const readBuilders = new Map()
  const readForms = new Map()
  const combine = (variants) => {
    const forms = [...variants].map(([key, { part }]) => ({ ...part, key }))
    const first = forms[0]
    const pick = (params) => forms.find(f => f.key === params?.form) ?? first
    const option = { control: 'select', key: 'form', label: t('形态'), options: forms.map(f => ({ value: f.key, label: f.built.formLabel ?? f.key })) }
    return {
      ...first, ...formed(forms),
      opens: (params) => pick(params).opens(params),
      outputs: (node) => pick(node.params).outputs?.(node),
      reads: forms.some(form => form.reads) ? (node, key, ctx) => pick(node.params).reads?.(node, key, ctx) : undefined,
      fields: [option, ...first.fields ?? []],
      defaults: { ...first.defaults, form: first.key },
      settings: { ...first.settings, form: forms.map(f => f.key) },
    }
  }
  const readBuilder = (type, params) => {
    const variants = readForms.get(type)
    return (variants?.get(params?.form) ?? variants?.values().next().value)?.task ?? readBuilders.get(type) ?? null
  }
  const partOf = (type) => board.FIXED_PARTS[type] ?? parts[type] ?? BUILT[type]
  const blueprints = []
  const played = new Map()
  const builderOf = new Map(levels.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const circuit = { BUILT, partOf, types: () => [...Object.keys(parts), ...Object.keys(BUILT)].filter((t) => !board.isFixed(t)), builtBy: readBuilder }

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
    if (task.works) out.works = task.works.map((w, k) => ({ label: w.label, board: boardOf(w.board, `work ${k + 1}`, true) }))
    if (task.naive) out.naive = boardOf(task.naive, 'the naive answer', true)
    for (const field of ['withhold', 'grants', 'opens']) for (const item of task[field] ?? []) {
      const problem = itemProblem(item)
      if (problem) say(where, `${field} names ${item}: ${problem}`)
    }
    for (const item of task.opens ?? []) if (!readItem(item).key) say(where, `it opens ${item}, a part: a part is brought in by adds`)
    for (const item of task.withhold ?? []) if (out.solution.nodes.some((n) => n.type === item)) say(where, `its answer uses ${item}, which it withholds`)
    return out
  }
  // Why an item (../course.js: a part, one of its settings, one value of a setting) is none of this game's, or ''.
  const itemProblem = (item) => {
    const { part, key, value } = readItem(item)
    const settings = parts[part]?.settings
    if (!parts[part] && !builderOf.has(part)) return `${part} is no part`
    if (key === undefined || !settings) return ''
    if (!settings[key]) return `${part} has no setting ${key} of several values`
    return value === undefined || settings[key].map(String).includes(value) ? '' : `${value} is no value of ${part}’s ${key}`
  }
  const isBoard = (task) => !kinds[task.kind]

  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    // A task holds what the level adds and what its tasks up to it add; it brings in (`fresh`) its own, the first the level's too.
    const tasks = taskLevels(level).map((task, k) => ({ ...task, adds: [...new Set([...(level.adds ?? []), ...level.tasks.slice(0, k + 1).flatMap((T) => T.adds ?? [])])], opened: [...new Set(level.tasks.slice(0, k + 1).flatMap((T) => T.opens ?? []))], fresh: [...(k === 0 ? level.adds ?? [] : []), ...(level.tasks[k].adds ?? [])] }))
    const buildAt = level.builds?.task ? tasks.findIndex(task => task.taskId === level.builds.task) : tasks.length - 1
    if (level.builds && (buildAt < 0 || !isBoard(tasks[buildAt]))) say(id, 'the task publishing its part is missing or is not a board')
    const read = tasks.map((task, k) => {
      const last = readTask(id, task, tasks.length > 1 ? `${id} task ${task.taskId}` : id)
      if (!level.builds || k !== buildAt || !isBoard(last)) return last
      // A later task in this level can call the board published by this task.
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
        parts: partOf,
        ...(holds ? { holds: true } : {}),
        built: level.builds,
        ...pack(level.builds, (text) => say(id, text)),
        // What the part runs, opened on a board: its board with the part's settings put on it, and the task it is.
        opens: (params) => ({ circuit: withSettings(running(), params, partOf), level: last }),
      })
      const { type, form } = level.builds
      revisions.push({ type, form: form ?? null, task: last, part })
      if (form) {
        if (!readForms.has(type)) readForms.set(type, new Map())
        const variants = readForms.get(type)
        variants.set(form, { task: last, part })
        BUILT[type] = combine(variants)
      } else {
        BUILT[type] = part
        readBuilders.set(type, last)
      }
      return last
    })
    played.set(id, read)
    return { ...level, id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: tasks.at(-1).adds, opened: tasks.at(-1).opened, buildAt }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  // A course level is a level, or one of its tasks (`task`, its index): what that task holds and its answer.
  const taskOf = (level) => (level.task === undefined ? null : played.get(level.id)?.[level.task] ?? null)
  const solutions = (level) => (taskOf(level) ? [taskOf(level)] : played.get(level.id)).filter(isBoard).map((T) => T.solution)
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    trays,
    tray: (level) => trayIn(trays, given.get(level.id)?.tray),
    primitives,
    adds: (level) => (taskOf(level) ?? byId.get(level.id))?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    // A level's part is built by one of its tasks: the tasks after that one hold it.
    builds: (level) => {
      const L = byId.get(level.id)
      return L?.builds && (level.task === undefined || L.buildAt <= level.task) ? [L.builds.type] : []
    },
    opens: (level) => (taskOf(level) ?? byId.get(level.id))?.opened ?? [],
    gives: (level) => taskOf(level)?.grants ?? [],
    withholds: (level) => taskOf(level)?.withhold ?? [],
    concept: (part) => concept[part] ?? part,
    naive: (level) => played.get(level.id)?.some((T) => T.naive) ?? false,
    needed: (level) => {
      const boards = solutions(level)
      if (!boards.length) return null
      return [...new Set(boards.flatMap((b) => b.nodes).map((n) => n.type)
        .filter((t) => !board.isFixed(t) && (!parts[t] || primitives.includes(t))))]
    },
    boards: (level) => solutions(level),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    replaces,
    carries: (level) => played.get(level.id)?.map((T) => T.carry).filter(Boolean) ?? [],
    openParts: (level) => (played.get(level.id) ?? []).filter(isBoard).map((task) => {
      const shown = stagesOf({ task, board: task.solution, chain: result.stageChain(task), isFixed: (n) => board.isFixed(n.type) })
      return { task: task.taskId, staged: shown.stages.length > 0, count: shown.loose.length }
    }),
    references: pieceReferences(revisions, { before: (a, b) => course.before(a, b), passed: (task) => own.has(task.id) }),
    abstraction: true,
    notes,
  })
  const { references } = course
  wrong.push(...references.problems())
  const scopes = new Map()
  const formsFor = (type, task) => {
    const forms = task ? holding(course, task, new Set()).forms(type) : references.forms(type)
    return forms.length ? forms : references.forms(type).slice(0, 1)
  }
  const inside = (task, type, form) => task
    ? holding(course, task, new Set()).inside(type, form)
    : references.resolve(type, form)
  const builderFor = (type, params, task) => {
    const forms = formsFor(type, task)
    return inside(task, type, forms.includes(params?.form) ? params.form : forms[0] ?? null)?.task ?? null
  }
  const refresh = (target, task) => {
    for (const type of Object.keys(BUILT)) {
      const forms = formsFor(type, task)
      target[type] = forms.length
        ? combine(new Map(forms.map(form => [form, inside(task, type, form)])))
        : inside(task, type, null).part
    }
  }
  circuit.builtBy = builderFor
  const forTask = (task) => {
    if (!scopes.has(task.taskId)) {
      const built = {}
      refresh(built, task)
      // A part the task withholds is no part on its boards: written in their text, it is refused like an unknown one.
      const withheld = new Set(course.withholds({ id: task.id, task: task.task }))
      const partOf = (type) => board.FIXED_PARTS[type] ?? (withheld.has(type) ? undefined : parts[type] ?? built[type])
      scopes.set(task.taskId, { task, view: { ...result, BUILT: built, partOf, builtBy: (type, params) => builderFor(type, params, task) } })
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
    // What a task's tray holds and shows: by its own parts and its own answer (../course.js usable, offer).
    offerIn: (task, flags) => offer(course, { id: task.id, task: task.task }, new Set(flags)),
    // Whether a task holds an item, of any grain (../course.js holds): has(part), has(part, key), has(part, key, value).
    holdsIn: (task, flags) => holding(course, { id: task.id, task: task.task }, new Set(flags)),
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
    workReferences(task, work) {
      if (!task || !work?.nodes) return []
      const here = forTask(task)
      return work.nodes.flatMap((node) => {
        const open = here.BUILT[node.type]?.opens?.(node.params)
        return open ? [{ key: open.level.taskId, task: open.level, work: open.circuit }] : []
      })
    },
    views: content.views ?? null,
    // The shell keeps boards by task (../shell/progress.js), including the task each form publishes.
    syncOwn: (built = {}) => {
      own.clear()
      for (const { task } of revisions) {
        const b = built[task.taskId]
        if (b?.nodes && board.fits(b, task, partOf)) own.set(task.id, b)
      }
      refresh(BUILT)
      for (const { task, view } of scopes.values()) refresh(view.BUILT, task)
    },
  }
  return result
}

/**
 * The course of a domain whose games define their own parts (content.partDefs: parts.json) over its engine resources,
 * its tests giving a value on every input and expecting one of every output.
 */
export function definedCourse(content, { board, ops, parts, read: readValue = (v) => v }) {
  const { PARTS, defs, defaultsOf } = defineParts(content.partDefs, ops, parts)
  const test = (t, task, say) => {
    for (const o of task.outputs) if (t.expect[o.name] === undefined) say(`a test expects nothing of the output ${o.name}`)
    for (const i of task.inputs) if (t.inputs[i.name] === undefined) say(`a test gives nothing on the input ${i.name}`)
    const values = (given) => Object.fromEntries(Object.entries(given).map(([name, v]) => [name, readValue(v, name, say)]))
    return { ...t, inputs: values(t.inputs), expect: values(t.expect) }
  }
  return { ...circuitCourse(content, { board, parts: PARTS, test }), defs, defaultsOf }
}
