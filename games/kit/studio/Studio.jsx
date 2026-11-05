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
// The page: the tree (or search, or the game's parts: parts.json) on the left; in the middle the level as the game shows it, which is where it is
// edited (GameFrame.jsx: a click on a field on screen picks it, a + adds an item), or its fields as rows, its copy, a
// comparison, the changes; the field picked in the side panel on the right (Inspector.jsx), with its control; the
// audit in a drawer under the middle. Each folds away and resizes (remembered per viewer, prefs.js); the command
// palette (Ctrl/⌘+K) reaches every place and action, ? lists the keys.
import './studio.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Command, ListTree, Search as SearchIcon, Shapes } from 'lucide-react'
import { GAMES } from '../../games.js'
import { mountBarMenus } from '../menu.js'
import { L, getLang, tr } from '../shell/i18n.js'
import { eraLevels } from '../course.js'
import { find } from '../engine/schema.js'
import { parsePath, showPath } from '../engine/ops/edit.js'
import { call } from './api.js'
import { boardsOf, placesOf, pushOp, referenceFor } from './form.js'
import { addFor, markOf, markPath } from './marks.js'
import { hasTasks } from '../engine/tasks.js'
import { withParts } from '../engine/parts/define.js'
import { DEFAULT_VIEWS } from '../shell/parts/PartFace.jsx'
import PartsList from './PartsList.jsx'
import { itemOf, marksOf } from './worklist.js'
import { paletteIndex } from './palette.js'
import { bulkMove } from './bulk.js'
import { usePref } from './prefs.js'
import Tree from './Tree.jsx'
import Search from './Search.jsx'
import Editor from './Editor.jsx'
import CopyTable from './CopyTable.jsx'
import Compare from './Compare.jsx'
import Audit from './Audit.jsx'
import Review from './Review.jsx'
import GameFrame from './GameFrame.jsx'
import Inspector from './Inspector.jsx'
import { textField } from './copy.js'
import Palette from './Palette.jsx'
import Shortcuts, { MOD } from './Shortcuts.jsx'

const QUERY = new URLSearchParams(window.location.search)
const TABS = [['page', '画面', 'Page'], ['fields', '字段', 'Fields'], ['copy', '文案', 'Copy'], ['compare', '比较', 'Compare'], ['review', '变更', 'Changes']]
const QUICK = 120 // ms after an edit before its content is previewed
const SETTLE = 700 // ms after the last edit before the whole check starts
const SIZE = { tree: [180, 640], audit: [90, 900], side: [260, 900] } // px: the tree's width, the audit drawer's height, the side panel's width

/** Keep the studio's place in the address: the game, what is selected, the tab. */
const remember = (game, at, tab) => {
  const url = new URL(window.location.href)
  url.searchParams.set('game', game)
  for (const k of ['level', 'era', 'part', 'preset']) url.searchParams.delete(k)
  if (at?.level) url.searchParams.set('level', at.level)
  if (at?.era !== undefined) url.searchParams.set('era', at.era)
  if (at?.part !== undefined) url.searchParams.set('part', at.part)
  if (at?.preset !== undefined) url.searchParams.set('preset', at.preset)
  url.searchParams.set('tab', tab)
  window.history.replaceState({}, '', url)
}
const editable = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * The handle beside the tree (across, for its width) or above the audit drawer (along, for its height): drag to
 * resize, double-click (or Enter) to fold, arrows to nudge.
 */
function Resizer({ side, size, open, setLayout }) {
  const set = (patch) => setLayout((l) => ({ ...l, ...patch }))
  const across = side !== 'audit'
  const clamp = (n) => Math.max(SIZE[side][0], Math.min(SIZE[side][1], n))
  // The side panel is on the right: dragging left widens it.
  const sign = side === 'side' ? -1 : 1
  // The handle captures the pointer, so the drag ends wherever it is let go — over the game's iframe too, which would
  // otherwise take the pointerup for itself; while it lasts the iframe takes no pointer at all (studio.css). A drag
  // whose letting go never arrived (the window lost focus, a browser that dropped it) ends at the next move made with
  // no button down.
  const drag = (e) => {
    if (!open || e.button !== 0) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    document.body.classList.add('is-resizing')
    const at0 = across ? e.clientX : e.clientY
    const ENDS = ['pointerup', 'pointercancel', 'lostpointercapture']
    const end = () => {
      document.body.classList.remove('is-resizing')
      for (const type of ['pointermove', ...ENDS]) window.removeEventListener(type, on, true)
      window.removeEventListener('blur', end)
    }
    const on = (ev) => {
      if (ENDS.includes(ev.type) || ev.buttons === 0) return end()
      set({ [side]: clamp(across ? size + sign * (ev.clientX - at0) : size - (ev.clientY - at0)) })
    }
    for (const type of ['pointermove', ...ENDS]) window.addEventListener(type, on, true)
    window.addEventListener('blur', end)
  }
  return (
    <div
      className={`studio-resize is-${side} ${open ? '' : 'is-shut'}`} role="separator" aria-orientation={across ? 'vertical' : 'horizontal'} tabIndex={0} aria-label={tr('拖动改大小，双击收起', 'Drag to resize, double-click to fold')}
      onPointerDown={drag} onDoubleClick={() => set({ [`${side}Open`]: !open })} onClick={() => !open && set({ [`${side}Open`]: true })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') set({ [`${side}Open`]: !open })
        const nudge = across ? sign * { ArrowRight: 16, ArrowLeft: -16 }[e.key] : { ArrowUp: 16, ArrowDown: -16 }[e.key]
        if (nudge) set({ [side]: clamp(size + nudge) })
      }}
    />
  )
}

export default function Studio() {
  const [game, setGame] = useState(QUERY.get('game') ?? GAMES[0].id)
  const [domainVocab, setVocab] = useState(null) // the domain's vocabulary; `vocab` below adds the game's parts
  const [ops, setOps] = useState([])
  const [redo, setRedo] = useState([]) // operations taken back, the last first to come back
  const [why, setWhy] = useState('')
  const [shown, setShown] = useState(null) // the last quick preview that left a content
  const [last, setLast] = useState(null) // the last quick preview (an operation may have failed)
  const [checked, setChecked] = useState(null) // the last whole check: { key, ok, lines, problems }
  const [base, setBase] = useState(null) // the content as written, before the pending changes
  const [rawNames, setRawNames] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0) // bumped when the files change (apply, undo)
  const [at, setAt] = useState(() => (QUERY.get('level') ? { level: QUERY.get('level') } : QUERY.get('era') ? { era: Number(QUERY.get('era')) } : QUERY.get('part') ? { part: QUERY.get('part') } : QUERY.get('preset') ? { preset: QUERY.get('preset') } : null))
  const [picked, setPicked] = useState(() => new Set(QUERY.get('level') ? [QUERY.get('level')] : []))
  const [tab, setTab] = useState(() => (TABS.some(([id]) => id === QUERY.get('tab')) ? QUERY.get('tab') : 'page'))
  const [play, setPlay] = useState(() => (QUERY.get('level') ? { level: QUERY.get('level'), seed: null, take: null } : null)) // { level, seed, take }
  const [field, setField] = useState(null) // the field in the side panel: { path, focus? } | { missing } | null
  const [pageEdit, setPageEdit] = usePref('page-edit', true) // the page as the editor, or the game alone
  const [pageTask, setPageTask] = useState(0) // the task the page plays
  const [go, setGo] = useState(null) // a task for the page to go to: { task }
  const [moving, setMoving] = useState(null) // the levels being moved in the tree
  const [said, setSaid] = useState(null) // what the last apply or undo said
  const [runs, setRuns] = useState({}) // test runs: `${level}|${path}` → the run_tests answer
  const [layout, setLayout] = usePref('layout', { tree: 240, audit: 220, side: 380, treeOpen: true, auditOpen: true, sideOpen: true })
  const [side, setSide] = usePref('side', 'tree')
  const [copyScope, setCopyScope] = useState(null) // the copy tab's scope: an era's index, 'all' or 'glossary'
  const [overlay, setOverlay] = useState(null) // 'palette' | 'keys'
  const [, setLang] = useState(getLang)

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
  useEffect(() => remember(game, at, tab), [game, at, tab])

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
    call('preview', { game, check: false }).then((r) => setBase(r.content)).catch(() => setBase(null))
  }, [game, rev])

  const changeset = useMemo(() => ({ ...(why && { why }), ops }), [why, ops])
  const key = `${game}|${rev}|${JSON.stringify(changeset)}`

  // The quick preview of every change of the pending changeset.
  const seq = useRef(0)
  useEffect(() => {
    const no = ++seq.current
    setBusy(true)
    setRuns({})
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

  // The selected level drawn by its domain, where the domain draws one (render's scene), as the changeset leaves it,
  // once edits settle; a domain that draws no scene is not asked again.
  const [scene, setScene] = useState(null)
  const drawless = useRef(new Set())
  const sceneOf = at?.level && shown?.content.levels.some((l) => l.id === at.level) ? at.level : null
  useEffect(() => {
    if (!sceneOf || drawless.current.has(game)) return setScene(null)
    const timer = window.setTimeout(() => call('render', { game, level: sceneOf, format: 'svg', changeset }).then((r) => {
      if (r.draws === false) drawless.current.add(game)
      setScene(r.scene)
    }).catch(() => setScene(null)), changeset.ops.length ? SETTLE : 0)
    return () => window.clearTimeout(timer)
  }, [game, sceneOf, changeset])

  const content = shown?.content ?? null
  // A domain that defines its parts as data names them by the game's parts.json as the changeset leaves it.
  const vocab = useMemo(() => domainVocab && { ...domainVocab, vocabulary: withParts(domainVocab.vocabulary, content?.partDefs) }, [domainVocab, content])
  const atPart = at?.part !== undefined || at?.preset !== undefined
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
  const marks = useMemo(() => (content && vocab ? marksOf(content, vocab.vocabulary, items, fresh) : null), [content, vocab, items, fresh])
  const names = useMemo(() => rawNames && {
    level: new Map(rawNames.levels.map((l) => [l.id, l])),
    part: new Map(rawNames.parts.map((p) => [p.key, p.name])),
    wiki: new Map(rawNames.entries.map((e) => [e.id, e.title])),
    quotes: rawNames.quotes,
    stamp: rawNames.stamp,
    onLevel: (id) => select({ level: id }),
  }, [rawNames]) // eslint-disable-line react-hooks/exhaustive-deps
  const playOrder = useMemo(() => (rawNames ? rawNames.levels.map((l) => l.id) : content?.levels.map((l) => l.id) ?? []), [rawNames, content])
  const levelOptions = useMemo(() => {
    if (!content) return null
    const eraOf = new Map((content.eras ?? []).flatMap((era) => eraLevels(era).map((id) => [id, era])))
    const label = new Map((rawNames?.levels ?? []).map((l) => [l.id, l]))
    return content.levels.map((l) => {
      const era = eraOf.get(l.id)
      const shown = label.get(l.id)?.label ?? l.id
      return { value: l.id, label: shown, title: l.title, group: era ? `${era.id} ${L(era.title ?? era.chapter?.title) ?? ''}` : null, ...(shown !== l.id && { about: l.id }) }
    }).sort((a, b) => playOrder.indexOf(a.value) - playOrder.indexOf(b.value))
  }, [content, rawNames, playOrder])

  // The pending changeset: an edit (standing for the last when it edits the same thing), several operations at once,
  // the last taken back and put again.
  const opsNow = useRef(ops)
  opsNow.current = ops
  const redoNow = useRef(redo)
  redoNow.current = redo
  const edit = useCallback((op) => { setOps((list) => pushOp(list, op)); setRedo([]) }, [])
  const addOps = useCallback((list, reason = null) => {
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
    const other = next?.level !== at?.level || next?.era !== at?.era || Boolean(next?.game) !== Boolean(at?.game) || next?.part !== at?.part || next?.preset !== at?.preset
    setAt(next)
    setMoving(null)
    if (other) setField(null)
    if (!keep) setPicked(new Set(next?.level ? [next.level] : []))
    if (next?.level && next.level !== play?.level) {
      setPlay({ level: next.level, seed: null, take: null })
      setPageTask(0)
    }
  }
  /** Go to a field: of a level, of game.json (an era's, or the game's) — in the side panel — or of the encyclopedia (the copy table). */
  const jump = (level, path, file = null) => {
    const keys = path ? parsePath(path) : []
    if (file === 'glossary') {
      setCopyScope('glossary')
      setTab('copy')
      return
    }
    if (level) select({ level })
    else if (keys[0] === 'eras') select({ era: keys[1] })
    else select({ game: true })
    if (!level && tab === 'page') setTab('fields')
    if (keys.length) pickField(keys, true)
    else setField(null)
  }
  /** A field into the side panel (opened if folded); a field of another task has the page play that task. */
  const pickField = (path, focus = false) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setField({ path, ...(focus && { focus }) })
    if (path[0] === 'tasks' && Number.isInteger(path[1])) setGo({ task: path[1] })
  }
  /** Go to what a finding of the check is about: the field it names, else its level. */
  const jumpTo = (item) => {
    const place = places.find((p) => item.levels.includes(p.level) && p.path && item.text.endsWith(p.says))
    if (place) return jump(place.level, place.path)
    const game = /^content: game\.json((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (game) return jump(null, game[1].replace(/^\./, ''), 'game')
    if (/^content: glossary\.json/.test(item.text)) return jump(null, null, 'glossary')
    const part = /^content: parts\.json\.(parts|presets)\.([^\s.:[]+)((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (part) {
      select(part[1] === 'parts' ? { part: part[2] } : { preset: part[2] })
      return pickField(parsePath(`${part[1]}.${part[2]}${part[3]}`), true)
    }
    if (item.levels[0]) select({ level: item.levels[0] })
  }
  // Play a level, opened on one of its boards (path) when given; `take`: the board is being edited there.
  const playLevel = async (level, path = null, take = false) => {
    const seed = path ? await call('seed', { game, level, path, changeset: { ops } }) : null
    setPlay({ level, seed: seed?.data !== undefined ? seed : null, take: take ? { path, label: tr(`用作 ${path}`, `Use as ${path}`) } : null })
    if (seed?.task !== null && seed?.task !== undefined) setPageTask(seed.task)
  }
  // The path of a level's reference board, or null for a level without boards.
  const referenceOf = (level) => {
    const value = content?.levels.find((l) => l.id === level)
    const ref = value && boardsOf(vocab.vocabulary, value).reference
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
  const onPage = (m) => {
    if (m.type === 'take') return onTake(m)
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
    const def = content?.partDefs?.parts?.[m.part]
    if (!def) return undefined
    const base = ['parts', m.part]
    const [key, face] = m.path
    // A face is written as a whole list of blocks (the views object too, when the part has none yet).
    const setFace = (list) => edit(def.views ? { op: 'parts.set', path: [...base, 'views', face], value: list } : { op: 'parts.set', path: [...base, 'views'], value: { [face]: list } })
    const shownOf = () => JSON.parse(JSON.stringify(def.views?.[face] ?? DEFAULT_VIEWS[face]))
    // A face still drawn by default is written out as its default blocks when it is first picked.
    if (m.type === 'pick' && key === 'views' && face && !def.views?.[face]) setFace(shownOf())
    if (m.type === 'pick') return pickField([...base, ...m.path], true)
    if (key === 'views') {
      const list = shownOf()
      setFace([...list, { show: 'text', text: { zh: '', en: '' } }])
      return pickField([...base, 'views', face, list.length], true)
    }
    const list = def[key] ?? []
    const blankOf = { rules: { set: {} }, checks: { holds: 'eq(1, 1)', say: { zh: '', en: '' } } }
    edit({ op: 'parts.set', path: [...base, key], value: [...list, blankOf[key]] })
    return pickField([...base, key, list.length], true)
  }
  const apply = async () => {
    const r = await call('modify', { game, changeset })
    setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
    if (r.ok) {
      setOps([])
      setRedo([])
      setWhy('')
      setRev((n) => n + 1)
    }
  }
  const undo = async () => {
    const r = await call('undo', { game })
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
  const duplicate = (level, id) => {
    const { id: _, ...value } = content.levels.find((l) => l.id === level)
    edit({ op: 'level.add', level: id, data: value, to: { after: level } })
    select({ level: id })
  }
  const tests = {
    of: (level, path) => runs[`${level}|${showPath(path)}`] ?? null,
    run: async (level, path) => {
      const k = `${level}|${showPath(path)}`
      const value = content.levels.find((l) => l.id === level)
      const board = referenceFor(vocab.vocabulary, value, path)
      if (!board) return setRuns((r) => ({ ...r, [k]: { covered: false, why: tr('这一关没有参考解', 'The level has no reference') } }))
      setRuns((r) => ({ ...r, [k]: { running: true } }))
      const answer = await call('run_tests', { game, level, path: showPath(board), changeset }).catch((error) => ({ covered: false, why: error.message }))
      setRuns((r) => ({ ...r, [k]: answer }))
    },
  }
  const togglePanel = (which) => setLayout((l) => ({ ...l, [`${which}Open`]: !l[`${which}Open`] }))
  // The side panel's field: its control's context (as the forms had it), and the mark the page draws it with.
  const sideFile = at?.level && content?.levels.some((l) => l.id === at.level) ? { level: at.level } : atPart ? { parts: true } : at ? { game: true } : null
  const pageMark = field?.path && sideFile?.level && sideFile.level === play?.level ? { ...markOf(levelValue(sideFile.level), field.path), level: sideFile.level }
    : field?.path && at?.part !== undefined && field.path[0] === 'parts' && field.path[1] === at.part ? JSON.stringify(field.path.slice(2)) : null
  const sideCtx = vocab && content && {
    vocabulary: vocab.vocabulary,
    levels: content.levels.map((l) => l.id),
    names,
    levelOptions,
    textField,
    ...(sideFile?.level && {
      onBoard: (path) => onBoard(sideFile.level, showPath(path)),
      tests: { of: (path) => tests.of(sideFile.level, path), run: (path) => tests.run(sideFile.level, path) },
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
    ['search', tr('在整款游戏里搜索、替换', 'Search and replace across the game'), `${MOD}+Shift+F`, openSearch],
    ['copy', tr('文案表', 'Copy table'), '', () => setTab('copy')],
    ['compare', tr('比较', 'Compare'), '', () => setTab('compare')],
    ['page', tr('画面：在游戏的页面上改', 'Page: edit on the game’s own page'), '', () => { setTab('page'); setPageEdit(true) }],
    ['fields', tr('字段：这一关的全部字段', 'Fields: every field of the level'), '', () => setTab('fields')],
    ...(level ? [
      ['play-ref', tr('载入参考解试玩这一关', 'Play this level with its reference'), `${level} · ${MOD}+Enter`, () => playFrom(level, true)],
      ['play', tr('试玩这一关（不显示编辑标记）', 'Play this level (no edit marks)'), level, () => { setPageEdit(false); playFrom(level, false) }],
      ['duplicate', tr('复制这一关成新的一关……', 'Duplicate this level as…'), level, (id) => duplicate(level, id), { placeholder: tr(`${level} 的副本的 id`, `The id of ${level}’s copy`), value: `${level}-2` }],
      ['rename', tr('给这一关换 id……', 'Rename this level…'), level, (id) => { edit({ op: 'level.rename', level, to: id }); select({ level: id }) }, { placeholder: tr(`${level} 的新 id`, `${level}’s new id`), value: level }],
      ['move', tr('移动这一关', 'Move this level'), level, () => setMoving([level])],
    ] : []),
    ['next', tr('下一处检查结果', 'Next finding'), 'F8', () => window.dispatchEvent(new CustomEvent('studio:finding', { detail: 1 }))],
    ['previous', tr('上一处检查结果', 'Previous finding'), 'Shift+F8', () => window.dispatchEvent(new CustomEvent('studio:finding', { detail: -1 }))],
    ...(ops.length ? [['drop', tr('去掉最后一个待定操作', 'Drop the last pending operation'), `${MOD}+Z`, () => back(ops.length - 1)]] : []),
    ...(redo.length ? [['redo', tr('放回去掉的操作', 'Put a dropped operation back'), `${MOD}+Shift+Z`, again]] : []),
    ...(ops.length ? [['review', tr(`看 ${ops.length} 个待定操作`, `Review ${ops.length} pending`), '', () => setTab('review')], ['discard', tr('全部放弃', 'Discard all'), '', () => setOps([])]] : []),
    ['tree', tr('收起或打开左栏', 'Fold the left panel'), 'Alt+[', () => togglePanel('tree')],
    ['audit', tr('收起或打开检查栏', 'Fold the audit drawer'), 'Alt+]', () => togglePanel('audit')],
    ['side', tr('收起或打开侧栏', 'Fold the side panel'), 'Alt+\\', () => togglePanel('side')],
    ['keys', tr('快捷键', 'Keys'), '?', () => setOverlay('keys')],
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
  const paletteItems = useMemo(() => (overlay === 'palette' && content ? paletteIndex({ content, labels: rawNames?.levels, level, fields, items, recent, actions: ACTIONS.map((a) => ({ id: a.id, label: a.label, keys: a.keys })), lang: getLang() }).map((it) => (it.kind === 'action' ? { ...it, ask: ACTIONS.find((a) => a.id === it.action)?.ask } : it)) : []), [overlay]) // eslint-disable-line react-hooks/exhaustive-deps
  const runItem = (item, word) => {
    if (item.kind === 'action') return ACTIONS.find((a) => a.id === item.action)?.run(word)
    if (item.kind === 'level') { select({ level: item.level }); if (!['page', 'fields'].includes(tab)) setTab('page'); return undefined }
    if (item.kind === 'era') { select({ era: item.era }); setTab('fields'); return undefined }
    if (item.kind === 'field' || item.kind === 'recent') return jump(item.level, item.path, item.level ? null : 'game')
    if (item.kind === 'entry') { setCopyScope('glossary'); setTab('copy'); return undefined }
    if (item.kind === 'finding') return jumpTo(item.finding)
    return undefined
  }

  // The keys (Shortcuts.jsx lists them).
  const keyRef = useRef(null)
  keyRef.current = (e) => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && k === 'k') { e.preventDefault(); setOverlay((o) => (o === 'palette' ? null : 'palette')) }
    else if (mod && e.shiftKey && k === 'f') { e.preventDefault(); openSearch() }
    else if (mod && k === 'z' && !editable(document.activeElement)) { e.preventDefault(); if (e.shiftKey) again(); else back(opsNow.current.length - 1) }
    else if (mod && e.key === 'Enter' && level) { e.preventDefault(); playFrom(level, true) }
    else if (e.altKey && e.code === 'BracketLeft') { e.preventDefault(); togglePanel('tree') }
    else if (e.altKey && e.code === 'BracketRight') { e.preventDefault(); togglePanel('audit') }
    else if (e.altKey && e.code === 'Backslash') { e.preventDefault(); togglePanel('side') }
    else if (e.key === '?' && !mod && !editable(document.activeElement)) { e.preventDefault(); setOverlay('keys') }
    else if (e.key === 'Escape' && picked.size > 1 && !overlay) setPicked(new Set(at?.level ? [at.level] : []))
  }
  useEffect(() => {
    const key = (e) => keyRef.current(e)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const ready = content && vocab
  const result = { ok: fresh && checked.ok, problems: last && !last.content ? last.problems : fresh ? checked.problems : [], failed: last?.failed ?? null, says: last?.says ?? shown?.says, fresh }
  const pickedIds = playOrder.filter((id) => picked.has(id))
  const scope = copyScope ?? (at?.era !== undefined ? at.era : at?.level ? (content?.eras ?? []).findIndex((era) => eraLevels(era).includes(at.level)) : 'all')
  const style = { '--tree-w': `${layout.treeOpen ? layout.tree : 0}px`, '--audit-h': `${layout.audit}px`, '--side-w': `${layout.sideOpen ? layout.side : 0}px` }
  return (
    <div className={`studio ${moving ? 'is-moving' : ''}`}>
      <header className="kit-bar studio-bar">
        <span className="kit-brand"><i className="kit-chip" aria-hidden="true" /></span>
        <select className="studio-game" value={game} onChange={(e) => { setGame(e.target.value); select(null); setPlay(null) }} aria-label={tr('游戏', 'Game')}>
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
        <button type="button" className="studio-palette" onClick={() => setOverlay('palette')} title={tr('命令面板', 'Command palette')}><Command size={13} aria-hidden="true" /><kbd>{MOD}K</kbd></button>
        <i className={`studio-busy ${busy || !fresh ? 'is-on' : ''}`} aria-hidden="true" />
        <div className="kit-actions" ref={actions} />
      </header>
      {!ready ? <div className="studio-loading">{tr('读取中……', 'Loading…')}</div> : (
        <div className={`studio-body is-${tab} ${layout.treeOpen ? '' : 'no-tree'} ${layout.auditOpen ? '' : 'no-audit'} ${layout.sideOpen ? '' : 'no-side'}`} style={style}>
          <aside className="studio-tree">
            <div className="side-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={side === 'tree'} className={side === 'tree' ? 'is-on' : ''} onClick={() => setSide('tree')} title={tr('课程', 'Course')}><ListTree size={14} aria-hidden="true" /></button>
              <button type="button" role="tab" aria-selected={side === 'search'} className={side === 'search' ? 'is-on' : ''} onClick={openSearch} title={`${tr('搜索', 'Search')} (${MOD}+Shift+F)`}><SearchIcon size={14} aria-hidden="true" /></button>
              {content.partDefs && <button type="button" role="tab" aria-selected={side === 'parts'} className={side === 'parts' ? 'is-on' : ''} onClick={() => setSide('parts')} title={tr('元件', 'Parts')}><Shapes size={14} aria-hidden="true" /></button>}
            </div>
            {side === 'parts' && content.partDefs
              ? <PartsList content={content} vocabulary={vocab.vocabulary} at={at} found={(type) => places.filter((p) => p.file === 'parts' && p.path?.[1] === type).length} onSelect={(next) => { select(next); if (!['page', 'fields'].includes(tab)) setTab('page') }} onEdit={edit} />
              : side === 'search'
              ? <Search content={content} vocabulary={vocab.vocabulary} onAdd={addOps} onJump={jump} />
              : <Tree game={game} content={content} marks={marks} at={at} picked={picked} setPicked={setPicked} onSelect={select} moving={moving} setMoving={setMoving} onMove={move} labels={rawNames?.levels} tasked={hasTasks(vocab.vocabulary)} onTask={(lvl, k) => { select({ level: lvl }); pickField(['tasks', k]) }} onTaskMove={moveTask} />}
          </aside>
          <Resizer side="tree" size={layout.tree} open={layout.treeOpen} setLayout={setLayout} />
          <main className="studio-main">
            {tab !== 'page' && (
              <div className="studio-scroll">
                {tab === 'fields' && <Editor content={content} base={base} vocab={vocab} at={at} picked={pickedIds} field={field} scene={scene} places={places} names={names} levelOptions={levelOptions} playOrder={playOrder} onEdit={edit} onOps={addOps} onSelect={select} onPick={(path) => pickField(path)} onPlay={playFrom} onMove={setMoving} onJump={(row) => jump(row.file.level ?? null, row.path, row.file.glossary ? 'glossary' : row.file.level ? null : 'game')} />}
                {tab === 'copy' && (
                  <article className="editor is-wide">
                    <CopyTable content={content} vocabulary={vocab.vocabulary} scope={scope} setScope={setCopyScope} order={playOrder} names={names} places={places} onEdit={edit} onJump={(row) => jump(row.file.level ?? null, row.path, row.file.glossary ? 'glossary' : row.file.level ? null : 'game')} />
                  </article>
                )}
                {tab === 'compare' && <Compare game={game} content={content} base={base} at={at} levelOptions={levelOptions} onJump={(lvl, path) => jump(lvl, path)} />}
                {tab === 'review' && (
                  <Review
                    ops={ops} redo={redo} result={result} shown={shown} why={why} setWhy={setWhy} said={said}
                    onRemove={(k) => { setOps((list) => list.filter((_, i) => i !== k)); setRedo([]) }} onBack={back} onRedo={again}
                    onDiscard={() => { setOps([]); setRedo([]) }} onOpen={(cs) => { setOps(cs.ops); setRedo([]); setWhy(cs.why ?? '') }} onApply={apply} onUndo={undo} onSelect={(lvl) => { select({ level: lvl }); setTab('page') }}
                  />
                )}
              </div>
            )}
            <GameFrame
              visible={tab === 'page'} content={content} play={play} part={at?.part} task={pageTask} go={go} edit={pageEdit} picked={pageEdit ? pageMark : null} onEdit={setPageEdit} onMessage={onPage}
              reference={play && referenceOf(play.level)} onReference={(lvl) => playLevel(lvl, referenceOf(lvl))} onCancelTake={() => setPlay((p) => ({ ...p, seed: null, take: null }))}
            />
          </main>
          <Resizer side="side" size={layout.side} open={layout.sideOpen} setLayout={setLayout} />
          <aside className="studio-side">
            {sideCtx && <Inspector content={content} vocab={vocab} at={sideFile} field={field} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps} onPick={(path) => pickField(path)} onClose={() => setField(null)} onLevel={(lvl, path) => { select({ level: lvl }); pickField(path) }} />}
          </aside>
          {layout.auditOpen && <Resizer side="audit" size={layout.audit} open setLayout={setLayout} />}
          <aside className="studio-audit">
            <Audit items={items} fresh={fresh} last={last} at={at} busy={busy} ops={ops} migration={shown.migration} open={layout.auditOpen} onToggle={() => togglePanel('audit')} onJump={jumpTo} onReview={() => setTab('review')} />
          </aside>
        </div>
      )}
      {overlay === 'palette' && ready && <Palette items={paletteItems} onRun={runItem} onClose={() => setOverlay(null)} />}
      {overlay === 'keys' && <Shortcuts onClose={() => setOverlay(null)} />}
    </div>
  )
}
