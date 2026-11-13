import { CanvasEditor } from '../../../circuit/index.js'
import { useImageCards } from './useImageCards.jsx'

export default function Editor({ graph, onChange, hasPalette, types, refit, onClear, ...props }) {
  const { parts, card, corner } = useImageCards({ graph, onChange, ...props })
  return <CanvasEditor graph={graph} onChange={onChange} parts={parts} body={card.body} head={card.head} caption={card.caption} cardClass={card.cardClass} wireState={card.wireState} refit={refit} emptyNote={hasPalette && { zh: '从上方元件栏选择元件放入电路，再连接两端的圆点。', en: 'Pick a part from the row above, then connect the port dots.' }} onClear={onClear} types={types} corner={corner} />
}
