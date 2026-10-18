import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pause, Play, StepForward } from 'lucide-react'
import { Brief, PhonePage, RunDock, Sheet, Workbench, tr } from '../../kit/shell/index.js'
import { enableDrag } from '../../kit/drag.js'
import { buzz, reduced } from './util.js'
import { sceneSVG } from './svg.js'
import { rt, Anim } from './runtime.js'
import { MODES } from './modes/index.js'
import { SgCanvas, SgParts, SgPhone } from './circuit/BoardView.jsx'

// A State Graph level on the shared game shell (games/kit/shell). Each level is played by a mode controller
// (js/modes/*: wire, trace, fill, circuit, …) that draws HTML and talks to the page only through `rt`
// (runtime.js). This screen gives it the shell's workbench (desktop) or phone page, paints the mode's regions
// (tests, board, panel, parts, dock), routes clicks and keys to it, and connects `rt` to the shell: pass → solve,
// fail → the shell's fail dialog, openSheet → the shell's bottom sheet, persist → saved progress.

// Keys that identify a control across repaints, so focus can return to the same control after a refresh.
const FOCUS_KEYS = ['act', 'c', 'j', 'k', 'r', 'g', 's', 'o', 'p', 'n', 't', 'v', 'test']
const focusSig = (el) => FOCUS_KEYS.map((k) => el.dataset[k] || '').join('|')
const overlayOpen = () => Boolean(document.querySelector('.dialog-scrim, .ph-scrim, .intro-scrim'))

export default function ModeScreen({ game, level, saved, save, solve, fail, phone }) {
  const L = level.source
  const root = useRef(null)
  const [sheet, setSheet] = useState(null) // { html, acts, redraw } of a sheet the mode opened
  const [, setTick] = useState(0) // the brief's tip follows the mode, so a refresh re-renders it
  // A run paused, stepped or let go on redraws the run bar's controls.
  useEffect(() => {
    const redraw = () => setTick((t) => t + 1)
    Anim.listeners.add(redraw)
    return () => Anim.listeners.delete(redraw)
  }, [])

  // One controller per visit, created before the first paint. `rt.cur` is the session the modes read.
  const cur = useRef(null)
  if (!cur.current) {
    cur.current = { L, i: level.index, fails: 0, running: false, ctl: null }
    rt.cur = cur.current
    cur.current.ctl = MODES[L.mode](L, saved)
  }
  const ctl = cur.current.ctl
  // The shell's callbacks change identity on every render of the shell; the modes always reach the latest ones.
  const shell = useRef(null)
  shell.current = { save, solve, fail }

  // The shell functions the modes call, bound to this screen's DOM.
  useLayoutEffect(() => {
    const el = root.current
    const q = (sel) => el.querySelector(sel)
    rt.cur = cur.current

    const renderBoard = () => {
      if (ctl.custom) q('.sg-board').innerHTML = ctl.custom()
      else q('.sg-board').innerHTML = sceneSVG(ctl.scene(), { label: tr('棋盘', 'Board'), ...(ctl.boardOpt ? ctl.boardOpt() : { maxScale: 1.25 }) })
      q('.bnote').textContent = ctl.note ? ctl.note() : ''
      q('#after').innerHTML = ctl.after ? ctl.after() : ''
    }
    const renderTests = () => {
      const box = q('#tests')
      box.innerHTML = ctl.tests ? ctl.tests().map((t, k) => `<button class="tchip" type="button" role="tab" aria-selected="${k === ctl.st.ti}" data-test="${k}"><span class="sd ${t.status || ''}"></span>${t.label}</button>`).join('') : ''
      box.hidden = !ctl.tests
    }
    // The dock is drawn by React from ctl.dock() (below); a change in it only needs a repaint.
    const renderDock = () => setTick((t) => t + 1)
    const refresh = () => {
      const a = document.activeElement
      const sig = a && a.dataset && el.contains(a) && (a.dataset.act || a.dataset.test) ? focusSig(a) : null
      renderTests()
      // On a desktop the robot's window sits beside the test board it stands on.
      q('#view').innerHTML = ctl.sideView && !phone ? '<aside class="cview" id="cview"></aside>' : ''
      renderBoard()
      q('#panel').innerHTML = ctl.panel()
      const after = q('#panelAfter')
      if (after) after.innerHTML = ctl.panelAfter ? ctl.panelAfter() : ''
      const partsBox = q('#parts')
      if (partsBox) partsBox.innerHTML = ctl.parts ? ctl.parts() : ''
      if (ctl.mounted) ctl.mounted()
      renderDock()
      setTick((t) => t + 1)
      if (sig) {
        const same = [...el.querySelectorAll('#panel [data-act], .sg-board [data-act]')].find((e) => focusSig(e) === sig)
        if (same) same.focus({ preventScroll: true })
      }
    }
    Object.assign(rt, {
      refresh,
      renderBoard,
      refreshKeepRange() {
        renderBoard()
        q('#panel .pcard h3 small').textContent = `n = ${ctl.st.n}`
        q('#whyQ').hidden = ctl.st.max < 30
        renderDock()
      },
      persist: () => shell.current.save(ctl.save()),
      pass() {
        buzz([15, 40, 15, 40, 60])
        shell.current.solve(null)
      },
      fail(x) {
        cur.current.fails++
        buzz([30, 60, 30])
        shell.current.fail({
          head: x.head,
          body: x.body,
          extra: x.extra,
          hint: x.hint !== undefined ? x.hint : L.hint ? L.hint() : null,
          cta: x.cta && { label: x.cta.label, fn: () => { x.cta.fn(); refresh() } },
        })
      },
      startRun({ paused = false } = {}) {
        cur.current.running = true
        Anim.begin(paused)
        renderDock()
        // On a phone the run jumps straight to the test board, wherever the player was on the page (the page itself
        // is the scroller, so set it rather than ask for a smooth scroll that a redraw can cut short).
        if (phone) {
          const card = q('.bcard')
          el.scrollTop += card.getBoundingClientRect().top - el.getBoundingClientRect().top - 8
        }
      },
      endRun() {
        cur.current.running = false
      },
      openSheet: (html, acts = {}, redraw = null) => setSheet({ html, acts, redraw }),
      closeSheet: () => setSheet(null),
    })
    refresh()
  }, [ctl, L, phone])

  // Clicks, keys, drags and resizes go to the mode, the same way on every screen.
  useEffect(() => {
    const el = root.current
    // A layout switch runs this effect's cleanup after the layout effect above has set the session; set it again.
    rt.cur = cur.current
    const onAct = (event) => {
      const a = event.target.closest('[data-act]')
      if (a && ctl.act && !a.disabled && el.contains(a)) ctl.act(a.dataset.act, a)
    }
    const onClick = (event) => {
      const t = event.target
      if (t.closest('.sg-board')) {
        const cell = t.closest('[data-cell]')
        if (cell && ctl.onCell) ctl.onCell(cell.dataset.cell)
        else onAct(event)
        return
      }
      const test = t.closest('#tests [data-test]')
      if (test) {
        if (!cur.current.running) ctl.selectTest(+test.dataset.test)
        return
      }
      const key = t.closest('#dock [data-key]')
      if (key) {
        if (key.dataset.key === 'close') {
          ctl.st.sel = null
          rt.refresh()
        } else ctl.key(key.dataset.key)
        return
      }
      onAct(event)
    }
    const onBoardKey = (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.sg-board [data-cell]')) {
        event.preventDefault()
        ctl.onCell?.(event.target.closest('[data-cell]').dataset.cell)
      }
    }
    const onInput = (event) => {
      if (event.target.id === 'nRange' && ctl.input) ctl.input(+event.target.value)
    }
    // Escape cancels what the mode is doing; Delete removes the selected wire; digits fill the selected cell.
    // (Escape on a dialog or sheet closes that instead: the shell's overlays handle their own keys.)
    const onKey = (event) => {
      if (overlayOpen()) return
      if (event.key === 'Escape') {
        ctl.cancel?.()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && ctl.remove && !ctl.st.sel && !event.target.closest('input,textarea')) {
        if (ctl.remove()) event.preventDefault()
        return
      }
      if (ctl.key && ctl.st.sel && !event.target.closest('button,input')) {
        if (/^[0-9]$/.test(event.key)) ctl.key(event.key)
        else if (event.key === 'Backspace') ctl.key('del')
        else if (event.key === 'Enter') ctl.key('ok')
      }
    }
    // A language switch redraws the mode in the new language; the board and its state stay as they are.
    const onLang = () => rt.refresh()
    el.addEventListener('click', onClick)
    el.addEventListener('keydown', onBoardKey)
    el.addEventListener('input', onInput)
    document.addEventListener('keydown', onKey)
    window.addEventListener('langchange', onLang)
    const undrag = enableDrag(el, () => ctl.dnd || null)
    const panel = el.querySelector('#panel')
    const resize = new ResizeObserver(() => ctl.mounted?.())
    resize.observe(panel)
    return () => {
      el.removeEventListener('click', onClick)
      el.removeEventListener('keydown', onBoardKey)
      el.removeEventListener('input', onInput)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('langchange', onLang)
      if (typeof undrag === 'function') undrag()
      resize.disconnect()
      if (cur.current.running) Anim.skip()
      if (rt.cur === cur.current) rt.cur = null
    }
    // `phone` too: switching between the desktop and phone layouts swaps the root element, and listeners left on the
    // old one would miss every click on the new page.
  }, [ctl, phone])

  // A sheet the mode opened redraws itself in the other language when the player switches while it is open.
  useEffect(() => {
    if (!sheet?.redraw) return undefined
    const onLang = () => sheet.redraw()
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [sheet])

  const tip = ctl.tip ? ctl.tip() : null
  const brief = (
    <Brief
      game={game}
      level={level}
      text={[L.mission.goal, L.mission.how, ctl.legend?.()]}
      tip={tip?.text}
      hint={ctl.hints ? ctl.hints() : L.hints ?? (L.hint ? [L.hint()] : null)}
    >
      {!phone && !ctl.board && <section className="parts" id="parts" data-trash />}
      {/* A circuit level on a desktop: under the task, the level's own choices (what the state remembers, the scan
          order, the rewrite directions). The parts are a row over the board. */}
      {!phone && ctl.board && (
        <div className="sg-extras">
          <div id="panel" />
          <div id="panelAfter" />
        </div>
      )}
    </Brief>
  )
  // The mode's regions. Each is painted by the mode (innerHTML), never by React, so they have no React children.
  // On a desktop circuit level the robot's window is not in the card but beside it, over the run bar (below).
  const viewApart = !phone && Boolean(ctl.panelStage)
  const bcard = (
    <section className="bcard" aria-label={tr('棋盘', 'Board')}>
      <div className="tests" id="tests" role="tablist" aria-label={tr('测试', 'Tests')} />
      <div className="board sg-board" />
      <p className="bnote" />
      {!viewApart && <div id="view" />}
      <div id="after" />
    </section>
  )
  // The run bar, the kit's (RunDock), from what the mode says it holds; or, while a number is typed, the keypad.
  const d = ctl.dock()
  const html = (markup) => <span dangerouslySetInnerHTML={{ __html: markup || '' }} />
  const dock = (
    <footer className="dock run-foot" id="dock">
      {d.pad ? (
        <div dangerouslySetInnerHTML={{ __html: padHTML(ctl) }} />
      ) : (
        <RunDock
          meta={d.meta ? html(d.meta) : null}
          controls={(d.ctrl ?? []).map((c) => ({ key: c.act, label: c.label, icon: CTRL_ICON[c.icon], attrs: { 'data-act': c.act } }))}
          secondary={d.sec ? { label: html(d.sec), armed: Boolean(ctl.st?.armed), attrs: { 'data-act': d.secAct } } : null}
          go={d.go ? { label: d.go, busy: Boolean(d.busy), pulse: Boolean(L.coach && L.coach(ctl.st).run), icon: !d.busy && d.goIcon ? <i className="run-icon" dangerouslySetInnerHTML={{ __html: d.goIcon }} /> : undefined, attrs: { 'data-act': d.act } } : null}
        />
      )}
    </footer>
  )
  // Circuit levels play on the shared circuit editor (./circuit/BoardView.jsx). On a phone the mode's cards (memory,
  // scan order) sit above it and its direction switches under it; on a desktop they are in the brief.
  const panel = ctl.board ? (
    phone ? (
      <div className="panel sg-boardpanel">
        <div id="panel" />
        <div id="panelAfter" />
      </div>
    ) : (
      <div className="panel sg-boardpanel">
        <div className="sg-toolbar" aria-label={tr('元件', 'Parts')}><SgParts board={ctl.board} /></div>
        <SgCanvas board={ctl.board} />
      </div>
    )
  ) : <div className="panel" id="panel" />
  const modeSheet = sheet && (
    <Sheet onClose={() => setSheet(null)}>
      <div
        className="sg-sheet"
        dangerouslySetInnerHTML={{ __html: sheet.html }}
        onClick={(event) => {
          if (event.target.closest('[data-close]')) {
            setSheet(null)
            return
          }
          const a = event.target.closest('[data-act]')
          if (a && sheet.acts[a.dataset.act]) sheet.acts[a.dataset.act](a)
        }}
      />
    </Sheet>
  )

  if (phone && ctl.board) {
    return (
      <PhonePage rootRef={root} brief={brief} className="sg-level is-circuit">
        {bcard}
        {panel}
        <aside className="cview" id="cview" />
        <SgPhone board={ctl.board} rootRef={root} dock={dock} />
        <div className="toast" id="toast" role="status" />
        {modeSheet}
      </PhonePage>
    )
  }
  if (phone) {
    return (
      <PhonePage rootRef={root} brief={brief} className="sg-level">
        {bcard}
        {panel}
        <div className="sg-foot">
          <section className="parts" id="parts" data-trash />
          {dock}
        </div>
        <div className="toast" id="toast" role="status" />
        {modeSheet}
      </PhonePage>
    )
  }
  const stageFirst = ctl.panelStage
  return (
    <>
      <Workbench
        rootRef={root}
        className={`sg-level ${stageFirst ? 'panel-stage' : ''}`}
        brief={brief}
        stage={stageFirst ? panel : bcard}
        side={
          stageFirst ? (
            <aside className="sg-side">
              <WorldHandle rootRef={root} />
              {bcard}
              <div className="sg-world-side">
                <div id="view" />
                {dock}
              </div>
            </aside>
          ) : (
            <aside className="sg-side">
              {panel}
              {dock}
            </aside>
          )
        }
      />
      <div className="toast" id="toast" role="status" />
      {modeSheet}
    </>
  )
}

/**
 * On a circuit level the test board and the robot's view are a strip under the board; the line along its top drags
 * it taller or shorter (remembered), so a big board can be read and a big circuit can be built.
 */
const WORLD_KEY = 'sg-world-h'
function WorldHandle({ rootRef }) {
  useLayoutEffect(() => {
    let h = null
    try { h = Number(localStorage.getItem(WORLD_KEY)) || null } catch { /* storage may be off */ }
    if (h) rootRef.current?.style.setProperty('--world-h', `${h}px`)
  }, [rootRef])
  const size = (h) => {
    const el = rootRef.current
    if (!el) return null
    const top = el.getBoundingClientRect().top
    const next = Math.round(Math.min(Math.max(h, 150), (window.innerHeight - top) * 0.78))
    el.style.setProperty('--world-h', `${next}px`)
    return next
  }
  const down = (event) => {
    event.preventDefault()
    const bottom = rootRef.current.getBoundingClientRect().bottom
    let last = null
    const move = (e) => { last = size(bottom - e.clientY) }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      try { if (last) localStorage.setItem(WORLD_KEY, String(last)) } catch { /* storage may be off */ }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const key = (event) => {
    const now = rootRef.current.querySelector('.sg-side').getBoundingClientRect().height
    const step = event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0
    if (!step) return
    event.preventDefault()
    const next = size(now + step)
    try { if (next) localStorage.setItem(WORLD_KEY, String(next)) } catch { /* storage may be off */ }
  }
  return <div className="sg-resize" role="separator" aria-orientation="horizontal" aria-label={tr('拖动调整棋盘区高度', 'Drag to resize the board area')} tabIndex={0} onPointerDown={down} onKeyDown={key} />
}

const CTRL_ICON = { step: <StepForward size={16} />, pause: <Pause size={16} />, play: <Play size={16} /> }

/** The number keypad a mode opens in the dock while a cell is being typed into. */
function padHTML(ctl) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
  const extra = ctl.padExtra ? ctl.padExtra() : null
  return `<div class="pad"><div class="pad-top"><span><b>${ctl.padTitle()}</b></span><div class="pad-val" aria-live="polite">${ctl.st.input || '_'}</div></div>
    <div class="keys">${keys.map((k) => `<button class="key" type="button" data-key="${k}">${k}</button>`).join('')}
    <button class="key wide" type="button" data-key="del">${tr('删除', 'Delete')}</button><button class="key" type="button" data-key="close" aria-label="${tr('收起键盘', 'Hide keypad')}">${tr('收起', 'Hide')}</button><button class="key wide ok" type="button" data-key="ok">${tr('确定', 'OK')}</button>${extra ? `<button class="key full" type="button" data-key="${extra.key}">${extra.label}</button>` : ''}</div></div>`
}
