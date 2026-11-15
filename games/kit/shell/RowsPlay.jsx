import { useState } from 'react'
import { useCheckOnce } from './CheckOnce.jsx'
import { L } from './i18n.js'
import { PlayLayout, PlayStage } from './PlayLayout.jsx'

// The editor and preview know what the rows mean. The shell owns work, saving, checking and layout.
export default function RowsPlay({
  game, level, play, phone, saved, save, solve, lastRun, keepRun, adapter, judge,
}) {
  const { Editor, Preview, open, inputs, score } = adapter
  const task = level.source
  const [work, setWork] = useState(() => open(task, saved))
  const prepared = inputs(task, work)
  const { results, dock, reset } = useCheckOnce({
    judge: judge(task),
    work: prepared,
    passed: L(play.passed),
    onPass: () => solve(score?.(work) ?? null),
    lastRun,
    keepRun,
  })
  const change = (next) => {
    setWork(next)
    save(next)
    reset()
  }
  const sections = {
    editor: <Editor task={task} work={work} prepared={prepared} onChange={change} scope={`${level.id}:${task.task}`} />,
    ...(Preview && { preview: <Preview task={task} work={work} /> }),
  }
  const stage = <PlayStage play={play} sections={sections} />
  return <PlayLayout {...{ game, level, task, phone, play, stage, results, dock }} />
}
