import { PackedBoard } from "./Inside.jsx"
import { packedView } from "./board-parts.js"
import { L } from 'kernel/view'


/**
 * A part the player built, in the components box: the board it runs, read only (Inside.jsx PackedBoard), the
 * parts it holds opening in turn. `course` is the course read, `cards` and `portLabels` as CircuitScreen takes them.
 */
export default function BuiltBoard({ course, type, cards, portLabels = {}, defined }) {
  const { root, open, edit } = packedView(course, { cards, portLabels, defined })
  const top = root(type)
  if (!top) return null
  const describe = (node, ctx) => (ctx.board.parts.role(node) === 'part' && !ctx.board.parts.packed?.(node) ? L(cards[node.type]?.desc) : null)
  return <PackedBoard top={top} open={open} edit={edit} card={{}} describe={describe} />
}
