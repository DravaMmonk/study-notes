// The expressions a part definition computes with (games/DESIGN.md 6.9): one line of ASCII that calls the domain's
// engine resources (its vocabulary's `op` kind) on the part's inputs and settings, and nothing else.
//
//   a                       the value at input a
//   $op                     setting op's value
//   1.5   -2   'add'        a number, a word
//   add(a, b)               an engine resource on its arguments, positional first, then named: sample(x, y, method=$m)
//   match $op { add: add(a, b), sub: sub(a, b), _: a }    by a setting's value; _ for every other value
//
// parse(text) → the tree, or throws an ExprError at a column; print(tree) writes it back; refsOf lists what it reads;
// problemsOf checks it against what it may name; evaluate runs it.
//
// A tree is { in }, { set }, { num }, { str }, { call, args: [tree], named: { name: tree } }, or
// { match: tree, cases: { value: tree }, other?: tree }. The builtin if (builtins.js) works out only the branch it
// takes; every other call works out all its arguments first.

export class ExprError extends Error {
  constructor(message, at) {
    super(message)
    this.at = at
  }
}

const NAME = /[A-Za-z_][A-Za-z0-9_]*/y
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y
const SPACE = /\s*/y

/** The tree of an expression; throws an ExprError (with the column `at`) on text it cannot read. */
export function parse(text) {
  const src = String(text ?? '')
  let k = 0
  const skip = () => { SPACE.lastIndex = k; SPACE.exec(src); k = SPACE.lastIndex }
  const fail = (message) => { throw new ExprError(message, k) }
  const peek = () => (skip(), src[k])
  const eat = (ch) => {
    if (peek() !== ch) fail(`expected “${ch}”${k < src.length ? `, found “${src[k]}”` : ' at the end'}`)
    k += 1
  }
  const read = (re) => {
    skip()
    re.lastIndex = k
    const m = re.exec(src)
    if (!m) return null
    k = re.lastIndex
    return m[0]
  }
  const name = () => read(NAME) ?? fail(`expected a name${k < src.length ? `, found “${src[k]}”` : ' at the end'}`)
  const value = () => {
    const ch = peek()
    if (ch === '$') { k += 1; return { set: name() } }
    if (ch === "'") {
      const end = src.indexOf("'", k + 1)
      if (end < 0) fail('a word in quotes is not closed')
      const str = src.slice(k + 1, end)
      k = end + 1
      return { str }
    }
    if (/[-.\d]/.test(ch ?? '')) {
      const n = read(NUMBER)
      if (n === null) fail(`“${ch}” starts no number`)
      return { num: Number(n) }
    }
    const word = name()
    if (word === 'match') return matchOf()
    if (peek() !== '(') return { in: word }
    k += 1
    const args = []
    const named = {}
    while (peek() !== ')') {
      const at = k
      const key = read(NAME)
      if (key !== null && peek() === '=') {
        k += 1
        if (key in named) fail(`${key} is given twice`)
        named[key] = value()
      } else {
        k = at
        if (Object.keys(named).length) fail('a positional argument after a named one')
        args.push(value())
      }
      if (peek() === ',') k += 1
      else if (peek() !== ')') fail(`expected “,” or “)”${k < src.length ? `, found “${src[k]}”` : ' at the end'}`)
    }
    k += 1
    return { call: word, args, named }
  }
  const matchOf = () => {
    const on = value()
    eat('{')
    const cases = {}
    let other
    while (peek() !== '}') {
      const key = peek() === "'" ? value().str : peek() !== undefined && /[-.\d]/.test(peek()) ? String(read(NUMBER)) : name()
      eat(':')
      const then = value()
      if (key === '_') other = then
      else if (key in cases) fail(`the case ${key} is written twice`)
      else cases[key] = then
      if (peek() === ',') k += 1
      else if (peek() !== '}') fail(`expected “,” or “}”${k < src.length ? `, found “${src[k]}”` : ' at the end'}`)
    }
    k += 1
    return { match: on, cases, ...(other ? { other } : {}) }
  }
  if (!src.trim()) fail('the expression is empty')
  const tree = value()
  if (peek() !== undefined) fail(`“${src.slice(k)}” is left over`)
  return tree
}

const caseKey = (v) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(v) ? v : /^-?\d+(\.\d+)?$/.test(v) ? v : `'${v}'`)

/** The text of a tree, as parse reads it back. */
export function print(t) {
  if ('in' in t) return t.in
  if ('set' in t) return `$${t.set}`
  if ('num' in t) return String(t.num)
  if ('str' in t) return `'${t.str}'`
  if ('match' in t) return `match ${print(t.match)} { ${[...Object.entries(t.cases).map(([k, v]) => `${caseKey(k)}: ${print(v)}`), ...(t.other ? [`_: ${print(t.other)}`] : [])].join(', ')} }`
  return `${t.call}(${[...t.args.map(print), ...Object.entries(t.named).map(([k, v]) => `${k}=${print(v)}`)].join(', ')})`
}

/** What a tree reads: { inputs, settings, calls } as sets of names. */
export function refsOf(t, out = { inputs: new Set(), settings: new Set(), calls: new Set() }) {
  if ('in' in t) out.inputs.add(t.in)
  else if ('set' in t) out.settings.add(t.set)
  else if ('call' in t) {
    out.calls.add(t.call)
    for (const a of [...t.args, ...Object.values(t.named)]) refsOf(a, out)
  } else if ('match' in t) {
    refsOf(t.match, out)
    for (const c of [...Object.values(t.cases), ...(t.other ? [t.other] : [])]) refsOf(c, out)
  }
  return out
}

/**
 * Everything wrong with a tree, as [string], given what it may name:
 *   ops       { name: { args: [{ name }], params? (schema) } }   the domain's engine resources
 *   inputs    [name] the part's inputs (empty where only settings may be read: a readout, an action)
 *   settings  { key: setting } the part's settings, resolved (define.js): their controls and options
 *   fits(schema, value) → whether a value fits a resource's parameter schema
 */
export function problemsOf(t, { ops, inputs, settings, fits }) {
  const out = []
  const valuesOf = (x) => {
    if ('num' in x) return [x.num]
    if ('str' in x) return [x.str]
    if ('set' in x && settings[x.set]?.options) return settings[x.set].options.map((o) => o.value)
    return null
  }
  const walk = (x) => {
    if ('in' in x) {
      if (!inputs.includes(x.in)) out.push(inputs.length ? `${x.in} is no input of the part (its inputs: ${inputs.join(', ') || 'none'})` : `${x.in}: only settings ($name) are read here`)
    } else if ('set' in x) {
      if (!settings[x.set]) out.push(`$${x.set} is no setting of the part`)
    } else if ('call' in x) {
      const op = ops[x.call]
      for (const a of [...x.args, ...Object.values(x.named)]) walk(a)
      if (!op) return out.push(`${x.call} is no engine resource of the domain`)
      if (x.args.length !== op.args.length) out.push(`${x.call} takes ${op.args.length} argument${op.args.length === 1 ? '' : 's'} (${op.args.map((a) => a.name).join(', ')}), given ${x.args.length}`)
      // A plain number is a literal, a setting or a number a builtin works out: never an input or a domain value.
      x.args.forEach((a, k) => {
        if (op.args[k]?.type !== 'num') return
        const what = 'in' in a ? `the input ${a.in}` : 'str' in a ? `the word ${a.str}` : 'call' in a && ops[a.call] && ops[a.call].returns !== 'num' ? `what ${a.call} gives` : null
        if (what) out.push(`${x.call}(${op.args[k].name}): ${what} is no plain number`)
      })
      for (const [key, arg] of Object.entries(x.named)) {
        const schema = op.params?.fields?.[key]
        if (!schema) { out.push(`${x.call} has no parameter ${key}${op.params ? ` (its parameters: ${Object.keys(op.params.fields).join(', ')})` : ''}`); continue }
        const values = valuesOf(arg)
        for (const v of values ?? []) if (!fits(schema, v)) out.push(`${x.call}(${key}=${JSON.stringify(v)}): the value does not fit the parameter`)
      }
      for (const [key, schema] of Object.entries(op.params?.fields ?? {})) if (!schema.optional && !(key in x.named)) out.push(`${x.call} needs ${key}=…`)
    } else if ('match' in x) {
      walk(x.match)
      for (const c of [...Object.values(x.cases), ...(x.other ? [x.other] : [])]) walk(c)
      const options = 'set' in x.match ? settings[x.match.set]?.options : null
      if (!x.other) {
        if (!options) out.push(`match ${print(x.match)} needs a _ case: its values are not a list of options`)
        else for (const o of options) if (!(String(o.value) in x.cases)) out.push(`match ${print(x.match)} has no case for ${o.value}`)
      }
      if (options) for (const key of Object.keys(x.cases)) if (!options.some((o) => String(o.value) === key)) out.push(`match ${print(x.match)}: ${key} is none of its options`)
    }
    return undefined
  }
  walk(t)
  return out
}

/**
 * The value of a tree. env: { ins: { input: value }, settings: { key: value }, run(name, args, named) → the value of
 * an engine resource }; a match with no case for its value throws `noCase(value)`.
 */
export function evaluate(t, env) {
  if ('in' in t) return env.ins[t.in]
  if ('set' in t) return env.settings[t.set]
  if ('num' in t) return t.num
  if ('str' in t) return t.str
  // if works out only the branch it takes (if(eq($b, 0), $a, over($a, $b)) never divides by 0).
  if (t.call === 'if' && t.args.length === 3) return evaluate(evaluate(t.args[0], env) ? t.args[1] : t.args[2], env)
  if ('match' in t) {
    const v = evaluate(t.match, env)
    const then = t.cases[String(v)] ?? t.other
    if (!then) throw env.noCase(v)
    return evaluate(then, env)
  }
  return env.run(t.call, t.args.map((a) => evaluate(a, env)), Object.fromEntries(Object.entries(t.named).map(([k, a]) => [k, evaluate(a, env)])))
}

/**
 * evaluate, numbering values on a tape (../tape.js): returns { v, id }. env as for evaluate, with `ids` (each input's
 * number on the tape, or none), `tape` and `leaf(name)` (whether a resource is a parameter: its value becomes a leaf
 * under `env.key`). A call whose arguments all lack numbers is worked out plainly and gets none; `if` and `match` pass
 * on the number of the branch they take.
 */
export function evaluateTaped(t, env) {
  if ('in' in t) return { v: env.ins[t.in], id: env.ids?.[t.in] ?? null }
  if ('set' in t || 'num' in t || 'str' in t) return { v: evaluate(t, env), id: null }
  if (t.call === 'if' && t.args.length === 3) return evaluateTaped(evaluate(t.args[0], env) ? t.args[1] : t.args[2], env)
  if ('match' in t) {
    const v = evaluate(t.match, env)
    const then = t.cases[String(v)] ?? t.other
    if (!then) throw env.noCase(v)
    return evaluateTaped(then, env)
  }
  const args = t.args.map((a) => evaluateTaped(a, env))
  const named = Object.fromEntries(Object.entries(t.named).map(([k, a]) => [k, evaluate(a, env)]))
  const values = args.map((a) => a.v)
  const v = env.run(t.call, values, named)
  if (env.leaf?.(t.call)) return { v, id: env.tape.leaf(env.key, v) }
  const ids = args.map((a) => a.id)
  if (!ids.some((id) => id !== null)) return { v, id: null }
  return { v, id: env.tape.record({ op: t.call, args: values, ids, named, out: v }) }
}
