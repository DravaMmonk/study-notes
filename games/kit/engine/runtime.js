// Runtime selection follows declared task capabilities, never the package's historical domain field.
import { vocabularyFor } from './kernel.js'
import { courseLayout } from './course-dependencies.js'
import { readWorkSet } from './course-model.js'

const namedOwner = (value) => {
  if (typeof value === 'string') return ownerOf(value)
  if (!value || typeof value !== 'object') return null
  return Object.entries(value).map(([key, value]) => ownerOf(key) ?? namedOwner(value)).find(Boolean) ?? null
}

const ownerOf = (name) => typeof name === 'string' && name.includes(':') ? name.split(':')[0] : null
export const taskModule = (task) => ownerOf(task.kind) ?? ownerOf(task.mode)
  ?? namedOwner(task.want) ?? 'circuit'

/** Empty libraries select a work reader from their interfaces; no course requires a domain declaration. */
export function runtimeIds(content) {
  const tasks = (content.levels ?? []).flatMap((level) => (level.tasks ?? []).map((task) => ({ ...level, ...task })))
  if (tasks.length) return [...new Set(tasks.map(taskModule))]
  const pieces = Object.values(content.partDefs?.parts ?? {})
  const references = pieces.flatMap((piece) => piece.inside?.map((entry) => entry.reference) ?? [])
  if (references.length) return [...new Set(references.map(taskModule))]
  const types = pieces.flatMap((piece) => [piece.outputType, ...(piece.inputs ?? []).map((port) => port.type)])
  return [[...types.map(ownerOf), ...pieces.map((piece) => ownerOf(piece.family) ?? ownerOf(piece.mark))].find((id) => id && id !== 'circuit') ?? 'circuit']
}

/** Build specs over one shared model, including a course that uses several task mechanisms. */
export function runtimeSpec(content, runtimes) {
  if (runtimes.length === 1) return runtimes[0].runtime.spec(content)
  const plan = courseLayout(content)
  const scopes = runtimes.map(({ id, runtime }) => {
    const levels = content.levels.map(level => ({ ...level, tasks: level.tasks.filter(task => taskModule({ ...level, ...task }) === id) })).filter(level => level.tasks.length)
    const ids = new Set(levels.map((level) => level.id))
    const parts = Object.fromEntries(Object.entries(content.partDefs?.parts ?? {}).filter(([, piece]) =>
      !piece.inside || piece.inside.some((entry) => taskModule(entry.reference) === id)))
    const scope = { ...content, levels, partDefs: { ...content.partDefs, parts } }
    Object.defineProperty(scope, 'taskPositions', { value: new Map(content.levels.flatMap(level => level.tasks.map((task, index) => [task.id, index]))) })
    Object.defineProperty(scope, 'coursePlan', { value: { ...plan, order: plan.order.filter((id) => ids.has(id)) } })
    return { id, runtime, content: scope, prepare: runtime.prepare }
  })
  const shared = { ...content }
  Object.defineProperty(shared, 'coursePlan', { value: plan })
  const works = readWorkSet(shared, scopes)
  const specs = scopes.map(({ runtime, content }, index) => runtime.spec(content, works[index]))
  const levels = new Map()
  for (const source of content.levels) {
    const fragments = specs.flatMap(spec => spec.levels.filter(level => level.id === source.id))
    if (!fragments.length) continue
    const tasks = new Map(fragments.flatMap(level => level.tasks.map(task => [task.taskId ?? task.key ?? task.id, task])))
    const ordered = source.tasks.map(task => tasks.get(task.id))
    levels.set(source.id, { ...source, ...fragments.at(-1), kind: ordered.at(-1).kind, tasks: ordered,
      unlocks: [...new Set(fragments.flatMap(level => level.unlocks ?? []))] })
  }
  return {
    id: content.id, title: content.title, course: works[0].course,
    levels: plan.order.map((id) => levels.get(id)), specs,
    blueprints: specs.flatMap((spec) => spec.blueprints ?? []),
    syncOwn: (built) => specs.forEach((spec) => spec.syncOwn?.(built)),
    builtIn: specs.flatMap((spec) => spec.builtIn ?? []),
    texts: Object.fromEntries(specs.map((spec, index) => [scopes[index].id, spec.texts ?? {}])),
    quotes: Object.values(content.registries?.quote ?? {}).map(quote => quote.text),
  }
}

/** Resolve module runtimes using capability ownership. The vocabulary tables remain shared. */
export async function runtimeOf(content) {
  const runtimes = await Promise.all(runtimeIds(content).map(async (id) => ({ id, runtime: (await import(`../modules/${id}/runtime.js`)).default })))
  if (runtimes.length === 1) return { ...runtimes[0].runtime, vocabulary: vocabularyFor(runtimes[0].id) }
  const byId = new Map(runtimes.map(({ id, runtime }) => [id, runtime]))
  const choose = (ctx) => byId.get(taskModule(ctx.level.source ?? ctx.level))
  return {
    vocabulary: vocabularyFor(runtimes.map(({ id }) => id)),
    names: (source) => {
      const names = {}
      for (const { runtime } of runtimes) for (const [kind, values] of Object.entries(runtime.names?.(source) ?? {})) {
        names[kind] = new Set([...(names[kind] ?? []), ...values])
      }
      return names
    },
    languages: Object.assign({}, ...runtimes.map(({ runtime }) => runtime.languages)),
    spec: (source) => runtimeSpec(source, runtimes),
    validate: async (spec) => (await Promise.all(runtimes.map(({ runtime }, index) => runtime.validate({ ...spec.specs[index], memo: spec.memo })))).flat(),
    play: {
      open: (ctx) => choose(ctx).play.open(ctx),
      attempt: (ctx, text) => choose(ctx).play.attempt(ctx, text),
    },
  }
}
