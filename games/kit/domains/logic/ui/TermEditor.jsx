import { useMemo } from 'react'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { chipsOf, complete, holesOf, joinsOnto, nodeAt, segmentOf, setAt } from '../termTree.js'

// Building a proof term from chips on the shared strip (games/kit/strip), written out as it reads with a box for each
// empty place: the term tasks' board (TermScreen.jsx) and the sheet of a proof-term card on the proof board
// (TermField.jsx). `scope` is the names the term may use (premises, assumptions); `history` names whose undo it is.

const T = (zh, en) => ({ zh, en })
const GROUPS = [['name', T('名字', 'Names')], ['form', T('写法', 'Forms')]]
const pathOf = (key) => key.split('.').slice(1).map(Number)

export default function TermEditor({ tree, onChange, scope, history: scopeKey, children = null }) {
  const chips = useMemo(() => chipsOf(scope, tree), [scope, tree])
  const history = useHistory(tree, onChange, scopeKey, 0)
  const strip = useStrip({
    put: (slot, key) => {
      const path = pathOf(slot)
      const made = chips.find((c) => c.key === key).make(tree)
      // Onto the term the line ends with (see target): it goes in the form's first box.
      const last = nodeAt(tree, path)
      onChange(setAt(tree, path, last ? setAt(made, [0], last) : made))
      return null
    },
    take: (slot) => onChange(setAt(tree, pathOf(slot), null)),
    // The first box; with no box left, a form that starts with its box (□ □, □.1, □.elim …) takes the last term.
    target: (key) => {
      const at = holesOf(tree)[0]?.path ?? (chips.find((c) => c.key === key).leads ? joinsOnto(tree, key) : null)
      return at ? ['r', ...at].join('.') : null
    },
    filled: (slot) => nodeAt(tree, pathOf(slot)) !== null,
    fixed: () => false,
  })
  // Where the next piece goes, always marked: the box picked, else the first box, else after the whole term.
  const first = holesOf(tree)[0]
  const next = strip.selected ?? (first ? ['r', ...first.path].join('.') : complete(tree) ? 'end' : null)
  const groups = GROUPS.map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, text: c.text, sub: c.sub, family: group })) })).filter((g) => g.chips.length)
  return (
    <>
      <StripTools history={history} onClear={() => onChange(null)} empty={!tree} />
      <Strip line={[segmentOf(tree)]} label={T('证明项', 'proof term')} next={next} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {strip.note ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p> : <p className="ks-note">{tr('点击文字可以删除。', 'Tap words to delete them.')}</p>}
      {children}
      <Chips groups={groups} onChip={(key) => { strip.onChip(key) }} />
    </>
  )
}
