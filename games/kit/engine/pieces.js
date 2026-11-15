// A piece's faces are independent: its own (name, desc, icon, family) and those of the editor it is made
// with (parts/schema.js EDITORS). The persisted circuit definitions use the established inputs and views keys.
/** The editor a piece is made with: the one it names, the circuit's when it names none. */
export const editorOf = (piece) => piece.editor ?? 'circuit'
/** What a block on a strip marks: an item of the domain's `mark` kind. */
export const markOf = (piece) => piece.mark ?? null
export const holesOf = (piece) => piece.inputs ?? []
export const outletsOf = (piece) => piece.outputs ?? []
export const settingsOf = (piece) => piece.settings ?? []
export const regionsOf = (piece) => piece.regions ?? []
export const insideOf = (piece) => piece.inside ?? null
export const facesOf = (piece) => piece.views ?? {}
export const keepsOf = (piece) => piece.keeps ?? null
// A built piece run by an engine resource instead of its inside (the artifact still records its interface).
export const cardOf = (piece) => piece.card ?? null

/** Resolve a content piece's bindings to the setting face the circuit reads. */
export function resolveSettings(file, piece) {
  return settingsOf(piece).flatMap(({ key, setting }) => Object.hasOwn(file?.settings ?? {}, setting)
    ? [{ ...file.settings[setting], key }]
    : [])
}

/** Pieces and local keys referring to a setting definition. */
export function settingReferences(file, id) {
  return Object.entries(file?.parts ?? {}).flatMap(([piece, def]) => settingsOf(def)
    .filter(({ setting }) => setting === id).map(({ key }) => ({ piece, key })))
}

/** A pieces.json's built pieces (those with an inside), by type. */
export const builtPieces = (file) => Object.fromEntries(Object.entries(file?.parts ?? {}).filter(([, piece]) => insideOf(piece))
  .map(([type, piece]) => [type, { ...piece, settings: resolveSettings(file, piece) }]))

/** The task author chooses which piece variant its passing work supplies. */
export function publications(levels, pieces) {
  const publishers = new Map()
  for (const level of levels) for (const task of level.tasks ?? []) for (const { piece, variant } of task.publishes ?? []) {
    const key = JSON.stringify([piece, variant])
    if (publishers.has(key)) throw new Error(`piece ${piece} variant ${variant} is published more than once`)
    if (!pieces[piece]?.inside.some((entry) => entry.id === variant)) {
      throw new Error(`task ${task.id} publishes unknown piece variant ${piece}.${variant}`)
    }
    publishers.set(key, { task: task.id, level: level.id })
  }
  return Object.entries(pieces).flatMap(([type, piece]) => {
    const seen = new Set()
    return piece.inside.map(({ id, form, ...rest }) => {
      if (seen.has(id)) throw new Error(`piece ${type} defines variant ${id} more than once`)
      seen.add(id)
      return { type, variant: id, form: form ?? null, ...rest, ...(publishers.get(JSON.stringify([type, id])) ?? {}) }
    })
  })
}

/** Description revisions follow course progress, rather than depending on levels from a piece definition. */
export function pieceRevisions(levels) {
  const found = new Map()
  for (const level of levels) for (const { piece, at, desc } of level.pieceRevisions ?? []) {
    found.set(piece, [...(found.get(piece) ?? []), { [at ? 'at' : 'by']: level.id, desc }])
  }
  return Object.fromEntries(found)
}

/** Register named pieces from code and from a game's content. The content supplies the definition of a shared name. */
export function registerPieces(code, content) {
  return { ...code, ...content }
}

/** Works published by a piece, in the order they were built. A form selects its own sequence of references. */
export function pieceReferences(entries, { before, passed, useLatest = false, include = (work, task) => work.task <= task.task }) {
  const allEntries = []
  const pieces = new Map()
  const keyOf = (type, kind) => JSON.stringify([type, kind])
  const register = (additions) => {
    for (const entry of additions) {
      allEntries.push(entry)
      const key = keyOf(entry.type, entry.kind)
      if (!pieces.has(key)) pieces.set(key, [])
      pieces.get(key).push(entry)
    }
  }
  register(entries)

  const available = (type, at, strict = false, kind) => (pieces.get(keyOf(type, kind)) ?? []).filter(({ task }) => !at || task.id === null || (
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
  const problems = () => [...pieces.values()].flatMap((chain) => chain.slice(1).flatMap(({ type, task }, k) =>
    chain[k].task.id === null || task.id === null || before(chain[k].task.id, task.id) ? [] : [`${task.id}: upgrades of ${type} must form a prerequisite chain`]))
  return { register, forms, resolve, entriesOf, prior, problems }
}

export const PIECE_REFERENCE_FIELDS = [
  'kind', 'mode', 'solution', 'target', 'world', 'robot', 'ports', 'facts', 'dirs', 'filter', 'remember', 'noArm',
  'want', 'in', 'out', 'axioms', 'rules', 'rule', 'goal', 'stated', 'defs', 'types', 'datatype', 'schema',
  'inputs', 'outputs', 'tests',
]

/** The portable data needed to run a reference work, excluding the task, progress, and presentation copy. */
export function pieceReference(task) {
  const reference = Object.fromEntries(PIECE_REFERENCE_FIELDS
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
