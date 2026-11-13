// The scenes a circuit level's tests are set in (vocabulary.js scene): what a test gives the circuit and what it
// expects back, from the few numbers the test writes. A level names its scene and may set it up (`setup`); each test
// writes its label and the scene's own fields (`train: false` keeps it out of training: a new sample the training is
// checked on). Each scene is
//
//   { about, setup?: schema of the level's setup, test: schema of a test's fields, make(test, setup, level) →
//     { inputs: { name: picture }, expected: { name: picture } } }
//
// with the level's inputs and outputs named as the level names them (level.inputs, level.outputs).
import { S } from '../../../../engine/schema.js'
import { picture } from '../pictures.js'
import { targetOf } from '../targets.js'
import { PIXELS } from './pixels.js'
import { FILTERS } from './filters.js'
import { FREQUENCY } from './frequency.js'
import { LIGHT } from './light.js'
import { LEARNING } from './learning.js'
import { ATTENTION } from './attention.js'
import { MATCHING } from './matching.js'
import { STEREO } from './stereo.js'
import { GENERATIVE } from './generative.js'
import { SEGMENT } from './segment.js'
import { DETECT } from './detect.js'
import { EXPLAIN } from './explain.js'
import { T as t } from '../../../../shell/i18n.js'


const pictures = (calls) => Object.fromEntries(Object.entries(calls).map(([name, call]) => [name, picture(call)]))
const FILTER = {
  filter: {
    about: t('一张图（或几张）进，按一条规则算出的图出'),
    setup: S.obj({
      target: S.call('target', { about: t('输出怎样由测试的图算出（按关卡输入的顺序）') }),
      given: S.opt(S.map(S.call('picture'), { about: t('每组测试都一样的输入（比如频率半径）') })),
    }),
    test: S.obj({ in: S.opt(S.call('picture')), inputs: S.opt(S.map(S.call('picture'), { about: t('有几个输入时，每个输入的图') })) }),
    make: (test, { target, given = {} }, level) => {
      const own = test.inputs ? pictures(test.inputs) : { [level.inputs[0]]: picture(test.in) }
      const args = level.inputs.filter((name) => name in own).map((name) => own[name])
      return { inputs: { ...own, ...pictures(given) }, expected: { [level.outputs[0]]: targetOf(target)(...args) } }
    },
  },
}

const GROUPS = [FILTER, PIXELS, FILTERS, FREQUENCY, LIGHT, LEARNING, ATTENTION, MATCHING, STEREO, GENERATIVE, SEGMENT, DETECT, EXPLAIN]
export const SCENES = Object.fromEntries(GROUPS.flatMap((group) => Object.entries(group)))
for (const name of Object.keys(SCENES)) if (GROUPS.filter((group) => name in group).length > 1) throw new Error(`two scenes are called ${name}`)

/** A level's (or a task's) tests, as the level runs take them: [{ label, inputs, expected, train? }]. */
export function testsOf(level, list = []) {
  const scene = SCENES[level.scene]
  return list.map(({ label, train, ...fields }) => ({ label, ...scene.make(fields, level.setup ?? {}, level), ...(train === undefined ? {} : { train }) }))
}
