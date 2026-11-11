import { ecuReply } from './ecu.js'

// One normal-addressed single-frame read request and one multi-frame positive reply. The simulated
// ECU waits for [0x30, 0, 0] after its first frame; timing is one game tick per frame, with zero padding.
export const newDiagnosticBridge = () => ({ frame: null, phase: 'request', message: null, offset: 0, sequence: 1, error: null })

export function advanceDiagnosticBridge(state, outgoing, profile) {
  const fail = (error) => ({ ...state, frame: null, error })
  if (state.error) return state
  if (state.phase === 'request') {
    if (!Array.isArray(outgoing) || outgoing.length !== 4 || outgoing[0] !== 3) return fail('invalid single-frame request')
    const message = ecuReply(outgoing.slice(1), profile)
    if (!message || message[0] !== 0x62 || message.length <= 7 || message.length > 4095) return fail('request did not produce a multi-frame positive response')
    return { ...state, frame: [0x10 | (message.length >> 8), message.length & 255, ...message.slice(0, 6)], phase: 'flow', message, offset: 6 }
  }
  if (state.phase === 'flow') {
    if (!Array.isArray(outgoing) || outgoing.length !== 3 || outgoing[0] !== 0x30 || outgoing[1] !== 0 || outgoing[2] !== 0) return fail('expected unlimited flow control')
  } else if (outgoing != null) return fail('unexpected outgoing frame')
  if (state.offset >= state.message.length) return { ...state, frame: null, phase: 'done' }
  const data = state.message.slice(state.offset, state.offset + 7)
  return { ...state, frame: [0x20 | state.sequence, ...data, ...Array(7 - data.length).fill(0)], phase: 'sending', offset: state.offset + data.length, sequence: (state.sequence + 1) & 15 }
}
