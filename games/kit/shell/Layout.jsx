import { useEffect, useRef, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { L, getLang, tr } from './i18n.js'

// The level screen's frame, the same in every game. On a desktop it is a workbench: the brief on the left, the
// stage (the board, a bench, a circuit) in the middle and, when the level has one, a side column (tests, a panel,
// a dock). On a phone it is one scrolling page: the brief, then the play area.

/** A level's text: plain, or the game's own markup when the game says its text is HTML (defineGame `html`). */
export function Text({ game, as: Tag = 'p', className, text, onClick }) {
  const value = String(L(text) ?? '')
  return game?.html ? <Tag className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: value }} /> : <Tag className={className} onClick={onClick}>{value}</Tag>
}

/** Desktop workbench: brief | stage | side. The side (optional) is the level's own column element; `scroll` makes
 * the stage scroll on its own (a bench taller than the screen). */
export function Workbench({ brief, stage, side, scroll, className = '', rootRef }) {
  return (
    <div ref={rootRef} className={`level ${side ? 'has-side' : ''} ${className}`}>
      <aside className="brief">{brief}</aside>
      <div className={`stage-pane ${scroll ? 'is-scroll' : ''}`}>{stage}</div>
      {side}
    </div>
  )
}

/** Phone page: the brief, then the play area. */
export function PhonePage({ brief, children, className = '', rootRef }) {
  return (
    <div ref={rootRef} className={`level-phone ${className}`}>
      <section className="pl-brief">{brief}</section>
      {children}
    </div>
  )
}

/**
 * A level's brief: its label and title, the task (one text, or labelled rows), an optional tip, the hint behind a
 * button, then whatever the level adds below (parts, score…). On a phone long task text starts folded.
 */
export function Brief({ game, level, text, rows, tip, hint, phone, children }) {
  const [showHint, setShowHint] = useState(false)
  const [open, setOpen] = useState(false)
  const body = text ?? level.brief
  // About three lines on a phone (66 Chinese characters, about 150 English ones).
  const long = body && String(L(body)).length > (getLang() === 'en' ? 150 : 66)
  const clamped = phone && !open && long
  return (
    <>
      <header className="brief-head">
        <span className="brief-id">{game.levelLabel(level)}</span>
        <h1>{L(level.title)}</h1>
      </header>
      {body && <Text game={game} className={`brief-text ${clamped ? 'is-clamped' : ''}`} onClick={() => phone && setOpen(true)} text={body} />}
      {clamped && <button className="brief-more" onClick={() => setOpen(true)}>{tr('展开说明', 'Show more')}</button>}
      {rows?.map(([label, value]) => (
        <div key={String(L(label))} className="brief-row">
          <span className="panel-label">{L(label)}</span>
          <Text game={game} text={value} />
        </div>
      ))}
      {tip && <Text game={game} className="brief-tip" text={tip} />}
      {hint && (
        <div className="hint-block">
          <button className="hint-toggle" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}><Lightbulb size={14} /> {showHint ? tr('收起提示', 'Hide hint') : tr('提示', 'Hint')}</button>
          {showHint && <Text game={game} className="hint" text={hint} />}
        </div>
      )}
      {children}
    </>
  )
}

// A play area's first block (its main visual) is pinned at the top of the phone page while the rest scrolls, but
// only when it fits in a little over half the screen; a taller one would hide its own controls.
export function PinnedPlay({ children, first = '.bk > .bk-split > :first-child' }) {
  const box = useRef(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const el = box.current
    const check = () => {
      const block = el?.querySelector(first)
      setPinned(Boolean(block) && block.scrollHeight <= window.innerHeight * 0.56)
    }
    const observer = new ResizeObserver(() => requestAnimationFrame(check))
    observer.observe(el)
    return () => observer.disconnect()
  }, [first])
  return <div ref={box} className={`pl-play ${pinned ? 'is-pinned' : ''}`}>{children}</div>
}
