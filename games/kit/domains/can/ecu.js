// A deliberately small diagnostic ECU: one configured data identifier, read as a complete message.
// Transport is not modeled here; security uses an explicitly fictional one-byte key algorithm.
export function ecuReply(request, { did, value, requiresExtended, requiresSecurity }, session = 1, unlocked = false) {
  if (request == null) return null
  if (!Array.isArray(request) || !request.length || request.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return null
  const service = request[0]
  if (service === 0x10) {
    if (request.length !== 2) return [0x7f, service, 0x13]
    if (![1, 3].includes(request[1])) return [0x7f, service, 0x12]
    return [0x50, request[1], 0x00, 0x32, 0x01, 0xf4]
  }
  if (service === 0x3e) {
    if (request.length !== 2) return [0x7f, service, 0x13]
    if (request[1] !== 0) return [0x7f, service, 0x12]
    return [0x7e, 0]
  }
  if (service !== 0x22) return [0x7f, service, 0x11]
  if (request.length !== 3) return [0x7f, service, 0x13]
  const requested = request[1] * 256 + request[2]
  if (requested !== did) return [0x7f, service, 0x31]
  if (requiresExtended && session !== 3) return [0x7f, service, 0x22]
  if (requiresSecurity && !unlocked) return [0x7f, service, 0x33]
  return [0x62, request[1], request[2], ...value]
}

// Each call advances one tick. A configured number of pending replies precedes the final answer;
// while a request is pending, additional requests are ignored.
export function ecuAdvance(state, request, profile) {
  const active = Array.isArray(request) && request.length > 0 && request.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  const idle = active ? 0 : state.idle + 1
  const session = state.session === 3 && profile.timeout && idle >= profile.timeout ? 1 : state.session
  const locked = Math.max(0, state.locked - 1)
  state = { ...state, idle, session, locked, ...(session === 1 ? { unlocked: false, seedIssued: false } : {}) }
  if (state.pending) {
    if (state.pending.remaining > 0) return { ...state, reply: [0x7f, 0x22, 0x78], pending: { ...state.pending, remaining: state.pending.remaining - 1 } }
    return { ...state, reply: state.pending.final, pending: null }
  }
  if (active && request[0] === 0x27 && profile.seed !== undefined) {
    if (session !== 3) return { ...state, reply: [0x7f, 0x27, 0x7f] }
    if (state.locked > 0) return { ...state, reply: [0x7f, 0x27, 0x37] }
    if (request.length === 2 && request[1] === 1) return { ...state, seedIssued: true, reply: [0x67, 1, profile.seed] }
    if (request.length === 3 && request[1] === 2) {
      if (!state.seedIssued) return { ...state, reply: [0x7f, 0x27, 0x24] }
      if (request[2] === (profile.seed ^ 0x5a)) return { ...state, unlocked: true, seedIssued: false, failures: 0, reply: [0x67, 2] }
      const failures = state.failures + 1
      return { ...state, seedIssued: false, failures: failures >= 3 ? 0 : failures, locked: failures >= 3 ? 4 : 0, reply: [0x7f, 0x27, failures >= 3 ? 0x36 : 0x35] }
    }
    return { ...state, reply: [0x7f, 0x27, 0x13] }
  }
  const final = ecuReply(request, profile, state.session, state.unlocked)
  if (final?.[0] === 0x62 && profile.waits > 0) return { ...state, reply: [0x7f, 0x22, 0x78], pending: { final, remaining: profile.waits - 1 } }
  return { ...state, session: final?.[0] === 0x50 ? final[1] : state.session, ...(final?.[0] === 0x50 && final[1] === 1 ? { unlocked: false, seedIssued: false } : {}), reply: final, pending: null }
}
