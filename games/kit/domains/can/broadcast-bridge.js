// Two game-defined responders to one functional read. Each sends a 20-byte positive response,
// waits for its own unlimited flow control, then alternates its padded consecutive frames.
export const newBroadcastBridge = () => ({ source: null, frame: null, phase: 'request', messages: null, offsets: [6, 6], sequences: [1, 1], error: null })

export function advanceBroadcastBridge(state, target, outgoing, profile) {
  const fail = (error) => ({ ...state, source: null, frame: null, error })
  if (state.error) return state
  if (state.phase === 'request') {
    if (target !== 255 || JSON.stringify(outgoing) !== JSON.stringify([3, 0x22, 0xf1, 0x90])) return fail('expected one functional read request')
    const messages = [profile.valueA, profile.valueB].map((value) => [0x62, 0xf1, 0x90, ...value])
    return { ...state, messages, source: 0x7e8, frame: [0x10, messages[0].length, ...messages[0].slice(0, 6)], phase: 'firstA' }
  }
  if (state.phase === 'firstA' || state.phase === 'firstB') {
    const expected = state.phase === 'firstA' ? 0x7e8 : 0x7e9
    if (target !== expected || JSON.stringify(outgoing) !== JSON.stringify([0x30, 0, 0])) return fail('expected flow control for the responding controller')
    if (state.phase === 'firstA') return { ...state, source: 0x7e9, frame: [0x10, state.messages[1].length, ...state.messages[1].slice(0, 6)], phase: 'firstB' }
  } else if (outgoing != null || target != null) return fail('unexpected request during the responses')
  if (state.phase === 'done') return { ...state, source: null, frame: null }
  const index = state.phase === 'firstB' || state.phase === 'dataB' ? 0 : 1
  const data = state.messages[index].slice(state.offsets[index], state.offsets[index] + 7)
  if (!data.length) return { ...state, source: null, frame: null, phase: 'done' }
  const offsets = [...state.offsets], sequences = [...state.sequences]
  offsets[index] += data.length
  const frame = [0x20 | sequences[index], ...data, ...Array(7 - data.length).fill(0)]
  sequences[index] = (sequences[index] + 1) & 15
  return { ...state, source: 0x7e8 + index, frame, offsets, sequences, phase: index === 0 ? 'dataA' : 'dataB' }
}
