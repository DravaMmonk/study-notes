import { Named, marker } from '../shell/parts/PartSheet.jsx'
import Mark from './Mark.jsx'

// The strip editor's parts drawn (games/DESIGN.md 6.7, 6.8). A block is the same on every screen, so it has one scene,
// its detail: the block as the player picks it (Mark.jsx); in the parts box (`entry`) that would only say its name
// again under its heading, so there it draws nothing. Its sheet: its icon, name, description, and mark.
//
//   preview(part, { game, scene, entry? })   part: parts.json's entry with its `type`

export const preview = (part, { scene, entry = null }) => (scene === 'detail' && !entry ? <Mark part={part} /> : null)

export function Sheet({ part, edit }) {
  const { mark } = marker(edit)
  return (
    <div className={`pp-sheet ${edit ? 'is-editing' : ''}`}>
      <Named def={part} edit={edit} />
      <div className="pp-code" {...mark(['mark'])}><span className="pp-code-label">mark</span><code>{part.mark}</code></div>
    </div>
  )
}

export default { preview, Sheet }
