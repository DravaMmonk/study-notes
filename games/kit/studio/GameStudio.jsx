// The game workspace of the studio (games/DESIGN.md 6.7): where a course designer makes a game on a package and
// arranges its learning route. On the left a list (left-lists.js GAME_LISTS): the game's settings and its chapters, or
// the overrides it sees; in the middle what is picked: a chapter's fields and its board (ChapterBoard.jsx: whole level
// groups and single levels placed, the links between them, the map's layout), the game's settings as rows, the copy
// (the game's own texts, and its own wording over the package's, which the package keeps as it is), the changes, or an
// override's fields before and after; the file of what is picked on the right (Inspector.jsx); the audit under the
// middle. Only
// the game's side of the operation set runs here (useChangeset.js): the course, the game's texts and its overrides.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Layers, ListTree, Plus, Settings2, Trash2 } from 'lucide-react'
import { L, T, getLang, tr } from '../shell/i18n.js'
import { withParts } from '../engine/parts/define.js'
import { parsePath } from '../engine/ops/edit.js'
import { isText, textEntries } from '../engine/i18n.js'
import { call } from './api.js'
import { placesOf } from './form.js'
import { itemOf } from './worklist.js'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import { textField } from './copy.js'
import { blankChapter, moveChapter } from './course-edit.js'
import { useChangeset } from './useChangeset.js'
import StudioBar from './StudioBar.jsx'
import PanelResizer from './PanelResizer.jsx'
import Editor from './Editor.jsx'
import ChapterBoard from './ChapterBoard.jsx'
import { OverrideDetail, OverrideList, visibleOverrides } from './OverrideAudit.jsx'
import { GAME_LISTS, OBJECT_LISTS, openParams, overrideKey, readOpen } from './left-lists.js'
import Review from './Review.jsx'
import Audit, { auditSum } from './Audit.jsx'
import Drawer, { Debug } from './Drawer.jsx'
import Inspector from './Inspector.jsx'

const QUERY = new URLSearchParams(window.location.search)
const SCOPE = 'game'
const OPENED = readOpen(QUERY, GAME_LISTS)
const LISTS = { chapters: [ListTree, '章节', 'Chapters'], overrides: [Layers, '覆盖', 'Overrides'] }
const SETTLE = 700
const NEW = '\0new'

const remember = (game, at, opened) => {
  const url = new URL(window.location.href)
  url.searchParams.set('game', game)
  url.searchParams.set('space', 'arrange')
  url.searchParams.delete('tab')
  for (const k of ['level', 'group', 'era', 'part', 'setting', 'glossary', ...Object.values(OBJECT_LISTS)]) url.searchParams.delete(k)
  if (at?.era !== undefined) url.searchParams.set('era', at.era)
  for (const [k, v] of opened) url.searchParams.set(k, v)
  window.history.replaceState(null, '', url)
}

/** `game`: the game arranged; `games`: every game, { id, title, package }; `onMade(id)`: a game was just made. */
export default function GameStudio({ game, games, onGame, onMade, space }) {
  const pending = useChangeset(game, SCOPE)
  const { ops, redo, why, setWhy, shown, last, checked, base, busy, rev, saving, said, fresh, lines, result, edit, addOps, back, again, discard, apply, undo } = pending
  const [domainVocab, setVocab] = useState(null)
  const [rawNames, setRawNames] = useState(null)
  const [at, setAt] = useState(() => (QUERY.get('era') !== null ? { era: Number(QUERY.get('era')) } : { era: 0 }))
  const [drawerTab, setDrawerTab] = usePref('game-drawer-tab', 'audit') // the fold bar's tab (Drawer.jsx)
  const [savedSide, setSide] = usePref('game-side', 'chapters')
  useLayoutEffect(() => { if (OPENED.list) setSide(OPENED.list) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const side = GAME_LISTS.includes(savedSide) ? savedSide : 'chapters'
  const overridesShown = side === 'overrides'
  const [openOverride, setOpenOverride] = useState(OPENED.open.override ?? null)
  const openDrawer = (next) => {
    setDrawerTab(next)
    setLayout((l) => (l.auditOpen ? l : { ...l, auditOpen: true }))
  }
  const [field, setField] = useState(null)
  const [making, setMaking] = useState(null) // the new game being named: { id, zh, en, problem? }
  const [layout, setLayout] = usePref('game-layout', { tree: 220, audit: 200, side: 360, treeOpen: true, auditOpen: true, sideOpen: true })
  const [resize, setResize] = useState(null)
  useEffect(() => {
    setVocab(null)
    setRawNames(null)
    setField(null)
    call('vocabulary', { game }).then(setVocab)
  }, [game])
  const content = shown?.content ?? null
  const loaded = Boolean(content)
  // Names for the links in the copy, as the changeset leaves the game.
  const namesSeq = useRef(0)
  const naming = useMemo(() => JSON.stringify(ops.filter((op) => op.op !== 'text.override')), [ops])
  useEffect(() => {
    if (!loaded) return undefined
    const no = ++namesSeq.current
    const timer = window.setTimeout(() => call('names', { game, scope: SCOPE, changeset: { ops: JSON.parse(naming) } }).then((r) => no === namesSeq.current && setRawNames(r)).catch(() => {}), naming === '[]' ? 0 : SETTLE)
    return () => window.clearTimeout(timer)
  }, [game, naming, rev, loaded])
  const vocab = useMemo(() => domainVocab && { ...domainVocab, vocabulary: withParts(domainVocab.vocabulary, content?.partDefs) }, [domainVocab, content])
  // The course as course.json writes it: the forms and the side panel edit it so.
  const course = useMemo(() => content && { ...content, chapters: content.sourceChapters ?? [] }, [content])
  const names = useMemo(() => rawNames && {
    level: new Map(rawNames.levels.map((l) => [l.id, l])),
    part: new Map(rawNames.parts.map((p) => [p.key, p.name])),
    wiki: new Map(rawNames.entries.map((e) => [e.id, e.title])),
    quotes: rawNames.quotes,
    onLevel: () => {},
  }, [rawNames])
  const order = useMemo(() => (rawNames ? rawNames.levels.map((l) => l.id) : content?.levels.map((l) => l.id) ?? []), [rawNames, content])
  const levelOptions = useMemo(() => content?.levels.map((l) => ({ value: l.id, label: l.id, title: l.title })) ?? null, [content])
  const items = useMemo(() => lines.map(itemOf), [lines])
  const places = useMemo(() => placesOf(lines, checked?.order ?? shown?.order ?? []), [lines, checked, shown])

  const layer = `@${game}`
  const events = useMemo(() => visibleOverrides(content, layer), [content, layer])
  const openEvent = overridesShown ? events.find((event) => overrideKey(event) === openOverride) ?? events[0] ?? null : null
  const openedParams = openEvent ? openParams('overrides', { override: overrideKey(openEvent) }) : []
  useEffect(() => remember(game, at, openedParams), [game, at, JSON.stringify(openedParams)]) // eslint-disable-line react-hooks/exhaustive-deps
  const eras = course?.chapters ?? []
  const e = at?.era !== undefined && eras[at.era] ? at.era : null
  const select = (next) => {
    setSide('chapters')
    setAt(next)
    if (next?.game || next?.era !== at?.era) setField(null)
  }
  const pickField = (path) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setField({ path })
  }
  const setEras = (value) => edit({ op: 'game.set', path: ['chapters'], value })
  const newChapter = () => {
    setEras([...eras, blankChapter(eras, eras.at(-1) ?? {}, (fields) => retitled(fields))])
    select({ era: eras.length })
  }
  const removeChapter = (k) => {
    if (eras[k].levels.length || eras.length === 1 || !confirmDelete(L(eras[k].title ?? eras[k].chapter?.title) ?? String(eras[k].id))) return
    setEras(eras.filter((_, i) => i !== k))
    select({ era: Math.max(0, k - 1) })
  }
  const shift = (k, by) => {
    setEras(moveChapter(eras, k, by))
    select({ era: k + by })
  }
  const make = async () => {
    const id = making.id.trim()
    if (!/^[a-z][a-z0-9-]*$/.test(id)) return setMaking({ ...making, problem: tr('游戏 id 用小写字母、数字和连字符', 'A game id is lowercase letters, digits and dashes') })
    try {
      await call('create_game', { id, from: game, title: { zh: making.zh.trim() || id, en: making.en.trim() || id } })
      setMaking(null)
      onMade(id)
    } catch (error) {
      setMaking({ ...making, problem: error.message })
    }
  }
  const jumpTo = (item) => {
    const found = /^content: game\.json((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (!found) return
    const path = parsePath(found[1].replace(/^\./, ''))
    if (path[0] === 'chapters' && Number.isInteger(path[1])) select({ era: path[1] })
    else select({ game: true })
    if (path.length) pickField(path)
  }
  const sideCtx = vocab && content && { vocabulary: vocab.vocabulary, levels: content.levels.map((l) => l.id), names, levelOptions, textField, lang: getLang(), onSetting: () => {}, onSettings: () => {}, onPiece: () => {} }
  const shownLayout = resize ? { ...layout, [resize.side]: resize.size } : layout
  const style = { '--tree-w': `${layout.treeOpen ? shownLayout.tree : 0}px`, '--audit-h': `${shownLayout.audit}px`, '--side-w': `${layout.sideOpen ? shownLayout.side : 0}px` }
  const resizer = { setLayout, previewResize: setResize, dragging: resize !== null }
  const ready = content && vocab
  const busyEditing = saving || shown?.ops !== ops
  return (
    <div className={`studio ${resize ? 'is-resizing' : ''}`}>
      <StudioBar space={space} ops={ops} busy={busy} fresh={fresh}>
        {making ? (
          <form className="studio-new-game" onSubmit={(event) => { event.preventDefault(); make() }}>
            <input className="field-input" value={making.id} onChange={(event) => setMaking({ ...making, id: event.target.value, problem: null })} placeholder={tr('游戏 id', 'Game id')} aria-label={tr('游戏 id', 'Game id')} autoFocus spellCheck={false} />
            <input className="field-input" value={making.zh} onChange={(event) => setMaking({ ...making, zh: event.target.value })} placeholder="中文名" aria-label="中文名" />
            <input className="field-input" value={making.en} onChange={(event) => setMaking({ ...making, en: event.target.value })} placeholder="English name" aria-label="English name" />
            <button type="submit" className="kit-btn is-label">{tr('建立', 'Make')}</button>
            <button type="button" className="kit-btn is-label" onClick={() => setMaking(null)}>{tr('取消', 'Cancel')}</button>
            {making.problem && <small className="is-error" role="status">{making.problem}</small>}
          </form>
        ) : (
          <select className="studio-game" value={game} disabled={saving} aria-label={tr('游戏', 'Game')} onChange={(event) => {
            if (event.target.value === NEW) setMaking({ id: '', zh: '', en: '', problem: null })
            else { onGame(event.target.value); select({ era: 0 }) }
          }}>
            {games.map((g) => <option key={g.id} value={g.id}>{L(g.title) ?? g.id}</option>)}
            <option value={NEW}>{tr(`在 ${games.find((g) => g.id === game)?.package} 上新建游戏…`, `New game on ${games.find((g) => g.id === game)?.package}…`)}</option>
          </select>
        )}
      </StudioBar>
      {!ready ? <div className="studio-loading">{tr('读取中……')}</div> : (
        <div className={`studio-body is-${overridesShown ? 'objects' : 'arrange'} ${layout.treeOpen ? '' : 'no-tree'} ${layout.auditOpen ? '' : 'no-audit'} ${layout.sideOpen ? '' : 'no-side'}`} style={style}>
          <aside className="studio-tree">
            <div className="side-tabs" role="tablist" aria-label={tr('列表', 'Lists')}>
              {GAME_LISTS.map((list) => {
                const [Icon, zh, en] = LISTS[list]
                return (
                  <button key={list} type="button" role="tab" aria-selected={side === list} className={side === list ? 'is-on' : ''} aria-label={tr(zh, en)} title={tr(zh, en)} onClick={() => setSide(list)}>
                    <Icon size={14} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            {overridesShown ? <OverrideList events={events} layer={layer} current={openEvent && overrideKey(openEvent)} onOpen={setOpenOverride} /> : (
            <nav className="tree chapters" aria-label={tr('章节', 'Chapters')}>
              <button type="button" className={`tree-level ${at?.game ? 'is-on' : ''}`} onClick={() => select({ game: true })}>
                <Settings2 size={13} aria-hidden="true" /><span>{L(content.title)}</span>
              </button>
              {eras.map((chapter, k) => (
                <div key={k} className={`chapter-item ${e === k && !at?.game ? 'is-on' : ''}`}>
                  <button type="button" className="tree-level" onClick={() => select({ era: k })}>
                    <code className="tree-level-id">{chapter.id}</code><span>{L(chapter.title ?? chapter.chapter?.title)}</span>
                  </button>
                  <span className="chapter-tools">
                    <button type="button" className="kit-btn editor-tool" disabled={busyEditing || k === 0} onClick={() => shift(k, -1)} title={tr('上移', 'Move up')}><ArrowUp size={12} /></button>
                    <button type="button" className="kit-btn editor-tool" disabled={busyEditing || k === eras.length - 1} onClick={() => shift(k, 1)} title={tr('下移', 'Move down')}><ArrowDown size={12} /></button>
                    <button type="button" className="kit-btn editor-tool" disabled={busyEditing || chapter.levels.length > 0 || eras.length === 1} onClick={() => removeChapter(k)} title={tr('删掉这一章（章里没有关卡时）', 'Remove the chapter (when it is empty)')}><Trash2 size={12} /></button>
                  </span>
                </div>
              ))}
              <button type="button" className="kit-btn is-label chapter-add" disabled={busyEditing} onClick={newChapter}><Plus size={13} aria-hidden="true" />{tr('新的一章', 'New chapter')}</button>
            </nav>)}
          </aside>
          <PanelResizer side="tree" size={layout.tree} open={layout.treeOpen} {...resizer} />
          <main className="studio-main">
            <div className="studio-scroll">
              {overridesShown && <OverrideDetail event={openEvent} layer={layer} pending={busyEditing} onOps={addOps} onOpen={() => setSide('chapters')} />}
              {!overridesShown && (at?.game || e === null
                ? <Editor side={SCOPE} content={course} base={base && { ...base, chapters: base.sourceChapters ?? [] }} vocab={vocab} at={null} picked={[]} field={field} places={places} names={names} levelOptions={levelOptions} playOrder={order} onEdit={edit} onOps={addOps} onSelect={() => {}} onPick={pickField} />
                : <>
                  <Editor side={SCOPE} content={course} vocab={vocab} at={{ era: e }} picked={[]} field={field} places={places} names={names} levelOptions={levelOptions} playOrder={order} onEdit={edit} onOps={addOps} onSelect={() => {}} onPick={pickField} />
                  <ChapterBoard content={content} course={course} e={e} at={at} pending={busyEditing} onSelect={select} onEdit={edit} onOps={addOps} />
                </>)}
            </div>
          </main>
          <PanelResizer side="side" size={layout.side} open={layout.sideOpen} {...resizer} />
          <aside className="studio-side">
            {sideCtx && <Inspector content={course} vocab={vocab} at={openEvent ? { override: { event: openEvent, layer } } : { game: true }} field={openEvent ? { path: [] } : field ?? (at?.game ? { path: [] } : e !== null ? { path: ['chapters', e] } : null)} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps} onPick={pickField}
              onLevel={() => {}} onRemoveLevel={() => {}} onRemoveSelection={() => setField(null)}
              tabs={[]} selection={at?.game ? { game: true } : { era: e }} onToggleTab={() => {}} onOpenTab={() => {}} onCloseTab={() => {}}
              onNavigate={(path) => pickField(path)} />}
          </aside>
          {layout.auditOpen && <PanelResizer side="audit" size={layout.audit} open {...resizer} />}
          <aside className="studio-audit">
            <Drawer open={layout.auditOpen} tab={drawerTab} onTab={openDrawer} onToggle={() => setLayout((l) => ({ ...l, auditOpen: !l.auditOpen }))} sum={auditSum(items, last)} fresh={fresh} ops={ops}
              tabs={['audit', 'changes', 'debug']}
              audit={<Audit items={items} fresh={fresh} last={last} at={null} busy={busy} open={layout.auditOpen && drawerTab === 'audit'} onOpen={() => openDrawer('audit')} onJump={jumpTo} />}
              panel={drawerTab === 'changes' ? <Review ops={ops} redo={redo} result={result} shown={shown} why={why} setWhy={setWhy} said={said}
                onRemove={(k) => { if (confirmDelete(ops[k].op)) pending.remove(k) }} onBack={back} onRedo={again}
                onDiscard={discard} onOpen={pending.open} onApply={apply} onUndo={undo} onSelect={() => {}} />
                : <Debug ops={ops} last={last} />} />
          </aside>
        </div>
      )}
    </div>
  )
}

/** A chapter's own fields copied for a new one: its title "New chapter", its other texts empty, the rest as they were. */
function retitled(value, key = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  if (isText(value)) return key === 'title' ? T('新的一章', 'New chapter') : Object.fromEntries(textEntries(value).map(([lang]) => [lang, '']))
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, retitled(v, k)]))
}
