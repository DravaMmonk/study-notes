// How the kit shows a value (games/DESIGN.md 6.10), as data: a value's shape, the views that draw each shape, and the
// scenes a value is drawn in. The drawing is the kit's (../views/); which views are used where is content: a game's
// `views` (a default per shape), a task's `results` (its rows), and the values an introduction page or a pass text
// shows (`show`).
//
//   shapes   scalar  one value, written as words (a number, yes or no, a vector)
//            grid    { w, h, c, data }: a matrix, an image, a row of numbers (c channels a cell, row by row)
//            bits    one 0 or 1 a tick (a wire)
//            ticks   one value a tick
//            list    a few values in order
//   scenes   card     on a part on the board: as small as it reads, nothing to point at
//            detail   in a part's detail: whole, its cells numbered on their axes, every cell read by pointing at it
//            results  in the results area: the result against the value wanted, differences marked (Results.jsx)
//            figure   beside an introduction or a pass text: sized to the value, a cell picked where the figure asks
//            inline   in a line of text: one line high
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
//   viewsProblems(defaults) → [text]                           what a game's (or a task's) views get wrong
//   usable(views, value)    the views among `views` that can draw `value` (a view may draw only some values of its
//                           shape: `fits`, e.g. a plot only a grid of one or two rows)
//   shapeOf(value)          a value's shape where nothing says it: a grid, else a scalar (a card's value, one tick's)
//   valueText(value)        a value in words: 「—」 for none, yes or no, a number (./number.js), else as it is
//   SHOW, readShow(show), showProblems(show)   a value content writes for a figure, read, and what it gets wrong
import { S } from './schema.js'
import { isGrid } from './grid.js'
import { numberText } from './number.js'
import { T as t } from '../shell/i18n.js'

export const SHAPES = ['scalar', 'grid', 'bits', 'ticks', 'list']
export const SCENES = ['card', 'detail', 'results', 'figure', 'inline']

// A grey grid of one or two rows reads as functions; one of several rows and columns as a surface.
const grey = (g) => isGrid(g) && (g.c ?? 1) === 1

export const VIEWS = {
  value: { shapes: ['scalar'], label: t('数值', 'Value') },
  numbers: { shapes: ['grid'], label: t('数值', 'Numbers') },
  pixels: { shapes: ['grid'], label: t('图像', 'Picture') },
  plot: { shapes: ['grid'], label: t('函数图像', 'Plot'), fits: (g) => grey(g) && g.h <= 2 && g.w >= 2 },
  profile: { shapes: ['grid'], label: t('剖面', 'Profile'), fits: (g) => grey(g) && g.h >= 2 && g.w >= 2 },
  surface: { shapes: ['grid'], label: t('地形', 'Terrain'), fits: (g) => grey(g) && g.h >= 2 && g.w >= 2 },
  wave: { shapes: ['bits'], label: t('波形', 'Wave') },
  bands: { shapes: ['bits', 'ticks'], label: t('数值', 'Values') },
  sequence: { shapes: ['list'], label: t('序列', 'Sequence') },
}

const VIEW = S.oneOf(Object.keys(VIEWS))
const LIST = S.list(VIEW, { min: 1, about: t('能用的显示方式，第一种是起始；只有一种时玩家不能切换', 'the views it may be drawn in, the first to start in; with one, the player cannot switch') })

const BY_SHAPE = (about, more = {}) => S.obj(Object.fromEntries(SHAPES.map((shape) => [shape, S.opt(LIST)])), { about, ...more })

/** game.json `views`: the views each shape is drawn in where a row names none. */
export const GAME_VIEWS = S.opt(BY_SHAPE(t('每种形状默认的显示方式（没写的用库里的第一种）', 'the views each shape is drawn in by default (the library’s first where none is given)')))

/** A task's `views`: the game's, changed for the shapes it names, on its cards and in its results. */
export const TASK_VIEWS = S.opt(BY_SHAPE(t('这个任务里每种形状的显示方式（换掉游戏默认的那几种）', 'the views each shape is drawn in in this task (in place of the game’s)'), { section: 'read' }))

/** A task's `results`: its results area's rows, in order. */
export const RESULTS = S.opt(S.list(S.obj({
  of: S.str({ about: t('显示哪一项：任务的一个口', 'what the row shows: one of the task’s ports') }),
  views: S.opt(LIST),
  label: S.opt(S.text()),
}), { min: 1, section: 'read', about: t('结果区的几行，按顺序；不写就是领域默认的几行', 'the results area’s rows, in order; without them the domain’s default rows') }))

/** The views a shape is drawn in by default: the game's, or the library's first. */
export const viewsFor = (shape, defaults) => defaults?.[shape] ?? [Object.keys(VIEWS).find((v) => VIEWS[v].shapes.includes(shape))]

export const usable = (views, value) => views.filter((v) => !VIEWS[v].fits || VIEWS[v].fits(value))

/** An entry's value as its views see it: the value wanted, else given, else the board's. */
const sampleOf = (entry) => entry.want ?? entry.given ?? entry.got

export function rowsOf(results, entries, defaults) {
  const by = new Map(entries.map((e) => [e.of, e]))
  const rows = results ? results.map((r) => ({ ...r, entry: by.get(r.of) })).filter((r) => r.entry) : entries.filter((e) => e.shown !== false).map((entry) => ({ entry }))
  return rows.map(({ entry, views, label }) => ({ entry: label ? { ...entry, label } : entry, views: usable(views ?? viewsFor(entry.shape, defaults), sampleOf(entry)) }))
}

const undrawn = (views, shape, where) => views.filter((v) => !VIEWS[v].shapes.includes(shape)).map((v) => `${where} is ${shape}, which ${v} does not draw`)

export function rowProblems(results, entries, defaults) {
  const by = new Map(entries.map((e) => [e.of, e]))
  return (results ?? []).flatMap((r) => {
    const entry = by.get(r.of)
    if (!entry) return [`results: no "${r.of}" to show (${entries.map((e) => e.of).join(', ')})`]
    const views = r.views ?? viewsFor(entry.shape, defaults)
    const unfit = (r.views ?? []).filter((v) => VIEWS[v].shapes.includes(entry.shape) && !usable([v], sampleOf(entry)).length).map((v) => `results: "${r.of}" lists ${v}, which cannot draw its value`)
    return [...undrawn(views, entry.shape, `results: "${r.of}"`), ...unfit, ...(usable(views, sampleOf(entry)).length ? [] : [`results: "${r.of}" has no view that draws its value`])]
  })
}

export const viewsProblems = (defaults) => Object.entries(defaults ?? {}).flatMap(([shape, views]) => views.filter((v) => !VIEWS[v].shapes.includes(shape)).map((v) => `views: ${v} does not draw ${shape}`))

export const shapeOf = (value) => (isGrid(value) ? 'grid' : 'scalar')

export const valueText = (v) => (v === null || v === undefined ? '—' : v === true ? t('是', 'yes') : v === false ? t('否', 'no') : typeof v === 'number' ? numberText(v) : String(v))

/* ---------- a value content writes ---------- */

const ROWS = S.list(S.list(S.either(S.num(), S.list(S.num(), { min: 3 })), { min: 1 }), { min: 1, view: 'grid' })
const TICKS = S.either(S.str(), S.list(S.any()))

/**
 * A value content shows beside an introduction page or a pass text (scene figure): its shape and the value as content
 * writes it — a scalar as itself, a grid as its rows (numbers, or [R, G, B] triples), bits as a string of 0s and 1s
 * ('.' nothing on the wire), ticks and a list as a list — the views it may be drawn in, and what it is called.
 */
export const SHOW = S.by('shape', {
  scalar: S.obj({ shape: S.oneOf(['scalar']), value: S.any(), label: S.opt(S.text()) }),
  grid: S.obj({ shape: S.oneOf(['grid']), value: ROWS, views: S.opt(LIST), label: S.opt(S.text()) }),
  bits: S.obj({ shape: S.oneOf(['bits']), value: TICKS, views: S.opt(LIST), label: S.opt(S.text()) }),
  ticks: S.obj({ shape: S.oneOf(['ticks']), value: S.list(S.any()), views: S.opt(LIST), label: S.opt(S.text()) }),
  list: S.obj({ shape: S.oneOf(['list']), value: S.list(S.any()), label: S.opt(S.text()) }),
}, { about: t('引言或通关文案旁显示的一个值', 'a value shown beside an introduction page or a pass text') })

/** A grid from content's rows: rows of numbers (one channel) or of [R, G, B] triples (three). */
function gridOf(rows) {
  const c = Array.isArray(rows[0][0]) ? 3 : 1
  return { w: rows[0].length, h: rows.length, c, data: rows.flatMap((r) => r.flatMap((p) => (c === 3 ? p : [p]))) }
}

/** A value content shows, read: its shape, its value as the kit draws it, its views and label. */
export function readShow(show) {
  const value = show.shape === 'grid' ? gridOf(show.value) : show.shape === 'bits' && typeof show.value === 'string' ? [...show.value].map((c) => (c === '.' ? null : Number(c))) : show.value
  return { ...show, value }
}

export function showProblems(show, where = 'show') {
  const problems = undrawn(show.views ?? [], show.shape, where)
  if (show.shape === 'grid') {
    const rows = show.value
    const c = Array.isArray(rows[0][0]) ? 3 : 1
    if (!rows.every((r) => r.length === rows[0].length && r.every((p) => (c === 3 ? Array.isArray(p) && p.length === 3 : typeof p === 'number')))) problems.push(`${where}: a grid's rows are all as long, and its cells all numbers or all [R, G, B]`)
  }
  if (show.shape === 'bits' && typeof show.value === 'string' && !/^[01.]*$/.test(show.value)) problems.push(`${where}: bits are written in 0, 1 and .`)
  return problems
}
