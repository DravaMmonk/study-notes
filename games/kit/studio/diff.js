// A changed file read field by field, for the studio's changeset review (games/DESIGN.md 6.6): what a JSON file held
// before and after, as the values that differ, each at its path. A text pair, a board (a list of lines) and a list
// that changed length are compared whole; objects and lists of the same length are looked into.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isText = (v) => isObj(v) && typeof v.zh === 'string' && typeof v.en === 'string' && Object.keys(v).length === 2
const isLines = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * The fields that differ between `before` and `after` (either may be undefined: a file added or removed), as
 * [{ path, before, after, as: 'text' | 'lines' | 'value' }], in the order the after value lists them.
 */
export function fieldDiff(before, after, path = []) {
  if (same(before, after)) return []
  const as = isText(before) || isText(after) ? 'text' : isLines(before) || isLines(after) ? 'lines' : 'value'
  if (as === 'value' && isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(after), ...Object.keys(before)])]
    return keys.flatMap((k) => fieldDiff(before[k], after[k], [...path, k]))
  }
  if (as === 'value' && Array.isArray(before) && Array.isArray(after) && before.length === after.length) return after.flatMap((x, k) => fieldDiff(before[k], x, [...path, k]))
  return [{ path, before, after, as }]
}

/** A file's text parsed, or undefined for no file. */
export const parsed = (text) => (text === null || text === undefined ? undefined : JSON.parse(text))
