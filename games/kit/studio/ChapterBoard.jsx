// The arrange workspace's chapter board (games/DESIGN.md 2, 6.7): one chapter of the course. Its levels — an ordered
// list, the play order — are imported at the top (a level or a level tag, with what they need), reordered by dragging
// or Alt+↑/↓, and taken out; below, two views of them.
//
// Links: the chapter's levels on the wiring board with the prerequisites the packages' relations give them; a level
// picked can be marked optional or skippable (the course's own lists). Map: the chapter's own `rows` (MapEditor.jsx),
// those the map's rules give (../course.js mapRows) until it has its own.
import { useMemo, useState } from 'react'
import { GripVertical, RotateCcw, Trash2, X } from 'lucide-react'
import { eraLevels, mapRows } from '../course.js'
import { L, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { linkKey, wiringBoard, wiringRefusal } from './arrangement.js'
import { confirmDelete } from './delete.js'
import MapEditor from './MapEditor.jsx'
import { addEdgeOps, removeEdgeOps } from './override-edit.js'
import { usePref } from './prefs.js'
import { objectsOf, tagByRef, tagMembers, tagName } from './objects-edit.js'
import { chapterOrderRefusal, importLevels } from './course-edit.js'
import { reordered } from './tag-order.js'
import { useDragOrder } from './useDragOrder.js'

const MODES = [['links', '依赖', 'Links'], ['map', '路线图', 'Map']]

/** `course`: the course as course.json writes it (`chapters`, `optional`, `skippable`); `content`: as it plays. */
export default function ChapterBoard({ content, course, e, at, pending, onSelect, onEdit, onOps }) {
  const [mode, setMode] = usePref('chapter-mode', 'links')
  const chapter = course.chapters[e]
  const played = content.eras?.[e]
  const titleOf = (id) => {
    if (id.startsWith('#')) return L(tagByRef(content, 'level', id)?.title)
    return L(content.registries?.level?.[id]?.title)
  }
  const describe = (id) => `${id} ${titleOf(id) ?? ''}`.trim()
  const members = chapter.levels ?? []
  const placedIds = useMemo(() => new Set((content.eras ?? []).flatMap(eraLevels)), [content])
  const additions = [
    ...objectsOf(content, 'tag', null).filter(([full, tag]) => tag.kind === 'level' && tagMembers(content, full).some((id) => !placedIds.has(id)))
      .map(([full, tag]) => ({ value: `#${tagName(full)}`, label: `#${tagName(full)}`, title: tag.title, group: tr('关卡标签', 'Level tags') })),
    ...Object.entries(content.registries?.level ?? {}).filter(([id]) => !placedIds.has(id))
      .map(([id, level]) => ({ value: id, label: id, title: level.title, group: tr('关卡', 'Levels') })),
  ]
  const [refusal, setRefusal] = useState(null)
  const setMembers = (next) => {
    setRefusal(null)
    onEdit({ op: 'game.set', path: ['chapters', e, 'levels'], value: next })
  }
  // The chapter's levels are its play order: a move that puts a level before its prerequisite is refused.
  const reorder = (id, to) => {
    const next = reordered(members, [id], to)
    const refused = chapterOrderRefusal(content, next)
    if (refused) setRefusal(refused)
    else setMembers(next)
  }
  const { item } = useDragOrder({ ids: members, disabled: pending, onMove: reorder })
  const importing = (value) => {
    try { setMembers(importLevels(content, members, value, placedIds)) } catch (error) { setRefusal(error.message) }
  }
  return (
    <article className="arrange">
      <header className="arrange-bar">
        <nav className="studio-modes" role="tablist" aria-label={tr('视图', 'View')}>
          {MODES.map(([id, zh, en]) => <button key={id} type="button" role="tab" aria-selected={mode === id} className={`studio-tab ${mode === id ? 'is-on' : ''}`} onClick={() => setMode(id)}>{tr(zh, en)}</button>)}
        </nav>
        {additions.length > 0 && <Picker options={additions} label={tr('放进这一章', 'Put in this chapter')} placeholder={tr('放进这一章', 'Put in this chapter')}
          onPick={(value) => !pending && importing(value)} />}
      </header>
      {refusal && <p className="is-error package-refusal" role="alert">{refusal}</p>}
      <ul className="chapter-members" aria-label={tr('这一章的关', 'The chapter’s levels')}>
        {members.map((id) => (
          <li key={id} className={id.startsWith('#') ? 'is-tag' : ''} {...item(id)} tabIndex={pending ? undefined : 0}>
            <GripVertical size={12} aria-hidden="true" className="member-grip" />
            <code>{id}</code><span>{titleOf(id)}</span>
            <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('移出这一章', 'Take out of the chapter')}
              onClick={() => setMembers(members.filter((m) => m !== id))}><X size={12} /></button>
          </li>
        ))}
      </ul>
      {played && (mode === 'map'
        ? <ChapterMap chapter={chapter} played={played} e={e} at={at} pending={pending} titleOf={titleOf} onSelect={onSelect} onEdit={onEdit} />
        : <ChapterLinks content={content} course={course} played={played} e={e} at={at} pending={pending} titleOf={titleOf} describe={describe} onSelect={onSelect} onEdit={onEdit} onOps={onOps} />)}
    </article>
  )
}

const refusal = (reason) => ({
  self: tr('关卡不能接到自己。', 'A level cannot depend on itself.'),
  duplicate: tr('这条连线已存在。', 'This wire already exists.'),
  cycle: tr('这条连线会形成循环依赖。', 'This wire would create a cycle.'),
  nowhere: tr('包里没有能放这条先修的关系。', 'No package relation can take this prerequisite.'),
  tagged: tr('这条先修来自标签，要在包里改。', 'This prerequisite comes through a tag: change it in the package.'),
})[reason]

function ChapterLinks({ content, course, played, e, at, pending, titleOf, describe, onSelect, onEdit, onOps }) {
  const ids = useMemo(() => eraLevels(played), [played])
  const links = useMemo(() => (played.links ?? []).filter((link) => !link.fromGame).map((link) => ({ ...link, source: 'course' })), [played])
  const requires = useMemo(() => new Map(ids.map((id) => [id, links.filter(({ to }) => to === id).map(({ from }) => from)])), [ids, links])
  const board = useMemo(() => wiringBoard(ids, [], requires, links), [ids, requires, links])
  const [highlight, setHighlight] = useState(null)
  const [armed, setArmed] = useState(null)
  const [notice, setNotice] = useState('')
  const layer = `@${content.id}`
  const selected = ids.includes(at?.level) ? at.level : null
  const wire = links.find((link) => linkKey(link) === highlight)
  const reset = () => { setArmed(null); setHighlight(null); setNotice('') }
  const connect = (from, to) => {
    if (pending) return
    const problem = wiringRefusal(requires, from, to)
    const ops = !problem && addEdgeOps(content, layer, from, to)
    if (!ops) { setNotice(refusal(problem || 'nowhere')); return }
    onOps(ops)
    reset()
    setHighlight(linkKey({ from, to }))
  }
  const removeWire = () => {
    if (!wire || pending) return
    const ops = removeEdgeOps(content, layer, wire.from, wire.to)
    if (!ops) { setNotice(refusal('tagged')); return }
    if (!confirmDelete(`${describe(wire.from)} → ${describe(wire.to)}`)) return
    onOps(ops)
    reset()
  }
  const mark = (list, on) => {
    const now = course[list] ?? []
    const next = on ? [...now, selected] : now.filter((id) => id !== selected)
    onEdit(next.length ? { op: 'game.set', path: [list], value: next } : { op: 'game.unset', path: [list] })
  }
  const entry = played.levels.find(({ id }) => id === selected)
  const label = (id) => {
    const own = played.levels.find((level) => level.id === id)
    return <><code>{id}</code><span>{titleOf(id)}</span>{own?.optional && <small>{tr('可选', 'Optional')}</small>}{own?.skippable && <small>{tr('可跳过', 'Skippable')}</small>}</>
  }
  return (
    <div className="arrange-links" onKeyDown={(event) => {
      if (event.key === 'Delete' && !event.repeat && wire && !event.target.matches('input, textarea, select, [contenteditable]')) {
        event.preventDefault()
        removeWire()
      }
    }}>
      <div className="arrange-actions">
        {wire ? <>
          <strong>{describe(wire.from)} → {describe(wire.to)}</strong>
          <button type="button" className="kit-btn is-label" disabled={pending} onClick={removeWire}><Trash2 size={13} aria-hidden="true" />{tr('断开连线', 'Disconnect')}</button>
        </> : entry ? <>
            <strong>{describe(selected)}</strong>
            <label><input type="checkbox" checked={(course.optional ?? []).includes(selected)} disabled={pending} onChange={(ev) => mark('optional', ev.target.checked)} />{tr('可选', 'Optional')}</label>
            <label><input type="checkbox" checked={(course.skippable ?? []).includes(selected)} disabled={pending} onChange={(ev) => mark('skippable', ev.target.checked)} />{tr('可跳过', 'Skippable')}</label>
          </> : null}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <ArrangementBoard board={board} label={label} describe={describe} active={selected} picked={board.hosted.has(armed) ? armed : null} wire={highlight} pending={pending} isExternal={(id) => !ids.includes(id)}
        onLevel={(id) => { reset(); onSelect({ era: e, level: id }) }} onWire={(edge) => { reset(); setHighlight(linkKey(edge)) }}
        onPick={(id) => { reset(); setArmed(armed === id ? null : id) }} onConnect={connect} onCancel={reset} />
    </div>
  )
}

function ChapterMap({ chapter, played, e, at, pending, titleOf, onSelect, onEdit }) {
  const ids = useMemo(() => eraLevels(played), [played])
  const local = useMemo(() => new Map(ids.map((id) => [id, (played.links ?? []).filter(({ to, fromGame }) => to === id && !fromGame).map(({ from }) => from).filter((from) => ids.includes(from))])), [ids, played])
  const edges = useMemo(() => [...local].flatMap(([to, froms]) => froms.map((from) => ({ from, to }))), [local])
  const ruled = useMemo(() => mapRows(ids, local, null).rows, [ids, local])
  const own = Array.isArray(chapter.rows)
  return (
    <div className="map-layout">
      {own && <div className="arrange-actions">
        <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => onEdit({ op: 'game.unset', path: ['chapters', e, 'rows'] })}>
          <RotateCcw size={13} aria-hidden="true" />{tr('按规则排', 'By the rules')}
        </button>
      </div>}
      <MapEditor rows={own ? chapter.rows : ruled} members={ids} edges={edges} titleOf={titleOf} pending={pending}
        onRows={(rows) => onEdit({ op: 'game.set', path: ['chapters', e, 'rows'], value: rows })}
        onPick={(id) => onSelect({ era: e, level: id })} picked={at?.level} />
    </div>
  )
}
