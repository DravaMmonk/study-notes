// The shell owns saving, checking and progress; packages only render and edit work.
import { createElement, useState } from 'react'
import { defineGame, tr, Text } from './view.jsx'
import { evaluatePlay, pluginRuntime } from '../engine/plugin-runtime.js'

export function pluginGame(id, kernel, vocabulary, { view = true } = {}) {
  const runtime = pluginRuntime(id, kernel, vocabulary)
  const kinds = Object.fromEntries([...kernel.tables.play].filter(([name]) => name.startsWith(`${id}:`)).map(([name, core]) => {
    const view = kernel.tables.playView.get(name)
    function Screen({ level, saved, save, solve, fail, progress, game }) {
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
      return <div className="workbench">
        {createElement(view.component, { task, work, onChange: change, state: kernel.state(context) })}
        <button type="button" onClick={check}>{tr('检验', 'Check')}</button>
        {result && <Text text={result.pass ? tr('通过', 'Passed') : tr('再试一次', 'Try again')} />}
      </div>
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
