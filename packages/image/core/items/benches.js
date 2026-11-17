import { qualifyItems } from 'kernel'
import { obscura } from '../benches/obscura.js'
import { wave } from '../benches/waves.js'
export const BENCH_MODELS = qualifyItems('image', 'benchModel', { obscura, wave })

export function benchOf(bench, models = BENCH_MODELS) {
  const item = models[bench.model]
  const model = item.make(bench.setup ?? {}, bench)
  return { bench, model, verify: () => item.verify(model, bench) }
}
