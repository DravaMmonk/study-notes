import { PackedBoard } from './Inside.jsx'
import { partsFor } from '../shell/CircuitScreen.jsx'
import { openRef } from '../shell/refs.js'
import { L } from '../shell/i18n.js'

/**
 * A part the player built, in the components box: the board it runs, read only (Inside.jsx PackedBoard), the
 * parts it holds opening in turn. `course` is the course read, `cards` and `portLabels` as CircuitScreen takes them.
 */
export default function BuiltBoard({ course, type, cards, portLabels = {} }) {
  const drawn = (inside) => inside && { ...inside, parts: partsFor(inside.level, course.forTask(inside.level), { cards, portLabels }) }
  const open = (node, at) => drawn(course.forTask(at.level).BUILT[node.type]?.opens?.(node.params))
  const edit = (node, at) => {
    const builder = course.forTask(at.level).builtBy(node.type, node.params)
    openRef('level', builder.id, builder.task)
  }
  const describe = (node, ctx) => (ctx.board.parts.role(node) === 'part' && !course.BUILT[node.type] ? L(cards[node.type]?.desc) : null)
  // A piece whose inside runs no board (its task is none) has none to show.
  if (!course.BUILT[type]) return null
  return <PackedBoard top={drawn(course.BUILT[type].opens())} open={open} edit={edit} card={{}} describe={describe} />
}
