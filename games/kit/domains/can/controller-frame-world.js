import { arbitrationLength, transmitBits } from './bus.js'

// Event-level projection for the controller prototype's declared test scope: one initial reception,
// at most one initial rival, scripted transmit faults, an optional clean suspension interruption,
// and idle bus-off recovery. It deliberately does not model arbitrary CAN traffic or error overlap.
export function projectController(test, { start, prep, request }) {
  const initial = test.inputs[start].findIndex(Boolean)
  const incoming = test.bus.frames[0]
  const before = test.inputs[prep].slice(0, incoming.at)
  let tec = before.filter((event) => event === 1).length * 8
  let rec = before.filter((event) => event === 3).length
  const receptions = []
  const receiveSuccess = (frame) => { receptions.push({ id: frame.id, data: frame.data }); rec = rec > 127 ? 127 : Math.max(0, rec - 1) }
  if ((test.flipTicks ?? []).some((tick) => tick >= incoming.at && tick < initial)) rec++
  else receiveSuccess(incoming)
  const attempts = []
  let at = initial
  const rival = test.contenders[0]
  if (rival && rival.id < test.tx.id) {
    attempts.push({ tick: at, tec, rec })
    receiveSuccess(rival)
    at += transmitBits(rival).length
  }
  const bits = transmitBits(test.tx)
  let interruption = false
  for (let attemptsLeft = 64; attemptsLeft > 0 && at < test.ticks; attemptsLeft--) {
    attempts.push({ tick: at, tec, rec })
    const ack = at + bits.length - 12
    const bitError = (test.flipTicks ?? []).find((tick) => tick >= at + arbitrationLength(test.tx.id) && tick < ack)
    const failure = bitError ?? (test.bus.bits[ack] === 1 ? ack : null)
    if (failure === null) return { attempts, done: at + bits.length - 1, tec: Math.max(0, tec - 1), rec, receptions }
    const passiveBefore = tec >= 128 || rec >= 128
    if (!passiveBefore || bitError !== undefined) tec += 8
    if (tec >= 256) {
      const accepted = test.inputs[request].findIndex((value, tick) => tick >= failure + 128 * 11 && Boolean(value))
      if (accepted < 0) break
      tec = 0; rec = 0; at = accepted + 1
      continue
    }
    const passive = tec >= 128 || rec >= 128
    const frame = passive && !interruption ? test.bus.frames[1] : null
    const intermissionEnd = failure + 17
    if (frame && frame.at > intermissionEnd && frame.at <= intermissionEnd + 8) {
      interruption = true
      receiveSuccess(frame)
      at = frame.at + transmitBits(frame).length
    } else at = failure + 18 + (passive ? 8 : 0)
  }
  return { attempts, done: null, tec, rec, receptions }
}
