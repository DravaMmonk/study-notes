import { cases, inOrder, property } from '../../engine/judge.js'
import { T, sideOf } from '../../shell/i18n.js'
import { difference, extent, structureOf } from './fol.js'
import { freeVars, parse } from './formula.js'
import { chipsOf, complete, straysOf } from './formulaTree.js'
import { sentenceLanguage, STRAY } from './sentenceLanguage.js'
import { thingName, worldDescription } from './worldValues.js'

function formulaReady(free) {
  return inOrder(
    property((tree) => !straysOf(tree).length, () => ({ why: STRAY })),
    property(complete, () => ({ why: T('还有空位：句子的每个位置都须填写。') })),
    (tree) => {
      const loose = [...freeVars(tree)].filter((v) => !free.includes(v))
      return loose.length ? { why: T(`${loose.join('、')} 不受 ∀ 或 ∃ 约束：它指的是什么？`, `${loose.join(', ')} is not bound by ∀ or ∃: what does it refer to?`) } : null
    },
  )
}

export function translation(level) {
  const { notation } = level
  const target = parse(level.target, { consts: level.vocab.names })
  const chips = chipsOf(level)
  const judge = inOrder(formulaReady([]), (tree) => {
    const counterexample = difference(tree, target)
    if (!counterexample) return null
    const { first, model } = counterexample
    return {
      want: !first,
      got: first,
      why: first ? T('在下面的世界中，你写的句子为真，原句却为假：') : T('在下面的世界中，原句为真，你写的句子却为假：'),
      lines: worldDescription(model, notation, level.vocab.preds, { spell: true }),
    }
  })
  return { judge, prompt: level.say, chips: () => chips, language: sentenceLanguage(notation, 'formula', []), passed: T('在每个小世界中，真假都与原句一致。') }
}


export function query(level) {
  const { notation, worlds } = level
  const target = parse(level.target, { consts: level.vocab.names })
  const chips = chipsOf(level)
  const judge = cases(worlds, (tree, world) => {
    const model = structureOf(world, [tree, target])
    const [got, want] = [extent(tree, model), extent(target, model)]
    const extra = got.filter((d) => !want.includes(d))
    const missing = want.filter((d) => !got.includes(d))
    if (!extra.length && !missing.length) return null
    const message = (lang) => {
      const name = thingName(notation, world, lang)
      const head = sideOf(world.title, lang) + sideOf(T('：'), lang)
      const picked = extra.map(name)
      const omitted = missing.map(name)
      if (lang === 'zh') return head + (picked.length ? `多选了 ${picked.join('、')}；` : '') + (omitted.length ? `漏掉了 ${omitted.join('、')}。` : '')
      return head + (picked.length ? `wrongly picks ${picked.join(', ')}; ` : '') + (omitted.length ? `misses ${omitted.join(', ')}.` : '')
    }
    return { want, got, why: T(message('zh'), message('en')), lines: [] }
  })
  return {
    judge: inOrder(formulaReady(['x']), judge),
    prompt: level.say,
    examples: worlds.map((world) => ({ title: world.title, lines: worldDescription(structureOf(world, [target]), notation, level.vocab.preds, { world }) })),
    chips: () => chips,
    language: sentenceLanguage(notation, 'formula', ['x']),
    passed: T('每一家都选对了。'),
  }
}
