// Bringing a save up to date with the content, written as data in a game's spec (game.json `saves`, the schema
// ../engine/vocabulary.js SAVES). A game's saves carry its own version number; each step brings saves from before its
// version forward, by a list of operations done in order. The operation set writes them (../engine/ops/migrate.js);
// nothing else does. A save keeps a level's state by its id and a task's by its key (progress.js), so only these
// change what it holds:
//
//   { rename: { old level id: new id | null } }   level ids move (null drops the level's state), and with them the keys
//                                                 of its tasks that are written after it (`<level>#<k>`)
//   { solve: [level id, [level id…]] }            levels counted solved for whoever solved that one
//   { built: [[level id, task key]…] }            for each of these levels solved, the board kept on that task (its
//                                                 last) becomes the board its part runs
//   { drop: [task key…] }                         the boards kept on these tasks, every slot's and the part's, dropped:
//                                                 their puzzle changed, or they are gone (whether they are passed stays)
//   { retask: { old task key: new key } }         task ids renamed
//
// migrations(steps) gives the shell's { version, migrate } (progress.js): version is the newest step's.

const BY_TASK = ['data', 'slots', 'built', 'introSeen']
const BY_LEVEL = ['best', 'introSeen']

/** A record (an object by key) with its keys moved by `move` (null: dropped). */
const rekeyed = (record, move) => Object.fromEntries(Object.entries(record ?? {}).map(([k, v]) => [move(k), v]).filter(([k]) => k !== null))

/** The save with every key moved by `move` (null drops it): the tasks' records and lists, and, by level, `levels`. */
function rekey(save, move, levels = move) {
  const out = { ...save, passed: (save.passed ?? []).map(move).filter((k) => k !== null), solved: (save.solved ?? []).map(levels).filter((k) => k !== null) }
  for (const field of BY_TASK) if (save[field]) out[field] = rekeyed(save[field], move)
  for (const field of BY_LEVEL) if (save[field] && !BY_TASK.includes(field)) out[field] = rekeyed(save[field], levels)
  return out
}

const OPS = {
  rename: (save, to) => {
    const level = (id) => (id in to ? to[id] : id)
    // A task key written after its level (`<level>#<k>`) moves with it; a level's own key is its id.
    const key = (k) => {
      const [id, ...rest] = String(k).split('#')
      if (!(id in to)) return k
      return to[id] === null ? null : [to[id], ...rest].join('#')
    }
    return rekey(save, key, level)
  },
  solve: (save, [level, ids]) => ((save.solved ?? []).includes(level) ? { ...save, solved: [...new Set([...save.solved, ...ids])] } : save),
  built: (save, pairs) => {
    const boards = pairs.filter(([level, key]) => (save.solved ?? []).includes(level) && save.data?.[key] && !save.built?.[key]).map(([, key]) => [key, save.data[key]])
    return boards.length ? { ...save, built: { ...save.built, ...Object.fromEntries(boards) } } : save
  },
  drop: (save, keys) => {
    const out = { ...save }
    for (const field of ['data', 'slots', 'built']) if (save[field]) out[field] = Object.fromEntries(Object.entries(save[field]).filter(([k]) => !keys.includes(k)))
    return out
  },
  retask: (save, to) => rekey(save, (k) => to[k] ?? k, (id) => id),
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
