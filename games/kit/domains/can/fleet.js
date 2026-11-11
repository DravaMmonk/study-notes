import { ecuReply } from './ecu.js'

// Six independent message-layer controllers; offline controllers remain silent.
export function fleetReply(target, request, fleet) {
  if (!Number.isInteger(target) || target < 0 || target >= fleet.length || !fleet[target].online) return { source: null, response: null }
  const response = ecuReply(request, { did: 0xf188, value: [fleet[target].version] })
  return { source: response === null ? null : target, response }
}
