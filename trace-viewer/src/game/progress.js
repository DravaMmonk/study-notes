// Saved progress lives in this browser only: solved levels, earned flags, each level's board and best score.
const KEY = 'vision-complete.v1'
const VERSION = 2

// Version 2 added five wave levels to chapter 2 and renumbered the four it had.
const RENUMBERED = { '2-1': '2-8', '2-2': '2-4', '2-3': '2-6', '2-4': '2-9' }
const renameKeys = (record) => Object.fromEntries(Object.entries(record).map(([id, value]) => [RENUMBERED[id] ?? id, value]))

function migrate(saved) {
  if ((saved.version ?? 1) >= VERSION) return saved
  return { ...saved, solved: (saved.solved ?? []).map((id) => RENUMBERED[id] ?? id), boards: renameKeys(saved.boards ?? {}), best: renameKeys(saved.best ?? {}) }
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
