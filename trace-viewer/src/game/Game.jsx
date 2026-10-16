import { Suspense, createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Lightbulb, Moon, PanelLeft, Plus, RotateCcw, Ruler, Sun, X } from 'lucide-react'
import { hasLearnable, runLevel, trainStep } from './engine/graph.js'
import { NODE_TYPES, defaultParams, inputsOf } from './engine/nodes.js'
import { CHAPTERS, LEVELS, levelById, unlocksBefore } from './levels/index.js'
import { INTROS } from './levels/intros/index.js'
import { startBoard, withHidden } from './levels/util.js'
import { loadProgress, saveProgress } from './progress.js'
import { applyTheme } from '../../../games/kit/theme.js'
import Editor from './ui/Editor.jsx'
import IntroSheet from './ui/IntroSheet.jsx'
import LevelMap from './ui/LevelMap.jsx'
import LevelRail from './ui/LevelRail.jsx'
import ProbeLevel from './ui/ProbeLevel.jsx'
import PhoneCircuit from './ui/phone/PhoneCircuit.jsx'
import TestPanel from './ui/TestPanel.jsx'
import { boardFor } from './ui/boards/index.js'
import { describe, familyOf, iconOf } from './ui/catalog.js'
import { PHONE, useMedia } from './ui/useMedia.js'
import { kindOf, nodeView, viewFor } from './ui/views/views.js'

const THEMES = [
  ['paper', '纸面', Sun],
  ['night', '夜间', Moon],
  ['blueprint', '蓝图', Ruler],
]

// Unlock flags → the part they give, for the solved dialog.
const UNLOCKED_PART = Object.fromEntries(Object.entries(NODE_TYPES).filter(([, spec]) => spec.unlock).map(([type, spec]) => [spec.unlock, type]))
const UNLOCK_NAMES = { 'edge-pad': '补边方式：复制边缘', shift: '平移', invert: '反相' }
UNLOCKED_PART.shift = 'shift'
UNLOCKED_PART.invert = 'invert'

const INTRO = [
  '探测器 V-0，视觉芯片已上电。',
  '传感器把世界变成一格格数字，可你还看不懂它们。',
  '母舰会给你一系列测试。每通过一个，你就多一个可以用的元件。',
  '没有说明书。动手试，看测试图，读数字。',
]

export default function Game() {
  const [progress, setProgress] = useState(loadProgress)
  const [levelId, setLevelId] = useState(() => new URLSearchParams(window.location.search).get('level'))
  // A level's 引入 opens by itself the first time the level is entered (after the game's own first dialog), and
  // again whenever the player asks for it from the bar.
  const [introFor, setIntroFor] = useState(null)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  const phone = useMedia(PHONE)
  const solved = useMemo(() => new Set(progress.solved), [progress.solved])
  // The level list beside a level: docked on wide screens (remembered), a drawer on narrow ones.
  const narrow = useMedia('(max-width: 1180px)')
  const [rail, setRail] = useState(() => readRail())
  const [drawer, setDrawer] = useState(false)
  const showRail = narrow ? drawer : rail
  const toggleRail = () => {
    if (narrow) setDrawer((v) => !v)
    else {
      setRail(!rail)
      writeRail(!rail)
    }
  }

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => applyTheme(theme), [theme])

  const open = (id) => {
    setLevelId(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('level', id)
    else url.searchParams.delete('level')
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 0 })
  }

  const level = levelId ? levelById[levelId] : null
  const chapter = level ? CHAPTERS.find((c) => c.id === level.chapter) : null

  return (
    <div className={`game ${level ? 'is-playing' : 'is-mapping'}`}>
      <header className="game-bar">
        {level ? (
          <>
            <button className="bar-button" onClick={() => open(null)} aria-label="回到关卡地图"><ArrowLeft size={16} /><span>地图</span></button>
            <button className={`bar-button rail-toggle ${showRail ? 'is-on' : ''}`} onClick={toggleRail} aria-pressed={showRail} aria-label="关卡列表"><PanelLeft size={16} /><span>关卡</span></button>
          </>
        ) : (
          // Built on its own (npm run build:game) the game sits in game/vision-complete/, under the games hub.
          import.meta.env.MODE === 'game' ? (
            <a className="bar-button" href="../" aria-label="回到游戏列表"><ArrowLeft size={16} /><span>游戏</span></a>
          ) : (
            <a className="bar-button" href="./" aria-label="回到 Fieldnotes"><ArrowLeft size={16} /><span>Fieldnotes</span></a>
          )
        )}
        <span className="game-brand"><i className="brand-chip" aria-hidden="true" />视觉完备</span>
        {level && (
          <span className="game-level-title">
            <b>{level.id}</b>
            <span>{level.title}</span>
            {chapter && <small>{chapter.title}</small>}
          </span>
        )}
        {level && INTROS[level.id] && <button className="bar-button intro-button" onClick={() => setIntroFor(level.id)} aria-label="引入"><BookOpen size={16} /><span>引入</span></button>}
        <ThemeSwitch theme={theme} onChange={setTheme} compact={phone} />
      </header>

      {!level && <LevelMap solved={solved} best={progress.best} all={progress.all} onAll={(all) => setProgress((p) => ({ ...p, all }))} onOpen={open} theme={theme} />}
      {level && (
        <div className={`level-shell ${showRail && !narrow ? 'has-rail' : ''}`}>
          {showRail && narrow && <div className="rail-scrim" onClick={() => setDrawer(false)} />}
          {showRail && (
            <LevelRail
              current={level.id}
              solved={solved}
              all={progress.all}
              overlay={narrow}
              onClose={toggleRail}
              onOpen={(id) => {
                open(id)
                setDrawer(false)
              }}
            />
          )}
          <LevelScreen key={level.id} level={level} progress={progress} setProgress={setProgress} onExit={() => open(null)} onNext={open} theme={theme} phone={phone} />
        </div>
      )}
      {level && INTROS[level.id] && (introFor === level.id || (progress.seenIntro && !progress.introSeen?.[level.id])) && (
        <IntroSheet
          key={level.id}
          level={level}
          theme={theme}
          onClose={() => {
            setIntroFor(null)
            setProgress((p) => ({ ...p, introSeen: { ...p.introSeen, [level.id]: true } }))
          }}
        />
      )}
      {!progress.seenIntro && (
        <Dialog title="上电" lines={INTRO} actions={[['开始', () => setProgress((p) => ({ ...p, seenIntro: true }))]]} intro />
      )}
    </div>
  )
}

const RAIL_KEY = 'vision-complete.rail'
function readRail() {
  try {
    const saved = window.localStorage.getItem(RAIL_KEY)
    return saved === null ? window.innerWidth >= 1360 : saved === '1'
  } catch {
    return true
  }
}
function writeRail(on) {
  try {
    window.localStorage.setItem(RAIL_KEY, on ? '1' : '0')
  } catch {
    // The choice still holds for this visit.
  }
}

function ThemeSwitch({ theme, onChange, compact }) {
  if (compact) {
    const index = THEMES.findIndex(([id]) => id === theme)
    const [, label, Icon] = THEMES[index] ?? THEMES[0]
    const next = THEMES[(index + 1) % THEMES.length]
    return (
      <button className="theme-cycle" onClick={() => onChange(next[0])} aria-label={`主题：${label}，点按切换到${next[1]}`}>
        {createElement(Icon, { size: 16, strokeWidth: 1.6 })}
      </button>
    )
  }
  return (
    <div className="theme-switch" role="radiogroup" aria-label="主题">
      {THEMES.map((option) => {
        const [id, label, ThemeIcon] = option
        return (
          <button key={id} className="theme-option" role="radio" aria-checked={theme === id} aria-label={label} title={label} onClick={() => onChange(id)}>
            <ThemeIcon size={14} strokeWidth={1.6} />
          </button>
        )
      })}
    </div>
  )
}

// A run with every test's verdict hidden: the outputs are real, but nothing is marked passed or failed yet.
const untested = (run) => ({
  ...run,
  pass: false,
  untested: true,
  results: run.results.map((r) => ({ ...r, pass: null, checks: r.checks.map((c) => ({ ...c, pass: null, reason: '' })) })),
})

function LevelScreen({ level, progress, setProgress, onExit, onNext, theme, phone }) {
  // The board and its test results change together: tests re-run whenever the wiring or a parameter
  // changes, but not while a card is only being dragged around.
  const [{ board, run }, setState] = useState(() => {
    // A saved circuit whose inputs and outputs no longer match the level (it was saved for a level
    // that has since moved) would leave the player with the wrong cards; start fresh instead.
    const saved = progress.boards[level.id]
    const names = (type) => (saved?.nodes ?? []).filter((n) => n.type === type).map((n) => n.params.name).sort().join()
    const fits = saved && names('input') === [...level.inputs].sort().join() && names('output') === [...level.outputs].sort().join()
    const initial = fits ? saved : startBoard(level)
    return { board: initial, run: level.kind === 'graph' ? runLevel(progress.solved.includes(level.id) ? withHidden(level) : level, initial) : null }
  })
  // A circuit level's hidden tests are checked by every run but shown only once the level is solved; from then on
  // they sit in the test list like the others. Training only ever sees the visible tests.
  const revealed = progress.solved.includes(level.id)
  const playLevel = useMemo(() => (revealed ? withHidden(level) : level), [revealed, level])
  const hiddenCount = revealed ? 0 : level.hidden?.length ?? 0
  const [hiddenMiss, setHiddenMiss] = useState(null) // { failed, total } after a run whose visible tests passed
  const [testIndex, setTestIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [won, setWon] = useState(false)
  // The circuit's results update live, but whether it passes is only shown, and the level only completed, once
  // the player runs the tests; any change to the circuit makes it untested again.
  const [tested, setTested] = useState(false)
  const [losses, setLosses] = useState([])
  const [showBrief, setShowBrief] = useState(false)
  const [sheet, setSheet] = useState(false)
  // A level may withhold a flag the player already has, when its puzzle is to build that very thing by hand.
  const flags = useMemo(() => {
    const set = new Set([...progress.flags, ...(level.grants ?? []), ...(progress.all ? unlocksBefore(level) : [])])
    for (const flag of level.withhold ?? []) set.delete(flag)
    return set
  }, [progress.flags, progress.all, level])
  // The fixed cards are named and drawn by what they carry: a picture, a waveform or a number.
  const ioKinds = level.kind === 'graph' ? Object.fromEntries([...Object.entries(level.tests[0].inputs), ...Object.entries(level.tests[0].expected)].map(([name, value]) => [name, kindOf(value)])) : {}
  const inputLabels = level.inputLabels ?? (level.inputs.length > 1 ? { left: '左图', right: '右图', scene: '现场', empty: '空场' } : {})
  const outputLabels = level.outputLabels ?? {}
  const views = { in: viewFor(level, 'in'), out: viewFor(level, 'out'), mid: viewFor(level, 'mid') }
  // The row every profile view traces, as a fraction of the height, shared by cards and tests.
  const [scan, setScan] = useState(0.5)

  // Record a pass (and a better score), then announce it. Every completion opens the dialog, not
  // only the first; a circuit that already passed and still passes after a tweak is not a new one.
  const solve = (score) => {
    setProgress((p) => {
      const best = p.best[level.id]
      return {
        ...p,
        solved: [...new Set([...p.solved, level.id])],
        flags: [...new Set([...p.flags, ...level.unlocks])],
        best: score && (!best || score.cost < best.cost || (score.cost === best.cost && score.nodes < best.nodes)) ? { ...p.best, [level.id]: score } : p.best,
      }
    })
  }

  const change = (next, { quiet, keep } = {}) => {
    if (quiet || keep) {
      setState((s) => ({ ...s, board: next }))
      // A change of view is kept but does not touch the circuit, so the tests need not re-run.
      if (keep) setProgress((p) => ({ ...p, boards: { ...p.boards, [level.id]: next } }))
      return
    }
    const result = runLevel(playLevel, next)
    setHiddenMiss(null)
    setState({ board: next, run: result })
    setTested(false)
    setProgress((p) => ({ ...p, boards: { ...p.boards, [level.id]: next } }))
  }

  // Run the tests: a passing circuit completes the level (every time, not only the first); a failing one
  // shows the first test it fails. Returns { pass, passed }.
  const runTests = () => {
    if (!run) return { pass: false, passed: 0 }
    setTested(true)
    // Before the level is solved, its hidden tests run here too; the player learns only how many failed.
    const hiddenRun = hiddenCount ? runLevel({ ...level, tests: level.hidden }, board) : null
    const hiddenFailed = hiddenRun ? hiddenRun.results.filter((r) => !r.pass).length : 0
    const pass = run.pass && !hiddenFailed
    setHiddenMiss(run.pass && hiddenFailed ? { failed: hiddenFailed, total: hiddenCount } : null)
    if (pass) {
      solve(run.score)
      setWon(true)
      // Now solved: the hidden tests join the list, with this circuit's results on them.
      if (hiddenRun) setState((s) => ({ ...s, run: runLevel(withHidden(level), s.board) }))
    } else if (!run.pass) {
      const first = run.results.findIndex((r) => !r.pass)
      if (first >= 0) setTestIndex(first)
    }
    return { pass, passed: run.results.filter((r) => r.pass).length, hiddenFailed, hiddenTotal: hiddenCount }
  }
  const shown = useMemo(() => (tested || !run ? run : untested(run)), [tested, run])

  // The test panel draws inputs and outputs the way their cards on the board do; switching either
  // place switches both.
  const roleView = (type) => nodeView(board.nodes.find((n) => n.type === type) ?? { type }, views)
  const showRole = (type, shown) => change({ ...board, nodes: board.nodes.map((n) => (n.type === type ? { ...n, view: shown } : n)) }, { keep: true })

  const addNode = (type) => {
    const count = board.nodes.length
    const taken = new Set(board.nodes.map((n) => n.id))
    let index = count
    while (taken.has(`${type}-${index}`)) index += 1
    const id = `${type}-${index}`
    // Drop the new card in the first free slot of a loose grid between the camera and the display.
    const slots = []
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) slots.push([200 + col * 150, 40 + row * 190])
    const free = slots.find(([x, y]) => !board.nodes.some((n) => Math.abs(n.x - x) < 140 && Math.abs(n.y - y) < 170)) ?? [220 + (count % 4) * 30, 60 + (count % 6) * 30]
    const node = { id, type, x: free[0], y: free[1], params: defaultParams(type) }
    let wires = board.wires
    // On a phone the circuit is a chain of steps: the new part takes what fed the output and then
    // feeds the output itself. Parts with no inputs (generators) are only added.
    if (phone) {
      const out = board.nodes.find((n) => n.type === 'output')
      const into = board.wires.find((w) => w.to === out?.id)
      const from = into?.from ?? board.nodes.find((n) => n.type === 'input')?.id
      const [first] = inputsOf(type)
      if (first && from) {
        wires = [...wires, { from, to: id, port: first }]
        if (out) wires = [...wires.filter((w) => w.to !== out.id), { from: id, to: out.id, port: 'in' }]
      }
    }
    change({ ...board, nodes: [...board.nodes, node], wires })
    setSheet(false)
  }

  const train = (steps) => {
    let next = board
    const history = []
    for (let i = 0; i < steps; i++) {
      const result = trainStep(level, next, level.trainRate ?? 1)
      next = result.graph
      history.push(result.loss)
    }
    setLosses((l) => [...l, ...history].slice(-80))
    change(next)
  }

  const nextLevel = LEVELS.find((l) => l.requires.includes(level.id) && (progress.all || l.requires.every((id) => id === level.id || progress.solved.includes(id))))
  const passed = shown?.results.filter((r) => r.pass).length ?? 0

  const parts = <PartsList palette={level.palette} onAdd={addNode} />
  // About three lines on a phone; longer task text starts folded.
  const longBrief = level.brief.length > 66
  const brief = (
    <>
      <header className="brief-head">
        <span className="brief-id">{level.id}</span>
        <h1>{level.title}</h1>
      </header>
      <p className={`brief-text ${phone && !showBrief && longBrief ? 'is-clamped' : ''}`} onClick={() => phone && setShowBrief(true)}>{level.brief}</p>
      {phone && !showBrief && longBrief && <button className="brief-more" onClick={() => setShowBrief(true)}>展开说明</button>}
      {level.hint && (
        <div className="hint-block">
          <button className="hint-toggle" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}><Lightbulb size={14} /> {showHint ? '收起提示' : '提示'}</button>
          {showHint && <p className="hint">{level.hint}</p>}
        </div>
      )}
    </>
  )
  const training = level.kind === 'graph' && hasLearnable(board) && (
    <section>
      <h3 className="panel-label">训练</h3>
      <div className="train-buttons">
        <button onClick={() => train(1)}>训练 1 步</button>
        <button onClick={() => train(10)}>训练 10 步</button>
      </div>
      <LossCurve losses={losses} />
    </section>
  )
  const graphLevel = level.kind === 'graph'
  const score = graphLevel && (
    <section className="score">
      <h3 className="panel-label">评分</h3>
      <div className="stat-row">
        <div className="stat"><b>{run?.score.nodes ?? 0}</b><span>节点</span></div>
        <div className="stat"><b>{run?.score.cost ?? 0}</b><span>计算量</span></div>
        <div className={`stat ${shown?.pass ? 'is-pass' : ''}`}><b>{shown?.untested ? '—' : passed}/{playLevel.tests.length}</b><span>{shown?.untested ? '还没测试' : '测试'}</span></div>
      </div>
      {run?.constraint && <p className="constraint">{run.constraint}</p>}
      {progress.best[level.id] && <p className="panel-note">最佳：{progress.best[level.id].nodes} 个节点 · 计算量 {progress.best[level.id].cost}</p>}
    </section>
  )
  const reset = <button className="reset-button" onClick={() => { change(startBoard(level)); setLosses([]) }}><RotateCcw size={13} /> 清空电路</button>
  const play = level.kind === 'board' ? (
    <Suspense fallback={<div className="board-loading">载入中…</div>}>
      <BoardLevel level={level} onSolve={() => { solve(null); setWon(true) }} theme={theme} />
    </Suspense>
  ) : (
    <ProbeLevel level={level} onSolve={() => { solve(null); setWon(true) }} theme={theme} />
  )
  const testPanel = graphLevel && <TestPanel level={playLevel} hiddenCount={hiddenCount} hiddenMiss={hiddenMiss} run={shown} onTest={runTests} testIndex={testIndex} onSelect={setTestIndex} inputLabels={inputLabels} theme={theme} scan={scan} onScan={setScan} inView={roleView('input')} outView={roleView('output')} onView={showRole} />
  const overlays = (
    <>
      {sheet && (
        <div className="sheet-scrim" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet === 'tests' ? '测试详情' : '元件'} onClick={(e) => e.stopPropagation()}>
            <header>
              <span className="panel-label">{sheet === 'tests' ? '测试详情' : '选一个元件，接在最后'}</span>
              <button className="icon-only" onClick={() => setSheet(false)} aria-label="关闭"><X size={18} /></button>
            </header>
            {sheet === 'tests' ? testPanel : parts}
          </div>
        </div>
      )}
      {won && (
        <SolvedDialog
          level={level}
          onStay={() => setWon(false)}
          onExit={onExit}
          next={nextLevel}
          onNext={() => onNext(nextLevel.id)}
        />
      )}
    </>
  )

  // On a phone everything is one scrolling page: the task, the tests pinned under it, then the
  // circuit as a list of steps (or the board level itself).
  if (phone) {
    // Circuit levels: the circuit map above, a dock with the task, the selected block and the
    // tests below. Board levels: the task, then the board, whose main visual stays pinned.
    if (level.kind === 'graph') {
      return (
        <div className="level-phone level-graph is-split">
          <PhoneCircuit level={playLevel} hiddenCount={hiddenCount} hiddenMiss={hiddenMiss} graph={board} onChange={change} run={shown} onTest={runTests} testIndex={testIndex} onTestIndex={setTestIndex} flags={flags} inputLabels={inputLabels} outputLabels={outputLabels} ioKinds={ioKinds} views={views} theme={theme} scan={scan} onScan={setScan} onReset={() => { change(startBoard(level)); setLosses([]) }} brief={brief} training={training} footer={score} testDetails={testPanel} />
          {overlays}
        </div>
      )
    }
    return (
      <div className={`level-phone level-${level.kind}`}>
        <section className="pl-brief">{brief}</section>
        <PinnedPlay>{play}</PinnedPlay>
        {overlays}
      </div>
    )
  }

  return (
    <div className={`level level-${level.kind}`}>
      <aside className="brief">
        {brief}
        {level.kind === 'graph' && (
          <>
            <section>
              <h3 className="panel-label">元件</h3>
              {parts}
              <p className="panel-note">从卡片右侧的圆点拖线到下一张卡片。选中卡片或连线后按 Delete 删除；按住 ⌘/Ctrl 滚动可缩放。</p>
            </section>
            {training}
            {score}
            {reset}
          </>
        )}
      </aside>

      {level.kind === 'graph' ? (
        <>
          <div className="board-pane">
            <Editor graph={board} onChange={change} run={shown} testIndex={testIndex} flags={flags} inputLabels={inputLabels} outputLabels={outputLabels} views={views} ioKinds={ioKinds} scan={scan} onScan={setScan} theme={theme} hasPalette={level.palette.length > 0} />
          </div>
          {testPanel}
        </>
      ) : (
        <div className="play-pane">{play}</div>
      )}
      {overlays}
    </div>
  )
}

// A board's first block (its main visual) is pinned at the top of the phone page while the rest
// scrolls, but only when it fits in a little over half the screen; a taller one would hide its own
// controls, so then the page simply scrolls.
function PinnedPlay({ children }) {
  const box = useRef(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const el = box.current
    const check = () => {
      const first = el?.querySelector('.bk > .bk-split > :first-child')
      setPinned(Boolean(first) && first.scrollHeight <= window.innerHeight * 0.56)
    }
    const observer = new ResizeObserver(() => requestAnimationFrame(check))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div ref={box} className={`pl-play ${pinned ? 'is-pinned' : ''}`}>{children}</div>
}

function PartsList({ palette, onAdd }) {
  if (!palette.length) return <p className="panel-note">这一关不需要元件。</p>
  return (
    <div className="palette">
      {palette.map((type) => (
        <button key={type} className="palette-item" data-family={familyOf(type)} onClick={() => onAdd(type)} title={describe(type)}>
          <i className="family-chip">{createElement(iconOf(type), { size: 14, strokeWidth: 1.7 })}</i>
          <span className="palette-text">
            <span>{NODE_TYPES[type].label}</span>
            <small>{describe(type)}</small>
          </span>
          <Plus size={14} className="palette-add" />
        </button>
      ))}
    </div>
  )
}

// Boards are module-level lazy components looked up by name.
function BoardLevel({ level, onSolve, theme }) {
  const board = boardFor(level.board)
  if (!board) return <div className="board-loading">这个机关台还没做好。</div>
  return createElement(board, { level, onSolve, theme })
}

function LossCurve({ losses }) {
  if (!losses.length) return <p className="panel-note">还没训练。每一步，所有可学习的权重都朝让误差变小的方向挪一点。</p>
  const max = Math.max(...losses)
  const min = Math.min(...losses)
  const points = losses.map((v, i) => `${(i / Math.max(1, losses.length - 1)) * 200},${56 - ((Math.log(v + 1e-9) - Math.log(min + 1e-9)) / Math.max(1e-9, Math.log(max + 1e-9) - Math.log(min + 1e-9))) * 52}`)
  return (
    <figure className="loss">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label="损失曲线">
        <polyline className="loss-area" points={`0,60 ${points.join(' ')} 200,60`} />
        <polyline points={points.join(' ')} />
      </svg>
      <figcaption>损失 {losses.at(-1).toExponential(1)}<span>对数刻度</span></figcaption>
    </figure>
  )
}

function SolvedDialog({ level, onStay, onExit, next, onNext }) {
  const parts = level.unlocks.map((flag) => UNLOCKED_PART[flag]).filter((type) => type && NODE_TYPES[type])
  const extras = level.unlocks.filter((flag) => !UNLOCKED_PART[flag] || !NODE_TYPES[UNLOCKED_PART[flag]]).map((flag) => UNLOCK_NAMES[flag] ?? flag)
  return (
    <div className="dialog-scrim">
      <div className="dialog is-solved" role="dialog" aria-modal="true" aria-label="通过">
        <div className="solved-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" /><path d="M12 20.5l5.5 5.5L28.5 14" /></svg></div>
        <h2>通过 · {level.id} {level.title}</h2>
        <p>{level.after}</p>
        {(parts.length > 0 || extras.length > 0) && (
          <div className="unlocked">
            <span className="panel-label">解锁</span>
            <div className="unlocked-list">
              {parts.map((type) => (
                <span key={type} className="unlocked-part" data-family={familyOf(type)}>
                  <i className="family-chip">{createElement(iconOf(type), { size: 14, strokeWidth: 1.7 })}</i>
                  {NODE_TYPES[type].label}
                </span>
              ))}
              {extras.map((text) => <span key={text} className="unlocked-part">{text}</span>)}
            </div>
          </div>
        )}
        <div className="dialog-actions">
          <button onClick={onStay}>留在这里</button>
          <button onClick={onExit}>回地图</button>
          {next && <button className="is-primary" onClick={onNext} autoFocus>下一关 · {next.title}</button>}
        </div>
      </div>
    </div>
  )
}

function Dialog({ title, lines, actions, intro }) {
  return (
    <div className="dialog-scrim">
      <div className={`dialog ${intro ? 'is-intro' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {lines.map((line, index) => <p key={line} style={{ '--line': index }}>{line}</p>)}
        <div className="dialog-actions">
          {actions.map(([label, action], index) => (
            <button key={label} className={index === actions.length - 1 ? 'is-primary' : ''} onClick={action} autoFocus={index === actions.length - 1}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
