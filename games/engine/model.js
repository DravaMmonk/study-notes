// The Difference Engine's arithmetic as a pure function of its crank, shared by build.mjs (the poses it proves) and the
// live page (inlined into engine.js). Three columns of figure wheels hold Δ², Δ and aₙ, three wheels each (units at
// the bottom). Every turn of the crank does two additions, as Babbage's engine does in its two half-cycles: aₙ += Δ,
// then Δ += Δ². Started from aₙ = 0, Δ = 1, Δ² = 2 it prints the squares, 0, 1, 4, 9, …, 144, and the Δ² column never
// moves: the second difference of n² is constant. One more turn rolls every wheel forward to the start again.
//
// A wheel's position is counted in steps of one digit (36°), unwrapped: it only ever turns forward, so each cycle adds
// a whole number of turns and the crank can run on, or back, without a jump.

export const TERMS = 12;
export const CYCLE = TERMS + 1;
export const COLUMNS = ['d2', 'd1', 'a'];
export const WHEELS = 3;
export const START = { d2: 2, d1: 1, a: 0 };
// Where in a turn things happen (shares of the turn): a half's digit additions, its carries, and its sector levers.
export const PHASE = {
  a: { add: [0.06, 0.24], carry: [0.27, 0.4], lever: [0.03, 0.43] },
  d1: { add: [0.56, 0.74], carry: [0.77, 0.9], lever: [0.53, 0.93] },
  zero: [0.12, 0.82],
};
export const SWING = 16;

const digit = (v, k) => Math.floor(v / 10 ** k) % 10;
const ease = (x) => x * x * (3 - 2 * x);
const span = (f, [a, b]) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));

// Every wheel's moves in one cycle: [turn, window, steps], and the steps it makes in all.
function schedule() {
  const moves = Object.fromEntries(COLUMNS.map((c) => [c, Array.from({ length: WHEELS }, () => [])]));
  const add = (col, from, by, turn) => {
    const to = from + by;
    for (let k = 0; k < WHEELS; k++) {
      const plain = digit(by, k);
      const carry = (digit(to, k) - digit(from, k) - plain + 20) % 10;
      if (plain) moves[col][k].push([turn, PHASE[col].add, plain]);
      if (carry) moves[col][k].push([turn, PHASE[col].carry, carry]);
    }
    return to;
  };
  const v = { ...START };
  for (let turn = 0; turn < TERMS; turn++) {
    v.a = add('a', v.a, v.d1, turn);
    v.d1 = add('d1', v.d1, v.d2, turn);
  }
  for (const col of COLUMNS) for (let k = 0; k < WHEELS; k++) {
    const back = (digit(START[col], k) - digit(v[col], k) + 10) % 10;
    if (back) moves[col][k].push([TERMS, PHASE.zero, back]);
  }
  return Object.fromEntries(COLUMNS.map((c) => [c, moves[c].map((list) => ({ list, total: list.reduce((s, m) => s + m[2], 0) }))]));
}
export const MOVES = schedule();

// The wheel's position in digit steps at crank turns c (any real number).
export function steps(col, k, c) {
  const { list, total } = MOVES[col][k];
  const cycle = Math.floor(c / CYCLE);
  const t = c - cycle * CYCLE;
  let s = cycle * total + digit(START[col], k);
  for (const [turn, window, n] of list) s += n * span(t - turn, window);
  return s;
}

// The two sector shafts swing out and back while their addition runs (degrees); none swing while the wheels zero.
export function lever(col, c) {
  const t = c - Math.floor(c / CYCLE) * CYCLE;
  if (t >= TERMS) return 0;
  const [a, b] = PHASE[col].lever;
  const f = t - Math.floor(t);
  return f <= a || f >= b ? 0 : SWING * Math.sin((Math.PI * (f - a)) / (b - a)) ** 2;
}

// Every group's value at crank turns c, in degrees.
export function pose(c) {
  const out = { crank: 360 * c, 'lever.a': -lever('a', c), 'lever.d1': -lever('d1', c) };
  for (const col of COLUMNS) for (let k = 0; k < WHEELS; k++) out[`wheel.${col}.${k}`] = 36 * steps(col, k, c);
  return out;
}

// Which addition is running at crank turns c, for the accent: 'a', 'd1' or null.
export function adding(c) {
  const t = c - Math.floor(c / CYCLE) * CYCLE;
  if (t >= TERMS) return null;
  const f = t - Math.floor(t);
  for (const col of ['a', 'd1']) if (f > PHASE[col].lever[0] && f < PHASE[col].lever[1]) return col;
  return null;
}
