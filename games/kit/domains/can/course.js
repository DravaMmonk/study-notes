// A bus game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be in
// it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests on a bus built from their frames (bus.js) and what its outputs must
// be (wants.js), its hidden tests likewise, its reference board and naive board; the parts the levels build (each
// running the board the player passed its level's last task with: a packed part that keeps its own registers), and the
// course the shared audit checks.
//
// A task's tests run as long as their bus; its inputs give one value a tick.
// Returns the course read (../../engine/circuit-domain.js circuitCourse): LEVELS, played (level id → its tasks read),
// CHAPTERS, course, partOf, BUILT, offerIn, opening, carried, syncOwn, blueprints, and `wrong`, what reading the content
// found that its schema cannot say (an output with nothing wanted, a frame too long, a test without an input).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { arbitrationLength, busOf, transmitBits } from './bus.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'
import { callOf } from '../../engine/schema.js'

// An identifier or a byte as content writes it: a number, or hexadecimal.
const num = (v) => (typeof v === 'string' ? parseInt(v, 16) : v)

/** A test as content writes it, its bus laid out bit by bit; it runs as many ticks as its bus is long. */
const testOf = (t) => {
  const bus = busOf({ ...t.bus, frames: t.bus.frames.map((f) => ({ ...f, id: num(f.id), data: (f.data ?? []).map(num) })) })
  if (t.peerBits) bus.bits = bus.bits.map((bit, tick) => bit & t.peerBits[tick])
  if (t.peerLow) bus.bits = bus.bits.map((bit, tick) => t.peerLow.includes(tick) ? 0 : bit)
  const tx = t.tx && { ...t.tx, id: num(t.tx.id), data: (t.tx.data ?? []).map(num) }
  const txAt = t.txAt ?? 0
  const txBits = tx ? transmitBits(tx) : []
  const txEnd = tx ? arbitrationLength(tx.id) : 0
  const inputs = {
    ...(t.inputs ?? {}),
    ...Object.fromEntries(Object.entries(t.constants ?? {}).map(([name, value]) => [name, bus.bits.map(() => value)])),
    ...Object.fromEntries(Object.entries(t.pulses ?? {}).map(([name, ticks]) => [name, bus.bits.map((_, tick) => Number(ticks.includes(tick)))])),
    ...Object.fromEntries(Object.entries(t.txInputs ?? {}).map(([name, kind]) => [name, bus.bits.map((_, tick) => kind === 'bit' ? txBits[tick - txAt] ?? 1 : kind === 'ack' ? Number(tick === txAt + txBits.length - 12) : Number(tick >= txAt && tick - txAt < txEnd))])),
    ...Object.fromEntries((t.lineInputs ?? []).map((name) => [name, bus.bits])),
  }
  const contenders = (t.contenders ?? []).map((node) => ({ ...node, id: num(node.id), data: (node.data ?? []).map(num) }))
  return { ...t, bus, inputs, tx, contenders, queue: (t.queue ?? []).map(num), ticks: bus.bits.length }
}

export function canCourse(content) {
  // A test read: what reading it finds that its schema cannot say, then its bus.
  const test = (t, task, say) => {
    for (const f of t.bus.frames) if ((f.data ?? []).length > 8) say('a frame carries at most 8 bytes')
    if ((t.tx?.data ?? []).length > 8) say('a transmitted frame carries at most 8 bytes')
    for (const node of t.contenders ?? []) if ((node.data ?? []).length > 8) say('a competing frame carries at most 8 bytes')
    if (t.txInputs && !t.tx) say('transmission inputs require a frame')
    if (task.expectsTx && !t.tx) say('a transmission test has no expected frame')
    if (task.expectsRetry) {
      if (new Set(task.retryStarts).size > 1) say('retry checks must use the same start input')
      if ((t.contenders ?? []).some((node) => (node.at ?? 0) !== (t.txAt ?? 0))) say('retry contenders must start with the transmitted frame')
      const ids = [t.tx?.id, ...(t.contenders ?? []).map((node) => node.id)].filter((id) => id !== undefined).map(num)
      if (new Set(ids).size !== ids.length) say('retry contenders must use distinct identifiers')
      if (t.bus.frames.length || t.peerBits || t.peerLow?.length || t.flipTicks?.length) say('retry tests use a clean idle bus and the declared contenders')
      if (t.tx && JSON.stringify((t.tx.data ?? []).map(num)) !== JSON.stringify((t.queue ?? []).map(num))) say('retry queue must contain the transmitted frame data')
    }
    if (task.expectsBitError && t.contenders?.length) say('bit-error checks require scripted peers rather than active contenders')
    if (task.expectsAck && t.contenders?.length) say('ACK checks require scripted peers rather than active contenders')
    if (task.expectsAckRetry) {
      if (t.bus.frames.length || t.contenders?.length || t.peerBits || t.flipTicks?.length) say('ACK retry tests use an idle bus with scripted acknowledgements')
      if (t.tx && JSON.stringify((t.tx.data ?? []).map(num)) !== JSON.stringify((t.queue ?? []).map(num))) say('ACK retry queue must contain the transmitted frame data')
      if (!task.pulls?.rewind) say('ACK retry tests require a rewindable queue')
    }
    if (task.expectsPassiveAck) {
      if (t.bus.frames.length || t.contenders?.length || t.peerBits || t.flipTicks?.length) say('passive ACK retry tests use an idle bus with scripted acknowledgements')
      if (t.tx && JSON.stringify((t.tx.data ?? []).map(num)) !== JSON.stringify((t.queue ?? []).map(num))) say('passive ACK retry queue must contain the transmitted frame data')
      if (!task.pulls?.rewind) say('passive ACK retry tests require a rewindable queue')
    }
    if (task.pulls) {
      if (!task.inputs?.some((input) => input.name === task.pulls.input)) say(`queue input ${task.pulls.input} is not a task input`)
      if (!task.inputs?.some((input) => input.name === task.pulls.available)) say(`queue availability ${task.pulls.available} is not a task input`)
      if (task.pulls.last && !task.inputs?.some((input) => input.name === task.pulls.last)) say(`queue last flag ${task.pulls.last} is not a task input`)
      const queueInputs = [task.pulls.input, task.pulls.available, task.pulls.last].filter(Boolean)
      if (new Set(queueInputs).size !== queueInputs.length) say('queue value, availability and last flag must be different inputs')
      if (!task.outputs?.some((output) => output.name === task.pulls.next)) say(`queue advance ${task.pulls.next} is not a task output`)
      if (task.pulls.rewind && !task.outputs?.some((output) => output.name === task.pulls.rewind)) say(`queue rewind ${task.pulls.rewind} is not a task output`)
      if (task.pulls.rewind === task.pulls.next) say('queue rewind and advance must be different outputs')
      if (!t.queue) say('a test gives the board no queue to pull from')
      for (const name of queueInputs) if (t.inputs?.[name] || t.lineInputs?.includes(name) || Object.prototype.hasOwnProperty.call(t.constants ?? {}, name) || Object.prototype.hasOwnProperty.call(t.pulses ?? {}, name) || Object.prototype.hasOwnProperty.call(t.txInputs ?? {}, name)) say(`queue input ${name} cannot also have another source`)
    }
    for (const i of task.inputs ?? []) {
      const name = i.name
      const sources = [Boolean(t.inputs?.[name]), Boolean(t.lineInputs?.includes(name)), Object.prototype.hasOwnProperty.call(t.constants ?? {}, name), Object.prototype.hasOwnProperty.call(t.pulses ?? {}, name), Object.prototype.hasOwnProperty.call(t.txInputs ?? {}, name)]
      if (![task.pulls?.input, task.pulls?.available, task.pulls?.last].includes(name) && !sources.some(Boolean)) say(`a test gives nothing on the input ${name}`)
      if (sources.filter(Boolean).length > 1) say(`input ${name} has more than one source`)
    }
    for (const name of [...Object.keys(t.constants ?? {}), ...Object.keys(t.pulses ?? {}), ...Object.keys(t.txInputs ?? {})]) if (!task.inputs?.some((input) => input.name === name)) say(`test input ${name} is not a task input`)
    for (const name of t.lineInputs ?? []) {
      if (task.drives || t.contenders?.length) say('line inputs cannot bind a prerecorded bus while the bus has active transmitters')
      if (!task.inputs?.some((input) => input.name === name)) say(`line input ${name} is not a task input`)
      if (t.inputs?.[name]) say(`input ${name} has both explicit values and the line`)
    }
    const result = testOf(t)
    if (task.expectsRetry && task.retryStart) {
      const starts = (result.inputs[task.retryStart] ?? []).flatMap((value, tick) => value === 1 ? [tick] : [])
      if (starts.length !== 1 || starts[0] !== (t.txAt ?? 0)) say('retry start input must pulse once at the transmitted frame start')
    }
    if (task.expectsAckRetry && t.tx && task.ackRetryStart) {
      const starts = (result.inputs[task.ackRetryStart] ?? []).flatMap((value, tick) => value === 1 ? [tick] : [])
      if (new Set(task.ackRetryStarts).size !== 1 || starts.length !== 1) say('ACK retry checks must share one start input with one pulse')
      if (starts.length === 1) {
        const size = transmitBits(result.tx).length
        let ack = starts[0] + size - 12
        let failures = 0
        while (ack < result.ticks && result.bus.bits[ack] === 1 && failures < 16) { failures++; ack += size - 12 + 18 }
        if (failures > 15) say('ACK retry tests must remain error-active')
        if (ack >= result.ticks || result.bus.bits[ack] !== 0 || ack + 11 >= result.ticks) say('ACK retry tests must finish with an acknowledged frame')
        if ((t.peerLow ?? []).some((tick) => tick !== ack)) say('ACK retry peers may only acknowledge the successful attempt')
      }
    }
    if (task.expectsPassiveAck && t.tx && task.passiveAckParams) {
      const { start, prep, reset } = task.passiveAckParams
      const starts = (result.inputs[start] ?? []).flatMap((value, tick) => value === 1 ? [tick] : [])
      const preparation = result.inputs[prep] ?? []
      const resets = (result.inputs[reset] ?? []).flatMap((value, tick) => value === 1 ? [tick] : [])
      if (task.passiveAckCalls.some((params) => params.start !== start || params.prep !== prep || params.reset !== reset)) say('passive ACK retry checks must share their inputs')
      if (starts.length !== 1 || starts[0] < 16 || resets.length !== 1 || resets[0] !== 0 || preparation.some((value, tick) => value !== Number(tick < 16))) say('passive ACK retry tests require sixteen preparation errors, one reset and one later start')
      if (starts.length === 1) {
        const size = transmitBits(result.tx).length
        let ack = starts[0] + size - 12
        while (ack < result.ticks && result.bus.bits[ack] === 1) ack += size - 12 + 26
        if (ack >= result.ticks || result.bus.bits[ack] !== 0 || ack + 11 >= result.ticks) say('passive ACK retry tests must finish with an acknowledged frame')
        if ((t.peerLow ?? []).some((tick) => tick !== ack)) say('passive ACK retry peers may only acknowledge the successful attempt')
      }
    }
    if (t.peerBits && t.peerBits.length !== result.bus.bits.length) say('other nodes must give one bit per tick')
    for (const tick of [...(t.peerLow ?? []), ...(t.flipTicks ?? []), ...Object.values(t.pulses ?? {}).flat(), ...(t.contenders ?? []).map((node) => node.at ?? 0), ...(t.txInputs ? [t.txAt ?? 0] : [])]) if (tick >= result.bus.bits.length) say(`tick ${tick} is outside the test`)
    return result
  }
  // A task's wants read; a built part keeps its own registers.
  return circuitCourse(content, { board, parts: PARTS, read: (task) => {
    const names = Object.values(task.want ?? {}).map((call) => callOf(call)[0])
    const retryCalls = Object.values(task.want ?? {}).map(callOf).filter(([name]) => ['retryDrive', 'retryLost', 'retryDone', 'retryNext', 'retryAttempts'].includes(name))
    const expectsRetry = retryCalls.length > 0
    const expectsAckRetry = names.some((name) => name.startsWith('ackRetry'))
    const ackRetryStarts = Object.values(task.want ?? {}).map(callOf).filter(([name]) => name.startsWith('ackRetry')).map(([, params]) => params.start)
    const passiveAckCalls = Object.values(task.want ?? {}).map(callOf).filter(([name]) => name.startsWith('passiveAck')).map(([, params]) => params)
    const expectsPassiveAck = passiveAckCalls.length > 0
    return { ...task, expectsRetry, expectsAckRetry, expectsPassiveAck, passiveAckCalls, passiveAckParams: passiveAckCalls[0], ackRetryStarts, ackRetryStart: ackRetryStarts[0], expectsAck: names.includes('frameAckMissing'), expectsBitError: names.some((name) => ['bitError', 'bitErrorFlagDrive', 'bitErrorFlagState', 'bitErrorFlagDone'].includes(name)), retryStarts: retryCalls.map(([, params]) => params.start), retryStart: retryCalls[0]?.[1]?.start, expectsTx: expectsRetry || expectsAckRetry || expectsPassiveAck || names.some((name) => ['frameDrive', 'frameLine', 'frameSent', 'frameQueueNext', 'frameArbitrating', 'frameAck', 'frameAckMissing'].includes(name)), want: wantOf(task.want) }
  }, test, holds: true, unwanted: (task) => task.pulls ? [task.pulls.next] : [] })
}
