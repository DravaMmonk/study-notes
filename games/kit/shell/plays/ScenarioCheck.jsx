import { Fragment, useMemo } from 'react'
import { Strip } from '../../strip/index.js'
import { CheckScenario } from '../Checks.jsx'
import { L, T } from '../i18n.js'
import { Markup } from '../Markup.jsx'
import RunDock from '../RunDock.jsx'
import Verdict from '../Verdict.jsx'
import { usePlayback } from '../usePlayback.jsx'
import PlayLayout from './PlayLayout.jsx'
import { useSavedWork } from './useWork.js'

/** Write a scenario, then play it against the given works. */
export default function ScenarioCheck({ screen, resource, play }) {
  const { work, change, history, finish } = useSavedWork(screen, {
    read: (saved) => saved?.work ?? resource.initial,
    write: (work) => ({ work }),
  })
  const { steps, lines } = useMemo(() => resource.run(work), [resource, work])
  const playback = usePlayback({
    count: 1,
    stepsOf: () => steps.map((step) => step.failed ? { ...step, failed: L(step.failed) } : step),
    check: () => '',
    onSolve: () => finish(null),
    board: work,
    kept: history.lastRun,
    onKeep: history.keepRun,
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
  const results = verdict ? <Verdict pass={passed} compact>{verdict}</Verdict> : null
  const dock = <RunDock {...playback.dock({ go: L(resource.go), done: L(resource.done) })} />
  return <PlayLayout screen={screen} play={play} stage={stage} results={results} dock={dock} />
}
