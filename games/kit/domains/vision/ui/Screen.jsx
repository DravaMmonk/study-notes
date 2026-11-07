import { useMemo } from 'react'
import { L, tr } from '../../../shell/i18n.js'

import { ArrowRightFromLine } from 'lucide-react'
import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import SettingField, { valueWords } from '../../../shell/parts/SettingField.jsx'
import { OPS } from '../ops.js'
import { entries, runLevel, runTest } from '../run.js'
import { isImage, show } from '../image.js'
import { ProjectionCase } from './benches/CameraScene.jsx'
import PartDetail, { PartValues } from './PartDetail.jsx'
import { taskBoard, taskDefaults } from '../tooling.js'
import { LossCurve, WIDGETS } from './Training.jsx'

// A board task of a vision game on the circuit base's screen (../../../shell/CircuitScreen.jsx), every test checked
// at once: an image circuit has nothing to step through. A value is a number, a vector or an image (../image.js), an
// image a grid the kit draws (../../../views/Show.jsx) on cards and in details; under the board, the kit's results
// area (run.js entries). The game's own parts
// (parts.json) are the kernel's to draw; the settings a built part takes are parts.json presets drawn by the same
// kernel controls, and a task offers only the setting values its course has introduced (tooling.js).

const CARDS = {
  in: { name: { zh: '输入', en: 'Input' }, icon: ArrowRightFromLine, family: 'given', desc: { zh: '这一关给的值：一个数或一张图。', en: 'The value the level gives: a number or an image.' } },
  out: { name: { zh: '输出', en: 'Output' }, icon: ArrowRightFromLine, family: 'end', desc: { zh: '接到这里的值，就是电路的输出。', en: 'The value wired here is the circuit’s output.' } },
}

const written = (v) => (isImage(v) ? `${v.w}×${v.h}` : show(v))

// What a run on the sample shows of the board.
const onSample = (task, board, partOf) => runTest({ ...task, outputs: [] }, board, { ...task.sample, expect: {} }, partOf)

export default function Screen(screen) {
  const task = screen.level.source
  const own = screen.game.circuit.forTask(task)
  const { phone } = screen
  const outsideLabel = (value) => L(own.presets.outside?.options?.find(option => option.value === value)?.label ?? value)
  const settingsIn = (type, key) => own.settingsIn(task, type, key)
  const defaults = (type) => taskDefaults(type, own.partOf, settingsIn)
  const defined = useMemo(() => ({ of: (type) => own.defs[type] ?? null, defaults, ops: OPS, allowed: settingsIn, widgets: WIDGETS }), [own, task]) // eslint-disable-line react-hooks/exhaustive-deps
  const inspect = useMemo(() => (node, ctx) => <PartValues node={node} ctx={ctx} />, [])
  // A built part's settings: the presets its level names, those with more than one value offered here.
  const fields = (node) => (own.BUILT[node.type]?.fields ?? []).filter((s) => (settingsIn(node.type, s.key)?.length ?? 2) > 1)
  const settings = (node, set, ctx, roomy = false) => {
    const shown = fields(node)
    if (!shown.length) return null
    const p = { ...defaults(node.type), ...node.params }
    return <div className="pf-settings">{shown.map((s) => <SettingField key={s.key} setting={s} value={p[s.key]} allowed={settingsIn(node.type, s.key)} readOnly={ctx.readOnly} roomy={roomy} phone={phone} onChange={set(s.key)} />)}</div>
  }
  return (
    <CircuitScreen
      screen={screen}
      cards={CARDS}
      className="vi-level"
      judged
      run={runLevel}
      says={(r) => r.fail?.why}
      show={written}
      entries={entries}
      figure={({ test, run }) => test && <>
        {test.outside && <p className="vi-label">
          {tr(`本测试将所有取样的图外规则设为「${outsideLabel(test.outside)}」。`, `This test sets all reads to ${outsideLabel(test.outside)} outside the image.`)}
        </p>}
        {task.illustration === 'pinhole' && <ProjectionCase test={test} tests={task.tests} phone={phone} />}
        {run?.training && <LossCurve training={run.training} phone={phone} />}
        {task.multiplyBudget && run && <p className="rv-verdict">{tr(`${run.work.multiplies} 次乘法`, `${run.work.multiplies} multiplications`)}</p>}
      </>}
      sample={(level, board) => onSample(level, board, own.partOf)}
      ready={(board, held) => taskBoard(board, held, settingsIn, own.partOf)}
      settings={settings}
      defaults={defaults}
      defined={defined}
      inspect={inspect}
      details
      sheet={(node, ctx, set) => <PartDetail node={node} ctx={ctx} settings={settings(node, set, ctx, true)} />}
      card={{
        tileExtra: (node) => {
          const shown = fields(node)
          const p = { ...defaults(node.type), ...node.params }
          return shown.length ? <small>{shown.map((f) => valueWords(f, p[f.key])).join(' · ')}</small> : null
        },
      }}
      canvas={{ width: 184, height: 110, minFit: 0.65 }}
    />
  )
}
