import { resolveSettings } from './parts/settings.js'
export { resolveSettings } from './parts/settings.js'

// A part's faces are independent: its own (name, desc, icon, family) and those of the editor it is made
// with (parts/schema.js EDITORS). The persisted circuit definitions use the established inputs and views keys.
/** The editor a part is made with: the one it names, the circuit's when it names none. */
export const editorOf = (part) => part.editor ?? 'circuit'
/** What a block on a strip marks: an item of the domain's `mark` kind. */
export const markOf = (part) => part.mark ?? null
export const holesOf = (part) => part.inputs ?? []
export const outletsOf = (part) => part.outputs ?? []
export const settingsOf = (part, operations) => Array.isArray(part.settings) ? part.settings : resolveSettings(part, operations)
export const regionsOf = (part) => part.regions ?? []
export const insideOf = (part) => part.inside ?? null
export const facesOf = (part) => part.views ?? {}
export const keepsOf = (part) => part.keeps ?? null
// A built part run by an engine resource instead of its inside (the artifact still records its interface).
export const cardOf = (part) => part.card ?? null

/** A parts/<name>.json's built parts (those with an inside), by type. */
export const builtParts = (file) => Object.fromEntries(Object.entries(file?.parts ?? {}).filter(([, part]) => insideOf(part))
  .map(([type, part]) => [type, { ...part, settings: resolveSettings(part) }]))

/** The task author chooses which part variant its passing work supplies. */
export function publications(levels, parts) {
  const publishers = new Map()
  for (const level of levels) for (const task of level.tasks ?? []) for (const { part, variant } of task.publishes ?? []) {
    const key = JSON.stringify([part, variant])
    if (publishers.has(key)) throw new Error(`part ${part} variant ${variant} is published more than once`)
    if (!parts[part]?.inside.some((entry) => entry.id === variant)) {
      throw new Error(`task ${task.id} publishes unknown part variant ${part}.${variant}`)
    }
    publishers.set(key, { task: task.id, level: level.id })
  }
  return Object.entries(parts).flatMap(([type, part]) => {
    const seen = new Set()
    return part.inside.map(({ id, form, ...rest }) => {
      if (seen.has(id)) throw new Error(`part ${type} defines variant ${id} more than once`)
      seen.add(id)
      return { type, variant: id, form: form ?? null, ...rest, ...(publishers.get(JSON.stringify([type, id])) ?? {}) }
    })
  })
}

/** Register named parts from code and from a game's content. The content supplies the definition of a shared name. */
export function registerParts(code, content) {
  return { ...code, ...content }
}

/** Works published by a part, in the order they were built. A form selects its own sequence of references. */
export function partReferences(entries, { before, passed, useLatest = false, include = (work, task) => work.task <= task.task }) {
  const allEntries = []
  const parts = new Map()
  const keyOf = (type, kind) => JSON.stringify([type, kind])
  const register = (additions) => {
    for (const entry of additions) {
      allEntries.push(entry)
      const key = keyOf(entry.type, entry.kind)
      if (!parts.has(key)) parts.set(key, [])
      parts.get(key).push(entry)
    }
  }
  register(entries)

  const available = (type, at, strict = false, kind) => (parts.get(keyOf(type, kind)) ?? []).filter(({ task }) => !at || task.id === null || (
    task.id === at.id ? !strict && include(task, at) : before(task.id, at.id)
  ))
  const forms = (type, at) => [...new Set(available(type, at).map((entry) => entry.form).filter(Boolean))]
  const resolve = (type, form, at, { strict = false, reference = false, kind } = {}) => {
    const matches = (entries) => entries.filter((entry) => entry.form === form)
    const here = matches(available(type, at, strict, kind))
    const all = matches(available(type, null, false, kind))
    const candidates = here.length || strict ? here : useLatest ? all : all.slice(0, 1)
    return (reference ? null : candidates.findLast(({ task }) => passed(task))) ?? candidates.at(-1) ?? null
  }
  const entriesOf = (kind) => allEntries.filter((entry) => entry.kind === kind)
  const prior = (kind, at) => entriesOf(kind).filter(({ task }) => task.id === at.id ? task.task < at.task : before(task.id, at.id))
  const problems = () => [...parts.values()].flatMap((chain) => chain.slice(1).flatMap(({ type, task }, k) =>
    chain[k].task.id === null || task.id === null || before(chain[k].task.id, task.id) ? [] : [`${task.id}: upgrades of ${type} must form a prerequisite chain`]))
  return { register, forms, resolve, entriesOf, prior, problems }
}

export const PART_REFERENCE_FIELDS = [
  'kind', 'mode', 'solution', 'target', 'world', 'robot', 'ports', 'facts', 'dirs', 'filter', 'remember', 'noArm',
  'want', 'in', 'out', 'axioms', 'rules', 'rule', 'goal', 'stated', 'defs', 'types', 'datatype', 'schema',
  'inputs', 'outputs', 'tests',
]

/** The portable data needed to run a reference work, excluding the task, progress, and presentation copy. */
export function partReference(task) {
  const reference = Object.fromEntries(PART_REFERENCE_FIELDS
    .filter((key) => !['tests', 'inputs', 'outputs'].includes(key) && task[key] !== undefined)
    .map((key) => [key, task[key]]))
  for (const key of ['inputs', 'outputs']) if (task[key]) reference[key] = task[key]
    .map((port) => typeof port === 'string' ? port : { ...port, label: port.name })
  if (task.ports) reference.ports = task.ports.map((port) => {
    if (!port.named) return port
    const { sensor } = port.named
    return { named: { ...port.named, label: sensor, short: sensor } }
  })
  if ((task.kind === 'proof' || task.kind === 'machine') && task.tests?.[0]?.goal) {
    const { goal, premises } = task.tests[0]
    reference.tests = [{ goal, ...(premises && { premises }) }]
  }
  return reference
}
