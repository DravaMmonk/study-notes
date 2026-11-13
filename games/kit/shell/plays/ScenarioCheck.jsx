import { Fragment, useMemo, useState } from 'react'
import { Strip } from '../../strip/index.js'
import { CheckScenario } from '../Checks.jsx'
import { L, T } from '../i18n.js'
import { Brief, Level } from '../Layout.jsx'
import { Markup } from '../Markup.jsx'
import RunDock from '../RunDock.jsx'
import { usePlayback } from '../usePlayback.jsx'

/** Write a scenario, then play it against the given works. */
export default function ScenarioCheck({ screen, resource, play }) {
  const { game, level, phone, saved, save, solve, lastRun, keepRun } = screen
  const [work, setWork] = useState(() => saved?.work ?? resource.initial)
  const change = (next) => {
    setWork(next)
    save({ work: next })
  }
  const { steps, lines } = useMemo(() => resource.run(work), [resource, work])
  const playback = usePlayback({
    count: 1,
    stepsOf: () => steps.map((step) => step.failed ? { ...step, failed: L(step.failed) } : step),
    check: () => '',
    onSolve: () => solve(null),
    board: work,
    kept: lastRun,
    onKeep: keepRun,
  })
  const { run, passed } = playback
  const shown = playback.shown(0)
  const failed = run?.over && !passed ? run.results.at(-1)?.reason : null
  const verdict = passed ? L(resource.passed) : failed
  const stage = (
    <div className={play.stage}>
      {resource.prompt && <p className="fo-say fo-prompt"><Markup text={resource.prompt} /></p>}
      <section className="ck-scenarios">
        {lines.map(({ strip, text, right, step, separator }, k) => (
          <Fragment key={k}>
            {separator && <hr className="ck-scenario-line" />}
            <div className={`ck-scenario-row ${shown.at === step ? 'is-step' : ''}`}>
              <Strip line={strip} label={T('句子', 'sentence')} />
              {shown.list.length > step && <span className={right ? 'ck-right' : 'ck-wrong'}>{L(text)}</span>}
            </div>
          </Fragment>
        ))}
      </section>
      <CheckScenario fields={resource.fields(work, change)} />
    </div>
  )
  const results = verdict ? <p className={`lg-verdict ${passed ? 'is-pass' : 'is-fail'}`} role="status">{verdict}</p> : null
  const dock = <RunDock {...playback.dock({ go: L(resource.go), done: L(resource.done) })} />
  const brief = <Brief game={game} level={level} hint={level.source.hint} phone={phone} />
  return <Level phone={phone} className={play.layout} brief={brief} stage={stage} results={results} dock={dock} />
}
