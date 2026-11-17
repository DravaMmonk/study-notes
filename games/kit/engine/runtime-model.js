// Runtime selection follows declared task capabilities, never the package's historical domain field.
import { courseLayout } from './course-dependencies.js'
import { readWorkSet } from '../../../packages/circuit/core/index.js'

const namedOwner = (value) => {
  if (typeof value === 'string') return ownerOf(value)
  if (!value || typeof value !== 'object') return null
  return Object.entries(value).map(([key, value]) => ownerOf(key) ?? namedOwner(value)).find(Boolean) ?? null
}

const ownerOf = (name) => typeof name === 'string' && name.includes(':') ? name.split(':')[0] : null
export const taskModule = (task) => ownerOf(task.play) ?? ownerOf(task.kind) ?? ownerOf(task.mode)
  ?? namedOwner(task.want) ?? 'circuit'

/** Empty libraries select a work reader from their interfaces; no course requires a domain declaration. */
export function runtimeIds(content) {
  const tasks = (content.levels ?? []).flatMap((level) => (level.tasks ?? []).map((task) => ({ ...level, ...task })))
  if (tasks.length) return [...new Set(tasks.map(taskModule))]
  const parts = [...Object.values(content.partDefs?.parts ?? {}), ...Object.values(content.registries?.symbol ?? {})]
  const references = parts.flatMap((part) => part.inside?.map((entry) => entry.reference) ?? [])
  if (references.length) return [...new Set(references.map(taskModule))]
  const types = parts.flatMap((part) => [part.outputType, ...(part.inputs ?? []).map((port) => port.type)])
  return [[...types.map(ownerOf), ...parts.map((part) => ownerOf(part.family) ?? ownerOf(part.mark))].find((id) => id && id !== 'circuit') ?? 'circuit']
}

/** Prepare module projections against one shared course and preserve original task positions. */
export function runtimeWorks(content, runtimes) {
  const plan = courseLayout(content)
  const scopes = runtimes.map(({ id, runtime }) => {
    const levels = content.levels.map(level => ({ ...level, tasks: level.tasks.filter(task => taskModule({ ...level, ...task }) === id) })).filter(level => level.tasks.length)
    const ids = new Set(levels.map((level) => level.id))
    const parts = Object.fromEntries(Object.entries(content.partDefs?.parts ?? {}).filter(([, part]) =>
      !part.inside || part.inside.some((entry) => taskModule(entry.reference) === id)))
    const scope = { ...content, levels, partDefs: { ...content.partDefs, parts } }
    Object.defineProperty(scope, 'taskPositions', { value: new Map(content.levels.flatMap(level => level.tasks.map((task, index) => [task.id, index]))) })
    Object.defineProperty(scope, 'coursePlan', { value: { ...plan, order: plan.order.filter((id) => ids.has(id)) } })
    return { id, runtime, content: scope, prepare: runtime.prepare }
  })
  const shared = { ...content }
  Object.defineProperty(shared, 'coursePlan', { value: plan })
  const works = readWorkSet(shared, scopes)
  return { plan, scopes, works }
}

/** Build specs over one shared model, including a course that uses several task mechanisms. */
export function runtimeSpec(content, runtimes) {
  if (runtimes.length === 1) return runtimes[0].runtime.spec(content)
  const { plan, scopes, works } = runtimeWorks(content, runtimes)
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
    texts: {
      ...Object.fromEntries(specs.map((spec, index) => {
        const { glossary: _glossary, ...texts } = spec.texts ?? {}
        return [scopes[index].id, texts]
      })),
      glossary: content.glossary.entries,
    },
    quotes: Object.values(content.registries?.quote ?? {}).map(quote => quote.text),
  }
}

