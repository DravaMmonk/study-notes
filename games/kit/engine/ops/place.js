// Where a level sits in a course's eras (../../course.js: a main path of levels and parallel sets, topics, challenges),
// and taking a level out or putting it in. Every edit returns new eras.
//
// A place to put a level (`to`), one of:
//   { before: id } | { after: id }          next to that level, in the list that holds it: the main path, a branch,
//                                           a topic, or the challenges (a challenge put there hangs where `hang` says)
//   { before: id, on: 'path' } | { after: id, on: 'path' }
//                                           on the main path next to the item holding that level (its parallel set)
//   { era, path: 'foundation' | 'practice', at? }    on that era's main path, at index `at` (the end by default)
//   { branch, era?, at? } | { topic, era?, at? }     in that branch or topic (named by its id), at `at` or the end
//   { era, challenge: true, hang?, at? }             a challenge of that era, hanging after `hang` (a level or several)

export const PATHS = ['foundation', 'practice']
const same = (a, b) => String(a) === String(b)

/** Where level `id` is: { era (index), kind: 'path' | 'branch' | 'topic' | 'challenge', … } or null. */
export function locate(eras, id) {
  for (const [e, era] of eras.entries()) {
    for (const path of PATHS) for (const [i, item] of (era[path] ?? []).entries()) {
      if (item === id) return { era: e, kind: 'path', path, item: i }
      if (typeof item === 'string') continue
      for (const [b, branch] of item.parallel.entries()) {
        const k = branch.levels.indexOf(id)
        if (k >= 0) return { era: e, kind: 'branch', path, item: i, branch: b, k }
      }
    }
    for (const [t, topic] of (era.topics ?? []).entries()) {
      const k = topic.levels.indexOf(id)
      if (k >= 0) return { era: e, kind: 'topic', topic: t, k }
    }
    const c = (era.challenges ?? []).findIndex((x) => x.level === id)
    if (c >= 0) return { era: e, kind: 'challenge', k: c }
  }
  return null
}

/** Where a level is, in words: 'era tactics, branch combine #5'. */
export function describe(eras, at) {
  if (!at) return 'nowhere'
  const era = eras[at.era]
  if (at.kind === 'path') return `era ${era.id}, ${at.path} path #${at.item + 1}`
  if (at.kind === 'branch') return `era ${era.id}, branch ${era[at.path][at.item].parallel[at.branch].id} #${at.k + 1}`
  if (at.kind === 'topic') return `era ${era.id}, topic ${era.topics[at.topic].id} #${at.k + 1}`
  return `era ${era.id}, challenges`
}

/** `eras` without level `id`: { eras, was (its place before), pruned: [what emptied and went with it] }. */
export function takeOut(eras, id) {
  const at = locate(eras, id)
  if (!at) return { eras, was: null, pruned: [] }
  const out = structuredClone(eras)
  const era = out[at.era]
  const pruned = []
  if (at.kind === 'path') era[at.path].splice(at.item, 1)
  else if (at.kind === 'branch') {
    const item = era[at.path][at.item]
    const branch = item.parallel[at.branch]
    branch.levels.splice(at.k, 1)
    if (!branch.levels.length) {
      item.parallel.splice(at.branch, 1)
      pruned.push(`branch ${branch.id}`)
      if (!item.parallel.length) era[at.path].splice(at.item, 1)
    }
  } else if (at.kind === 'topic') {
    const topic = era.topics[at.topic]
    topic.levels.splice(at.k, 1)
    if (!topic.levels.length) {
      era.topics.splice(at.topic, 1)
      pruned.push(`topic ${topic.id}`)
      if (!era.topics.length) delete era.topics
    }
  } else {
    era.challenges.splice(at.k, 1)
    if (!era.challenges.length) delete era.challenges
  }
  return { eras: out, was: at, pruned }
}

const eraOf = (eras, id) => {
  const e = eras.findIndex((era) => same(era.id, id))
  if (e < 0) throw new Error(`no era ${id}`)
  return e
}
/** The era index and the list holding a named branch or topic. */
function holder(eras, to, kind) {
  const found = []
  eras.forEach((era, e) => {
    if (to.era !== undefined && !same(era.id, to.era)) return
    if (kind === 'topic') (era.topics ?? []).forEach((t) => { if (t.id === to.topic) found.push(t.levels) })
    else for (const path of PATHS) for (const item of era[path] ?? []) if (typeof item !== 'string') for (const b of item.parallel) if (b.id === to.branch) found.push(b.levels)
  })
  if (found.length !== 1) throw new Error(`${found.length ? 'several' : 'no'} ${kind} ${to[kind]}${to.era !== undefined ? ` in era ${to.era}` : ''}${found.length ? ': name the era' : ''}`)
  return found[0]
}
const insert = (list, at, x) => {
  if (at !== undefined && (at < 0 || at > list.length)) throw new Error(`index ${at} is outside 0–${list.length}`)
  list.splice(at ?? list.length, 0, x)
}

/** `eras` with level `id` (in no era yet) put at `to`. */
export function putIn(eras, id, to) {
  if (locate(eras, id)) throw new Error(`${id} is placed already`)
  const out = structuredClone(eras)
  const next = to.before ?? to.after
  if (next !== undefined) {
    const at = locate(out, next)
    if (!at) throw new Error(`${next} is in no era`)
    const era = out[at.era]
    const shift = to.after !== undefined ? 1 : 0
    if (to.on === 'path') {
      if (at.kind !== 'path' && at.kind !== 'branch') throw new Error(`${next} is not on a main path`)
      era[at.path].splice(at.item + shift, 0, id)
    } else if (at.kind === 'path') era[at.path].splice(at.item + shift, 0, id)
    else if (at.kind === 'branch') era[at.path][at.item].parallel[at.branch].levels.splice(at.k + shift, 0, id)
    else if (at.kind === 'topic') era.topics[at.topic].levels.splice(at.k + shift, 0, id)
    else era.challenges.splice(at.k + shift, 0, { level: id, ...(to.hang !== undefined && { after: to.hang }) })
    return out
  }
  if (to.challenge) {
    const era = out[eraOf(out, to.era)]
    era.challenges ??= []
    insert(era.challenges, to.at, { level: id, ...(to.hang !== undefined && { after: to.hang }) })
  } else if (to.branch !== undefined) insert(holder(out, to, 'branch'), to.at, id)
  else if (to.topic !== undefined) insert(holder(out, to, 'topic'), to.at, id)
  else if (to.era !== undefined && PATHS.includes(to.path)) {
    const era = out[eraOf(out, to.era)]
    era[to.path] ??= []
    insert(era[to.path], to.at, id)
  } else throw new Error('a place is before or after a level, a branch, a topic, an era’s foundation or practice path, or an era’s challenges')
  return out
}
