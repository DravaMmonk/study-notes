// A fictional programming ECU. It models one-byte addresses, two-byte image lengths, a toy byte-sum
// check and a configured transfer block limit; it is not a model of any real vehicle bootloader.
export const newFlashState = () => ({ phase: 'idle', size: 0, data: [], next: 1, last: null, applicationValid: true })
const negative = (service, reason) => [0x7f, service, reason]

// null means this request is not a programming operation. Otherwise return its reply and next state.
export function flashRequest(flash, request, profile, session, unlocked) {
  const service = request[0]
  if (![0x11, 0x31, 0x34, 0x36, 0x37].includes(service)) return null
  if (session !== 2 || (profile.requiresSecurity && !unlocked)) return { flash, reply: negative(service, profile.requiresSecurity && !unlocked ? 0x33 : 0x22) }
  if (service === 0x31) {
    if (request.length !== 4 || request[1] !== 1 || request[2] !== 0xff) return { flash, reply: negative(service, 0x13) }
    if (request[3] === 0) return { flash: { ...newFlashState(), phase: 'erased', applicationValid: false }, reply: [0x71, 1, 0xff, 0] }
    if (request[3] === 1 && flash.phase === 'transferred') {
      const checksum = flash.data.reduce((sum, byte) => (sum + byte) & 255, 0)
      const good = checksum === profile.expectedChecksum
      return { flash: { ...flash, phase: good ? 'verified' : 'transferred' }, reply: [0x71, 1, 0xff, 1, checksum, Number(!good)] }
    }
    return { flash, reply: negative(service, 0x24) }
  }
  if (service === 0x34) {
    if (request.length !== 6 || request[1] !== 0 || request[2] !== 0x12) return { flash, reply: negative(service, 0x13) }
    if (flash.phase !== 'erased') return { flash, reply: negative(service, 0x24) }
    const size = request[4] * 256 + request[5]
    if (!size) return { flash, reply: negative(service, 0x31) }
    return { flash: { ...flash, phase: 'downloading', size, data: [], next: 1, last: null }, reply: [0x74, 0x10, profile.maxBlock] }
  }
  if (service === 0x36) {
    if (request.length < 3 || request.length > profile.maxBlock) return { flash, reply: negative(service, 0x13) }
    if (flash.phase !== 'downloading') return { flash, reply: negative(service, 0x24) }
    const sequence = request[1], data = request.slice(2)
    if (flash.last && sequence === flash.last.sequence && data.length === flash.last.data.length && data.every((byte, index) => byte === flash.last.data[index])) return { flash, reply: [0x76, sequence] }
    if (sequence !== flash.next) return { flash, reply: negative(service, 0x73) }
    if (flash.data.length + data.length > flash.size) return { flash, reply: negative(service, 0x31) }
    return { flash: { ...flash, data: [...flash.data, ...data], next: (sequence + 1) & 255, last: { sequence, data } }, reply: [0x76, sequence] }
  }
  if (service === 0x37) {
    if (request.length !== 1) return { flash, reply: negative(service, 0x13) }
    if (flash.phase !== 'downloading' || flash.data.length !== flash.size) return { flash, reply: negative(service, 0x24) }
    return { flash: { ...flash, phase: 'transferred' }, reply: [0x77] }
  }
  if (request.length !== 2 || request[1] !== 1) return { flash, reply: negative(service, 0x13) }
  if (flash.phase !== 'verified') return { flash, reply: negative(service, 0x22) }
  return { flash: { ...flash, phase: 'running', applicationValid: true }, reply: [0x51, 1] }
}
