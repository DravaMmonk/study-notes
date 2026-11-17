// Symbols use the shared field inspector and stage chain.
import { useState } from 'react'
import { L } from '../shell/i18n.js'
import { SYMBOL } from '../engine/content-kinds.js'
import { formOf } from './form.js'
import { namespaceOf, localName } from './objects-edit.js'
import Rows from './Rows.jsx'
import StageChain from './StageChain.jsx'

export default function SymbolEditor({ content, namespace, vocabulary, full, pending, onEdit, onPick }) {
  const [stage, setStage] = useState(null)
  const raw = content.registries.symbol[full]
  const own = namespaceOf(full) === namespace
  return (
    <article className="arrange">
      <h2>{L(raw.name)}</h2>
      <Rows form={formOf(SYMBOL, raw, { vocabulary })} onPick={onPick} />
      <StageChain part={full} raw={raw} namespace={namespace} stage={stage} pending={pending} editable={own}
        onStage={(id, path) => { setStage(id); onPick(path) }}
        onAdd={stages => onEdit({ op: 'symbol.set', symbol: localName(namespace, full), path: 'stages', value: stages })} />
    </article>
  )
}
