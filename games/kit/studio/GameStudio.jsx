import { objectTypes } from './object-types.js'
import { typeName } from './LeftTypes.jsx'
// The game workspace of the studio (games/DESIGN.md 6.7): where a course designer makes a game on a package and
// arranges its learning route. On the left a list (left-lists.js GAME_LISTS): the game's settings and its chapters, or
// the overrides it sees; in the middle what is picked: a chapter's fields and its board (ChapterBoard.jsx: whole level
// groups and single levels placed, the links between them, the map's layout), the game's settings as rows, the copy
// (the game's own texts, and its own wording over the package's, which the package keeps as it is), the changes, or an
// override's fields before and after; the file of what is picked on the right (Inspector.jsx); the audit under the
// middle. Only
// the game's side of the operation set runs here (useChangeset.js): the course, the game's texts and its overrides.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Hammer, Layers, ListTree, Minus, Package, Plus, Settings2, Trash2 } from 'lucide-react'
import { L, T, getLang, tr } from '../shell/i18n.js'
import { contentVocabulary } from './editors.js'
import { parsePath } from '../engine/ops/edit.js'
import { isText, textEntries } from '../engine/i18n.js'
import { call } from './api.js'
import { placesOf } from './form.js'
import { itemOf } from './worklist.js'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import { textField } from './copy.js'
import { blankChapter, chapterName, chaptersOrder, moveChapter, newChapterName } from './course-edit.js'
import { missingDependencies, packageAddOps, packageRemoveOps } from './game-packages.js'
import { useChangeset } from './useChangeset.js'
import StudioBar from './StudioBar.jsx'
import PanelResizer from './PanelResizer.jsx'
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
const LISTS = { packages: [Package, '包', 'Packages'], chapters: [ListTree, '章节', 'Chapters'], overrides: [Layers, '覆盖', 'Overrides'] }
const SETTLE = 700
const NEW = '\0new'

const remember = (game, at, opened) => {
  const url = new URL(window.location.href)
  url.searchParams.set('game', game)
  url.searchParams.set('space', 'arrange')
  url.searchParams.delete('tab')
  for (const k of ['package', 'scope', 'file', 'level', 'group', 'era', 'glossary', ...Object.values(OBJECT_LISTS)]) url.searchParams.delete(k)
  if (at?.era !== undefined) url.searchParams.set('era', at.era)
  for (const [k, v] of opened) url.searchParams.set(k, v)
  window.history.replaceState(null, '', url)
}

/**
 * `game`: the game arranged; `games`: every game, { id, title, package }; `onMade(id)`: a game was just made;
 * `packages`: every package, { id, uses }; `onBuild(id)` opens a package in the build workspace.
 */
export default function GameStudio({ game, games, onGame, onMade, packages = [], onBuild, space }) {
  const pending = useChangeset(game, SCOPE)
  const { ops, redo, why, setWhy, shown, last, checked, busy, rev, saving, said, fresh, lines, result, edit, addOps, back, again, discard, apply, undo } = pending
  const [domainVocab, setVocab] = useState(null)
  const [rawNames, setRawNames] = useState(null)
  const [at, setAt] = useState(() => (QUERY.get('era') !== null ? { era: Number(QUERY.get('era')) } : { era: 0 }))
  const [drawerTab, setDrawerTab] = usePref('game-drawer-tab', 'audit') // the fold bar's tab (Drawer.jsx)
  const [savedSide, setSide] = usePref('game-side', 'chapters')
  useLayoutEffect(() => { if (OPENED.list) setSide(OPENED.list) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const side = GAME_LISTS.includes(savedSide) ? savedSide : 'chapters'
  const overridesShown = side === 'overrides'
  const packagesShown = side === 'packages'
  const [packageAt, setPackageAt] = useState(null) // the package picked in the packages list
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
  const vocab = useMemo(() => domainVocab && { ...domainVocab, vocabulary: contentVocabulary(domainVocab.vocabulary, content) }, [domainVocab, content])
  // The course as course.json writes it: the forms and the side panel edit it so.
  const course = useMemo(() => content && { ...content, chapters: content.sourceChapters ?? [] }, [content])
  const names = useMemo(() => rawNames && {
    level: new Map(rawNames.levels.map((l) => [l.id, l])),
    part: new Map((rawNames.parts ?? []).map((p) => [p.key, p.name])),
    wiki: new Map((rawNames.entries ?? []).map((e) => [e.id, e.title])),
    quotes: rawNames.quotes,
    onLevel: () => {},
  }, [rawNames])
  const levelOptions = useMemo(() => content?.levels.map((l) => ({ value: l.id, label: l.id, title: l.title })) ?? null, [content])
  const items = useMemo(() => lines.map(itemOf), [lines])
  const places = useMemo(() => placesOf(lines, checked?.order ?? shown?.order ?? []), [lines, checked, shown])

  const layer = `@${game}`
  const events = useMemo(() => visibleOverrides(content, layer), [content, layer])
  const openEvent = overridesShown ? events.find((event) => overrideKey(event) === openOverride) ?? events[0] ?? null : null
  const openedParams = openEvent ? openParams('overrides', { override: overrideKey(openEvent) }) : []
  useEffect(() => remember(game, at, openedParams), [game, at, JSON.stringify(openedParams)]) // eslint-disable-line react-hooks/exhaustive-deps
  // The packages this game plays (game.json `packages`, the layers it loads on) and the one picked in the list.
  const used = content?.layerUses?.[layer] ?? []
  const packageShown = packages.some((p) => p.id === packageAt) ? packageAt : used[0] ?? packages[0]?.id ?? null
  // Package operations are tried on the pending changeset first: the kernel's refusal is said where they were asked.
  const tryOps = async (next) => {
    const r = await call('preview', { game, scope: SCOPE, changeset: { ops: [...ops, ...next] }, check: false }).catch((error) => ({ failed: 0, problems: [error.message] }))
    if (r.failed !== null && r.failed !== undefined) return r.problems?.join('; ') || tr('操作失败')
    addOps(next)
    return null
  }
  const eras = course?.chapters ?? []
  const e = at?.era !== undefined && eras[at.era] ? at.era : null
  // The chapter picked, as the right column edits it: its own file (object-file.js).
  const chapterFile = !at?.game && e !== null ? { object: { kind: 'chapter', full: eras[e].id, namespace: layer, own: true } } : null
  const select = (next) => {
    setSide('chapters')
    setAt(next)
    if (next?.game || next?.era !== at?.era) setField(null)
  }
  const pickField = (path) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setField({ path })
  }
  // A chapter is its own object (course-edit.js); the game's `chapters` list orders them.
  const newChapter = () => {
    const name = newChapterName(eras)
    const { id: _, ...fields } = blankChapter(eras, eras.at(-1) ?? {}, (fields) => retitled(fields))
    addOps([{ op: 'chapter.put', chapter: name, data: fields }, chaptersOrder([...eras, { id: `${layer}/${name}` }])])
    select({ era: eras.length })
  }
  const removeChapter = (k) => {
    if (eras[k].levels.length || eras.length === 1 || !confirmDelete(L(eras[k].title ?? eras[k].chapter?.title) ?? String(eras[k].id))) return
    addOps([chaptersOrder(eras.filter((_, i) => i !== k)), { op: 'chapter.remove', chapter: chapterName(eras[k].id) }])
    select({ era: Math.max(0, k - 1) })
  }
  const shift = (k, by) => {
    edit(chaptersOrder(moveChapter(eras, k, by)))
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
  const sideCtx = vocab && content && { vocabulary: vocab.vocabulary, levels: content.levels.map((l) => l.id), names, levelOptions, textField, lang: getLang(), onSetting: () => {}, onSettings: () => {}, onPart: () => {} }
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
        <div className={`studio-body is-${overridesShown || packagesShown ? 'objects' : 'arrange'} ${layout.treeOpen ? '' : 'no-tree'} ${layout.auditOpen ? '' : 'no-audit'} ${layout.sideOpen ? '' : 'no-side'}`} style={style}>
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
            {packagesShown ? <PackageList packages={packages} used={used} current={packageShown} onOpen={setPackageAt} />
              : overridesShown ? <OverrideList events={events} layer={layer} current={openEvent && overrideKey(openEvent)} onOpen={setOpenOverride} /> : (
            <nav className="tree chapters" aria-label={tr('章节', 'Chapters')}>
              <button type="button" className={`tree-level ${at?.game ? 'is-on' : ''}`} onClick={() => select({ game: true })}>
                <Settings2 size={13} aria-hidden="true" /><span>{L(content.title)}</span>
              </button>
              {eras.map((chapter, k) => (
                <div key={k} className={`chapter-item ${e === k && !at?.game ? 'is-on' : ''}`}>
                  <button type="button" className="tree-level" onClick={() => select({ era: k })}>
                    <code className="tree-level-id">{chapterName(chapter.id)}</code><span>{L(chapter.title ?? chapter.chapter?.title)}</span>
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
              {packagesShown && <PackageCard key={packageShown} id={packageShown} packages={packages} used={used} content={content} pending={busyEditing} onBuild={onBuild} onOps={tryOps} />}
              {overridesShown && <OverrideDetail event={openEvent} layer={layer} pending={busyEditing} onOps={addOps} onOpen={() => setSide('chapters')} />}
              {!overridesShown && !packagesShown && (at?.game || e === null
                ? <article className="editor"><header className="editor-head"><h1>{L(content.title)}</h1></header></article>
                : <>
                  <header className="editor-head chapter-head" onClick={() => pickField([])}>
                    <code className="editor-id is-static">{chapterName(eras[e].id)}</code><h1>{L(eras[e].title ?? eras[e].chapter?.title) ?? ''}</h1>
                  </header>
                  <ChapterBoard content={content} course={course} e={e} at={at} pending={busyEditing} onSelect={select} onEdit={edit} onOps={addOps} />
                </>)}
            </div>
          </main>
          <PanelResizer side="side" size={layout.side} open={layout.sideOpen} {...resizer} />
          <aside className="studio-side">
            {sideCtx && <Inspector content={course} vocab={vocab} at={openEvent ? { override: { event: openEvent, layer } } : chapterFile ?? { game: true }} field={openEvent ? { path: [] } : packagesShown ? null : field ?? (at?.game || e !== null ? { path: [] } : null)} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps} onPick={pickField}
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

/** The packages, those this game plays first. */
function PackageList({ packages, used, current, onOpen }) {
  const listed = [...packages].sort((a, b) => Number(used.includes(b.id)) - Number(used.includes(a.id)) || a.id.localeCompare(b.id))
  return (
    <nav className="parts-list" aria-label={tr('包', 'Packages')}>
      {listed.map(({ id }) => (
        <button key={id} type="button" className={`parts-row is-object ${id === current ? 'is-on' : ''} ${used.includes(id) ? '' : 'is-unused'}`} aria-current={id === current ? 'true' : undefined} onClick={() => onOpen(id)}>
          <i className="family-chip"><Package size={12} aria-hidden="true" /></i>
          <span>{id}</span>
          {used.includes(id) ? <code>{tr('在用', 'In use')}</code> : <i />}
        </button>
      ))}
    </nav>
  )
}

/**
 * A package picked in the list: whether the game plays it (added, with the dependencies it lacks, or taken out:
 * `onOps(ops)` resolves to the kernel's refusal or null), what it loads on, what it holds; open it to build.
 */
function PackageCard({ id, packages, used, content, pending, onBuild, onOps }) {
  const [refusal, setRefusal] = useState(null)
  if (!id) return <article className="arrange" />
  const uses = Object.keys(packages.find((p) => p.id === id)?.uses ?? {})
  const missing = missingDependencies(packages, used, id)
  const run = async (ops) => setRefusal(await onOps(ops))
  const count = (kind) => Object.keys(content?.registries?.[kind] ?? {}).filter((name) => name.startsWith(`${id}/`)).length
  return (
    <article className="editor">
      <header className="editor-head">
        <code className="editor-id is-static">{id}</code>
        <span className="object-kind">{used.includes(id) ? tr('在用', 'In use') : tr('未用', 'Not used')}</span>
        <span className="kit-spacer" />
        {used.includes(id)
          ? <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => run(packageRemoveOps(id))}><Minus size={13} aria-hidden="true" />{tr('不再选用', 'Remove from the game')}</button>
          : <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => run(packageAddOps(packages, used, id))}>
            <Plus size={13} aria-hidden="true" />{missing.length ? tr(`连同 ${missing.join('、')} 一起选用`, `Add with ${missing.join(', ')}`) : tr('选用', 'Add to the game')}
          </button>}
        {onBuild && <button type="button" className="kit-btn is-label" onClick={() => onBuild(id)}><Hammer size={13} aria-hidden="true" />{tr('构建', 'Build')}</button>}
      </header>
      {refusal && <p className="is-error package-refusal" role="alert">{refusal}</p>}
      <dl className="package-facts">
        {uses.length > 0 && <><dt>{tr('依赖', 'Uses')}</dt><dd>{uses.map((u) => <code key={u}>{u}</code>)}</dd></>}
        {used.includes(id) && objectTypes(content).map(info => [info.type, ...typeName(info)]).map(([kind, zh, en]) => (
          <Fragment key={kind}><dt>{tr(zh, en)}</dt><dd>{count(kind)}</dd></Fragment>
        ))}
      </dl>
    </article>
  )
}
