import { createElement, useEffect } from 'react'
import { L, keyOf, tr } from './i18n.js'
import Sheet from './Sheet.jsx'

// Escape closes the dialog or sheet on top. Every overlay of the shell uses it, so the key does the same thing in
// every game.
export function useEscape(onClose) {
  useEffect(() => {
    if (!onClose) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

// Content text: a { zh, en } pair, a list of them (one paragraph each), or authored HTML (a level's own markup).
function Paragraphs({ text }) {
  const list = Array.isArray(text) ? text : [text]
  return list.filter(Boolean).map((part, i) => {
    const value = String(L(part) ?? '')
    return /<[a-z][\s\S]*>/i.test(value) ? <p key={i} dangerouslySetInnerHTML={{ __html: value }} /> : <p key={i}>{value}</p>
  })
}

/** A plain dialog: a mono title, lines of text, buttons; the last button is the primary one. */
export function Dialog({ title, lines, actions, intro, onClose }) {
  useEscape(onClose)
  return (
    <div className="dialog-scrim">
      <div className={`dialog ${intro ? 'is-intro' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {lines.map((line, index) => <p key={index} style={{ '--line': index }}>{line}</p>)}
        <div className="dialog-actions">
          {actions.map(([label, action], index) => (
            <button key={label} className={index === actions.length - 1 ? 'is-primary' : ''} onClick={action} autoFocus={index === actions.length - 1}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** A level passed: what it taught, what it unlocked, the notebook line, and the way on. */
export function SolvedDialog({ game, level, onStay, onExit, next, onNext }) {
  useEscape(onStay)
  const unlocked = game.unlocked(level)
  const note = game.note(level)
  return (
    <div className="dialog-scrim">
      <div className="dialog is-solved" role="dialog" aria-modal="true" aria-label={tr('通过', 'Passed')}>
        <div className="solved-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" /><path d="M12 20.5l5.5 5.5L28.5 14" /></svg></div>
        <h2>{tr('通过', 'Passed')} · {game.levelLabel(level)} {L(level.title)}</h2>
        {level.afterTitle && <h3 className="dialog-title" dangerouslySetInnerHTML={{ __html: String(L(level.afterTitle)) }} />}
        <Paragraphs text={level.after} />
        {note && note !== level.after && <p className="dialog-note"><span className="panel-label">{tr('记进笔记本', 'Into the notebook')}</span><span dangerouslySetInnerHTML={{ __html: String(L(note)) }} /></p>}
        {unlocked.length > 0 && (
          <div className="unlocked">
            <span className="panel-label">{tr('解锁', 'Unlocked')}</span>
            <div className="unlocked-list">
              {unlocked.map((part) => (
                <span key={keyOf(part.label)} className="unlocked-part" data-family={part.family}>
                  {part.icon && <i className="family-chip">{createElement(part.icon, { size: 14, strokeWidth: 1.7 })}</i>}
                  {L(part.label)}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="dialog-actions">
          <button onClick={onStay}>{tr('留在这里', 'Stay here')}</button>
          <button onClick={onExit}>{tr('回地图', 'Back to map')}</button>
          {next && <button className="is-primary" onClick={onNext} autoFocus>{tr('下一关', 'Next level')} · {L(next.title)}</button>}
          {!next && <button className="is-primary" onClick={onExit} autoFocus>{tr('完成', 'Done')}</button>}
        </div>
      </div>
    </div>
  )
}

/** A run that did not pass: what went wrong, and from the second miss on, the level's hint. */
export function FailDialog({ fail, fails, onClose }) {
  useEscape(onClose)
  const hint = fail.hint
  return (
    <div className="dialog-scrim">
      <div className="dialog is-failed" role="dialog" aria-modal="true" aria-label={tr('没通过', 'Not yet')}>
        <h2>{tr('没通过', 'Not yet')}</h2>
        {fail.head && <h3 className="dialog-title" dangerouslySetInnerHTML={{ __html: String(L(fail.head)) }} />}
        <Paragraphs text={fail.body} />
        {fail.extra && <div className="dialog-extra" dangerouslySetInnerHTML={{ __html: String(L(fail.extra)) }} />}
        {hint && (fails >= 2
          ? <p className="dialog-note"><span className="panel-label">{tr('提示', 'Hint')}</span><span dangerouslySetInnerHTML={{ __html: String(L(hint)) }} /></p>
          : <p className="dialog-quiet">{tr('再失败一次，这里会给出提示。', 'Miss once more and a hint appears here.')}</p>)}
        <div className="dialog-actions">
          {fail.cta && <button onClick={() => { onClose(); fail.cta.fn() }}>{L(fail.cta.label)}</button>}
          <button className="is-primary" onClick={onClose} autoFocus>{tr('回去改改', 'Back to it')}</button>
        </div>
      </div>
    </div>
  )
}

/** The parts box: every part the game has, the ones earned so far lit. */
export function PartsSheet({ game, progress, onClose }) {
  const earned = new Set(game.parts.earned(progress))
  return (
    <Sheet title={tr('零件箱', 'Parts')} onClose={onClose}>
      <ul className="collection">
        {game.parts.all.map((part) => (
          <li key={part.key} className={earned.has(part.key) ? '' : 'is-off'} data-family={part.family}>
            {part.icon && <i className="family-chip">{createElement(part.icon, { size: 14, strokeWidth: 1.7 })}</i>}
            <span><b>{L(part.name)}</b>{part.desc && <small>{earned.has(part.key) ? L(part.desc) : tr('还没拿到', 'Not earned yet')}</small>}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** The notebook: one line from every level passed, in order. */
export function NotesSheet({ game, solved, onClose }) {
  const levels = game.levels.filter((level) => solved.has(level.id) && game.note(level))
  return (
    <Sheet title={tr('笔记本', 'Notebook')} onClose={onClose}>
      {levels.length ? (
        <ol className="collection is-notes">
          {levels.map((level) => (
            <li key={level.id}>
              <span className="map-level-id">{game.levelLabel(level)}</span>
              <span><b>{L(level.title)}</b><small dangerouslySetInnerHTML={{ __html: String(L(game.note(level))) }} /></span>
            </li>
          ))}
        </ol>
      ) : <p className="panel-note">{tr('通过一关，它的要点就会记在这里。', 'Pass a level and its key idea is written down here.')}</p>}
    </Sheet>
  )
}
