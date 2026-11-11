// Collect tentative controller field pulses and publish them only after a successful check and ACK.
// The prototype reports CRC status at the delimiter and drives ACK on the following tick. It does
// not yet report all possible EOF errors, so this is a reception checkpoint, not full CAN validation.
export function receivedFrames(ticks) {
  const frames = []
  let candidate = null
  let checked = null
  for (const tick of ticks) {
    const out = tick.outputs ?? {}
    if (checked) {
      if (tick.tick === checked.statusTick + 1 && tick.sent === 0 && tick.line === 0) {
        frames.push({ ...checked, ackTick: tick.tick })
      }
      checked = null
    }
    if (out.rxId != null) candidate = { id: out.rxId, data: [] }
    if (candidate && out.rxLength != null) candidate.length = out.rxLength
    if (candidate && out.rxByte != null) candidate.data.push(out.rxByte)
    if (out.ready) {
      if (out.kind === 0 && candidate && Number.isInteger(candidate.length) && candidate.length >= 0 && candidate.length <= 8 && candidate.data.length === candidate.length) {
        checked = { id: candidate.id, data: candidate.data, statusTick: tick.tick }
      }
      candidate = null
    }
  }
  return frames
}
