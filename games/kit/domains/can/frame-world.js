import { transmitBits } from './bus.js'

// Schedule clean standard data frames from independent nodes. A node's frame becomes eligible at
// `at`; all eligible nodes arbitrate by identifier, and a loser waits for the next intermission.
// Errors, missing ACKs and equal identifiers are deliberately outside this model's present scope.
export function scheduleFrames(requests) {
  const pending = requests.map((request, index) => ({ ...request, index }))
  if (pending.some(({ at, id, data, node }) => !Number.isInteger(at) || at < 0 || !Number.isInteger(id) || id < 0 || id > 0x7ff || !Array.isArray(data) || data.length > 8 || data.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255) || typeof node !== 'string')) throw new Error('invalid frame request')
  const events = []
  let now = 0
  while (pending.length) {
    now = Math.max(now, Math.min(...pending.map((request) => request.at)))
    const ready = pending.filter((request) => request.at <= now).sort((a, b) => a.id - b.id)
    if (new Set(ready.map((request) => request.node)).size !== ready.length) throw new Error('a node cannot contend with itself')
    if (ready.length > 1 && ready[0].id === ready[1].id) throw new Error('equal identifier arbitration is not supported')
    const winner = ready[0]
    const end = now + transmitBits(winner).length
    events.push({ node: winner.node, id: winner.id, data: winner.data, start: now, end, contenders: ready.map((request) => request.node) })
    pending.splice(pending.indexOf(winner), 1)
    now = end
  }
  return events
}
