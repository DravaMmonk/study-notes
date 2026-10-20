// Bringing an older save up to date, written as data in a game's spec. A game's saves carry its own version number;
// each step brings saves from before its version forward, by a list of operations done in order:
//
//   { rename: { old id: new id | null } }   level ids move (null drops a level's state); or a function id → id | null
//   { fields: { old field: new field } }     the save's own fields move (a field missing on the save is left alone)
//   { grant: [level id, flag] }              a flag for whoever solved that level
//   { solve: [level id, [level id…]] }       levels counted solved for whoever solved that one
//
// migrations(steps) gives the shell's { version, migrate } (progress.js): version is the newest step's.

const RECORDS = ['data', 'boards', 'best', 'introSeen']

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
  solve: (save, [level, ids]) => ((save.solved ?? []).includes(level) ? { ...save, solved: [...new Set([...save.solved, ...ids])] } : save),
}

/** Ids `prefix<n>` with n ≥ from move up by `by`: shiftIds('2-', 3, 2) moves 2-3 to 2-5 and leaves 2-1 alone. */
export const shiftIds = (prefix, from, by) => (id) => {
  const n = id.startsWith(prefix) ? Number(id.slice(prefix.length)) : NaN
  return Number.isInteger(n) && n >= from ? `${prefix}${n + by}` : id
}

/** steps: [{ version, ops: [op] }] in version order. */
export function migrations(steps) {
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
