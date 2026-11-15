import { useMemo } from 'react'
import { T } from '../../../shell/i18n.js'
import TreeEditor from '../../../strip/TreeEditor.jsx'
import { chipsOf, complete, holesOf, joinsOnto, nodeAt, segmentOf, setAt } from '../termTree.js'

// Building a proof term from chips on the shared strip (games/kit/strip), written out as it reads with a box for each
// empty place: the term tasks' board (TermScreen.jsx). `scope` is the names the term may use (premises, assumptions); `history` names whose undo it is.

const GROUPS = [['name', T('名字', 'Names')], ['form', T('写法')]]
const model = { complete, holesOf, joinsOnto, nodeAt, segment: segmentOf, setAt }

export default function TermEditor({ tree, onChange, scope, forms, history: scopeKey }) {
  const chips = useMemo(() => chipsOf(scope, tree, forms), [scope, tree, forms])
  const groups = GROUPS.map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, text: c.text, sub: c.sub, family: group })) })).filter((g) => g.chips.length)
  return <TreeEditor tree={tree} onChange={onChange} chips={chips} groups={groups} scope={scopeKey} label={T('证明项', 'proof term')} model={model} />
}
