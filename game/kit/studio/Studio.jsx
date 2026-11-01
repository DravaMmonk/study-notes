// The studio (games/DESIGN.md 6.7, DIRECTION decision 5): one page to review, edit and play a game without code. It
// is a thin skin over the operation set: every edit is an operation added to a pending changeset; the server runs
// the changeset without writing (the preview tool) and answers with the content it leaves, every line of the check,
// the save migration it would add and each file it changes. The tree, the forms, the game played, the audit and the
// review all show that one answer.
//
// A preview comes in two steps, so editing stays quick on a big game: at once the content the changeset leaves,
// checked against the vocabulary only; then, a moment after the last edit and one at a time, the whole check (the
// domain's own: every reference run), which takes seconds on the biggest games. Until it is back the audit shows the
// last one as stale. Applying writes the changeset (modify); undo runs the change log's.
import './studio.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GAMES } from '../../games.js'
import { mountBarMenus } from '../menu.js'
import { L, getLang, tr } from '../shell/i18n.js'
import { eraLevels } from '../course.js'
import { call } from './api.js'
import { boardsOf, placesOf, pushOp, referenceFor } from './form.js'
import { showPath } from '../engine/ops/edit.js'
import Tree from './Tree.jsx'
import Editor from './Editor.jsx'
import Audit from './Audit.jsx'
import Review from './Review.jsx'
import GameFrame from './GameFrame.jsx'

const QUERY = new URLSearchParams(window.location.search)
const TABS = [['edit', '编辑', 'Edit'], ['play', '试玩', 'Play'], ['review', '变更', 'Changes']]
const QUICK = 120 // ms after an edit before its content is previewed
const SETTLE = 700 // ms after the last edit before the whole check starts

/** Keep the studio's place in the address: the game, what is selected, the tab. */
const remember = (game, at, tab) => {
  const url = new URL(window.location.href)
  url.searchParams.set('game', game)
  for (const k of ['level', 'era']) url.searchParams.delete(k)
  if (at?.level) url.searchParams.set('level', at.level)
  if (at?.era !== undefined) url.searchParams.set('era', at.era)
  url.searchParams.set('tab', tab)
  window.history.replaceState({}, '', url)
}
const editable = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export default function Studio() {
  const [game, setGame] = useState(QUERY.get('game') ?? GAMES[0].id)
  const [vocab, setVocab] = useState(null)
  const [ops, setOps] = useState([])
  const [why, setWhy] = useState('')
  const [shown, setShown] = useState(null) // the last quick preview that left a content
  const [last, setLast] = useState(null) // the last quick preview (an operation may have failed)
  const [checked, setChecked] = useState(null) // the last whole check: { key, ok, lines, problems }
  const [base, setBase] = useState(null) // the content as written, before the pending changes
  const [rawNames, setRawNames] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0) // bumped when the files change (apply, undo)
  const [playtests, setPlaytests] = useState({ records: [], levels: {} })
  const [at, setAt] = useState(() => (QUERY.get('level') ? { level: QUERY.get('level') } : QUERY.get('era') ? { era: Number(QUERY.get('era')) } : null))
  const [tab, setTab] = useState(QUERY.get('tab') ?? 'edit')
  const [play, setPlay] = useState(null) // { level, seed, take }
  const [sheet, setSheet] = useState(false) // a board open in the game's editor over the form
  const [moving, setMoving] = useState(null) // the level being moved in the tree
  const [said, setSaid] = useState(null) // what the last apply or undo said
  const [runs, setRuns] = useState({}) // test runs: `${level}|${path}` → the run_tests answer
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

  // A game opened: its vocabulary and blind-play records; nothing pending.
  useEffect(() => {
    setVocab(null)
    setShown(null)
    setChecked(null)
    setRawNames(null)
    setOps([])
    call('vocabulary', { game }).then(setVocab)
    call('playtests', { game }).then(setPlaytests)
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

  // Ctrl/Cmd+Z outside a field: the last pending operation goes.
  useEffect(() => {
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !editable(document.activeElement)) {
        e.preventDefault()
        setOps((list) => list.slice(0, -1))
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const content = shown?.content ?? null
  const fresh = checked?.key === key
  // The check's lines: the whole check's when it is of these changes, else the quick one's (the content against its
  // vocabulary) over the last whole check's other lines.
  const lines = useMemo(() => {
    if (!checked) return shown?.lines ?? []
    if (fresh) return checked.lines
    return [...(shown?.lines ?? []), ...checked.lines.filter((l) => !l.text.startsWith('content: '))]
  }, [checked, fresh, shown])
  const places = useMemo(() => placesOf(lines, checked?.order ?? shown?.order ?? []), [lines, checked, shown])
  const names = useMemo(() => rawNames && {
    level: new Map(rawNames.levels.map((l) => [l.id, l])),
    part: new Map(rawNames.parts.map((p) => [p.key, p.name])),
    wiki: new Map(rawNames.entries.map((e) => [e.id, e.title])),
    quotes: rawNames.quotes,
    stamp: rawNames.stamp,
    onLevel: (id) => select({ level: id }),
  }, [rawNames]) // eslint-disable-line react-hooks/exhaustive-deps
  const levelOptions = useMemo(() => {
    if (!content) return null
    const eraOf = new Map((content.eras ?? []).flatMap((era) => eraLevels(era).map((id) => [id, era])))
    const label = new Map((rawNames?.levels ?? []).map((l) => [l.id, l]))
    return content.levels.map((l) => {
      const era = eraOf.get(l.id)
      const shown = label.get(l.id)?.label ?? l.id
      return { value: l.id, label: shown, title: l.title, group: era ? `${era.id} ${L(era.title ?? era.chapter?.title) ?? ''}` : null, ...(shown !== l.id && { about: l.id }) }
    }).sort((a, b) => (rawNames ? rawNames.levels.findIndex((l) => l.id === a.value) - rawNames.levels.findIndex((l) => l.id === b.value) : 0))
  }, [content, rawNames])

  const edit = (op) => setOps((list) => pushOp(list, op))
  const select = (next) => {
    setAt(next)
    setMoving(null)
    if (tab === 'play' && next?.level) setPlay({ level: next.level, seed: null, take: null })
  }
  // Play a level, opened on one of its boards (path) when given; `take`: the board is being edited there.
  const playLevel = async (level, path = null, take = false) => {
    const seed = path ? await call('seed', { game, level, path, changeset: { ops } }) : null
    setPlay({ level, seed: seed?.data !== undefined ? seed : null, take: take ? { path, label: tr(`用作 ${path}`, `Use as ${path}`) } : null })
  }
  const onBoard = async (level, path) => {
    await playLevel(level, path, true)
    setSheet(true)
  }
  const onTake = ({ level, path, text }) => {
    edit({ op: 'level.blueprint', level, path, text })
    setPlay((p) => ({ ...p, seed: null }))
    setSheet(false)
  }
  const apply = async () => {
    const r = await call('modify', { game, changeset })
    setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
    if (r.ok) {
      setOps([])
      setWhy('')
      setRev((n) => n + 1)
    }
  }
  const undo = async () => {
    const r = await call('undo', { game })
    setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
    if (r.ok) setRev((n) => n + 1)
  }
  const move = (level, to) => {
    edit({ op: 'level.move', level, to })
    setMoving(null)
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

  // The path of a level's reference board, or null for a level without boards.
  const referenceOf = (level) => {
    const value = content?.levels.find((l) => l.id === level)
    const ref = value && boardsOf(vocab.vocabulary, value).reference
    return ref ? showPath(ref) : null
  }

  const ready = content && vocab
  const result = { ok: fresh && checked.ok, problems: last && !last.content ? last.problems : fresh ? checked.problems : [], failed: last?.failed ?? null, says: last?.says ?? shown?.says, fresh }
  return (
    <div className={`studio ${moving ? 'is-moving' : ''}`}>
      <header className="kit-bar studio-bar">
        <span className="kit-brand"><i className="kit-chip" aria-hidden="true" /><span>Studio</span></span>
        <select className="studio-game" value={game} onChange={(e) => { setGame(e.target.value); setAt(null); setPlay(null); setSheet(false) }} aria-label={tr('游戏', 'Game')}>
          {GAMES.map((g) => <option key={g.id} value={g.id}>{tr(g.title, g.en)}</option>)}
        </select>
        <nav className="studio-tabs" role="tablist">
          {TABS.map(([id, zh, en]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`studio-tab ${tab === id ? 'is-on' : ''}`} onClick={() => { setTab(id); setSheet(false); if (id === 'play' && !play && at?.level) setPlay({ level: at.level, seed: null, take: null }) }}>
              {tr(zh, en)}{id === 'review' && ops.length > 0 && <b className={`studio-count ${last?.failed !== null && last?.failed !== undefined ? 'is-fail' : ''}`}>{ops.length}</b>}
            </button>
          ))}
        </nav>
        <span className="kit-spacer" />
        <i className={`studio-busy ${busy || !fresh ? 'is-on' : ''}`} aria-hidden="true" />
        <div className="kit-actions" ref={actions} />
      </header>
      {!ready ? <div className="studio-loading">{tr('读取中……', 'Loading…')}</div> : (
        <div className={`studio-body is-${tab}`}>
          <aside className="studio-tree">
            <Tree content={content} lines={lines} at={at} onSelect={select} moving={moving} setMoving={setMoving} onMove={move} labels={rawNames?.levels} />
          </aside>
          <main className="studio-main">
            {tab !== 'play' && (
              <div className="studio-scroll">
                {tab === 'edit' && <Editor content={content} base={base} vocab={vocab} at={at} scene={scene} places={places} names={names} levelOptions={levelOptions} tests={tests} onEdit={edit} onSelect={select} onPlay={(level) => { playLevel(level); setTab('play') }} onMove={setMoving} onBoard={onBoard} />}
                {tab === 'review' && (
                  <Review
                    ops={ops} result={result} shown={shown} why={why} setWhy={setWhy} said={said}
                    onRemove={(k) => setOps((list) => list.filter((_, i) => i !== k))}
                    onDiscard={() => setOps([])} onOpen={(cs) => { setOps(cs.ops); setWhy(cs.why ?? '') }} onApply={apply} onUndo={undo} onSelect={(level) => { select({ level }); setTab('edit') }}
                  />
                )}
              </div>
            )}
            <GameFrame visible={tab === 'play' || sheet} sheet={sheet} onClose={() => setSheet(false)} content={content} play={play} onTake={onTake} reference={play && referenceOf(play.level)} onReference={(level) => playLevel(level, referenceOf(level))} />
          </main>
          <aside className="studio-audit">
            <Audit lines={lines} fresh={fresh} last={last} at={at} places={places} playtests={playtests} busy={busy} ops={ops} migration={shown.migration} onSelect={select} onReview={() => setTab('review')} />
          </aside>
        </div>
      )}
    </div>
  )
}
