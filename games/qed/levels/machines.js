// Reference machines written short (kit/domains/logic/build.js machine): a card is its type, or [type, setting] for a
// card with one setting (the rule of a rule card, the rewrite rule of a rewrite card, the list of rewrite rules of
// simp, given as an array); a frame is { frame, params?, body: [item] }, alternatives { ways: [[item]] } (an empty way
// passes the state on).
import { machine } from '../../kit/domains/logic/build.js'

const SETTING = { rw: 'rewrite', simp: 'rewrites' }
const card = (item) => {
  const [type, value] = [item].flat()
  return [type, value === undefined ? {} : { [SETTING[type] ?? 'rule']: [value].flat().join(',') }]
}
const REGIONS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']

/** A machine from the goal to the result, its items one after another. */
export function flow(...items) {
  const nodes = {}
  const wires = []
  let n = 0
  const fill = (list, where, src, dst) => {
    let from = src
    for (const item of list) {
      const id = `c${n++}`
      const at = where ? [where] : []
      if (item.ways) {
        nodes[id] = ['append', item.ways.length > 2 ? { ways: String(item.ways.length) } : {}, ...at]
        item.ways.forEach((way, k) => fill(way, `${id}/${REGIONS[k]}`, `${id}#${REGIONS[k]}`, `${id}.${REGIONS[k]}`))
      } else if (item.frame) {
        nodes[id] = [item.frame, item.params ?? {}, ...at]
        fill(item.body, `${id}/body`, `${id}#body`, `${id}.body`)
      } else nodes[id] = [...card(item), ...at]
      wires.push(`${from}>${id}.in`)
      from = id
    }
    wires.push(`${from}>${dst}`)
  }
  fill(items, null, 'in', 'out')
  return machine(nodes, wires)
}
/** A script: cards one after another from the goal to the result. */
export const script = (...steps) => flow(...steps)
