import { Suspense, createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FlaskConical, Lightbulb, ListChecks, Moon, Plus, RotateCcw, Ruler, Sun, Target, Workflow, X } from 'lucide-react'
import { hasLearnable, runLevel, trainStep } from './engine/graph.js'
import { NODE_TYPES, defaultParams } from './engine/nodes.js'
import { CHAPTERS, LEVELS, levelById } from './levels/index.js'
import { startBoard } from './levels/util.js'
import { loadProgress, saveProgress } from './progress.js'
import Editor from './ui/Editor.jsx'
import LevelMap from './ui/LevelMap.jsx'
import ProbeLevel from './ui/ProbeLevel.jsx'
import TestPanel from './ui/TestPanel.jsx'
import { boardFor } from './ui/boards/index.js'
import { describe, familyOf, iconOf } from './ui/catalog.js'
import { PHONE, useMedia } from './ui/useMedia.js'

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
  '你的相机能把世界变成一格格数字，但你还看不懂它们。',
  '母舰会给你一系列测试。每通过一个，你就多一个可以用的元件。',
  '没有说明书。动手试，看测试图，读数字。',
]

export default function Game() {
  const [progress, setProgress] = useState(loadProgress)
  const [levelId, setLevelId] = useState(() => new URLSearchParams(window.location.search).get('level'))
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  const phone = useMedia(PHONE)
  const solved = useMemo(() => new Set(progress.solved), [progress.solved])

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem('fieldnotes.theme', theme)
    } catch {
      // Theme still applies for this session.
    }
  }, [theme])

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
          <button className="bar-button" onClick={() => open(null)} aria-label="回到关卡地图"><ArrowLeft size={16} /><span>地图</span></button>
        ) : (
          <a className="bar-button" href="./" aria-label="回到 Fieldnotes"><ArrowLeft size={16} /><span>Fieldnotes</span></a>
        )}
        <span className="game-brand"><i className="brand-chip" aria-hidden="true" />视觉完备</span>
        {level && (
          <span className="game-level-title">
            <b>{level.id}</b>
            <span>{level.title}</span>
            {chapter && <small>{chapter.title}</small>}
          </span>
        )}
        <ThemeSwitch theme={theme} onChange={setTheme} compact={phone} />
      </header>

      {!level && <LevelMap solved={solved} best={progress.best} onOpen={open} theme={theme} />}
      {level && <LevelScreen key={level.id} level={level} progress={progress} setProgress={setProgress} onExit={() => open(null)} onNext={open} theme={theme} phone={phone} />}
      {!progress.seenIntro && (
        <Dialog title="上电" lines={INTRO} actions={[['开始', () => setProgress((p) => ({ ...p, seenIntro: true }))]]} intro />
      )}
    </div>
  )
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

function LevelScreen({ level, progress, setProgress, onExit, onNext, theme, phone }) {
  // The board and its test results change together: tests re-run whenever the wiring or a parameter
  // changes, but not while a card is only being dragged around.
  const [{ board, run }, setState] = useState(() => {
    const initial = progress.boards[level.id] ?? startBoard(level)
    return { board: initial, run: level.kind === 'graph' ? runLevel(level, initial) : null }
  })
  const [testIndex, setTestIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [won, setWon] = useState(false)
  const [losses, setLosses] = useState([])
  const [tab, setTab] = useState(level.kind === 'graph' ? 'board' : 'play')
  const [sheet, setSheet] = useState(false)
  const announced = useRef(progress.solved.includes(level.id))
  const flags = useMemo(() => new Set([...progress.flags, ...(level.grants ?? [])]), [progress.flags, level.grants])
  const inputLabels = level.inputLabels ?? (level.inputs.length > 1 ? { left: '左图', right: '右图', scene: '现场', empty: '空场' } : { in: '相机' })

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
    if (announced.current) return
    announced.current = true
    setWon(true)
  }

  const change = (next, { quiet } = {}) => {
    if (quiet) {
      setState((s) => ({ ...s, board: next }))
      return
    }
    const result = runLevel(level, next)
    setState({ board: next, run: result })
    setProgress((p) => ({ ...p, boards: { ...p.boards, [level.id]: next } }))
    if (result.pass) solve(result.score)
  }

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
    change({ ...board, nodes: [...board.nodes, { id, type, x: free[0], y: free[1], params: defaultParams(type) }] })
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

  const nextLevel = LEVELS.find((l) => l.requires.includes(level.id) && l.requires.every((id) => id === level.id || progress.solved.includes(id)))
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const tabs = level.kind === 'graph'
    ? [['task', '任务', Target], ['board', '电路', Workflow], ['tests', `测试 ${passed}/${level.tests.length}`, ListChecks]]
    : [['task', '任务', Target], ['play', level.kind === 'probe' ? '实验' : '机关', FlaskConical]]

  const parts = (
    <PartsList palette={level.palette} onAdd={addNode} />
  )

  return (
    <div className={`level level-${level.kind} ${phone ? 'is-phone' : ''}`} data-tab={phone ? tab : undefined}>
      <aside className="brief" data-pane="task">
        <header className="brief-head">
          <span className="brief-id">{level.id}</span>
          <h1>{level.title}</h1>
        </header>
        <p className="brief-text">{level.brief}</p>
        {level.hint && (
          <div className="hint-block">
            <button className="hint-toggle" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}><Lightbulb size={14} /> {showHint ? '收起提示' : '提示'}</button>
            {showHint && <p className="hint">{level.hint}</p>}
          </div>
        )}

        {level.kind === 'graph' && (
          <>
            {!phone && (
              <section>
                <h3 className="panel-label">元件</h3>
                {parts}
                <p className="panel-note">从卡片右侧的圆点拖线到下一张卡片。选中卡片或连线后按 Delete 删除；按住 ⌘/Ctrl 滚动可缩放。</p>
              </section>
            )}

            {hasLearnable(board) && (
              <section>
                <h3 className="panel-label">训练</h3>
                <div className="train-buttons">
                  <button onClick={() => train(1)}>训练 1 步</button>
                  <button onClick={() => train(10)}>训练 10 步</button>
                </div>
                <LossCurve losses={losses} />
              </section>
            )}

            <section className="score">
              <h3 className="panel-label">评分</h3>
              <div className="stat-row">
                <div className="stat"><b>{run?.score.nodes ?? 0}</b><span>节点</span></div>
                <div className="stat"><b>{run?.score.cost ?? 0}</b><span>计算量</span></div>
                <div className={`stat ${run?.pass ? 'is-pass' : ''}`}><b>{passed}/{level.tests.length}</b><span>测试</span></div>
              </div>
              {run?.constraint && <p className="constraint">{run.constraint}</p>}
              {progress.best[level.id] && <p className="panel-note">最佳：{progress.best[level.id].nodes} 个节点 · 计算量 {progress.best[level.id].cost}</p>}
            </section>

            <button className="reset-button" onClick={() => { change(startBoard(level)); setLosses([]) }}><RotateCcw size={13} /> 清空电路</button>
          </>
        )}
      </aside>

      {level.kind === 'graph' ? (
        <>
          <div className="board-pane" data-pane="board">
            <Editor graph={board} onChange={change} run={run} testIndex={testIndex} flags={flags} inputLabels={inputLabels} theme={theme} touch={phone} hasPalette={level.palette.length > 0} />
            {phone && level.palette.length > 0 && (
              <button className="fab" onClick={() => setSheet(true)} aria-label="添加元件"><Plus size={22} /></button>
            )}
            {phone && run && (
              <button className={`board-status ${run.pass ? 'is-pass' : ''}`} onClick={() => setTab('tests')}>
                {run.pass ? '全部通过' : `${passed}/${level.tests.length} 通过 · 看测试`}
              </button>
            )}
          </div>
          <TestPanel level={level} run={run} testIndex={testIndex} onSelect={setTestIndex} inputLabels={inputLabels} theme={theme} />
        </>
      ) : level.kind === 'board' ? (
        <div className="play-pane" data-pane="play">
          <Suspense fallback={<div className="board-loading">载入中…</div>}>
            <BoardLevel level={level} onSolve={() => solve(null)} theme={theme} />
          </Suspense>
        </div>
      ) : (
        <div className="play-pane" data-pane="play">
          <ProbeLevel level={level} onSolve={() => solve(null)} theme={theme} />
        </div>
      )}

      {phone && (
        <nav className="tabbar" aria-label="关卡视图">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? 'is-active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {createElement(Icon, { size: 18, strokeWidth: 1.6 })}
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {sheet && (
        <div className="sheet-scrim" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="元件" onClick={(e) => e.stopPropagation()}>
            <header>
              <span className="panel-label">元件</span>
              <button className="icon-only" onClick={() => setSheet(false)} aria-label="关闭"><X size={18} /></button>
            </header>
            {parts}
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
    </div>
  )
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
