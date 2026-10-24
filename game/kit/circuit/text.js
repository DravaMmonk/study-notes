import { baseRefusal, byId, outputsOf, spotIn, srcKey, srcNode, srcOf } from './model.js'

// A board as plain ASCII text: what the player copies out of a level, keeps in a notepad or sends on, and pastes back
// (a blueprint). It says what the board computes and nothing about how it is laid out:
//
//   # blueprint 1 qed g-not                      a comment; this first line says what game and level it came from
//   n = gNot(Wind)                               a part: name = type(its inputs, in order; _ leaves one open)
//   k = const[value=0]()                         with its settings in brackets
//   s = add(m, view.coin)                        `view.coin`: one of a node's several outputs
//   f = impI[A=A](body: m2) {                    a frame (frames.js): a block per region, read inside it as
//     body {                                     `f.body`; what a region makes goes back in by name
//       m2 = mp(p, f.body)
//     }
//   }
//   out <- a                                     a wire into a node the level gives (`goal.in <- f` names the port)
//
// Names are ids, types and keys are the game's own (a name or a key that is not a plain word is quoted, "tap:up").
// Values are numbers, true, false, null, words, "strings", [lists] and {key: value} maps. Everything outside a
// comment is ASCII.
//
// A game says through its parts description (model.js) how its nodes read as text, all optional:
//   parts.text.value(node, key, v) → v spelled in ASCII        parts.text.read(node, key, v) → v as the game keeps it
//   parts.text.sets(node) → [field]   what the player sets on a node the level gives (an input card's picks: 'value',
//                                     and 'type' when its kind can change); such a node is written out with them
// A node the player may not remove (parts.removable, else every part may go) is given by the level: never declared,
// only wired to, unless it has settings of its own.

const WORD = /^[A-Za-z_][A-Za-z0-9_-]*$/
const NUMBER = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/
const RESERVED = new Set(['true', 'false', 'null', '_'])
const HEADER = 'blueprint'

// JSON, with every character past ASCII escaped.
const quote = (s) => JSON.stringify(String(s)).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
const name = (s) => (WORD.test(String(s)) && !RESERVED.has(String(s)) ? String(s) : NUMBER.test(String(s)) && !String(s).startsWith('-') ? String(s) : quote(s))
const word = (v) => (WORD.test(v) && !RESERVED.has(v) ? v : quote(v))
function value(v) {
  if (Array.isArray(v)) return `[${v.map(value).join(', ')}]`
  if (v && typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${name(k)}: ${value(x)}`).join(', ')}}`
  if (typeof v === 'string') return word(v)
  return JSON.stringify(v ?? null)
}
const source = (from) => (srcKey(from) === null ? name(srcNode(from)) : `${name(srcNode(from))}.${name(srcKey(from))}`)

/** What a node is set to: its params, and the `value` some games keep beside them. */
const settingsOf = (node) => ({ ...(node.params ?? {}), ...(node.value !== undefined && node.value !== '' ? { value: node.value } : {}) })
const placed = (parts, node) => (parts.removable ? parts.removable(node) : parts.role(node) === 'part')
const regionsOf = (parts, node) => (parts.frames?.(node) ?? []).map((r) => r.name)

/** Node ids, each after what it reads; what a frame's regions make for it does not count (it is written inside it). */
function flow(graph, parts) {
  const ids = graph.nodes.map((n) => n.id)
  const edges = graph.wires.filter((w) => !regionsOf(parts, byId(graph, w.to) ?? {}).includes(w.port)).map((w) => [srcNode(w.from), w.to])
  const out = []
  const left = new Set(ids)
  while (left.size) {
    const ready = ids.filter((id) => left.has(id) && !edges.some(([a, b]) => b === id && left.has(a) && a !== id))
    for (const id of ready.length ? ready : [[...left][0]]) {
      out.push(id)
      left.delete(id)
    }
  }
  return out
}

/**
 * The board as text. `head`: { game, level } for the first line.
 */
export function print(graph, parts, head = {}) {
  const lines = [`# ${[HEADER, 1, head.game, head.level].filter(Boolean).join(' ')}`]
  const ids = flow(graph, parts)
  const into = (id) => graph.wires.filter((w) => w.to === id)
  const ascii = (node, key, v) => (parts.text?.value ? parts.text.value(node, key, v) : v)
  const statement = (node, pad, fields = null) => {
    const own = settingsOf(node)
    const keys = fields ? Object.keys(own).filter((k) => fields.includes(k)) : Object.keys(own)
    const set = keys.map((k) => `${name(k)}=${value(ascii(node, k, own[k]))}`)
    const regions = regionsOf(parts, node)
    const ports = parts.inputs(node)
    const wired = new Map(into(node.id).map((w) => [w.port, w.from]))
    const plain = ports.filter((p) => !regions.includes(p))
    const last = plain.map((p) => wired.has(p)).lastIndexOf(true)
    // A wire into a port the node does not list is written by name, so nothing is lost (reading it back says why).
    const named = [...regions.filter((r) => wired.has(r)), ...[...wired.keys()].filter((p) => !ports.includes(p))]
    const args = [...plain.slice(0, last + 1).map((p) => (wired.has(p) ? source(wired.get(p)) : '_')), ...named.map((r) => `${name(r)}: ${source(wired.get(r))}`)]
    const type = fields && !fields.includes('type') ? '' : ` = ${name(node.type)}`
    return `${pad}${name(node.id)}${type}${set.length ? `[${set.join(', ')}]` : ''}(${args.join(', ')})`
  }
  const block = (scope, pad) => {
    for (const id of ids) {
      const node = byId(graph, id)
      if (!placed(parts, node) || (node.in ?? null) !== scope) continue
      const regions = regionsOf(parts, node)
      if (!regions.some((r) => graph.nodes.some((n) => n.in === `${id}/${r}`))) {
        lines.push(statement(node, pad))
        continue
      }
      lines.push(`${statement(node, pad)} {`)
      for (const r of regions) {
        if (!graph.nodes.some((n) => n.in === `${id}/${r}`)) continue
        lines.push(`${pad}  ${name(r)} {`)
        block(`${id}/${r}`, `${pad}    `)
        lines.push(`${pad}  }`)
      }
      lines.push(`${pad}}`)
    }
  }
  // Nodes the level gives: first those with settings of their own, written out with them; then the wires into the rest.
  for (const id of ids) {
    const node = byId(graph, id)
    const fields = placed(parts, node) ? [] : parts.text?.sets?.(node) ?? []
    if (fields.length) lines.push(statement(node, '', fields))
  }
  block(null, '')
  for (const id of ids) {
    const node = byId(graph, id)
    if (placed(parts, node) || (parts.text?.sets?.(node) ?? []).length) continue
    const ports = parts.inputs(node)
    for (const w of into(id)) lines.push(`${ports.length === 1 ? name(id) : `${name(id)}.${name(w.port)}`} <- ${source(w.from)}`)
  }
  return `${lines.join('\n')}\n`
}

// ---- reading ----

const say = (line, zh, en) => ({ line, zh: line ? `第 ${line} 行：${zh}` : zh, en: line ? `Line ${line}: ${en}` : en })

function tokens(text) {
  const out = []
  text.split(/\r?\n/).forEach((raw, k) => {
    const line = k + 1
    let i = 0
    while (i < raw.length) {
      const c = raw[i]
      if (c === ' ' || c === '\t') i += 1
      else if (c === '#') break
      else if (c === '"') {
        let j = i + 1
        while (j < raw.length && raw[j] !== '"') j += raw[j] === '\\' ? 2 : 1
        if (j >= raw.length) throw say(line, '引号没有合上。', 'A quote is not closed.')
        const t = raw.slice(i, j + 1)
        if (/[^\x20-\x7e]/.test(t)) throw say(line, '只能用 ASCII 字符（引号里也一样，别的字符写成 \\u 转义）。', 'Only ASCII characters, inside quotes too (write others as \\u escapes).')
        out.push({ t, line, str: true })
        i = j + 1
      } else if (raw.startsWith('<-', i)) {
        out.push({ t: '<-', line, p: true })
        i += 2
      } else if ('=[](),:{}.'.includes(c)) {
        out.push({ t: c, line, p: true })
        i += 1
      } else {
        const m = /^-?\d+(\.\d+)?([eE][-+]?\d+)?(?![A-Za-z0-9_-])|^[A-Za-z0-9_][A-Za-z0-9_-]*/.exec(raw.slice(i))
        if (!m) throw /[^\x20-\x7e]/.test(c) ? say(line, `只能用 ASCII 字符，这里有「${c}」。`, `Only ASCII characters; found “${c}”.`) : say(line, `看不懂「${c}」。`, `Cannot read “${c}”.`)
        out.push({ t: m[0], line })
        i += m[0].length
      }
    }
  })
  return out
}

/**
 * Read a board's text: { statements, wires } as written, or throws a { line, zh, en } at the first thing it cannot read.
 * A statement is { id, type?, settings, in, line }; a wire { from, to, port (a name, or a position among the node's
 * plain inputs), line, by? (the statement it is written in) }.
 */
export function parse(text) {
  const ts = tokens(text)
  let k = 0
  const at = () => ts[k]
  const peek = () => ts[k]?.t
  const line = () => (ts[k] ?? ts[ts.length - 1])?.line ?? 0
  const next = (want) => {
    const tok = ts[k]
    if (!tok) throw say(line(), `这里还没写完${want ? `，缺「${want}」` : ''}。`, `It ends too soon${want ? `; “${want}” is missing` : ''}.`)
    if (want && tok.t !== want) throw say(tok.line, `这里应当是「${want}」，写的是「${tok.t}」。`, `Expected “${want}”, found “${tok.t}”.`)
    k += 1
    return tok
  }
  // Between the items of a list: a comma, or the end of the list (which is what is missing when the text stops).
  const sep = (close) => peek() !== close && next(k < ts.length ? ',' : close)
  const ident = () => {
    const tok = next()
    if (tok.str) return JSON.parse(tok.t)
    if (tok.p) throw say(tok.line, `这里应当是一个名字，写的是「${tok.t}」。`, `Expected a name, found “${tok.t}”.`)
    return tok.t
  }
  const val = () => {
    const tok = at()
    if (tok?.t === '[') {
      next('[')
      const list = []
      while (peek() !== ']') {
        list.push(val())
        sep(']')
      }
      next(']')
      return list
    }
    if (tok?.t === '{') {
      next('{')
      const map = {}
      while (peek() !== '}') {
        const key = ident()
        next(':')
        map[key] = val()
        sep('}')
      }
      next('}')
      return map
    }
    const t = next()
    if (t.str) return JSON.parse(t.t)
    if (NUMBER.test(t.t)) return Number(t.t)
    if (t.t === 'true' || t.t === 'false' || t.t === 'null') return JSON.parse(t.t)
    if (WORD.test(t.t)) return t.t
    throw say(t.line, `「${t.t}」不是一个值。`, `“${t.t}” is not a value.`)
  }
  const src = () => {
    const node = ident()
    if (peek() !== '.') return node
    next('.')
    return `${node}#${ident()}`
  }
  const statements = []
  const wires = []
  const block = (scope) => {
    while (k < ts.length && peek() !== '}') {
      const first = at().line
      const id = ident()
      if (peek() === '.' || peek() === '<-') {
        const port = peek() === '.' ? (next('.'), ident()) : 0
        next('<-')
        wires.push({ from: src(), to: id, port, line: first })
        continue
      }
      const st = { id, settings: {}, in: scope, line: first }
      if (peek() === '=') {
        next('=')
        st.type = ident()
      }
      if (peek() === '[') {
        next('[')
        while (peek() !== ']') {
          const key = ident()
          next('=')
          st.settings[key] = val()
          sep(']')
        }
        next(']')
      }
      next('(')
      let position = 0
      const by = statements.length
      while (peek() !== ')') {
        const argLine = at().line
        if (ts[k + 1]?.t === ':') {
          const port = ident()
          next(':')
          wires.push({ from: src(), to: id, port, line: argLine, by })
        } else if (peek() === '_') {
          next('_')
          position += 1
        } else {
          wires.push({ from: src(), to: id, port: position, line: argLine, by })
          position += 1
        }
        sep(')')
      }
      next(')')
      statements.push(st)
      if (peek() === '{') {
        next('{')
        while (peek() !== '}') {
          const region = ident()
          next('{')
          block(`${id}/${region}`)
          next('}')
        }
        next('}')
      }
    }
  }
  block(null)
  if (k < ts.length) throw say(at().line, `多出了「${at().t}」。`, `Unexpected “${at().t}”.`)
  return { statements, wires }
}

/**
 * The board a text describes, built on `graph` (the board on screen): the level's own nodes stay where they are, the
 * parts are the text's (each keeps its place when the board had a part of that name and type), and the wires are
 * exactly the text's. `types`: the parts this level offers. Returns { graph } or { errors: [{ line, zh, en }] }; a
 * wire is checked as the editors check one (model.js baseRefusal, the game's parts.refuse).
 */
export function read(text, graph, parts, types) {
  let parsed
  try {
    parsed = parse(text)
  } catch (error) {
    if (error.zh) return { errors: [error] }
    throw error
  }
  const errors = []
  const offered = new Set(types)
  const unread = (node, key, v) => (parts.text?.read ? parts.text.read(node, key, v) : v)
  const givens = graph.nodes.filter((n) => !placed(parts, n))
  const nodes = givens.map((n) => ({ ...n }))
  const seen = new Set()
  // Statements refused (by index) and the nodes they leave out: their wires say nothing more.
  const failed = new Set()
  const missing = new Set()
  const refuse = (st, zh, en) => {
    errors.push(say(st.line, zh, en))
    failed.add(parsed.statements.indexOf(st))
    missing.add(st.id)
  }
  for (const st of parsed.statements) {
    if (seen.has(st.id)) {
      errors.push(say(st.line, `「${st.id}」写了两次。`, `“${st.id}” is written twice.`))
      failed.add(parsed.statements.indexOf(st))
      continue
    }
    seen.add(st.id)
    const given = nodes.find((n) => n.id === st.id && givens.some((g) => g.id === n.id))
    if (given) {
      const fields = parts.text?.sets?.(given) ?? []
      const wants = [...(st.type !== undefined && st.type !== given.type ? ['type'] : []), ...Object.keys(st.settings)]
      const stray = wants.filter((f) => !fields.includes(f))
      if (stray.length) {
        refuse(st, `「${st.id}」是关卡给的，不能改它的 ${stray.join('、')}。`, `“${st.id}” is given by the level; its ${stray.join(', ')} cannot change.`)
        continue
      }
      if (st.type !== undefined) given.type = st.type
      for (const [key, v] of Object.entries(st.settings)) {
        if (key === 'value') given.value = unread(given, key, v)
        else given.params = { ...given.params, [key]: unread(given, key, v) }
      }
      continue
    }
    if (st.type === undefined) {
      refuse(st, `「${st.id}」不是这一关给的输入或输出，要写出它是什么元件：${st.id} = 类型(…)。`, `“${st.id}” is not given by the level; say which part it is: ${st.id} = type(…).`)
      continue
    }
    if (!offered.has(st.type)) {
      refuse(st, `这一关不能用「${st.type}」。`, `“${st.type}” is not available on this level.`)
      continue
    }
    const node = { id: st.id, type: st.type }
    const { value: v, ...params } = st.settings
    node.params = Object.fromEntries(Object.entries(params).map(([key, x]) => [key, unread(node, key, x)]))
    if (v !== undefined) node.value = unread(node, 'value', v)
    if (st.in) node.in = st.in
    const before = graph.nodes.find((n) => n.id === st.id && n.type === st.type && placed(parts, n) && (n.in ?? null) === (st.in ?? null))
    if (before) Object.assign(node, Object.fromEntries(['x', 'y', 'slot', 'fold'].filter((f) => f in before).map((f) => [f, before[f]])))
    nodes.push(node)
  }
  // Where each new card goes, and whether every region it names is one its frame has.
  let out = { nodes, wires: [] }
  for (const node of nodes) {
    if (node.in) {
      const [frame, region] = node.in.split('/')
      const box = nodes.find((n) => n.id === frame)
      if (!box || !regionsOf(parts, box).includes(region)) {
        const st = parsed.statements.find((s) => s.id === node.id)
        errors.push(say(st?.line, `「${frame}」没有叫「${region}」的区域。`, `“${frame}” has no region called “${region}”.`))
      }
    }
    if (node.x === undefined && placed(parts, node)) {
      const [x, y] = spotIn(out, node.in ?? null)
      Object.assign(node, { x, y })
    }
  }
  for (const w of parsed.wires) {
    if (failed.has(w.by) || missing.has(w.to) || missing.has(srcNode(w.from))) continue
    const to = byId(out, w.to)
    if (!to) {
      errors.push(say(w.line, `没有叫「${w.to}」的元件。`, `There is no node called “${w.to}”.`))
      continue
    }
    const regions = regionsOf(parts, to)
    const plain = parts.inputs(to).filter((p) => !regions.includes(p))
    const port = typeof w.port === 'number' ? plain[w.port] : w.port
    if (port === undefined || !parts.inputs(to).includes(port)) {
      errors.push(say(w.line, typeof w.port === 'number' ? `「${w.to}」没有第 ${w.port + 1} 个输入口。` : `「${w.to}」没有叫「${w.port}」的输入口。`, typeof w.port === 'number' ? `“${w.to}” has no input number ${w.port + 1}.` : `“${w.to}” has no input called “${w.port}”.`))
      continue
    }
    const from = byId(out, srcNode(w.from))
    const keys = from ? outputsOf(parts, from).map((o) => o.key) : []
    if (!from || !keys.includes(srcKey(w.from))) {
      errors.push(say(w.line, from ? `「${srcNode(w.from)}」没有输出「${srcKey(w.from) ?? ''}」。` : `没有叫「${srcNode(w.from)}」的元件。`, from ? `“${srcNode(w.from)}” has no output “${srcKey(w.from) ?? ''}”.` : `There is no node called “${srcNode(w.from)}”.`))
      continue
    }
    if (out.wires.some((x) => x.to === to.id && x.port === port)) {
      errors.push(say(w.line, `「${w.to}」的「${port}」口接了两根线。`, `Input “${port}” of “${w.to}” takes two wires.`))
      continue
    }
    const from_ = srcOf(from, srcKey(w.from))
    const no = baseRefusal(out, from_, to.id, port, parts) ?? parts.refuse?.(out, from_, to.id, port) ?? null
    if (no) {
      errors.push(say(w.line, no.zh, no.en))
      continue
    }
    out = { ...out, wires: [...out.wires, { from: from_, to: to.id, port }] }
  }
  return errors.length ? { errors } : { graph: { ...graph, nodes: out.nodes, wires: out.wires } }
}

/** What a text says it is: { game, level } from its first line, or null when it does not say. */
export function headOf(text) {
  const m = /^\s*#\s*blueprint\s+\d+(?:\s+(\S+))?(?:\s+(\S+))?/.exec(text)
  return m ? { game: m[1] ?? null, level: m[2] ?? null } : null
}
