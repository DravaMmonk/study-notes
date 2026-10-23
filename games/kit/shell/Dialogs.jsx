import { createElement, useEffect } from 'react'
import { L, keyOf, tr } from './i18n.js'

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

/** A task of a level passed (GameShell tasks): what it taught, and the way on to the next task. */
export function TaskDoneDialog({ game, level, task, index, next, onStay, onNext }) {
  useEscape(onStay)
  return (
    <div className="dialog-scrim">
      <div className="dialog is-solved" role="dialog" aria-modal="true" aria-label={tr('任务完成', 'Task done')}>
        <div className="solved-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" /><path d="M12 20.5l5.5 5.5L28.5 14" /></svg></div>
        <h2>{game.levelLabel(level)} {L(level.title)} · {tr(`任务 ${index + 1} 完成`, `Task ${index + 1} done`)}</h2>
        <Paragraphs text={task.after} />
        <div className="dialog-actions">
          <button onClick={onStay}>{tr('留在这里', 'Stay here')}</button>
          <button className="is-primary" onClick={onNext} autoFocus>{tr(`下一个任务：${L(next.step)}`, `Next task: ${L(next.step)}`)}</button>
        </div>
      </div>
    </div>
  )
}

/** A level passed: what it taught, what it unlocked, its key idea, and the way back to the map. */
export function SolvedDialog({ game, level, onStay, onExit }) {
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
        {note && note !== level.after && <p className="dialog-note"><span className="panel-label">{tr('要点', 'Key idea')}</span><span dangerouslySetInnerHTML={{ __html: String(L(note)) }} /></p>}
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
          <button className="is-primary" onClick={onExit} autoFocus>{tr('返回关卡导航', 'Back to the level map')}</button>
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

