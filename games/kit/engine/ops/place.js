// A destination is before or after a level in its lane (on: 'path' targets the whole fork),
// or a position on a chapter's path. An explicit 'branch' destination creates a new side route.
const same = (a, b) => String(a) === String(b)

export function locate(eras, id) {
  for (const [era, value] of eras.entries()) {
    for (const [item, entry] of value.path.entries()) {
      if (entry === id) return { era, kind: 'path', item, path: ['path', item] }
      if (typeof entry === 'string') continue
      for (const [lane, levels] of entry.parallel.entries()) {
        const k = levels.indexOf(id)
        if (k >= 0) return { era, kind: 'parallel', item, lane, k, path: ['path', item, 'parallel', lane, k] }
      }
    }
    for (const [branch, route] of (value.branches ?? []).entries()) {
      const k = route.levels.indexOf(id)
      if (k >= 0) return { era, kind: 'branch', branch, k, path: ['branches', branch, 'levels', k] }
    }
  }
  return null
}

export function describe(eras, at) {
  if (!at) return 'nowhere'
  const era = eras[at.era]
  if (at.kind === 'path') return `era ${era.id}, path #${at.item + 1}`
  if (at.kind === 'parallel') return `era ${era.id}, fork #${at.item + 1}, lane ${at.lane + 1}, level ${at.k + 1}`
  return `era ${era.id}, side route ${at.branch + 1}, level ${at.k + 1}`
}

const without = (levels, id) => levels.filter((level) => level !== id)

/** Remove a placement and its chapter-local labels. Keep the labels for a move. */
export function takeOut(eras, id) {
  const was = locate(eras, id)
  if (!was) return { eras, was: null, pruned: [] }
  const out = structuredClone(eras)
  const era = out[was.era]
  const optional = era.optional?.includes(id) ?? false
  const group = era.groups?.findIndex(({ levels }) => levels.includes(id)) ?? -1
  if (optional) {
    era.optional = without(era.optional, id)
    if (!era.optional.length) delete era.optional
  }
  if (group >= 0) era.groups[group].levels = without(era.groups[group].levels, id)

  const pruned = []
  if (was.kind === 'path') era.path.splice(was.item, 1)
  else if (was.kind === 'parallel') {
    const lanes = era.path[was.item].parallel
    lanes[was.lane].splice(was.k, 1)
    if (!lanes[was.lane].length) {
      lanes.splice(was.lane, 1)
      pruned.push('parallel lane')
      if (lanes.length === 1) era.path.splice(was.item, 1, ...lanes[0])
    }
  } else {
    const route = era.branches[was.branch]
    route.levels.splice(was.k, 1)
    if (!route.levels.length) {
      era.branches.splice(was.branch, 1)
      pruned.push('side route')
      if (!era.branches.length) delete era.branches
    }
  }
  return { eras: out, was, pruned, optional, group }
}

const insert = (list, at, value) => {
  if (at !== undefined && (at < 0 || at > list.length)) throw new Error(`index ${at} is outside 0–${list.length}`)
  list.splice(at ?? list.length, 0, value)
}

export function putIn(eras, id, to) {
  if (locate(eras, id)) throw new Error(`${id} is placed already`)
  const out = structuredClone(eras)
  const next = to.before ?? to.after
  if (next !== undefined) {
    const at = locate(out, next)
    if (!at) throw new Error(`${next} is in no era`)
    const era = out[at.era]
    const shift = to.after !== undefined ? 1 : 0
    if (at.kind === 'branch') {
      if (to.on === 'path') throw new Error(`${next} is not on a main path`)
      era.branches[at.branch].levels.splice(at.k + shift, 0, id)
    } else if (at.kind === 'path' || to.on === 'path') era.path.splice(at.item + shift, 0, id)
    else era.path[at.item].parallel[at.lane].splice(at.k + shift, 0, id)
    return out
  }

  const era = out.find((chapter) => same(chapter.id, to.era))
  if (!era) throw new Error(`no era ${to.era}`)
  if (to.on === 'branch') {
    era.branches ??= []
    insert(era.branches, to.at, { levels: [id], ...(to.hang && { after: to.hang }) })
  } else insert(era.path, to.at, id)
  return out
}

export function moveLevel(eras, id, to) {
  const removed = takeOut(eras, id)
  if (!removed.was) throw new Error(`${id} is in no era`)
  const next = putIn(removed.eras, id, to)
  const destination = locate(next, id)
  const era = next[destination.era]
  if (removed.optional) (era.optional ??= []).push(id)
  if (removed.group >= 0 && destination.era === removed.was.era) {
    const original = eras[destination.era].groups[removed.group]
    era.groups[removed.group].levels = original.levels
  }
  return { ...removed, eras: next }
}
