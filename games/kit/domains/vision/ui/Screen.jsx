import { useMemo } from 'react'
import { ArrowRightFromLine } from 'lucide-react'
import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import SettingField, { valueWords } from '../../../shell/parts/SettingField.jsx'
import { OPS } from '../ops.js'
import { entries, runLevel, runTest } from '../run.js'
import { isImage, show } from '../image.js'
import GridView, { GridPicture } from '../../../shell/views/grid/GridView.jsx'
import { ProjectionCase } from './benches/CameraScene.jsx'
import { useViewChoice } from '../../../shell/views/choice.js'
import PartDetail, { PartValues } from './PartDetail.jsx'
import { taskBoard, taskDefaults } from '../tooling.js'

// A board task of a vision game on the circuit base's screen (../../../shell/CircuitScreen.jsx), every test checked
// at once: an image circuit has nothing to step through. A value is a number, a vector or an image (../image.js): a
// card shows an image in the view the player picked for grids, numbered while its cells are few enough to read; under
// the board, the kit's results area (run.js entries). The game's own parts
// (parts.json) are the kernel's to draw; the settings a built part takes are parts.json presets drawn by the same
// kernel controls, and a task offers only the setting values its course has introduced (tooling.js).

const CARDS = {
  in: { name: { zh: '输入', en: 'Input' }, icon: ArrowRightFromLine, family: 'given', desc: { zh: '这一关给的值：一个数或一张图。', en: 'The value the level gives: a number or an image.' } },
  out: { name: { zh: '输出', en: 'Output' }, icon: ArrowRightFromLine, family: 'end', desc: { zh: '接到这里的值，就是电路的输出。', en: 'The value wired here is the circuit’s output.' } },
}

/** An image on a card: numbered while it is small and numbers are picked, else a small picture. */
function CardImage({ value }) {
  const [view] = useViewChoice('grid')
  if (view === 'pixels' || value.w * value.h > 64) return <span className="vi-thumb"><GridPicture value={value} scale={Math.max(1, Math.floor(96 / Math.max(value.w, value.h)))} /><small>{value.w} × {value.h}</small></span>
  const cell = value.c === 3 ? 58 : 32
  return <span className="vi-thumb"><span className={`vi-numeric-thumb ${value.w <= 4 && value.h <= 3 ? 'is-small' : ''}`}><GridView value={value} numbers cell={cell} /></span>{(value.w > 4 || value.h > 3) && <small>{value.w} × {value.h}</small>}</span>
}
const draw = (value) => (isImage(value) ? <CardImage value={value} /> : null)
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
      entries={entries}
      figure={({ test }) => test && task.illustration === 'pinhole' && <ProjectionCase test={test} tests={task.tests} phone={phone} />}
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
