import { useEffect, useRef } from 'react'
import { ArrowRight, Check, FlaskConical, Lock, LockOpen, Workflow } from 'lucide-react'
import { createFigureHost } from '../../figures/host.js'
import { CHAPTERS, LEVELS, isOpen } from '../levels/index.js'
import { PLANNED } from '../levels/planned.js'

// The level map: a hero with a working machine, a "continue" button, then each chapter as a trace on
// a circuit board, its levels as pads along it.
export default function LevelMap({ solved, best, all, onAll, onOpen, theme }) {
  const done = LEVELS.filter((level) => solved.has(level.id)).length
  const next = LEVELS.find((level) => !solved.has(level.id) && isOpen(level, solved, all))

  return (
    <main className="level-map">
      <header className="map-hero">
        <div className="map-hero-text">
          <p className="map-kicker">COMP90086 · 计算机视觉</p>
          <h1>视觉完备</h1>
          <p className="map-lede">没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。</p>
          <div className="map-progress" aria-label={`已通过 ${done} / ${LEVELS.length} 关`}>
            <span className="map-progress-bar"><i style={{ width: `${(done / LEVELS.length) * 100}%` }} /></span>
            <span>{done} / {LEVELS.length} 关</span>
          </div>
          <label className="map-all">
            <input type="checkbox" checked={Boolean(all)} onChange={(event) => onAll(event.target.checked)} />
            <span className="map-all-switch" aria-hidden="true"><i /></span>
            {all ? <LockOpen size={14} /> : <Lock size={14} />}
            <span>全部解锁<small>{all ? '任意一关都能直接玩；进度照常记录' : '打开后不用按顺序，任意一关都能直接玩'}</small></span>
          </label>
          {next && (
            <button className="map-continue" onClick={() => onOpen(next.id)}>
              <span>{done ? '继续' : '开始'}</span>
              <b>{next.id} · {next.title}</b>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
        <HeroMachine theme={theme} />
      </header>

      <div className="map-chapters">
        {CHAPTERS.map((chapter) => {
          const levels = LEVELS.filter((level) => level.chapter === chapter.id)
          const planned = PLANNED[chapter.id] ?? []
          const finished = levels.filter((level) => solved.has(level.id)).length
          return (
            <section key={chapter.id} className={`map-chapter ${finished === levels.length && levels.length ? 'is-complete' : ''}`}>
              <header>
                <span className="chapter-index">第 {chapter.id} 章 · {chapter.lecture}</span>
                <h2>{chapter.title}</h2>
                <p>{chapter.question}</p>
                <span className="chapter-meter"><i style={{ width: `${levels.length ? (finished / levels.length) * 100 : 0}%` }} /></span>
              </header>
              <ol className="map-trace">
                {levels.map((level) => {
                  const open = isOpen(level, solved, all)
                  const won = solved.has(level.id)
                  const state = won ? 'is-solved' : open ? 'is-open' : 'is-locked'
                  return (
                    <li key={level.id} className={state}>
                      <button className={`map-level ${state} ${next?.id === level.id ? 'is-next' : ''}`} disabled={!open} onClick={() => onOpen(level.id)}>
                        <span className="map-pad" aria-hidden="true">{won ? <Check size={12} strokeWidth={2.4} /> : open ? null : <Lock size={10} />}</span>
                        <span className="map-level-id">{level.id}</span>
                        <span className="map-level-title">{level.title}</span>
                        <span className="map-level-kind" title={level.kind === 'graph' ? '搭电路' : '机关台'}>
                          {level.kind === 'graph' ? <Workflow size={13} /> : <FlaskConical size={13} />}
                        </span>
                        {won && best[level.id] && <span className="map-level-best">{best[level.id].nodes} 件 · {best[level.id].cost}</span>}
                      </button>
                    </li>
                  )
                })}
                {planned.map(([id, title]) => (
                  <li key={id} className="is-planned">
                    <span className="map-level is-planned" title="已设计，待开放">
                      <span className="map-pad" aria-hidden="true" />
                      <span className="map-level-id">{id}</span>
                      <span className="map-level-title">{title}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </main>
  )
}

// The filter press from the notes, running, as the map's illustration.
function HeroMachine({ theme }) {
  const slot = useRef(null)
  const figure = useRef(null)
  useEffect(() => {
    const host = createFigureHost('conv-press', theme, { bare: true })
    figure.current = host
    slot.current.append(host.host)
    return () => host.dispose()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => figure.current?.setTheme(theme), [theme])
  return <div className="map-hero-art" ref={slot} aria-hidden="true" />
}
