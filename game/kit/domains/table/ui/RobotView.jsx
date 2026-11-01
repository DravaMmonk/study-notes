// What the robot reads: its view, the facts about its own cell, its arm. On a board the input cards hold it (and a
// click on a sensor adds or removes its output on its card); a part's bench in the components box shows it whole.

import { L } from '../../../shell/i18n.js'
import { ICONS } from './glyphs.js'
import { tr } from '../lang.js'
import { MARKS, markOf } from './svg.js'

const HUES = 6 // read sensors take the theme tokens --w0…--w5, in level order (board.js colours readers the same)

/** A read sensor's colour: one palette, in the order the level offers them. */
const sourceColor = (ui, id) => `var(--w${ui.avail.filter((x) => ui.lit.includes(x)).indexOf(id) % HUES})`
const shown = (v) => v !== undefined && v !== null && v !== ''

const Glyph = ({ kind }) => <svg className="glyph" viewBox="0 0 48 32" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[kind] }} />
/** A cell's mark (start, end, a key…) as a small icon in its corner, as on the test board. */
const Mark = ({ kind }) => (MARKS[kind] ? <svg className={`mk mk-${kind} mk-ico`} viewBox="0 0 12 12" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MARKS[kind] }} /> : null)

/**
 * ui = { sensors, avail, lit, win: { robot, wins: [{ label, n, cells }], arm, facts } }: a sensor the circuit reads
 * (ui.lit) is marked; the robot's own cell is framed red. Values follow the test board or the run. With `onPick`,
 * whatever the robot can read is a button that adds or removes its output on its input card. `part` draws one card's
 * share alone: 'view' the window and the arm, 'facts' the cell's facts.
 */
export default function RobotView({ ui, part = null, onPick }) {
  const { lit, win: w } = ui
  const vision = (w.wins[0].n - 1) / 2
  const pick = (id) => (event) => {
    // The card it sits on opens its sheet on a tap anywhere else (a phone).
    event.stopPropagation()
    onPick(id)
  }
  const tag = (id) => <span className="tag" style={{ '--c': sourceColor(ui, id) }}>{L(ui.sensors[id].short)}</span>

  const cell = (x, key, { area, bot, label } = {}) => {
    const can = Boolean(x.sensor) && ui.avail.includes(x.sensor)
    const on = can && lit.includes(x.sensor)
    // World marks (key, door, rock…) and read states get a v- prefix, so page-wide rules such as the keypad's .key or
    // the empty-state .empty never reach a cell.
    const cls = ['vcell', ...String(x.cls || '').split(' ').filter(Boolean).map((c) => `v-${c}`), x.key === null ? 'off' : '', on ? 'on' : '', x.out ? 'self' : '', x.state && `v-${x.state}`].filter(Boolean).join(' ')
    const mark = x.key !== null && markOf(x)
    const corner = mark && !x.mark ? '' : x.corner
    const v = x.key === null ? tr('界外', 'out') : x.value
    const inner = (
      <>
        {mark && <Mark kind={mark} />}
        {shown(corner) && x.key !== null && <span className="vc">{L(corner)}</span>}
        <span className={`vv${String(v).length > 4 ? ' long' : ''}`}>{L(v)}</span>
        {on && tag(x.sensor)}
        {bot && <svg className="vbot" viewBox="0 0 32 32" aria-hidden="true" dangerouslySetInnerHTML={{ __html: w.robot.look }} />}
        {label && <span className="vl">{L(label)}</span>}
      </>
    )
    const style = area ? { gridArea: area } : undefined
    return onPick && can
      ? <button key={key} className={`${cls} can`} type="button" style={style} aria-pressed={on} title={L(ui.sensors[x.sensor].label)} onClick={pick(x.sensor)}>{inner}</button>
      : <span key={key} className={cls} style={style}>{inner}</span>
  }

  const wins = w.wins.map((win, k) => (
    <div className="vblock" key={k}>
      {win.label && <span className="vsub">{L(win.label)}</span>}
      <div className={`vwin n${win.n}`}>{win.cells.map((x) => cell(x, `${x.r},${x.c}`, { area: `${x.r + 1}/${x.c + 1}`, bot: !k && x.r === vision && x.c === vision }))}</div>
    </div>
  ))
  const arm = !w.arm ? null : w.arm.sweeps
    ? <Sweeps arm={w.arm} ui={ui} tag={tag} pick={onPick && pick} />
    : (
      <div className="varm">
        <span className="vsub">{`${L(w.robot.armName)} · ${L(w.arm.label)}`}</span>
        <div className="varm-row">{w.arm.cells.map((x, k) => cell(x, k, { label: x.label }))}</div>
      </div>
    )
  const facts = w.facts.map((f) => {
    const m = ui.sensors[f.id]
    const on = lit.includes(f.id)
    const inner = <><Glyph kind={m.icon} /><span>{L(m.label)}</span><span className="vv">{L(f.value)}</span>{on && tag(f.id)}</>
    return onPick
      ? <button key={f.id} className={`vfact${on ? ' on' : ''}`} type="button" aria-pressed={on} onClick={pick(f.id)}>{inner}</button>
      : <span key={f.id} className={`vfact${on ? ' on' : ''}`}>{inner}</span>
  })
  const main = <div className="vpart vmain"><div className="vwins">{wins}</div></div>
  const extra = arm && <div className="vpart vextra">{arm}</div>
  if (part === 'view') return <>{main}{extra}</>
  if (part === 'facts') return <div className="vpart vfacts">{facts}</div>
  // The robot's window and the cell's facts side by side, then the arm under them.
  return (
    <>
      <div className={`vtop${facts.length ? ' has-facts' : ''}`}>
        {main}
        {facts.length > 0 && <div className="vpart vfacts"><span className="vsub">{tr('本格信息', 'This cell')}</span>{facts}</div>}
      </div>
      {extra}
    </>
  )
}

/** A sweeping arm: each sweep is one sensor, the whole strip of cells it passes over (dimmed where the level's filter
 *  drops a cell). */
function Sweeps({ arm, ui, tag, pick }) {
  const strip = (sw) => (sw.cells.length
    ? sw.cells.map((x, k) => (
      <span key={k} className={`vcell sm${x.out ? ' v-out' : ''}${x.state ? ` v-${x.state}` : ''}`}>
        {x.mark && <Mark kind={x.mark} />}
        {x.label !== undefined && <span className="vc">{L(x.label)}</span>}
        <span className="vv">{L(x.value)}</span>
      </span>
    ))
    : <em className="vnone">{tr('一格也没有', 'no cells at all')}</em>)
  return (
    <div className="varm sweeps">
      <span className="vsub">{`${tr('扫描臂', 'Sweep arm')} · ${L(arm.label)}`}</span>
      {arm.sweeps.map((sw) => {
        const can = ui.avail.includes(sw.sensor)
        const on = can && ui.lit.includes(sw.sensor)
        const body = <><span className="vsl">{L(sw.label)}</span><span className="vstrip">{strip(sw)}</span>{on && tag(sw.sensor)}</>
        return pick && can
          ? <button key={sw.sensor} className={`vsweep${on ? ' on' : ''}`} type="button" aria-pressed={on} onClick={pick(sw.sensor)}>{body}</button>
          : <span key={sw.sensor} className={`vsweep${on ? ' on' : ''}`}>{body}</span>
      })}
    </div>
  )
}
