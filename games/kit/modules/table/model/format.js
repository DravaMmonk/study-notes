// Values as the player reads them, and the arithmetic every merger and worker part shares.

import { tr } from '../lang.js';

export const OPS = { sum: a => a.reduce((s, x) => s + x, 0), min: a => Math.min(...a), max: a => Math.max(...a) };

/** Floating-point noise off (0.9 × 8.1 = 7.29, not 7.290000000000001), so tables compare exactly. */
export const tidy = v => Math.round(v * 1e9) / 1e9;

/** Number formatting for board cells; null renders empty. Fractions keep two decimals, or two significant digits below 1. */
export function fmt(v) {
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '✗';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toLocaleString('en-US');
    return String(Math.abs(v) >= 1 ? Math.round(v * 100) / 100 : Number(v.toPrecision(2)));
  }
  return v == null ? '' : String(v);
}

/** A signal as the player reads it: null is 「—」 (no route), booleans yes / no, a segment its first few values, a kind
 *  ({ cat, label }, a key's colour say) its name. */
export const signal = v => (Array.isArray(v) ? `[${v.slice(0, 4).map(signal).join(' ')}${v.length > 4 ? ' …' : ''}]` : v === null || v === undefined ? '—' : typeof v === 'object' && 'cat' in v ? String(v.label) : v === true ? tr('是', 'yes') : v === false ? tr('否', 'no') : fmt(v));
