// The package workspace of the studio (games/DESIGN.md 6.7, DIRECTION decision 5): where a level designer reviews, edits
// and plays a package's levels without code, a level group at a time. It is a thin skin over the operation set (the
// package's side of it, useChangeset.js): the tree, the forms, the copy table, the comparisons, the game played, the
// audit and the review all show the one answer the preview tool gives; search and replace and bulk edits only ever add
// operations to it. The package's levels are played in a game that plays the package, as its course sets them up; how
// a game arranges them is the game workspace's (GameStudio.jsx).
//
// The page (games/DESIGN.md 6.7): lists on the left, one at a time (left-lists.js) — the levels, the parts and the
// encyclopedia's entries, each grouped by the tags, relations, trays or sections that gather them (list-groups.js),
// the kernel's capabilities, the overrides, search; in the middle what is picked: the level as the game shows it, which
// is where it is edited (GameFrame.jsx: a click on a field on screen picks it, a + adds an item), a part with its
// stages (StageChain.jsx), several levels at once, a group's own object in its editor (a tag, a relation, a tray, a
// section), a capability, an override; the file of what is picked on the right (Inspector.jsx), the field picked in it
// with its control; the helpers in a fold bar under the middle. Each folds away and resizes (remembered per viewer,
// prefs.js); the command palette (Ctrl/⌘+K) reaches every place and action, ? lists the keys.
import './studio.css'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Cpu, Layers, ListTree, Search as SearchIcon, Shapes } from 'lucide-react'
import { L, T, getLang, tr } from '../shell/i18n.js'
import { useWorkspaceKeys } from '../shell/useOverlay.js'
import { find, shapeAt } from '../engine/schema.js'
import { getAt, parsePath, showPath } from '../engine/ops/edit.js'
import { call } from './api.js'
import { blank, copyLevelData, creationChoices, placesOf, referenceFor } from './form.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { findTask, tasksSchema } from '../engine/tasks.js'
import { addFor, markOf, markPath } from './marks.js'
import { withParts } from '../engine/parts/define.js'
import { DEFAULT_VIEWS } from '../shell/parts/PartFace.jsx'
import PartsList, { freeName } from './PartsList.jsx'
import { itemOf } from './worklist.js'
import { paletteIndex } from './palette.js'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import PanelResizer from './PanelResizer.jsx'
import Tree from './Tree.jsx'
import Search from './Search.jsx'
import Editor from './Editor.jsx'
import Compare from './Compare.jsx'
import Audit, { auditSum } from './Audit.jsx'
import Drawer, { Debug } from './Drawer.jsx'
import Review from './Review.jsx'
import GameFrame from './GameFrame.jsx'
import { packageLevel } from '../engine/package-play.js'
import Flow, { levelLabel } from './Flow.jsx'
import StudioBar from './StudioBar.jsx'
import { useChangeset } from './useChangeset.js'
import { OverrideDetail, OverrideList, visibleOverrides } from './OverrideAudit.jsx'
import ObjectLinks from './ObjectLinks.jsx'
import { CapabilityList, CapabilityView, currentCapability } from './CapabilityBrowser.jsx'
import { EntryList } from './ObjectLists.jsx'
import GroupedList from './GroupedList.jsx'
import { GROUPINGS } from './list-groups.js'
import { TrayEditor, SectionEditor } from './GatherEditor.jsx'
import SymbolEditor from './SymbolEditor.jsx'
import StageChain from './StageChain.jsx'
import TagEditor from './TagEditor.jsx'
import RelationBoard from './RelationBoard.jsx'
import { HEADING_KINDS, OBJECT_LISTS, PACKAGE_LISTS, capabilityKey, isObjectList, listOfHeading, openParams, overrideKey, readHeading, readOpen } from './left-lists.js'
import { freeObjectName, namespaceOf, ownNames, shownName } from './objects-edit.js'
import { newTag } from './tag-edit.js'
import { objectFileName, objectValue, ownObjectData } from './object-file.js'
import { groupOf, levelTags, treeMoves } from './groups.js'
import { memberOrderOps, tagMoveOps } from './tag-order.js'
import Inspector from './Inspector.jsx'
import { inspectorTabKey } from './InspectorTabs.jsx'
import { textField } from './copy.js'
import Palette from './Palette.jsx'
import Shortcuts, { MOD } from './Shortcuts.jsx'

const QUERY = new URLSearchParams(window.location.search)
const SAVED_VIEW = window.history.state?.studio
const OPENED = readOpen(QUERY)
// The left column's switcher (left-lists.js PACKAGE_LISTS): each list's icon and name.
const LISTS = {
  tree: [ListTree, '关卡', 'Levels'], parts: [Shapes, '元件', 'Parts'], symbols: [Shapes, '符号', 'Symbols'], entries: [BookOpen, '词条', 'Entries'],
  kernel: [Cpu, '能力', 'Capabilities'], overrides: [Layers, '覆盖', 'Overrides'], search: [SearchIcon, '搜索', 'Search'],
}
// The kind of object each build list holds, and the relations a new group of it can be.
const LIST_KIND = { tree: 'level', parts: 'part', symbols: 'symbol', entries: 'entry' }
const RELATION_KINDS = { symbol: [['order', '顺序', 'Order']], level: [['requires', '先修', 'Requires'], ['order', '顺序', 'Order']], part: [['replaces', '取代', 'Replaces'], ['order', '顺序', 'Order']], entry: [['order', '顺序', 'Order']] }
const HEADING = readHeading(QUERY)
const SETTLE = 700 // ms after the last edit before the names are asked again
const SCOPE = 'package'

const partPath = (at) => at?.part !== undefined ? ['parts', at.part] : null
const selectionPath = (at) => partPath(at) ?? (at ? [] : null)

/** Keep the selection in the address and the editor details in the same history entry. */
const remember = (pkg, at, field, playLevel, task, opened, heading) => {
  const url = new URL(window.location.href)
  url.searchParams.set('package', pkg)
  url.searchParams.set('space', 'build')
  for (const k of ['game', 'scope', 'file', 'level', 'group', 'era', 'part', 'glossary', ...Object.values(OBJECT_LISTS), ...HEADING_KINDS]) url.searchParams.delete(k)
  for (const [k, v] of opened) url.searchParams.set(k, v)
  if (heading && at?.group === undefined) url.searchParams.set(heading.kind, heading.full)
  if (at?.level) url.searchParams.set('level', at.level)
  if (at?.group !== undefined) url.searchParams.set('group', at.group)
  if (at?.part !== undefined) url.searchParams.set('part', at.part)
  if (at?.glossary) url.searchParams.set('glossary', '1')
  url.searchParams.delete('tab')
  const inspector = field?.path ? { path: field.path, ...(field.trail && { trail: field.trail }) } : field?.missing ? { missing: field.missing } : null
  window.history.replaceState({ studio: { inspector, playLevel, task, gameRoot: Boolean(at?.game) } }, '', url)
}
const editable = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
const paletteKey = (event) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

/**
 * The package workspace, opened on one package (games/DESIGN.md 6.1, 6.7): `pkg` its id; `packages` every package,
 * { id, uses }; `onPackage` opens another; `space` the workspace switch. The levels play in the course the kernel
 * makes for the package.
 */
export default function PackageStudio({ pkg, packages, onPackage, space }) {
  const game = pkg // the key the workspace's preferences and history are kept under
  const target = useMemo(() => ({ package: pkg }), [pkg])
  const [domainVocab, setVocab] = useState(null) // the domain's vocabulary; `vocab` below adds the game's parts
  const pending = useChangeset(target, SCOPE)
  const namespace = pkg
  const [opened, setOpened] = useState(OPENED.open) // what each object list has open: { capability, override }
  const [headingState, setHeading] = useState(HEADING) // a group's own object open in the middle: { kind, full }
  const [partStage, setPartStage] = useState(null) // the stage of the part shown that the page previews
  const [levelsBy, setLevelsBy] = usePref('level-by', 'tag')
  const [partsBy, setPartsBy] = usePref('part-by', 'tag')
  const [entriesBy, setEntriesBy] = usePref('entry-by', 'tag')
  const [objectField, setObjectField] = useState(null) // the field of the object open shown on the right: { of, path }
  const { ops, redo, why, setWhy, shown, last, checked, base, busy, rev, saving, said, savingRef, changeset, key, fresh, lines, result, edit, addOps, back, again, discard, apply, undo } = pending
  const [rawNames, setRawNames] = useState(null)
  const [at, setAt] = useState(() => (QUERY.get('level') ? { level: QUERY.get('level') } : QUERY.get('group') ? { group: QUERY.get('group') } : QUERY.get('part') ? { part: QUERY.get('part') } : QUERY.get('glossary') ? { glossary: true } : SAVED_VIEW?.gameRoot ? { game: true } : null))
  const [picked, setPicked] = useState(() => new Set(at?.level ? [at.level] : []))
  const [drawerTab, setDrawerTab] = usePref('drawer-tab', 'audit') // the fold bar's tab (Drawer.jsx)
  const [play, setPlay] = useState(() => {
    const level = SAVED_VIEW?.playLevel ?? at?.level
    return level ? { level, seed: null, take: null } : null
  }) // { level, seed, take }
  const [field, setField] = useState(() => {
    if (SAVED_VIEW) return SAVED_VIEW.inspector
    const path = selectionPath(at)
    return path ? { path } : null
  }) // the field in the side panel: { path, focus? } | { missing } | null
  const [pageEdit, setPageEdit] = usePref('page-edit', true) // the page as the editor, or the game alone
  const [pageTask, setPageTask] = useState(() => SAVED_VIEW?.task ?? 0) // the task the page plays
  const [go, setGo] = useState(null) // a task for the page to go to: { task }
  const [moving, setMoving] = useState(null) // the levels being moved in the tree
  const [layout, setLayout] = usePref('layout', { tree: 240, audit: 220, side: 380, treeOpen: true, auditOpen: true, sideOpen: true })
  const [resize, setResize] = useState(null)
  const [savedSide, setSide] = usePref('side', 'tree')
  // The list the address names wins over the one last shown.
  useLayoutEffect(() => { if (HEADING?.kind === 'symbol') setSide('symbols'); else if (OPENED.list) setSide(OPENED.list) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPartStage(null), [at?.part])
  const side = PACKAGE_LISTS.includes(savedSide) ? savedSide : 'tree'
  const objectList = isObjectList(side)
  // The level list last shown, which a level picked elsewhere goes back to.
  const [levelList, setLevelList] = usePref('level-side', 'tree')
  const showList = (list) => {
    if (!isObjectList(list)) setLevelList(list)
    setSide(list)
  }
  const leaveObjects = () => setSide((s) => (isObjectList(s) ? levelList : s))
  /** The fold bar opened on a tab. */
  const openDrawer = (next) => {
    setDrawerTab(next)
    setLayout((l) => (l.auditOpen ? l : { ...l, auditOpen: true }))
  }
  const [savedInspectorTabs, setInspectorTabs] = usePref('inspector-tabs', {})
  const inspectorTabs = savedInspectorTabs[game] ?? []
  const [overlay, setOverlay] = useState(null) // 'palette' | 'keys'
  const overlayOrigin = useRef(null)
  const openOverlay = (name) => {
    overlayOrigin.current ??= document.activeElement
    setOverlay(name)
  }
  const closeOverlay = () => {
    setOverlay(null)
    overlayOrigin.current?.focus({ preventScroll: true })
    overlayOrigin.current = null
  }
  const [lang, setLang] = useState(getLang)

  useEffect(() => {
    const onLang = () => setLang(getLang())
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [])
  const playId = play?.level

  // A game opened: its vocabulary.
  useEffect(() => {
    setVocab(null)
    setRawNames(null)
    call('vocabulary', target).then(setVocab)
  }, [game])
  const playRequest = useRef(null)
  useLayoutEffect(() => {
    playRequest.current = null
  }, [at, key, pageTask, go])
  const loaded = Boolean(shown)

  // What links show (names), as the changeset leaves the game, once edits settle: asked again only when an operation
  // may change one (a level's id, place or title, game.json, the encyclopedia).
  const namesSeq = useRef(0)
  const naming = useMemo(() => JSON.stringify(ops.filter((op) => !['text.set', 'level.set', 'level.unset', 'level.blueprint'].includes(op.op) || String(op.path).startsWith('title') || op.in)), [ops])
  useEffect(() => {
    if (!loaded) return undefined
    const no = ++namesSeq.current
    const timer = window.setTimeout(() => call('names', { ...target, scope: SCOPE, changeset: { ops: JSON.parse(naming) } }).then((r) => no === namesSeq.current && setRawNames({ ...r, stamp: no })).catch(() => {}), naming === '[]' ? 0 : SETTLE)
    return () => window.clearTimeout(timer)
  }, [game, naming, rev, loaded])

  const content = shown?.content ?? null
  const playContent = useMemo(() => content?.levels.some(level => level.id === play?.level) ? packageLevel(content, play.level) : null, [content, play?.level])
  // A part's page needs a game around it: the level played, else the package's first level.
  const pageContent = useMemo(() => playContent ?? (at?.part !== undefined && content?.levels[0] ? packageLevel(content, content.levels[0].id) : null), [playContent, at?.part, content])
  // A domain that defines its parts as data names them by the game's parts/<name>.json as the changeset leaves it.
  const vocab = useMemo(() => domainVocab && { ...domainVocab, vocabulary: withParts(domainVocab.vocabulary, content?.partDefs) }, [domainVocab, content])
  const partRoot = partPath(at)
  const items = useMemo(() => lines.map(itemOf), [lines])
  const places = useMemo(() => placesOf(lines, checked?.order ?? shown?.order ?? []), [lines, checked, shown])
  const names = useMemo(() => rawNames && {
    level: new Map(rawNames.levels.map((l) => [l.id, l])),
    part: new Map(rawNames.parts.map((p) => [p.key, p.name])),
    wiki: new Map(rawNames.entries.map((e) => [e.id, e.title])),
    quotes: rawNames.quotes,
    stamp: rawNames.stamp,
    onLevel: (id) => select({ level: id }),
  }, [rawNames]) // eslint-disable-line react-hooks/exhaustive-deps
  const playOrder = useMemo(() => (rawNames ? rawNames.levels.map((l) => l.id) : content?.levels.map((l) => l.id) ?? []), [rawNames, content])
  // Where the course first gives each part (the names tool reads it off the components box): its type → a level.
  const earnedAt = useMemo(() => new Map((rawNames?.parts ?? []).filter((p) => p.at).map((p) => [p.part, p.at])), [rawNames])
  const levelOptions = useMemo(() => {
    if (!content) return null
    const label = new Map((rawNames?.levels ?? []).map((l) => [l.id, l]))
    return content.levels.map((l) => {
      const group = groupOf(content, l.id)
      const shown = label.get(l.id)?.label ?? l.id
      return { value: l.id, label: shown, title: l.title, group: group ? `${group} ${L(levelTags(content)[group].title) ?? ''}` : null, ...(shown !== l.id && { about: l.id }), ...(Array.isArray(l.tasks) && { tasks: l.tasks.map((task) => ({ id: task.id, ...(task.step && { step: task.step }) })) }) }
    }).sort((a, b) => playOrder.indexOf(a.value) - playOrder.indexOf(b.value))
  }, [content, rawNames, playOrder])

  // The object open in the object list shown (the first when none is named): the middle shows it, the right its file.
  const capabilities = vocab?.vocabulary?.capabilities
  const events = useMemo(() => visibleOverrides(content, namespace), [content, namespace])
  const openCapability = side === 'kernel' ? currentCapability(capabilities, opened.capability) : null
  const openEvent = side === 'overrides' ? events.find((event) => overrideKey(event) === opened.override) ?? events[0] ?? null : null
  const openKey = openCapability ? capabilityKey(openCapability.kind, openCapability.name) : openEvent ? overrideKey(openEvent) : null
  const openedParams = openKey ? openParams(side, { [OBJECT_LISTS[side]]: openKey }) : []
  // A group's heading picked in a build list: its tag, relation, tray or section in the middle and its file on the
  // right, the list staying (a level tag picked in the tree is the tree's own group).
  const headingAt = at?.group !== undefined ? { kind: 'tag', full: at.group } : headingState
  const heading = !objectList && headingAt && content?.registries?.[headingAt.kind]?.[headingAt.full] ? headingAt : null
  useEffect(() => remember(game, at, field, playId, pageTask, openedParams, heading), [game, at, field, playId, pageTask, JSON.stringify(openedParams), JSON.stringify(heading)]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Open an object of a list (`list`, by the key its address parameter keeps): the middle shows it, the right its file. */
  const openIn = (list, key) => {
    setOpened((o) => ({ ...o, [OBJECT_LISTS[list]]: key }))
    setObjectField(null)
    showList(list)
  }
  const fileKey = heading ? `${heading.kind} ${heading.full}` : openKey
  const pickObjectField = (path) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setObjectField({ of: fileKey, path })
  }
  const objectPath = objectField?.of === fileKey ? objectField.path : []
  const select = (next, keep = false) => {
    leaveObjects()
    setHeading(null)
    const other = next?.level !== at?.level || next?.group !== at?.group || Boolean(next?.game) !== Boolean(at?.game) || Boolean(next?.glossary) !== Boolean(at?.glossary) || next?.part !== at?.part
    setAt(next)
    setMoving(null)
    const root = partPath(next)
    if (root) pickField(root)
    else if (other) setField(null)
    if (!keep) setPicked(new Set(next?.level ? [next.level] : []))
    if (next?.level && next.level !== play?.level) {
      setPlay({ level: next.level, seed: null, take: null })
      setPageTask(0)
    }
  }
  /** A group's own object opened in the middle (`list`: the build list to show it in, else the one shown). */
  const openHeading = (next, list = null) => {
    if (list) showList(list)
    else leaveObjects()
    if (next?.kind === 'tag' && (list ?? side) === 'tree' && levelsBy === 'tag' && content?.registries?.tag?.[next.full]?.kind === 'level') {
      select({ group: next.full })
      return
    }
    select(null)
    setHeading(next)
    setObjectField(null)
  }
  /** An object named somewhere (a tag, a relation, a tray, a section) opened in the build list it belongs in. */
  const openNamed = (kind, full) => {
    const of = kind === 'tag' ? content?.registries?.tag?.[full]?.kind : kind === 'relation' ? relationOf(full) : null
    openHeading({ kind, full }, listOfHeading(kind, of))
  }
  const relationOf = (full) => {
    const relation = content?.registries?.relation?.[full]
    return relation?.kind === 'replaces' ? 'part' : relation?.of === 'entry' ? 'entry' : relation?.of === 'part' ? 'part' : 'level'
  }
  /** A new group's object for a build list of `kind` grouped `by` (a relation of `option`'s kind), opened. */
  const newSymbol = () => {
    const name = freeObjectName(ownNames(content, 'symbol', namespace), 'symbol')
    edit({ op: 'symbol.put', symbol: name, data: { mark: Object.keys(vocab.vocabulary.kinds.mark)[0], name: { en: 'New symbol' }, desc: { en: '' }, icon: 'Rows3' } })
    openHeading({ kind: 'symbol', full: `${namespace}/${name}` })
  }
  const newGroup = (kind, by, option) => {
    if (saving) return
    if (by === 'tag') {
      const { full, op } = newTag(content, namespace, kind)
      edit(op)
      return openHeading({ kind: 'tag', full })
    }
    const name = freeObjectName(ownNames(content, by, namespace), by === 'relation' ? `${option}` : `new-${by}`)
    const data = by === 'relation' ? { kind: option, ...(option === 'order' && { of: kind }), edges: [] }
      : by === 'tray' ? { values: [] } : { title: { [getLang()]: T('新的分组', 'New section') }, values: [] }
    edit({ op: `${by}.put`, [by]: name, data })
    return openHeading({ kind: by, full: `${namespace}/${name}` })
  }
  const grouping = (kind, by, onBy) => ({
    groupings: GROUPINGS[kind], by, onBy,
    newOptions: by === 'relation' ? RELATION_KINDS[kind].map(([value, zh, en]) => ({ value, label: tr(zh, en) })) : null,
    onNew: (option) => newGroup(kind, by, option),
  })
  const openTreeItem = (next, keep) => {
    select(next, keep)
    if (next?.group === undefined) pickField(selectionPath(next))
  }
  const removeLevel = (level) => {
    if (savingRef.current || !confirmDelete(level)) return
    edit({ op: 'level.remove', level })
    select(null)
    if (play?.level === level) { setPlay(null); setPageTask(0); setGo(null) }
  }
  /** Find a field in the side panel: the file it is in picked, the field in it. */
  const jump = (level, path, file = null) => {
    const keys = path ? parsePath(path) : []
    if (file === 'glossary') {
      select({ glossary: true })
      if (keys.length) pickField(keys, true)
      return
    }
    if (level) select({ level })
    else if (file?.startsWith('symbols/')) {
      const full = file.slice(8, -5)
      openHeading({ kind: 'symbol', full }, 'symbols')
      setObjectField({ of: `symbol ${full}`, path: keys })
      return
    }
    else if (file === 'parts') select({ part: keys[1] })
    else select({ game: true })
    if (keys.length) pickField(keys, true)
    else setField(null)
  }
  /** A field into the side panel (opened if folded); a field of another task has the page play that task. */
  const pickField = (path, focus = false, pendingFace = null, trail = null) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setField({ path, ...(focus && { focus }), ...(pendingFace && { pendingFace }), ...(trail && { trail }) })
    if (path[0] === 'tasks' && Number.isInteger(path[1])) setGo({ task: path[1] })
  }
  const inspectorSelection = at ?? { game: true }
  const openInspectorTab = (tab) => {
    select(tab.at)
    pickField(tab.path)
  }
  const toggleInspectorTab = (path) => {
    const key = inspectorTabKey(inspectorSelection, path)
    setInspectorTabs((saved) => {
      const tabs = saved[game] ?? []
      const remaining = tabs.filter((tab) => inspectorTabKey(tab.at, tab.path) !== key)
      return { ...saved, [game]: remaining.length === tabs.length ? [...tabs, { at: inspectorSelection, path }] : remaining }
    })
  }
  const closeInspectorTab = (tab, current) => {
    const key = inspectorTabKey(tab.at, tab.path)
    const index = inspectorTabs.findIndex((item) => inspectorTabKey(item.at, item.path) === key)
    setInspectorTabs((saved) => ({ ...saved, [game]: (saved[game] ?? []).filter((item) => inspectorTabKey(item.at, item.path) !== key) }))
    const next = inspectorTabs[index + 1] ?? inspectorTabs[index - 1]
    if (current && next) openInspectorTab(next)
  }
  /** Go to what a finding of the check is about: the field it names, else its level. */
  const jumpTo = (item) => {
    const place = places.find((p) => item.levels.includes(p.level) && p.path && item.text.endsWith(p.says))
    if (place) return jump(place.level, place.path)
    const game = /^content: game\.json((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (game) return jump(null, game[1].replace(/^\./, ''), 'game')
    if (/^content: glossary\.json/.test(item.text)) return jump(null, null, 'glossary')
    const part = /^content: parts\/([^\s]+)\.json((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (part) {
      select({ part: part[1] })
      return pickField(parsePath(`parts.${part[1]}${part[2]}`), true)
    }
    if (item.levels[0]) select({ level: item.levels[0] })
  }
  // Play a level, opened on one of its boards (path) when given; `take`: the board is being edited there.
  const playLevel = async (level, path = null, take = false) => {
    const request = {}
    playRequest.current = request
    const seed = path ? await call('seed', { ...target, scope: SCOPE, level, path, changeset: { ops } }) : null
    if (playRequest.current !== request) return
    playRequest.current = null
    setPlay({ level, seed: seed?.data !== undefined ? seed : null, take: take ? { path, label: tr(`用作 ${path}`, `Use as ${path}`) } : null })
    if (seed?.task !== undefined) setPageTask(seed.task)
  }
  const referenceOf = (level) => {
    const value = content?.levels.find((l) => l.id === level)
    const task = level === play?.level ? pageTask : 0
    const ref = value && referenceFor(vocab.vocabulary, value, ['tasks', task])
    return ref ? showPath(ref) : null
  }
  const playFrom = (level, reference) => {
    playLevel(level, reference ? referenceOf(level) : null)
    leaveObjects()
  }
  // A board of the level edited in the game's own circuit editor, on the page: its 「用作 …」 writes it back.
  const onBoard = async (level, path) => {
    leaveObjects()
    await playLevel(level, path, true)
  }
  const onTake = ({ level, path, text }) => {
    edit({ op: 'level.blueprint', level, path, text })
    setPlay((p) => ({ ...p, seed: null, take: null }))
  }
  // What the page says: a field picked, an item added, the task it plays, a board taken back.
  const levelValue = (id) => {
    const l = content?.levels.find((x) => x.id === id)
    if (!l) return null
    const { id: _, ...value } = l
    return value
  }
  // A port's view switched on the page in edit mode: the view the port's value starts in.
  const onStart = ({ level, task, port, view }) => {
    const value = levelValue(level)
    const own = value?.tasks ? value.tasks[task] : value
    const side = ['inputs', 'outputs'].find((k) => own?.[k]?.some((p) => p.name === port))
    if (!side) return
    const at = [...(value.tasks ? ['tasks', task] : []), side, own[side].findIndex((p) => p.name === port), 'view']
    edit({ op: 'level.set', level, path: at, value: view })
  }
  // A field of game.json (on the map) or of the glossary (in the encyclopedia; an entry goes by its id) picked on the page.
  const onFilePage = ({ file, path }) => {
    if (file === 'glossary') {
      const k = path[0] === 'entries' ? content.glossary.entries.findIndex((e) => e.id === path[1]) : -1
      select({ glossary: true }, true)
      return pickField(path[0] === 'entries' ? ['entries', k, ...path.slice(2)] : path)
    }
    select({ game: true }, true)
    return pickField(path)
  }
  // The name of what the page shows, clicked: all its fields in the side panel, those the screen does not draw too.
  const onRoot = () => {
    if (partRoot) return pickField(partRoot)
    if (play?.level) {
      if (at?.level !== play.level) select({ level: play.level })
      return pickField([])
    }
    select({ game: true }, true)
    return pickField([])
  }
  // A step of a built part's upgrade chain clicked: its task, on the page and in the side panel.
  const onTaskGo = ({ task }) => {
    const found = findTask(content.levels, task)
    if (!found) return select({ level: task })
    select({ level: found.level })
    setPageTask(found.at)
    return pickField(['tasks', found.at])
  }
  // A tick of a part's way through the course: its level, at the task and on the field that says it.
  const onFlow = (e) => {
    select({ level: e.level })
    if (e.task !== undefined) setPageTask(e.task)
    return pickField(e.path ?? (e.task !== undefined ? ['tasks', e.task] : []))
  }
  const onPage = (m) => {
    if (m.type === 'take') return onTake(m)
    if (m.type === 'task-go') return onTaskGo(m)
    if (m.file) return onFilePage(m)
    if (m.type === 'start') return onStart(m)
    if (m.part !== undefined) return onPartPage(m)
    if (m.type === 'task') { if (m.level === play?.level) setPageTask(m.task); return undefined }
    const value = levelValue(m.level)
    if (!value) return undefined
    if (m.level !== at?.level) select({ level: m.level })
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    if (m.type === 'pick') {
      const path = markPath(value, vocab.vocabulary, m)
      return setField(path ? { path, focus: true } : { missing: m.at })
    }
    if (m.type === 'add') {
      const path = markPath(value, vocab.vocabulary, m)
      const schema = path && shapeAt(vocab.vocabulary.level, value, path, { vocabulary: vocab.vocabulary })
      if (schema?.type === 'list' && creationChoices(schema.of, { vocabulary: vocab.vocabulary }).length > 1) return pickField(path)
      const added = addFor(m.level, value, vocab.vocabulary, m)
      if (!added) return setField({ missing: m.at })
      edit(added.op)
      setField({ path: added.at, focus: true })
      if (added.at.length === 2 && added.at[0] === 'tasks') setGo({ task: added.at[1] })
    }
    return undefined
  }
  // The part page: a field of the part picked, or a block (a rule, a check) added to it; a face still drawn by default
  // is first written out as its default blocks.
  const onPartPage = (m) => {
    const base = ['parts', m.part]
    const def = getAt(content?.partDefs, base)
    if (!def) return undefined
    const [key, face] = m.path
    if (key === 'views' && face) {
      const path = [...base, 'views', face]
      const pending = [...ops].reverse().find((op) => op.op === 'parts.set' && !shown?.ops.includes(op) && showPath(op.path) === showPath(path))
      const existing = pending?.value ?? def.views?.[face]
      const list = existing ?? DEFAULT_VIEWS[face]
      const write = (value) => edit({ op: 'parts.set', path, value })
      if (!existing) write(list)
      return pickField(m.type === 'pick' ? [...base, ...m.path] : path, m.type === 'pick', list)
    }
    if (m.type === 'pick' || (m.part !== undefined && key === 'settings' && m.path.length === 1)) {
      return pickField([...base, ...m.path], true)
    }
    // An item added to a list of the part: blank as its schema has it (a rule and a check, one that already reads).
    const path = [...base, ...m.path]
    const schema = shapeAt(PARTS_FILE, content.partDefs, path, { vocabulary: vocab.vocabulary })
    if (schema?.type !== 'list') return undefined
    if (creationChoices(schema.of, { vocabulary: vocab.vocabulary }).length > 1) return pickField(path)
    const list = getAt(content.partDefs, path) ?? []
    const blankOf = { rules: { set: {} }, checks: { holds: 'circuit:eq(1, 1)', say: { en: '' } } }
    edit({ op: 'parts.set', path, value: [...list, (m.path.length === 1 && blankOf[key]) || blank(schema.of, { vocabulary: vocab.vocabulary, levels: playOrder })] })
    return pickField([...path, list.length], true)
  }
  // Levels dropped in the tree: into a group at a place, or out of every group.
  const move = (levels, to) => {
    addOps(treeMoves(levels, to, content, namespace))
    setMoving(null)
  }
  // A group dragged among the groups: the layer's level-tags-order; a level moved in its group: the group's order.
  const moveGroup = (group, to) => {
    const ops = tagMoveOps(content, namespace, 'level', group, to)
    if (ops?.length) addOps(ops)
  }
  const reorderGroup = (group, sequence) => {
    const ops = memberOrderOps(content, namespace, group, sequence)
    if (ops?.length) addOps(ops)
  }
  // A task dragged in the tree: moved after a task, or after the last task of a level (task.move), and opened there.
  const moveTask = (task, to) => {
    edit({ op: 'task.move', task, to })
    const rest = content.levels.find((l) => l.id === to.level).tasks.filter((x) => x.id !== task)
    select({ level: to.level })
    pickField(['tasks', to.after ? rest.findIndex((x) => x.id === to.after) + 1 : rest.length])
  }
  const newLevelContext = { vocabulary: vocab?.vocabulary, levels: playOrder, lang }
  const firstTaskSchema = vocab && tasksSchema(vocab.vocabulary)
  const levelChoices = vocab ? creationChoices(firstTaskSchema ?? vocab.vocabulary.level, newLevelContext) : []
  const addLevel = (action) => {
    const taken = new Set([...Object.keys(content.tags), ...content.levels.flatMap((level) => [level.id, ...(level.tasks ?? []).map((task) => task.id)])])
    const source = content.levels.find((entry) => entry.id === at?.level)
    const level = freeName([...taken], 'level')
    const make = levelChoices[action]?.make
    const draft = action === 'copy' ? source : {
      ...(firstTaskSchema ? { ...blank(vocab.vocabulary.level, newLevelContext), tasks: [make()] } : make()),
      title: T('新关卡', 'New level'),
    }
    edit({ op: 'level.add', level, data: copyLevelData(draft, level, content.levels) })
    openTreeItem({ level })
  }
  const duplicate = (level, id) => {
    const source = content.levels.find((l) => l.id === level)
    edit({ op: 'level.add', level: id, data: copyLevelData(source, id, content.levels) })
    select({ level: id })
  }
  const togglePanel = (which) => setLayout((l) => ({ ...l, [`${which}Open`]: !l[`${which}Open`] }))
  // The side panel's field: its control's context (as the forms had it), and the mark the page draws it with.
  const sideFile = at?.level ? { level: at.level } : partRoot ? { parts: true, root: partRoot } : at?.glossary ? { glossary: true } : at ? { game: true } : null
  const pendingFace = field?.pendingFace && ops.some((op) => op.op === 'parts.set' && op.value === field.pendingFace && !shown?.ops.includes(op)) ? field.pendingFace : null
  const pageMark = field?.path && sideFile?.level && sideFile.level === play?.level ? { ...markOf(levelValue(sideFile.level), field.path), level: sideFile.level }
    : field?.path && at?.part !== undefined && field.path[0] === 'parts' && field.path[1] === at.part ? JSON.stringify(field.path.slice(2))
    : field?.path && sideFile?.game ? { file: 'game', path: JSON.stringify(field.path) }
    : field?.path && sideFile?.glossary ? { file: 'glossary', path: JSON.stringify(field.path[0] === 'entries' && Number.isInteger(field.path[1]) ? ['entries', content.glossary.entries[field.path[1]]?.id, ...field.path.slice(2)] : field.path) }
    : null

  const sideCtx = vocab && content && {
    vocabulary: vocab.vocabulary,
    levels: content.levels.map((l) => l.id),
    names,
    levelOptions,
    textField,
    lang,
    onPart: (part) => { showList('parts'); select({ part }) },
    ...(sideFile?.level && {
      onBoard: (path) => onBoard(sideFile.level, showPath(path)),
      before: (path) => {
        const was = base?.levels.find((l) => l.id === sideFile.level)
        if (!was) return [false, undefined]
        const v = path.reduce((x, k) => (x === undefined || x === null ? undefined : x[k]), was)
        return [v !== undefined, v]
      },
    }),
  }
  const openSearch = () => {
    showList('search')
    setLayout((l) => ({ ...l, treeOpen: true }))
    window.setTimeout(() => document.querySelector('.search input')?.focus())
  }

  // The studio's actions: the palette lists them, the keys run the same ones.
  const level = at?.level && content?.levels.some((l) => l.id === at.level) ? at.level : null
  const ACTIONS = [
    ['search', tr('在整款游戏里搜索、替换'), `${MOD}+Shift+F`, openSearch],
    ['compare', tr('比较', 'Compare'), '', () => openDrawer('compare')],
    ['page', tr('画面：在游戏的页面上改'), '', () => { leaveObjects(); setPageEdit(true) }],
    ...(level ? [
      ['play-ref', tr('载入参考解试玩这一关'), `${level} · ${MOD}+Enter`, () => playFrom(level, true)],
      ['play', tr('试玩这一关（不显示编辑标记）'), level, () => { setPageEdit(false); playFrom(level, false) }],
      ['duplicate', tr('复制这一关成新的一关……'), level, (id) => duplicate(level, id), { placeholder: tr(`${level} 的副本的 id`, `The id of ${level}’s copy`), value: `${level}-2` }],
      ['move', tr('移动这一关'), level, () => setMoving([level])],
    ] : []),
    ['next', tr('下一处检查结果'), 'F8', () => window.dispatchEvent(new CustomEvent('studio:finding', { detail: 1 }))],
    ['previous', tr('上一处检查结果'), 'Shift+F8', () => window.dispatchEvent(new CustomEvent('studio:finding', { detail: -1 }))],
    ...(ops.length ? [['drop', tr('去掉最后一个待定操作'), `${MOD}+Z`, () => back(ops.length - 1)]] : []),
    ...(redo.length ? [['redo', tr('放回去掉的操作'), `${MOD}+Shift+Z`, again]] : []),
    ...(ops.length ? [['review', tr(`看 ${ops.length} 个待定操作`, `Review ${ops.length} pending`), '', () => openDrawer('changes')], ['discard', tr('全部放弃'), '', discard]] : []),
    ['tree', tr('收起或打开左栏'), 'Alt+[', () => togglePanel('tree')],
    ['audit', tr('收起或打开检查栏'), 'Alt+]', () => togglePanel('audit')],
    ['side', tr('收起或打开侧栏'), 'Alt+\\', () => togglePanel('side')],
    ['keys', tr('快捷键'), '?', () => openOverlay('keys')],
  ].map(([id, label, keys, run, ask]) => ({ id, label, keys, run, ...(ask && { ask }) }))

  const fields = useMemo(() => {
    if (!level || !vocab) return []
    const { id: _, ...value } = content.levels.find((l) => l.id === level)
    return [...new Set([...Object.keys(value), ...find(vocab.vocabulary.level, value, 'text', { vocabulary: vocab.vocabulary }).map((t) => showPath(t.path))])]
  }, [level, content, vocab])
  const recent = useMemo(() => {
    const seen = new Set()
    return [...ops].reverse().filter((op) => op.path !== undefined).map((op) => ({ level: op.level ?? null, path: showPath(op.path) })).filter((r) => {
      const k = `${r.level} ${r.path}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }).slice(0, 8)
  }, [ops])
  const paletteItems = overlay === 'palette' && content
    ? paletteIndex({ content, labels: rawNames?.levels, level, fields, items, recent, actions: ACTIONS, lang })
    : []
  const runItem = (item, word) => {
    if (item.kind === 'action') return ACTIONS.find((a) => a.id === item.action)?.run(word)
    if (item.kind === 'level') { select({ level: item.level }); return undefined }
    if (item.kind === 'field' || item.kind === 'recent') return jump(item.level, item.path, item.level ? null : 'game')
    if (item.kind === 'entry') { select({ glossary: true }); return undefined }
    if (item.kind === 'finding') return jumpTo(item.finding)
    return undefined
  }

  // The keys (Shortcuts.jsx lists them).
  useWorkspaceKeys((e) => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (paletteKey(e)) {
      e.preventDefault()
      if (e.repeat) return
      if (overlay === 'palette') closeOverlay()
      else openOverlay('palette')
    }
    else if (mod && e.shiftKey && k === 'f') { e.preventDefault(); openSearch() }
    else if (mod && k === 'z' && !editable(document.activeElement)) { e.preventDefault(); if (e.shiftKey) again(); else back(ops.length - 1) }
    else if (mod && e.key === 'Enter' && level) { e.preventDefault(); playFrom(level, true) }
    else if (e.altKey && e.code === 'BracketLeft') { e.preventDefault(); togglePanel('tree') }
    else if (e.altKey && e.code === 'BracketRight') { e.preventDefault(); togglePanel('audit') }
    else if (e.altKey && e.code === 'Backslash') { e.preventDefault(); togglePanel('side') }
    else if (e.key === '?' && !mod && !editable(document.activeElement)) { e.preventDefault(); openOverlay('keys') }
    else if (e.key === 'Escape') {
      if (moving) setMoving(null)
      else if (picked.size > 1) setPicked(new Set(at?.level ? [at.level] : []))
    }
  }, { allowOverlay: paletteKey })

  const ready = content && vocab
  const pickedIds = playOrder.filter((id) => picked.has(id))
  const shownLayout = resize ? { ...layout, [resize.side]: resize.size } : layout
  const style = { '--tree-w': `${layout.treeOpen ? shownLayout.tree : 0}px`, '--audit-h': `${shownLayout.audit}px`, '--side-w': `${layout.sideOpen ? shownLayout.side : 0}px` }
  const resizer = { setLayout, previewResize: setResize, dragging: resize !== null }
  const lists = PACKAGE_LISTS.filter((list) => (list !== 'parts' || content?.partDefs) && (list !== 'symbols' || vocab?.vocabulary.kinds.mark) && (list !== 'entries' || content?.glossary?.entries?.length))
  const objectPending = saving || shown?.ops !== ops
  // A group's own object in the middle: its editor (a tag, a relation, a tray, a section).
  const groupProps = heading && {
    content, namespace, vocabulary: vocab?.vocabulary, full: heading.full, pending: objectPending, onEdit: edit, onOps: addOps, onPick: pickObjectField,
    onSelect: (full) => (full ? openHeading({ kind: heading.kind, full }) : select(null)),
  }
  const GroupEditor = heading && { tag: TagEditor, relation: RelationBoard, tray: TrayEditor, section: SectionEditor, symbol: SymbolEditor }[heading.kind]
  // The middle: an object list's object (above), several levels picked at once, a group's own object, or the page.
  const middle = objectList ? 'objects' : pickedIds.length > 1 ? 'bulk' : heading ? 'group' : 'page'
  // The right column: a group's own object's file, the capability's description, the override's file.
  const objectFile = heading ? { object: { kind: heading.kind, full: heading.full, namespace, own: namespaceOf(heading.full) === namespace } }
    : openCapability ? { capability: openCapability } : openEvent ? { override: { event: openEvent, layer: namespace } } : { game: true }
  // The file the fold bar's compare shows: the object open in the middle (as its layer writes it), else a level.
  const compared = objectFile.object
  const compareFile = compared && {
    name: objectFileName(compared.kind, compared.full, content.registries?.tag?.[compared.full]?.kind, namespace),
    now: ownObjectData(namespace, objectValue(content, compared.kind, compared.full)),
    before: base && (objectValue(base, compared.kind, compared.full) ?? undefined) && ownObjectData(namespace, objectValue(base, compared.kind, compared.full)),
    git: compared.own,
  }
  return (
    <div className={`studio ${moving ? 'is-moving' : ''} ${resize ? 'is-resizing' : ''}`}>
      <StudioBar space={space} ops={ops} busy={busy} fresh={fresh} onPalette={() => openOverlay('palette')}>
        <select className="studio-game" value={pkg} disabled={saving} aria-label={tr('内容包', 'Package')}
          onChange={(e) => { onPackage(e.target.value); select(null); setPlay(null); setOpened({}); setHeading(null) }}>
          {packages.map(({ id }) => <option key={id} value={id}>{id}</option>)}
        </select>
      </StudioBar>
      {!ready ? <div className="studio-loading">{tr('读取中……')}</div> : (
        <div className={`studio-body is-${objectList ? 'objects' : middle} ${layout.treeOpen ? '' : 'no-tree'} ${layout.auditOpen ? '' : 'no-audit'} ${layout.sideOpen ? '' : 'no-side'}`} style={style}>
          <aside className="studio-tree">
            <div className="side-tabs" role="tablist" aria-label={tr('列表', 'Lists')}>
              {lists.map((list) => {
                const [Icon, zh, en] = LISTS[list]
                return (
                  <button key={list} type="button" role="tab" aria-selected={side === list} className={side === list ? 'is-on' : ''} aria-label={tr(zh, en)}
                    onClick={() => (list === 'search' ? openSearch() : showList(list))} title={list === 'search' ? `${tr(zh, en)} (${MOD}+Shift+F)` : tr(zh, en)}>
                    <Icon size={14} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            {side === 'kernel' ? <CapabilityList capabilities={capabilities} current={openCapability} onOpen={(kind, name) => openIn('kernel', capabilityKey(kind, name))} />
              : side === 'overrides' ? <OverrideList events={events} layer={namespace} current={openKey} onOpen={(key) => openIn('overrides', key)} />
              : side === 'entries' ? <EntryList content={content} namespace={namespace} game={game} current={at?.glossary && field?.path?.[0] === 'entries' ? field.path[1] : null}
                heading={heading} onHeading={(next) => openHeading(next)} {...grouping('entry', entriesBy, setEntriesBy)} onOpen={(k) => jump(null, `entries[${k}]`, 'glossary')} />
              : side === 'parts' && content.partDefs
              ? <PartsList content={content} vocabulary={vocab.vocabulary} namespace={namespace} game={game} levelOptions={levelOptions} order={playOrder} earned={earnedAt} at={at} found={(type) => places.filter((p) => p.file === 'parts' && p.path?.[1] === type).length}
                heading={heading} onHeading={(next) => openHeading(next)} {...grouping('part', partsBy, setPartsBy)} onSelect={select} onOps={addOps} />
              : side === 'symbols' ? <GroupedList kind="symbol" content={content} namespace={namespace} game={game}
                items={Object.keys(content.registries.symbol ?? {})} label={id => L(content.registries.symbol[id].name)}
                heading={heading} onHeading={openHeading} {...grouping('symbol', partsBy, setPartsBy)}
                addOptions={[{ value: 'symbol', label: tr('符号', 'Symbol') }]}
                onAdd={newSymbol}
                row={id => <button key={id} type="button" className={`tree-level ${heading?.full === id ? 'is-on' : ''}`} onClick={() => openHeading({ kind: 'symbol', full: id })}><code className="tree-level-id">{shownName(namespace, id)}</code><span>{L(content.registries.symbol[id].name)}</span></button>} />
              : side === 'search'
              ? <Search content={content} vocabulary={vocab.vocabulary} onAdd={addOps} onJump={(level, path, file) => jump(level, path, file)} />
              : levelsBy !== 'tag' ? <GroupedList kind="level" content={content} namespace={namespace} game={game} items={playOrder} label={(id) => L(content.registries?.level?.[id]?.title)}
                heading={heading} onHeading={(next) => openHeading(next)} {...grouping('level', levelsBy, setLevelsBy)}
                row={(id) => (
                  <button key={id} type="button" className={`tree-level ${at?.level === id ? 'is-on' : ''}`} onClick={() => openTreeItem({ level: id })}>
                    <code className="tree-level-id" title={id}>{shownName(namespace, id)}</code><span>{L(content.registries?.level?.[id]?.title)}</span>
                  </button>
                )} />
              : <Tree game={game} grouping={grouping('level', levelsBy, setLevelsBy)} namespace={namespace} content={content} order={playOrder} at={at} selectedTask={field?.path?.[0] === 'tasks' ? field.path[1] ?? null : null} picked={picked} setPicked={setPicked} onSelect={openTreeItem} moving={moving} setMoving={setMoving} onMove={move} onGroupMove={moveGroup} onReorder={reorderGroup} labels={rawNames?.levels} onTask={(task) => onTaskGo({ task })} onTaskMove={moveTask}
                  addOptions={[
                    ...(levelChoices.length ? [{
                      value: levelChoices.length === 1 ? levelChoices[0].value : 'blank',
                      label: tr('空白关卡', 'Blank level'),
                      ...(levelChoices.length > 1 && { children: levelChoices }),
                    }] : []),
                    ...(at?.level && content.levels.some((level) => level.id === at.level) ? [{ value: 'copy', label: tr('复制所选关卡', 'Duplicate selected level') }] : []),
                  ]} onAdd={addLevel} /> }
          </aside>
          <PanelResizer side="tree" size={layout.tree} open={layout.treeOpen} {...resizer} />
          <main className="studio-main">
            {objectList && (
              <div className="studio-scroll">
                {side === 'kernel' && <CapabilityView current={openCapability} />}
                {side === 'overrides' && <OverrideDetail event={openEvent} layer={namespace} pending={objectPending} onOps={addOps}
                  onOpen={(event) => {
                    if (HEADING_KINDS.includes(event.kind)) openNamed(event.kind, event.name)
                    else if (event.kind === 'level') select({ level: event.name })
                  }} />}
              </div>
            )}
            {middle === 'bulk' && (
              <div className="studio-scroll">
                <Editor side={SCOPE} content={content} base={base} vocab={vocab} at={at} picked={pickedIds} field={field} places={places} names={names} levelOptions={levelOptions} playOrder={playOrder} onEdit={edit} onOps={addOps} onSelect={select} onPick={(path) => pickField(path)} onPlay={playFrom} onMove={setMoving} onRemoveLevel={removeLevel} />
              </div>
            )}
            {middle === 'group' && (
              <div className="studio-scroll">
                <GroupEditor key={`${heading.kind} ${heading.full}`} {...groupProps} />
              </div>
            )}
            <GameFrame
              visible={middle === 'page' && Boolean(pageContent)} content={pageContent} play={play} part={at?.part} stage={partStage} task={pageTask} go={go} edit={pageEdit} picked={pageEdit ? pageMark : null} onEdit={setPageEdit} onMessage={onPage} onRoot={onRoot}
              reference={play && referenceOf(play.level)} onReference={playLevel} onCancelTake={() => setPlay((p) => ({ ...p, seed: null, take: null }))}
              footer={at?.part !== undefined ? <>
                <StageChain part={at.part} raw={content.partDefs?.parts?.[at.part]} operations={capabilities?.operation ?? {}} namespace={namespace} stage={partStage} pending={objectPending}
                  editable={namespaceOf(at.part) === namespace} onStage={(id, path) => { setPartStage(id); pickField(['parts', at.part, ...path]) }}
                  onAdd={(stages) => edit({ op: 'parts.set', path: ['parts', at.part, 'stages'], value: stages })} />
                <Flow target={target} part={at.part} changeset={changeset} label={levelLabel(names)} onOpen={onFlow} />
              </>
                : level && <ObjectLinks content={content} kind="level" full={level} namespace={namespace} onOpen={(next) => openNamed(...Object.entries(next)[0])} />}
            />
          </main>
          <PanelResizer side="side" size={layout.side} open={layout.sideOpen} {...resizer} />
          <aside className="studio-side">
            {sideCtx && (objectList || heading
              ? <Inspector content={content} vocab={vocab} at={objectFile} field={objectFile.object || objectFile.capability || objectFile.override ? { path: objectPath } : null} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps} onPick={pickObjectField} onLevel={() => {}} onRemoveLevel={() => {}} onRemoveSelection={() => {}}
                tabs={inspectorTabs} selection={objectFile} onToggleTab={() => {}} onOpenTab={openInspectorTab} onCloseTab={closeInspectorTab}
                onNavigate={(path) => pickObjectField(path)} />
              : <Inspector content={content} vocab={vocab} at={sideFile} field={field} pendingFace={pendingFace} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps} onPick={(path) => pickField(path)} onLevel={(lvl, path) => { select({ level: lvl }); pickField(path) }} onRemoveLevel={removeLevel} onRemoveSelection={() => select(null)}
                tabs={inspectorTabs} selection={inspectorSelection} onToggleTab={toggleInspectorTab} onOpenTab={openInspectorTab} onCloseTab={closeInspectorTab}
                onNavigate={(path, trail) => pickField(path, false, null, trail)} />)}
          </aside>
          {layout.auditOpen && <PanelResizer side="audit" size={layout.audit} open {...resizer} />}
          <aside className="studio-audit">
            <Drawer open={layout.auditOpen} tab={drawerTab} onTab={openDrawer} onToggle={() => togglePanel('audit')} sum={auditSum(items, last)} fresh={fresh} ops={ops}
              audit={<Audit items={items} fresh={fresh} last={last} at={at} busy={busy} open={layout.auditOpen && drawerTab === 'audit'} onOpen={() => openDrawer('audit')} onJump={jumpTo} />}
              panel={drawerTab === 'compare' ? <Compare target={target} content={content} base={base} at={at} levelOptions={levelOptions} onJump={(lvl, path) => jump(lvl, path)} file={compareFile} onFilePath={pickObjectField} />
                : drawerTab === 'changes' ? <Review ops={ops} redo={redo} result={result} shown={shown} why={why} setWhy={setWhy} said={said}
                  onRemove={(k) => { if (confirmDelete(ops[k].op)) pending.remove(k) }} onBack={back} onRedo={again}
                  onDiscard={discard} onOpen={pending.open} onApply={apply} onUndo={undo} onSelect={(lvl) => select({ level: lvl })} />
                : <Debug ops={ops} last={last} />} />
          </aside>
        </div>
      )}
      {overlay === 'palette' && ready && <Palette items={paletteItems} onRun={runItem} onClose={closeOverlay} />}
      {overlay === 'keys' && <Shortcuts onClose={closeOverlay} />}
    </div>
  )
}
