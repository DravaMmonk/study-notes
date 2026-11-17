// Symbols use the shared field inspector and stage chain.
import { useState } from 'react'
import { L, formOf, namespaceOf, localName, Rows } from 'kernel/view'
import { StageChain } from 'circuit/view'

export default function SymbolEditor({ content, namespace, vocabulary, full, pending, onEdit, onPick }) {
  const [stage, setStage] = useState(null)
  const raw = content.registries['logic/symbol'][full]
  const own = namespaceOf(full) === namespace
  return (
    <article className="arrange">
      <h2>{L(raw.name)}</h2>
      <Rows form={formOf(content.objectKinds['logic/symbol'].schema, raw, { vocabulary })} onPick={onPick} />
      <StageChain part={full} raw={raw} namespace={namespace} stage={stage} pending={pending} editable={own}
        onStage={(id, path) => { setStage(id); onPick(path) }}
        onAdd={stages => onEdit({ op: 'object.set', kind: 'logic/symbol', name: localName(namespace, full), path: 'stages', value: stages })} />
    </article>
  )
}
