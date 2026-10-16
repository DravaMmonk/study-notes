import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Brief, PhonePage, Sheet, Workbench, tr } from '../../kit/shell/index.js'
import { enableDrag } from '../../kit/drag.js'
import { buzz, reduced, ICON } from './util.js'
import { sceneSVG } from './svg.js'
import { rt, Anim } from './runtime.js'
import { MODES } from './modes/index.js'
import { SgCanvas, SgPalette, SgPhone } from './circuit/BoardView.jsx'

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
    const renderDock = () => {
      const d = ctl.dock()
      if (d.pad) {
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
        const extra = ctl.padExtra ? ctl.padExtra() : null
        q('#dock').innerHTML = `<div class="pad"><div class="pad-top"><span><b>${ctl.padTitle()}</b></span><div class="pad-val" aria-live="polite">${ctl.st.input || '_'}</div></div>
          <div class="keys">${keys.map((k) => `<button class="key" type="button" data-key="${k}">${k}</button>`).join('')}
          <button class="key wide" type="button" data-key="del">${tr('删除', 'Delete')}</button><button class="key" type="button" data-key="close" aria-label="${tr('收起键盘', 'Hide keypad')}">${tr('收起', 'Hide')}</button><button class="key wide ok" type="button" data-key="ok">${tr('确定', 'OK')}</button>${extra ? `<button class="key full" type="button" data-key="${extra.key}">${extra.label}</button>` : ''}</div></div>`
        return
      }
      q('#dock').innerHTML = `<div class="dock-in"><div class="dmeta">${d.meta || ''}</div>
        ${d.sec ? `<button class="sec-btn" type="button" data-act="${d.secAct}">${d.sec}</button>` : ''}
        ${d.go ? `<button class="go${d.busy ? ' busy' : ''}${L.coach && L.coach(ctl.st).run ? ' pulse' : ''}" type="button" data-act="${d.act}">${d.busy ? ICON.skip : d.goIcon || ICON.play}<span>${d.go}</span></button>` : ''}</div>`
    }
    const refresh = () => {
      const a = document.activeElement
      const sig = a && a.dataset && el.contains(a) && (a.dataset.act || a.dataset.test) ? focusSig(a) : null
      renderTests()
      // On a desktop the robot's window sits in the side column, under the tests.
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
      startRun() {
        cur.current.running = true
        Anim.begin()
        renderDock()
        if (phone) q('.bcard').scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' })
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
  }, [ctl])

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
      text={null}
      rows={[[{ zh: '目标', en: 'Goal' }, L.mission.goal], [{ zh: '怎么玩', en: 'How to play' }, L.mission.how]]}
      tip={tip?.text}
      phone={phone}
    >
      {!phone && (ctl.board ? <SgPalette board={ctl.board} /> : <section className="parts" id="parts" data-trash />)}
    </Brief>
  )
  // The mode's regions. Each is painted by the mode (innerHTML), never by React, so they have no React children.
  const bcard = (
    <section className="bcard" aria-label={tr('棋盘', 'Board')}>
      <div className="tests" id="tests" role="tablist" aria-label={tr('测试', 'Tests')} />
      <div className="board sg-board" />
      <p className="bnote" />
      <div id="view" />
      <div id="after" />
    </section>
  )
  const dock = <footer className="dock" id="dock" />
  // Circuit levels play on the shared circuit editor (./circuit/BoardView.jsx): the mode's cards (memory, scan order)
  // above it, its direction switches under it.
  const panel = ctl.board ? (
    <div className="panel sg-boardpanel">
      <div id="panel" />
      {!phone && <SgCanvas board={ctl.board} />}
      <div id="panelAfter" />
    </div>
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
          <aside className="sg-side">
            {stageFirst ? bcard : panel}
            {dock}
          </aside>
        }
      />
      <div className="toast" id="toast" role="status" />
      {modeSheet}
    </>
  )
}
