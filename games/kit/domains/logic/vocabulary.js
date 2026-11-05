// The logic domain's vocabulary (games/DESIGN.md 6.2): every thing a logic game's content may name, each with what it
// is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to them: proof rules in proof.js, gates in gates.js, the machine board's parts in
// machine.js (their names in partText.js), the level kinds in course.js and ui/, a machine's wants in machine.js judge,
// and the proof-term forms in termTree.js. Sentences are text in the
// notation formula.js and schematic.js read; a board is blueprint text (blueprint.js).

import { S } from '../../engine/schema.js'
import { SAVES, defineVocabulary } from '../../engine/vocabulary.js'
import { RULES } from './proof.js'
import { PRIMITIVE_GATES } from './gates.js'
import { MACHINE_PARTS } from './machine.js'
import { MACHINE_TEXT, RULE_TEXT } from './partText.js'

const t = (zh, en) => ({ zh, en })
const item = (about, params) => ({ about, ...(params ? { params } : {}) })
const ids = S.list(S.str())
const NONE = S.oneOf([null])
// The small languages content writes in, read by the domain (domain.js languages).
const LANGUAGES = {
  formula: { about: t('一句话（formula.js）', 'a sentence (formula.js)') },
  side: { about: t('等式的一边：一样东西或一句话（schematic.js）', 'a side of an equation: a thing or a sentence (schematic.js)') },
  condition: { about: t('一行定义的条件：一个等式（schematic.js）', 'a row’s condition: an equation (schematic.js)') },
  term: { about: t('一个证明项（pterm.js）', 'a proof term (pterm.js)') },
}
const SENTENCE = S.syntax('formula', { about: t('一句话，按 formula.js 的写法：Rain → Wet、∀x. Human(x)、?A ∧ ?B', 'a sentence as formula.js reads it: Rain → Wet, ∀x. Human(x), ?A ∧ ?B') })
const SENTENCES = S.list(SENTENCE)
const SIDE = S.syntax('side')
const SIDES = S.list(SIDE)
const TERM = S.syntax('term')
/** Blueprint text (../../circuit/text.js), one line a string: a reference board, a naive one. */
const BOARD = S.board({ about: t('一块电路板的蓝图文本，每行一个字符串', 'a board as blueprint text, one string a line') })
const PART = S.str({ about: t('一个元件：词汇表里的元件，或 game.json 里的引理、门、等式', 'a part: one of the vocabulary’s, or a lemma, gate or equation of game.json') })
const PARTS = S.list(PART)
const WORDS = S.list(S.either(S.str(), S.map(S.text())), { about: t('用哪几套词（game.json wordSets 的名字，或直接写出），按顺序合并', 'the word sets read in (names of game.json wordSets, or written out), merged in order') })

/* ---------- the parts ---------- */

const named = (texts, keys) => Object.fromEntries(keys.map((k) => [k, item(texts[k].name)]))
const PROOF_RULES = Object.keys(RULES).filter((k) => RULE_TEXT[k])
const PART_ITEMS = {
  ...named(RULE_TEXT, PROOF_RULES),
  ...named(PRIMITIVE_GATES, Object.keys(PRIMITIVE_GATES)),
  ...named(MACHINE_TEXT, Object.keys(MACHINE_PARTS).filter((k) => MACHINE_TEXT[k])),
  // The machine board's rule part that gives the goal's own hypotheses as rewrite rules (rewrite.js).
  hyp: item(t('已知里的等式', 'An equation given')),
}

/* ---------- what levels are and want ---------- */

const KINDS = {
  proof: item(t('证明板：规则即元件，从已知接到目标', 'the proof board: rules as parts, wired from the givens to the goal')),
  truth: item(t('真值表：一行一行填', 'a truth table, filled in row by row')),
  gates: item(t('真值电路：一块门电路在真值表的每一行上跑', 'a truth circuit: a board of gates run on every row of a truth table')),
  iso: item(t('规则板：声明一个连接词的引入规则，或用条例检验别人的声明', 'the rule board: a connective’s introduction rules declared, or someone’s declaration checked by cases')),
  define: item(t('定义：给每一行选一个右边', 'a definition: a right side picked for every row')),
  translate: item(t('翻译：把一句话拼成公式', 'translating: a sentence built as a formula')),
  query: item(t('查询：拼一句带 x 的话，在每个世界里选中答案', 'a query: a sentence with x that picks out the answers in every world')),
  model: item(t('造世界：让句子真假如所要', 'building a world in which the sentences come out as asked')),
  machine: item(t('证明助手：机器板上的一块电路，处理每组测试的输入', 'a proof assistant: a machine board run on every test’s input')),
  term: item(t('写证明项：用块拼出一个证明项', 'writing a proof term from pieces')),
  script: item(t('写脚本：一行一句，by 后面是证法', 'writing a script: a row a statement, each with its by')),
}
const WANTS = {
  proved: item(t('证明完毕：没有目标剩下', 'proved: no goal left')),
  becomes: item(t('变成测试列出的几种结果（每种是它的目标）；一种也没有：这一步失败', 'the results the test lists, each its goals; none: the step fails')),
  fails: item(t('证不出时停下，报告证不出', 'to stop and report failure when the goal cannot be proved')),
  answers: item(t('找出所有答案：?-字母取到的每一种', 'every answer: each thing its ?-letters can become')),
  unify: item(t('解完的等式（能合一时），或者失败', 'the solved equations (when they unify), or a failure')),
  elim: item(t('一份声明的消去规则', 'a declaration’s elimination rule')),
  clauses: item(t('拆成测试列出的子句', 'the clauses the test lists')),
  refuted: item(t('推出空子句 ⊥（测试有预算时，子句不超过预算）', 'the empty clause ⊥ (within the test’s budget of clauses)')),
  decide: item(t('能推出 ⊥ 时推出 ⊥；否则饱和', '⊥ when it follows; otherwise saturated')),
}
const FORMS = {
  fun: item(t('fun x => …：证「若…则…」', 'fun x => …: proves an “if … then …”')),
  app: item(t('f a：套用', 'f a: applying')),
  pair: item(t('⟨a, b⟩：证「并且」', '⟨a, b⟩: proves an “and”')),
  fst: item(t('a.1：「并且」的左边', 'a.1: an “and”’s left side')),
  snd: item(t('a.2：「并且」的右边', 'a.2: an “and”’s right side')),
  inl: item(t('inl a：「或者」的左边', 'inl a: an “or”’s left side')),
  inr: item(t('inr a：「或者」的右边', 'inr a: an “or”’s right side')),
  elim: item(t('分情况：用「或者」', 'by cases: using an “or”')),
  absurd: item(t('absurd：由矛盾得出任何一句', 'absurd: anything from a contradiction')),
  open: item(t('取出存在的那一样', 'opening a “there is”')),
  rfl: item(t('rfl：t = t', 'rfl: t = t')),
  subst: item(t('▸：等量代换', '▸: rewriting by an equation')),
}


/* ---------- a level ---------- */

const TEXTS = S.list(S.text())
const INTRO = S.list(S.obj({ t: S.text() }))
const PREMISES = S.map(SENTENCE, { about: t('已知：名字 → 句子', 'the givens: name → sentence') })
// What a level or a task may say whatever it is.
const ANY = {
  brief: S.opt(S.text()),
  hint: S.opt(TEXTS),
  intro: S.opt(INTRO),
  after: S.opt(S.text({ about: t('通关后的一句（只说这一关，不剧透做法）', 'the pass text (this level only, never the way it is solved)') })),
  adds: S.opt(S.list(PART, { section: 'course', about: t('这一关新带来的元件', 'the parts this level brings in') })),
  fold: S.opt(S.list(PART, { section: 'course' })),
  without: S.opt(S.list(PART, { section: 'course', about: t('这一关不给的元件（一段证明不许用框）', 'parts the level holds back (a proof without boxes)') })),
  parts: S.opt(S.list(PART, { about: t('换了一种板的任务手里有的元件', 'the parts a task on another kind of board holds') })),
  words: S.opt(WORDS),
  consts: S.opt(S.list(S.str(), { about: t('这一关的名字（特定的东西）', 'the names (particular things) the level reads') })),
  symbols: S.opt(S.list(S.oneOf(['¬', '∧', '∨', '→', '↔', '⊥', '∀', '∃']), { about: t('从这一关起在公式里出现的连接词', 'the connectives formulas write from this level on') })),
  propertyWords: S.opt(S.bool()),
  symbolicWords: S.opt(S.map(S.text(), { about: t('最后一个测试（字母）里，这些词怎么读', 'how these words read in the last test, the letters') })),
  showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：它的用法抽象在哪里', 'a new part may have a level that only places it: what is abstract about its use') })),
  builds: S.opt(S.str({ section: 'course', about: t('通过后做成元件：game.json 的引理、门，或机器板上的元件', 'once passed it is a part: a lemma or gate of game.json, or a machine part') })),
  fact: S.opt(S.str({ section: 'course', about: t('这一关证出的等式（game.json facts）', 'the equation this level proves (game.json facts)') })),
}
const RULE_ROWS = S.list(S.obj({ binds: ids, needs: SENTENCES }), { about: t('一份声明：每条引入规则一行，取的东西和前提（规则表的写法）', 'a declaration: one introduction rule a row, the things it takes and its premises (as the rule table writes it)') })
const CASE = S.obj({ given: SENTENCES, goal: S.opt(SENTENCE), make: S.bool(), uses: S.opt(SENTENCES) })
const SLOT = S.obj({ given: S.opt(SENTENCES), goal: S.opt(SENTENCE), make: S.opt(S.bool()), keep: S.opt(SENTENCES), fixed: S.list(S.oneOf(['given', 'goal', 'make'])) })
const ROW = S.obj({ k: S.oneOf(['show', 'assume', 'fix', 'obtain', 'have']), stmt: S.opt(SENTENCE), by: S.opt(S.str()), using: S.opt(ids), thing: S.opt(S.str()) })
const MTEST = S.obj({
  eqs: S.opt(S.list(S.str())), goal: S.opt(SENTENCE), hyps: S.opt(SENTENCES), answers: S.opt(ids), becomes: S.opt(S.list(S.list(S.str()))),
  rules: S.opt(ids), clauses: S.opt(SENTENCES), budget: S.opt(S.int({ min: 1 })), want: S.opt(S.ref('want')),
  it: S.opt(S.str()), ways: S.opt(S.list(S.str())), elim: S.opt(S.list(S.str())),
})
const WORLD = S.obj({ size: S.int({ min: 1 }), preds: S.map(ids), consts: S.opt(S.map(S.int({ min: 0 }))) })
const ISO = {
  declare: S.opt(S.text({ about: t('声明的是什么词', 'the word declared') })), target: S.opt(SENTENCE), sentences: S.opt(SENTENCES), tests: S.opt(S.list(CASE)),
  solution: S.opt(RULE_ROWS), naive: S.opt(S.either(RULE_ROWS, S.list(CASE))), things: S.opt(ids), thing: S.opt(S.bool()),
  play: S.opt(S.oneOf(['audit'], { about: t('用条例检验别人的声明', 'checking someone’s declarations by test cases') })), want: S.opt(S.oneOf(['agree', 'expose'])),
  boards: S.opt(S.list(S.obj({ label: S.opt(S.text()), rules: RULE_ROWS }))), answer: S.opt(S.list(CASE)), slots: S.opt(S.either(S.int({ min: 1 }), S.list(SLOT))),
  caseGoal: S.opt(SENTENCE), binder: S.opt(S.str()), take: S.opt(S.obj({ premises: S.list(S.str()), conclusion: S.str() })),
  datatype: S.opt(S.obj({ type: S.str(), ctors: ids, args: S.map(S.str()) })), ways: S.opt(S.list(S.list(S.str()))), carry: S.opt(S.level()),
}
const BY_KIND = {
  proof: {
    tests: S.list(S.obj({ premises: S.opt(PREMISES), goal: SENTENCE, term: S.opt(S.str()) }), { min: 1, section: 'tests', about: t('一个模式（用字母写）', 'one pattern, written in letters') }),
    cases: S.list(S.map(SENTENCE), { section: 'tests', about: t('每组测试把字母换成哪些句子', 'the sentences each test puts in place of the letters') }),
    solution: BOARD, naive: S.opt(BOARD), sentences: S.opt(SENTENCES), terms: S.opt(S.bool()), script: S.opt(S.list(ROW)), briefNote: S.opt(S.text()),
  },
  truth: { ask: S.oneOf(['fill', 'valid', 'counter', 'sat']), formulas: SENTENCES },
  gates: { target: SENTENCE, hideTarget: S.opt(S.bool()), blind: S.opt(S.bool()), budget: S.opt(S.int({ min: 1 })), solution: BOARD, naive: S.opt(BOARD) },
  iso: ISO,
  define: {
    fn: S.str(), on: S.opt(S.either(S.int({ min: 0 }), NONE)), rows: S.list(S.obj({ lhs: SIDE, when: S.opt(S.syntax('condition')), choices: SIDES })),
    tests: S.list(S.obj({ term: SIDE, value: SIDE }), { section: 'tests' }), solution: S.list(SIDE, { section: 'answers' }), naive: S.opt(SIDES), defs: S.opt(ids),
  },
  translate: { say: S.text(), target: SENTENCE, decoys: S.opt(SENTENCES) },
  query: { say: S.text(), target: SENTENCE, decoys: S.opt(SENTENCES), worlds: S.list(S.obj({ title: S.text(), things: ids, preds: S.map(S.list(S.either(S.str(), ids)), { about: t('每个谓词对哪些东西成立（一样东西，或几样一组）', 'what each predicate holds of (a thing, or a tuple of things)') }) })) },
  model: { say: S.opt(S.text()), meant: S.opt(SENTENCE), wrong: S.opt(SENTENCE), answer: WORLD, given: S.opt(SENTENCES), goal: S.opt(SENTENCE) },
  machine: {
    want: S.ref('want'), inputs: S.opt(S.list(S.obj({ name: S.str(), label: S.text() }))), single: S.opt(S.bool()), tests: S.list(MTEST, { min: 1, section: 'tests' }), hidden: S.opt(S.list(MTEST, { section: 'tests' })),
    solution: BOARD, naive: S.opt(BOARD), budget: S.opt(S.int({ min: 1 })), backtrack: S.opt(S.bool()),
    rules: S.opt(S.map(S.obj({ name: S.text(), premises: S.list(S.str()), conclusion: S.str() }), { about: t('这一关自带的规则（元件）', 'rules the level states, each a part') })),
    preset: S.opt(S.list(S.str(), { about: t('参考解里预先放在板上的元件（锁住）', 'cards of the reference answer the board starts with, locked') })),
    defs: S.opt(ids), types: S.opt(ids), stated: S.opt(S.list(S.str())),
  },
  term: {
    premises: S.opt(PREMISES), goal: SENTENCE, answer: TERM, naive: S.opt(TERM), given: S.opt(TERM), forms: S.opt(S.list(S.ref('form'), { about: t('块里有哪些写法（不写：除 rfl、subst 外的全部）', 'the forms the pieces offer (left out: all but rfl and subst)') })),
    uses: S.opt(ids), stated: S.opt(S.list(S.str())), defs: S.opt(ids),
  },
  script: {
    premises: S.opt(PREMISES), goal: SENTENCE, answer: S.list(ROW), naive: S.opt(S.list(ROW)), given: S.opt(S.list(ROW)), locked: S.opt(S.bool()),
    simp: S.opt(ids), things: S.opt(ids), sentences: S.opt(SENTENCES), types: S.opt(ids), defs: S.opt(ids),
  },
}
const opts = (fields) => Object.fromEntries(Object.entries(fields).map(([k, s]) => [k, s.optional ? s : S.opt(s)]))
const byKind = (own) => S.by('kind', Object.fromEntries(Object.entries(BY_KIND).map(([kind, fields]) => [kind, S.obj({ kind: S.ref('kind'), ...ANY, ...own, ...fields })])))
const TASK = byKind({ step: S.text(), carries: S.opt(S.bool({ about: t('接着上一个任务的电路往下做', 'goes on from the last task’s board') })) })
const LEVEL = S.either(
  byKind({ title: S.text() }),
  // A level of several tasks: what it says for all of them (a declaration's sentence and cases too), then each task.
  S.obj({ title: S.text(), ...ANY, ...opts(ISO), tasks: S.list(TASK, { min: 1, section: 'tasks' }) }),
)

/* ---------- game.json ---------- */

const levels = S.list(S.level())
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.text(), levels })) }))
const AFTER = S.either(S.level(), levels)
const ERA = S.obj({
  id: S.str(),
  machine: S.either(S.oneOf(['prover'], { about: t('证明器：从这一代起，每一章给它加一个模块', 'the prover: from this era on, each chapter adds a module to it') }), NONE),
  keeps: S.opt(S.either(S.oneOf(['all']), ids)),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), code: S.str({ pattern: '^[A-Z]$' }), after: S.opt(AFTER), requires: S.opt(ids), levels, title: S.text(), desc: S.opt(S.text()) }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(AFTER) }))),
  chapter: S.obj({ title: S.text(), question: S.text() }),
})
const LEMMA = S.obj({
  name: S.text(), desc: S.text(), statement: S.opt(SENTENCE), premises: S.opt(SENTENCES), metas: ids, ports: SENTENCES,
  params: S.opt(S.map(S.text(), { about: t('元件上要选的字母的名字', 'the names of the letters chosen on the part') })),
  forms: S.opt(S.list(S.obj({ key: S.str(), label: S.str(), statement: SENTENCE, premises: SENTENCES }), { about: t('一个元件的几种形状', 'the shapes of one part') })),
  card: S.opt(S.oneOf(Object.keys(RULES).filter((k) => !['premise', 'goal'].includes(k)), { about: t('照这张卡跑（它能做得比证出的形状更多）', 'runs as this card (which may do more than the shape proved)') })),
}, { about: t('玩家证出的引理：一个模式，之后当元件用', 'a lemma the player proves: a pattern, a part from then on') })
const FACT = S.obj({ name: S.text(), statement: SENTENCE, desc: S.text(), rule: S.opt(S.obj({ premises: S.list(S.str()), conclusion: S.str() })) })
const GATE = S.obj({ name: S.text(), desc: S.text(), ports: S.list(S.str(), { about: t('门的口，依次接搭出它那一关的字母', 'the gate’s ports, the letters of the level that builds it in order') }) })
const REVISION = S.obj({ at: S.opt(S.level()), by: S.opt(S.level()), desc: S.opt(S.text()), forms: S.opt(ids) })
const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  words: WORDS,
  wordSets: S.map(S.map(S.text()), { about: t('几套词：字母、谓词、名字怎么读（{0}、{1} 是参数）', 'word sets: how letters, predicates and names read ({0}, {1} their arguments)') }),
  primitives: S.list(S.ref('part')),
  concept: S.opt(S.map(S.str(), { about: t('几块元件合起来是一个新想法', 'parts that are one new idea together') })),
  local: S.opt(S.list(PART, { about: t('留在带来它的那一关，不进元件箱', 'parts that stay in the levels that bring them, out of the components box') })),
  machines: S.opt(S.list(S.ref('part'), { about: t('玩家在机器板上搭出的元件', 'the machine parts the player builds') })),
  lemmas: S.map(LEMMA),
  facts: S.opt(S.map(FACT)),
  gates: S.opt(S.map(GATE)),
  revisions: S.opt(S.map(S.list(REVISION), { about: t('元件的说明和形状随课程长', 'how a part’s description and shapes grow along the course') })),
  eras: S.list(ERA, { min: 1 }),
  quotes: S.opt(S.list(S.str(), { about: t('文案里可以直接引用、不用链接的名字', 'names copy may quote rather than link') })),
  saves: SAVES,
})

export const vocabulary = defineVocabulary({
  domain: 'logic',
  version: 1,
  kinds: {
    part: PART_ITEMS,
    kind: KINDS,
    want: WANTS,
    form: FORMS,
  },
  game: GAME,
  level: LEVEL,
  languages: LANGUAGES,
})
