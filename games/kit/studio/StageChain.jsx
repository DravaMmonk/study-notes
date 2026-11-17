import { editorForType } from './editors.js'

/** Mount the registered stage display for shared grant editors. */
export default function StageChain(props) {
  const Stages = editorForType('circuit/part')?.stages
  return Stages ? <Stages {...props} /> : null
}
