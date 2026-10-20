// Saved progress for a game on the shared shell. It lives in this browser only, under `<game id>.v1`:
//
//   { version, solved: [levelId], flags: [flag], data: { [levelId]: anything the level keeps },
//     best: { [levelId]: score }, seenPower, introSeen: { [levelId]: true }, all }
//
// A game's own `progress.migrate(saved)` brings an older save (its own version numbers, or an older key it read
// before the shell existed) up to this shape; `progress.version` is the game's current version.

const blank = (version) => ({ version, solved: [], flags: [], data: {}, best: {}, seenPower: false, introSeen: {}, all: false })

export function createProgress({ id, version = 1, migrate = (saved) => saved, legacy = () => null }) {
  const key = `${id}.v1`
  return {
    key,
    load() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key)) ?? legacy() ?? { version }
        const saved = migrate(stored)
        return { ...blank(version), ...saved, version }
      } catch {
        return blank(version)
      }
    },
    save(progress) {
      try {
        window.localStorage.setItem(key, JSON.stringify(progress))
      } catch {
        // Storage may be full or blocked; the game still works for this session.
      }
    },
    blank: () => ({ ...blank(version), seenPower: true }),
  }
}
