import { T, sideOf } from '../../shell/i18n.js'
import { say } from './notation.js'

export const MARKS = ['①', '②', '③', '④']

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
