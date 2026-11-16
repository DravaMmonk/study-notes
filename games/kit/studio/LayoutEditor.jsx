// The layout editor of the package workspace (games/PACKAGES.md 3.4, 8): one layout at a time, the route map of a
// level tag's members as the game draws it, row by row, one to three places a row. A level is dragged to a place (or
// picked, then its place clicked: the way on a phone), to a row of its own between rows, or off the map; places and
// rows are put in and taken out; the tag's levels no row places wait below. A move that would put a prerequisite in a
// row not above the level that needs it is refused. Another layer's layouts are read only.
import { useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, objectsOf, shownName } from './objects-edit.js'
import { ROW_SLOTS, addPlace, addRow, clearLevel, layoutMembers, layoutRefusal, layoutRowsOp, newLayout, placeLevel, placeOf, removePlace } from './layout-edit.js'

export default function LayoutEditor({ content, namespace, selected, pending, onSelect, onEdit, onOps }) {
  const all = objectsOf(content, 'layout', namespace)
  const current = all.find(([full]) => full === selected) ?? all[0] ?? null
  const namespaces = [...new Set(all.map(([full]) => namespaceOf(full)))]
  const levelTags = objectsOf(content, 'tag', namespace).filter(([, tag]) => tag.kind === 'level')
    .map(([full, tag]) => ({ value: full, label: shownName(namespace, `#${full}`), title: tag.title }))
  const create = (tag) => {
    if (pending) return
    const { full, op } = newLayout(content, namespace, tag)
    onEdit(op)
    onSelect(full)
  }
  const remove = () => {
    const [full, , own] = current
    if (!own || pending || !confirmDelete(localName(namespace, full))) return
    onEdit({ op: 'layout.remove', layout: localName(namespace, full) })
    onSelect(null)
  }
  return (
    <article className="arrange">
      <header className="arrange-bar">
        {all.length > 0 && <select className="studio-game" value={current?.[0] ?? ''} aria-label={tr('布局', 'Layout')} onChange={(e) => onSelect(e.target.value)}>
          {namespaces.map((ns) => <optgroup key={ns} label={ns}>
            {all.filter(([full]) => namespaceOf(full) === ns).map(([full]) => <option key={full} value={full}>{shownName(namespace, full)}</option>)}
          </optgroup>)}
        </select>}
        {levelTags.length > 0 && <Picker options={levelTags} icon={Plus} label={tr('新的布局', 'New layout')} onPick={create} />}
        {current?.[2] && <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('删除布局', 'Delete the layout')} aria-label={tr('删除布局', 'Delete the layout')} onClick={remove}><Trash2 size={14} aria-hidden="true" /></button>}
      </header>
      {current && <OneLayout key={current[0]} full={current[0]} layout={current[1]} own={current[2]} content={content} namespace={namespace} pending={pending} onEdit={onEdit} onOps={onOps} />}
    </article>
  )
}

/** What a drop target's key says: a place, a new row before a row, or off the map. */
function dropOf(key) {
  const [kind, a, b] = String(key).split(':')
  if (kind === 'slot') return { row: Number(a), slot: Number(b) }
  if (kind === 'gap') return { row: Number(a), new: true }
  return kind === 'off' ? { off: true } : null
}
const dropAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-drop]')?.dataset.drop ?? null

/** One layout's grid. `onRows(rows)` writes the rows elsewhere (a game's override); without it they go to the layout. */
export function OneLayout({ full, layout, own, content, namespace, pending, onEdit, onRows }) {
  const rows = layout.rows ?? []
  const members = layoutMembers(content, layout)
  const placed = new Set(rows.flat())
  const loose = members.filter((id) => !placed.has(id))
  const edges = content.relationEdges?.requires ?? []
  const locked = pending || !own
  const [armed, setArmed] = useState(null)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)
  const drag = useRef(null)
  const dragged = useRef(false)
  const titleOf = (id) => L(content.registries?.level?.[id]?.title)
  const describe = (id) => `${shownName(namespace, id)} ${titleOf(id) ?? ''}`.trim()
  const write = (next) => (onRows ? onRows(next) : onEdit(layoutRowsOp(namespace, full, next)))
  const move = (id, to) => {
    if (locked || !to) return
    const next = to.off ? clearLevel(rows, id) : placeLevel(rows, id, to)
    if (next === rows || (to.off && !placeOf(rows, id))) { setArmed(null); return }
    const bad = layoutRefusal(rows, next, edges)
    if (bad) {
      setNotice(tr(`${describe(bad.from)} 是 ${describe(bad.to)} 的前置，须排在它上面的行。`, `${describe(bad.from)} is a prerequisite of ${describe(bad.to)}: it must be in a row above it.`))
      return
    }
    setNotice('')
    setArmed(null)
    write(next)
  }
  const edit = (next) => { if (!locked && next !== rows) { setNotice(''); write(next) } }

  // Dragged with a mouse or pen; on a touch screen, a level is picked and then its place tapped.
  const grab = (id) => ({
    onPointerDown: (e) => {
      dragged.current = false
      if (!locked && e.button === 0) drag.current = { id, x: e.clientX, y: e.clientY, moved: false }
    },
    onPointerMove: (e) => {
      const d = drag.current
      if (!d) return
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return
        d.moved = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setDragging(d.id)
      }
      setOver(dropAt(e.clientX, e.clientY))
    },
    onPointerUp: (e) => {
      const d = drag.current
      drag.current = null
      if (!d?.moved) return
      dragged.current = true
      setDragging(null)
      setOver(null)
      move(d.id, dropOf(dropAt(e.clientX, e.clientY)))
    },
    onPointerCancel: () => { drag.current = null; setDragging(null); setOver(null) },
  })
  const pick = (id, place) => {
    if (dragged.current) { dragged.current = false; return }
    if (locked) return
    if (armed && armed !== id && place) { move(armed, place); return }
    setNotice('')
    setArmed(armed === id ? null : id)
  }
  const target = (key, to) => ({
    'data-drop': key,
    'data-over': over === key ? '' : undefined,
    onClick: armed && !locked ? (e) => { if (e.target === e.currentTarget) move(armed, to) } : undefined,
  })
  const level = (id, to) => (
    <button key={id} type="button" className={`map-place ${members.includes(id) ? '' : 'is-auto'} ${armed === id ? 'is-on' : ''} ${dragging === id ? 'is-moving' : ''}`}
      title={describe(id)} aria-pressed={armed === id} disabled={pending} {...grab(id)} {...(to && target(`slot:${to.row}:${to.slot}`, to))}
      onClick={() => pick(id, to)}>
      <code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span>
    </button>
  )
  const reach = armed || dragging
  const gap = (row) => reach && !locked
    ? <div className="map-gap is-armed" role="button" tabIndex={0} aria-label={tr('放进新的一行', 'Into a new row')} {...target(`gap:${row}`, { row, new: true })}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); move(armed, { row, new: true }) } }} />
    : <div className="map-gap" />
  return (
    <div className="map-layout layout-editor">
      <div className="arrange-actions">
        <code>{shownName(namespace, layout.of)}</code>
        <span className="object-count">{members.filter((id) => placed.has(id)).length}/{members.length}</span>
        {armed && <>
          <strong>{describe(armed)}</strong>
          {placeOf(rows, armed) && <button type="button" className="kit-btn is-label" disabled={locked} onClick={() => move(armed, { off: true })}>
            <X size={13} aria-hidden="true" />{tr('移出路线图', 'Take off the map')}
          </button>}
        </>}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <div className="map-rows" aria-label={tr('路线图', 'Map')}>
        {gap(0)}
        {rows.map((row, r) => (
          <div key={r} className="map-row-wrap">
            <div className="map-row">
              {row.length < ROW_SLOTS && <div className="map-place is-end" aria-hidden="true" />}
              {row.map((id, slot) => id === null
                ? <div key={`empty-${slot}`} className="map-place is-empty" {...target(`slot:${r}:${slot}`, { row: r, slot })}>
                  {!locked && <button type="button" className="kit-btn editor-tool" title={tr('去掉这个空位', 'Take out this empty place')} aria-label={tr('去掉这个空位', 'Take out this empty place')} onClick={() => edit(removePlace(rows, r, slot))}><X size={12} aria-hidden="true" /></button>}
                </div>
                : level(id, { row: r, slot }))}
              {row.length < ROW_SLOTS && <div className="map-place is-end" {...target(`slot:${r}:${row.length}`, { row: r, slot: row.length })}>
                {!locked && <button type="button" className="kit-btn editor-tool" title={tr('加一个空位', 'Add an empty place')} aria-label={tr('加一个空位', 'Add an empty place')} onClick={() => edit(addPlace(rows, r))}><Plus size={12} aria-hidden="true" /></button>}
              </div>}
            </div>
            {gap(r + 1)}
          </div>
        ))}
        {!locked && <div className="map-row">
          <button type="button" className="kit-btn is-label" onClick={() => edit(addRow(rows))}><Plus size={13} aria-hidden="true" />{tr('加一行', 'Add a row')}</button>
        </div>}
      </div>
      {(loose.length > 0 || reach) && <div className="layout-unplaced" aria-label={tr('未排入', 'Not placed')} {...target('off', { off: true })}>
        {loose.map((id) => level(id, null))}
      </div>}
    </div>
  )
}
