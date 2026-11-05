// A grid task (games/DESIGN.md 6.8): the player looks at a small image — its numbers, its picture, its axes — and does
// what the task asks (`ask`, a vocabulary item). Each ask says what the player's answer starts as, what answer passes
// (worked out from the task's own data, not typed in twice) and how a wrong one is wrong:
//
//   copy     reproduce the image's values in an empty grid of its size        answer: rows
//   fill     fill a grid the size of `rows` with those values (sample positions, displayed values…)   answer: rows
//   pick     click the cell at (x, y)                                          answer: { x, y }
//   locate   the cell (x, y) is highlighted: write its coordinates            answer: { x, y }
//   set      change the pixel (x, y) to `value`, leaving every other alone     answer: rows (the image edited)
//
// parseNumber(text) reads a number as the player types it (a decimal, a negative, a fraction).
//
// start(task) → the answer before the player does anything; reference(task) → one that passes; check(task, answer) →
// null, or { zh, en } saying what is wrong.
import { S } from '../../engine/schema.js'
import { differs, fromRows, make, pixel, toRows } from './image.js'
import { T as t } from '../../shell/i18n.js'

const callOf = (v) => (typeof v === 'string' ? [v, {}] : Object.entries(v)[0])
const VALUE = S.either(S.num(), S.list(S.num(), { min: 3 }))
const ROWS = S.list(S.list(S.either(S.num(), S.list(S.num(), { min: 3 }))), { min: 1 })
const AT = { x: S.int({ min: 0 }), y: S.int({ min: 0 }) }

/** An empty grid shaped like an image: rows of nulls (a colour image: [null, null, null] a pixel). */
const blankLike = (img) => toRows(make(img.w, img.h, img.c, null))

/** A grid answer compared with the image it must be, `tol` on each value; blanks count as missing. */
function sameRows(want, rows, tol) {
  if (rows.some((r) => r.some((v) => v === null || (Array.isArray(v) && v.some((x) => x === null))))) return t('还有格子没填', 'some cells are still empty')
  const got = fromRows(rows)
  return got ? differs(want, got, tol) : t('格子里的数读不出来', 'the grid does not read as numbers')
}

const same = (a, b) => a?.x === b?.x && a?.y === b?.y
const samePixel = (a, b) => [a].flat().every((v, k) => Math.abs(v - [b].flat()[k]) <= 1e-9)

export const ASKS = {
  copy: {
    about: t('把图的值照抄进同样大小的空格子', 'copy the image’s values into an empty grid of its size'),
    start: (task) => blankLike(fromRows(task.image)),
    reference: (task) => task.image,
    check: (task, rows) => sameRows(fromRows(task.image), rows, task.tolerance ?? 1e-5),
  },
  fill: {
    about: t('填一张和 rows 一样大的格子，填成 rows（采样位置、显示出来的值……）', 'fill a grid the size of `rows` with them (sample positions, the values shown…)'),
    params: S.obj({ rows: ROWS, label: S.opt(S.text()), strip: S.opt(S.obj({ old: S.int({ min: 1 }), new: S.int({ min: 1 }) }, { about: t('画出两条等长的条：上面 old 个旧像素（标出中心和边界的 x），下面 new 个新像素平分同一段长度；玩家填的 x 标在旧像素的条上', 'draws two bars of one length: `old` old pixels above (their centres and edges marked in x), `new` new pixels sharing the same length below; the x the player fills in is marked on the old bar') })) }),
    start: (task, { rows }) => blankLike(fromRows(rows)),
    reference: (task, { rows }) => rows,
    check: (task, rows, { rows: want }) => sameRows(fromRows(want), rows, task.tolerance ?? 1e-5),
  },
  pick: {
    about: t('点出坐标 (x, y) 的那一格', 'click the cell at (x, y)'),
    params: S.obj(AT),
    start: () => null,
    reference: (task, at) => ({ x: at.x, y: at.y }),
    check: (task, got, at) => (got ? (same(got, at) ? null : t(`点的是 (${got.x}, ${got.y})，不是 (${at.x}, ${at.y})`, `that is (${got.x}, ${got.y}), not (${at.x}, ${at.y})`)) : t('还没有点格子', 'no cell clicked yet')),
  },
  locate: {
    about: t('高亮的是 (x, y) 那一格：写出它的坐标', 'the cell (x, y) is highlighted: write its coordinates'),
    params: S.obj(AT),
    start: () => ({ x: null, y: null }),
    reference: (task, at) => ({ x: at.x, y: at.y }),
    check: (task, got, at) => (same(got, at) ? null : t(`高亮的格子不在 (${got?.x ?? '?'}, ${got?.y ?? '?'})`, `the highlighted cell is not at (${got?.x ?? '?'}, ${got?.y ?? '?'})`)),
  },
  set: {
    about: t('把像素 (x, y) 改成 value，别的格子不动', 'change the pixel (x, y) to `value`, every other cell as it was'),
    params: S.obj({ ...AT, value: VALUE }),
    start: (task) => task.image,
    reference: (task, { x, y, value }) => task.image.map((r, py) => r.map((v, px) => (px === x && py === y ? value : v))),
    check(task, rows, { x, y, value }) {
      const img = fromRows(task.image)
      const want = make(img.w, img.h, img.c, (px, py, ch) => (px === x && py === y ? (Array.isArray(value) ? value[ch] : value) : img.data[(py * img.w + px) * img.c + ch]))
      const why = sameRows(want, rows, task.tolerance ?? 1e-5)
      if (!why) return null
      const got = fromRows(rows)
      if (got && got.w === img.w && got.h === img.h) {
        const moved = []
        for (let py = 0; py < img.h; py++) for (let px = 0; px < img.w; px++) if ((px !== x || py !== y) && !samePixel(pixel(img, px, py), pixel(got, px, py))) moved.push(`(${px}, ${py})`)
        if (moved.length) return t(`只该改 (${x}, ${y})，${moved.join('、')} 也变了`, `only (${x}, ${y}) should change; ${moved.join(', ')} changed too`)
      }
      return why
    },
  },
}

/** A grid task's ask: { ask (the item), params }. */
export const askOf = (task) => {
  const [name, params] = callOf(task.ask)
  return { name, ask: ASKS[name], params: params === true ? {} : params ?? {} }
}

/** The answer a grid task starts from, one that passes, and the check of an answer. */
export const gridStart = (task) => { const { ask, params } = askOf(task); return ask.start(task, params) }
export const gridReference = (task) => { const { ask, params } = askOf(task); return ask.reference(task, params) }
export const gridCheck = (task, answer) => { const { ask, params } = askOf(task); return ask.check(task, answer, params) }

/** The vocabulary's ask kind: the asks with their parameters. */
export const ASK_ITEMS = Object.fromEntries(Object.entries(ASKS).map(([k, a]) => [k, { about: a.about, ...(a.params ? { params: a.params } : {}) }]))

/** A number as the player types it: a decimal or a fraction (−1/6); null while it is none yet (empty, "-", "1/"). */
export function parseNumber(text) {
  const frac = /^\s*(-?\d*\.?\d+)\s*\/\s*(\d*\.?\d+)\s*$/.exec(text)
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2])
  return text.trim() === '' || !Number.isFinite(Number(text)) ? null : Number(text)
}
