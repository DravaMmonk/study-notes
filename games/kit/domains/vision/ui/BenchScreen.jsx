import { Brief, Level, PinnedPlay } from '../../../shell/index.js'
import Bench from '../../../shell/bench/Bench.jsx'
import { BlurCurve, LensRays, PinholeRays } from './benches/Displays.jsx'

// A bench task on the kernel's parameter bench (../../../shell/bench/Bench.jsx), with the vision domain's pictures
// (../benches/index.js DISPLAYS): the bench passes the task once its goal holds.
const DISPLAYS = { pinholeRays: PinholeRays, lensRays: LensRays, blurCurve: BlurCurve }

export default function BenchScreen({ game, level: entry, solve, theme, phone }) {
  const task = entry.source
  const play = <Bench bench={task.bench} model={task.made.model} displays={DISPLAYS} onSolve={() => solve(null)} theme={theme} />
  const brief = <Brief game={game} level={entry} hint={task.hint} phone={phone} />
  return <Level phone={phone} className="vi-bench-level" brief={brief} stage={phone ? <PinnedPlay>{play}</PinnedPlay> : play} />
}
