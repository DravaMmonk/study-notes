// The shell owns saving, checking and progress; packages only render and edit work. A plugin's main area sits in the
// same frame as every play (shell/plays/PlayLayout.jsx): the task card, the stage, the verdict and the run bar.
import { createElement, useState } from 'react'
import { defineGame, tr } from './view.jsx'
import { Brief, Level, TaskNavigation } from '../shell/Layout.jsx'
import RunDock from '../shell/RunDock.jsx'
import Verdict from '../shell/Verdict.jsx'
import { checkAction } from '../shell/useCheckOnce.js'
import { evaluatePlay, pluginRuntime } from '../engine/plugin-runtime.js'

export function pluginGame(id, kernel, vocabulary, { view = true } = {}) {
  const runtime = pluginRuntime(id, kernel, vocabulary)
  const kinds = Object.fromEntries([...kernel.tables.play].filter(([name]) => name.startsWith(`${id}:`)).map(([name, core]) => {
    const view = kernel.tables.playView.get(name)
    function Screen({ level, saved, save, solve, fail, progress, game, phone }) {
      const task = level.source
      const context = { content: game.pluginContent, task, progress, passed: progress?.passed ?? [] }
      const [work, setWork] = useState(() => core.normalize(core.read(saved ?? core.initial(context), context), context))
      const [result, setResult] = useState(null)
      const change = value => { setWork(value); save?.(core.write(value, context)); setResult(null) }
      const check = () => {
        const result = evaluatePlay(kernel, task, work, context)
        setResult(result.verdict)
        if (result.verdict.pass) solve(result.verdict.score, result.work)
        else fail?.({ body: tr('再试一次', 'Try again') })
      }
      const pass = Boolean(result?.pass)
      const stage = <div className="plugin-stage">{createElement(view.component, { task, work, onChange: change, onSubmit: check, state: kernel.state(context) })}</div>
      const results = result && <Verdict pass={pass} compact>{pass ? tr('通过', 'Passed') : tr('还不对，再试一次', 'Not yet. Try again')}</Verdict>
      return <Level phone={phone} brief={<Brief game={game} level={level} hint={task.hint} />} taskNav={<TaskNavigation level={level} />}
        stage={stage} results={results} dock={<RunDock go={checkAction(check, pass)} />} />
    }
    return [name, { Screen, label: { zh: '作答', en: 'Answer' } }]
  }))
  const define = (content, works = runtime.spec(content)) => {
    kernel.pair(content.levels.flatMap(level => level.tasks), view)
    return defineGame({
    id: content.id, title: content.title, kicker: content.kicker, lede: content.lede,
    glossary: content.glossary, course: works.course, chapters: works.chapters, levels: works.levels,
    kinds, pluginKernel: kernel, pluginContent: content,
    })
  }
  return { id, define, runtime }
}
