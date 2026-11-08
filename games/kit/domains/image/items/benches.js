// The image domain's bench models (vocabulary.js benchModel): the simulations behind the parameter benches
// (games/kit/engine/bench.js), each in ../benches/. A level's bench names its model and gives everything else as data:
// knobs, cases, stages, actions, the goal and the layout. A model item is
//   { about, setup?, stage?, case?    its parameters, and the fields it adds to a stage or a case (schemas)
//     make(setup, bench) → model      { view(values, ctx), and for a process start(), act(), after() }
//     verify(model, bench) → ''       the bench's lesson holds on these data (what is wrong, else ''), for npm run check }
import { obscura } from '../benches/obscura.js'
import { racer } from '../benches/racer.js'
import { alias, probe, sum, wave } from '../benches/waves.js'
import { stop } from '../benches/fitting.js'
import { contrast } from '../benches/contrast.js'
import { hough } from '../benches/hough.js'
import { ransac } from '../benches/ransac.js'
import { cover } from '../benches/cover.js'
import { gan } from '../benches/gan.js'
import { appleLight } from '../benches/apple-light.js'
import { separable } from '../benches/separable.js'
import { attentionRoles } from '../benches/attention-roles.js'

export const BENCH_MODELS = { obscura, racer, wave, sum, probe, alias, stop, contrast, hough, ransac, cover, gan, appleLight, separable, attentionRoles }

/** A bench level's bench with its model made, and its check (verify: '' when the lesson holds). */
export function benchOf(bench) {
  const item = BENCH_MODELS[bench.model]
  const model = item.make(bench.setup ?? {}, bench)
  return { bench, model, verify: () => item.verify(model, bench) }
}
