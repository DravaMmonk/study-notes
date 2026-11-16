// A game's pieces/<name>.json made into parts (games/DESIGN.md 6.8): what the shared engine runs (../circuit.js), what a new
// part starts with, and every place the file does not hold together. The part definitions are content; the engine
// resources they call (the domain's `op` items, run by its ops.js) are the domain's code.
//
//   defineParts(file, ops)       → { PARTS, defs, defaultsOf(type) }   of its circuit primitives; a built piece (an
//                                inside, no compute) is the course's to make (../board-works.js, ../pieces.js builtPieces)
//   partProblems(file, vocabulary, { tasks? }) → [{ at, says }]   tasks: the game's task ids (a reference to none fails)
//   withParts(vocabulary, file)  the vocabulary with both code and file pieces in its `part` kind (content's S.ref('part'))
//   evalSettings(text, def, params, ops)   a settings-only expression (a readout, a rule, a check) on a node's settings
//   applyRules(def, params, changed, ops)  a node's settings once the player changed one: the part's rules followed
//   failedCheck(def, params, ops)          what the first check its settings fail says, or null
//   partDesc(def, allowed)                 its description with the open options' abouts
// Every expression may call the kernel's builtins (builtins.js) besides the domain's resources. A resource sees the card
// it runs on (ctx.node, ctx.ins its inputs, ctx.key the region whose value it gives, if any) and can run one of its regions as a function
// (ctx.region(name), ../../circuit/frames.js runRegion).
import { sideOf } from '../../shell/i18n.js'
import { PartError } from '../circuit.js'
import { runRegion } from '../../circuit/frames.js'
import { editorOf, facesOf, holesOf, insideOf, keepsOf, outletsOf, regionsOf, registerPieces, resolveSettings, settingsOf } from '../pieces.js'
import { validate } from '../schema.js'
import { ExprError, evaluate, evaluateTaped, parse, problemsOf } from './expr.js'
import { ICON_NAMES } from './icons.js'
import { BUILTINS, BUILTIN_ITEMS } from './builtins.js'
import { FACES, PARTS_FILE, SETTING, piecePath } from './schema.js'
import { registeredOperations, registeredValueTypes } from '../capabilities.js'
import { typeProblems } from './types.js'
import { settingParameters } from './settings.js'

const ICONS = new Set(ICON_NAMES)
const OPTIONED = new Set(['select', 'buttons'])
// The settings whose value is a list of options, and those holding a tree as text (a sentence the domain's language reads).
const LISTED = new Set(['list'])
const NUMERIC = new Set(['number', 'slider'])
// A primitive of the circuit editor: it computes, or keeps an input.
const circuitPrimitive = (piece) => editorOf(piece) === 'circuit' && !insideOf(piece)

/** Whether a vocabulary's domain defines its parts as data: it gives engine resources. */
export const definesParts = (vocabulary) => Boolean(vocabulary?.kinds?.op)

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
  const unset = raw === undefined || raw === null || raw === ''
  // An optional number left unset reads 「—」; a new card still starts from its default (defaultOf).
  if (unset && s.optional && NUMERIC.has(s.control)) return null
  const v = unset ? defaultOf(s) : raw
  if (NUMERIC.has(s.control)) return v === null ? null : Number(v)
  if (s.control === 'toggle') return v === true || v === 'true'
  if (LISTED.has(s.control)) return Array.isArray(v) ? v.map(String) : []
  if (OPTIONED.has(s.control)) return v === null ? null : String(v)
  if (s.control === 'tree') return v === null ? '' : String(v)
  return v
}

/** A part prepared for the circuit, with its resolved settings indexed by key. */
function indexPart(def, type) {
  const settings = settingsOf(def)
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
  const op = BUILTINS[name] ?? ops[name] ?? registeredOperations[name]
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

/** The regions the current settings expose, for the engine and the editor. */
export const activeRegions = (def, node, ops) => regionsOf(def).filter((region) => shows(region, def, node?.params ?? {}, ops))

/**
 * A node's settings once the player set `changed` (null: an action set several): every rule on that setting (or on
 * any) whose `when` holds sets its settings, in order, each reading the settings as the rules before left them.
 */
export function applyRules(def, params, changed, ops, fixed = () => false) {
  let now = { ...params }
  for (const rule of def.rules ?? []) {
    if (rule.on && rule.on !== changed) continue
    if (rule.when && !evalSettings(rule.when, def, now, ops)) continue
    const next = { ...now }
    for (const [key, text] of Object.entries(rule.set)) {
      if (key === changed || fixed(key)) continue
      const v = evalSettings(text, def, now, ops)
      if (v !== undefined) next[key] = v
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
  const parts = Object.fromEntries(Object.entries(file?.parts ?? {}).map(([type, def]) => [type, { ...def, settings: settingsOf(def, ops) }]))
  return compileParts(parts, ops, code)
}

/** The ports of a defined part, including the regions its current settings open. */
export function definitionPorts(def, ops) {
  const kept = keepsOf(def)
  if (kept) return { inputs: [kept.input] }
  const names = holesOf(def).map((port) => port.name)
  const outputs = outletsOf(def).map((port) => port.name)
  if (!regionsOf(def).length) return { inputs: names, ...(outputs.length && { outputs: () => outputs }) }
  const shown = (node) => activeRegions(def, node, ops)
  return {
    inputs: (node) => [...names, ...shown(node).map((region) => region.name)],
    frames: (node) => shown(node).map((region) => ({ name: region.name, opens: Boolean(region.opens) })),
    outputs: outputs.length ? () => outputs : (node) => [null, ...shown(node).filter((region) => region.opens).map((region) => region.name)],
    // A region that closes gives the part what was made inside it. A region's own output only reads ordinary inputs.
    reads: (node, key) => key ? names : [...names, ...shown(node).filter((region) => region.closes).map((region) => region.name)],
  }
}

/** Compile circuit definitions already carrying resolved settings, including parts generated in code. */
export function compileParts(parts, ops, code = {}) {
  ops = { ...registeredOperations, ...ops }
  const defs = Object.fromEntries(Object.entries(parts).filter(([, def]) => circuitPrimitive(def)).map(([type, def]) => [type, indexPart(def, type)]))
  const defined = Object.fromEntries(Object.entries(defs).map(([type, def]) => {
    const trees = treesOf(def)
    const ports = {
      ...definitionPorts(def, ops),
      inputTypes: Object.fromEntries(holesOf(def).map((port) => [port.name, port.type])),
      outputType: def.outputType,
      outputTypes: Object.fromEntries(outletsOf(def).map((port) => [port.name, port.type])),
    }
    // An optional input left unwired reads 「—」 (undefined) and never makes the part give 「—」 by itself.
    const optional = new Set(holesOf(def).filter((p) => p.optional).map((p) => p.name))
    // A part that keeps an input is a sink storing it in the register its setting names (../ticks.js).
    const kept = keepsOf(def)
    if (kept) {
      const setting = def.setting[kept.register]
      return [type, {
        ...ports, sink: true, store: true, collect: (ins) => ins[kept.input], eval: () => undefined, register: (node) => coerce(setting, node?.params?.[kept.register]),
        params: settingsOf(def).map((s) => s.key), defaults: Object.fromEntries(settingsOf(def).map((s) => [s.key, defaultOf(s)])),
        settings: Object.fromEntries(settingsOf(def).filter((s) => OPTIONED.has(s.control) && s.options).map((s) => [s.key, s.options.map((o) => o.value)])),
      }]
    }
    const part = {
      ...ports,
      ...(ports.outputs ? {} : { symmetric: (node) => symmetricIn(trees[''], settingsFor(def, node?.params), ops) }),
      ...(optional.size ? { optional: [...optional] } : {}),
      // A part registered by a course may run with none of its inputs, all optional, wired (`bare`).
      ...(def.bare ? { bare: true } : {}),
      params: settingsOf(def).map((s) => s.key),
      defaults: Object.fromEntries(settingsOf(def).map((s) => [s.key, defaultOf(s)])),
      settings: Object.fromEntries(settingsOf(def).filter((s) => OPTIONED.has(s.control) && s.options).map((s) => [s.key, s.options.map((o) => o.value)])),
      eval: (ins, node, ctx, key) => {
        const failed = failedCheck(def, node?.params ?? {}, ops)
        if (failed) throw new PartError(failed)
        const read = ports.reads ? ports.reads(node, key) : ports.inputs
        if (def.nulls !== 'pass' && read.some((n) => ins[n] === null || (ins[n] === undefined && !optional.has(n)))) return null
        const tree = trees[def.outputNames ? key : '']
        if (!tree) throw new PartError({ zh: '这个元件的运算写错了', en: 'this part’s computation does not parse' })
        const card = { ...ctx, node, key, ins, region: (name) => runRegion(node, ctx, name) }
        const env = { ins, settings: settingsFor(def, node?.params), run: runner(ops, card), noCase }
        if (!ctx?.tape) return evaluate(tree, env)
        // A run that trains: number the values on the tape (../tape.js); a parameter resource makes this card a leaf.
        const tape = ctx.tape
        const { v, id } = evaluateTaped(tree, { ...env, tape, ids: { ...tape.ins }, key: tape.node, leaf: (name, named) => (typeof ops[name]?.leaf === 'function' ? ops[name].leaf(named) : Boolean(ops[name]?.leaf)) })
        tape.last = id
        return v
      },
    }
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
  const texts = [def.desc, ...extra]
  const langs = ['en', 'zh'].filter((lang) => texts.some((text) => text?.[lang]))
  return Object.fromEntries((langs.length ? langs : ['en']).map((lang) => [lang, texts.map((text) => sideOf(text, lang)).filter(Boolean).join(lang === 'zh' ? '' : ' ')]))
}

/** The vocabulary with a pieces/<name>.json's pieces as its `part` kind: what content's S.ref('part') names. */
export function withParts(vocabulary, file) {
  // A domain with its circuit primitives in code has only its other pieces in pieces/<name>.json.
  const pieces = Object.fromEntries(Object.entries(file?.parts ?? {}).filter(([, piece]) => definesParts(vocabulary) || !circuitPrimitive(piece)))
  if (!file) return vocabulary
  const part = Object.fromEntries(Object.entries(pieces).map(([type, def]) => [type, { about: def.desc ?? def.name ?? type }]))
  return { ...vocabulary, kinds: { ...vocabulary.kinds, valueType: { ...registeredValueTypes, ...vocabulary.kinds.valueType }, part: registerPieces(vocabulary.kinds.part, part) } }
}

/** Every place a pieces/<name>.json does not hold together, as [{ at, says }] (at: pieces/<name>.json and the path in it). */
export function partProblems(file, vocabulary, { tasks = null } = {}) {
  const out = []
  const say = (at, says) => out.push({ at: piecePath(at), says })
  const vocab = withParts(vocabulary, file)
  // A domain with its circuit primitives in code keeps none here.
  if (!definesParts(vocabulary)) for (const [type, raw] of Object.entries(file?.parts ?? {})) if (circuitPrimitive(raw)) say(`.parts.${type}`, `the ${vocabulary.domain} domain defines its circuit primitives in code: pieces.json holds none (a piece computing)`)
  for (const p of validate(PARTS_FILE, file, { vocabulary: vocab, tasks })) say(p.at === '(root)' ? '' : p.at, p.says)
  if (out.length) return out
  if (vocabulary.capabilities || vocabulary.kinds.valueType) out.push(...typeProblems(file, vocabulary))
  const ops = { ...BUILTIN_ITEMS, ...vocabulary.kinds.op }
  const fits = (schema, v) => validate(schema, v, { vocabulary: vocab }).length === 0
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
      if (d !== undefined && d !== null && (typeof d !== 'number' || (s.min !== undefined && d < s.min) || (s.max !== undefined && d > s.max) || (s.integer && !Number.isInteger(d)))) say(`${at}.default`, `${JSON.stringify(d)} is not a number in its range`)
    }
    if (s.control === 'toggle' && s.default !== undefined && typeof s.default !== 'boolean') say(`${at}.default`, 'a toggle starts true or false')
    if (s.control === 'custom') {
      const w = vocabulary.kinds.widget?.[s.widget]
      if (w && (w.params ? !fits(w.params, s.params) : s.params !== undefined)) say(`${at}.params`, w.params ? `the parameters do not fit the widget ${s.widget}` : `the widget ${s.widget} takes no parameters`)
    }
  }
  for (const [type, raw] of Object.entries(file.parts)) {
    const at = `.parts.${type}`
    const parameters = settingParameters(raw, vocabulary.kinds.op)
    const resolved = resolveSettings(raw, vocabulary.kinds.op)
    for (const setting of resolved) {
      const where = `${at}.settings.${setting.key}`
      const { key: _key, ...definition } = setting
      if (!setting.control) say(where, 'a standalone setting needs a complete control definition')
      for (const problem of validate(SETTING, definition, { vocabulary: vocab })) say(`${where}${problem.at === '(root)' ? '' : problem.at}`, problem.says)
      settingProblems(setting, where)
      for (const schema of parameters.get(setting.key) ?? []) {
        if (setting.default !== undefined && !fits(schema, setting.default)) say(`${where}.default`, 'the default does not fit the operation parameter')
        if (schema.min !== undefined && (setting.min === undefined || setting.min < schema.min)) say(`${where}.min`, 'a setting cannot widen its operation parameter range')
        if (schema.max !== undefined && (setting.max === undefined || setting.max > schema.max)) say(`${where}.max`, 'a setting cannot widen its operation parameter range')
        if (schema.type === 'int' && !setting.integer) say(where, 'an integer parameter needs an integer setting')
        if (schema.type === 'oneOf') {
          for (const option of setting.options ?? []) if (!fits(schema, option.value)) say(`${where}.options`, `${option.value} is not an option of the operation parameter`)
          for (const value of raw.settings[setting.key].remove ?? []) if (!schema.values.some((option) => String(option) === value)) say(`${where}.remove`, `${value} is not an option of the operation parameter`)
        }
      }
    }
    const built = Boolean(insideOf(raw))
    if ((!built || raw.icon) && !ICONS.has(raw.icon)) say(`${at}.icon`, `${raw.icon} is no icon of the kernel’s table`)
    // The rest is the circuit editor's: a strip's block has no faces beyond what it marks, which the schema checks.
    if (editorOf(raw) !== 'circuit') continue
    const keys = settingsOf(raw).map((s) => s.key)
    if (new Set(keys).size !== keys.length) say(`${at}.settings`, 'a setting key is written twice')
    if (new Set(holesOf(raw).map((p) => p.name)).size !== holesOf(raw).length) say(`${at}.inputs`, 'an input is named twice')
    if (new Set(outletsOf(raw).map((p) => p.name)).size !== outletsOf(raw).length) say(`${at}.outputs`, 'an output is named twice')
    const def = indexPart({ ...raw, settings: resolveSettings(raw, vocabulary.kinds.op) }, type)
    const check = (text, where, inputs) => {
      let tree
      try {
        tree = parse(text)
      } catch (error) {
        if (error instanceof ExprError) return say(where, `column ${error.at + 1}: ${error.message}`)
        throw error
      }
      for (const says of problemsOf(tree, { ops, inputs, inputTypes: Object.fromEntries(holesOf(def).map((port) => [port.name, port.type])), settings: def.setting, fits })) say(where, says)
      return undefined
    }
    for (const s of settingsOf(def)) if (s.when) check(s.when, `${at}.settings.${s.key}.when`, [])
    for (const s of settingsOf(def)) if (s.from) check(s.from, `${at}.settings.${s.key}.from`, holesOf(def).map((p) => p.name))
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
    // What it computes: an expression for its one output, or one for each of its outputs; a built piece runs its inside.
    const outputs = def.outputNames
    if (!built && Boolean(raw.compute) === Boolean(raw.keeps)) say(at, 'a primitive computes (compute) or keeps an input (keeps), one of the two')
    if (raw.keeps) {
      if (!holesOf(raw).some((p) => p.name === raw.keeps.input)) say(`${at}.keeps.input`, `${raw.keeps.input} is no input of the part`)
      if (!def.setting[raw.keeps.register]) say(`${at}.keeps.register`, `${raw.keeps.register} is no setting of the part`)
    }
    if (!built && raw.compute) {
      const exprs = typeof raw.compute === 'string' ? [['', raw.compute]] : Object.entries(raw.compute)
      if (!outputs && typeof raw.compute !== 'string') say(`${at}.compute`, 'a part with one output computes one expression')
      if (outputs && typeof raw.compute === 'string') say(`${at}.compute`, `a part with outputs computes one expression each: { ${outputs.join(', ')} }`)
      if (outputs && typeof raw.compute !== 'string') {
        for (const o of outputs) if (!(o in raw.compute)) say(`${at}.compute`, `nothing computes the output ${o}`)
        for (const o of Object.keys(raw.compute)) if (!outputs.includes(o)) say(`${at}.compute.${o}`, `${o} is no output of the part`)
      }
      for (const [o, text] of exprs) check(text, `${at}.compute${o ? `.${o}` : ''}`, [...holesOf(def).map((p) => p.name), ...regionNames])
    }
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
