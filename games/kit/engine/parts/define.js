// A game's parts.json made into parts (games/DESIGN.md 6.8): what the shared engine runs (../circuit.js), what a new
// part starts with, and every place the file does not hold together. The part definitions are content; the engine
// resources they call (the domain's `op` items, run by its ops.js) are the domain's code.
//
//   defineParts(file, ops)       → { PARTS, defs, defaultsOf(type) }
//   partProblems(file, vocabulary) → [{ at, says }]
//   withParts(vocabulary, file)  the vocabulary with both code and file parts in its `part` kind (content's S.ref('part'))
//   evalSettings(text, def, params, ops)   a settings-only expression (a readout, a rule, a check) on a node's settings
//   applyRules(def, params, changed, ops)  a node's settings once the player changed one: the part's rules followed
//   failedCheck(def, params, ops)          what the first check its settings fail says, or null
//   partDesc(def, allowed)                 its description with the open options' abouts
// Every expression may call the kernel's builtins (builtins.js) besides the domain's resources. A resource sees the card
// it runs on (ctx.node, ctx.key: the region whose value it gives, if any) and can run one of its regions as a function
// (ctx.region(name), ../../circuit/frames.js runRegion).
import { PartError } from '../circuit.js'
import { runRegion } from '../../circuit/frames.js'
import { facesOf, holesOf, outletsOf, regionsOf, registerPieces, settingsOf } from '../pieces.js'
import { validate } from '../schema.js'
import { ExprError, evaluate, evaluateTaped, parse, problemsOf } from './expr.js'
import { ICON_NAMES } from './icons.js'
import { BUILTINS, BUILTIN_ITEMS } from './builtins.js'
import { FACES, PARTS_FILE } from './schema.js'

const ICONS = new Set(ICON_NAMES)
const OPTIONED = new Set(['select', 'buttons'])
// The settings whose value is a list of options, and those holding a tree as text (a sentence the domain's language reads).
const LISTED = new Set(['list'])
const NUMERIC = new Set(['number', 'slider'])

/** Whether a vocabulary's domain defines its parts as data: it gives engine resources. */
export const definesParts = (vocabulary) => Boolean(vocabulary?.kinds?.op)

/** A setting with its preset filled in (`use`), or null when the preset is not there. */
export function resolveSetting(setting, presets = {}) {
  if (!setting.use) return setting
  const preset = presets[setting.use]
  if (!preset) return null
  const { use: _, ...own } = setting
  return { ...preset, ...own }
}

/** The value a setting starts with. */
export function defaultOf(s) {
  if (s.default !== undefined) return s.default
  if (OPTIONED.has(s.control)) return s.options?.[0]?.value ?? null
  if (NUMERIC.has(s.control)) return Math.min(s.max ?? Infinity, Math.max(s.min ?? -Infinity, 0))
  if (s.control === 'toggle') return false
  if (LISTED.has(s.control)) return []
  if (s.control === 'tree') return ''
  return null
}

/** A setting's value as computing reads it: numbers for a number or a slider, true or false for a toggle. */
export function coerce(s, raw) {
  const v = raw === undefined || raw === null || raw === '' ? defaultOf(s) : raw
  if (NUMERIC.has(s.control)) return Number(v)
  if (s.control === 'toggle') return v === true || v === 'true'
  if (LISTED.has(s.control)) return Array.isArray(v) ? v.map(String) : []
  if (OPTIONED.has(s.control)) return v === null ? null : String(v)
  if (s.control === 'tree') return v === null ? '' : String(v)
  return v
}

/** One part of the file, resolved: its settings filled from the presets, keyed. */
function resolvePart(def, presets, type) {
  const settings = settingsOf(def).map((s) => resolveSetting(s, presets)).filter(Boolean)
  return { ...def, type, settings, setting: Object.fromEntries(settings.map((s) => [s.key, s])), outputNames: outletsOf(def).length ? outletsOf(def).map((o) => o.name) : null }
}

/** The trees a part computes with: one per output (null for an output whose text does not parse). */
function treesOf(def) {
  const read = (text) => {
    try {
      return parse(text)
    } catch {
      return null
    }
  }
  if (typeof def.compute === 'string') return { '': read(def.compute) }
  return Object.fromEntries(Object.entries(def.compute ?? {}).map(([k, text]) => [k, read(text)]))
}

/** The options a setting offers on a node: its own, or those its `from` works out of the card's inputs. */
export function optionsOf(s, def, { params = {}, ins = {}, ctx = {} } = {}, ops = {}) {
  if (!s.from) return s.options ?? []
  try {
    const got = evaluate(parse(s.from), { ins, settings: settingsFor(def, params), run: runner(ops, ctx), noCase })
    return Array.isArray(got) ? got : []
  } catch {
    return []
  }
}

const runner = (ops, ctx) => (name, args, named) => {
  const op = BUILTINS[name] ?? ops[name]
  if (!op) throw new PartError({ zh: `没有引擎资源 ${name}`, en: `no engine resource ${name}` })
  return op.run(args, named, ctx)
}
const noCase = (v) => new PartError({ zh: `没有为 ${v} 写出运算`, en: `nothing is computed for ${v}` })

/** A node's settings as computing reads them. */
export const settingsFor = (def, params = {}) => Object.fromEntries(settingsOf(def).map((s) => [s.key, coerce(s, params[s.key])]))

/**
 * The value of a settings-only expression (a readout, an action's new value, its `when`) on a node's settings, or
 * undefined when it cannot be worked out (a resource stopped, the text does not parse).
 */
export function evalSettings(text, def, params, ops) {
  try {
    return evaluate(parse(text), { ins: {}, settings: settingsFor(def, params), run: runner(ops, {}), noCase })
  } catch {
    return undefined
  }
}

/** Whether a setting shows on a node: its `when` holds (one that cannot be worked out does not). */
export const shows = (s, def, params, ops) => !s.when || Boolean(evalSettings(s.when, def, params, ops))

/**
 * A node's settings once the player set `changed` (null: an action set several): every rule on that setting (or on
 * any) whose `when` holds sets its settings, in order, each reading the settings as the rules before left them.
 */
export function applyRules(def, params, changed, ops) {
  let now = { ...params }
  for (const rule of def.rules ?? []) {
    if (rule.on && rule.on !== changed) continue
    if (rule.when && !evalSettings(rule.when, def, now, ops)) continue
    const next = { ...now }
    for (const [key, text] of Object.entries(rule.set)) {
      const v = evalSettings(text, def, now, ops)
      if (v !== undefined && key !== changed) next[key] = v
    }
    now = next
  }
  return now
}

/** What the first check a node's settings fail says, or null when they meet every one. */
export function failedCheck(def, params, ops) {
  return (def.checks ?? []).find((c) => !evalSettings(c.holds, def, params, ops))?.say ?? null
}

/**
 * The inputs whose order does not matter to a node of a part: its expression (the case its settings pick) is one call
 * of a resource declared symmetric (true, or { parameter: [values] } it is symmetric for), on inputs that all differ.
 */
function symmetricIn(tree, settings, ops) {
  let t = tree
  while (t && 'match' in t) t = t.cases[String('set' in t.match ? settings[t.match.set] : undefined)] ?? t.other
  if (!t || !('call' in t)) return []
  const declared = ops[t.call]?.symmetric
  const valueOf = (a) => (a && 'set' in a ? settings[a.set] : a?.num ?? a?.str)
  const holds = declared === true || (declared && typeof declared === 'object' && Object.entries(declared).every(([key, values]) => values.includes(valueOf(t.named[key]))))
  const ins = t.args.map((a) => a.in)
  return holds && ins.every((name) => name !== undefined) && new Set(ins).size === ins.length ? ins : []
}

/**
 * The file's parts for the engine: PARTS[type] = { inputs, outputs?, params, settings, defaults, eval }, `settings` the
 * values an option setting takes (a course may offer fewer), `defaults` a new node's settings. `ops`: the domain's
 * resources, { name: { run(args, named, ctx) } }.
 */
export function defineParts(file, ops, code = {}) {
  const presets = file?.presets ?? {}
  const defs = Object.fromEntries(Object.entries(file?.parts ?? {}).map(([type, def]) => [type, resolvePart(def, presets, type)]))
  const defined = Object.fromEntries(Object.entries(defs).map(([type, def]) => {
    const trees = treesOf(def)
    const names = holesOf(def).map((p) => p.name)
    // An optional input left unwired reads 「—」 (undefined) and never makes the part give 「—」 by itself.
    const optional = new Set(holesOf(def).filter((p) => p.optional).map((p) => p.name))
    // A part with regions is a frame (../../circuit/frames.js): an input for each region shown, what is made inside
    // it; an output for each region that opens, the value it opens with, read off the part's own inputs.
    const regions = regionsOf(def)
    const shown = (node) => regions.filter((r) => !r.when || evalSettings(r.when, def, node?.params ?? {}, ops))
    const framed = regions.length ? {
      inputs: (node) => [...names, ...shown(node).map((r) => r.name)],
      frames: (node) => shown(node).map((r) => ({ name: r.name, opens: Boolean(r.opens) })),
      outputs: (node) => [null, ...shown(node).filter((r) => r.opens).map((r) => r.name)],
      // A region that closes gives the part what was made inside it; one that does not is run by the part itself.
      reads: (node, key) => (key ? names : [...names, ...shown(node).filter((r) => r.closes).map((r) => r.name)]),
    } : null
    const part = {
      inputs: names,
      ...(def.outputNames || framed ? {} : { symmetric: (node) => symmetricIn(trees[''], settingsFor(def, node?.params), ops) }),
      ...(optional.size ? { optional: [...optional] } : {}),
      ...framed,
      params: settingsOf(def).map((s) => s.key),
      defaults: Object.fromEntries(settingsOf(def).map((s) => [s.key, defaultOf(s)])),
      settings: Object.fromEntries(settingsOf(def).filter((s) => OPTIONED.has(s.control) && s.options).map((s) => [s.key, s.options.map((o) => o.value)])),
      eval: (ins, node, ctx, key) => {
        const failed = failedCheck(def, node?.params ?? {}, ops)
        if (failed) throw new PartError(failed)
        const read = framed ? framed.reads(node, key) : names
        if (def.nulls !== 'pass' && read.some((n) => ins[n] === null || (ins[n] === undefined && !optional.has(n)))) return null
        const tree = trees[def.outputNames ? key : '']
        if (!tree) throw new PartError({ zh: '这个元件的运算写错了', en: 'this part’s computation does not parse' })
        const card = { ...ctx, node, key, region: (name) => runRegion(node, ctx, name) }
        const env = { ins, settings: settingsFor(def, node?.params), run: runner(ops, card), noCase }
        if (!ctx?.tape) return evaluate(tree, env)
        // A run that trains: number the values on the tape (../tape.js); a parameter resource makes this card a leaf.
        const tape = ctx.tape
        const { v, id } = evaluateTaped(tree, { ...env, tape, ids: { ...tape.ins }, key: tape.node, leaf: (name, named) => (typeof ops[name]?.leaf === 'function' ? ops[name].leaf(named) : Boolean(ops[name]?.leaf)) })
        tape.last = id
        return v
      },
    }
    if (def.outputNames) part.outputs = () => def.outputNames
    return [type, part]
  }))
  const PARTS = registerPieces(code, defined)
  return {
    PARTS,
    defs,
    /** A new node's settings. */
    defaultsOf: (type) => ({ ...(PARTS[type]?.defaults ?? {}) }),
  }
}

/**
 * A part's description as far as its options are open: `desc`, then the `about` of every option `allowed(key)` lets
 * through (a list of values; null or undefined: every option), each side of the text joined on its own.
 */
export function partDesc(def, allowed = () => null) {
  const extra = settingsOf(def).flatMap((s) => {
    const open = allowed(s.key)
    return (s.options ?? []).filter((o) => o.about && (!open || open.includes(o.value))).map((o) => o.about)
  })
  if (!extra.length) return def.desc
  const side = (lang) => [def.desc, ...extra].map((t) => (typeof t === 'string' ? t : t?.[lang] ?? '')).filter(Boolean).join(lang === 'zh' ? '' : ' ')
  return side('en') ? { zh: side('zh'), en: side('en') } : { zh: side('zh') }
}

/** The vocabulary with a parts.json's parts as its `part` kind: what content's S.ref('part') names. */
export function withParts(vocabulary, file) {
  if (!definesParts(vocabulary)) return vocabulary
  const part = Object.fromEntries(Object.entries(file?.parts ?? {}).map(([type, def]) => [type, { about: def.desc ?? def.name ?? type }]))
  return { ...vocabulary, kinds: { ...vocabulary.kinds, part: registerPieces(vocabulary.kinds.part, part) } }
}

/** Every place a parts.json does not hold together, as [{ at, says }] (at: parts.json and the path in it). */
export function partProblems(file, vocabulary) {
  const out = []
  const say = (at, says) => out.push({ at: `parts.json${at}`, says })
  const vocab = withParts(vocabulary, file)
  for (const p of validate(PARTS_FILE, file, { vocabulary: vocab })) say(p.at === '(root)' ? '' : p.at, p.says)
  if (out.length) return out
  const ops = { ...BUILTIN_ITEMS, ...vocabulary.kinds.op }
  for (const name of Object.keys(vocabulary.kinds.op)) if (BUILTINS[name]) say('', `the domain’s resource ${name} takes the name of a kernel builtin`)
  const fits = (schema, v) => validate(schema, v, { vocabulary: vocab }).length === 0
  const presets = file.presets ?? {}
  const settingProblems = (s, at) => {
    if ((OPTIONED.has(s.control) || LISTED.has(s.control)) && !s.options === !s.from) say(at, 'a setting with options gives them, or works them out (from), not both')
    if (OPTIONED.has(s.control) && s.options) {
      const values = s.options.map((o) => String(o.value))
      if (new Set(values).size !== values.length) say(`${at}.options`, 'an option value is written twice')
      if (s.default !== undefined && !values.includes(String(s.default))) say(`${at}.default`, `${JSON.stringify(s.default)} is none of its options`)
      if (s.control === 'buttons' && s.layout === 'pad' && values.some((v) => !['up', 'left', 'right', 'down'].includes(v))) say(`${at}.options`, 'a pad’s options are up, left, right and down')
      for (const [k, o] of s.options.entries()) if (o.icon && !ICONS.has(o.icon)) say(`${at}.options[${k}].icon`, `${o.icon} is no icon of the kernel’s table`)
    }
    if (NUMERIC.has(s.control)) {
      if (s.min !== undefined && s.max !== undefined && s.min > s.max) say(at, `min ${s.min} is above max ${s.max}`)
      const d = s.default
      if (d !== undefined && (typeof d !== 'number' || (s.min !== undefined && d < s.min) || (s.max !== undefined && d > s.max) || (s.integer && !Number.isInteger(d)))) say(`${at}.default`, `${JSON.stringify(d)} is not a number in its range`)
    }
    if (s.control === 'toggle' && s.default !== undefined && typeof s.default !== 'boolean') say(`${at}.default`, 'a toggle starts true or false')
    if (s.control === 'custom') {
      const w = vocabulary.kinds.widget?.[s.widget]
      if (w && (w.params ? !fits(w.params, s.params) : s.params !== undefined)) say(`${at}.params`, w.params ? `the parameters do not fit the widget ${s.widget}` : `the widget ${s.widget} takes no parameters`)
    }
  }
  for (const [name, s] of Object.entries(presets)) settingProblems(s, `.presets.${name}`)
  for (const [type, raw] of Object.entries(file.parts)) {
    const at = `.parts.${type}`
    if (!ICONS.has(raw.icon)) say(`${at}.icon`, `${raw.icon} is no icon of the kernel’s table`)
    const keys = settingsOf(raw).map((s) => s.key)
    if (new Set(keys).size !== keys.length) say(`${at}.settings`, 'a setting key is written twice')
    if (new Set(holesOf(raw).map((p) => p.name)).size !== holesOf(raw).length) say(`${at}.inputs`, 'an input is named twice')
    if (new Set(outletsOf(raw).map((p) => p.name)).size !== outletsOf(raw).length) say(`${at}.outputs`, 'an output is named twice')
    for (const [k, s] of settingsOf(raw).entries()) {
      if (s.use && !presets[s.use]) { say(`${at}.settings[${k}].use`, `${s.use} is no preset of parts.json`); continue }
      settingProblems(resolveSetting(s, presets), `${at}.settings[${k}]`)
    }
    const def = resolvePart(raw, presets, type)
    const check = (text, where, inputs) => {
      let tree
      try {
        tree = parse(text)
      } catch (error) {
        if (error instanceof ExprError) return say(where, `column ${error.at + 1}: ${error.message}`)
        throw error
      }
      for (const says of problemsOf(tree, { ops, inputs, settings: def.setting, fits })) say(where, says)
      return undefined
    }
    for (const [k, s] of settingsOf(def).entries()) if (s.when) check(s.when, `${at}.settings[${k}].when`, [])
    for (const [k, s] of settingsOf(def).entries()) if (s.from) check(s.from, `${at}.settings[${k}].from`, holesOf(def).map((p) => p.name))
    const regionNames = regionsOf(raw).map((r) => r.name)
    if (new Set([...holesOf(raw).map((p) => p.name), ...regionNames]).size !== holesOf(raw).length + regionNames.length) say(`${at}.regions`, 'a region is named twice, or like an input')
    if (regionNames.length && outletsOf(raw).length) say(`${at}.outputs`, 'a part with regions has one output of its own')
    for (const [k, r] of regionsOf(raw).entries()) if (r.when) check(r.when, `${at}.regions[${k}].when`, [])
    for (const [k, rule] of (raw.rules ?? []).entries()) {
      if (rule.on && !def.setting[rule.on]) say(`${at}.rules[${k}].on`, `${rule.on} is no setting of the part`)
      if (rule.when) check(rule.when, `${at}.rules[${k}].when`, [])
      for (const [key, text] of Object.entries(rule.set)) {
        if (!def.setting[key]) say(`${at}.rules[${k}].set.${key}`, `${key} is no setting of the part`)
        check(text, `${at}.rules[${k}].set.${key}`, [])
      }
    }
    for (const [k, c] of (raw.checks ?? []).entries()) check(c.holds, `${at}.checks[${k}].holds`, [])
    // What it computes: an expression for its one output, or one for each of its outputs.
    const outputs = def.outputNames
    const exprs = typeof raw.compute === 'string' ? [['', raw.compute]] : Object.entries(raw.compute)
    if (!outputs && typeof raw.compute !== 'string') say(`${at}.compute`, 'a part with one output computes one expression')
    if (outputs && typeof raw.compute === 'string') say(`${at}.compute`, `a part with outputs computes one expression each: { ${outputs.join(', ')} }`)
    if (outputs && typeof raw.compute !== 'string') {
      for (const o of outputs) if (!(o in raw.compute)) say(`${at}.compute`, `nothing computes the output ${o}`)
      for (const o of Object.keys(raw.compute)) if (!outputs.includes(o)) say(`${at}.compute.${o}`, `${o} is no output of the part`)
    }
    for (const [o, text] of exprs) check(text, `${at}.compute${o ? `.${o}` : ''}`, holesOf(def).map((p) => p.name))
    // The views: what each block names is there.
    for (const face of FACES) {
      const blocks = facesOf(raw)[face] ?? []
      const walk = (list, where) => list.forEach((b, k) => {
        const here = `${where}[${k}]`
        if (b.show === 'row') return walk(b.blocks, `${here}.blocks`)
        if (b.show === 'setting' && !def.setting[b.key]) say(`${here}.key`, `${b.key} is no setting of the part`)
        if (b.show === 'settings') for (const key of b.keys ?? []) if (!def.setting[key]) say(`${here}.keys`, `${key} is no setting of the part`)
        if (b.show === 'value' && b.output && !outputs?.includes(b.output)) say(`${here}.output`, `${b.output} is no output of the part`)
        if (b.show === 'summary' && b.text) for (const side of typeof b.text === 'string' ? [b.text] : [b.text.zh, b.text.en].filter(Boolean)) for (const [, key] of side.matchAll(/\{([^}]*)\}/g)) if (!def.setting[key]) say(`${here}.text`, `{${key}} is no setting of the part`)
        if (b.show === 'readout') check(b.expr, `${here}.expr`, [])
        if (b.show === 'action') {
          for (const [key, text] of Object.entries(b.set)) {
            if (!def.setting[key]) say(`${here}.set.${key}`, `${key} is no setting of the part`)
            check(text, `${here}.set.${key}`, [])
          }
          if (b.when) check(b.when, `${here}.when`, [])
        }
        if (b.show === 'widget') {
          const w = vocabulary.kinds.widget?.[b.widget]
          if (w && (w.params ? !fits(w.params, b.params) : b.params !== undefined)) say(`${here}.params`, w.params ? `the parameters do not fit the widget ${b.widget}` : `the widget ${b.widget} takes no parameters`)
        }
        return undefined
      })
      walk(blocks, `${at}.views.${face}`)
    }
  }
  return out
}
