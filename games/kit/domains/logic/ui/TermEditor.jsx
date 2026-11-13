import { useMemo } from 'react'
import TreeEditor from '../../../strip/TreeEditor.jsx'
import { chipsOf, languageOf } from '../termTree.js'

export default function TermEditor({ tree, onChange, scope, forms, history }) {
  const chips = useMemo(() => chipsOf(scope, tree, forms), [scope, tree, forms])
  return <TreeEditor tree={tree} onChange={onChange} chips={chips} language={languageOf(scope)} scope={history} />
}
