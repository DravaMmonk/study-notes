// The ways a value is shown (games/DESIGN.md 6.10), as data: what each view is called and the shapes it draws. The
// drawing is the kit's (../shell/views/); which views a results area uses, and in what order, is content: a game's
// `views` (a default per shape) and a task's `results` (its rows).
//
//   shapes   scalar  one value, written as words (a number, yes or no, a vector)
//            grid    { w, h, c, data }: a matrix, an image, a row of numbers (c channels a cell, row by row)
//            bits    one 0 or 1 a tick (a wire)
//            ticks   one value a tick
//            list    a few values in order
//
// A domain says what a task's results area can show, an entry a thing (`of`, unique in the task): its label, its shape,
// and the values a test gives it — `given` (an input), or `got` and `want` (an output: the board's and the one wanted;
// a tick output may want its values only in order, `order`: { values, words }) — and whether it is shown when the
// task names no rows (`shown: false` leaves it out).
//
//   rowsOf(results, entries, defaults) → [{ entry, views }]   a task's rows: its `results` in order, or every entry
//                                                              shown by default; each with the views it may be drawn in,
//                                                              the first the one it starts in
//   rowProblems(results, entries, defaults) → [text]           what a task's rows get wrong
//   viewsProblems(defaults) → [text]                           what a game's default views get wrong
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

export const SHAPES = ['scalar', 'grid', 'bits', 'ticks', 'list']

export const VIEWS = {
  value: { shapes: ['scalar'], label: t('数值', 'Value') },
  numbers: { shapes: ['grid'], label: t('数值', 'Numbers') },
  pixels: { shapes: ['grid'], label: t('图像', 'Picture') },
  wave: { shapes: ['bits'], label: t('波形', 'Wave') },
  bands: { shapes: ['bits', 'ticks'], label: t('数值', 'Values') },
  sequence: { shapes: ['list'], label: t('序列', 'Sequence') },
}

const VIEW = S.oneOf(Object.keys(VIEWS))
const LIST = S.list(VIEW, { min: 1, about: t('能用的显示方式，第一种是起始；只有一种时玩家不能切换', 'the views it may be drawn in, the first to start in; with one, the player cannot switch') })

/** game.json `views`: the views each shape is drawn in where a row names none. */
export const GAME_VIEWS = S.opt(S.obj(Object.fromEntries(SHAPES.map((shape) => [shape, S.opt(LIST)])), { about: t('每种形状默认的显示方式（没写的用库里的第一种）', 'the views each shape is drawn in by default (the library’s first where none is given)') }))

/** A task's `results`: its results area's rows, in order. */
export const RESULTS = S.opt(S.list(S.obj({
  of: S.str({ about: t('显示哪一项：任务的一个口', 'what the row shows: one of the task’s ports') }),
  views: S.opt(LIST),
  label: S.opt(S.text()),
}), { min: 1, section: 'read', about: t('结果区的几行，按顺序；不写就是领域默认的几行', 'the results area’s rows, in order; without them the domain’s default rows') }))

/** The views a shape is drawn in by default: the game's, or the library's first. */
export const viewsFor = (shape, defaults) => defaults?.[shape] ?? [Object.keys(VIEWS).find((v) => VIEWS[v].shapes.includes(shape))]

export function rowsOf(results, entries, defaults) {
  const by = new Map(entries.map((e) => [e.of, e]))
  const rows = results ? results.map((r) => ({ ...r, entry: by.get(r.of) })).filter((r) => r.entry) : entries.filter((e) => e.shown !== false).map((entry) => ({ entry }))
  return rows.map(({ entry, views, label }) => ({ entry: label ? { ...entry, label } : entry, views: views ?? viewsFor(entry.shape, defaults) }))
}

export function rowProblems(results, entries, defaults) {
  const by = new Map(entries.map((e) => [e.of, e]))
  const problems = []
  for (const r of results ?? []) {
    const entry = by.get(r.of)
    if (!entry) problems.push(`results: no "${r.of}" to show (${entries.map((e) => e.of).join(', ')})`)
    else for (const v of r.views ?? viewsFor(entry.shape, defaults)) if (!VIEWS[v].shapes.includes(entry.shape)) problems.push(`results: "${r.of}" is ${entry.shape}, which ${v} does not draw`)
  }
  return problems
}

export const viewsProblems = (defaults) => Object.entries(defaults ?? {}).flatMap(([shape, views]) => views.filter((v) => !VIEWS[v].shapes.includes(shape)).map((v) => `views: ${v} does not draw ${shape}`))
