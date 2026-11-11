// A deliberately small diagnostic ECU: one configured data identifier, read as a complete message.
// Transport, sessions, security and timing beyond the next tick are not modeled here.
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
