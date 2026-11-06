import { useMemo } from 'react'
import { ArrowRightFromLine } from 'lucide-react'
import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import { L } from '../../../shell/i18n.js'
import SettingField, { valueWords } from '../../../shell/parts/SettingField.jsx'
import { OPS } from '../ops.js'
import { runLevel, runTest } from '../run.js'
import { isImage, show } from '../image.js'
import ImageView, { Picture } from './ImageView.jsx'
import { ProjectionCase } from './benches/CameraScene.jsx'
import TestValues from './TestValues.jsx'
import SampleValues from './SampleValues.jsx'
import ImageViewSwitch from './ImageViewSwitch.jsx'
import PartDetail, { PartValues } from './PartDetail.jsx'
import { taskBoard, taskDefaults } from '../tooling.js'

// A board task of a vision game on the circuit base's screen (../../../shell/CircuitScreen.jsx), every test checked
// at once: an image circuit has nothing to step through. A value is a number, a vector or an image (../image.js): a
// card shows an image as a small picture, its numbers while they are few enough to read; under the board, each
// output's wanted value beside the board's, or on the sample the reference's beside it. The game's own parts
// (parts.json) are the kernel's to draw; the settings a built part takes are parts.json presets drawn by the same
// kernel controls, and a task offers only the setting values its course has introduced (tooling.js).

const CARDS = {
  in: { name: { zh: '输入', en: 'Input' }, icon: ArrowRightFromLine, family: 'given', desc: { zh: '这一关给的值：一个数或一张图。', en: 'The value the level gives: a number or an image.' } },
  out: { name: { zh: '输出', en: 'Output' }, icon: ArrowRightFromLine, family: 'end', desc: { zh: '接到这里的值，就是电路的输出。', en: 'The value wired here is the circuit’s output.' } },
}

/** An image on a card: a small picture, its numbers while it is small (a sample's is too large to number). */
function draw(value) {
  if (!isImage(value)) return null
  if (value.w * value.h > 64) return <span className="vi-thumb"><Picture value={value} scale={Math.max(1, Math.floor(96 / Math.max(value.w, value.h)))} /><small>{value.w} × {value.h}</small></span>
  const cell = value.c === 3 ? 58 : 32
  return <span className="vi-thumb"><span className={`vi-numeric-thumb ${value.w <= 4 && value.h <= 3 ? 'is-small' : ''}`}><ImageView value={value} numbers cell={cell} /></span>{(value.w > 4 || value.h > 3) && <small>{value.w} × {value.h}</small>}</span>
}
const written = (v) => (isImage(v) ? `${v.w}×${v.h}` : show(v))

// What a run on the sample shows of the board.
const onSample = (task, board, partOf) => runTest({ ...task, outputs: [] }, board, { ...task.sample, expect: {} }, partOf)

export default function Screen(screen) {
  const own = screen.game.circuit
  const task = screen.level.source
  const { phone } = screen
  const settingsIn = (type, key) => own.settingsIn(task, type, key)
  const defaults = (type) => taskDefaults(type, own.partOf, settingsIn)
  const defined = useMemo(() => ({ of: (type) => own.defs[type] ?? null, defaults, ops: OPS, allowed: settingsIn }), [own, task]) // eslint-disable-line react-hooks/exhaustive-deps
  const inspect = useMemo(() => (node, ctx) => <PartValues node={node} ctx={ctx} phone={phone} />, [phone])
  // A built part's settings: the presets its level names, those with more than one value offered here.
  const fields = (node) => (own.BUILT[node.type]?.fields ?? []).filter((s) => (settingsIn(node.type, s.key)?.length ?? 2) > 1)
  const settings = (node, set, ctx, roomy = false) => {
    const shown = fields(node)
    if (!shown.length) return null
    const p = { ...defaults(node.type), ...node.params }
    return <div className="pf-settings">{shown.map((s) => <SettingField key={s.key} setting={s} value={p[s.key]} allowed={settingsIn(node.type, s.key)} readOnly={ctx.readOnly} roomy={roomy} phone={phone} onChange={set(s.key)} />)}</div>
  }
  const results = ({ test, run, verdict, sample }) => {
    const rows = task.outputs.map((o) => [o.label, sample ? sample.outputs[o.name] : test.expect[o.name], run.outputs[o.name]])
    return (
      <div className="vi-strip">
        {sample ? <SampleValues rows={rows} /> : <TestValues rows={rows} phone={phone} tolerance={task.tolerance} />}
        {test && task.illustration === 'pinhole' && <ProjectionCase test={test} tests={task.tests} phone={phone} />}
        {phone && verdict && <span className="vi-verdict is-fail">{L(verdict)}</span>}
      </div>
    )
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
      draw={draw}
      results={results}
      title={({ verdict }) => !phone && verdict && <span className="vi-verdict is-fail">{L(verdict)}</span>}
      aside={({ test }) => !phone && test && task.outputs.some((o) => isImage(test.expect[o.name])) && <ImageViewSwitch />}
      sample={(level, board) => onSample(level, board, own.partOf)}
      ready={(board, held) => taskBoard(board, held, settingsIn, own.partOf)}
      settings={settings}
      defaults={defaults}
      defined={defined}
      inspect={inspect}
      details
      sheet={(node, ctx, set) => <PartDetail node={node} ctx={ctx} settings={settings(node, set, ctx, true)} phone={phone} />}
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
