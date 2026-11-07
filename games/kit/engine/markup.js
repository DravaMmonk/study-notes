// The markup a game's text may carry, the same in every game: a few inline tags and the references to levels, parts
// and encyclopedia entries (../shell/refs.js). Text is never set as HTML: the shell draws what markupOf reads
// (../shell/Markup.jsx), so a tag outside this set shows as the characters it is, and `npm run check` refuses it
// (schema.js, every text).
//
//   <b> <i> <strong> <code>                    emphasis and code, nested freely, no attributes
//   <level-ref to="id"></level-ref>            a reference (also part-ref, wiki-ref), its one attribute `to`
//
//   \( … \) / \[ … \]                    inline / display LaTeX; code spans stay literal
//
// A `<` that does not start a tag (a < b, x <- y) is plain text.

export const TAGS = ['b', 'i', 'strong', 'code']
const REF_KINDS = ['level', 'part', 'wiki']
const TOKEN = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|(\\\(|\\\[)|<(level|part|wiki)-ref to="([^"<>]+)"><\/\4-ref>|<(\/?)([A-Za-z][A-Za-z0-9-]*)([^<>]*)>/g

/**
 * A text read as markup: { nodes, problems }. nodes: [string | { tag, kids } | { ref, to } | { math, display }]; problems: what in it is
 * not the markup above (a tag outside the set, an attribute, a tag left open or closed twice), each in words.
 */
export function markupOf(text) {
  const root = { kids: [] }
  const stack = [root]
  const problems = []
  const put = (node) => {
    const kids = stack.at(-1).kids
    if (typeof node === 'string' && typeof kids.at(-1) === 'string') kids[kids.length - 1] += node
    else kids.push(node)
  }
  const source = String(text)
  let at = 0
  for (const m of source.matchAll(TOKEN)) {
    if (m.index > at) put(source.slice(at, m.index))
    at = m.index + m[0].length
    const [whole, inlineMath, displayMath, unclosedMath, refKind, refTo, closing, tag, rest] = m
    if (inlineMath !== undefined || displayMath !== undefined || unclosedMath) {
      if (stack.some(n=>n.tag==='code')) put(whole)
      else if (unclosedMath) { problems.push(`unclosed math delimiter ${whole}`); put(whole) }
      else put({ math: inlineMath ?? displayMath, display: displayMath !== undefined })
      continue
    }
    if (refKind) {
      put({ ref: refKind, to: refTo })
      continue
    }
    const name = tag.toLowerCase()
    if (!TAGS.includes(name)) {
      problems.push(`${whole} is no markup a text may carry (${[...TAGS.map((t) => `<${t}>`), ...REF_KINDS.map((k) => `<${k}-ref to="…">`)].join(' ')})`)
      put(whole)
      continue
    }
    if (rest.trim()) {
      problems.push(`${whole}: a <${name}> takes no attributes`)
      put(whole)
      continue
    }
    if (!closing) {
      const node = { tag: name, kids: [] }
      put(node)
      stack.push(node)
    } else if (stack.length > 1 && stack.at(-1).tag === name) stack.pop()
    else {
      problems.push(`${whole} closes no open <${name}>`)
      put(whole)
    }
  }
  if (at < source.length) put(source.slice(at))
  for (const open of stack.slice(1)) problems.push(`<${open.tag}> is never closed`)
  return { nodes: root.kids, problems }
}
