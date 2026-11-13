// A piece's faces are independent. The persisted circuit definitions use the established inputs and views keys.
export const holesOf = (piece) => piece.inputs ?? []
export const outletsOf = (piece) => piece.outputs ?? []
export const settingsOf = (piece) => piece.settings ?? []
export const regionsOf = (piece) => piece.regions ?? []
export const insideOf = (piece) => piece.inside ?? null
export const facesOf = (piece) => piece.views ?? {}
export const keepsOf = (piece) => piece.keeps ?? []

/** Register named pieces from code and from a game's content. The content supplies the definition of a shared name. */
export function registerPieces(code, content) {
  return { ...code, ...content }
}

/** Works published by a piece, in the order they were built. A form selects its own sequence of references. */
export function pieceReferences(entries, { before, passed, useLatest = false, include = (work, task) => work.task <= task.task }) {
  const pieces = new Map()
  for (const entry of entries) {
    if (!pieces.has(entry.type)) pieces.set(entry.type, [])
    pieces.get(entry.type).push(entry)
  }

  const available = (type, at, strict = false) => (pieces.get(type) ?? []).filter(({ task }) => !at || (
    task.id === at.id ? !strict && include(task, at) : before(task.id, at.id)
  ))
  const forms = (type, at) => [...new Set(available(type, at).map((entry) => entry.form).filter(Boolean))]
  const resolve = (type, form, at, { strict = false, reference = false } = {}) => {
    const matches = (entries) => entries.filter((entry) => entry.form === form)
    const here = matches(available(type, at, strict))
    const all = matches(available(type))
    const candidates = here.length || strict ? here : useLatest ? all : all.slice(0, 1)
    return (reference ? null : candidates.findLast(({ task }) => passed(task))) ?? candidates.at(-1) ?? null
  }
  const problems = () => [...pieces.values()].flatMap((chain) => chain.slice(1).flatMap(({ type, task }, k) =>
    before(chain[k].task.id, task.id) ? [] : [`${task.id}: upgrades of ${type} must form a prerequisite chain`]))
  return { forms, resolve, problems }
}
