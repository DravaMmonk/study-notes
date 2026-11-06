// The parameter bench (games/DESIGN.md 6.4): a level for a mechanism no circuit can wire (a dark box, sampling,
// thousands of training steps). A bench is data over a domain's code:
//
//   model    the simulation, picked by name from the domain (code): what it computes from the knobs, and for a
//            process (training, a duel, timed rounds) its state and the acts that move it
//   setup    the model's own parameters
//   knobs    what the player turns: a range, an index into a list, one of some choices, or a switch
//   cases    several situations the same knobs are judged on at once (scenes, outlier ratios); optional
//   stages   steps taken in turn, each opening some knobs and with its own goal; optional
//   actions  buttons: an act of the model, run once or `repeat` times, or a reset of some knobs
//   goal     limits on what the model computes (`of`), every one must hold; a stage may give its own
//   check    live (the goal judged as the knobs turn) or submit (judged only when the player presses Check: the
//            goal's readings and the pictures' results stay hidden until then, so a knob is not slid until green)
//   layout   where the display items go: head, main (the bench's card), side (beside it), foot
//
// This module is node-safe: the schema, the judge and the number formats, shared by `npm run check` and the bench
// screen (../shell/bench/).
import { numberText } from './number.js'
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

const num = S.num()

/** How a number is written: on a knob, in a goal row, in a table. */
export const FORMATS = ['auto', 'raw', 'int', 'fixed1', 'fixed2', 'fixed3', 'fixed4', 'pct', 'pct1', 'exp', 'grouped', 'quarterPi', 'pow10', 'outOf']
const FORMAT = S.oneOf(FORMATS)

/** Text, or a text the model computes: { of: name }. */
export const TEXT_OF = S.either(S.text(), S.obj({ of: S.str() }))

const KNOB_COMMON = {
  label: S.opt(S.text()),
  start: S.opt(S.any({ about: t('起始值（阶段的 start 优先）', 'the starting value (a stage’s start comes first)') })),
  format: S.opt(FORMAT),
  unit: S.opt(S.str()),
  fixed: S.opt(S.bool({ about: t('只显示，不能动', 'shown, not turned') })),
  drawn: S.opt(S.bool({ about: t('在图上拖动来设，不另画控件', 'set by dragging on a picture, no control of its own') })),
  perCase: S.opt(S.bool({ about: t('每个情形一个值', 'one value per case') })),
}
/** A knob: a range, an index into `values`, one of `choices`, or a switch. */
export const KNOB = S.either(
  S.obj({ ...KNOB_COMMON, min: num, max: num, step: num, ends: S.opt(S.list(S.text(), { min: 2 })) }),
  S.obj({ ...KNOB_COMMON, values: S.list(S.any(), { min: 2 }), ends: S.opt(S.list(S.text(), { min: 2 })) }),
  S.obj({ ...KNOB_COMMON, choices: S.list(S.obj({ value: S.any(), label: S.opt(S.text()) }), { min: 2 }), look: S.opt(S.oneOf(['seg', 'dot'])) }),
  S.obj({ ...KNOB_COMMON, toggle: S.bool() }),
  S.obj({ ...KNOB_COMMON, list: S.bool({ about: t('一列东西（在图上点出的点对）', 'a list of things (pairs picked on a picture)') }) }),
)

/**
 * A limit on a quantity the model computes. With `near`, the comparisons apply to the distance from it; `abs` takes
 * the size. Every given condition must hold; a missing or non-numeric value fails the numeric ones.
 */
export const LIMIT = S.obj({
  of: S.str(),
  label: S.opt(S.text()),
  atLeast: S.opt(num), atMost: S.opt(num), above: S.opt(num), below: S.opt(num), near: S.opt(num), abs: S.opt(S.bool()),
  is: S.opt(S.any()), not: S.opt(S.any()),
  format: S.opt(FORMAT), unit: S.opt(S.str()),
})

const ACTION_ID = { id: S.opt(S.str({ about: t('模型可以按这个名字换按钮上的字', 'the name the model may relabel the button by') })) }
export const ACTION = S.either(
  S.obj({ ...ACTION_ID, act: S.str(), arg: S.opt(S.any()), label: S.text(), primary: S.opt(S.bool()), icon: S.opt(S.oneOf(['reset'])), repeat: S.opt(S.int({ min: 2 })), every: S.opt(S.int({ min: 1 })), always: S.opt(S.bool({ about: t('运行中也能按', 'can be pressed while a run goes on') })) }),
  S.obj({ ...ACTION_ID, reset: S.list(S.str()), label: S.text(), icon: S.opt(S.oneOf(['reset'])) }),
)

const STAGE_COMMON = {
  title: S.text(), note: S.text(),
  opens: S.opt(S.list(S.str(), { about: t('这一步能动的旋钮（不写：全部）', 'the knobs this step opens (none given: all)') })),
  start: S.opt(S.map(S.any())),
  goal: S.opt(S.list(LIMIT)),
  win: S.opt(S.text()), status: S.opt(S.text()),
}

// Layout blocks: a display item, or a card (panel), a column (stack) or a row of blocks. Nested a few levels deep.
const BLOCK_DEPTH = 4
function blockSchema(depth) {
  const item = S.call('display')
  if (!depth) return item
  const inner = S.list(blockSchema(depth - 1))
  return S.either(item, S.obj({ panel: inner, quiet: S.opt(S.bool()), dock: S.opt(S.bool({ about: t('手机上停在底部', 'sticks to the bottom on a phone') })) }), S.obj({ stack: inner, center: S.opt(S.bool()) }), S.obj({ row: inner, narrow: S.opt(S.bool({ about: t('第一列窄，手机上也并排', 'a narrow first column, side by side on a phone too') })), tight: S.opt(S.bool({ about: t('只占所需的宽', 'each only as wide as it needs') })) }))
}
export const BLOCKS = S.list(blockSchema(BLOCK_DEPTH))
export const LAYOUT = S.obj({ head: S.opt(BLOCKS), main: BLOCKS, side: S.opt(BLOCKS), foot: S.opt(BLOCKS), split: S.opt(S.oneOf(['even', 'narrow', 'wide'], { about: t('主卡和旁栏的宽：各半，旁栏窄（300–340px），旁栏宽（340–430px）', 'the main card against the side: half each, a narrow side (300–340px), a wide side (340–430px)') })) })

// What every display item may carry besides its own parameters.
const ITEM_COMMON = {
  when: S.opt(S.str({ about: t('只在模型的这个量为真时显示', 'shown only while this quantity of the model is true') })),
  unless: S.opt(S.str()),
  with: S.opt(S.list(blockSchema(1), { about: t('嵌进这一项里的项', 'items set inside this one') })),
}
const LINE = S.obj({ of: S.str(), kind: S.oneOf(['target', 'yours', 'faint', 'error', 'seen']), label: S.opt(S.text()), legend: S.opt(S.text()) })
const STAT = S.obj({ of: S.str(), label: S.text(), format: S.opt(FORMAT), unit: S.opt(S.str()), goal: S.opt(S.bool({ about: t('达到目标时标绿', 'green once the goal holds') })) })
const LOOK = S.oneOf(['legend', 'label', 'note', 'caption', 'mono', 'serif', 'small', 'lede', 'title', 'line'])

/** The display items every bench has (the kernel's); a domain adds its own pictures and interactions. */
export const KERNEL_DISPLAYS = {
  step: { about: t('这一步的标题和说明', 'the step’s title and note') },
  knobs: { about: t('打开的旋钮', 'the open knobs'), params: S.obj({ only: S.opt(S.list(S.str())) }) },
  actions: { about: t('按钮', 'the buttons'), params: S.obj({ only: S.opt(S.list(S.int())) }) },
  verdict: { about: t('目标达到没有；分步的台子带「下一步」', 'whether the goal holds; a stepped bench adds “next step”'), params: S.obj({ center: S.opt(S.bool()) }) },
  goals: { about: t('目标的每一条和此刻的值', 'each limit of the goal and its value now'), params: S.obj({ phoneCols: S.opt(S.int({ min: 1, max: 2 })) }) },
  stages: { about: t('步骤列表', 'the list of steps') },
  cases: { about: t('切换情形，每个带对错', 'switch between the cases, each marked passed or not'), params: S.obj({ passed: S.opt(S.text({ about: t('「n / m 」后面的字', 'the words after “n / m”') })) }) },
  plot: {
    about: t('曲线图：指向一处读出各条线的值', 'a line plot: point at a spot to read every line'),
    params: S.obj({
      of: S.opt(S.str({ about: t('模型给出的 { lines, dots, legend }', 'the model’s { lines, dots, legend }') })),
      lines: S.opt(S.list(LINE)), title: S.opt(TEXT_OF), legend: S.opt(S.bool()),
      lo: S.opt(num), hi: S.opt(num), ticks: S.opt(S.list(num)), tickFormat: S.opt(FORMAT), span: S.opt(num), left: S.opt(num),
      height: S.list(num, { min: 2, about: t('[桌面, 手机] 的高', '[desktop, phone] height') }), mark: S.opt(S.str({ about: t('竖线的位置（0…1）', 'where the upright line goes (0…1)') })),
    }),
  },
  strips: { about: t('几行像素，最暗是 0，最亮是 1', 'rows of pixels, darkest at 0 and lightest at 1'), params: S.obj({ rows: S.list(S.obj({ of: S.str(), label: S.text() })) }) },
  text: { about: t('一段字：写定的，或模型算出的', 'a line of words: written, or computed by the model'), params: S.obj({ text: S.opt(S.text()), of: S.opt(S.str()), look: S.opt(LOOK) }) },
  stats: { about: t('几个读数', 'a few readings'), params: S.obj({ of: S.list(STAT), phone: S.opt(S.oneOf(['line'])) }) },
  chips: { about: t('一排小标签', 'a row of tags'), params: S.obj({ of: S.str(), look: S.opt(S.oneOf(['wave', 'plain'])) }) },
  curve: { about: t('一条小曲线（损失）', 'a small curve (a loss)'), params: S.obj({ of: S.str(), caption: S.str() }) },
  table: { about: t('一张表', 'a table'), params: S.obj({ of: S.str() }) },
  progress: { about: t('一排进度点', 'a row of progress dots'), params: S.obj({ of: S.str() }) },
}

/** The display kind of a domain's vocabulary: the kernel's items and the domain's, each also taking when/unless/with. */
export function displayItems(domainItems) {
  const all = { ...KERNEL_DISPLAYS, ...domainItems }
  return Object.fromEntries(Object.entries(all).map(([name, item]) => {
    const own = item.params
    return [name, { about: item.about, params: S.obj({ ...(own?.fields ?? {}), ...ITEM_COMMON }) }]
  }))
}

/**
 * A level's bench by its model: models are { [name]: { about, setup?, stage?, case? } } — the model's parameters, and
 * the fields it adds to a stage or a case.
 */
export function benchSchema(models) {
  return S.by('model', Object.fromEntries(Object.entries(models).map(([name, m]) => [name, S.obj({
    model: S.oneOf([name]),
    ...(m.setup ? { setup: m.setup } : {}),
    knobs: S.opt(S.map(KNOB)),
    cases: S.opt(S.list(S.obj({ label: S.text(), ...(m.case?.fields ?? {}) }), { min: 2 })),
    stages: S.opt(S.list(S.obj({ ...STAGE_COMMON, ...(m.stage?.fields ?? {}) }), { min: 1 })),
    actions: S.opt(S.list(ACTION)),
    goal: S.opt(S.list(LIMIT)),
    check: S.opt(S.oneOf(['live', 'submit'], { about: t('目标怎样判：live 随旋钮实时判（默认）；submit 只在玩家按「检查」时判，在那之前目标的读数和画面里的结果都不显示，玩家要先想好再试', 'how the goal is judged: live as the knobs turn (the default); submit only when the player presses Check, the goal\'s readings and the result in the pictures hidden until then, so the player thinks before trying') })),
    win: S.opt(S.text()), status: S.opt(S.text()),
    layout: LAYOUT,
  })])))
}

/* ---------- knobs ---------- */

const KIND = (knob) => (knob.toggle !== undefined ? 'toggle' : knob.list ? 'list' : knob.choices ? 'choice' : knob.values ? 'index' : 'range')
export const knobKind = KIND

const FIRST = { toggle: () => false, list: () => [], choice: (k) => k.choices[0].value, index: () => 0, range: (k) => k.min }
/** A knob's value before anything is turned (`start: null` is a choice with nothing chosen yet). */
export const knobStart = (knob) => ('start' in knob ? knob.start : FIRST[KIND(knob)](knob))

/** Every value a knob can take (a range on its steps). */
export function knobValues(knob) {
  const kind = KIND(knob)
  if (kind === 'toggle') return [false, true]
  if (kind === 'choice') return knob.choices.map((c) => c.value)
  if (kind === 'index') return knob.values.map((_, i) => i)
  return Array.from({ length: Math.round((knob.max - knob.min) / knob.step) + 1 }, (_, i) => knob.min + i * knob.step)
}

/** The knob values a stage (or the bench, without stages) starts from; a per-case knob holds one value per case. */
export function startValues(bench, stage = null) {
  const cases = bench.cases?.length ?? 0
  const values = {}
  for (const [name, knob] of Object.entries(bench.knobs ?? {})) {
    const start = stage?.start && name in stage.start ? stage.start[name] : knobStart(knob)
    values[name] = knob.perCase ? Array.from({ length: cases }, () => start) : start
  }
  return values
}

/** The knobs a stage opens: those it names, or every knob that is not fixed. */
export const openKnobs = (bench, stage) => stage?.opens ?? Object.keys(bench.knobs ?? {}).filter((k) => !bench.knobs[k].fixed)

/* ---------- the goal ---------- */

const holds = (limit, raw) => {
  const numeric = ['atLeast', 'atMost', 'above', 'below'].some((k) => limit[k] !== undefined)
  if (limit.is !== undefined && raw !== limit.is) return false
  if (limit.not !== undefined && raw === limit.not) return false
  if (!numeric) return true
  if (typeof raw !== 'number' || Number.isNaN(raw)) return false
  const v = limit.near !== undefined ? Math.abs(raw - limit.near) : limit.abs ? Math.abs(raw) : raw
  return (limit.atLeast === undefined || v >= limit.atLeast) && (limit.atMost === undefined || v <= limit.atMost) && (limit.above === undefined || v > limit.above) && (limit.below === undefined || v < limit.below)
}

/** Judge limits against what a model computed: { pass, rows: [{ limit, value, pass }] }. */
export function judge(limits = [], quantities = {}) {
  const rows = limits.map((limit) => ({ limit, value: quantities[limit.of], pass: holds(limit, quantities[limit.of]) }))
  return { pass: rows.every((r) => r.pass), rows }
}

/** The goal a stage is judged by: its own, or the bench's. */
export const goalOf = (bench, stage = null) => stage?.goal ?? bench.goal ?? []

/**
 * Every setting of a stage's open knobs (or of `open`; the others at the stage's start) that meets its goal, each
 * written as its values joined by ×, so a check can compare them with the answers a stage means. quantities(values)
 * is the model's.
 */
export function passingSettings(bench, stage, quantities, open = openKnobs(bench, stage)) {
  let settings = [startValues(bench, stage)]
  for (const name of open) settings = settings.flatMap((v) => knobValues(bench.knobs[name]).map((x) => ({ ...v, [name]: x })))
  return settings.filter((v) => judge(goalOf(bench, stage), { ...v, ...quantities(v) }).pass).map((v) => open.map((name) => v[name]).join('×'))
}

/** The limit of a goal on one quantity (a model may read its own goal: the rounds a sprint needs, a collapse line). */
export const limitOf = (goal = [], of) => goal.find((l) => l.of === of) ?? null

/* ---------- numbers ---------- */

const MINUS = (s) => s.replace(/^-/, '−')
const QUARTERS = ['0', 'π/4', 'π/2', '3π/4', 'π']

/** A number in a format, with its unit; text and non-numbers pass through ('—' for a missing or infinite number). */
export function formatValue(v, format = 'raw', unit = '', of = null) {
  if (typeof v !== 'number') return v === null || v === undefined ? '—' : String(v)
  if (!Number.isFinite(v)) return '—'
  const tail = unit ?? ''
  switch (format) {
    case 'auto': return `${Number.isInteger(v) ? String(v) : v.toFixed(2)}${tail}`
    case 'int': return `${Math.round(v)}${tail}`
    case 'fixed1': return `${v.toFixed(1)}${tail}`
    case 'fixed2': return `${v.toFixed(2)}${tail}`
    case 'fixed3': return `${v.toFixed(3)}${tail}`
    case 'fixed4': return `${v.toFixed(4)}${tail}`
    case 'pct': return `${Math.round(v * 100)}%`
    case 'pct1': return `${(v * 100).toFixed(1)}%`
    case 'exp': return `${v.toExponential(0)}${tail}`
    case 'grouped': return `${v.toLocaleString('en-US')}${tail}`
    case 'pow10': return 10 ** v >= 1 ? (10 ** v).toFixed(0) : (10 ** v).toFixed(Math.max(0, -Math.floor(v)))
    case 'quarterPi': {
      const q = Math.round(v)
      return q === 0 ? '0' : `${q < 0 ? '−' : ''}${QUARTERS[Math.abs(q)] ?? `${Math.abs(q) / 4}π`}`
    }
    case 'outOf': return `${numberText(of === null ? v : Math.min(v, of))} / ${of}`
    default: return `${numberText(v)}${tail}`
  }
}

/** The threshold a goal row shows ("≥ 40%", "30 ± 1 mm", "< 1.5 px"), trailing zeros dropped; '' for outOf. */
export function needText(limit) {
  if (limit.format === 'outOf') return ''
  const pct = limit.format === 'pct' || limit.format === 'pct1'
  const number = (x) => MINUS(String(+(pct ? x * 100 : x).toFixed(4)))
  const write = (x) => `${number(x)}${pct ? '%' : limit.unit ?? ''}`
  const bound = [['atLeast', '≥'], ['atMost', '≤'], ['above', '>'], ['below', '<']].find(([k]) => limit[k] !== undefined)
  if (!bound) return ''
  return limit.near !== undefined ? `${number(limit.near)} ± ${write(limit[bound[0]])}` : `${bound[1]} ${write(limit[bound[0]])}`
}

/** A goal row's value, written as the limit says (outOf: "3 / 4"). */
export const rowValue = (limit, value) => formatValue(value, limit.format ?? 'raw', limit.unit ?? '', limit.format === 'outOf' ? (limit.atLeast ?? limit.is) : null)
