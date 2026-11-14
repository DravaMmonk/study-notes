// A piece's faces are independent. The persisted circuit definitions use the established inputs and views keys.
export const holesOf = (piece) => piece.inputs ?? []
export const outletsOf = (piece) => piece.outputs ?? []
export const settingsOf = (piece) => piece.settings ?? []
export const regionsOf = (piece) => piece.regions ?? []
export const insideOf = (piece) => piece.inside ?? null
export const facesOf = (piece) => piece.views ?? {}
export const keepsOf = (piece) => piece.keeps ?? []

/** A parts.json's built pieces (those with an inside), by type. */
export const builtPieces = (file) => Object.fromEntries(Object.entries(file?.parts ?? {}).filter(([, piece]) => insideOf(piece)))

/** What built pieces publish: one entry a reference, { type, form (null when none), task (its id) }, in the order written. */
export const publications = (pieces) => Object.entries(pieces).flatMap(([type, piece]) => insideOf(piece).map(({ task, form }) => ({ type, form: form ?? null, task })))

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

  const available = (type, at, strict = false, kind) => (pieces.get(keyOf(type, kind)) ?? []).filter(({ task }) => !at || (
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
    before(chain[k].task.id, task.id) ? [] : [`${task.id}: upgrades of ${type} must form a prerequisite chain`]))
  return { register, forms, resolve, entriesOf, prior, problems }
}
