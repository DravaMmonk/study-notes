import { GameFrame, namespaceOf } from 'kernel/view'
import StageChain from './StageChain.jsx'
import Flow, { levelLabel } from './Flow.jsx'

export default function PartEditor({ part, content, operations, namespace, stage, pending, onStage, onStages, target, changeset, names, onFlow, ...frame }) {
  return <GameFrame {...frame} content={content} part={part} stage={stage} footer={<>
    <StageChain part={part} raw={content?.partDefs?.parts?.[part]} operations={operations} namespace={namespace} stage={stage} pending={pending}
      editable={namespaceOf(part) === namespace} onStage={onStage} onAdd={onStages} />
    {target && changeset && <Flow target={target} part={part} changeset={changeset} label={levelLabel(names)} onOpen={onFlow} />}
  </>} />
}
