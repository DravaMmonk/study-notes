import { OPS } from './ops.js'
import { vocabulary } from './vocabulary.js'

export default {
  id: 'logic',
  register(registry) {
    registry.vocabulary('logic', vocabulary)
    registry.implementOperations(OPS)
    registry.add('contentKind', 'logic:wordset', { about: { en: 'A named formula-reading dictionary' }, schema: { type: 'map', of: { type: 'text' } } })
    registry.add('contentKind', 'logic:quote', { about: { en: 'A quoted name' }, schema: { type: 'str' } })
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
