import { vocabulary } from './vocabulary.js'
import { PRIMITIVES } from './model/parts.js'

/** Register the table machine and its closed capabilities. */
export default {
  id: 'table',
  register(registry) {
    registry.vocabulary('table', vocabulary)
    registry.add('display', 'table:hero', { about: { en: 'Table course map illustration' }, role: 'hero' })
    registry.add('display', 'table:introduction', { about: { en: 'Table introduction figure' }, role: 'figure' })
    registry.add('display', 'table:circuit', { about: { en: 'Robot cards, readouts and panels' }, role: 'circuit' })
    registry.add('display', 'table:manual', { about: { en: 'Manual table board presentation' }, role: 'board' })
    registry.add('display', 'table:catalog', { about: { en: 'Robot piece presentation' }, role: 'catalog' })
    registry.implementDisplays(['table:hero', 'table:introduction', 'table:circuit', 'table:manual', 'table:catalog'], '../modules/table/ui/displays.js')
    registry.add('board', 'table:robot', {
      about: { zh: '逐格运行电路并读写表格的机器人', en: 'A robot that runs a circuit while reading and writing table cells' },
      valueTypes: ['circuit:number', 'circuit:boolean', 'table:category', 'table:numbers', 'table:booleans'],
      primitives: Object.keys(PRIMITIVES),
    })
    registry.add('valueType', 'table:number-input', {
      about: { zh: '数或一段数', en: 'A number or a segment of numbers' },
      accepts: ['circuit:number', 'table:numbers'],
    })
    registry.add('valueType', 'table:boolean-input', {
      about: { zh: '真假值或一段真假值', en: 'A boolean or a segment of booleans' },
      accepts: ['circuit:boolean', 'table:booleans'],
    })
    for (const [name, about] of Object.entries({
      category: { zh: '类别及其显示名称', en: 'A category and its displayed label' },
      numbers: { zh: '一段数值', en: 'A segment of numbers' },
      booleans: { zh: '一段真假值', en: 'A segment of boolean values' },
    })) registry.add('valueType', `table:${name}`, { about })
  },
}
