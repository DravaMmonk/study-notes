// The package workspace's arrangement tab (games/PACKAGES.md 8): the three object editors that replaced the group
// board — tags (TagEditor.jsx), relations (RelationBoard.jsx) and layouts (LayoutEditor.jsx) — one at a time.
import { tr } from '../shell/i18n.js'
import { usePref } from './prefs.js'
import TagEditor from './TagEditor.jsx'
import RelationBoard from './RelationBoard.jsx'
import LayoutEditor from './LayoutEditor.jsx'

const EDITORS = [['tag', '标签', 'Tags', TagEditor], ['relation', '关系', 'Relations', RelationBoard], ['layout', '布局', 'Layouts', LayoutEditor]]

/** `at`: { tag | relation | layout: full name }, the object open; `onAt(next)` opens another. */
export default function ObjectsTab({ content, namespace, at, pending, onAt, onEdit, onOps }) {
  const [remembered, setRemembered] = usePref('objects-editor', 'tag')
  const kind = EDITORS.find(([k]) => at?.[k] !== undefined)?.[0] ?? remembered
  const [, , , Editor] = EDITORS.find(([k]) => k === kind)
  const open = (k) => { setRemembered(k); onAt({ [k]: null }) }
  return (
    <div className="objects-tab">
      <nav className="studio-modes objects-switch" role="tablist" aria-label={tr('对象', 'Objects')}>
        {EDITORS.map(([k, zh, en]) => (
          <button key={k} type="button" role="tab" aria-selected={k === kind} className={`studio-tab ${k === kind ? 'is-on' : ''}`} onClick={() => open(k)}>{tr(zh, en)}</button>
        ))}
      </nav>
      <Editor content={content} namespace={namespace} selected={at?.[kind] ?? null} pending={pending}
        onSelect={(full) => onAt({ [kind]: full })} onEdit={onEdit} onOps={onOps} />
    </div>
  )
}
