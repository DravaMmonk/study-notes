// One curriculum model for all task and board mechanisms. Runtime readers supply observations about works;
// progression, item granularity, trays, local parts and replacements are interpreted here.
import { extendGrantIndex, grantIndex, grantObjects, grantState } from './grants.js'
import { defineCourse } from '../course.js'
import { courseLayout } from './course-dependencies.js'
import { standaloneItems, standaloneParts } from './package-play.js'
import { trayIn } from './trays.js'

const unique = (items) => [...new Set(items)]

/** Build a curriculum from content plus facts obtained while reading its works. No domain selects these rules. */
export function contentCourse(content, {
  levels = content.levels, plan = courseLayout(content), parts = {}, publications = [],
  intrinsic = [], local = [], additions = null, builds = null,
  grants = () => [], withheld = () => [], opened = () => [],
  boards = () => [], needed = null, machine = () => null, uses = () => [], can = () => null,
  carries = null, references = null,
} = {}) {
  const source = new Map(content.levels.map((level) => [level.id, level]))
  const played = new Map(levels.map((level) => [level.id, level]))
  const tasks = (at) => source.get(at.id)?.tasks ?? []
  const task = (at) => tasks(at)[at.task]
  const level = (at) => source.get(at.id) ?? {}
  const awards = (at) => publications.filter((entry) => entry.level === at.id
    && (at.task === undefined || entry.taskIndex <= at.task)).map((entry) => entry.type)
  const flagOf = (part) => parts[part]?.unlock ?? (publications.some(entry => entry.type === part) ? part : null)
  const defaultAdds = (at) => unique([...(level(at).adds ?? []), ...tasks(at)
    .slice(0, at.task === undefined ? undefined : at.task + 1).flatMap((task) => task.adds ?? [])])
  const adds = (at) => additions?.(at) ?? defaultAdds(at)
  const unlocked = (at) => [
    ...(at.task === undefined || at.task === tasks(at).length - 1 ? level(at).unlocks ?? [] : []),
    ...tasks(at).slice(0, at.task === undefined ? undefined : at.task + 1).flatMap((task) => task.unlocks ?? []),
    ...awards(at),
  ]
  const build = (at) => unique([...(builds?.(at) ?? []), ...awards(at), ...Object.keys(parts).filter((part) => parts[part].unlock && unlocked(at).includes(parts[part].unlock))])
  const localAt = (part, at) => local.includes(part) || (level(at).local ?? []).includes(part)
    || tasks(at).some((task, index) => (at.task === undefined || index === at.task) && (task.local ?? []).includes(part))
  const isLocal = (part, at) => at ? localAt(part, at) : local.includes(part)
    || content.levels.some((level) => localAt(part, level))
      && !content.levels.some((level) => defaultAdds(level).includes(part) && !localAt(part, level))

  const course = defineCourse({
    parts: grantObjects(content),
    awards: (at) => [...(at.task === undefined || at.task >= tasks(at).length ? level(at).awards ?? [] : []), ...tasks(at).flatMap((task, index) => at.task === undefined || index < at.task ? task.awards ?? [] : [])],
    available: content.standalone ? (at) => standaloneParts(content, at) : null,
    availableItems: content.standalone ? (at) => standaloneItems(content, at) : null,
    complete: content.levels.every((level) => plan.place.has(level.id)),
    levels: levels.map((level) => ({ id: level.id, unlocks: unique([...(level.unlocks ?? []), ...unlocked(level)]) })),
    eras: content.eras, plan, trays: content.trays ?? {},
    tray: (at) => trayIn(content.trays ?? {}, task(at)?.tray ?? played.get(at.id)?.tray ?? level(at).tray),
    primitives: unique([...(content.primitives ?? []), ...intrinsic]),
    adds, needs: flagOf, builds: build,
    local: isLocal,
    replaces: (part) => content.replaces?.[part] ?? [],
    gives: (at) => unique([...(level(at).gives ?? []), ...(task(at)?.gives ?? []), ...grants(at)]),
    withholds: (at) => unique([...(task(at)?.withholds ?? level(at).withholds ?? []), ...(task(at)?.without ?? level(at).without ?? []), ...withheld(at)]),
    opens: (at) => unique([...(level(at).opens ?? []), ...tasks(at)
      .flatMap((task, index) => at.task === undefined || index <= at.task ? task.opens ?? [] : []), ...opened(at)]),
    featured: (at) => [...(level(at).featuredParts ?? []), ...(task(at)?.featuredParts ?? [])],
    boards, needed: (at) => { const observed = needed?.(at); if (observed !== undefined) return observed; const works = boards(at); return works.length ? works.flatMap((work) => work.nodes.map((node) => node.type)) : null },
    machine, uses, can,
    carries: (at) => carries?.(at) ?? (level(at).carry ? [level(at).carry] : []),
    references, notes: content.mode === 'notes',
  })
  course.grantIndex = grantIndex({ ...content.registries, part: content.partDefs?.parts ?? content.registries?.part })
  course.registerObjects = (type, objects) => extendGrantIndex(course.grantIndex, type, objects)
  course.state = (at, flags, types) => grantState(course, at, flags, types)
  return course
}

/** Translate published variants into progress events, independently of the board that produced the work. */
export function publicationEvents(levels, implementations, positions = null) {
  const tasks = new Map(levels.flatMap((level) => (level.tasks ?? []).map((task, taskIndex) => [task.id, { level: level.id, taskIndex: positions?.get(task.id) ?? taskIndex }])))
  return implementations.flatMap((entry) => tasks.has(entry.task) ? [{ ...entry, ...tasks.get(entry.task) }] : [])
}

/** Work readers pause after collecting facts, so every reader receives the very same completed curriculum. */
export function readWorks(content, prepare) {
  return readWorkSet(content, [{ content, prepare }])[0]
}

/** Read heterogeneous works in two phases; no reader builds or owns a separate curriculum. */
export function readWorkSet(content, readers) {
  const pending = readers.map(({ content: scope, prepare }) => {
    const iterator = prepare(scope)
    const first = iterator.next()
    if (first.done) throw new Error('a work reader must supply its course facts before completing')
    return { iterator, facts: first.value, scope }
  })
  const all = pending.map(({ facts }) => facts)
  const source = new Map(content.levels.map(level => [level.id, level]))
  const plan = content.coursePlan ?? all[0]?.plan ?? courseLayout(content)
  const call = (key, fallback) => (at) => {
    const id = source.get(at.id)?.tasks[at.task]?.id
    const values = pending.filter(({ scope, facts }) => facts.levels.some(level => level.id === at.id) && scope.levels.some(level => level.id === at.id
      && (at.task === undefined || level.tasks.some(task => task.id === id))))
      .map(({ facts, scope }) => {
        if (key !== 'additions' || facts.additions) return facts[key]?.(at)
        const level = scope.levels.find(level => level.id === at.id)
        return unique([...(level.adds ?? []), ...level.tasks.flatMap((task, index) =>
          at.task === undefined || (scope.taskPositions?.get(task.id) ?? index) <= at.task ? task.adds ?? [] : [])])
      }).filter(value => value !== undefined)
    if (!values.length) return fallback
    if (values.some(Array.isArray)) return values.flatMap(value => value ?? [])
    return values.find(value => value !== null) ?? null
  }
  const references = all.map((facts) => facts.references).filter(Boolean)
  const combinedReferences = references.length === 1 ? references[0] : references.length ? {
    forms: (...args) => unique(references.flatMap((book) => book.forms(...args))),
    resolve: (...args) => references.map((book) => book.resolve(...args)).find(Boolean) ?? null,
    entriesOf: (...args) => references.flatMap((book) => book.entriesOf(...args)),
    prior: (...args) => references.flatMap((book) => book.prior(...args)),
    problems: () => references.flatMap((book) => book.problems()),
  } : null
  const byId = new Map()
  for (const facts of all) for (const level of facts.levels) {
    const earlier = byId.get(level.id)
    byId.set(level.id, { ...level, unlocks: unique([...(earlier?.unlocks ?? []), ...(level.unlocks ?? [])]) })
  }
  const course = contentCourse(content, {
    plan, levels: plan.order.map((id) => byId.get(id)).filter(Boolean),
    parts: Object.assign({}, ...all.map((facts) => facts.parts)),
    publications: all.flatMap((facts) => facts.publications ?? []),
    intrinsic: all.flatMap((facts) => facts.intrinsic ?? []),
    local: all.flatMap((facts) => facts.local ?? []),
    additions: call('additions', undefined), builds: call('builds', undefined),
    grants: call('grants', []), withheld: call('withheld', []), opened: call('opened', []),
    boards: call('boards', []), needed: call('needed', undefined),
    machine: call('machine', null), uses: call('uses', []), can: (machine) => all.map((facts) => facts.can?.(machine)).find(Boolean) ?? null,
    carries: call('carries', undefined),
    references: combinedReferences,
  })
  return pending.map(({ iterator }) => {
    const last = iterator.next(course)
    if (!last.done) throw new Error('a work reader must complete after receiving its course')
    return last.value
  })
}
