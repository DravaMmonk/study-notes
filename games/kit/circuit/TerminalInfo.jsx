import { cardPorts } from './card-ports.js'
import { L, tr } from '../shell/i18n.js'

export default function TerminalInfo({ node, parts }) {
  const role = parts.role(node)
  const { inputs, outputs } = cardPorts(parts, node)
  return <dl className="cl-terminal-info">
    <div><dt>{tr('类型', 'Type')}</dt><dd>{role === 'source' ? tr('输入', 'Input') : tr('输出', 'Output')}</dd></div>
    {inputs.length > 0 && <div><dt>{tr('输入端口', 'Input ports')}</dt><dd>{inputs.map((key) => L(parts.portLabel?.(node, key)) || key).join(' · ')}</dd></div>}
    {outputs.length > 0 && <div><dt>{tr('输出端口', 'Output ports')}</dt><dd>{outputs.map(({ label }) => L(label) || L(parts.label(node))).join(' · ')}</dd></div>}
  </dl>
}
