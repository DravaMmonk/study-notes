import { createElement, useState } from 'react'
import { ArrowRight, BookMarked, Check, Lock, LockOpen, Package, RotateCcw } from 'lucide-react'
import { L, tr } from './i18n.js'

// The level map: a hero (the game's kicker, title, lede and illustration), progress, the unlock-all switch and a
// "continue" button, then each chapter as a trace on a circuit board, its levels as pads along it.
export default function LevelMap({ game, progress, solved, onAll, onOpen, onReset, onParts, onNotes, theme }) {
  const levels = game.levels
  const done = levels.filter((level) => solved.has(level.id)).length
  const next = levels.find((level) => !solved.has(level.id) && game.isOpen(level, solved, progress.all))
  const [armed, setArmed] = useState(false)

  return (
    <main className="level-map">
      <header className="map-hero">
        <div className="map-hero-text">
          <p className="map-kicker">{L(game.kicker)}</p>
          <h1>{L(game.title)}</h1>
          <p className="map-lede">{L(game.lede)}</p>
          <div className="map-progress" aria-label={tr(`已通过 ${done} / ${levels.length} 关`, `${done} of ${levels.length} levels passed`)}>
            <span className="map-progress-bar"><i style={{ width: `${(done / levels.length) * 100}%` }} /></span>
            <span>{tr(`${done} / ${levels.length} 关`, `${done} / ${levels.length} levels`)}</span>
          </div>
          <label className="map-all">
            <input type="checkbox" checked={Boolean(progress.all)} onChange={(event) => onAll(event.target.checked)} />
            <span className="map-all-switch" aria-hidden="true"><i /></span>
            {progress.all ? <LockOpen size={14} /> : <Lock size={14} />}
            <span>{tr('全部解锁', 'Unlock all')}<small>{progress.all ? tr('任意一关都能直接玩；进度照常记录', 'Any level can be played now; progress is still recorded') : tr('打开后不用按顺序，任意一关都能直接玩', 'Turn on to play any level, in any order')}</small></span>
          </label>
          {next && (
            <button className="map-continue" onClick={() => onOpen(next.id)}>
              <span>{done ? tr('继续', 'Continue') : tr('开始', 'Start')}</span>
              <b>{game.levelLabel(next)} · {L(next.title)}</b>
              <ArrowRight size={16} />
            </button>
          )}
          <div className="map-tools">
            {onParts && <button className="kit-btn is-label" onClick={onParts}><Package size={15} /><span>{tr('零件箱', 'Parts')}</span><b>{game.parts.earned(progress).length}/{game.parts.all.length}</b></button>}
            {onNotes && <button className="kit-btn is-label" onClick={onNotes}><BookMarked size={15} /><span>{tr('笔记本', 'Notebook')}</span><b>{done}</b></button>}
            <button
              className={`kit-btn is-label map-reset ${armed ? 'is-armed' : ''}`}
              onClick={() => {
                if (!armed) {
                  setArmed(true)
                  window.setTimeout(() => setArmed(false), 2600)
                  return
                }
                setArmed(false)
                onReset()
              }}
            >
              <RotateCcw size={14} /><span>{armed ? tr('再点一次清空全部进度', 'Click again to clear all progress') : tr('清空进度', 'Clear progress')}</span>
            </button>
          </div>
        </div>
        {game.Hero && <div className="map-hero-art" aria-hidden="true">{createElement(game.Hero, { theme })}</div>}
      </header>

      <div className="map-chapters">
        {game.chapters.map((chapter) => {
          const inChapter = levels.filter((level) => level.chapter === chapter.id)
          const planned = game.planned?.[chapter.id] ?? []
          if (!inChapter.length && !planned.length) return null
          const finished = inChapter.filter((level) => solved.has(level.id)).length
          return (
            <section key={chapter.id} className={`map-chapter ${finished === inChapter.length && inChapter.length ? 'is-complete' : ''}`}>
              <header>
                <span className="chapter-index">{tr(`第 ${chapter.number ?? chapter.id} 章`, `Chapter ${chapter.number ?? chapter.id}`)}{chapter.label ? <> · {L(chapter.label)}</> : null}</span>
                <h2>{L(chapter.title)}</h2>
                {chapter.question && <p>{L(chapter.question)}</p>}
                <span className="chapter-meter"><i style={{ width: `${inChapter.length ? (finished / inChapter.length) * 100 : 0}%` }} /></span>
              </header>
              <ol className="map-trace">
                {inChapter.map((level) => {
                  const open = game.isOpen(level, solved, progress.all)
                  const won = solved.has(level.id)
                  const state = won ? 'is-solved' : open ? 'is-open' : 'is-locked'
                  const kind = game.kinds[level.kind]
                  const best = won && progress.best[level.id] && game.bestLabel?.(progress.best[level.id])
                  return (
                    <li key={level.id} className={state}>
                      <button className={`map-level ${state} ${next?.id === level.id ? 'is-next' : ''}`} disabled={!open} onClick={() => onOpen(level.id)}>
                        <span className="map-pad" aria-hidden="true">{won ? <Check size={12} strokeWidth={2.4} /> : open ? null : <Lock size={10} />}</span>
                        <span className="map-level-id">{game.levelLabel(level)}</span>
                        <span className="map-level-title">{L(level.title)}</span>
                        {kind?.icon && <span className="map-level-kind" title={L(kind.label)}>{createElement(kind.icon, { size: 13 })}</span>}
                        {best && <span className="map-level-best">{best}</span>}
                      </button>
                    </li>
                  )
                })}
                {planned.map(([id, title]) => (
                  <li key={id} className="is-planned">
                    <span className="map-level is-planned" title={tr('已设计，待开放', 'Designed, not open yet')}>
                      <span className="map-pad" aria-hidden="true" />
                      <span className="map-level-id">{id}</span>
                      <span className="map-level-title">{L(title)}</span>
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
