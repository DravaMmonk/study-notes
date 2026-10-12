// Saved progress lives in this browser only: solved levels, earned flags, each level's board and best score.
const KEY = 'vision-complete.v1'

export function loadProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY)) ?? {}
    return { solved: saved.solved ?? [], flags: saved.flags ?? [], boards: saved.boards ?? {}, best: saved.best ?? {}, seenIntro: Boolean(saved.seenIntro) }
  } catch {
    return { solved: [], flags: [], boards: {}, best: {}, seenIntro: false }
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
