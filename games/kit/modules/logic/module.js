import { module as circuit } from '../../../../packages/circuit/core/index.js'
import { registerContentKinds } from '../../engine/content-kinds.js'
import { OPS } from './ops.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'logic',
  register(registry) {
    if (!registry.schemas.circuit) circuit.register(registry)
    registerContentKinds(registry, 'logic')
    registry.vocabulary('logic', vocabulary)
    registry.add('display', 'logic:hero', { about: { en: 'Logic course map illustration' }, role: 'hero' })
    registry.add('display', 'logic:proof-screen', { about: { en: 'Proof cards, readouts and panels' }, role: 'circuit' })
    registry.add('display', 'logic:gates-screen', { about: { en: 'Truth circuit cards, readouts and panels' }, role: 'circuit' })
    registry.add('display', 'logic:machine-screen', { about: { en: 'Proof assistant cards, readouts and panels' }, role: 'circuit' })
    registry.add('display', 'logic:passed', { about: { en: 'Declared rules in the pass dialog' }, role: 'passed' })
    registry.implementDisplays(['logic:hero', 'logic:proof-screen', 'logic:gates-screen', 'logic:machine-screen', 'logic:passed'], '../modules/logic/ui/displays.js')
    registry.implementOperations(OPS)
    for (const [name, about] of Object.entries({
      judgment: { en: 'A proved formula with its open hypotheses and proof term', zh: '带开放假设与证明项的已证公式' },
      'machine-value': { en: 'An equation set, proof state, rule, sentence or clause set', zh: '等式组、证明状态、规则、句子或子句集' },
      options: { en: 'Labelled choices for a card parameter', zh: '元件参数的带标签选项' },
    })) registry.add('valueType', `logic:${name}`, { about })
    registry.add('board', 'logic:proof', { about: { en: 'An inference circuit with scoped assumption frames', zh: '带作用域假设框的推理电路' }, valueTypes: ['logic:judgment'] })
    registry.add('board', 'logic:machine', { about: { en: 'A circuit over proof assistant values', zh: '处理证明助手值的电路' }, valueTypes: ['logic:machine-value'] })
    registry.add('board', 'logic:gates', { about: { en: 'A truth-value circuit', zh: '真值电路' }, valueTypes: ['circuit:boolean'] })
  },
}
