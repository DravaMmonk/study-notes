import Circuit from './modes/Circuit.jsx'
import Fill from './modes/Fill.jsx'
import Trace from './modes/Trace.jsx'
import Link from './modes/Link.jsx'
import Pack from './modes/Pack.jsx'
import Breach from './modes/Breach.jsx'
import Policy from './modes/Policy.jsx'
import Seam from './modes/Seam.jsx'

// A table level on the shared game shell (games/kit/shell): each level is played by the screen of its mode
// (vocabulary.js mode), given what the shell gives a level screen.
const MODES = { circuit: Circuit, fill: Fill, trace: Trace, link: Link, pack: Pack, breach: Breach, policy: Policy, seam: Seam }

export default function LevelScreen(props) {
  // A built part runs the board the player passed its level with.
  props.game.table.syncOwn(props.progress.built)
  const Mode = MODES[props.level.source.mode]
  return <Mode {...props} />
}
