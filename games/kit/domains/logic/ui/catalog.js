// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does
// and its ports, written with letters for any sentence (a part is a pattern), the settings on its
// card and a box's regions, and the editor's description of a node (../../../circuit/model.js parts, frames.js).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Split } from 'lucide-react'
import { RULES, rulesOf } from '../proof.js'
import { portsOf } from '../../../engine/circuit.js'
import { formOf, paramsOf } from '../../../engine/forms.js'
import { SETTING_KINDS } from '../choices.js'
import { FORMULA_TEXT } from '../formula.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the regions of a box (`frames`). */
export const RULE_TEXT = {
  mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B：接进一句「若…，则…」和它的前一半，得到后一半。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part.'), ports: { imp: 'A → B', a: 'A' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A、证出 B，框外得到 A → B。', 'Assume A inside the box and prove B; outside you get A → B.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框里', 'Inside') } },
  andI: { name: T('拼成 ∧', 'Join ∧'), desc: T('由 A 和 B 得到 A ∧ B。', 'From A and B, A ∧ B.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('拆开 ∧', 'Split ∧'), desc: T('由 A ∧ B 得到 A，也得到 B。', 'From A ∧ B, A, and also B.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('引入 ∨', 'Bring in ∨'), desc: T('由 A 得到 A ∨ B（或 B ∨ A），另一边 B 和放在哪边在元件上选。', 'From A, A ∨ B (or B ∨ A); choose B and its side on the part.'), ports: { a: 'A' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分情况', 'Case by case'), desc: T('一块有两个框的元件。输入口接 A ∨ B；「情况一」的框假设 A，「情况二」的框假设 B。两个框都证出同一句 C、接到各自的「结论」，元件就输出 C：不知道是哪一种，就每一种都证一遍。', 'A part with two boxes. Wire A ∨ B into its input; the box Case one assumes A, the box Case two assumes B. When both prove the same C, wired to their own “Conclusion”, the part gives C: not knowing which case it is, prove it in each.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到元件上选的任何一句。', 'From the contradiction ⊥, whatever is chosen on the part.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 得到 A。', 'From ¬¬A, A.'), ports: { nna: '¬¬A' } },
  allI: { name: T('任取', 'For any'), desc: T('一个框：框里随便取一样东西，元件上给它起名 a、b 或 c（不能出现在还开着的假设里）。框里证出 P(a)，框外得 ∀x. P(x)。', 'A box: inside it any thing at all, named a, b or c on the part (in no hypothesis still open). Prove P(a) inside; outside you get ∀x. P(x).'), params: { x: T('名字', 'Name') }, frames: { body: T('框里', 'Inside') } },
  allE: { name: T('取一个', 'Take one'), desc: T('接进 ∀x. P(x)，在元件上选一样东西 t，得到 P(t)。', 'Wire in ∀x. P(x) and choose a thing t on the part; out comes P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('哪一样', 'Which thing') } },
  exI: { name: T('举例', 'Example'), desc: T('接进 P(t)，得到 ∃x. P(x)：t 就是例子，元件自己认出来。关卡里只有一句「存在」对得上时自动得出它；有几句时，在元件上选要得出哪一句（比如 a喜欢a 可以得出 ∃x. x喜欢x，也可以得出 ∃x. a喜欢x）。', 'Wire in P(t); out comes ∃x. P(x), with t the example, read off by the part. When only one “there is” of the level fits, it is concluded at once; when several do, choose on the part which (a likes a gives ∃x. x likes x, and also ∃x. a likes x).'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude') } },
  exE: { name: T('拿出那一个', 'Take the one there is'), desc: T('接进 ∃x. P(x)：框里那一样东西叫 a（元件上起名 a、b 或 c），假设 P(a) 证出 C，框外就得 C。C 里不能有 a。', 'Wire in ∃x. P(x): inside the box that thing is a (named a, b or c on the part); assuming P(a) proves C, and outside you get C. C may not mention a.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, frames: { body: T('框里', 'Inside') } },
  refl: { name: T('自反', 'Reflexivity'), desc: T('元件上选一样东西 t，直接给出 t = t。', 'Choose a thing t on the part; it gives t = t at once.'), params: { t: T('哪一样', 'Which thing') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('接进 s = t 和一句提到 s 的话；元件上把这句话里的每一个 s 都框出来，点选的那几处换成 t。', 'Wire in s = t and a sentence about s; the part boxes every s in the sentence, and the ones you tick become t.'), ports: { eq: 's = t', p: 'φ(s)' } },
}

/** The machine board's parts (../machine.js): name, what each does, and the regions of a frame. */
export const MACHINE_TEXT = {
  repeat: { name: T('重复框', 'Repeat frame'), desc: T('框开出它收到的东西，框里接出新的东西送回「结果」；框把结果再送进去，一圈一圈地做，直到不再变化（或者失败了，那就停在失败前的一圈），送出最后一圈的结果。', 'The frame opens with what it receives; what is made inside goes back into “result”; the frame feeds it in again, round after round, until it stops changing (or fails: then it stops at the round before), and gives the last round.'), frames: { body: T('每一圈', 'Each round') } },
  uDelete: { name: T('删掉', 'Delete'), desc: T('找到一个两边一模一样的等式 t ≐ t，删掉它。', 'Finds an equation with both sides the same, t ≐ t, and deletes it.') },
  uDecompose: { name: T('拆开', 'Decompose'), desc: T('找到一个两边样子相同的等式（都是「并且」，都是同一个谓词……），拆成各部分对各部分的几个等式：?A ∧ ?B ≐ 下雨 ∧ 刮风 拆成 ?A ≐ 下雨 和 ?B ≐ 刮风。¬A 当作 A → ⊥ 来拆。', 'Finds an equation with the same shape on both sides (both “and”, both the same predicate …) and splits it into an equation for each pair of parts: ?A ∧ ?B ≐ it rains ∧ it is windy becomes ?A ≐ it rains and ?B ≐ it is windy. ¬A splits as A → ⊥.') },
  uConflict: { name: T('对不上', 'Clash'), desc: T('找到一个两边都不是 ?、样子却不同的等式（一边「并且」一边「或者」，两个不同的句子……），宣布失败：怎样代都对不上。', 'Finds an equation with no ?-letter on either side and different shapes (an “and” against an “or”, two different sentences …) and declares failure: nothing put in makes them meet.') },
  uSwap: { name: T('翻过来', 'Swap'), desc: T('找到一个只有右边是 ? 的等式 t ≐ ?A：翻成 ?A ≐ t。', 'Finds an equation with a ?-letter on the right only, t ≐ ?A, and turns it into ?A ≐ t.') },
  uCheck: { name: T('发生检查', 'Occurs check'), desc: T('找到一个 ?A ≐ t，t 里面又有 ?A（t 不就是 ?A）：宣布失败。', 'Finds ?A ≐ t where ?A occurs inside t (t not ?A itself) and declares failure.') },
  uEliminate: { name: T('代进去', 'Eliminate'), desc: T('找到一个 ?A ≐ t（t 里没有 ?A），而 ?A 还出现在别的等式里：把那些地方的 ?A 都换成 t。', 'Finds ?A ≐ t (no ?A in t) while ?A still occurs in other equations, and puts t for ?A there.') },
  uPattern: { name: T('做成函数', 'Make a function'), desc: T('找到一个 ⋀x. ?P(x) ≐ t：?P 后面跟的是 ⋀ 管着的、各不相同的变量，t 里也没有别的 ⋀ 变量。解出 ?P ≐ fun x => t：?P 是一个「关于 x 的句子」。?P 后面跟的不是这样的变量（?P(安)、?P(?t)），解不止一个，不动它。', 'Finds ⋀x. ?P(x) ≐ t: ?P applied to distinct variables bound by the ⋀, and no other ⋀ variable in t. It solves ?P ≐ fun x => t: ?P is “a sentence about x”. When ?P is applied to anything else (?P(ann), ?P(?t)) there is more than one solution, and it is left alone.') },
  unifier: { name: T('合一器', 'Unifier'), desc: T('把一组等式解到底：每个等式左边是一个 ?，右边里没有这些 ?（最一般合一子）；合一不了就宣布失败。', 'Solves a set of equations to the end: each with a ?-letter on the left and none of those letters on any right (the most general unifier); failure if there is none.') },
  rule: { name: T('用规则', 'Rule'), desc: T('元件上选一条规则。第一个目标和规则的结论合一，换成规则的前提（每条前提一个目标，前提自己的假设加进已知）；规则里没对上的 ? 留在目标里，等后面的元件定下来。', 'Choose a rule on the part. The first goal is unified with the rule’s conclusion and replaced by its premises (a goal for each premise, its own assumptions added to the hypotheses); a ?-letter of the rule left open stays in the goals until a later part settles it.'), params: { rule: T('规则', 'Rule') } },
  assumption: { name: T('已知里有', 'Assumption'), desc: T('第一个目标和它的一条已知合一：对上了，这个目标就证完了，?-字母也跟着定下来。从上往下找，用第一条对上的。', 'The first goal is unified with one of its hypotheses: when one fits, that goal is done, and its ?-letters are settled with it. It looks from the top and uses the first that fits.') },
  erule: { name: T('规则对已知', 'Rule on a given'), desc: T('元件上选一条规则：先用规则，再拿已知里有对上它留下的第一个目标。规则的结论对上第一个目标，第一条前提对上一条已知；剩下的前提各成一个目标。', 'Choose a rule on the part: Rule, then Assumption on the first goal it leaves. The rule’s conclusion fits the first goal and its first premise a hypothesis; each other premise is a goal.'), params: { rule: T('规则', 'Rule') } },
  frule: { name: T('往前推', 'Forward'), desc: T('元件上选一条规则：先证一句，再规则对已知。规则的第一条前提对上一条已知，结论加进已知；规则剩下的前提各成一个目标，排在前面。', 'Choose a rule on the part: Have, then Rule on a given. The rule’s first premise fits a hypothesis and its conclusion joins the hypotheses; each other premise of the rule is a goal, in front.'), params: { rule: T('规则', 'Rule') } },
  defer: { name: T('放到最后', 'Defer'), desc: T('把第一个目标挪到最后，第二个目标变成第一个。', 'Moves the first goal to the end; the second becomes the first.') },
  append: { name: T('几条路', 'Alternatives'), desc: T('每个框都拿到同一个状态；用第一个没失败的框的结果。元件上选有几个框。', 'Every region gets the same state; the result is the first region’s that did not fail. Choose on the part how many regions it has.'), params: { ways: T('框', 'Regions') }, frames: { first: T('先试', 'Try first'), second: T('再试', 'Then'), third: T('再试', 'Then'), fourth: T('再试', 'Then'), fifth: T('再试', 'Then'), sixth: T('再试', 'Then') } },
  search: { name: T('搜到证完', 'Search'), desc: T('深度优先地搜：框里的元件对收到的状态做一步，得到的每一种结果再接着做，一条路走到头再回来换下一条，直到没有目标；送出找到的每一个证完的状态。一步走回原地（目标没少、已知没多）的，不往下走。元件上可以设最多搜几层。', 'Searches depth first: the parts inside take a step on the state received, and each result is stepped on again, one path to its end before coming back for the next, until no goal is left; it gives every finished state it finds. A step back where it was (no goal fewer, no hypothesis more) is not followed. A depth limit can be set on the part.'), params: { depth: T('最多', 'At most') }, frames: { body: T('每一步', 'Each step') } },
  each: { name: T('每个目标', 'Every goal'), desc: T('框里的元件对每一个目标各做一遍，每次只看那一个目标；有一个做不下去，整个就失败。', 'The parts inside are run once on each goal, seeing only that goal each time; if one cannot go on, the whole fails.'), frames: { body: T('每个目标', 'Each goal') } },
  introRules: { name: T('拆目标', 'Goal apart'), desc: T('每一条引入规则都倒着用在第一个目标上：拼成、假设框、引入 ∨ 左右两条、任取、举例。对上的每一条都是一种结果。', 'Every introduction rule used backwards on the first goal: join, the assumption box, bring in ∨ left and right, for any, example. Each that fits is a result.') },
  elimRules: { name: T('用已知', 'Use a given'), desc: T('每一条消去规则都拿去对已知：拆开 ∧、分情况、用上「若…则…」、矛盾推出一切、拿出那一个、取一个再用。对上的每一种都是一种结果。', 'Every elimination rule on a given: split ∧, case by case, use an “if”, from contradiction, take the one there is, take one and use it. Each fit is a result.') },
  rw: { name: T('改写', 'Rewrite'), desc: T('元件上选一条改写规则：在第一个目标里，从外往里、从左往右找第一处对得上规则左边的地方，换成右边，只换这一处。规则带条件的，条件成了新目标，排在它后面。哪一处都对不上，就失败。', 'Choose a rewrite rule on the part: in the first goal, outside in and left to right, the first place that fits the rule’s left side becomes its right side, that place alone. A rule with conditions leaves each as a new goal after it. If no place fits, it fails.'), params: { rewrite: T('改写规则', 'Rewrite rule'), at: T('改哪里', 'Where') } },
  simp: { name: T('化简', 'Simp'), desc: T('元件上排好一串改写规则：每一圈用第一条对得上的规则改写一处，一圈一圈改下去，直到哪一条都对不上。', 'Line up rewrite rules on the part: each round, the first rule that fits rewrites one place, round after round, until none fits.'), params: { rewrites: T('改写规则', 'Rewrite rules'), at: T('改哪里', 'Where') } },
  auto: { name: T('自己的 auto', 'Own auto'), desc: T('深度优先地搜到证完：每一步先试已知里有，再拆目标，再用已知；走回原地的路不走。', 'Searches depth first until done: each step tries Assumption, then Goal apart, then Use a given; a path that comes back where it was is not followed.') },
  // Clauses (chapter 13).
  skolem: { name: T('Skolem 化', 'Skolemise'), desc: T('把第一个目标已知里的 ∃ 都去掉：前面没有 ∀ 的，像拿出那一个一样取出那一样东西；在 ∀ 底下的，换成一个新函数，参数是它外面所有 ∀ 的变量（sk1(x)……）。已知要先化成否定范式。', 'Takes every ∃ out of the first goal’s hypotheses: one with no ∀ outside is taken out as Take the one there is does; one under a ∀ becomes a new function of all the ∀ variables outside it (sk1(x) …). The hypotheses must be in negation normal form first.') },
  toClauses: { name: T('拆成子句', 'Into clauses'), desc: T('第一个目标要是 ⊥：把它的已知拆成子句。每条已知要是合取范式，「并且」拆开，每一串「或者」是一条子句，∀ 去掉，变量读作「对所有」。', 'The first goal must be ⊥: its hypotheses are split into clauses. Each must be in CNF; the ands come apart, each string of ors is a clause, the ∀s are dropped, and variables read as “for all”.') },
  resolve: { name: T('归结一圈', 'A round of resolution'), desc: T('子句集里每一对子句都试一次：一条里的某个文字和另一条里的相反文字合一得上，就消掉这一对，剩下的并成新子句加进来，记下它由哪两条来。永真的不要，重复的不要。元件上可以设只和单项子句消。', 'Every pair of clauses in the set is tried once: when a literal of one unifies with the opposite literal of the other, the pair is cancelled and the rest joined into a new clause, added with the two it came from. Tautologies and repeats are left out. It can be set to cancel only with a one-literal clause.'), params: { unit: T('和谁消', 'Cancel with') } },
  saturate: { name: T('饱和器', 'Saturator'), desc: T('一圈一圈地归结，直到推出 ⊥，或者再也推不出新子句。', 'Resolves round after round until ⊥ appears or no new clause does.') },
  oracle: { name: T('别人的证明器', 'Someone else’s prover'), desc: T('一个很快的证明器：两条子句之间有几对相反的文字，就一次全消掉；一圈一圈做到推出 ⊥ 或者没有新子句。也记下每条新子句从哪两条来。', 'A fast prover: however many opposite literals two clauses have, it cancels them all at once, round after round until ⊥ or nothing new. It too records where each new clause came from.') },
  replay: { name: T('重放', 'Replay'), desc: T('子句集里有 ⊥ 时，把推出 ⊥ 的那几步交给核：每条用到的已知子句要是某条已知拆出来的，每一步要由它的两条父子句（变量换成合一给出的样子）用自己的 auto 证出。都过了，子句拆出来的那个目标就证完了；哪一步不过，就说是哪一步。', 'When the clause set holds ⊥, the steps to ⊥ go to the kernel: each input clause used must come out of a hypothesis, and each step must be proved from its two parents (their variables put in as unification made them) by your own auto. If all pass, the goal the clauses were split from is proved; if one fails, it says which.') },
  clausify: { name: T('化成子句', 'Into clauses, all the way'), desc: T('反证法和假设框把要证的那句的否定放进已知，化简把已知化成合取范式，Skolem 化去掉 ∃，再拆成子句。', 'By contradiction and an assumption box put the negated goal among the hypotheses, Simp brings them to CNF, Skolemise takes the ∃s out, and they are split into clauses.') },
  metis: { name: T('重建器', 'Reconstructor'), desc: T('化成子句，交给饱和器找证书，再交给核重放：证得出的目标证完，证书不过的就失败。', 'Into clauses, the saturator for a certificate, and the kernel to replay it: a goal that follows is proved; one whose certificate does not pass fails.') },
}

const FIXED = { premise: 'source', goal: 'sink' }
// What a box's region gives at its left edge, and what goes into the dot at its right.
const OPENS = T('假设', 'Assume')
const CLOSES = T('结论', 'Conclusion')
const GIVES = T('得出', 'Result')

/**
 * The card's settings: [{ key, label, kind }] (orI's side is a switch of its own); a lemma may name its own (`params`).
 * kind: 'formula' (a sentence), 'exists' (a sentence that starts with ∃), 'term', 'name' (a particular thing: a, b,
 * c) or 'form' (which shape a part with several forms is in, engine/forms.js).
 */
export const settingsOf = (parts, node, lemmas = {}) => [...(parts[node.type]?.forms ? [{ key: 'form', kind: 'form' }] : []), ...paramsOf(parts[node.type], node).map((key) => ({ key, label: lemmas[node.type]?.params?.[key] ?? RULE_TEXT[node.type]?.params?.[key] ?? key, kind: SETTING_KINDS[node.type]?.[key] ?? 'formula', blank: SETTING_KINDS[node.type]?.[key] === 'exists' ? T('自动', 'Automatic') : null }))]

/** A part's text with the game's revisions of it along the course (logicCourse `revisions`; defineGame textAt / textFor). */
export const withRevisions = (text, list) => (text && list ? { ...text, revisions: list } : text)

/** A rule's or lemma's name and what it does. */
export const nameOf = (lemmas, type) => lemmas[type]?.name ?? RULE_TEXT[type]?.name ?? type
export const textOf = (lemmas, type, revisions = {}) => withRevisions(lemmas[type] ?? RULE_TEXT[type], revisions[type])
export const familyOf = (lemmas, type) => (lemmas[type] ? 'lemma' : RULES[type]?.frames ? 'box' : 'rule')
const ICONS = { lemma: Puzzle, box: Box, rule: GitFork }
export const iconOf = (lemmas, type) => ICONS[familyOf(lemmas, type)] ?? Split

/** The editor's description of a proof's nodes (model.js), for a level's lemmas and premise names (in order). */
export function partsFor(lemmas = {}, premises = []) {
  const parts = rulesOf(lemmas)
  return {
    inputs: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? ['in'] : []) : parts[node.type] ? portsOf(parts[node.type], node) : []),
    role: (node) => (FIXED[node.type] ? FIXED[node.type] : 'part'),
    label: (node) => {
      if (node.type === 'goal') return T('目标', 'Goal')
      if (node.type === 'premise') return premises.length > 1 ? T(`已知 ${premises.indexOf(node.params.name) + 1}`, `Given ${premises.indexOf(node.params.name) + 1}`) : T('已知', 'Given')
      return nameOf(lemmas, node.type)
    },
    portLabel: (node, port) => {
      if (RULE_TEXT[node.type]?.frames?.[port]) return CLOSES
      const l = lemmas[node.type]
      if (l?.forms) return (l.forms.find((f) => f.key === formOf(parts[node.type], node)).premises ?? [])[Number(port.slice(1))]
      if (l) return l.ports[Number(port.slice(1))]
      return RULE_TEXT[node.type]?.ports?.[port] ?? ''
    },
    family: (node) => (node.type === 'goal' ? 'end' : node.type === 'premise' ? 'given' : familyOf(lemmas, node.type)),
    icon: (node) => (node.type === 'goal' ? Flag : node.type === 'premise' ? ArrowRightFromLine : iconOf(lemmas, node.type)),
    // A box gives its conclusion, and inside each region the assumption it makes.
    outputs: (node) => {
      const outs = RULE_TEXT[node.type]?.outs
      if (outs) return Object.entries(outs).map(([key, [label, short]]) => ({ key, label, short }))
      const opens = (parts[node.type]?.frames?.(node) ?? []).filter((r) => r.opens)
      return opens.length ? [{ key: null, label: GIVES, short: GIVES }, ...opens.map((r) => ({ key: r.name, label: OPENS, short: OPENS }))] : null
    },
    cardWidth: (node) => (parts[node.type]?.frames ? 240 : FIXED[node.type] ? 170 : 160),
    frames: (node) => (parts[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: RULE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
    text: FORMULA_TEXT,
    rules: parts,
  }
}

