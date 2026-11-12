import { useEffect, useRef, useState } from 'react'
import { L, T } from '../../../shell/i18n.js'
import { frameBits } from '../bus.js'

// A clean frame event expands into the same acknowledged bits used by the bus model.
export default function FrameReplay({ events }) {
  const [chosen, setChosen] = useState(null)
  const [bit, setBit] = useState(0)
  const strip = useRef(null)
  useEffect(() => { setChosen(null); setBit(0) }, [events])
  useEffect(() => {
    const row = strip.current, cell = row?.children[bit]
    if (!cell) return
    if (cell.offsetLeft < row.scrollLeft) row.scrollLeft = cell.offsetLeft
    else if (cell.offsetLeft + cell.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = cell.offsetLeft + cell.offsetWidth - row.clientWidth
  }, [chosen, bit])
  const frames = events?.filter((event) => event.id !== null) ?? []
  if (!frames.length) return null
  const event = frames[chosen]
  const bits = event ? frameBits(event) : []
  return <section className="can-replay" aria-label={L(T('逐位回放', 'Bit replay'))}>
    <h4>{L(T('逐位回放', 'Bit replay'))}</h4>
    <p>{L(T('选择一帧，查看这条正常应答帧的总线位；这里不重放仲裁失败或错误。', 'Select a frame to inspect its acknowledged bus bits; arbitration losses and errors are not replayed here.'))}</p>
    <div className="can-replay-frames">{frames.map((frame, index) => <button key={`${frame.start}-${index}`} type="button" aria-pressed={chosen === index} onClick={() => { setChosen(index); setBit(0) }}>
      {index + 1} · 0x{frame.id.toString(16).toUpperCase().padStart(3, '0')} · {frame.start}
    </button>)}</div>
    {event && <div className="can-replay-detail">
      <p>{L(T('总线位拍', 'Bus bit tick'))} {event.start + bit} · {L(T('帧内', 'In frame'))} {bit + 1}/{bits.length} · {L(T('位值', 'Bit'))} {bits[bit]}</p>
      <div ref={strip} className="can-replay-bits" aria-label={L(T('帧的总线位', 'Frame bus bits'))}>{bits.map((value, index) => <span key={index} className={index === bit ? 'is-current' : undefined}>{value}</span>)}</div>
      <div className="can-replay-controls">
        <button type="button" disabled={bit === 0} onClick={() => setBit(bit - 1)}>{L(T('前一位', 'Previous bit'))}</button>
        <button type="button" disabled={bit === bits.length - 1} onClick={() => setBit(bit + 1)}>{L(T('后一位', 'Next bit'))}</button>
      </div>
    </div>}
  </section>
}
