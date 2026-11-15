import { Named, Revisions, marker } from '../shell/parts/PieceSheet.jsx'
import Mark from './Mark.jsx'

// The strip editor's pieces drawn (games/DESIGN.md 6.7, 6.8). A block is the same on every screen, so it has one scene,
// its detail: the block as the player picks it (Mark.jsx); in the parts box (`entry`) that would only say its name
// again under its heading, so there it draws nothing. Its sheet: its icon, name and description, the descriptions it
// grows along the course, and what it marks.
//
//   preview(piece, { game, scene, entry? })   piece: pieces.json's entry with its `type`

export const preview = (piece, { scene, entry = null }) => (scene === 'detail' && !entry ? <Mark piece={piece} /> : null)

export function Sheet({ piece, edit }) {
  const { mark } = marker(edit)
  return (
    <div className={`pp-sheet ${edit ? 'is-editing' : ''}`}>
      <Named def={piece} edit={edit} />
      <Revisions def={piece} edit={edit} />
      <div className="pp-code" {...mark(['mark'])}><span className="pp-code-label">mark</span><code>{piece.mark}</code></div>
    </div>
  )
}

export default { preview, Sheet }
