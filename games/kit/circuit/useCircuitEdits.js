import { keepLocked } from './presets.js'
import { useHistory } from '../shell/useHistory.js'

/** Apply preset restrictions and keep one history for the saved board. */
export function useCircuitEdits(graph, onChange, scope) {
  const history = useHistory(graph, (next) => change(next), scope)
  function change(proposed, { automatic = false, ...options } = {}) {
    const next = keepLocked(graph, proposed)
    if (automatic) history.adjust(next)
    onChange(next, options)
  }
  return { change, history }
}
