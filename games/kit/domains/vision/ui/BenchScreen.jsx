import { Brief, Level, RunDock } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { WORDS } from '../../../shell/words.js'
import Bench from '../../../shell/bench/Bench.jsx'
import { BlurCurve, LensRays, PinholeRays, PinholeField } from './benches/Displays.jsx'

// A bench task on the kernel's parameter bench (../../../shell/bench/Bench.jsx), with the vision domain's pictures
// (../benches/index.js DISPLAYS): the bench passes the task once its goal holds.
const DISPLAYS = { pinholeRays: PinholeRays, pinholeField: PinholeField, lensRays: LensRays, blurCurve: BlurCurve }

export default function BenchScreen({ game, level: entry, solve, theme, phone }) {
  const task = entry.source
  const brief = <Brief game={game} level={entry} hint={task.hint} phone={phone} />
  return <Bench bench={task.bench} model={task.made.model} displays={DISPLAYS} onSolve={() => solve(null)} theme={theme}>
    {({ content, ctx }) => {
      const next = ctx.pass && ctx.stages && ctx.stageIndex < ctx.stages.length - 1
      const naive = ctx.revealed && !ctx.pass && task.naive?.find((n) => (n.step ?? 1) === ctx.stageIndex + 1 && Object.entries(n.set).every(([key, value]) => ctx.values[key] === value))
      const dock = <RunDock go={{ label: next ? tr('下一步', 'Next step') : L(WORDS.check), onClick: next ? ctx.next : ctx.check, pass: ctx.pass }} />
      const stage = <>{content}{naive && <p className="vi-bench-feedback" role="status">{L(naive.why)}</p>}</>
      return <Level phone={phone} className="vi-bench-level" brief={brief} stage={stage} dock={dock} />
    }}
  </Bench>
}
