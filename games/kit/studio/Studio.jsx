// The studio (games/DESIGN.md 6.6, DIRECTION decision 5): one page to review, edit and play a game without code. It
// is a thin skin over the operation set: every edit is an operation added to a pending changeset; the server runs
// the changeset without writing (the preview tool) and answers with the content it leaves, every line of the check,
// the save migration it would add and each file it changes. The tree, the forms, the game played, the audit and the
// review all show that one answer. Applying writes the changeset (modify); undo runs the change log's.
import './studio.css'
import { useEffect, useRef, useState } from 'react'
import { GAMES } from '../../games.js'
import { mountBarMenus } from '../menu.js'
import { getLang, tr } from '../shell/i18n.js'
import { call } from './api.js'
import { boardsOf, pushOp } from './form.js'
import { showPath } from '../engine/ops/edit.js'
import Tree from './Tree.jsx'
import Editor from './Editor.jsx'
import Audit from './Audit.jsx'
import Review from './Review.jsx'
import GameFrame from './GameFrame.jsx'

const QUERY = new URLSearchParams(window.location.search)
const TABS = [['edit', '编辑', 'Edit'], ['play', '试玩', 'Play'], ['review', '变更', 'Changes']]

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

export default function Studio() {
  const [game, setGame] = useState(QUERY.get('game') ?? GAMES[0].id)
  const [vocab, setVocab] = useState(null)
  const [ops, setOps] = useState([])
  const [why, setWhy] = useState('')
  const [shown, setShown] = useState(null) // the last preview that left a content
  const [last, setLast] = useState(null) // the last preview (an operation may have failed)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0) // bumped when the files change (apply, undo)
  const [records, setRecords] = useState([])
  const [at, setAt] = useState(() => (QUERY.get('level') ? { level: QUERY.get('level') } : QUERY.get('era') ? { era: Number(QUERY.get('era')) } : null))
  const [tab, setTab] = useState(QUERY.get('tab') ?? 'edit')
  const [play, setPlay] = useState(null) // { level, seed, take }
  const [moving, setMoving] = useState(null) // the level being moved in the tree
  const [said, setSaid] = useState(null) // what the last apply or undo said
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
    setOps([])
    call('vocabulary', { game }).then(setVocab)
    call('playtests', { game }).then((r) => setRecords(r.records))
  }, [game])

  // Every change of the pending changeset is previewed, a moment after the last edit.
  const seq = useRef(0)
  useEffect(() => {
    const no = ++seq.current
    setBusy(true)
    const timer = window.setTimeout(async () => {
      const r = await call('preview', { game, changeset: { ...(why && { why }), ops } }).catch((error) => ({ ok: false, problems: [error.message], content: null, failed: null }))
      if (no !== seq.current) return
      setLast(r)
      if (r.content) setShown(r)
      setBusy(false)
    }, ops.length ? 350 : 0)
    return () => window.clearTimeout(timer)
  }, [game, ops, why, rev])

  const content = shown?.content ?? null
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
    setTab('play')
  }
  const onTake = ({ level, path, text }) => {
    edit({ op: 'level.blueprint', level, path, text })
    setPlay((p) => ({ ...p, seed: null }))
  }
  const apply = async () => {
    const r = await call('modify', { game, changeset: { ...(why && { why }), ops } })
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

  // The path of a level's reference board, or null for a level without boards.
  const referenceOf = (level) => {
    const value = content?.levels.find((l) => l.id === level)
    const ref = value && boardsOf(vocab.vocabulary, value).reference
    return ref ? showPath(ref) : null
  }

  const ready = content && vocab
  return (
    <div className={`studio ${moving ? 'is-moving' : ''}`}>
      <header className="kit-bar studio-bar">
        <span className="kit-brand"><i className="kit-chip" aria-hidden="true" /><span>Studio</span></span>
        <select className="studio-game" value={game} onChange={(e) => { setGame(e.target.value); setAt(null); setPlay(null) }} aria-label={tr('游戏', 'Game')}>
          {GAMES.map((g) => <option key={g.id} value={g.id}>{tr(g.title, g.en)}</option>)}
        </select>
        <nav className="studio-tabs" role="tablist">
          {TABS.map(([id, zh, en]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`studio-tab ${tab === id ? 'is-on' : ''}`} onClick={() => { setTab(id); if (id === 'play' && !play && at?.level) setPlay({ level: at.level, seed: null, take: null }) }}>
              {tr(zh, en)}{id === 'review' && ops.length > 0 && <b className={`studio-count ${last && !last.ok ? 'is-fail' : ''}`}>{ops.length}</b>}
            </button>
          ))}
        </nav>
        <span className="kit-spacer" />
        <i className={`studio-busy ${busy ? 'is-on' : ''}`} aria-hidden="true" />
        <div className="kit-actions" ref={actions} />
      </header>
      {!ready ? <div className="studio-loading">{tr('读取中……', 'Loading…')}</div> : (
        <div className={`studio-body is-${tab}`}>
          <aside className="studio-tree">
            <Tree content={content} lines={shown.lines} at={at} onSelect={select} moving={moving} setMoving={setMoving} onMove={move} />
          </aside>
          <main className="studio-main">
            {tab === 'edit' && <Editor content={content} vocab={vocab} at={at} lines={shown.lines} onEdit={edit} onSelect={select} onPlay={playLevel} onMove={setMoving} />}
            <GameFrame visible={tab === 'play'} content={content} play={play} onTake={onTake} reference={play && referenceOf(play.level)} onReference={(level) => playLevel(level, referenceOf(level))} />
            {tab === 'review' && (
              <Review
                game={game} ops={ops} last={last} shown={shown} why={why} setWhy={setWhy} said={said}
                onRemove={(k) => setOps((list) => list.filter((_, i) => i !== k))}
                onDiscard={() => setOps([])} onApply={apply} onUndo={undo} onSelect={(level) => { select({ level }); setTab('edit') }}
              />
            )}
          </main>
          <aside className="studio-audit">
            <Audit shown={shown} last={last} at={at} records={records} busy={busy} ops={ops} onSelect={select} onReview={() => setTab('review')} />
          </aside>
        </div>
      )}
    </div>
  )
}
