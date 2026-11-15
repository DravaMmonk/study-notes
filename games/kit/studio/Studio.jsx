// The studio (games/DESIGN.md 6.7, DIRECTION decision 5): one page to review, edit and play a game without code. It
// is a thin skin over the operation set: every edit is an operation added to a pending changeset; the server runs
// the changeset without writing (the preview tool) and answers with the content it leaves, every line of the check,
// the save migration it would add and each file it changes. The tree, the forms, the copy table, the comparisons, the
// game played, the audit and the review all show that one answer; search and replace and bulk edits only ever add
// operations to it.
//
// A preview comes in two steps, so editing stays quick on a big game: at once the content the changeset leaves,
// checked against the vocabulary only; then, a moment after the last edit and one at a time, the whole check (the
// domain's own: every reference run), which takes seconds on the biggest games. Until it is back the audit shows the
// last one as stale. Applying writes the changeset (modify); undo runs the change log's.
//
// The page: the tree (or search, or the game's parts: pieces.json) on the left; in the middle the level as the game shows it, which is where it is
// edited (GameFrame.jsx: a click on a field on screen picks it, a + adds an item), or its fields as rows, its copy, a
// comparison, the changes; the field picked in the side panel on the right (Inspector.jsx), with its control; the
// audit in a drawer under the middle. Each folds away and resizes (remembered per viewer, prefs.js); the command
// palette (Ctrl/⌘+K) reaches every place and action, ? lists the keys.
import './studio.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Command, ListTree, Search as SearchIcon, Shapes, SlidersHorizontal } from 'lucide-react'
import { GAMES } from '../../games.js'
import { mountBarMenus } from '../menu.js'
import { L, T, getLang, tr } from '../shell/i18n.js'
import { useWorkspaceKeys } from '../shell/useOverlay.js'
import { eraLevels } from '../course.js'
import { find, shapeAt } from '../engine/schema.js'
import { getAt, parsePath, showPath } from '../engine/ops/edit.js'
import { call } from './api.js'
import { blank, creationChoices, placesOf, pushOp, referenceFor } from './form.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { findTask, tasksSchema } from '../engine/tasks.js'
import { addFor, markOf, markPath } from './marks.js'
import { withParts } from '../engine/parts/define.js'
import { DEFAULT_VIEWS } from '../shell/parts/PartFace.jsx'
import PartsList, { freeName } from './PartsList.jsx'
import SettingsList from './SettingsList.jsx'
import { itemOf } from './worklist.js'
import { paletteIndex } from './palette.js'
import { bulkMove } from './bulk.js'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import PanelResizer from './PanelResizer.jsx'
import Tree from './Tree.jsx'
import Search from './Search.jsx'
import Editor from './Editor.jsx'
import CopyTable from './CopyTable.jsx'
import Compare from './Compare.jsx'
import Audit from './Audit.jsx'
import Review from './Review.jsx'
import GameFrame from './GameFrame.jsx'
import Flow, { levelLabel } from './Flow.jsx'
import Arrangement from './Arrangement.jsx'
import CourseGroups, { useCourseGroups } from './CourseGroups.jsx'
import Inspector from './Inspector.jsx'
import { textField } from './copy.js'
import Palette from './Palette.jsx'
import Shortcuts, { MOD } from './Shortcuts.jsx'

const QUERY = new URLSearchParams(window.location.search)
const SAVED_VIEW = window.history.state?.studio
const TABS = [['page', '画面', 'Page'], ['arrange', '编排', 'Arrangement'], ['groups', '分组', 'Groups'], ['fields', '字段', 'Fields'], ['copy', '文案', 'Copy'], ['compare', '比较', 'Compare'], ['review', '变更', 'Changes']]
const QUICK = 120 // ms after an edit before its content is previewed
const SETTLE = 700 // ms after the last edit before the whole check starts

const piecePath = (at) => at?.part !== undefined ? ['parts', at.part] : at?.setting !== undefined ? ['settings', at.setting] : null
const selectionPath = (at) => piecePath(at) ?? (at?.era !== undefined ? ['eras', at.era] : at ? [] : null)

/** Keep the selection in the address and the editor details in the same history entry. */
const remember = (game, at, tab, field, playLevel, task) => {
  const url = new URL(window.location.href)
  url.searchParams.set('game', game)
  for (const k of ['level', 'era', 'part', 'setting', 'glossary']) url.searchParams.delete(k)
  if (at?.level) url.searchParams.set('level', at.level)
  if (at?.era !== undefined) url.searchParams.set('era', at.era)
  if (at?.part !== undefined) url.searchParams.set('part', at.part)
  if (at?.setting !== undefined) url.searchParams.set('setting', at.setting)
  if (at?.glossary) url.searchParams.set('glossary', '1')
  url.searchParams.set('tab', tab)
  const inspector = field?.path ? { path: field.path } : field?.missing ? { missing: field.missing } : null
  window.history.replaceState({ studio: { inspector, playLevel, task, gameRoot: Boolean(at?.game) } }, '', url)
}
const editable = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
const paletteKey = (event) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'

export default function Studio() {
  const [game, setGame] = useState(() => GAMES.find(({ id }) => id === QUERY.get('game'))?.id ?? GAMES[0].id)
  const groupModel = useCourseGroups(game)
  const [domainVocab, setVocab] = useState(null) // the domain's vocabulary; `vocab` below adds the game's parts
  const [ops, setOps] = useState([])
  const [redo, setRedo] = useState([]) // operations taken back, the last first to come back
  const [why, setWhy] = useState('')
  const [shown, setShown] = useState(null) // the last quick preview that left a content
  const [last, setLast] = useState(null) // the last quick preview (an operation may have failed)
  const [checked, setChecked] = useState(null) // the last whole check: { key, ok, lines, problems }
  const [base, setBase] = useState(null) // the content as written, before the pending changes
  // The seq of the change log's last entry when the game was loaded: a change is written only onto it.
  const [head, setHead] = useState(null)
  const [rawNames, setRawNames] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0) // bumped when the files change (apply, undo)
  const [at, setAt] = useState(() => (QUERY.get('level') ? { level: QUERY.get('level') } : QUERY.get('era') ? { era: Number(QUERY.get('era')) } : QUERY.get('part') ? { part: QUERY.get('part') } : QUERY.get('setting') ? { setting: QUERY.get('setting') } : QUERY.get('glossary') ? { glossary: true } : SAVED_VIEW?.gameRoot ? { game: true } : null))
  const [picked, setPicked] = useState(() => new Set(at?.level ? [at.level] : []))
  const [tab, setTab] = useState(() => {
    const requested = QUERY.get('tab')
    if (requested === 'i18n') return 'copy'
    return TABS.some(([id]) => id === requested) ? requested : 'page'
  })
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
  const [said, setSaid] = useState(null) // what the last apply or undo said
  const [layout, setLayout] = usePref('layout', { tree: 240, audit: 220, side: 380, treeOpen: true, auditOpen: true, sideOpen: true })
  const [resize, setResize] = useState(null)
  const [side, setSide] = usePref('side', 'tree')
  const [copyScope, setCopyScope] = useState(null) // An era's index, or the game, glossary or pieces.
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
  const actions = useRef(null)
  useEffect(() => {
    const menus = mountBarMenus(actions.current, {})
    return () => menus.destroy()
  }, [])
  const playId = play?.level
  useEffect(() => remember(game, at, tab, field, playId, pageTask), [game, at, tab, field, playId, pageTask])

  // A game opened: its vocabulary; nothing pending.
  useEffect(() => {
    setVocab(null)
    setShown(null)
    setChecked(null)
    setRawNames(null)
    setOps([])
    setRedo([])
    call('vocabulary', { game }).then(setVocab)
  }, [game])
  useEffect(() => {
    call('preview', { game, check: false }).then((r) => { setBase(r.content); setHead(r.head) }).catch(() => setBase(null))
  }, [game, rev])

  const changeset = useMemo(() => ({ ...(why && { why }), ops }), [why, ops])
  const key = `${game}|${rev}|${JSON.stringify(changeset)}`
  const playRequest = useRef(null)
  useLayoutEffect(() => {
    playRequest.current = null
  }, [at, key, pageTask, go])

  // The quick preview of every change of the pending changeset.
  const seq = useRef(0)
  useEffect(() => {
    const no = ++seq.current
    setBusy(true)
    const timer = window.setTimeout(async () => {
      const r = await call('preview', { game, changeset, check: false }).catch((error) => ({ ok: false, problems: [error.message], content: null, failed: null }))
      if (no !== seq.current) return
      setLast(r)
      if (r.content) setShown({ ...r, ops: changeset.ops })
      setBusy(false)
    }, ops.length ? QUICK : 0)
    return () => window.clearTimeout(timer)
  }, [game, changeset, rev, ops.length])

  // The whole check: one at a time, always of the latest changeset once edits settle.
  const wanted = useRef(null)
  const checking = useRef(false)
  const runCheck = useCallback(async () => {
    if (checking.current) return
    checking.current = true
    for (;;) {
      const job = wanted.current
      const r = await call('preview', { game: job.game, changeset: job.changeset }).catch((error) => ({ ok: false, lines: [], problems: [error.message], failed: null }))
      if (wanted.current === job) {
        setChecked({ key: job.key, ok: r.ok, lines: r.lines ?? [], problems: r.problems ?? [], failed: r.failed, order: r.order ?? [] })
        break
      }
    }
    checking.current = false
  }, [])
  // The slow calls wait for the first content, so a game opens on its quick preview.
  const loaded = Boolean(shown)
  useEffect(() => {
    if (!loaded) return undefined
    wanted.current = { game, changeset, key }
    const timer = window.setTimeout(runCheck, changeset.ops.length ? SETTLE : 0)
    return () => window.clearTimeout(timer)
  }, [game, changeset, key, runCheck, loaded])

  // What links show (names), as the changeset leaves the game, once edits settle: asked again only when an operation
  // may change one (a level's id, place or title, game.json, the encyclopedia).
  const namesSeq = useRef(0)
  const naming = useMemo(() => JSON.stringify(ops.filter((op) => !['text.set', 'level.set', 'level.unset', 'level.blueprint'].includes(op.op) || String(op.path).startsWith('title') || op.in)), [ops])
  useEffect(() => {
    if (!loaded) return undefined
    const no = ++namesSeq.current
    const timer = window.setTimeout(() => call('names', { game, changeset: { ops: JSON.parse(naming) } }).then((r) => no === namesSeq.current && setRawNames({ ...r, stamp: no })).catch(() => {}), naming === '[]' ? 0 : SETTLE)
    return () => window.clearTimeout(timer)
  }, [game, naming, rev, loaded])

  const content = shown?.content ?? null
  // A domain that defines its parts as data names them by the game's pieces.json as the changeset leaves it.
  const vocab = useMemo(() => domainVocab && { ...domainVocab, vocabulary: withParts(domainVocab.vocabulary, content?.partDefs) }, [domainVocab, content])
  const pieceRoot = piecePath(at)
  const fresh = checked?.key === key
  // The check's lines: the whole check's when it is of these changes, else the quick one's (the content against its
  // vocabulary) over the last whole check's other lines.
  const lines = useMemo(() => {
    if (!checked) return shown?.lines ?? []
    if (fresh) return checked.lines
    return [...(shown?.lines ?? []), ...checked.lines.filter((l) => !l.text.startsWith('content: '))]
  }, [checked, fresh, shown])
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
  // Where the course first gives each piece (the names tool reads it off the components box): its type → a level.
  const earnedAt = useMemo(() => new Map((rawNames?.parts ?? []).filter((p) => p.at).map((p) => [p.piece, p.at])), [rawNames])
  const levelOptions = useMemo(() => {
    if (!content) return null
    const eraOf = new Map((content.eras ?? []).flatMap((era) => eraLevels(era).map((id) => [id, era])))
    const label = new Map((rawNames?.levels ?? []).map((l) => [l.id, l]))
    return content.levels.map((l) => {
      const era = eraOf.get(l.id)
      const shown = label.get(l.id)?.label ?? l.id
      return { value: l.id, label: shown, title: l.title, group: era ? `${era.id} ${L(era.title ?? era.chapter?.title) ?? ''}` : null, ...(shown !== l.id && { about: l.id }), ...(Array.isArray(l.tasks) && { tasks: l.tasks.map((task) => ({ id: task.id, ...(task.step && { step: task.step }) })) }) }
    }).sort((a, b) => playOrder.indexOf(a.value) - playOrder.indexOf(b.value))
  }, [content, rawNames, playOrder])

  // The pending changeset: an edit (standing for the last when it edits the same thing), several operations at once,
  // the last taken back and put again.
  const groupOptions = useMemo(() => {
    const placed = new Set((base?.eras ?? []).flatMap(eraLevels))
    return (levelOptions ?? []).filter(({ value }) => placed.has(value))
  }, [base, levelOptions])

  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const opsNow = useRef(ops)
  opsNow.current = ops
  const redoNow = useRef(redo)
  redoNow.current = redo
  const edit = useCallback((op) => { if (!savingRef.current) { setOps((list) => pushOp(list, op)); setRedo([]) } }, [])
  const addOps = useCallback((list, reason = null) => {
    if (savingRef.current) return
    setOps((now) => [...now, ...list])
    setRedo([])
    if (reason) setWhy((w) => w || reason)
  }, [])
  const back = useCallback((k) => {
    const now = opsNow.current
    if (k >= now.length) return
    setRedo((r) => [...r, ...now.slice(k).reverse()])
    setOps(now.slice(0, k))
  }, [])
  const again = useCallback(() => {
    const r = redoNow.current
    if (!r.length) return
    setOps((now) => [...now, r.at(-1)])
    setRedo(r.slice(0, -1))
  }, [])

  const select = (next, keep = false) => {
    const other = next?.level !== at?.level || next?.era !== at?.era || Boolean(next?.game) !== Boolean(at?.game) || Boolean(next?.glossary) !== Boolean(at?.glossary) || next?.part !== at?.part || next?.setting !== at?.setting
    setAt(next)
    setMoving(null)
    const root = piecePath(next)
    if (root) pickField(root)
    else if (other) setField(null)
    if (!keep) setPicked(new Set(next?.level ? [next.level] : []))
    if (next?.level && next.level !== play?.level) {
      setPlay({ level: next.level, seed: null, take: null })
      setPageTask(0)
    }
  }
  const openTreeItem = (next, keep) => {
    select(next, keep)
    pickField(selectionPath(next))
  }
  const removeLevel = (level) => {
    if (savingRef.current || !confirmDelete(level)) return
    edit({ op: 'level.remove', level })
    select(null)
    if (play?.level === level) { setPlay(null); setPageTask(0); setGo(null) }
  }
  const discard = () => {
    if (!window.confirm(tr('确定放弃所有待定操作吗？', 'Discard all pending operations?'))) return
    setOps([])
    setRedo([])
  }
  /** Find a field in the inspector. Search results keep the current workspace tab. */
  const jump = (level, path, file = null, { stayOnTab = false } = {}) => {
    const keys = path ? parsePath(path) : []
    if (file === 'glossary') {
      setCopyScope('glossary')
      if (!stayOnTab) setTab('copy')
      if (keys.length) {
        select({ glossary: true })
        pickField(keys, true)
      }
      return
    }
    if (level) select({ level })
    else if (file === 'pieces') select(keys[0] === 'settings' ? { setting: keys[1] } : { part: keys[1] })
    else if (keys[0] === 'eras') select({ era: keys[1] })
    else select({ game: true })
    if (!stayOnTab && !level && tab === 'page') setTab('fields')
    if (keys.length) pickField(keys, true)
    else setField(null)
  }
  /** A field into the side panel (opened if folded); a field of another task has the page play that task. */
  const pickField = (path, focus = false, pendingFace = null) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setField({ path, ...(focus && { focus }), ...(pendingFace && { pendingFace }) })
    if (path[0] === 'tasks' && Number.isInteger(path[1])) setGo({ task: path[1] })
  }
  /** Go to what a finding of the check is about: the field it names, else its level. */
  const jumpTo = (item) => {
    const place = places.find((p) => item.levels.includes(p.level) && p.path && item.text.endsWith(p.says))
    if (place) return jump(place.level, place.path)
    const game = /^content: game\.json((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (game) return jump(null, game[1].replace(/^\./, ''), 'game')
    if (/^content: glossary\.json/.test(item.text)) return jump(null, null, 'glossary')
    const part = /^content: pieces\.json\.(parts|settings)\.([^\s.:[]+)((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (part) {
      select(part[1] === 'parts' ? { part: part[2] } : { setting: part[2] })
      return pickField(parsePath(`${part[1]}.${part[2]}${part[3]}`), true)
    }
    if (item.levels[0]) select({ level: item.levels[0] })
  }
  // Play a level, opened on one of its boards (path) when given; `take`: the board is being edited there.
  const playLevel = async (level, path = null, take = false) => {
    const request = {}
    playRequest.current = request
    const seed = path ? await call('seed', { game, level, path, changeset: { ops } }) : null
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
    setTab('page')
  }
  // A board of the level edited in the game's own circuit editor, on the page: its 「用作 …」 writes it back.
  const onBoard = async (level, path) => {
    setTab('page')
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
    if (pieceRoot) return pickField(pieceRoot)
    if (play?.level) {
      if (at?.level !== play.level) select({ level: play.level })
      return pickField([])
    }
    select({ game: true }, true)
    return pickField([])
  }
  // A step of a built piece's upgrade chain clicked: its task, on the page and in the side panel.
  const onTaskGo = ({ task }) => {
    const found = findTask(content.levels, task)
    if (!found) return select({ level: task })
    select({ level: found.level })
    setPageTask(found.at)
    return pickField(['tasks', found.at])
  }
  // A tick of a piece's way through the course: its level, at the task and on the field that says it.
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
    if (m.part !== undefined || m.setting !== undefined) return onPartPage(m)
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
    const base = m.setting !== undefined ? ['settings', m.setting] : ['parts', m.part]
    const def = getAt(content?.partDefs, base)
    if (!def) return undefined
    const [key, face] = m.path
    if (key === 'views' && face) {
      const path = [...base, 'views', face]
      const pending = [...ops].reverse().find((op) => op.op === 'pieces.set' && !shown?.ops.includes(op) && showPath(op.path) === showPath(path))
      const existing = pending?.value ?? def.views?.[face]
      const list = existing ?? DEFAULT_VIEWS[face]
      const write = (value) => edit({ op: 'pieces.set', path, value })
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
    const blankOf = { rules: { set: {} }, checks: { holds: 'eq(1, 1)', say: { en: '' } } }
    edit({ op: 'pieces.set', path, value: [...list, (m.path.length === 1 && blankOf[key]) || blank(schema.of, { vocabulary: vocab.vocabulary, levels: playOrder })] })
    return pickField([...path, list.length], true)
  }
  const apply = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const r = await call('modify', { game, changeset: { ...changeset, by: 'studio' }, base: head })
      setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
      if (r.ok) {
        setOps([])
        setRedo([])
        setWhy('')
        setRev((n) => n + 1)
      }
    } catch (error) {
      setSaid({ ok: false, text: error.message })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  const undo = async (seq) => {
    const r = await call('undo', { game, seq })
    setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
    if (r.ok) setRev((n) => n + 1)
  }
  const move = (levels, to) => {
    if (levels.length === 1) edit({ op: 'level.move', level: levels[0], to })
    else addOps(bulkMove(levels, to))
    setMoving(null)
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
    const source = content.levels.find((entry) => entry.id === at?.level)
    const era = content.eras[at?.era ?? 0]
    if (!source && !era) return
    const taken = new Set(content.levels.flatMap((level) => [level.id, ...(level.tasks ?? []).map((task) => task.id)]))
    const level = freeName([...taken], 'level')
    const make = levelChoices[action]?.make
    const draft = action === 'copy' ? structuredClone(source) : {
      ...(firstTaskSchema ? { ...blank(vocab.vocabulary.level, newLevelContext), tasks: [make()] } : make()),
      title: T('新关卡', 'New level'),
    }
    delete draft.id
    if (draft.tasks) draft.tasks = draft.tasks.map((task) => {
      if (draft.tasks.length === 1) return { ...task, id: level }
      const id = freeName([...taken], `${level}_`)
      taken.add(id)
      return { ...task, id }
    })
    const to = source ? { after: source.id } : { era: era.id }
    edit({ op: 'level.add', level, data: draft, to })
    openTreeItem({ level })
  }
  const duplicate = (level, id) => {
    const { id: _, ...value } = content.levels.find((l) => l.id === level)
    edit({ op: 'level.add', level: id, data: value, to: { after: level } })
    select({ level: id })
  }
  const togglePanel = (which) => setLayout((l) => ({ ...l, [`${which}Open`]: !l[`${which}Open`] }))
  // The side panel's field: its control's context (as the forms had it), and the mark the page draws it with.
  const sideFile = at?.level ? { level: at.level } : pieceRoot ? { parts: true, root: pieceRoot } : at?.glossary ? { glossary: true } : at ? { game: true } : null
  const pendingFace = field?.pendingFace && ops.some((op) => op.op === 'pieces.set' && op.value === field.pendingFace && !shown?.ops.includes(op)) ? field.pendingFace : null
  const pageMark = field?.path && sideFile?.level && sideFile.level === play?.level ? { ...markOf(levelValue(sideFile.level), field.path), level: sideFile.level }
    : field?.path && at?.part !== undefined && field.path[0] === 'parts' && field.path[1] === at.part ? JSON.stringify(field.path.slice(2))
    : field?.path && at?.setting !== undefined && field.path[0] === 'settings' && field.path[1] === at.setting ? JSON.stringify(field.path.slice(2))
    : field?.path && sideFile?.game ? { file: 'game', path: JSON.stringify(field.path) }
    : field?.path && sideFile?.glossary ? { file: 'glossary', path: JSON.stringify(field.path[0] === 'entries' && Number.isInteger(field.path[1]) ? ['entries', content.glossary.entries[field.path[1]]?.id, ...field.path.slice(2)] : field.path) }
    : null
  const openSetting = (setting) => {
    setSide('settings')
    select({ setting })
  }
  const sideCtx = vocab && content && {
    vocabulary: vocab.vocabulary,
    levels: content.levels.map((l) => l.id),
    names,
    levelOptions,
    textField,
    lang,
    onSetting: openSetting,
    onSettings: () => setSide('settings'),
    onPiece: (part) => { setSide('parts'); select({ part }) },
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
    setSide('search')
    setLayout((l) => ({ ...l, treeOpen: true }))
    window.setTimeout(() => document.querySelector('.search input')?.focus())
  }

  // The studio's actions: the palette lists them, the keys run the same ones.
  const level = at?.level && content?.levels.some((l) => l.id === at.level) ? at.level : null
  const ACTIONS = [
    ['search', tr('在整款游戏里搜索、替换'), `${MOD}+Shift+F`, openSearch],
    ['copy', tr('文案表'), '', () => setTab('copy')],
    ['compare', tr('比较', 'Compare'), '', () => setTab('compare')],
    ['page', tr('画面：在游戏的页面上改'), '', () => { setTab('page'); setPageEdit(true) }],
    ['arrange', tr('编排关卡', 'Arrange levels'), '', () => setTab('arrange')],
    ['fields', tr('字段：这一关的全部字段'), '', () => setTab('fields')],
    ...(level ? [
      ['play-ref', tr('载入参考解试玩这一关'), `${level} · ${MOD}+Enter`, () => playFrom(level, true)],
      ['play', tr('试玩这一关（不显示编辑标记）'), level, () => { setPageEdit(false); playFrom(level, false) }],
      ['duplicate', tr('复制这一关成新的一关……'), level, (id) => duplicate(level, id), { placeholder: tr(`${level} 的副本的 id`, `The id of ${level}’s copy`), value: `${level}-2` }],
      ['rename', tr('给这一关换 id……'), level, (id) => { edit({ op: 'level.rename', level, to: id }); select({ level: id }) }, { placeholder: tr(`${level} 的新 id`, `${level}’s new id`), value: level }],
      ['move', tr('移动这一关'), level, () => setMoving([level])],
    ] : []),
    ['next', tr('下一处检查结果'), 'F8', () => window.dispatchEvent(new CustomEvent('studio:finding', { detail: 1 }))],
    ['previous', tr('上一处检查结果'), 'Shift+F8', () => window.dispatchEvent(new CustomEvent('studio:finding', { detail: -1 }))],
    ...(ops.length ? [['drop', tr('去掉最后一个待定操作'), `${MOD}+Z`, () => back(ops.length - 1)]] : []),
    ...(redo.length ? [['redo', tr('放回去掉的操作'), `${MOD}+Shift+Z`, again]] : []),
    ...(ops.length ? [['review', tr(`看 ${ops.length} 个待定操作`, `Review ${ops.length} pending`), '', () => setTab('review')], ['discard', tr('全部放弃'), '', discard]] : []),
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
    if (item.kind === 'level') { select({ level: item.level }); if (!['page', 'arrange', 'fields'].includes(tab)) setTab('page'); return undefined }
    if (item.kind === 'era') { select({ era: item.era }); if (tab !== 'arrange') setTab('fields'); return undefined }
    if (item.kind === 'field' || item.kind === 'recent') return jump(item.level, item.path, item.level ? null : 'game')
    if (item.kind === 'entry') { setCopyScope('glossary'); setTab('copy'); return undefined }
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
    else if (mod && k === 'z' && !editable(document.activeElement)) { e.preventDefault(); if (e.shiftKey) again(); else back(opsNow.current.length - 1) }
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
  const result = { ok: fresh && checked.ok, problems: last && !last.content ? last.problems : fresh ? checked.problems : [], failed: last?.failed ?? null, says: last?.says ?? shown?.says, fresh }
  const pickedIds = playOrder.filter((id) => picked.has(id))
  const selectedScope = copyScope ?? (at?.era !== undefined ? at.era : at?.level ? (content?.eras ?? []).findIndex((era) => eraLevels(era).includes(at.level)) : 'all')
  const scope = selectedScope === -1 ? 'all' : selectedScope
  const shownLayout = resize ? { ...layout, [resize.side]: resize.size } : layout
  const style = { '--tree-w': `${layout.treeOpen ? shownLayout.tree : 0}px`, '--audit-h': `${shownLayout.audit}px`, '--side-w': `${layout.sideOpen ? shownLayout.side : 0}px` }
  const resizer = { setLayout, previewResize: setResize, dragging: resize !== null }
  return (
    <div className={`studio ${moving ? 'is-moving' : ''} ${resize ? 'is-resizing' : ''}`}>
      <header className="kit-bar studio-bar">
        <span className="kit-brand"><i className="kit-chip" aria-hidden="true" /></span>
        <select className="studio-game" value={game} disabled={saving} onChange={(e) => { setGame(e.target.value); select(null); setPlay(null) }} aria-label={tr('游戏', 'Game')}>
          {GAMES.map((g) => <option key={g.id} value={g.id}>{tr(g.title, g.en)}</option>)}
        </select>
        <nav className="studio-tabs" role="tablist">
          {TABS.map(([id, zh, en]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`studio-tab ${tab === id ? 'is-on' : ''}`} onClick={() => setTab(id)}>
              {tr(zh, en)}{id === 'review' && ops.length > 0 && <b className={`studio-count ${last?.failed !== null && last?.failed !== undefined ? 'is-fail' : ''}`}>{ops.length}</b>}
            </button>
          ))}
        </nav>
        <span className="kit-spacer" />
        <button type="button" className="studio-palette" onClick={() => openOverlay('palette')} title={tr('命令面板')}><Command size={13} aria-hidden="true" /><kbd>{MOD}K</kbd></button>
        <i className={`studio-busy ${busy || !fresh ? 'is-on' : ''}`} aria-hidden="true" />
        <div className="kit-actions" ref={actions} />
      </header>
      {!ready ? <div className="studio-loading">{tr('读取中……')}</div> : (
        <div className={`studio-body is-${tab} ${layout.treeOpen ? '' : 'no-tree'} ${layout.auditOpen ? '' : 'no-audit'} ${layout.sideOpen ? '' : 'no-side'}`} style={style}>
          <aside className="studio-tree">
            <div className="side-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={side === 'tree'} className={side === 'tree' ? 'is-on' : ''} onClick={() => setSide('tree')} title={tr('课程')}><ListTree size={14} aria-hidden="true" /></button>
              <button type="button" role="tab" aria-selected={side === 'search'} className={side === 'search' ? 'is-on' : ''} onClick={openSearch} title={`${tr('搜索')} (${MOD}+Shift+F)`}><SearchIcon size={14} aria-hidden="true" /></button>
              {content.partDefs && <button type="button" role="tab" aria-selected={side === 'parts'} className={side === 'parts' ? 'is-on' : ''} onClick={() => setSide('parts')} title={tr('件', 'Pieces')}><Shapes size={14} aria-hidden="true" /></button>}
              <button type="button" role="tab" aria-selected={side === 'settings'} className={side === 'settings' ? 'is-on' : ''} onClick={() => setSide('settings')} title={tr('设置', 'Settings')}><SlidersHorizontal size={14} aria-hidden="true" /></button>
            </div>
            {side === 'settings'
              ? <SettingsList key={game} file={content.partDefs} vocabulary={vocab.vocabulary} selected={at?.setting} onSelect={openSetting} onEdit={edit} />
              : side === 'parts' && content.partDefs
              ? <PartsList content={content} vocabulary={vocab.vocabulary} levelOptions={levelOptions} order={playOrder} earned={earnedAt} at={at} found={(type) => places.filter((p) => p.file === 'parts' && p.path?.[1] === type).length} onSelect={select} onEdit={edit} />
              : side === 'search'
              ? <Search content={content} vocabulary={vocab.vocabulary} onAdd={addOps} onJump={(level, path, file) => jump(level, path, file, { stayOnTab: true })} />
              : <Tree game={game} content={content} entries={groupModel.groups} at={at} selectedTask={field?.path?.[0] === 'tasks' ? field.path[1] ?? null : null} picked={picked} setPicked={setPicked} onSelect={openTreeItem} moving={moving} setMoving={setMoving} onMove={move} labels={rawNames?.levels} onTask={(task) => onTaskGo({ task })} onTaskMove={moveTask}
                  addOptions={[
                    ...(content.eras.length && levelChoices.length ? [{
                      value: levelChoices.length === 1 ? levelChoices[0].value : 'blank',
                      label: tr('空白关卡', 'Blank level'),
                      ...(levelChoices.length > 1 && { children: levelChoices }),
                    }] : []),
                    ...(at?.level && content.levels.some((level) => level.id === at.level) ? [{ value: 'copy', label: tr('复制所选关卡', 'Duplicate selected level') }] : []),
                  ]} onAdd={addLevel} /> }
          </aside>
          <PanelResizer side="tree" size={layout.tree} open={layout.treeOpen} {...resizer} />
          <main className="studio-main">
            {tab !== 'page' && (
              <div className="studio-scroll">
                {tab === 'arrange' && (
                  <Arrangement key={game} content={content} groups={groupModel.groups} at={at} options={levelOptions} pending={saving || shown.ops !== ops}
                    save={{ dirty: ops.length > 0, problems: result.problems, ready: result.ok && ops.length > 0 && !saving, saving, said: ops.length && said?.ok ? null : said, apply }}
                    onSelect={select}
                    onEdit={edit} onMove={(id) => { setSide('tree'); setLayout((value) => ({ ...value, treeOpen: true })); setMoving([id]) }} />
                )}
                {tab === 'groups' && <CourseGroups key={game} model={groupModel} options={groupOptions} />}
                {tab === 'fields' && <Editor content={content} base={base} vocab={vocab} at={at} picked={pickedIds} field={field} places={places} names={names} levelOptions={levelOptions} playOrder={playOrder} onEdit={edit} onOps={addOps} onSelect={select} onPick={(path) => pickField(path)} onPlay={playFrom} onMove={setMoving} onRemoveLevel={removeLevel} onCopy={(era) => { setCopyScope(era); setTab('copy') }} />}
                {tab === 'copy' && (
                  <article className="editor is-wide">
                    <CopyTable content={content} vocabulary={vocab.vocabulary} scope={scope} setScope={setCopyScope} order={playOrder} names={names} places={places} onEdit={edit} onJump={(row) => jump(row.file.level ?? null, row.path, row.file.glossary ? 'glossary' : row.file.parts ? 'pieces' : row.file.level ? null : 'game')} />
                  </article>
                )}
                {tab === 'compare' && <Compare game={game} content={content} base={base} at={at} levelOptions={levelOptions} onJump={(lvl, path) => jump(lvl, path)} />}
                {tab === 'review' && (
                  <Review
                    ops={ops} redo={redo} result={result} shown={shown} why={why} setWhy={setWhy} said={said}
                    onRemove={(k) => { if (confirmDelete(ops[k].op)) { setOps((list) => list.filter((_, i) => i !== k)); setRedo([]) } }} onBack={back} onRedo={again}
                    onDiscard={discard} onOpen={(cs) => { setOps(cs.ops); setRedo([]); setWhy(cs.why ?? '') }} onApply={apply} onUndo={undo} onSelect={(lvl) => { select({ level: lvl }); setTab('page') }}
                  />
                )}
              </div>
            )}
            <GameFrame
              visible={tab === 'page'} content={content} play={play} part={at?.part ?? (at?.setting !== undefined ? `settings/${at.setting}` : undefined)} task={pageTask} go={go} edit={pageEdit} picked={pageEdit ? pageMark : null} onEdit={setPageEdit} onMessage={onPage} onRoot={onRoot}
              reference={play && referenceOf(play.level)} onReference={playLevel} onCancelTake={() => setPlay((p) => ({ ...p, seed: null, take: null }))}
              footer={at?.part !== undefined && <Flow game={game} piece={at.part} changeset={changeset} label={levelLabel(names)} onOpen={onFlow} />}
            />
          </main>
          <PanelResizer side="side" size={layout.side} open={layout.sideOpen} {...resizer} />
          <aside className="studio-side">
            {sideCtx && <Inspector content={content} vocab={vocab} at={sideFile} field={field} pendingFace={pendingFace} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps} onPick={(path) => pickField(path)} onLevel={(lvl, path) => { select({ level: lvl }); pickField(path) }} onRemoveLevel={removeLevel} onRemoveSelection={() => select(null)} />}
          </aside>
          {layout.auditOpen && <PanelResizer side="audit" size={layout.audit} open {...resizer} />}
          <aside className="studio-audit">
            <Audit items={items} fresh={fresh} last={last} at={at} busy={busy} ops={ops} migration={shown.migration} open={layout.auditOpen} onToggle={() => togglePanel('audit')} onJump={jumpTo} onReview={() => setTab('review')} />
          </aside>
        </div>
      )}
      {overlay === 'palette' && ready && <Palette items={paletteItems} onRun={runItem} onClose={closeOverlay} />}
      {overlay === 'keys' && <Shortcuts onClose={closeOverlay} />}
    </div>
  )
}
