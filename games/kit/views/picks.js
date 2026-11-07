// Which view each value is drawn in (games/DESIGN.md 6.10): a pick a value — an input or output of a task, a part's
// output on the board, a value inside a packed part — switched in its detail or its results row and kept on this
// device by game and task, never in the board (a view changes nothing a run sees). A value with no pick starts in the
// view its task port says (`view`), else the first its place offers.
//
//   picks.get(game, scope, of) → view | undefined      picks.set(game, scope, of, view)
//   viewOf(list, picked, start) → the view drawn, among `list`
//   valueKey(ctx, key) → a value's `of`: its key on the board (a node's id, `id#output`), after the packed parts it is in

export function createPicks(storage = () => globalThis.localStorage) {
  let version = 0
  const listeners = new Set()
  const read = () => {
    try { const all = JSON.parse(storage().getItem('games.views')); return all && typeof all === 'object' && !Array.isArray(all) ? all : {} } catch { return {} }
  }
  return {
    subscribe: (f) => { listeners.add(f); return () => listeners.delete(f) },
    snapshot: () => version,
    get: (game, scope, of) => read()[game]?.[scope]?.[of],
    set: (game, scope, of, view) => {
      const all = read()
      const own = all[game] ?? {}
      try { storage().setItem('games.views', JSON.stringify({ ...all, [game]: { ...own, [scope]: { ...own[scope], [of]: view } } })) } catch { /* Unavailable storage keeps the views they start in. */ }
      version++
      listeners.forEach((f) => f())
    },
  }
}
export const picks = createPicks()

export const viewOf = (list, picked, start) => [picked, start].find((v) => list.includes(v)) ?? list[0]

export const valueKey = (ctx, key) => [...(ctx?.path ?? []), key].join('/')
