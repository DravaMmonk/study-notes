// Saved progress lives in this browser only: solved levels, earned flags, each level's board and best score.
const KEY = 'vision-complete.v1'
const VERSION = 4

// Level ids that moved, by the version that moved them: version 2 added five wave levels to
// chapter 2, version 3 added four light and slope levels to chapter 3, version 4 rebuilt chapter 3
// in the lecture's order and retired 朗伯台 (null drops a level's saved state).
const RENUMBERED = {
  2: { '2-1': '2-8', '2-2': '2-4', '2-3': '2-6', '2-4': '2-9' },
  3: { '3-1': '3-5', '3-2': '3-7' },
  4: { '3-2': '3-4', '3-3': null, '3-4': '3-5', '3-5': '3-6', '3-6': '3-7', '3-7': '3-8' },
}

function migrate(saved) {
  let out = saved
  for (let version = (saved.version ?? 1) + 1; version <= VERSION; version++) {
    const moved = RENUMBERED[version] ?? {}
    const to = (id) => (id in moved ? moved[id] : id)
    const rename = (record) => Object.fromEntries(Object.entries(record).map(([id, value]) => [to(id), value]).filter(([id]) => id !== null))
    out = { ...out, solved: (out.solved ?? []).map(to).filter((id) => id !== null), boards: rename(out.boards ?? {}), best: rename(out.best ?? {}) }
  }
  return out
}

export function loadProgress() {
  try {
    const saved = migrate(JSON.parse(window.localStorage.getItem(KEY)) ?? { version: VERSION })
    return { version: VERSION, solved: saved.solved ?? [], flags: saved.flags ?? [], boards: saved.boards ?? {}, best: saved.best ?? {}, seenIntro: Boolean(saved.seenIntro) }
  } catch {
    return { version: VERSION, solved: [], flags: [], boards: {}, best: {}, seenIntro: false }
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Storage may be full or blocked; the game still works for this session.
  }
}

export function resetProgress() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
