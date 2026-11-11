import { ecuAdvance } from './ecu.js'

// Message-layer controllers keep independent sessions and pending replies. Simultaneous replies
// are queued in controller order; this is a game rule, not CAN arbitration or transport.
export function newFleetState(fleet) {
  return {
    source: null, response: null, queue: [],
    controllers: fleet.map(({ version, dtcs = [] }) => ({ reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0, dtcs, record: [version], flash: null })),
  }
}

export function advanceFleet(state, target, request, fleet, tick) {
  const queue = [...state.queue]
  const controllers = state.controllers.map((controller, index) => {
    const profile = fleet[index]
    if (!profile.online) return controller
    const next = ecuAdvance(controller, target === index ? request : null, { ...profile, did: 0xf188, value: [profile.version], waits: profile.waits ?? 0 }, tick)
    if (next.reply !== null) queue.push({ source: index, response: next.reply })
    return next
  })
  const reply = queue.shift()
  return { controllers, queue, source: reply?.source ?? null, response: reply?.response ?? null }
}
