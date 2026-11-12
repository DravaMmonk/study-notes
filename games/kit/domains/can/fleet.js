import { ecuAdvance } from './ecu.js'
import { newFlashState } from './flash.js'

// Message-layer controllers keep independent sessions and pending replies. Simultaneous replies
// are queued in controller order; target 0xff broadcasts. This is not CAN arbitration or transport.
export function newFleetState(fleet) {
  return {
    source: null, response: null, queue: [],
    controllers: fleet.map(({ version, dtcs = [], flash }) => ({ reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0, dtcs, record: [version], flash: flash ? newFlashState() : null, driven: false })),
  }
}

export function advanceFleet(state, target, request, fleet, tick) {
  const queue = [...state.queue]
  const controllers = state.controllers.map((controller, index) => {
    const profile = fleet[index]
    if (!profile.online) return controller
    const ownRequest = target === index || target === 0xff ? request : null
    const prerequisite = profile.after === undefined ? null : state.controllers[profile.after]?.flash
    const blocked = ownRequest?.[0] === 0x10 && ownRequest?.[1] === 2 && profile.after !== undefined && (prerequisite?.phase !== 'running' || !prerequisite.applicationValid)
    const advanced = ecuAdvance(controller, blocked ? null : ownRequest, { ...profile, did: 0xf188, value: [profile.version], waits: profile.waits ?? 0 }, tick)
    let next = blocked ? { ...advanced, reply: [0x7f, 0x10, 0x22] } : advanced
    if (next.reply?.[0] === 0x51) next = { ...next, driven: false }
    else if (next.reply?.[0] === 0x71 && ownRequest?.[2] === 0xfe && ownRequest?.[3] === 0) next = { ...next, driven: true }
    if (next.reply !== null) queue.push({ source: index, response: next.reply })
    return next
  })
  const reply = queue.shift()
  return { controllers, queue, source: reply?.source ?? null, response: reply?.response ?? null }
}
