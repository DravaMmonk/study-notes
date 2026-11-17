import './strip.css'
import { L } from '../shell/i18n.js'

// A block on the strip as the player picks it (games/DESIGN.md 6.8): a part of the strip editor, named, in the colour
// the domain gives what it marks ([data-mark] sets --mark). Pressed while what is selected is marked with it; without
// onClick it only shows. `children` words it otherwise (an action with it: 'fold as …').
export default function Mark({ part, pressed = false, onClick = null, children = null }) {
  return (
    <button type="button" className="ks-mark" data-mark={part.mark} aria-pressed={pressed} disabled={!onClick} onClick={onClick ?? undefined}>
      {children ?? L(part.name)}
    </button>
  )
}
