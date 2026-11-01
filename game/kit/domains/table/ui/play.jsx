// What every table play screen shares (modes/*.jsx): the brief, the tests over the test board, the run bar or the
// number keypad in its place, feedback (a buzz, a toast), a run that plays step by step and can be skipped, paused
// and stepped (usePlayer), passing and failing, the keys a screen listens to, and a level's text (content strings
// carry their own markup).
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Brief, RunDock } from '../../../shell/index.js'
import { L } from '../../../shell/i18n.js'
import { tr } from '../lang.js'

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
export const buzz = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // No haptics here.
  }
}

/** A level's own text (its content, or a message assembled from it), which may hold inline markup. */
export function Html({ as: Tag = 'span', className, html }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: String(html ?? '') }} />
}

/** A message that shows at the top of the page for a moment: [show(msg), the element to put on the page]. */
export function useToast() {
  const [msg, setMsg] = useState(null)
  const [shown, setShown] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = (text) => {
    setMsg(text)
    setShown(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShown(false), 2400)
  }
  // A message may name a part (<part-ref>), drawn by the shell as a link.
  return [show, <div key="toast" className={`toast ${shown ? 'show' : ''}`} role="status" dangerouslySetInnerHTML={{ __html: String(msg ?? '') }} />]
}

/**
 * A run the player can skip, pause and step through, one per screen. Waits resolve at once while skipping or with
 * reduced motion; while paused a wait holds until the player steps or goes on. The screen redraws whenever the run
 * starts, ends, pauses or goes on; leaving the screen skips what is left (`alive` turns false, so a run stops there).
 */
export function usePlayer() {
  const [, redraw] = useReducer((n) => n + 1, 0)
  const player = useRef(null)
  if (!player.current) {
    const p = {
      running: false, skipping: false, paused: false, alive: true, wake: null, tell: () => {},
      /** A run starts; `paused` holds it on its first step. */
      begin(paused = false) { Object.assign(p, { running: true, skipping: false, paused }); p.tell() },
      end() { p.running = false; p.tell() },
      skip() { Object.assign(p, { skipping: true, paused: false }); p.tell(); p.wake?.() },
      pause() { p.paused = true; p.tell() },
      resume() { p.paused = false; p.tell(); p.wake?.() },
      /** One step on while paused. */
      step() { p.wake?.() },
      wait(ms) {
        if (p.skipping) return Promise.resolve()
        if (p.paused) return new Promise((res) => { p.wake = () => { p.wake = null; res() } })
        if (reduced()) return Promise.resolve()
        return new Promise((res) => {
          const t = setTimeout(() => { p.wake = null; res() }, ms)
          p.wake = () => { clearTimeout(t); p.wake = null; res() }
        })
      },
    }
    player.current = p
  }
  const p = player.current
  p.tell = redraw
  useEffect(() => {
    p.alive = true
    return () => {
      p.alive = false
      if (p.running) p.skip()
    }
  }, [p])
  return p
}

/**
 * Passing and failing, through the shell: pass() solves the level, fail(info) opens the shell's fail dialog
 * ({ head, body, extra?, hint?, cta? }; without a hint of its own, the level's first). `fails` counts this visit's.
 */
export function useVerdict({ level, solve, fail }) {
  const shell = useRef(null)
  shell.current = { solve, fail, hints: level.source.hints }
  const fails = useRef(0)
  return useMemo(() => ({
    fails,
    pass() {
      buzz([15, 40, 15, 40, 60])
      shell.current.solve(null)
    },
    fail(x) {
      fails.current++
      buzz([30, 60, 30])
      shell.current.fail({ head: x.head, body: x.body, extra: x.extra, hint: x.hint !== undefined ? x.hint : shell.current.hints?.[0] ?? null, cta: x.cta })
    },
  }), [])
}

/** A timer that does nothing once the screen is gone. */
export function useLater() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  return (fn, ms) => setTimeout(() => alive.current && fn(), ms)
}

/** Keys on the page while no dialog or sheet is open over it (those handle their own). */
export function useKeys(onKey) {
  const handler = useRef(onKey)
  handler.current = onKey
  useEffect(() => {
    const listen = (event) => {
      if (!document.querySelector('.dialog-scrim, .ph-scrim, .intro-scrim')) handler.current(event)
    }
    document.addEventListener('keydown', listen)
    return () => document.removeEventListener('keydown', listen)
  }, [])
}

/** Digits, Backspace and Enter typed into the cell a keypad is open on (`key` as the keypad's own keys). */
export const typing = (event, key) => {
  // A key a board cell took (Enter on it picks it) is not typed as well.
  if (event.defaultPrevented || event.target.closest('button,input')) return
  if (/^[0-9]$/.test(event.key)) key(event.key)
  else if (event.key === 'Backspace') key('del')
  else if (event.key === 'Enter') key('ok')
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
/** The number keypad a screen puts in the run bar's place while a cell is typed into. extra: { key, label }. */
export function Keypad({ title, value, extra, onKey }) {
  const key = (k, cls, label = k, aria) => <button key={k} className={`key ${cls ?? ''}`} type="button" aria-label={aria} onClick={() => onKey(k)}>{label}</button>
  return (
    <div className="pad">
      <div className="pad-top"><span><b>{title}</b></span><div className="pad-val" aria-live="polite">{value || '_'}</div></div>
      <div className="keys">
        {DIGITS.map((k) => key(k))}
        {key('del', 'wide', tr('删除', 'Delete'))}
        {key('close', '', tr('收起', 'Hide'), tr('收起键盘', 'Hide keypad'))}
        {key('ok', 'wide ok', tr('确定', 'OK'))}
        {extra && key(extra.key, 'full', extra.label)}
      </div>
    </div>
  )
}

/** The run bar's own pictures: a check (检查, 检验) and a double arrow (剪到够). */
export const CheckIcon = () => <i className="run-icon"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></i>
export const SkipIcon = () => <i className="run-icon"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5v14l9-7zM13 5v14l9-7z" fill="currentColor" /></svg></i>

/** A level's tests as chips over its test board: the one shown selected, each with how it stands. */
export function TestChips({ tests, ti, onTest }) {
  return (
    <div className="tests" role="tablist" aria-label={tr('测试', 'Tests')}>
      {tests.map((t, k) => (
        <button key={k} className="tchip" type="button" role="tab" aria-selected={k === ti} onClick={() => onTest(k)}>
          <span className={`sd ${t.status || ''}`} />{L(t.label)}
        </button>
      ))}
    </div>
  )
}

/** The run bar (the kit's RunDock), or the keypad while a number is typed: pad = { title, value, extra?, onKey }. */
export function Dock({ pad, ...dock }) {
  return <div className="dock">{pad ? <Keypad {...pad} /> : <RunDock {...dock} />}</div>
}

/** The brief of a level: its task and how, then (on a desktop) the level's cards. */
export function LevelBrief({ game, level, tip, hint, children }) {
  const { mission, hints } = level.source
  return (
    <Brief game={game} level={level} text={[mission.goal, mission.how]} tip={tip} hint={hint === undefined ? hints ?? null : hint}>
      {children}
    </Brief>
  )
}
