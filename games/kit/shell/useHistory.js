import { useEffect, useReducer, useRef } from 'react'

const DEPTH = 50
// Changes this close together (a slider dragged, a number typed) are one step.
const MERGE_MS = 700

/** Offer undo and redo shortcuts to the active editor, leaving text entry to the browser. */
export function historyKey(event, history) {
  if ((!event.metaKey && !event.ctrlKey) || event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return false
  const key = event.key.toLowerCase()
  if (key !== 'z' && !(key === 'y' && event.ctrlKey)) return false
  event.preventDefault()
  if (key === 'y' || event.shiftKey) history.redo()
  else history.undo()
  return true
}

/**
 * Undo and redo for saved work. Every change is observed from the work the editor received. `scope`
 * names the work being edited; a new one starts the history over. `merge` is how close together (ms) changes
 * count as one step: a strip's taps are each a step of their own (0).
 *
 * @returns { undo, redo, canUndo, canRedo }
 */
export function useHistory(work, onChange, scope = null, merge = MERGE_MS) {
  const serialized = JSON.stringify(work)
  const state = useRef(null)
  state.current ??= { scope, serialized, work, past: [], future: [], at: 0 }
  const [, render] = useReducer((n) => n + 1, 0)

  // Undo and redo have already moved the last snapshot by the time the editor sees their result.
  useEffect(() => {
    const current = state.current
    if (current.scope !== scope) Object.assign(current, { scope, past: [], future: [], at: 0, separate: false, adjustment: null })
    else if (serialized !== current.serialized) {
      const adjustment = current.adjustment
      const automatic = adjustment?.from === current.serialized && adjustment?.to === serialized
      if (!automatic) {
        const now = Date.now()
        if (current.separate || now - current.at > merge) current.past = [...current.past.slice(1 - DEPTH), current.work]
        current.future = []
        current.at = current.separate ? 0 : now
        current.separate = false
        render()
      }
      if (adjustment?.from !== serialized) current.adjustment = null
    }
    Object.assign(current, { serialized, work })
  })

  const step = (from, to) => {
    const current = state.current
    if (current.scope !== scope || !current[from].length) return
    const target = current[from].at(-1)
    current[from] = current[from].slice(0, -1)
    current[to] = [...current[to], current.work]
    Object.assign(current, { serialized: JSON.stringify(target), work: target, at: 0 })
    onChange(target)
    render()
  }
  const current = state.current
  return {
    undo: () => step('past', 'future'), redo: () => step('future', 'past'),
    canUndo: current.scope === scope && current.past.length > 0, canRedo: current.scope === scope && current.future.length > 0,
    separate: () => { current.separate = true },
    // Save geometry from a measurement without treating the resize as an edit.
    adjust: (next) => { current.adjustment = { from: serialized, to: JSON.stringify(next) } },
  }
}
