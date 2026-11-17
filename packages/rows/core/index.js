import runtime from './runtime.js'
import { meaning } from './vocabulary.js'
import { judgeSums } from './sums.js'
import { play } from './play.js'

export { readSum, judgeSums } from './sums.js'
export { prepare } from './runtime.js'
export { default as runtime } from './runtime.js'

export const equationPlay = {
  initial: ({ task }) => task.rows.map(() => null),
  read: value => value,
  write: value => value,
  normalize: value => value,
  run: (work, { task }) => { const fail = judgeSums(task.rows)(work); return { pass: !fail, fail } },
  judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }),
  runtime,
}

export function register(kernel) {
  kernel.kind('rows:equation', meaning)
  kernel.play('rows:equation', equationPlay)
  kernel.check('rows:equations', ({ content }) => runtime.validate(runtime.spec(content)))
  kernel.agent('rows:equation', {
    observe: ({ task }) => play.open({ level: task }),
    act: ({ task }, answer) => play.attempt({ level: task }, answer),
  })
}
