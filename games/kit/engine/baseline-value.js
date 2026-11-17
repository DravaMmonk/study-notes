import { createHash } from 'node:crypto'

// Stable, lossless projections of runtime data; arrays retain execution order.
export function baselineValue(input) {
  const memo = new WeakMap(), hashes = new WeakMap(), pool = new Map()
  // Search traces copy growing states. Intern equal subtrees so complete reports stay practical.
  const intern = value => {
    if (!value || typeof value !== 'object' || hashes.has(value)) return value
    const entries = Object.entries(value).map(([key, v]) => [key, intern(v)])
    const token = v => v && typeof v === 'object' ? { hash: hashes.get(v) } : v
    const hash = createHash('sha256').update(JSON.stringify([Array.isArray(value), entries.map(([key, v]) => [key, token(v)])])).digest('hex')
    if (pool.has(hash)) return pool.get(hash)
    const out = Array.isArray(value) ? entries.map(([, v]) => v) : Object.fromEntries(entries)
    hashes.set(out, hash)
    pool.set(hash, out)
    return out
  }
  const project = (value, ancestors = new Set()) => {
    if (value === undefined) return { $undefined: true }
    if (typeof value === 'number' && !Number.isFinite(value)) return { $number: String(value) }
    if (Object.is(value, -0)) return { $number: '-0' }
    if (typeof value === 'symbol') return { $symbol: value.description }
    if (typeof value === 'function') return { $function: true }
    if (value === null || typeof value !== 'object') return value
    if (ancestors.has(value)) throw new Error('cyclic baseline data: select a data projection')
    if (memo.has(value)) return memo.get(value)
    const next = new Set([...ancestors, value])
    const visit = v => project(v, next)
    const keep = result => { const out = intern(result); memo.set(value, out); return out }
    if (value instanceof Map) return keep({ $map: [...value].map(([k, v]) => [visit(k), visit(v)]).sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]), 'en')) })
    if (value instanceof Set) return keep({ $set: [...value].map(visit).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en')) })
    if (ArrayBuffer.isView(value)) return keep(Array.from(value, visit))
    if (Array.isArray(value)) return keep(value.map(visit))
    if (value.constructor?.name === 'Lazy') return String(value)
    return keep(Object.fromEntries(Object.keys(value).sort().map(key => [key, visit(value[key])])))
  }
  return project(input)
}

/** Only registered names are aliases; prose, formulas and arbitrary slashes stay meaningful. */
export function nameNormalizer(names) {
  // MODULES.md §10.3 explicitly makes these kind/path/key spellings equivalent.
  const kindNames = text => text
    .replace(/\btags\/(?:piece|circuit\/part)\//g, 'tags/part/')
    .replace(/\bpieces(?=\/|\.json\b)/g, 'parts')
    .replace(/\bpiece\//g, 'parts/')
    .replace(/\bcircuit\/part\b/g, 'part')
    .replace(/\bpiece\b/g, 'part')
  const local = name => kindNames(name).replace(/^@?[^/:]+[/:]/, '').replace(/^(world|robot|port|want|family)-/, '')
  const aliases = new Map()
  for (const name of names) {
    const short = local(name)
    const group = aliases.get(short) ?? new Set()
    group.add(name)
    aliases.set(short, group)
  }
  // Ambiguous local names keep their qualified identity; never merge two independent objects.
  const pairs = [...new Set(names)].filter(name => local(name) !== name && aliases.get(local(name)).size === 1).sort((a, b) => b.length - a.length || a.localeCompare(b, 'en'))
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = pairs.length ? new RegExp(`(?<![\\w/-])(${pairs.map(escape).join('|')})(?![\\w-])`, 'g') : null
  const normalize = text => kindNames(pattern ? text.replace(pattern, name => local(name)) : text)
  return input => {
    const memo = new WeakMap()
    const walk = value => {
      if (typeof value === 'string') return normalize(value)
      if (!value || typeof value !== 'object') return value
      if (memo.has(value)) return memo.get(value)
      if (Array.isArray(value)) { const out = value.map(walk); memo.set(value, out); return out }
      const entries = Object.entries(value).map(([key, v]) => [normalize(key), walk(v)])
      for (const [key, list] of entries) if (key === '$map' || key === '$set') list.sort((a, b) => JSON.stringify(key === '$map' ? a[0] : a).localeCompare(JSON.stringify(key === '$map' ? b[0] : b), 'en'))
      if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error(`baseline alias collision: ${Object.keys(value).join(', ')}`)
      const out = Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b, 'en')))
      memo.set(value, out)
      return out
    }
    return walk(input)
  }
}

// Keep shared proof terms shared on disk. Decoding removes representation identity before comparison.
export function packBaseline(value) {
  const nodes = [], seen = new WeakMap()
  const encode = value => {
    if (value === null || typeof value !== 'object') return value
    if (seen.has(value)) return { ref: seen.get(value) }
    const id = nodes.length
    seen.set(value, id)
    nodes.push(null)
    nodes[id] = Array.isArray(value) ? { array: value.map(encode) } : { object: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) }
    return { ref: id }
  }
  const root = encode(value)
  return { encoding: 'shared-json-v1', root, nodes }
}

export function unpackBaseline({ encoding, root, nodes }) {
  if (encoding !== 'shared-json-v1') throw new Error('unknown baseline encoding')
  const memo = new Map()
  const decode = value => {
    if (value === null || typeof value !== 'object') return value
    const id = value.ref
    if (memo.has(id)) return memo.get(id)
    const node = nodes[id]
    const out = node.array ? node.array.map(decode) : Object.fromEntries(Object.entries(node.object).map(([k, v]) => [k, decode(v)]))
    memo.set(id, out)
    return out
  }
  return decode(root)
}

export function differences(before, after) {
  const memo = new WeakMap()
  const object = v => v !== null && typeof v === 'object'
  const same = (a, b) => {
    if (Object.is(a, b)) return true
    if (!object(a) || !object(b) || Array.isArray(a) !== Array.isArray(b)) return false
    if (memo.get(a)?.has(b)) return memo.get(a).get(b)
    const keys = Object.keys(a)
    const equal = keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && same(a[key], b[key]))
    if (!memo.has(a)) memo.set(a, new WeakMap())
    memo.get(a).set(b, equal)
    return equal
  }
  const diff = (a, b, path) => {
    if (same(a, b)) return []
    if (!object(a) || !object(b) || Array.isArray(a) !== Array.isArray(b)) return [{ path, before: a, after: b }]
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap(key => diff(a[key], b[key], `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`))
  }
  return diff(before, after, '$')
}
