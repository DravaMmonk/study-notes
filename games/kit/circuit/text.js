import { dependencyOrder, indexEdges } from '../graph.js'
import { sourceOf, splitSource, srcNode, wireEdges } from '../engine/wire-source.js'
import { cardPosition, flowSpots } from './layout.js'
import { byId, connectWire, hasOutput, inPort, isPart, spotIn, wirePortRefusal } from './model.js'
import { isFixed, keepFixedSettings, keepLocked, lockedCards, PRESET_PORT_REFUSAL } from './presets.js'
import { sameJson } from '../engine/json-value.js'
import { regionAddress, regionProblems, regionsOf, terminalRegionProblem } from './regions.js'

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
//   parts.text.check(node, key, v) → { zh, en } | null for an invalid value
//   parts.text.settings(node) → [field] the fields a placed part accepts
//   parts.text.sets(node) → [field] what the player can set on an input or output the level gives (sensor picks)
// A blueprint declares parts. The level supplies the inputs and outputs; the text connects them and can list
// settings they expose. Preset parts are written as parts, with their locks supplied by the level on import.

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
export function printSource(from) {
  const [id, key] = splitSource(from)
  return key === null ? name(id) : `${name(id)}.${name(key)}`
}

/** What a node is set to: its params. */
const settingsOf = (node) => node.params ?? {}
const regionNames = (parts, node) => regionsOf(parts, node).map((region) => region.name)

/** Node ids, each after what it reads; what a frame's regions make for it does not count (it is written inside it). */
function flow(graph, parts) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]))
  const inputs = graph.wires.filter((wire) => !regionNames(parts, nodes.get(wire.to)).includes(wire.port))
  const edges = wireEdges(inputs).filter(([from, to]) => from !== to)
  return dependencyOrder([...nodes.keys()], indexEdges(edges), { breakCycles: true }).ordered
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
    const regions = regionNames(parts, node)
    const ports = parts.inputs(node)
    const wired = new Map(into(node.id).map((w) => [w.port, w.from]))
    const plain = ports.filter((p) => !regions.includes(p))
    const last = plain.map((p) => wired.has(p)).lastIndexOf(true)
    // A wire into a port the node does not list is written by name, so nothing is lost (reading it back says why).
    const named = [...regions.filter((r) => wired.has(r)), ...[...wired.keys()].filter((p) => !ports.includes(p))]
    const args = [...plain.slice(0, last + 1).map((p) => (wired.has(p) ? printSource(wired.get(p)) : '_')), ...named.map((r) => `${name(r)}: ${printSource(wired.get(r))}`)]
    const type = fields ? '' : ` = ${name(node.type)}`
    return `${pad}${name(node.id)}${type}${set.length ? `[${set.join(', ')}]` : ''}(${args.join(', ')})`
  }
  const block = (scope, pad) => {
    for (const id of ids) {
      const node = byId(graph, id)
      if (!isPart(parts, node) || (node.in ?? null) !== scope) continue
      const regions = regionNames(parts, node)
      if (!regions.some((r) => graph.nodes.some((n) => n.in === regionAddress(id, r)))) {
        lines.push(statement(node, pad))
        continue
      }
      lines.push(`${statement(node, pad)} {`)
      for (const r of regions) {
        if (!graph.nodes.some((n) => n.in === regionAddress(id, r))) continue
        lines.push(`${pad}  ${name(r)} {`)
        block(regionAddress(id, r), `${pad}    `)
        lines.push(`${pad}  }`)
      }
      lines.push(`${pad}}`)
    }
  }
  // Nodes the level gives: first those with settings of their own, written out with them; then the wires into the rest.
  for (const id of ids) {
    const node = byId(graph, id)
    const fields = isPart(parts, node) ? [] : parts.text?.sets?.(node) ?? []
    if (fields.length) lines.push(statement(node, '', fields))
  }
  block(null, '')
  for (const id of ids) {
    const node = byId(graph, id)
    if (isPart(parts, node) || (parts.text?.sets?.(node) ?? []).length) continue
    const ports = parts.inputs(node)
    for (const w of into(id)) lines.push(`${w.port === ports[0] ? name(id) : `${name(id)}.${name(w.port)}`} <- ${printSource(w.from)}`)
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
        let decoded
        try { decoded = JSON.parse(t) } catch { throw say(line, '引号内的转义无效。', 'Invalid escape in quoted text.') }
        out.push({ t, line, str: true, decoded })
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
    if (tok.str) return tok.decoded
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
    if (t.str) return t.decoded
    if (NUMBER.test(t.t)) return Number(t.t)
    if (t.t === 'true' || t.t === 'false' || t.t === 'null') return JSON.parse(t.t)
    if (WORD.test(t.t)) return t.t
    throw say(t.line, `「${t.t}」不是一个值。`, `“${t.t}” is not a value.`)
  }
  const src = () => {
    const node = ident()
    if (peek() !== '.') return node
    next('.')
    return sourceOf(node, ident())
  }
  const statements = []
  const declared = new Set()
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
      if (declared.has(id)) throw say(first, `「${id}」写了两次。`, `“${id}” is written twice.`)
      declared.add(id)
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
        if (!id || id.includes('/')) throw say(first, '框的名字不能为空，也不能含有「/」。', 'A frame name cannot be empty or contain a slash.')
        next('{')
        while (peek() !== '}') {
          const region = ident()
          next('{')
          if (!region) throw say(first, '区域的名字不能为空。', 'A region name cannot be empty.')
          block(regionAddress(id, region))
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
 * parts are the text's (each keeps its place when the board had a part of that name and type). A locked card or
 * wire stays on the board even if omitted, and the text cannot override it. `types`: the parts this level offers.
 * Returns { graph } or { errors: [{ line, zh, en }] }; wires use the same edit as the editors (model.js connectWire).
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
  const beforeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const protectedIds = lockedCards(graph)
  const nodes = graph.nodes.filter((n) => !isPart(parts, n)).map((n) => ({ ...n }))
  // Statements refused (by index) and the nodes they leave out: their wires say nothing more.
  const failed = new Set()
  const missing = new Set()
  const refuse = (st, zh, en) => {
    errors.push(say(st.line, zh, en))
    failed.add(parsed.statements.indexOf(st))
    missing.add(st.id)
  }
  const readSettings = (st, node, locked) => {
    const settings = {}
    for (const [key, value] of Object.entries(st.settings)) {
      const error = parts.text?.check?.(node, key, value)
      if (error) {
        refuse(st, error.zh, error.en)
        return null
      }
      const read = unread(node, key, value)
      if (locked && isFixed(locked, key) && !sameJson(locked.params?.[key], read)) {
        refuse(st, `「${st.id}」的设置「${key}」由关卡固定。`, `The level fixes the “${key}” setting on “${st.id}”.`)
        return null
      }
      settings[key] = read
    }
    return settings
  }
  for (const st of parsed.statements) {
    const before = beforeById.get(st.id)
    const locked = protectedIds.has(st.id) ? before : null
    if (locked && ((st.type !== undefined && st.type !== locked.type) || (st.in ?? null) !== (locked.in ?? null))) {
      refuse(st, `「${st.id}」是关卡摆好的，不能改它的类型或所在区域。`, `“${st.id}” is placed by the level; its type and region are fixed.`)
      continue
    }
    const given = before && !isPart(parts, before) ? nodes.find((n) => n.id === st.id) : null
    if (given) {
      const problem = terminalRegionProblem(parts, given, st.in)
      if (problem) {
        refuse(st, problem.zh, problem.en)
        continue
      }
      const fields = parts.text?.sets?.(given) ?? []
      const stray = [...(st.type !== undefined && st.type !== given.type ? ['type'] : []), ...Object.keys(st.settings).filter((f) => !fields.includes(f))]
      if (stray.length) {
        refuse(st, `「${st.id}」是关卡给的，不能改它的 ${stray.join('、')}。`, `“${st.id}” is given by the level; its ${stray.join(', ')} cannot change.`)
        continue
      }
      const settings = readSettings(st, given, locked)
      if (settings && Object.keys(settings).length) given.params = { ...given.params, ...settings }
      continue
    }
    const type = st.type ?? locked?.type
    if (type === undefined) {
      refuse(st, `「${st.id}」不是这一关给的输入或输出，要写出它是什么元件：${st.id} = 类型(…)。`, `“${st.id}” is not given by the level; say which part it is: ${st.id} = type(…).`)
      continue
    }
    if (!locked && !offered.has(type)) {
      refuse(st, `这一关不能用「${type}」。`, `“${type}” is not available on this level.`)
      continue
    }
    const node = { id: st.id, type }
    if (!isPart(parts, node)) {
      refuse(st, `「${type}」由关卡提供，不能另放一张。`, `“${type}” is supplied by the level; an extra card cannot be placed.`)
      continue
    }
    const keys = parts.text?.settings?.(node)
    const stray = Object.keys(st.settings).find((key) => keys && !keys.includes(key))
    if (stray !== undefined) {
      refuse(st, `「${type}」没有设置「${stray}」。`, `“${type}” has no setting “${stray}”.`)
      continue
    }
    const settings = readSettings(st, node, locked)
    if (!settings) continue
    node.params = { ...(locked?.params ?? parts.defaults?.(type)), ...settings }
    if (st.in) node.in = st.in
    if (before?.type === type && (before.in ?? null) === (st.in ?? null)) {
      Object.assign(node, cardPosition(before))
    }
    nodes.push(node)
  }
  let out = keepLocked(graph, { nodes, wires: [] })
  const invalid = regionProblems(out, parts)
  if (invalid.length) {
    const lines = new Map(parsed.statements.map(({ id, line }) => [id, line]))
    return { errors: [...errors, ...invalid.map(({ id, zh, en }) => say(lines.get(id), zh, en))] }
  }
  for (const node of out.nodes) {
    // A new card in a frame's region takes the next free cell of it; one on the board itself is placed once the
    // wires are read, where they lead (layout.js flowSpots).
    if (node.x === undefined && isPart(parts, node) && node.in) {
      const [x, y] = spotIn(out, node.in)
      Object.assign(node, { x, y })
    }
  }
  const fresh = out.nodes.filter((n) => n.x === undefined && isPart(parts, n))
  const preset = new Map(out.wires.map((wire) => [inPort(wire.to, wire.port), wire]))
  const written = new Set()
  for (const w of parsed.wires) {
    const [fromId, outKey] = splitSource(w.from)
    if (failed.has(w.by) || missing.has(w.to) || missing.has(fromId)) continue
    const to = byId(out, w.to)
    let port = w.port
    if (to && typeof port === 'number') {
      const regions = regionNames(parts, to)
      port = parts.inputs(to).filter((p) => !regions.includes(p))[port]
      if (port === undefined) {
        errors.push(say(w.line, `「${w.to}」没有第 ${w.port + 1} 个输入口。`, `“${w.to}” has no input number ${w.port + 1}.`))
        continue
      }
    }
    const from = byId(out, fromId)
    // A given node that can give what the wire takes but is not giving it yet (a sensor not switched on) is switched
    // on for it: the text says what the board reads.
    const opened = from && !isPart(parts, from) && !hasOutput(parts, from, outKey) && parts.text?.opens?.(from, outKey)
    if (opened) from.params = keepFixedSettings(from, opened)
    const connection = { from: w.from, to: w.to, port }
    const address = inPort(w.to, port)
    if (written.has(address)) {
      errors.push(say(w.line, `「${w.to}」的「${port}」口接了两根线。`, `Input “${port}” of “${w.to}” takes two wires.`))
      continue
    }
    written.add(address)
    if (preset.get(address)?.from === w.from) continue
    const next = connectWire(out, parts, connection)
    if (next.reason) {
      errors.push(say(w.line, next.reason.zh, next.reason.en))
      continue
    }
    out = next.graph
  }
  for (const wire of preset.values()) {
    if (!wirePortRefusal(parts, wire, (id) => byId(out, id))) continue
    const line = parsed.statements.find((st) => st.id === srcNode(wire.from) || st.id === wire.to)?.line
    errors.push(say(line, PRESET_PORT_REFUSAL.zh, PRESET_PORT_REFUSAL.en))
  }
  if (errors.length) return { errors }
  flowSpots(out, fresh, parts.role)
  return { graph: { ...graph, nodes: out.nodes, wires: out.wires } }
}

/** Write a blueprint as content lines, without the editor's header. */
export function printLines(graph, parts) {
  return print(graph, parts).trimEnd().split('\n').slice(1)
}

/** Read content blueprint lines with the same board rules, attaching every diagnostic to the first. */
export function readLines(lines, graph, parts, types) {
  const result = read(lines.join('\n'), graph, parts, types)
  if (result.errors) throw { ...result.errors[0], errors: result.errors }
  return result.graph
}

/** What a text says it is: { game, level } from its first line, or null when it does not say. */
export function headOf(text) {
  const m = /^\s*#\s*blueprint\s+\d+(?:\s+(\S+))?(?:\s+(\S+))?/.exec(text)
  return m ? { game: m[1] ?? null, level: m[2] ?? null } : null
}
