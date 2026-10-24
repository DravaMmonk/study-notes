import { useEffect, useReducer, useRef } from 'react'

const DEPTH = 50
// Changes this close together (a slider dragged, a number typed) are one step.
const MERGE_MS = 700

/**
 * Undo and redo for a board, the same in every game and on both boards. A change is seen here wherever it was made
 * (a card, a sheet, the parts list, the game's own controls): each graph unlike the one before is a step. `scope`
 * names the board (a level's stage); a new one starts the history over. `merge` is how close together (ms) changes
 * count as one step: a strip's taps are each a step of their own (0).
 *
 * @returns { undo, redo, canUndo, canRedo }
 */
export function useHistory(graph, onChange, scope = null, merge = MERGE_MS) {
  const shot = JSON.stringify(graph)
  const h = useRef(null)
  h.current ??= { scope, shot, graph, past: [], future: [], at: 0 }
  const [, render] = useReducer((n) => n + 1, 0)

  // Every render: a graph unlike the last one seen is an edit (an undo or redo has already moved the last one seen).
  useEffect(() => {
    const s = h.current
    if (s.scope !== scope) Object.assign(s, { scope, past: [], future: [], at: 0 })
    else if (shot !== s.shot) {
      const now = Date.now()
      if (now - s.at > merge) s.past = [...s.past.slice(1 - DEPTH), s.graph]
      s.future = []
      s.at = now
      render()
    }
    Object.assign(s, { shot, graph })
  })

  const step = (from, to) => {
    const s = h.current
    const target = s[from].at(-1)
    if (!target) return
    s[from] = s[from].slice(0, -1)
    s[to] = [...s[to], s.graph]
    Object.assign(s, { shot: JSON.stringify(target), graph: target, at: 0 })
    onChange(target)
    render()
  }
  const s = h.current
  return { undo: () => step('past', 'future'), redo: () => step('future', 'past'), canUndo: s.past.length > 0, canRedo: s.future.length > 0 }
}
