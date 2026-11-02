// How a choice task is judged (games/DESIGN.md 6.8): a judge is a vocabulary item that works out from the round's own
// data which options answer each item, so content states facts (what an output gives, what a scene holds, what a test
// varies) and never a key the author could get wrong. A round is { items, options, scenes?, reference?, scene? }; the
// player's answer is a list of option ids per item.
//
//   judge.check(round, picks, params) → [{ item, why }]   what is wrong, by item (empty: the round is answered)
//   judge.reference(round, params) → picks                 an answer that passes, for the checks and blind play
//   judge.multi                                            whether an item may take several options
//
// The claims judge reads scenes (scene.js): a claim is a vocabulary item too, true or false of a scene's facts; over
// the round's candidate scenes it is supported (true in every one), contradicted (false in every one) or undetermined.
import { S } from '../../engine/schema.js'
import { differences, factsOf } from './scene.js'
import { project } from './benches/pinhole.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params, more = {}) => ({ about, ...(params ? { params } : {}), ...more })
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
const ids = (options) => options.map((o) => o.id)
const nth = (k) => t(`第 ${k + 1} 题`, `Item ${k + 1}`)

/* ---------- claims about a scene ---------- */

const factOf = (facts, id) => facts.find((f) => f.id === id) ?? null
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol

export const CLAIMS = {
  exists: item(t('有某类物体', 'an object of a class is there'), S.obj({ class: S.str() }), { test: (facts, p) => facts.some((f) => f.class === p.class) }),
  count: item(t('某类物体正好有 n 个', 'exactly n objects of a class'), S.obj({ class: S.str(), n: S.int({ min: 0 }) }), { test: (facts, p) => facts.filter((f) => f.class === p.class).length === p.n }),
  visible: item(t('某个物体在画面里看得见', 'an object shows in the picture'), S.obj({ object: S.str() }), { test: (facts, p) => Boolean(factOf(facts, p.object)?.visible) }),
  colour: item(t('某个物体是某种颜色', 'an object is of a colour'), S.obj({ object: S.str(), is: S.ref('colour') }), { test: (facts, p) => factOf(facts, p.object)?.colour === p.is }),
  class: item(t('某个物体属于某一类', 'an object is of a class'), S.obj({ object: S.str(), is: S.str() }), { test: (facts, p) => factOf(facts, p.object)?.class === p.is }),
  depth: item(t('某个物体离相机（沿光轴）这么远', 'an object is this far from the camera (along its axis)'), S.obj({ object: S.str(), z: S.num(), tol: S.opt(S.num()) }), { test: (facts, p) => factOf(facts, p.object) !== null && near(factOf(facts, p.object).depth, p.z, p.tol) }),
  height: item(t('某个物体这么高', 'an object is this tall'), S.obj({ object: S.str(), h: S.num(), tol: S.opt(S.num()) }), { test: (facts, p) => factOf(facts, p.object) !== null && near(factOf(facts, p.object).height, p.h, p.tol) }),
}

const callOf = (v) => (typeof v === 'string' ? [v, {}] : Object.entries(v)[0])

/** A claim over every scene: 'supported', 'contradicted' or 'undetermined', with each scene's truth. */
export function verdictOf(claim, scenes) {
  const [name, params] = callOf(claim)
  const truths = scenes.map((scene) => CLAIMS[name].test(factsOf(scene), params))
  return { verdict: truths.every(Boolean) ? 'supported' : truths.some(Boolean) ? 'undetermined' : 'contradicted', truths }
}

/** The options of a claims round when content gives none. */
export const VERDICTS = [
  { id: 'supported', label: t('成立', 'Supported') },
  { id: 'contradicted', label: t('不成立', 'Contradicted') },
  { id: 'undetermined', label: t('无法确定', 'Undetermined') },
]

/* ---------- the judges ---------- */

/** A judge whose items each have a set of right options: `need` 'all' (exactly these) or 'some' (any of them). */
const bySets = (allowed, need, multi) => ({
  multi,
  check(round, picks, params) {
    return round.items.flatMap((it, k) => {
      const ok = allowed(round, it, params)
      const got = picks[k] ?? []
      const fine = need === 'all' ? sameSet(got, ok) : got.length > 0 && got.every((p) => ok.includes(p))
      return fine ? [] : [{ item: k, why: whyOf(round, it, k, got, ok, need) }]
    })
  },
  reference: (round, params) => round.items.map((it) => {
    const ok = allowed(round, it, params)
    return need === 'all' ? ok : ok.slice(0, 1)
  }),
})

const label = (round, id) => round.options.find((o) => o.id === id)?.label ?? t(id, id)
const list = (round, picks, lang) => picks.map((p) => label(round, p)[lang] ?? label(round, p)).join(lang === 'zh' ? '、' : ', ') || (lang === 'zh' ? '什么也没选' : 'nothing')
function whyOf(round, it, k, got, ok, need) {
  const n = nth(k)
  if (!got.length) return t(`${n.zh}还没有选`, `${n.en}: nothing chosen yet`)
  const extra = got.filter((p) => !ok.includes(p))
  if (extra.length) return t(`${n.zh}：「${list(round, extra, 'zh')}」不对`, `${n.en}: “${list(round, extra, 'en')}” does not answer it`)
  if (need === 'all') return t(`${n.zh}：还少了几项`, `${n.en}: something is still missing`)
  return t(`${n.zh}不对`, `${n.en} is not right`)
}

const factorList = S.list(S.ref('factor'))
const fieldsOf = (o) => o.gives ?? []

export const JUDGES = {
  answer: item(t('每题写明的答案（items 的 answer）', 'each item’s answer as written (an item’s `answer`)'), null, bySets((round, it) => it.answer ?? [], 'all', true)),
  fields: item(t('选项给出的字段（gives）够不够回答题目要的（needs）：exact 要刚好够（最少的那个），enough 只要够', 'whether an option’s fields (`gives`) answer what the item needs (`needs`): exact wants the least that is enough, enough any that is enough'),
    S.obj({ mode: S.oneOf(['exact', 'enough']) }),
    bySets((round, it, { mode }) => {
      const enough = round.options.filter((o) => (it.needs ?? []).every((f) => fieldsOf(o).includes(f)))
      if (mode === 'enough') return ids(enough)
      const least = Math.min(...enough.map((o) => fieldsOf(o).length))
      return ids(enough.filter((o) => fieldsOf(o).length === least))
    }, 'some', true)),
  match: item(t('题目的 is 和选项的 is 相同', 'the item’s `is` equals the option’s `is`'), null, bySets((round, it) => ids(round.options.filter((o) => o.is === it.is)), 'all', false)),
  claims: item(t('每题是一句论断（claim），在这一轮的每个候选场景（scenes）里算真假：都真为成立，都假为不成立，有真有假为无法确定', 'each item is a claim, true or false in each of the round’s candidate scenes: supported when true in all, contradicted when false in all, else undetermined'), null, {
    multi: false,
    check(round, picks) {
      return round.items.flatMap((it, k) => {
        const { verdict, truths } = verdictOf(it.claim, round.scenes)
        if ((picks[k] ?? []).length === 1 && picks[k][0] === verdict) return []
        const n = nth(k)
        if (verdict === 'undetermined') {
          const [a, b] = [truths.indexOf(true), truths.indexOf(false)]
          return [{ item: k, why: t(`${n.zh}：在场景 ${a + 1} 里成立，在场景 ${b + 1} 里不成立，而两者都和这张图相容`, `${n.en}: it holds in scene ${a + 1} and fails in scene ${b + 1}, both compatible with the picture`) }]
        }
        return [{ item: k, why: verdict === 'supported' ? t(`${n.zh}：每个相容的场景里它都成立`, `${n.en}: it holds in every compatible scene`) : t(`${n.zh}：每个相容的场景里它都不成立`, `${n.en}: it fails in every compatible scene`) }]
      })
    },
    reference: (round) => round.items.map((it) => [verdictOf(it.claim, round.scenes).verdict]),
  }),
  cover: item(t('选几个情形，合起来要覆盖 needs 里的每一种变化（选项的 varies）', 'choose cases that together cover every change in `needs` (an option’s `varies`)'), S.obj({ needs: factorList }), {
    multi: true,
    check(round, picks, { needs }) {
      const got = picks[0] ?? []
      const seen = new Set(round.options.filter((o) => got.includes(o.id)).flatMap((o) => o.varies ?? []))
      const missing = needs.filter((f) => !seen.has(f))
      return missing.length ? [{ item: 0, why: t(`还没有覆盖：${missing.join('、')}`, `not covered yet: ${missing.join(', ')}`) }] : []
    },
    reference(round, { needs }) {
      // Greedy: the case covering most of what is still missing, until all is.
      const left = new Set(needs)
      const out = []
      while (left.size) {
        const best = round.options.reduce((a, o) => ((o.varies ?? []).filter((f) => left.has(f)).length > (a ? (a.varies ?? []).filter((f) => left.has(f)).length : 0) ? o : a), null)
        if (!best || !(best.varies ?? []).some((f) => left.has(f))) break
        out.push(best.id)
        for (const f of best.varies) left.delete(f)
      }
      return [out]
    },
  }),
  refute: item(t('选出推翻「每个预测都对」的情形（选项的 predicted 和 truth 不同）；都对时选 id 为 none 的选项', 'choose a case refuting “every prediction is right” (an option whose `predicted` differs from its `truth`); when all are right, the option with id none'), null,
    bySets((round) => {
      const wrong = round.options.filter((o) => o.id !== 'none' && o.predicted !== o.truth)
      return wrong.length ? ids(wrong) : ['none']
    }, 'some', true)),
  pair: item(t('题目和选项量的是同一种东西（measures 相同）', 'the item and the option measure the same thing (equal `measures`)'), null, bySets((round, it) => ids(round.options.filter((o) => o.measures === it.measures)), 'some', false)),
  same: item(t('候选场景（选项的 scene）和参照场景（reference）只差在 vary 那一样：全部选出', 'every candidate scene (an option’s `scene`) that differs from the reference only in `vary`'),
    S.obj({ vary: S.oneOf(['camera', 'light']) }),
    bySets((round, it, { vary }) => ids(round.options.filter((o) => {
      const d = differences(round.reference, o.scene)
      return d.length > 0 && d.every((k) => k === vary)
    })), 'all', true)),
  project: item(t('选出两组以上（选项的 H、Z）：在焦距 f 下像高都是 target，距离又各不相同', 'choose two or more pairs (an option’s H and Z) that all image at height `target` under focal length f, at different depths'),
    S.obj({ f: S.num(), target: S.num(), tol: S.opt(S.num()) }), {
      multi: true,
      check(round, picks, { f, target, tol = 1e-6 }) {
        const got = round.options.filter((o) => (picks[0] ?? []).includes(o.id))
        if (got.length < 2) return [{ item: 0, why: t('至少选两组', 'choose at least two') }]
        const off = got.find((o) => Math.abs(project({ f, H: o.H, Z: o.Z }).h - target) > tol)
        if (off) return [{ item: 0, why: t(`「${off.label.zh}」的像高是 ${project({ f, H: off.H, Z: off.Z }).h}，不是 ${target}`, `“${off.label.en}” images at height ${project({ f, H: off.H, Z: off.Z }).h}, not ${target}`) }]
        if (new Set(got.map((o) => o.Z)).size !== got.length) return [{ item: 0, why: t('选出的几组距离要各不相同', 'the pairs chosen must stand at different depths') }]
        return []
      },
      reference(round, { f, target, tol = 1e-6 }) {
        const seen = new Set()
        return [ids(round.options.filter((o) => Math.abs(project({ f, H: o.H, Z: o.Z }).h - target) <= tol && !seen.has(o.Z) && seen.add(o.Z)))]
      },
    }),
}

/** A judge call's item and parameters. */
export const judgeOf = (call) => {
  const [name, params] = callOf(call)
  return { judge: JUDGES[name], params: params === true ? {} : params ?? {}, name }
}

/** The options a round offers: its own, or the verdicts of a claims round. */
export const optionsOf = (round, name) => round.options ?? (name === 'claims' ? VERDICTS : [])
