const staged = game => [...(game.circuit?.played?.values() ?? [])].some(tasks => tasks.some(task => task.carry || task.carries))
export const circuitSettings = [
  { key: 'manualBlocks', group: 'edit', label: { zh: '手动分区', en: 'Manual partitioning' }, kind: 'toggle', default: false, when: (game, { phone = false } = {}) => phone && staged(game) },
  { key: 'connectionLabels', group: 'display', label: { zh: '跨段连线画成标签', en: 'Label cross-section wires' }, kind: 'toggle', default: (_game, { phone = false } = {}) => phone, when: staged },
]
