// The relation board of the package workspace (games/DESIGN.md 6.1, 6.7): one relation at a time on the wiring board
// (ArrangementBoard.jsx). Its endpoints are cards (a level, a piece or a whole tag), its edges are wires: drag from
// one card's output to another's input to add an edge, pick a wire to remove it or, for a prerequisite, to require a
// pass. Requires, order and replaces are all drawn and edited the same way. Another layer's relations are read only.
// The list of relations is the left column's (ObjectLists.jsx); its file the right's.
import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { linkKey, wiringBoard, wiringRefusal } from './arrangement.js'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, shownName, tagCandidates } from './objects-edit.js'
import SourceMark from './SourceMark.jsx'
import { overridesIt, relationOverrideOps } from './override-edit.js'
import { declaredEdges, endpointKind, endpointsOf, withEdge, withRequired, withoutEdge, withoutEndpoint, writeEdges } from './relation-edit.js'

const refusal = (reason) => ({
  self: tr('不能接到自己。', 'An endpoint cannot link to itself.'),
  duplicate: tr('这条连线已存在。', 'This wire already exists.'),
  cycle: tr('这条连线会形成循环。', 'This wire would create a cycle.'),
})[reason]

/** The relation `full` (a relation group picked in a build list); `onPick(path)` shows a field of its file on the right. */
export default function RelationBoard({ content, namespace, full, pending, onSelect, onEdit, onOps, onPick }) {
  const relation = content?.registries?.relation?.[full]
  if (!relation) return <article className="arrange" />
  return <OneRelation key={full} full={full} name={localName(namespace, full)} relation={relation} own={namespaceOf(full) === namespace} content={content} namespace={namespace}
    pending={pending} onSelect={onSelect} onEdit={onEdit} onOps={onOps} onPick={onPick} />
}

function OneRelation({ full, name, relation, own, content, namespace, pending, onSelect, onEdit, onOps, onPick }) {
  const kind = endpointKind(relation)
  const edges = useMemo(() => declaredEdges(relation), [relation])
  const [placed, setPlaced] = useState([])
  const [armed, setArmed] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [active, setActive] = useState(null)
  const [notice, setNotice] = useState('')
  const [overriding, setOverriding] = useState(() => overridesIt(content, namespace, 'relation', full))
  const editable = own || overriding
  const locked = pending || !editable
  const ends = endpointsOf(edges, placed)
  const links = useMemo(() => edges.map((edge) => ({ ...edge, source: 'course' })), [edges])
  const requires = useMemo(() => new Map(ends.map((id) => [id, edges.filter(({ to }) => to === id).map(({ from }) => from)])), [ends, edges])
  const board = useMemo(() => wiringBoard(ends, [], requires, links), [ends, requires, links])
  const registry = kind
  const titleOf = (id) => {
    if (id.startsWith('#')) return L(content.registries?.tag?.[id.slice(1)]?.title)
    const value = content.registries?.[registry]?.[id]
    return L(value?.title ?? value?.name)
  }
  const describe = (id) => `${shownName(namespace, id)} ${titleOf(id) ?? ''}`.trim()
  const label = (id) => <><code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span></>
  const wire = edges.find((edge) => linkKey(edge) === highlight)
  const reset = () => { setArmed(null); setHighlight(null); setNotice('') }
  const write = (next) => onOps(own ? writeEdges(namespace, name, relation, next) : relationOverrideOps(content, namespace, full, next))
  const connect = (from, to) => {
    if (locked) return
    const problem = relation.kind === 'replaces' ? (from === to ? 'self' : null) : wiringRefusal(requires, from, to)
    const next = !problem && withEdge(edges, from, to)
    if (!next) { setNotice(refusal(problem ?? 'duplicate')); return }
    write(next)
    reset()
    setHighlight(linkKey({ from, to }))
  }
  const removeWire = () => {
    if (!wire || locked || !confirmDelete(`${describe(wire.from)} → ${describe(wire.to)}`)) return
    write(withoutEdge(edges, highlight))
    reset()
  }
  const removeEnd = () => {
    if (!active || locked) return
    setPlaced(placed.filter((id) => id !== active))
    if (edges.some(({ from, to }) => from === active || to === active)) write(withoutEndpoint(edges, active))
    setActive(null)
  }
  const remove = () => {
    if (!own || pending || !confirmDelete(shownName(namespace, full))) return
    onEdit({ op: 'relation.remove', relation: name })
    onSelect(null)
  }
  const candidates = tagCandidates(content, kind).filter((id) => !ends.includes(id))
    .map((id) => ({ value: id, label: shownName(namespace, id), title: titleOf(id) }))
  return (
    <article className="arrange" onKeyDown={(event) => {
      if (event.key === 'Delete' && !event.repeat && wire && !event.target.matches('input, textarea, select, [contenteditable]')) {
        event.preventDefault()
        removeWire()
      }
    }}>
      <div className="arrange-group">
        <code className="editor-id">{shownName(namespace, full)}</code>
        <SourceMark content={content} kind="relation" full={full} own={own} overriding={overriding} pending={pending} onOverride={() => setOverriding(true)} />
        {editable && candidates.length > 0 && <Picker options={candidates} icon={Plus} label={tr('放上板', 'Place on the board')} placeholder={tr('放上板', 'Place on the board')}
          onPick={(id) => setPlaced([...placed, id])} />}
        {own && <button type="button" className="kit-btn editor-tool" disabled={pending} onClick={remove} title={tr('删掉这份关系', 'Remove the relation')}><Trash2 size={14} /></button>}
      </div>
      <div className="arrange-actions">
        {wire ? <>
          <strong>{describe(wire.from)} → {describe(wire.to)}</strong>
          {relation.kind === 'requires' && <label>
            <input type="checkbox" checked={wire.required ?? false} disabled={locked} onChange={(e) => write(withRequired(edges, highlight, e.target.checked))} />
            {tr('须通过这个前置', 'Require a pass on this prerequisite')}
          </label>}
          {editable && <button type="button" className="kit-btn is-label" disabled={locked} onClick={removeWire}><Trash2 size={13} aria-hidden="true" />{tr('断开连线', 'Disconnect')}</button>}
        </> : active && editable ? <>
          <strong>{describe(active)}</strong>
          <button type="button" className="kit-btn is-label" disabled={locked} onClick={removeEnd}><Trash2 size={13} aria-hidden="true" />{tr('从板上拿掉', 'Take off the board')}</button>
        </> : null}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <ArrangementBoard board={board} label={label} describe={describe} active={active} picked={board.hosted.has(armed) ? armed : null} wire={highlight} pending={locked} isExternal={() => false}
        onLevel={(id) => { reset(); setActive(active === id ? null : id) }} onWire={(edge) => {
          reset()
          setHighlight(linkKey(edge))
          const k = (relation.edges ?? []).findIndex((e) => linkKey(e) === linkKey(edge))
          onPick?.(k < 0 ? ['sequence'] : ['edges', k])
        }}
        onPick={(id) => { reset(); setArmed(armed === id ? null : id) }} onConnect={connect} onCancel={reset} />
    </article>
  )
}
