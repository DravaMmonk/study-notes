// A deliberately small diagnostic ECU: one configured data identifier, read as a complete message.
// Transport, sessions and security are not modeled here.
export function ecuReply(request, { did, value }) {
  if (request == null) return null
  if (!Array.isArray(request) || !request.length || request.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return null
  const service = request[0]
  if (service !== 0x22) return [0x7f, service, 0x11]
  if (request.length !== 3) return [0x7f, service, 0x13]
  const requested = request[1] * 256 + request[2]
  if (requested !== did) return [0x7f, service, 0x31]
  return [0x62, request[1], request[2], ...value]
}

// Each call advances one tick. A configured number of pending replies precedes the final answer;
// while a request is pending, additional requests are ignored.
export function ecuAdvance(state, request, profile) {
  if (state.pending) {
    if (state.pending.remaining > 0) return { reply: [0x7f, 0x22, 0x78], pending: { ...state.pending, remaining: state.pending.remaining - 1 } }
    return { reply: state.pending.final, pending: null }
  }
  const final = ecuReply(request, profile)
  if (final?.[0] === 0x62 && profile.waits > 0) return { reply: [0x7f, 0x22, 0x78], pending: { final, remaining: profile.waits - 1 } }
  return { reply: final, pending: null }
}
