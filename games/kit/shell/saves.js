// Bringing an older save up to date, written as data in a game's spec. A game's saves carry its own version number;
// each step brings saves from before its version forward, by a list of operations done in order:
//
//   { rename: { old id: new id | null } }   level ids move (null drops a level's state); or a function id → id | null
//   { fields: { old field: new field } }     the save's own fields move (a field missing on the save is left alone)
//   { grant: [level id, flag] }              a flag for whoever solved that level
//   { solve: [level id, [level id…]] }       levels counted solved for whoever solved that one
//   { data: (value, level id) → value }      every level's kept state rewritten (a part renamed or gone from boards),
//                                            the boards waiting in its other slots too (slots.js)
//   { merge: [level id, [level id…]] }       levels that became the tasks of one level, in order: their boards make
//                                            its list of task boards, the run of them solved from the first its tasks
//                                            passed (all of them: the level solved); their other slots are dropped
//
// migrations(steps) gives the shell's { version, migrate } (progress.js): version is the newest step's.

const RECORDS = ['data', 'boards', 'slots', 'best', 'tasks', 'introSeen']

function rename(save, to) {
  const move = typeof to === 'function' ? to : (id) => (id in to ? to[id] : id)
  const out = { ...save, solved: (save.solved ?? []).map(move).filter((id) => id !== null) }
  for (const field of RECORDS) {
    if (!save[field]) continue
    out[field] = Object.fromEntries(Object.entries(save[field]).map(([id, value]) => [move(id), value]).filter(([id]) => id !== null))
  }
  return out
}

const OPS = {
  rename,
  fields: (save, moves) => {
    const out = { ...save }
    for (const [from, to] of Object.entries(moves)) {
      if (!(from in out)) continue
      out[to] = out[from]
      delete out[from]
    }
    return out
  },
  grant: (save, [level, flag]) => ((save.solved ?? []).includes(level) && !(save.flags ?? []).includes(flag) ? { ...save, flags: [...(save.flags ?? []), flag] } : save),
  data: (save, f) => ({
    ...save,
    ...(save.data && { data: Object.fromEntries(Object.entries(save.data).map(([id, value]) => [id, f(value, id)])) }),
    ...(save.slots && { slots: Object.fromEntries(Object.entries(save.slots).map(([id, s]) => [id, { ...s, list: s.list.map((slot) => ('data' in slot ? { ...slot, data: f(slot.data, id) } : slot)) }])) }),
  }),
  merge: (save, [into, ids]) => {
    const solved = save.solved ?? []
    const run = ids.findIndex((id) => !solved.includes(id))
    const passed = run < 0 ? ids.length : run
    const out = { ...save, solved: [...solved.filter((id) => !ids.includes(id)), ...(passed === ids.length ? [into] : [])] }
    for (const field of RECORDS) {
      if (!save[field]) continue
      out[field] = Object.fromEntries(Object.entries(save[field]).filter(([id]) => !ids.includes(id)))
    }
    if (save.data && ids.some((id) => save.data[id] != null)) out.data[into] = ids.map((id) => save.data[id] ?? null)
    if (save.best?.[ids.at(-1)]) out.best[into] = save.best[ids.at(-1)]
    if (save.introSeen && ids.some((id) => save.introSeen[id])) out.introSeen[into] = ids.map((id) => save.introSeen[id]).find(Boolean)
    if (passed && passed < ids.length) out.tasks = { ...out.tasks, [into]: passed }
    return out
  },
  solve: (save, [level, ids]) => ((save.solved ?? []).includes(level) ? { ...save, solved: [...new Set([...save.solved, ...ids])] } : save),
}

/** Ids `prefix<n>` with n ≥ from move up by `by`: shiftIds('2-', 3, 2) moves 2-3 to 2-5 and leaves 2-1 alone. */
export const shiftIds = (prefix, from, by) => (id) => {
  const n = id.startsWith(prefix) ? Number(id.slice(prefix.length)) : NaN
  return Number.isInteger(n) && n >= from ? `${prefix}${n + by}` : id
}

/** steps: [{ version, ops: [op] }] in version order. */
export function migrations(steps) {
  // A step written inside another's ops (a misplaced bracket) would never run: refuse it when the game loads.
  for (const step of steps) for (const op of step.ops) if (!OPS[Object.keys(op)[0]]) throw new Error(`save step ${step.version}: unknown operation ${Object.keys(op)[0]}`)
  return {
    version: Math.max(1, ...steps.map((s) => s.version)),
    migrate: (saved) => {
      const from = saved.version ?? 1
      let out = saved
      for (const step of steps) {
        if (from >= step.version) continue
        for (const op of step.ops) {
          const [kind] = Object.keys(op)
          out = OPS[kind](out, op[kind])
        }
      }
      return out
    },
  }
}
