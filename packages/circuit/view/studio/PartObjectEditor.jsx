import { useMemo, useState } from 'react'
import { packageLevel } from 'kernel/view'
import PartEditor from './PartEditor.jsx'
import { onPartPage } from './part-page.js'

/** Adapt a generic object selection to the same isolated component preview. */
export default function PartObjectEditor({ full, content, namespace, vocabulary, pending, onEdit, onPick }) {
  const [stage, setStage] = useState(null)
  const [editing, setEditing] = useState(true)
  const preview = useMemo(() => content.levels[0] ? packageLevel(content, content.levels[0].id) : content, [content])
  const message = message => {
    if (message.part === undefined) return
    onPartPage(message, { content, ops: [], shown: { ops: [] }, edit: onEdit,
      pickField: path => onPick(path.slice(2)), vocabulary, playOrder: content.levels.map(level => level.id) })
  }
  return <PartEditor part={full} content={preview} namespace={namespace} stage={stage} pending={pending} visible
    operations={vocabulary.capabilities?.operation ?? {}} edit={editing} onEdit={setEditing} onMessage={message} onRoot={() => onPick([])}
    onStage={(id, path) => { setStage(id); onPick(path) }}
    onStages={stages => onEdit({ op: 'parts.set', path: ['parts', full, 'stages'], value: stages })} />
}
