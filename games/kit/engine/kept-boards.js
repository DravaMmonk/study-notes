/** The passing boards available to a course, keyed by the tasks that produced them. */
export function keptBoards(fits) {
  const own = new Map()
  return {
    sync(built = {}, keys = Object.keys(built)) {
      own.clear()
      for (const key of keys) {
        const board = built[key]
        if (board?.nodes && fits(key, board)) own.set(key, board)
      }
    },
    board: (key) => own.get(key),
  }
}
