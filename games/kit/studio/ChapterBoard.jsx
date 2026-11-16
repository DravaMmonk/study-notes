// The game workspace's chapter board (games/DESIGN.md 2, 2.6, 6.7): one chapter of the course, in two views.
//
// Links: the chapter's entries, single levels and whole level groups, as cards on a wiring board; a wire dragged from
// one's output to another's input is a prerequisite (a group is one card: a link to it opens its entry levels, one
// from it waits for its exits). Entries and games elsewhere come in as ports at the board's edge. Prerequisites the
// checks infer from knowledge and reference answers show dashed, and can be kept as explicit ones.
//
// Map: the chapter's map as the game draws it, row by row, every level at its place (../course.js mapRows): dragged to
// another place or a row of its own, empty places put in and taken out, the whole layout cleared back to the map's
// rules. Any change writes every row (`rows`), so the layout stays as it is when levels are added later.
import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { eraLevels, mapRows } from '../course.js'
import { courseLayout } from '../engine/course-dependencies.js'
import { groupLevels } from '../engine/groups.js'
import { L, tr } from '../shell/i18n.js'
import { call } from './api.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { externalPort, linkKey, projectWires, wiringBoard, wiringRefusal } from './arrangement.js'
import { addEntry, emptyPlace, entryKey, moveEntry, moveOnMap, placed, removeEntry } from './course-edit.js'
import { confirmDelete } from './delete.js'
import { usePref } from './prefs.js'

const refusal = (reason) => ({
  self: tr('关卡不能接到自己。', 'A level cannot depend on itself.'),
  duplicate: tr('这条连线已存在。', 'This wire already exists.'),
  cycle: tr('这条连线会形成循环依赖。', 'This wire would create a cycle.'),
})[reason]
const MODES = [['links', '依赖', 'Links'], ['map', '路线图', 'Map']]

export default function ChapterBoard({ content, e, at, pending, onSelect, onEdit }) {
  const [mode, setMode] = usePref('chapter-mode', 'links')
  const eras = content.sourceEras
  const era = eras[e]
  const { groups } = content
  const titleOf = (id) => L(content.levels.find((level) => level.id === id)?.title)
  const taken = useMemo(() => placed(eras, groups), [eras, groups])
  const additions = [
    ...Object.entries(groups).filter(([id]) => !taken.groups.has(id) && !groupLevels(groups[id]).some((level) => taken.levels.has(level)))
      .map(([id, group]) => ({ value: `group:${id}`, label: id, title: group.title, group: tr('关卡组', 'Level groups') })),
    ...content.levels.filter(({ id }) => !taken.levels.has(id)).map(({ id, title }) => ({ value: id, label: id, title, group: tr('关卡', 'Levels') })),
  ]
  const add = (value) => onEdit({ op: 'game.set', path: ['eras'], value: addEntry(eras, e, value.startsWith('group:') ? { group: value.slice('group:'.length) } : { id: value }) })
  return (
    <article className="arrange">
      <header className="arrange-bar">
        <nav className="studio-modes" role="tablist" aria-label={tr('视图', 'View')}>
          {MODES.map(([id, zh, en]) => <button key={id} type="button" role="tab" aria-selected={mode === id} className={`studio-tab ${mode === id ? 'is-on' : ''}`} onClick={() => setMode(id)}>{tr(zh, en)}</button>)}
        </nav>
        {additions.length > 0 && <Picker options={additions} label={tr('加入章节', 'Add to the chapter')} placeholder={tr('加入关卡或关卡组', 'Add a level or a group')} onPick={add} />}
      </header>
      {mode === 'map'
        ? <MapLayout content={content} e={e} at={at} pending={pending} titleOf={titleOf} onSelect={onSelect} onEdit={onEdit} />
        : <Links content={content} e={e} era={era} at={at} pending={pending} titleOf={titleOf} onSelect={onSelect} onEdit={onEdit} />}
    </article>
  )
}

function Links({ content, e, era, at, pending, titleOf, onSelect, onEdit }) {
  const eras = content.sourceEras
  const { groups } = content
  // The entry a level is placed by: its group when the whole group is, else itself.
  const entryOf = useMemo(() => {
    const map = new Map()
    for (const chapter of eras) for (const entry of chapter.levels) {
      if (entry.group === undefined) map.set(entry.id, entry.id)
      else for (const level of groupLevels(groups[entry.group])) map.set(level, entry.group)
    }
    return map
  }, [eras, groups])
  const chapterOf = useMemo(() => new Map(eras.flatMap((chapter, k) => chapter.levels.map((entry) => [entryKey(entry), k]))), [eras])
  const [catalog, setCatalog] = useState([])
  useEffect(() => {
    let live = true
    call('course_catalog', { game: content.id }).then((r) => { if (live) setCatalog(r) }, () => {})
    return () => { live = false }
  }, [content.id])
  const external = useMemo(() => new Map(catalog.flatMap(({ game, title, levels }) =>
    levels.map(({ id, title: name }) => [externalPort(game, id), { title: name, group: L(title) ?? game }]))), [catalog])
  // Every link at the level of entries: the course's own, and the ones the checks infer, between entries of the course.
  const links = useMemo(() => {
    const own = eras.flatMap((chapter) => (chapter.links ?? []).map((link) => ({ ...link, source: 'course' })))
    const derived = courseLayout(content).dependencyLinks.filter(({ source }) => source !== 'course').flatMap((link) => {
      const from = link.fromGame ? link.from : entryOf.get(link.from)
      const to = entryOf.get(link.to)
      return from && to && from !== to ? [{ ...link, from, to }] : []
    })
    return projectWires([...own, ...derived])
  }, [content, eras, entryOf])
  const keys = era.levels.map(entryKey)
  const requires = useMemo(() => {
    const map = new Map([...chapterOf.keys()].map((key) => [key, []]))
    for (const { from, to } of links) map.get(to)?.push(from)
    return map
  }, [chapterOf, links])
  const [pins, setPins] = useState([])
  const board = useMemo(() => wiringBoard(keys, pins, requires, links), [keys, pins, requires, links])
  const [armed, setArmed] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [notice, setNotice] = useState('')
  const selected = keys.includes(at?.entry) ? at.entry : null
  const entry = selected && era.levels.find((x) => entryKey(x) === selected)
  const wire = board.edges.find((edge) => linkKey(edge) === highlight)
  const describe = (key) => {
    if (Object.hasOwn(groups, key)) return `${key} ${L(groups[key].title) ?? ''}`.trim()
    const title = titleOf(key) ?? L(external.get(key)?.title)
    return title ? `${key} ${title}` : key
  }
  const label = (key) => {
    const own = eras[chapterOf.get(key)]?.levels.find((x) => entryKey(x) === key)
    const group = Object.hasOwn(groups, key) ? groups[key] : null
    return <>
      {group ? <Layers size={13} aria-hidden="true" /> : null}
      <code>{key}</code><span>{group ? L(group.title) : titleOf(key) ?? L(external.get(key)?.title)}</span>
      {group && <small>{group.levels.length}</small>}
      {own?.optional && <small>{tr('可选', 'Optional')}</small>}{own?.skippable && <small>{tr('可跳过', 'Skippable')}</small>}
    </>
  }
  const reset = () => { setArmed(null); setHighlight(null); setNotice('') }
  const linksIn = (k) => eras[k].links ?? []
  const setLinksIn = (k, next) => onEdit(next.length ? { op: 'game.set', path: ['eras', k, 'links'], value: next } : { op: 'game.unset', path: ['eras', k, 'links'] })
  const sameLink = (a, b) => linkKey({ from: a.fromGame ? externalPort(a.fromGame, a.from) : a.from, to: a.to }) === linkKey(b)
  const updateLink = (edge, value) => {
    const k = chapterOf.get(edge.to)
    const old = linksIn(k)
    const next = old.some((item) => sameLink(item, edge)) ? old.flatMap((item) => (sameLink(item, edge) ? (value ? [value] : []) : [item])) : [...old, value]
    setLinksIn(k, next)
  }
  const connect = (from, to) => {
    if (pending || !chapterOf.has(to)) return
    const problem = wiringRefusal(requires, from, to)
    if (problem) { setNotice(refusal(problem)); return }
    const split = from.indexOf(':')
    updateLink({ from, to }, split < 0 ? { from, to } : { fromGame: from.slice(0, split), from: from.slice(split + 1), to })
    reset()
    setHighlight(linkKey({ from, to }))
  }
  const removeWire = () => {
    if (wire?.source !== 'course' || pending || !confirmDelete(`${wire.from} → ${wire.to}`)) return
    updateLink(wire, null)
    reset()
  }
  const keep = (edge) => updateLink(edge, { from: edge.fromLevel ?? edge.from, to: edge.to, ...(edge.fromGame && { fromGame: edge.fromGame }), ...(edge.required && { required: true }) })
  const tag = (key, checked) => {
    const k = era.levels.findIndex((x) => entryKey(x) === selected)
    onEdit(checked ? { op: 'game.set', path: ['eras', e, 'levels', k, key], value: true } : { op: 'game.unset', path: ['eras', e, 'levels', k, key] })
  }
  const reasons = wire?.causes.filter(({ source }) => source !== 'course').map(({ source, detail }) => {
    const said = source === 'knowledge' ? tr('知识前置', 'Knowledge prerequisite') : tr('由参考解推导', 'Inferred from reference')
    return detail ? `${said} · ${detail}` : said
  }) ?? []
  const ports = [
    ...[...chapterOf.keys()].map((key) => ({ value: key, label: key, title: Object.hasOwn(groups, key) ? groups[key].title : content.levels.find((l) => l.id === key)?.title })),
    ...[...external].map(([value, { title, group }]) => ({ value, label: value, title, group })),
  ].filter(({ value }) => !board.hosted.has(value))
  const isPort = (key) => !keys.includes(key)
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
          {reasons.length > 0 && <span>{reasons.join(' / ')}</span>}
          {wire.source === 'course' && reasons.length === 0 && eras[chapterOf.get(wire.from)]?.levels.find((x) => entryKey(x) === wire.from)?.skippable && <label>
            <input type="checkbox" checked={wire.required ?? false} disabled={pending} onChange={(event) => updateLink(wire, { from: wire.from, to: wire.to, ...(event.target.checked && { required: true }) })} />
            {tr('须通过这个前置', 'Require a pass on this prerequisite')}
          </label>}
          {wire.source === 'course'
            ? <button type="button" className="kit-btn is-label" disabled={pending} onClick={removeWire}><Trash2 size={13} aria-hidden="true" />{tr('断开连线', 'Disconnect')}</button>
            : <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => keep(wire)}>{tr('保存为显式前置', 'Keep as explicit prerequisite')}</button>}
        </> : entry ? <>
          <strong>{describe(selected)}</strong>
          <label><input type="checkbox" checked={entry.optional ?? false} disabled={pending} onChange={(event) => tag('optional', event.target.checked)} />{tr('可选', 'Optional')}</label>
          {entry.group === undefined && <label><input type="checkbox" checked={entry.skippable ?? false} disabled={pending} onChange={(event) => tag('skippable', event.target.checked)} />{tr('可跳过', 'Skippable')}</label>}
          <select className="studio-game" value={e} disabled={pending} aria-label={tr('移到章节', 'Move to chapter')}
            onChange={(event) => onEdit({ op: 'game.set', path: ['eras'], value: moveEntry(eras, selected, Number(event.target.value), groups) })}>
            {eras.map((chapter, k) => <option key={k} value={k}>{L(chapter.title ?? chapter.chapter?.title) ?? chapter.id}</option>)}
          </select>
          <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => {
            if (!confirmDelete(describe(selected))) return
            onEdit({ op: 'game.set', path: ['eras'], value: removeEntry(eras, selected, groups) })
            onSelect({ era: e })
          }}><X size={13} aria-hidden="true" />{tr('移出课程', 'Take out of the course')}</button>
        </> : null}
        {ports.length > 0 && <Picker options={ports} label={tr('添加外部端口', 'Add external ports')} placeholder={tr('外部端口', 'External ports')} onPick={(key) => setPins([...pins, key])} />}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <ArrangementBoard key={e} board={board} label={label} describe={describe} active={selected}
        portal={(key) => (key.includes(':') ? L(external.get(key)?.group) ?? key.split(':')[0] : L(eras[chapterOf.get(key)]?.title ?? eras[chapterOf.get(key)]?.chapter?.title) ?? String(eras[chapterOf.get(key)]?.id))} picked={board.hosted.has(armed) ? armed : null} wire={highlight} pending={pending} isExternal={(key) => key.includes(':')}
        onLevel={(key) => { reset(); if (isPort(key)) setArmed(key); else onSelect({ era: e, entry: key }) }}
        onWire={(edge) => { reset(); setHighlight(linkKey(edge)) }}
        onPick={(key) => { reset(); setArmed(armed === key ? null : key) }} onConnect={connect} onCancel={reset} />
    </div>
  )
}

function MapLayout({ content, e, at, pending, titleOf, onSelect, onEdit }) {
  const played = content.eras[e]
  const saved = content.sourceEras[e].rows
  const { requires } = useMemo(() => courseLayout(content), [content])
  const ids = useMemo(() => eraLevels(played), [played])
  const local = useMemo(() => new Map(ids.map((id) => [id, (requires.get(id) ?? []).filter((from) => ids.includes(from))])), [ids, requires])
  const rows = useMemo(() => mapRows(ids, local, saved ?? []).rows, [ids, local, saved])
  const kept = new Set((saved ?? []).flat())
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const write = (next) => onEdit({ op: 'game.set', path: ['eras', e, 'rows'], value: next })
  const drop = (to) => {
    setOver(null)
    if (drag === null || pending) return
    const next = moveOnMap(rows, drag, to)
    setDrag(null)
    if (next !== rows) write(next)
  }
  const target = (key, to) => ({
    'data-over': over === key ? '' : undefined,
    onDragOver: (event) => { if (drag !== null) { event.preventDefault(); setOver(key) } },
    onDragLeave: () => setOver(null),
    onDrop: (event) => { event.preventDefault(); drop(to) },
  })
  const gap = (row) => <div className="map-gap" {...target(`gap:${row}`, { row, new: true })} />
  return (
    <div className="map-layout">
      <div className="arrange-actions">
        {saved && <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => onEdit({ op: 'game.unset', path: ['eras', e, 'rows'] })}>
          <RotateCcw size={13} aria-hidden="true" />{tr('按规则重新排', 'Lay out by the rules')}
        </button>}
      </div>
      <div className="map-rows" aria-label={tr('路线图', 'Map')}>
        {gap(0)}
        {rows.map((row, r) => (
          <div key={r} className="map-row-wrap">
            <div className="map-row">
              {row.length < 3 && <div className="map-place is-end" aria-hidden="true" />}
              {row.map((id, slot) => id === null
                ? <div key={`empty-${slot}`} className="map-place is-empty" {...target(`${r}:${slot}`, { row: r, slot })}>
                  <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('去掉这个空位', 'Take out this empty place')} onClick={() => write(emptyPlace(rows, r, slot))}><X size={12} /></button>
                </div>
                : <button key={id} type="button" draggable={!pending} className={`map-place ${kept.has(id) ? '' : 'is-auto'} ${at?.level === id ? 'is-on' : ''} ${drag === id ? 'is-moving' : ''}`}
                  title={`${id} ${titleOf(id) ?? ''}`} onClick={() => onSelect({ era: e, level: id })}
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', id); event.dataTransfer.effectAllowed = 'move'; window.setTimeout(() => setDrag(id)) }}
                  onDragEnd={() => { setDrag(null); setOver(null) }} {...target(`${r}:${slot}`, { row: r, slot })}>
                  <code>{id}</code><span>{titleOf(id)}</span>
                </button>)}
              {row.length < 3 && <div className="map-place is-end" {...target(`${r}:end`, { row: r, slot: row.length })}>
                <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('加一个空位', 'Add an empty place')} onClick={() => write(emptyPlace(rows, r))}><Plus size={12} /></button>
              </div>}
            </div>
            {gap(r + 1)}
          </div>
        ))}
      </div>
    </div>
  )
}
