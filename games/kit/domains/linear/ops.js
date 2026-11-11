// The linear domain's engine resources (games/DESIGN.md 6.8): the computations a game's parts.json may call, each
// with what it is, its arguments (positional) and its named parameters, if any (a schema). A part's expression calls
// them on its inputs and settings; a resource handed what it cannot work on stops with why (a PartError). The kernel's
// builtins (../../engine/parts/builtins.js) come with every domain.
//
// Three kinds of value travel on the wires (values.js): a number, a vector (a grid one column wide, its entries down
// the column) and a matrix (a grid, row by row). A vector is a matrix of one column, as a textbook writes it.
import { PartError } from '../../engine/circuit.js'
import { S } from '../../engine/schema.js'
import { T as t } from '../../shell/i18n.js'
import { grid, isGrid, isVector, kindOf, shapeText } from './values.js'

const args = (...names) => names.map((name) => ({ name }))

const number = (v) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new PartError(t(`这里要一个数，接进来的是${kindOf(v).zh}`, `this wants a number; it was given ${kindOf(v).en}`))
  return v
}
const vector = (v) => {
  if (!isVector(v)) throw new PartError(t(`这里要一个向量，接进来的是${kindOf(v).zh}`, `this wants a vector; it was given ${kindOf(v).en}`))
  return v
}
const matrix = (v) => {
  if (!isGrid(v)) throw new PartError(t(`这里要一个矩阵，接进来的是${kindOf(v).zh}`, `this wants a matrix; it was given ${kindOf(v).en}`))
  return v
}
const sameShape = (a, b) => {
  if (a.w !== b.w || a.h !== b.h) throw new PartError(t(`两个输入的形状不同（${shapeText(a)} 和 ${shapeText(b)}），不能逐个分量相加`, `the inputs differ in shape (${shapeText(a)} and ${shapeText(b)}), so their entries do not pair up`))
}
const index = (at, n, what) => {
  const i = Number(at)
  if (i > n) throw new PartError(t(`它只有 ${n} 个${what.zh}，没有第 ${i} 个`, `it has ${n} ${what.en}, no number ${i}`))
  return i - 1
}
const ENTRIES = t('分量')
const COLUMNS = t('列')

/** The values that are not 「—」, in order: the ports left empty at the end of a part's list. */
const given = (list) => {
  let n = list.length
  while (n > 0 && (list[n - 1] === null || list[n - 1] === undefined)) n -= 1
  const kept = list.slice(0, n)
  if (kept.some((v) => v === null || v === undefined)) throw new PartError(t('中间空着一个口：输入要从第一个起连着接'))
  return kept
}

const ARITH = { add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b }

export const OPS = {
  add: {
    about: t('两个形状相同的向量（或矩阵）逐个分量相加'),
    args: args('u', 'v'),
    symmetric: true,
    run: ([u, v]) => {
      matrix(u), matrix(v), sameShape(u, v)
      return grid(u.w, u.h, u.data.map((x, k) => x + v.data[k]))
    },
  },
  scale: {
    about: t('数 k 乘向量（或矩阵）的每个分量'),
    args: args('k', 'v'),
    run: ([k, v]) => {
      number(k), matrix(v)
      return grid(v.w, v.h, v.data.map((x) => k * x))
    },
  },
  arith: {
    about: t('两个数的加、减、乘、除'),
    args: args('a', 'b'),
    params: S.obj({ op: S.oneOf(Object.keys(ARITH)) }),
    symmetric: { op: ['add', 'mul'] },
    run: ([a, b], { op }) => {
      number(a), number(b)
      if (op === 'div' && b === 0) throw new PartError(t('除数是 0'))
      return ARITH[op](a, b)
    },
  },
  entry: {
    about: t('向量的第 i 个分量（一个数）'),
    args: args('v', 'i'),
    run: ([v, i]) => vector(v).data[index(i, v.h, ENTRIES)],
  },
  column: {
    about: t('矩阵的第 j 列（一个向量）'),
    args: args('m', 'j'),
    run: ([m, j]) => {
      matrix(m)
      const at = index(j, m.w, COLUMNS)
      return grid(1, m.h, Array.from({ length: m.h }, (_, r) => m.data[r * m.w + at]))
    },
  },
  vec: {
    about: t('几个数从上到下排成一个向量；末尾空着的口不算'),
    args: args('a', 'b', 'c'),
    run: (list) => {
      const nums = given(list).map(number)
      if (nums.length < 2) throw new PartError(t('至少要两个数'))
      return grid(1, nums.length, nums)
    },
  },
  join: {
    about: t('几个一样长的向量从左到右并排成一个矩阵；末尾空着的口不算'),
    args: args('a', 'b', 'c'),
    run: (list) => {
      const cols = given(list).map(vector)
      if (!cols.length) throw new PartError(t('至少要一个向量'))
      const h = cols[0].h
      if (cols.some((c) => c.h !== h)) throw new PartError(t('这几个向量不一样长'))
      return grid(cols.length, h, Array.from({ length: h * cols.length }, (_, k) => cols[k % cols.length].data[Math.floor(k / cols.length)]))
    },
  },
}

/** The resources as the vocabulary lists them (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item]))
