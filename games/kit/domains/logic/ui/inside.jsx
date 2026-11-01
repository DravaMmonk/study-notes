// What every board that opens a built part shares (a machine part, BoardScreen.jsx; a gate, GatesScreen.jsx): the
// tools on its card and the board inside drawn with its ends on its edges.
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { tr } from '../../../shell/i18n.js'

/**
 * The board a built part runs, as it shows inside the part on a desktop: its inputs and its result are not cards but
 * the part's own ports, drawn small (lg-edge) on the board's left and right edges, beside the parts they feed or come
 * from, so a wire from an input or to the result still shows how the part is wired and in what order.
 */
export function edged(circuit, parts) {
  const isEnd = (n) => parts.role(n) !== 'part'
  const placed = circuit.nodes.filter((n) => !isEnd(n) && !n.in)
  if (!placed.length) return circuit
  const x0 = Math.min(...placed.map((n) => n.x))
  const x1 = Math.max(...placed.map((n) => n.x + (parts.cardWidth?.(n) ?? 160)))
  const y0 = Math.min(...placed.map((n) => n.y))
  let [ins, outs] = [0, 0]
  const nodes = circuit.nodes.map((n) => {
    if (!isEnd(n)) return n
    return parts.role(n) === 'source' ? { ...n, x: x0 - 150, y: y0 + 60 * ins++ } : { ...n, x: x1 + 60, y: y0 + 60 * outs++ }
  })
  return { ...circuit, nodes }
}
/** The parts of such a board: its inputs and result are narrow. */
export const edgeParts = (parts) => ({ ...parts, cardWidth: (n) => (parts.role(n) === 'part' ? parts.cardWidth?.(n) : 90) })

/**
 * A built part's tools in its card's header (`built`: { is(node), edit(type) }): edit (go to the level that builds it)
 * and unfold the card to show the board it runs (on a phone, the part's sheet shows it).
 */
export function BuiltTools({ node, built, onToggle }) {
  if (!built.is(node)) return null
  return (
    <>
      <button type="button" className="node-tool" aria-label={tr('编辑', 'Edit')} title={tr('在搭出它的关卡中编辑', 'Edit in the level that builds it')} onPointerDown={(e) => e.stopPropagation()} onClick={() => built.edit(node.type)}><Pencil size={12} /></button>
      <button type="button" className="node-tool" aria-pressed={Boolean(node.open)} aria-label={node.open ? tr('折叠', 'Collapse') : tr('展开', 'Expand')} onPointerDown={(e) => e.stopPropagation()} onClick={onToggle}>{node.open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
    </>
  )
}
