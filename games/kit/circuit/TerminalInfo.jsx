import { cardPorts } from './card-ports.js'
import { L, tr } from '../shell/i18n.js'

/** What a level's input or output card is: its side, and its ports where they are named apart from the card. */
export default function TerminalInfo({ node, parts }) {
  const role = parts.role(node)
  const { inputs, outputs } = cardPorts(parts, node)
  const title = String(L(parts.label(node)))
  const names = (role === 'source' ? outputs.map(({ label }) => L(label)) : inputs.map((key) => L(parts.portLabel?.(node, key)) || key))
    .map((name) => String(name ?? '')).filter(Boolean)
  const named = names.length > 1 || (names.length === 1 && names[0] !== title)
  return (
    <div className="cl-terminal-info" data-side={role} data-family={parts.family?.(node)}>
      <span className="cl-terminal-kind">{role === 'source' ? tr('输入', 'Input') : tr('输出', 'Output')}</span>
      {named && <ul>{names.map((name, index) => <li key={index}><i />{name}</li>)}</ul>}
    </div>
  )
}
