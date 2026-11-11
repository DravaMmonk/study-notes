// A small normal-addressing ISO-TP receiver for classical CAN. One game tick is a simulated timing
// unit. Flow control is delayed by `flowDelay` ticks; `separation` is measured in the same units.
// Errors are retained for the test; this model covers one message, optional waits, and overflow.
export const newTransportState = () => ({ response: null, due: null, waits: 0, allowed: false, remaining: 0, sequence: 1, data: [], total: null, lastTick: null, complete: false, aborted: false, error: null })

export function advanceTransport(previous, frame, profile, tick, abort = false) {
  let state = { ...previous, response: null }
  const fail = (error) => { if (!state.error) state = { ...state, error } }
  if (abort) {
    if (!profile.silent || tick < profile.timeout || state.total === null) fail('unexpected timeout')
    else state = { ...state, aborted: true }
  }
  if (frame != null) {
    if (!Array.isArray(frame) || !frame.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) fail('invalid frame data')
    else if (state.total === null) {
      const length = ((frame[0] & 15) << 8) | frame[1]
      if (frame.length !== 8 || (frame[0] >> 4) !== 1 || length !== profile.message.length || length <= 7 || frame.slice(2).some((byte, index) => byte !== profile.message[index])) fail('invalid first frame')
      else state = { ...state, total: length, data: frame.slice(2), due: profile.silent ? null : tick + profile.flowDelay, waits: profile.waits ?? 0 }
    } else if (state.complete || state.aborted) fail('frame after completed or aborted message')
    else if (!state.allowed || (frame[0] >> 4) !== 2 || (frame[0] & 15) !== state.sequence || frame.length < 2 || frame.length > 8 || (state.lastTick !== null && tick - state.lastTick < profile.separation)) fail('unexpected consecutive frame')
    else {
      const expected = profile.message.slice(state.data.length, state.data.length + Math.min(7, state.total - state.data.length))
      if (frame.length !== expected.length + 1 || frame.slice(1).some((byte, index) => byte !== expected[index])) fail('incorrect message data')
      else {
        const data = [...state.data, ...frame.slice(1)]
        const complete = data.length === state.total
        const remaining = profile.blockSize ? state.remaining - 1 : 0
        state = { ...state, data, complete, remaining, sequence: (state.sequence + 1) & 15, lastTick: tick }
        if (!complete && profile.blockSize && remaining === 0) state = { ...state, allowed: false, due: tick + profile.flowDelay, waits: profile.waits ?? 0 }
      }
    }
  }
  if (state.due === tick + 1) {
    if (state.waits > 0) state = { ...state, response: [0x31, profile.blockSize, profile.separation], waits: state.waits - 1, due: state.due + profile.flowDelay }
    else if (profile.overflow) state = { ...state, response: [0x32, 0, 0], due: null, aborted: true }
    else state = { ...state, response: [0x30, profile.blockSize, profile.separation], due: null, allowed: true, remaining: profile.blockSize }
  }
  return state
}

// Expected frame schedule for the restricted clean exchange described above.
export function transportPlan({ message, blockSize, separation, flowDelay, waits = 0, overflow = false, silent = false }) {
  const frames = new Map([[0, [0x10 | (message.length >> 8), message.length & 255, ...message.slice(0, 6)]]])
  if (overflow || silent) return frames
  const grantDelay = flowDelay * (waits + 1)
  let tick = grantDelay, count = 0, sequence = 1
  for (let offset = 6; offset < message.length; offset += 7) {
    frames.set(tick, [0x20 | sequence, ...message.slice(offset, offset + 7)])
    sequence = (sequence + 1) & 15
    count++
    const more = offset + 7 < message.length
    if (more) tick += blockSize && count === blockSize ? Math.max(grantDelay, separation, 1) : Math.max(separation, 1)
    if (blockSize && count === blockSize) count = 0
  }
  return frames
}
