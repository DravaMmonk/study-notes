// The game workspace's chapter board (games/PACKAGES.md 5, 8): one chapter of the course. Its members — single levels
// and whole level tags — are put in and taken out at the top; below, two views of what the packages make of them.
//
// Links: the chapter's levels on the wiring board with the prerequisites the packages' relations give them; a level
// picked can be marked optional or skippable (the course's own lists). Map: the layout the chapter takes from a
// package, row by row, with the levels it leaves out placed by the map's rules (../course.js mapRows).
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { eraLevels, mapRows } from '../course.js'
import { L, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { linkKey, wiringBoard } from './arrangement.js'
import { usePref } from './prefs.js'
import { objectsOf, tagMembers } from './objects-edit.js'

const MODES = [['links', '依赖', 'Links'], ['map', '路线图', 'Map']]
const DEFAULT_LAYOUT = ''

/** `course`: the course as course.json writes it (`chapters`, `optional`, `skippable`); `content`: as it plays. */
export default function ChapterBoard({ content, course, e, at, pending, onSelect, onEdit }) {
  const [mode, setMode] = usePref('chapter-mode', 'links')
  const chapter = course.chapters[e]
  const played = content.eras?.[e]
  const titleOf = (id) => {
    if (id.startsWith('#')) return L(content.registries?.tag?.[id.slice(1)]?.title)
    return L(content.registries?.level?.[id]?.title)
  }
  const describe = (id) => `${id} ${titleOf(id) ?? ''}`.trim()
  const members = chapter.levels ?? []
  const placedIds = useMemo(() => new Set((content.eras ?? []).flatMap(eraLevels)), [content])
  const additions = [
    ...objectsOf(content, 'tag', null).filter(([full, tag]) => tag.kind === 'level' && !members.includes(`#${full}`) && !tagMembers(content, full).some((id) => placedIds.has(id)))
      .map(([full, tag]) => ({ value: `#${full}`, label: `#${full}`, title: tag.title, group: tr('关卡标签', 'Level tags') })),
    ...Object.entries(content.registries?.level ?? {}).filter(([id]) => !placedIds.has(id))
      .map(([id, level]) => ({ value: id, label: id, title: level.title, group: tr('关卡', 'Levels') })),
  ]
  const setMembers = (next) => onEdit({ op: 'game.set', path: ['chapters', e, 'levels'], value: next })
  return (
    <article className="arrange">
      <header className="arrange-bar">
        <nav className="studio-modes" role="tablist" aria-label={tr('视图', 'View')}>
          {MODES.map(([id, zh, en]) => <button key={id} type="button" role="tab" aria-selected={mode === id} className={`studio-tab ${mode === id ? 'is-on' : ''}`} onClick={() => setMode(id)}>{tr(zh, en)}</button>)}
        </nav>
        {additions.length > 0 && <Picker options={additions} label={tr('放进这一章', 'Put in this chapter')} placeholder={tr('放进这一章', 'Put in this chapter')}
          onPick={(value) => !pending && setMembers([...members, value])} />}
      </header>
      <ul className="chapter-members" aria-label={tr('这一章的关', 'The chapter’s levels')}>
        {members.map((id) => (
          <li key={id} className={id.startsWith('#') ? 'is-tag' : ''}>
            <code>{id}</code><span>{titleOf(id)}</span>
            <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('移出这一章', 'Take out of the chapter')}
              onClick={() => setMembers(members.filter((m) => m !== id))}><X size={12} /></button>
          </li>
        ))}
      </ul>
      {played && (mode === 'map'
        ? <ChapterMap content={content} chapter={chapter} played={played} e={e} at={at} pending={pending} titleOf={titleOf} onSelect={onSelect} onEdit={onEdit} />
        : <ChapterLinks content={content} course={course} played={played} e={e} at={at} pending={pending} titleOf={titleOf} describe={describe} onSelect={onSelect} onEdit={onEdit} />)}
    </article>
  )
}

function ChapterLinks({ course, played, e, at, pending, titleOf, describe, onSelect, onEdit }) {
  const ids = useMemo(() => eraLevels(played), [played])
  const links = useMemo(() => (played.links ?? []).filter((link) => !link.fromGame).map((link) => ({ ...link, source: 'course' })), [played])
  const requires = useMemo(() => new Map(ids.map((id) => [id, links.filter(({ to }) => to === id).map(({ from }) => from)])), [ids, links])
  const board = useMemo(() => wiringBoard(ids, [], requires, links), [ids, requires, links])
  const [highlight, setHighlight] = useState(null)
  const selected = ids.includes(at?.level) ? at.level : null
  const wire = links.find((link) => linkKey(link) === highlight)
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
    <div className="arrange-links">
      <div className="arrange-actions">
        {wire ? <strong>{describe(wire.from)} → {describe(wire.to)}</strong>
          : entry ? <>
            <strong>{describe(selected)}</strong>
            <label><input type="checkbox" checked={(course.optional ?? []).includes(selected)} disabled={pending} onChange={(ev) => mark('optional', ev.target.checked)} />{tr('可选', 'Optional')}</label>
            <label><input type="checkbox" checked={(course.skippable ?? []).includes(selected)} disabled={pending} onChange={(ev) => mark('skippable', ev.target.checked)} />{tr('可跳过', 'Skippable')}</label>
          </> : null}
      </div>
      <ArrangementBoard board={board} label={label} describe={describe} active={selected} picked={null} wire={highlight} pending isExternal={() => false}
        onLevel={(id) => { setHighlight(null); onSelect({ era: e, level: id }) }} onWire={(edge) => setHighlight(linkKey(edge))}
        onPick={() => {}} onConnect={() => {}} onCancel={() => setHighlight(null)} />
    </div>
  )
}

function ChapterMap({ content, chapter, played, e, at, pending, titleOf, onSelect, onEdit }) {
  const ids = useMemo(() => eraLevels(played), [played])
  const local = useMemo(() => new Map(ids.map((id) => [id, (played.links ?? []).filter(({ to, fromGame }) => to === id && !fromGame).map(({ from }) => from).filter((from) => ids.includes(from))])), [ids, played])
  const rows = useMemo(() => mapRows(ids, local, played.rows ? { rows: played.rows } : null).rows, [ids, local, played])
  const kept = new Set((played.rows ?? []).flat())
  const layouts = objectsOf(content, 'layout', null)
  return (
    <div className="map-layout">
      <div className="arrange-actions">
        <select className="studio-game" value={chapter.layout ?? DEFAULT_LAYOUT} disabled={pending} aria-label={tr('布局', 'Layout')}
          onChange={(ev) => onEdit(ev.target.value === DEFAULT_LAYOUT ? { op: 'game.unset', path: ['chapters', e, 'layout'] } : { op: 'game.set', path: ['chapters', e, 'layout'], value: ev.target.value })}>
          <option value={DEFAULT_LAYOUT}>{tr('按规则排', 'By the rules')}</option>
          {layouts.map(([full]) => <option key={full} value={full}>{full}</option>)}
        </select>
      </div>
      <div className="map-rows" aria-label={tr('路线图', 'Map')}>
        {rows.map((row, r) => (
          <div key={r} className="map-row-wrap">
            <div className="map-row">
              {row.map((id, slot) => id === null
                ? <div key={`empty-${slot}`} className="map-place is-empty" />
                : <button key={id} type="button" className={`map-place ${kept.has(id) ? '' : 'is-auto'} ${at?.level === id ? 'is-on' : ''}`}
                  title={`${id} ${titleOf(id) ?? ''}`} onClick={() => onSelect({ era: e, level: id })}>
                  <code>{id}</code><span>{titleOf(id)}</span>
                </button>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
