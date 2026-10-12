import { Suspense, createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Lightbulb, Moon, RotateCcw, Ruler, Sun } from 'lucide-react'
import { hasLearnable, runLevel, trainStep } from './engine/graph.js'
import { NODE_TYPES, defaultParams } from './engine/nodes.js'
import { LEVELS, levelById } from './levels/index.js'
import { startBoard } from './levels/util.js'
import { loadProgress, saveProgress } from './progress.js'
import Editor from './ui/Editor.jsx'
import LevelMap from './ui/LevelMap.jsx'
import ProbeLevel from './ui/ProbeLevel.jsx'
import { boardFor } from './ui/boards/index.js'
import TestPanel from './ui/TestPanel.jsx'

const THEMES = [
  ['paper', '纸面', Sun],
  ['night', '夜间', Moon],
  ['blueprint', '蓝图', Ruler],
]

const UNLOCK_NAMES = Object.fromEntries(Object.values(NODE_TYPES).filter((spec) => spec.unlock).map((spec) => [spec.unlock, spec.label]))
UNLOCK_NAMES['edge-pad'] = '补边方式：复制边缘'
UNLOCK_NAMES.shift = '平移'
UNLOCK_NAMES.invert = '反相'

const DESCRIPTIONS = {
  shift: '整张图挪一格；挪出边界的地方补 0',
  add: '两张图逐像素相加',
  sub: '两张图逐像素相减：a − b',
  mul: '两张图逐像素相乘',
  scale: '每个像素乘同一个数',
  offset: '每个像素加同一个数',
  threshold: '大于门槛输出 1，否则 0',
  square: '每个像素平方',
  sqrt: '每个像素开方',
  relu: '负数变 0，正数不变',
  abs: '取绝对值',
  divide: '逐像素相除：a ÷ b',
  globalMax: '整张图填满它的最大值',
  blur3h: '横向三点平均（你在 1-1 搭的）',
  box3: '3×3 平均（你在 1-2 搭的）',
  gauss: '高斯模糊，σ 可调',
  diffx: '右边邻居 − 自己',
  diffy: '下边邻居 − 自己',
  sobelx: '横向求导、纵向平滑',
  sobely: '纵向求导、横向平滑',
  kernel3: '任意 3×3 核（按“互相关”读权重）',
  learn3: '3×3 核，权重由训练决定',
  downsample: '每隔一点取一个，尺寸减半',
  maxpool: '每个 2×2 块取最大值，尺寸减半',
  gradmag: '√(Gx² + Gy²)',
  argmin4: '逐像素比较几张代价图，输出最小者的编号',
  disparity: '左右图逐行匹配，输出视差，窗口可选',
}

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
  }

  const level = levelId ? levelById[levelId] : null

  return (
    <div className="game">
      <header className="game-bar">
        {level ? (
          <button className="bar-button" onClick={() => open(null)}><ArrowLeft size={15} /> 地图</button>
        ) : (
          <a className="bar-button" href="./"><ArrowLeft size={15} /> Fieldnotes</a>
        )}
        <span className="game-brand">视觉完备</span>
        {level && <span className="game-level-title">{level.id} · {level.title}</span>}
        <div className="theme-switch" role="radiogroup" aria-label="主题">
          {THEMES.map((option) => {
            const [id, label, ThemeIcon] = option
            return (
              <button key={id} className="theme-option" role="radio" aria-checked={theme === id} aria-label={label} title={label} onClick={() => setTheme(id)}>
                <ThemeIcon size={14} strokeWidth={1.6} />
              </button>
            )
          })}
        </div>
      </header>

      {!level && <LevelMap solved={solved} onOpen={open} />}
      {level && <LevelScreen key={level.id} level={level} progress={progress} setProgress={setProgress} onExit={() => open(null)} onNext={open} theme={theme} />}
      {!progress.seenIntro && (
        <Dialog
          title="上电"
          lines={INTRO}
          actions={[['开始', () => setProgress((p) => ({ ...p, seenIntro: true }))]]}
        />
      )}
    </div>
  )
}

function LevelScreen({ level, progress, setProgress, onExit, onNext, theme }) {
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
  }

  const train = (steps) => {
    let next = board
    const history = []
    for (let i = 0; i < steps; i++) {
      const result = trainStep(level, next, 1)
      next = result.graph
      history.push(result.loss)
    }
    setLosses((l) => [...l, ...history].slice(-80))
    change(next)
  }

  const nextLevel = LEVELS.find((l) => l.requires.includes(level.id) && l.requires.every((id) => id === level.id || progress.solved.includes(id)))
  const unlocked = level.unlocks.map((flag) => UNLOCK_NAMES[flag] ?? flag)

  return (
    <div className={`level level-${level.kind}`}>
      <aside className="brief">
        <section>
          <p className="brief-text">{level.brief}</p>
          {level.hint && (
            <button className="hint-toggle" onClick={() => setShowHint((v) => !v)}><Lightbulb size={14} /> {showHint ? '收起提示' : '提示'}</button>
          )}
          {showHint && <p className="hint">{level.hint}</p>}
        </section>

        {level.kind === 'graph' && (
          <>
            <section>
              <h3 className="panel-label">元件</h3>
              {level.palette.length ? (
                <div className="palette">
                  {level.palette.map((type) => (
                    <button key={type} className="palette-item" onClick={() => addNode(type)} title={DESCRIPTIONS[type] ?? ''}>
                      <span>{NODE_TYPES[type].label}</span>
                      <small>{DESCRIPTIONS[type] ?? ''}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="panel-note">这一关不需要元件。</p>
              )}
              <p className="panel-note">从右侧圆点拖线到下一个节点；选中后按 Delete 删除。</p>
            </section>

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
              <p><span>节点</span><b>{run?.score.nodes ?? 0}</b><span>计算量</span><b>{run?.score.cost ?? 0}</b></p>
              {run?.constraint && <p className="constraint">{run.constraint}</p>}
              {progress.best[level.id] && <p className="panel-note">最佳：{progress.best[level.id].nodes} 个节点 · 计算量 {progress.best[level.id].cost}</p>}
            </section>

            <button className="reset-button" onClick={() => { change(startBoard(level)); setLosses([]) }}><RotateCcw size={13} /> 清空</button>
          </>
        )}
      </aside>

      {level.kind === 'graph' ? (
        <>
          <Editor graph={board} onChange={change} run={run} testIndex={testIndex} flags={flags} inputLabels={inputLabels} theme={theme} />
          <TestPanel level={level} run={run} testIndex={testIndex} onSelect={setTestIndex} inputLabels={inputLabels} theme={theme} />
        </>
      ) : level.kind === 'board' ? (
        <Suspense fallback={<div className="board-loading">载入中…</div>}>
          <BoardLevel level={level} onSolve={() => solve(null)} theme={theme} />
        </Suspense>
      ) : (
        <ProbeLevel level={level} onSolve={() => solve(null)} theme={theme} />
      )}

      {won && (
        <Dialog
          title="通过"
          lines={[level.after]}
          note={unlocked.length ? `解锁：${unlocked.join('、')}` : ''}
          actions={[
            ['留在这里', () => setWon(false)],
            ['回地图', onExit],
            ...(nextLevel ? [[`下一关 · ${nextLevel.title}`, () => onNext(nextLevel.id)]] : []),
          ]}
        />
      )}
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
  if (!losses.length) return <p className="panel-note">还没训练。每一步，九个权重都朝让误差变小的方向挪一点。</p>
  const max = Math.max(...losses)
  const min = Math.min(...losses)
  const points = losses.map((v, i) => `${(i / Math.max(1, losses.length - 1)) * 200},${56 - ((Math.log(v + 1e-9) - Math.log(min + 1e-9)) / Math.max(1e-9, Math.log(max + 1e-9) - Math.log(min + 1e-9))) * 52}`)
  return (
    <figure className="loss">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label="损失曲线">
        <polyline points={points.join(' ')} />
      </svg>
      <figcaption>损失 {losses.at(-1).toExponential(1)}（对数刻度）</figcaption>
    </figure>
  )
}

function Dialog({ title, lines, note, actions }) {
  return (
    <div className="dialog-scrim">
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {lines.map((line) => <p key={line}>{line}</p>)}
        {note && <p className="dialog-note">{note}</p>}
        <div className="dialog-actions">
          {actions.map(([label, action], index) => (
            <button key={label} className={index === actions.length - 1 ? 'is-primary' : ''} onClick={action} autoFocus={index === actions.length - 1}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

