import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, StepForward } from 'lucide-react'
import { paceOf } from '../engine/trace.js'
import { tr } from './i18n.js'

// Playing a level's tests step by step, the same in every game: Run plays every test in turn (the first slowly, the
// rest fast: ../engine/trace.js paceOf), Step goes one step at a time (pausing a run under way), Pause and Continue
// hold and go on, and the big button skips to the end while a run is under way. A run stops at once on a step that fails or
// a test whose result is wrong, and the level is solved only when every test passes (and `final` has nothing to say).
//
//   count            how many tests
//   stepsOf(k)       the steps of test k [{ failed?: reason }] (asked once per test and board; empty is fine)
//   check(k)         why test k's result is wrong, or '' when it is right
//   final?()         why the whole run fails though every test passed (over budget…), or ''
//   onSolve()        every test passed
//   onTest?(k)       the run moved on to test k
//   board            anything that changes the board: a new one cancels the run
//
// A run is { test, step, playing, results: [{ pass, reason }], over, final? }: step −1 before the test's first step,
// steps.length once its check has run.

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function usePlayback({ count, stepsOf, check, final, onSolve, onTest, board }) {
  const [run, setRun] = useState(null)
  const cache = useMemo(() => new Map(), [board])
  const steps = (k) => {
    if (!cache.has(k)) cache.set(k, stepsOf(k))
    return cache.get(k)
  }
  useEffect(() => setRun(null), [board])

  // One step on: the next step, the check that ends a test, or the next test.
  const advance = (r) => {
    if (!r || r.over) return r
    const list = steps(r.test)
    const next = r.step + 1
    if (next < list.length) {
      const failed = list[next].failed
      return failed ? { ...r, step: next, playing: false, over: true, results: [...r.results, { pass: false, reason: failed }] } : { ...r, step: next }
    }
    if (next > list.length) return { ...r, test: r.test + 1, step: -1 }
    const reason = check(r.test)
    const results = [...r.results, { pass: !reason, reason }]
    if (reason) return { ...r, step: next, playing: false, over: true, results }
    if (r.test + 1 < count) return list.length ? { ...r, step: next, results } : { ...r, test: r.test + 1, step: -1, results }
    return { ...r, step: next, playing: false, over: true, results, final: final?.() || '' }
  }
  // Several steps a frame on a long run, never past a failure or into the next test.
  const advanceBy = (r, by) => {
    let cur = advance(r)
    for (let k = 1; k < by && !cur.over && cur.test === r.test; k++) cur = advance(cur)
    return cur
  }
  const fresh = (playing) => ({ test: 0, step: -1, playing, results: [], over: false })
  const finish = (r) => {
    let cur = r
    for (let k = 0; k < 1e6 && !cur.over; k++) cur = advance(cur)
    return { ...cur, playing: false }
  }

  useEffect(() => {
    if (!run?.playing) return undefined
    const { per, stride } = paceOf(run.test, steps(run.test).length)
    const id = setTimeout(() => setRun(advanceBy(run, stride)), per)
    return () => clearTimeout(id)
  }, [run])
  useEffect(() => { if (run) onTest?.(run.test) }, [run?.test])
  const passed = Boolean(run?.over && run.results.length === count && run.results.every((x) => x.pass) && !run.final)
  const solved = useRef(false)
  useEffect(() => {
    if (passed && !solved.current) { solved.current = true; onSolve() }
    if (!passed) solved.current = false
  }, [passed])

  const live = run && !run.over
  const playing = Boolean(run?.playing)
  const api = {
    run,
    playing,
    passed,
    /** Run; while a run is under way (playing or paused), skip to its end. */
    play: () => {
      if (live) { setRun(finish(run)); return }
      const start = fresh(true)
      setRun(reduced() ? finish(start) : start)
    },
    resume: () => live && setRun({ ...run, playing: true }),
    pause: () => live && setRun({ ...run, playing: false }),
    /** One step, pausing a run that plays; a new run, held, when none is under way. */
    step: () => setRun(advance(live ? { ...run, playing: false } : fresh(false))),
    cancel: () => setRun(null),
    /** The steps of test k shown so far, and which one is current (or −1). */
    shown: (k) => {
      if (!run) return { list: [], at: -1 }
      if (k < run.test) return { list: steps(k), at: -1 }
      if (k > run.test) return { list: [], at: -1 }
      const list = steps(k)
      return { list: list.slice(0, run.step + 1), at: run.step < list.length ? run.step : -1 }
    },
    /** The test states for the tabs: pass, fail or not run yet. */
    states: Array.from({ length: count }, (_, k) => (run?.results[k] ? (run.results[k].pass ? 'pass' : 'fail') : null)),
    /** The run bar's controls and big button (RunDock), given the button's labels. */
    dock: ({ go, done }) => ({
      controls: [
        { key: 'step', label: tr('步进', 'Step'), icon: <StepForward size={16} />, onClick: api.step },
        ...(live ? [playing ? { key: 'pause', label: tr('暂停', 'Pause'), icon: <Pause size={16} />, onClick: api.pause } : { key: 'resume', label: tr('继续', 'Continue'), icon: <Play size={16} />, onClick: api.resume }] : []),
      ],
      go: { label: live ? tr('跳到结果', 'Skip to the end') : passed ? done : go, busy: Boolean(live), pass: passed, onClick: api.play },
    }),
  }
  return api
}
