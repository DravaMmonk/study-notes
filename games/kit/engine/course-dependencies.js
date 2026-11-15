// The authored, knowledge and reference edges used to open a course. Only authored links live in the course file.
import { dependencyCycle, eraLevels, itemOf, layout } from '../course.js'
import { parse } from '../circuit/text.js'

const idOf = (game, level) => `${game}:${level}`
const refOf = (level) => `levels/${level}.json`
const reason = (source, detail) => `${source} (${detail})`
const list = (items) => Array.isArray(items) ? items : []

function ancestors(id, edges) {
  const seen = new Set()
  const visit = (node) => {
    for (const from of edges.get(node) ?? []) if (!seen.has(from)) {
      seen.add(from)
      visit(from)
    }
  }
  visit(id)
  return seen
}

function referenceItems(task) {
  if (!Array.isArray(task?.solution) || !task.solution.every((line) => typeof line === 'string')) return []
  try {
    return parse(task.solution.join('\n')).statements.flatMap(({ id, type, settings }) => type && !list(task.preset).includes(id) ? [
      type,
      ...Object.entries(settings).flatMap(([key, value]) => [itemOf(type, key), itemOf(type, key, String(value))]),
    ] : [])
  } catch (error) {
    // The domain's blueprint check reports a syntax error with a line number.
    if (error?.zh) return []
    throw error
  }
}

function providersOf(content) {
  const providers = new Map()
  const offer = (item, level, task, optional) => {
    if (!providers.has(item)) providers.set(item, [])
    providers.get(item).push({ level, task, optional })
  }
  const variants = content.partDefs?.parts ?? {}
  for (const level of content.levels ?? []) {
    for (const item of list(level.opens)) offer(item, level.id, -1, false)
    for (const [index, task] of list(level.tasks).entries()) {
      if (!task) continue
      // A task starts with its own options, and publishes the piece after it passes.
      for (const item of list(task.opens)) offer(item, level.id, index - 1, Boolean(task.optional))
      for (const { piece, variant } of list(task.publishes).filter((entry) => entry?.piece)) {
        offer(piece, level.id, index, Boolean(task.optional))
        const form = variants[piece]?.inside?.find(({ id }) => id === variant)?.form
        if (form) offer(itemOf(piece, 'form', form), level.id, index, Boolean(task.optional))
      }
    }
  }
  return providers
}

/** Resolve this course's links without mutating its file-backed content. */
export function courseDependencies(content) {
  const { eras = [], levels = [] } = content
  const links = eras.flatMap((era) => (era.links ?? []).map((link) => ({ ...link, source: 'course', detail: String(era.id) })))
  if (content.mode === 'notes') return { links, problems: [] }
  const placed = new Set(eras.flatMap(eraLevels))
  const problems = []
  const bindings = new Map()
  for (const { fromGame, from, to } of links) if (fromGame) {
    if (!bindings.has(to)) bindings.set(to, new Map())
    bindings.get(to).set(from, fromGame)
  }
  for (const { id, requires } of levels) if (placed.has(id)) for (const from of list(requires)) {
    const fromGame = bindings.get(id)?.get(from)
    if (fromGame || placed.has(from)) links.push({ from, to: id, ...(fromGame && { fromGame }), required: true, source: 'knowledge', detail: refOf(id) })
    else problems.push({ at: `${refOf(id)}.requires`, says: `place the prerequisite ${from} or bind it to the game that teaches it` })
  }
  const assumed = layout(eras, { links })
  const providers = providersOf(content)
  for (const level of levels) {
    if (!placed.has(level.id)) continue
    const required = ancestors(level.id, assumed.required)
    const tasks = Array.isArray(level.tasks) ? level.tasks : [level]
    for (const [index, task] of tasks.entries()) {
      const items = new Set(referenceItems(task))
      const grants = new Set([...list(task?.grants ?? level.grants), ...list(task?.opens)])
      for (const item of items) {
        if (grants.has(item)) continue
        const all = providers.get(item)
        if (!all?.length) continue
        const earlier = all.filter((provider) => provider.level !== level.id || provider.task < index)
        if (!earlier.length) {
          problems.push({ at: refOf(level.id), says: `the reference uses ${item} before any task in this level awards it` })
          continue
        }
        const choices = earlier.filter((provider) => !provider.optional)
        if (!choices.length) {
          problems.push({ at: refOf(level.id), says: `the reference uses ${item}, whose provider can be skipped` })
          continue
        }
        if (choices.some((provider) => provider.level === level.id || required.has(provider.level))) continue
        const by = [...new Set(choices.map(({ level }) => level))]
        const bound = by.filter((id) => bindings.get(level.id)?.has(id))
        if (bound.length === 1) continue
        const detail = `${task.id ?? level.id}: ${item}`
        if (by.length > 1) {
          problems.push({ at: refOf(level.id), says: `the reference uses ${item}; choose a prerequisite that supplies it (${by.join(', ')})` })
          continue
        }
        const [from] = by
        if (!placed.has(from)) {
          problems.push({ at: refOf(level.id), says: `the reference uses ${item}; place its provider ${from} or bind it to the game that supplies it` })
          continue
        }
        links.push({ from, to: level.id, required: true, source: 'reference', detail })
        required.add(from)
        for (const id of ancestors(from, assumed.required)) required.add(id)
      }
    }
  }
  return { links, problems }
}

/** Build the same local plan the domains use, with cross-game gates kept outside the local course topology. */
export function courseLayout(content) {
  const { links, problems } = courseDependencies(content)
  const notes = content.mode === 'notes'
  const plan = layout(content.eras ?? [], { notes, links })
  const external = new Map()
  const bind = (to, game, level) => {
    const gates = external.get(to) ?? []
    if (!gates.some((gate) => gate.game === game && gate.level === level)) external.set(to, [...gates, { game, level }])
  }
  if (!notes) {
    const bypass = new Map()
    for (const { fromGame, from, to, required } of links) {
      if (fromGame) bind(to, fromGame, from)
      else if (!required && plan.place.get(from)?.optional && !plan.required.get(to)?.includes(from)) {
        if (!bypass.has(to)) bypass.set(to, new Set())
        bypass.get(to).add(from)
      }
    }
    for (const id of plan.order) for (const skipped of bypass.get(id) ?? []) {
      for (const { game, level } of external.get(skipped) ?? []) bind(id, game, level)
    }
  }
  // A declared cross-game pass can supply the fixed implementation of awards from a shared package.
  const issued = new Map()
  const after = (level, item) => {
    const awards = issued.get(level) ?? new Set()
    awards.add(item)
    issued.set(level, awards)
  }
  if (external.size) {
    for (const [item, providers] of providersOf(content)) for (const { level, optional } of providers) if (!optional) after(level, item)
    for (const level of content.levels ?? []) for (const item of list(level.adds)) after(level.id, item)
  }
  const externalItems = new Map([...plan.place.keys()].map((level) => [level, new Set(
    external.size ? [level, ...ancestors(level, plan.required)].flatMap((id) => (external.get(id) ?? [])
      .flatMap(({ level: source }) => [...(issued.get(source) ?? [])])) : []
  )]))
  return { ...plan, dependencyLinks: links, problems, external, externalItems, externalAwardSources: issued }
}

/** Validate a resolved collection containing the pending course in place of its saved version. */
export function projectDependencyProblems(contents, packages = new Map()) {
  const plans = new Map(contents.map((content) => [content.id, courseLayout(content)]))
  const graph = new Map()
  const provenance = new Map()
  const problems = []
  for (const [game, plan] of plans) {
    for (const id of plan.place.keys()) graph.set(idOf(game, id), [])
  }
  for (const [game, plan] of plans) {
    for (const [to, fromIds] of plan.required) graph.get(idOf(game, to)).push(...fromIds.map((from) => idOf(game, from)))
    for (const [to, gates] of plan.external) for (const gate of gates) {
      const from = idOf(gate.game, gate.level)
      const into = idOf(game, to)
      if (gate.game === game) problems.push({ at: into, says: 'a cross-game link must use a different game; use a local link here' })
      else if (!graph.has(from)) problems.push({ at: into, says: `the cross-game prerequisite ${from} is not on its game's course` })
      else if (packages.has(game) && packages.has(gate.game) && packages.get(game) !== packages.get(gate.game)
        && (plan.dependencyLinks.some(({ source, fromGame, from, to: target }) => source === 'knowledge' && target === to && fromGame === gate.game && from === gate.level)
          || plan.externalAwardSources.has(gate.level))) problems.push({
        at: into,
        says: `${from} is in another content package and cannot supply this level's package prerequisites or awards`,
      })
      else if (graph.has(into)) graph.get(into).push(from)
    }
    for (const { fromGame, from, to, source, detail } of plan.dependencyLinks) {
      provenance.set(`${idOf(game, to)}>${idOf(fromGame ?? game, from)}`, reason(source, detail))
    }
  }
  const cycle = dependencyCycle(graph)
  if (cycle) problems.push({
    at: 'courses',
    says: `circular prerequisites: ${cycle.map((at, i) => i + 1 < cycle.length
      ? `${at} [${provenance.get(`${at}>${cycle[i + 1]}`) ?? 'required prerequisite'}]` : at).join(' → ')}`,
  })
  return problems
}
