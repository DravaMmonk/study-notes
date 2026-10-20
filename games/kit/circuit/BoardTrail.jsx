import { ChevronRight } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { trail } from './nested.js'

// The breadcrumb over a board inside a board (nested.js): the top board, then each part opened on the way. Clicking a
// step goes back up to it.
export default function BoardTrail({ circuit, path, labelOf, boardsOf, onGo }) {
  if (!path.length) return null
  const steps = trail(circuit, path, labelOf, boardsOf)
  return (
    <nav className="board-trail" aria-label={tr('所在的电路板', 'Board')}>
      <button type="button" onClick={() => onGo(0)}>{tr('整块板', 'Whole board')}</button>
      {steps.map((step) => (
        <span key={step.depth} className="board-trail-step">
          <ChevronRight size={14} aria-hidden="true" />
          {step.depth === steps.length ? <b>{L(step.label)}</b> : <button type="button" onClick={() => onGo(step.depth)}>{L(step.label)}</button>}
        </span>
      ))}
    </nav>
  )
}
