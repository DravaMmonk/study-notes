// A changed file read field by field, for the studio's changeset review (games/DESIGN.md 6.7): what a JSON file held
// before and after, as the values that differ, each at its path. A text pair and a board (a list of lines) are compared
// whole; objects are looked into key by key, lists item by item: the items a list keeps are left out, so an item added
// (a save step appended), removed or moved shows alone, and items changed in place are looked into.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isText = (v) => isObj(v) && typeof v.zh === 'string' && Object.keys(v).length === 1
const isLines = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * The fields that differ between `before` and `after` (either may be undefined: a file, a key or an item added or
 * removed), as [{ path, before, after, as: 'text' | 'lines' | 'value' }], in the order the after value lists them.
 */
export function fieldDiff(before, after, path = []) {
  if (same(before, after)) return []
  const as = isText(before) || isText(after) ? 'text' : isLines(before) || isLines(after) ? 'lines' : 'value'
  if (as === 'value' && isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(after), ...Object.keys(before)])]
    return keys.flatMap((k) => fieldDiff(before[k], after[k], [...path, k]))
  }
  if (as === 'value' && Array.isArray(before) && Array.isArray(after)) return listDiff(before, after, path)
  return [{ path, before, after, as }]
}

/**
 * Two lists, aligned on the items they keep (a longest common run of equal items: what both start and end with first,
 * then the rest between): between two kept items, what was there is paired with what is there now item against item
 * and looked into; what one side has more is added or removed. Paths are the after list's indexes, a removed item its
 * index in the before list.
 */
function listDiff(before, after, path) {
  let head = 0
  while (head < before.length && head < after.length && same(before[head], after[head])) head++
  let tail = 0
  while (tail < before.length - head && tail < after.length - head && same(before.at(-1 - tail), after.at(-1 - tail))) tail++
  const a = before.slice(head, before.length - tail), b = after.slice(head, after.length - tail)
  const out = []
  let i = 0, j = 0
  const gap = (ui, uj) => {
    const n = Math.min(ui - i, uj - j)
    for (let k = 0; k < n; k++) out.push(...fieldDiff(a[i + k], b[j + k], [...path, head + j + k]))
    for (let k = n; k < uj - j; k++) out.push({ path: [...path, head + j + k], before: undefined, after: b[j + k], as: 'value' })
    for (let k = n; k < ui - i; k++) out.push({ path: [...path, head + i + k], before: a[i + k], after: undefined, as: 'value' })
  }
  for (const [ui, uj] of kept(a, b)) {
    gap(ui, uj)
    i = ui + 1
    j = uj + 1
  }
  gap(a.length, b.length)
  return out
}

/** The index pairs of a longest common subsequence of two lists, items compared as JSON. */
function kept(a, b) {
  const x = a.map((v) => JSON.stringify(v)), y = b.map((v) => JSON.stringify(v))
  const len = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0))
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) len[i][j] = x[i] === y[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1])
  const pairs = []
  for (let i = 0, j = 0; i < x.length && j < y.length;) {
    if (x[i] === y[j]) { pairs.push([i, j]); i++; j++ } else if (len[i + 1][j] >= len[i][j + 1]) i++
    else j++
  }
  return pairs
}

/** A file's text parsed, or undefined for no file. */
export const parsed = (text) => (text === null || text === undefined ? undefined : JSON.parse(text))
