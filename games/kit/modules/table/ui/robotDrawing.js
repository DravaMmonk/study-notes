// Draw the robot's sensors as data for the kernel's interactive drawing.
import { L } from '../../../shell/i18n.js'
import { ICONS } from './glyphs.js'
import { tr } from '../lang.js'
import { signal } from '../model/format.js'
import { windowOf } from '../model/world.js'
import { MARKS, markOf, robotGlyph } from './svg.js'

const esc = (v) => String(L(v) ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
const mark = (kind) => Object.hasOwn(MARKS, kind) ? `<svg class="mk mk-${esc(kind)} mk-ico" viewBox="0 0 12 12" aria-hidden="true">${MARKS[kind]}</svg>` : ''
const svg = (shape, cls, box) => `<svg class="${cls}" viewBox="${box}" aria-hidden="true">${shape}</svg>`

/** Paint one robot observation for both the task and the component experiment. */
export function robotWindow({ world, test, task, robot, cell, shown, reads, empty, lit, readFact }) {
  const paint = (sample) => ({
    ...sample,
    value: sample.v !== undefined ? signal(sample.v) : sample.key !== null && shown.has(sample.key) ? signal(shown.get(sample.key)) : '',
    state: empty.has(sample.key) ? 'empty' : reads.has(sample.key) ? 'read' : '',
  })
  const window = windowOf(world, test, cell, robot.vision, task)
  const arm = !task.noArm && robot.arm ? window.arm : null
  const win = {
    robot,
    wins: window.wins.map((pane) => ({ ...pane, cells: pane.cells.map(paint) })),
    arm: arm && (arm.sweeps
      ? { ...arm, sweeps: arm.sweeps.map((sweep) => ({ ...sweep, cells: sweep.cells.map(paint) })) }
      : { ...arm, cells: arm.cells.map(paint) }),
    facts: task.facts.map((id) => ({ id, value: signal(readFact(id)) })),
  }
  const avail = [...task.given.offers.view, ...task.given.offers.facts]
  return { win, avail, lit, sensors: world.sensors }
}

export function robotDrawing({ sensors, avail, lit, win }, part, onPick) {
  const picked = avail.filter((x) => lit.includes(x))
  const tag = (id) => `<span class="tag" style="--c:var(--w${picked.indexOf(id) % 6})">${esc(sensors[id].short)}</span>`
  const press = (cls, body, sensor, title = '') => sensor && onPick
    ? `<button class="${esc(cls)}" type="button" data-sensor="${esc(sensor)}" aria-pressed="${lit.includes(sensor)}" title="${esc(title)}">${body}</button>`
    : `<span class="${esc(cls)}">${body}</span>`
  const cell = (x, own = false, area = '') => {
    const can = x.sensor && avail.includes(x.sensor)
    const on = can && lit.includes(x.sensor)
    const cls = ['vcell', ...String(x.cls || '').split(' ').filter(Boolean).map((c) => `v-${c}`), x.key === null && 'off', on && 'on', x.out && 'self', x.state && `v-${x.state}`, can && onPick && 'can'].filter(Boolean).join(' ')
    const icon = x.key === null ? '' : markOf(x)
    const corner = icon && !x.mark ? '' : x.corner
    const value = esc(x.key === null ? tr('界外', 'out') : x.value)
    const body = [
      mark(icon),
      x.key !== null && corner !== undefined && corner !== '' && `<span class="vc">${esc(corner)}</span>`,
      `<span class="vv${value.length > 4 ? ' long' : ''}">${value}</span>`,
      on && tag(x.sensor),
      own && svg(robotGlyph(win.robot.look), 'vbot', '0 0 32 32'),
      x.label && `<span class="vl">${esc(x.label)}</span>`,
    ].filter(Boolean).join('')
    const hit = press(cls, body, can ? x.sensor : null, can ? sensors[x.sensor].label : '')
    return area ? hit.replace(' class=', ` style="grid-area:${area}" class=`) : hit
  }
  const windows = win.wins.map((pane, k) => {
    const center = (pane.n - 1) / 2
    const items = pane.cells.map((x) => cell(x, !k && x.r === center && x.c === center, `${Number(x.r) + 1}/${Number(x.c) + 1}`)).join('')
    return `<div class="vblock">${pane.label ? `<span class="vsub">${esc(pane.label)}</span>` : ''}<div class="vwin n${esc(pane.n)}">${items}</div></div>`
  }).join('')
  const arm = win.arm
  const armWords = (label) => `<span class="vsub">${esc(label)} · ${esc(arm.label)}</span>`
  const sweep = (sw) => {
    const cells = sw.cells.map((x) => `<span class="vcell sm${x.out ? ' v-out' : ''}${x.state ? ` v-${esc(x.state)}` : ''}">${mark(x.mark)}${x.label === undefined ? '' : `<span class="vc">${esc(x.label)}</span>`}<span class="vv">${esc(x.value)}</span></span>`).join('')
    const on = lit.includes(sw.sensor)
    const body = `<span class="vsl">${esc(sw.label)}</span><span class="vstrip">${cells || `<em class="vnone">${esc(tr('一格也没有', 'no cells at all'))}</em>`}</span>${on ? tag(sw.sensor) : ''}`
    return press(`vsweep${on ? ' on' : ''}`, body, avail.includes(sw.sensor) ? sw.sensor : null)
  }
  const extra = arm ? `<div class="vpart vextra">${arm.sweeps
    ? `<div class="varm sweeps">${armWords(tr('扫描臂', 'Sweep arm'))}${arm.sweeps.map(sweep).join('')}</div>`
    : `<div class="varm">${armWords(win.robot.armName)}<div class="varm-row">${arm.cells.map((x) => cell(x)).join('')}</div></div>`}</div>` : ''
  const facts = win.facts.map(({ id, value }) => {
    const on = lit.includes(id)
    const info = sensors[id]
    const body = `${svg(Object.hasOwn(ICONS, info.icon) ? ICONS[info.icon] : '', 'glyph', '0 0 48 32')}<span>${esc(info.label)}</span><span class="vv">${esc(value)}</span>${on ? tag(id) : ''}`
    return press(`vfact${on ? ' on' : ''}`, body, id)
  }).join('')
  const factList = (title = '') => `<div class="vpart vfacts">${title ? `<span class="vsub">${esc(title)}</span>` : ''}${facts}</div>`
  const main = `<div class="vpart vmain"><div class="vwins">${windows}</div></div>`
  const markup = part === 'view' ? main + extra : part === 'facts' ? factList()
    : `<div class="vtop${facts ? ' has-facts' : ''}">${main}${facts ? factList(tr('本格信息', 'This cell')) : ''}</div>${extra}`
  return { markup, target: 'sensor', onPick, variant: part, className: part ? 'sg-cardview' : 'cview' }
}
