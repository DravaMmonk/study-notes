import { T, sideOf } from '../../shell/i18n.js'
import { say } from './notation.js'
import { cases, inOrder, property } from '../../engine/judge.js'
import { builtWorld, claimIn, MAX_WORLD } from './fol.js'
import { atom, parse } from './formula.js'
import { fixedLine } from './sentenceLanguage.js'

const MARKS = ['①', '②', '③', '④']

/** What a thing is called: a named world's thing by its words, a built world's by its mark. */
export const thingName = (notation, world, lang) => (k) => world ? sideOf(notation.words?.[world.things[k]], lang) ?? world.things[k] : MARKS[k]

/** A world in words: how many things, and every atom true in it, as sentences. */
function describe(model, notation, preds, world, spell, lang) {
  const L = (value) => sideOf(value, lang)
  const tr = (zh, en) => L(T(zh, en))
  const name = thingName(notation, world, lang)
  const sayAtom = (p, args) => (notation.words?.[p] ? L(notation.words[p]) : `${p}({0})`).replace(/\{(\d)\}/g, (_, k) => name(args[Number(k)]))
  const atoms = preds.flatMap(([p, n]) => {
    const ext = model.preds[p]
    if (n === 0) return ext ? [L(say({ op: 'atom', pred: p, args: [] }, notation))] : []
    return [...(ext ?? [])].map((key) => sayAtom(p, key.split(',').map(Number)))
  })
  // A countermodel spells out what does not hold too: what is left out is easy to miss, and it is often the point.
  const tuples = (n) => (n === 0 ? [[]] : tuples(n - 1).flatMap((t) => model.domain.map((d) => [...t, d])))
  const missing = spell ? preds.filter(([p]) => p in model.preds).flatMap(([p, n]) => (n === 0
    ? (model.preds[p] ? [] : [L(say({ op: 'atom', pred: p, args: [] }, notation))])
    : tuples(n).filter((args) => !model.preds[p]?.has(args.join(','))).map((args) => sayAtom(p, args)))) : []
  // A named world's things are their own names: only other names need saying.
  const consts = Object.entries(model.fns).filter(([c, m]) => m.has('') && !world?.things.includes(c)).map(([c, m]) => `${L(notation.words?.[c] ?? T(c, c))} = ${name(m.get(''))}`)
  return [
    { text: tr(`这个世界有 ${model.domain.length} 样东西：`, `This world has ${model.domain.length} thing${model.domain.length === 1 ? '' : 's'}: `), strong: model.domain.map(name).join(tr('、')) },
    ...(consts.length ? [{ text: consts.join(tr('；')) }] : []),
    { text: atoms.length ? atoms.join(tr('；')) : tr('什么都不成立。') },
    ...(missing.length && atoms.length ? [{ text: tr('不成立：') + missing.join(tr('；')), muted: true }] : []),
  ]
}

export function worldDescription(model, notation, preds, { world = null, spell = false } = {}) {
  const zh = describe(model, notation, preds, world, spell, 'zh')
  const en = describe(model, notation, preds, world, spell, 'en')
  return zh.map(({ text, strong, muted }, k) => ({
    text: T(text, en[k].text),
    strong: strong === undefined ? null : T(strong, en[k].strong),
    muted,
  }))
}

const truth = (value) => value ? T('真', 'true') : T('假', 'false')
const isWorld = (work) => work !== null && typeof work === 'object' && !Array.isArray(work) && Number.isInteger(work.size) && work.size >= 1
const worldShape = inOrder(
  property(isWorld, () => ({ why: T('这不是一个世界。', 'This is not a world.') })),
  property((work) => work.size <= MAX_WORLD, () => ({ why: T('这个世界里的东西太多。', 'This world has too many things.') })),
)

export function worldCheck(level) {
  const { notation, vocab } = level
  const read = (value) => parse(value, { consts: vocab.names })
  const strip = (value, key) => fixedLine(read(value), notation, key)
  const words = (value) => say(read(value), notation)
  const reason = (row) => {
    if (level.meant) {
      const value = truth(row.value)
      return T(`在这个世界里，两份译文都为${value.zh}：真假一致。`, `In this world both translations are ${value.en}: they agree.`)
    }
    const sentence = words(row.f)
    return row.premise
      ? T(`前提「${sentence.zh}」在这个世界里不成立。`, `The premise “${sentence.en}” does not hold in this world.`)
      : T(`结论「${sentence.zh}」在这个世界里也成立，这个世界不是反例。`, `The goal “${sentence.en}” holds in this world too: it is no counterexample.`)
  }
  const judgeClaims = (world, { rows }) => cases(rows, (_, row) => row.right
    ? null
    : { want: !row.value, got: row.value, why: reason(row) })(world)
  const judge = inOrder(worldShape, (world) => judgeClaims(world, claimIn(level, world)))
  return {
    judge,
    initial: { size: Math.min(2, MAX_WORLD), preds: {}, consts: {} },
    prompt: level.say,
    run: (world) => {
      const malformed = worldShape(world)
      if (malformed) return { steps: [{ failed: malformed.why }], lines: [] }
      const found = claimIn(level, world)
      const fail = judgeClaims(world, found)
      const steps = found.rows.slice(0, fail ? fail.check + 1 : undefined).map((_, k) => k === fail?.check ? { failed: fail.why } : {})
      const lines = found.rows.map((row, k) => ({ strip: strip(row.f, `s${k}`), text: truth(row.value), right: row.right, step: k }))
      if (level.meant) lines.unshift({ strip: strip(level.meant, 'meant'), text: truth(found.meant), right: true, step: 0 })
      else lines[lines.length - 1].separator = true
      return { steps, lines }
    },
    fields: (world, change) => {
      const valid = !worldShape(world)
      const sizes = {
        key: 'size', name: T('东西的数目'), before: T('这个世界有'), after: T('样东西'),
        cells: Array.from({ length: MAX_WORLD }, (_, k) => ({
          key: k, on: valid && world.size === k + 1, text: k + 1,
          change: () => change(valid ? { ...world, size: k + 1 } : { size: k + 1, preds: {}, consts: {} }),
        })),
      }
      if (!valid) return [sizes]
      const model = builtWorld(world, vocab)
      const put = (key, value) => change({ ...world, [key]: value })
      const wordOf = (p, args) => {
        const fallback = `${p}(${args.join(', ')})`
        const describe = (lang) => (sideOf(notation.words?.[p], lang) ?? fallback).replace(/\{(\d)\}/g, (_, k) => args[Number(k)])
        return T(describe('zh'), describe('en'))
      }
      const relation = (p, ...args) => {
        const key = args.join(',')
        const on = model.preds[p].has(key)
        const old = world.preds[p] ?? []
        return {
          key, on, text: args.map((k) => MARKS[k]).join(''), title: args.length > 1 ? wordOf(p, args.map((k) => MARKS[k])) : null,
          change: () => put('preds', { ...world.preds, [p]: on ? old.filter((x) => x !== key) : [...old, key] }),
        }
      }
      return [
        sizes,
        ...vocab.consts.map((c) => {
          const name = notation.words?.[c] ?? T(c, c)
          return {
            key: `constant:${c}`, before: T(`${name.zh} =`, `${name.en ?? name.zh} =`),
            cells: model.domain.map((k) => ({ key: k, on: model.fns[c].get('') === k, text: MARKS[k], change: () => put('consts', { ...world.consts, [c]: k }) })),
          }
        }),
        ...vocab.preds.map(([p, arity]) => {
          if (arity === 0) return {
            key: `predicate:${p}`, cells: [{ key: p, on: model.preds[p], text: say(atom(p), notation), change: () => put('preds', { ...world.preds, [p]: !world.preds[p] }) }],
          }
          const before = wordOf(p, Array(arity).fill('…'))
          if (arity === 1) return { key: `predicate:${p}`, before, cells: model.domain.map((k) => relation(p, k)) }
          return { key: `predicate:${p}`, before, grid: model.domain.map((a) => model.domain.map((b) => relation(p, a, b))) }
        }),
      ]
    },
    go: T('运行'), done: T('找到反例'),
    passed: level.meant ? T('在这个世界里，译文和原意真假不同：这个世界是反例。') : T('前提都成立，结论不成立：这个世界是反例。'),
  }
}
