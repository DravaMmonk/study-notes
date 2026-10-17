import { createElement, useState } from 'react'
import { useEscape } from './Dialogs.jsx'
import { ArrowRight, BookMarked, Check, Lock, LockOpen, Package, RotateCcw } from 'lucide-react'
import { L, tr } from './i18n.js'

// The level map: a hero (the game's kicker, title, lede and illustration), progress, the unlock-all switch and a
// "continue" button, then each chapter as a trace on a circuit board, its levels as pads along it.
export default function LevelMap({ game, progress, solved, onAll, onOpen, onReset, onParts, partsNew = 0, onWiki, unread = 0, theme }) {
  const levels = game.levels
  const done = levels.filter((level) => solved.has(level.id)).length
  const next = levels.find((level) => !solved.has(level.id) && game.isOpen(level, solved, progress.all))
  const [progressOpen, setProgressOpen] = useState(false)

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
          {next && (
            <button className="map-continue" onClick={() => onOpen(next.id)}>
              <span>{done ? tr('继续', 'Continue') : tr('开始', 'Start')}</span>
              <b>{game.levelLabel(next)} · {L(next.title)}</b>
              <ArrowRight size={16} />
            </button>
          )}
          <div className="map-tools">
            {onParts && <button className="kit-btn is-label wiki-button" onClick={onParts}><Package size={15} /><span>{tr('零件箱', 'Parts')}</span><b>{partsNew > 0 ? tr(`${partsNew} 个新`, `${partsNew} new`) : `${game.parts.earned(progress).length}/${game.parts.all.length}`}</b></button>}
            {onWiki && <button className="kit-btn is-label wiki-button" onClick={onWiki}><BookMarked size={15} /><span>{tr('百科', 'Encyclopedia')}</span>{unread > 0 && <b>{tr(`${unread} 条新`, `${unread} new`)}</b>}</button>}
            <button className={`kit-btn is-label map-reset ${progress.all ? 'is-all' : ''}`} onClick={() => setProgressOpen(true)} aria-haspopup="dialog">
              <RotateCcw size={14} /><span>{tr('清空进度', 'Clear progress')}</span>{progress.all && <b>{tr('已全部解锁', 'All unlocked')}</b>}
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
      {progressOpen && <ProgressDialog progress={progress} onAll={onAll} onReset={onReset} onClose={() => setProgressOpen(false)} />}
    </main>
  )
}

/** The progress dialog behind 清空进度: unlock every level (and with it every part and encyclopedia entry), or clear
 *  all progress, which asks twice. */
function ProgressDialog({ progress, onAll, onReset, onClose }) {
  const [armed, setArmed] = useState(false)
  useEscape(onClose)
  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog progress-dialog" role="dialog" aria-modal="true" aria-label={tr('进度', 'Progress')} onClick={(event) => event.stopPropagation()}>
        <h2>{tr('进度', 'Progress')}</h2>
        <label className="map-all">
          <input type="checkbox" checked={Boolean(progress.all)} onChange={(event) => onAll(event.target.checked)} />
          <span className="map-all-switch" aria-hidden="true"><i /></span>
          {progress.all ? <LockOpen size={14} /> : <Lock size={14} />}
          <span>{tr('全部解锁', 'Unlock all')}<small>{progress.all ? tr('任意一关都能直接玩，零件箱和百科也全部打开；进度照常记录', 'Any level can be played, and the parts box and encyclopedia are open in full; progress is still recorded') : tr('打开后不用按顺序，任意一关都能直接玩，零件箱和百科也全部打开', 'Turn on to play any level in any order, with the parts box and encyclopedia open in full')}</small></span>
        </label>
        <div className="progress-clear">
          <p>{tr('清空后，通过的关卡、搭好的电路、拿到的零件都会从这台设备上删掉，不能恢复。', 'Clearing removes the levels passed, the circuits built and the parts earned from this device, for good.')}</p>
          <button
            type="button"
            className={`progress-clear-btn ${armed ? 'is-armed' : ''}`}
            onClick={() => {
              if (!armed) {
                setArmed(true)
                window.setTimeout(() => setArmed(false), 2600)
                return
              }
              onReset()
              onClose()
            }}
          >
            <RotateCcw size={14} />{armed ? tr('再点一次，清空全部进度', 'Click again to clear all progress') : tr('清空全部进度', 'Clear all progress')}
          </button>
        </div>
        <div className="dialog-actions">
          <button className="is-primary" onClick={onClose} autoFocus>{tr('完成', 'Done')}</button>
        </div>
      </div>
    </div>
  )
}
