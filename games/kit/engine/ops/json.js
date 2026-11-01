// Content files as text. The house style is 2-space indent, and an object or list on one line when that line (with
// its key and the comma after it) fits in WIDTH columns, open (one field or item a line) otherwise. Files written
// before the style was fixed are not all in it, so a file is rewritten keeping its own text wherever its value did not
// change: every object or list the change leaves as it was (at the same depth) is copied from the old text, a changed
// one keeps the shape it had (open or on one line), and only what is new is laid out in the house style. A change
// then touches only the lines it changes.

export const WIDTH = 112

const inline = (v) => {
  if (Array.isArray(v)) return v.length ? `[${v.map(inline).join(', ')}]` : '[]'
  if (v && typeof v === 'object') {
    const fields = Object.entries(v).filter(([, x]) => x !== undefined)
    return fields.length ? `{ ${fields.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}'
  }
  return JSON.stringify(v)
}
const isBox = (v) => v !== null && typeof v === 'object'
const columns = (s) => [...s].length

/**
 * The containers of a JSON text with where they are: { value, open, text, kids } for an object or list (`open` when
 * it spans lines; `kids` by key or index), { value } for anything else.
 */
export function spans(text) {
  let at = 0
  const space = () => { while (/\s/.test(text[at] ?? '')) at++ }
  const node = () => {
    space()
    const start = at
    const c = text[at]
    if (c !== '{' && c !== '[') {
      const m = /^("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|true|false|null)/.exec(text.slice(at))
      if (!m) throw new Error(`unexpected ${JSON.stringify(c)} at ${at}`)
      at += m[0].length
      return { value: JSON.parse(m[0]) }
    }
    at++
    const list = c === '['
    const kids = list ? [] : {}
    const value = list ? [] : {}
    space()
    while (text[at] !== (list ? ']' : '}')) {
      if (list) {
        const kid = node()
        kids.push(kid)
        value.push(kid.value)
      } else {
        const key = node().value
        space()
        at++ // :
        const kid = node()
        kids[key] = kid
        value[key] = kid.value
      }
      space()
      if (text[at] === ',') at++
      space()
    }
    at++
    const own = text.slice(start, at)
    return { value, open: own.includes('\n'), text: own, kids }
  }
  return node()
}

/** A content file's text for `value`, in the house style, or keeping `old` (the file's text before) where it can. */
export function writeJson(value, old = null) {
  const seen = new Map() // depth + value → the old text of that container
  const index = (n, depth) => {
    if (!n.kids) return
    const key = `${depth}\u0000${JSON.stringify(n.value)}`
    if (!seen.has(key)) seen.set(key, n.text)
    for (const kid of Object.values(n.kids)) index(kid, depth + 1)
  }
  const root = old === null ? null : spans(old)
  if (root) index(root, 0)

  const print = (v, depth, lead, tail, was) => {
    if (!isBox(v)) return JSON.stringify(v)
    const kept = seen.get(`${depth}\u0000${JSON.stringify(v)}`)
    if (kept !== undefined) return kept
    const flat = inline(v)
    const sameKind = was?.kids && Array.isArray(was.value) === Array.isArray(v)
    const open = sameKind ? was.open || columns(`${lead}${flat}${tail}`) > WIDTH : columns(`${lead}${flat}${tail}`) > WIDTH
    const entries = Array.isArray(v) ? v.map((x, k) => [null, x, sameKind ? was.kids[k] : null]) : Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, x, sameKind ? was.kids[k] : null])
    if (!open || !entries.length) return flat
    const pad = '  '.repeat(depth + 1)
    const rows = entries.map(([k, x, w], i) => {
      const key = `${pad}${k === null ? '' : `${JSON.stringify(k)}: `}`
      const comma = i < entries.length - 1 ? ',' : ''
      return `${key}${print(x, depth + 1, key, comma, w)}${comma}`
    })
    const [a, b] = Array.isArray(v) ? ['[', ']'] : ['{', '}']
    return `${a}\n${rows.join('\n')}\n${'  '.repeat(depth)}${b}`
  }
  return `${print(value, 0, '', '', root)}\n`
}
