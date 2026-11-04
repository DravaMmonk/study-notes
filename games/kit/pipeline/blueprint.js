// The course blueprint (games/DIRECTION.md decision 1, games/DESIGN.md 7.2): the first of a game's three content
// products, written before any level. It is data (games/<id>/blueprint.json, written through the operation set's
// blueprint.put / blueprint.set) and says what the course is made of and why it is in that order:
//
//   the topic, its learner and endpoint, and how far this blueprint goes (scope, deferred)
//   the mechanisms picked from the catalogue (DESIGN 6.5), the machines and the abilities each has (the machine ladder)
//   the knowledge the course teaches (DESIGN 1, 4.1): each point a piece of the field — its term, what it says, where
//   the sources teach it, the question a learner cannot answer without it (`wall`), the wrong idea it replaces; how
//   hard it is (intuitive points are only mentioned, hard ones reached by a ladder of levels), whether it is a core of
//   its chapter, and what shallower points it is built from (the knowledge graph the levels climb); and
//   its basis: the lectures' theory (the main path: concepts, models, methods) or technical (a library's or a tool's
//   way, a file format, a workshop's recipe: OpenCV's channel order, uint8): taught only off the main path, in an
//   optional topic hung after the theory it applies or after the era's main path ends;
//   the presets and primitives, each with why a code implementation is appropriate; the parts the player builds, each with what
//   it is built from. A primitive is a tool, never a knowledge point: it comes in with the point that needs it (a part
//   the player builds may embody a point: cropping, built as crop).
//   the eras, each a run of series (foundation, practice, topic, challenge; series sharing `parallel` are one parallel
//   set), each series a run of slots: a slot is a level to be, saying what the player does, the question it makes the
//   player answer and the chain of reasoning that answers it, the knowledge point it brings (`teaches`) or the facet
//   of one it practises, the primitives it adds, the part it builds, what its answer stands on (`uses`)
//   the requests the blueprint makes of the domain or the kernel (decision 3), and their status
//
// auditBlueprint(bp) checks the plan by the handbook's course rules (DESIGN 1, 2, 4.1): every slot works on knowledge
// of the field, every point from a source and taught somewhere, one point a slot, every point on the slot that needs
// it and soon used again, nothing used before it is there, built parts used later, practice that shows a new facet,
// series that do not depend on each other branched, abstraction rising. conformance(bp, content, spec) checks
// a game's levels against its blueprint once they exist. erasOf(bp) is game.json's eras as the blueprint lays them out.
import { S, validate } from '../engine/schema.js'
import { layout } from '../course.js'

const t = (zh, en) => ({ zh, en })
const ID = S.str({ pattern: '^[A-Za-z][A-Za-z0-9_-]*$' })
const SLOT_ID = S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$', about: t('关卡 id（也是将来的文件名）', 'the level id (its file name to be)') })

/** The catalogue's mechanisms (games/DESIGN.md 6.5). */
export const MECHANISMS = ['circuit', 'step-machine', 'tick-bus', 'frame', 'strip', 'table', 'bench', 'audit', 'manual']
/** The practice dimensions (games/DESIGN.md 2.3). New numbers alone are no dimension: they are tests or tasks. */
export const DIMENSIONS = ['direction', 'depth', 'scaffold', 'combine', 'false']
const ROLES = ['foundation', 'practice', 'intro', 'step', 'finale', 'challenge']
const KINDS = ['foundation', 'practice', 'topic', 'challenge']

const SLOT = S.obj({
  id: SLOT_ID,
  title: S.text(),
  task: S.text({ about: t('玩家在这一关做什么，一句话', 'what the player does in it, one sentence') }),
  mentions: S.opt(S.list(ID, { about: t('这一关在引言、点题或词条里提到的一听就懂的知识点（intuitive）：不练，只说', 'the intuitive points this level names in its intro, pass text or entries: said, never trained') })),
  question: S.opt(S.text({ about: t('玩家玩这一关是在回答的问题，用本领域的话说（不是操作说明）', 'the question playing it answers, in the field’s words (not an instruction)') })),
  chain: S.opt(S.list(S.text(), { min: 2, about: t('玩家从问题走到答案的思路，一步一句：试了什么、看到什么、因此想到什么；每一步都落在屏幕上能做或能看到的东西上', 'the player’s way from the question to the answer, a step a sentence: what they try, what they see, what it makes them think; every step lands on something on screen') })),
  role: S.oneOf(ROLES),
  teaches: S.opt(S.str({ pattern: '^[A-Za-z][A-Za-z0-9_-]*$', about: t('这一关带来的知识点（knowledge 的 id）；练习关不带新点，它练的点写在 uses 里', 'the knowledge point it brings (a knowledge id); a practice slot brings none, the point it practises is in its uses') })),
  facet: S.opt(S.text({ about: t('练习关：这个知识点的哪一面是前面没见过的（一个约定、一个边界、一种失效）', 'a practice slot: which side of the point the slots before did not show (a convention, an edge, a failure)') })),
  adds: S.opt(S.list(ID)),
  builds: S.opt(ID),
  uses: S.list(ID, { about: t('参考解站在哪些元件、知识点、能力上', 'the parts, knowledge points and abilities its answer stands on') }),
  dimension: S.opt(S.oneOf(DIMENSIONS)),
  naive: S.opt(S.text({ about: t('直觉上的错解：它为什么看起来对、错在哪', 'the intuitive wrong answer: why it looks right, where it fails') })),
  showcase: S.opt(S.text()),
})
const SERIES = S.obj({
  id: ID,
  title: S.text(),
  kind: S.oneOf(KINDS),
  parallel: S.opt(ID),
  after: S.opt(S.either(SLOT_ID, S.list(SLOT_ID))),
  slots: S.list(SLOT, { min: 1 }),
})
const REQUEST = S.obj({
  id: ID,
  kind: S.oneOf(['domain', 'kernel']),
  about: S.text(),
  for: S.list(SLOT_ID),
  status: S.oneOf(['open', 'done', 'declined']),
  note: S.opt(S.text()),
})

export const BLUEPRINT = S.obj({
  topic: S.text(),
  learner: S.text(),
  endpoint: S.text(),
  scope: S.text(),
  sources: S.list(S.str()),
  mechanisms: S.list(S.obj({ id: S.oneOf(MECHANISMS), where: S.text(), why: S.text() }), { min: 1 }),
  abilities: S.list(S.obj({ id: ID, about: S.text() })),
  machines: S.list(S.obj({ id: ID, title: S.text(), can: S.list(ID), lacks: S.text() }), { min: 1 }),
  knowledge: S.list(S.obj({
    id: ID,
    term: S.opt(S.text({ about: t('本领域对它的叫法（课程材料里的术语）；关卡通过时用它命名玩家刚做成的东西', 'what the field calls it (the term the sources use); passing its level names what the player just did by it') })),
    about: S.text({ about: t('它说的是什么，用本领域的话，一两句', 'what it says, in the field’s words, a sentence or two') }),
    source: S.opt(S.str({ about: t('课程材料里讲它的地方：sources 里的一个文件，加章节、页或幻灯片', 'where the sources teach it: a file of `sources`, with its section, page or slide') })),
    wall: S.text({ about: t('不懂它就答不上的那个问题：带来它的那一关就是这堵墙', 'the question a learner cannot answer without it: the slot that brings it is that wall') }),
    misconception: S.opt(S.text({ about: t('它要纠正的直觉错误；带来它的那一关的 naive 答案就是这个错误', 'the intuitive wrong idea it replaces; the naive answer of the slot that brings it is that idea') })),
    difficulty: S.opt(S.oneOf(['intuitive', 'learnable', 'hard'], { about: t('intuitive：一句话就懂、符合直觉，没有值得练的东西，只在文案和词条里提到（slot 的 mentions），不做成关；learnable：要一个例子或一关练习才会；hard：抽象、离日常远、名词难懂，要从更浅的知识点起一串关逐步逼近', 'intuitive: understood from a sentence, in line with intuition, nothing worth training: only mentioned in copy and entries (a slot’s mentions), never a level; learnable: needs an example or a level of practice; hard: abstract, far from daily life, hard-named: reached by a series of levels from shallower points') })),
    core: S.opt(S.bool({ about: t('这一章的核心：讲义花力气讲、后面的章建在它上面、学生容易错的那几个；章的关卡大多是通往它的阶梯', 'a core of its chapter: what the lectures spend effort on, later chapters stand on and students get wrong; most of the chapter’s levels are ladders up to it') })),
    depends: S.opt(S.list(ID, { about: t('它由哪些更浅的知识点搭成：自下而上的知识图，难点拆到最浅的原点', 'the shallower points it is built from: the knowledge graph bottom up, a hard point taken down to its origins') })),
    basis: S.opt(S.oneOf(['lecture', 'technical'], { about: t('lecture：讲义里的理论（概念、模型、方法），主线只教它；technical：技术内容（库和工具的做法、文件格式、实验课的做法：OpenCV 的通道顺序、uint8），只在主线之外的可选专题里教：挂在它要用的理论之后，或这一章主线走完之后', 'lecture: the lectures’ theory (a concept, model or method), all the main path teaches; technical: a library’s or a tool’s way, a file format, a workshop’s recipe (OpenCV’s channel order, uint8), taught only off the main path, in an optional topic hung after the theory it applies or after the era’s main path ends') })),
  }), { min: 1, about: t('课程要教的本领域知识；元件是工具，不是知识点', 'the field knowledge the course teaches; a primitive is a tool, not a knowledge point') }),
  primitives: S.list(S.obj({ part: ID, about: S.text(), why: S.text({ about: t('为什么使用代码预设或基础元件，而不是保存玩家的实现', 'why a code preset or primitive is appropriate instead of a learner implementation') }) })),
  built: S.list(S.obj({ part: ID, about: S.text(), from: S.list(ID) })),
  eras: S.list(S.obj({
    id: S.int(),
    machine: ID,
    keeps: S.opt(S.either(S.oneOf(['all']), S.list(ID))),
    title: S.text(),
    question: S.text(),
    why: S.text({ about: t('上一台机器为什么不够；第一章：从哪里起步', 'why the machine before is not enough; the first era: where it starts') }),
    series: S.list(SERIES, { min: 1 }),
  }), { min: 1 }),
  parallel: S.opt(S.list(S.obj({ id: ID, why: S.text() }))),
  requests: S.opt(S.list(REQUEST)),
  deferred: S.opt(S.list(S.obj({ about: S.text(), why: S.text() }))),
})

/** The rules of the blueprint audit, by id: what each means (a finding names one). */
export const BLUEPRINT_RULES = {
  'bp-schema': 'the blueprint does not fit its schema',
  'bp-unique': 'an id is used twice',
  'bp-refs': 'names something the blueprint does not define',
  'bp-point': 'a knowledge point without its term, its source, its basis (lecture or technical) or its difficulty',
  'bp-trivial': 'a slot brings or practises an intuitive point: what a sentence makes plain is mentioned, never trained',
  'bp-mentioned': 'an intuitive point no slot mentions, or a slot mentions what is not intuitive',
  'bp-depends': 'a point is brought before a point it depends on, on some path to it (the knowledge graph runs bottom up)',
  'bp-shallow': 'a hard point is reached in one jump: fewer than two points it is built from are taught before it',
  'bp-core-none': 'an era names no core point',
  'bp-ladder': 'fewer than half the main-path slots of an era are on the ladders up to its core points (report: are the levels where the difficulty is?)',
  'bp-main-tech': 'a slot on the main path (foundation or practice) brings or uses a technical point: technical content is only in optional topics',
  'bp-source': 'a knowledge point cites no file of the blueprint’s sources',
  'bp-question': 'a slot without the question it answers, or without a chain of at least two steps to the answer',
  'bp-knowledge': 'a slot works on no knowledge point: it neither brings one nor uses one (filler)',
  'bp-taught': 'a knowledge point no slot brings',
  'bp-adds-teaches': 'a slot adds a primitive without bringing the knowledge point that needs it (a part is a tool, never a level’s point)',
  'bp-facet': 'a practice slot does not say which new facet of its point it shows',
  'bp-part-point': 'a knowledge point is a primitive (its id or term is a primitive’s id or name): a tool is not knowledge',
  'bp-placed': 'a primitive has not exactly one slot that brings it, or a built part is built nowhere or by slots that are no chain of upgrades',
  'bp-order': 'a slot (or a built part) stands on something not there yet on every path to it',
  'bp-first-use': 'a knowledge point is not used where it comes in',
  'bp-reuse': 'a knowledge point is not used again before two more points arrive, or not at all on the main path after it (report: is it reused through a part, or linked back to later?)',
  'bp-unused': 'a built part no later slot stands on',
  'bp-practice': 'a practice cluster repeats a dimension (padding) or does not end in combine or false',
  'bp-branch': 'a series on the main path needs nothing from the series before it: branch it',
  'bp-parallel': 'a parallel set has one branch or more than three, or one branch needs another',
  'bp-abstraction': 'the last series of an era stands on no part built in it',
  'bp-machine': 'a slot uses an ability its era’s machine lacks',
  'bp-challenge': 'a challenge brings something new or has no naive answer',
  'bp-keeps': 'an era after the first does not say what it keeps',
  'bp-bare': 'a slot only places what it brings (report: a showcase or a real problem?)',
  'bp-lonely': 'a knowledge point on the main path has no practice slot after it (report: are its tasks and tests practice enough?)',
  'bp-heavy': 'a point that is not hard takes more than four slots (report: is every one a new facet, or padding?)',
  'bp-open': 'a request is still open (the domain step resolves it)',
}
/** Rules that are reported for a person to judge, never failed. */
export const REPORTED = new Set(['bp-bare', 'bp-lonely', 'bp-heavy', 'bp-ladder', 'bp-open', 'bp-reuse'])

/** Every slot of the blueprint with its era and series, in the order the eras list them. */
export const slotsOf = (bp) => bp.eras.flatMap((era) => era.series.flatMap((series) => series.slots.map((slot) => ({ ...slot, era, series }))))

/** game.json's eras as the blueprint lays them out (games/kit/course.js layout). */
export function erasOf(bp) {
  return bp.eras.map((era) => {
    const foundation = []
    const topics = []
    const challenges = []
    for (const series of era.series) {
      const levels = series.slots.map((s) => s.id)
      if (series.kind === 'topic') topics.push({ id: series.id, title: series.title, levels, ...(series.after ? { after: series.after } : {}) })
      else if (series.kind === 'challenge') challenges.push(...levels.map((level) => ({ level, ...(series.after ? { after: series.after } : {}) })))
      else if (series.parallel) {
        const last = foundation.at(-1)
        const branch = { id: series.id, title: series.title, levels }
        if (last && typeof last === 'object' && last.set === series.parallel) last.parallel.push(branch)
        else foundation.push({ set: series.parallel, parallel: [branch] })
      } else foundation.push(...levels)
    }
    return {
      id: era.id,
      ...(era.keeps !== undefined ? { keeps: era.keeps } : {}),
      title: era.title,
      question: era.question,
      foundation: foundation.map((item) => (typeof item === 'string' ? item : { parallel: item.parallel })),
      ...(topics.length ? { topics } : {}),
      ...(challenges.length ? { challenges } : {}),
    }
  })
}

/** What every slot requires, one step up, as the course will lay it out; and whether `a` comes before `b`. */
function prerequisites(bp) {
  const plan = layout(erasOf(bp))
  const memo = new Map()
  const ancestors = (id) => {
    if (!memo.has(id)) {
      memo.set(id, new Set())
      const all = new Set()
      for (const r of plan.requires.get(id) ?? []) {
        all.add(r)
        for (const x of ancestors(r)) all.add(x)
      }
      memo.set(id, all)
    }
    return memo.get(id)
  }
  return { plan, ancestors }
}

/**
 * The blueprint audit: [{ rule, at, says, report? }] (report: for a person to judge, not a failure). `at` is where it
 * is: a slot id, a knowledge point, a part, an era.
 */
export function auditBlueprint(bp) {
  const out = []
  const say = (rule, at, says) => out.push({ rule, at, says, ...(REPORTED.has(rule) ? { report: true } : {}) })
  for (const p of validate(BLUEPRINT, bp)) say('bp-schema', p.at, p.says)
  if (out.length) return out

  const slots = slotsOf(bp)
  const points = new Map(bp.knowledge.map((k) => [k.id, k]))
  const prims = new Map(bp.primitives.map((p) => [p.part, p]))
  const built = new Map(bp.built.map((b) => [b.part, b]))
  const abilities = new Set(bp.abilities.map((a) => a.id))
  const machines = new Map(bp.machines.map((m) => [m.id, m]))
  const known = (id) => points.has(id) || prims.has(id) || built.has(id) || abilities.has(id)

  // Ids are unique: slots, series, and the names knowledge points, parts and abilities share.
  const seen = new Map()
  for (const [kind, ids] of [['slot', slots.map((s) => s.id)], ['series', bp.eras.flatMap((e) => e.series.map((s) => s.id))], ['name', [...points.keys(), ...prims.keys(), ...built.keys(), ...abilities]]]) {
    for (const id of ids) {
      const key = `${kind}:${id}`
      if (seen.has(key)) say('bp-unique', id, `the ${kind} id ${id} is used twice`)
      seen.set(key, true)
    }
  }

  for (const m of bp.machines) for (const a of m.can) if (!abilities.has(a)) say('bp-refs', m.id, `the machine ${m.id} can ${a}, which is no ability`)
  for (const era of bp.eras) if (!machines.has(era.machine)) say('bp-refs', `era ${era.id}`, `the machine ${era.machine} is not defined`)
  for (const b of bp.built) for (const f of b.from) if (!known(f)) say('bp-refs', b.part, `built from ${f}, which is not defined`)
  for (const s of slots) {
    for (const u of s.uses) if (!known(u)) say('bp-refs', s.id, `uses ${u}, which is not defined`)
    for (const a of s.adds ?? []) if (!prims.has(a)) say('bp-refs', s.id, `adds ${a}, which is no primitive`)
    if (s.teaches && !points.has(s.teaches)) say('bp-refs', s.id, `brings the knowledge point ${s.teaches}, which is not defined`)
    for (const m of s.mentions ?? []) if (!points.has(m)) say('bp-refs', s.id, `mentions ${m}, which is no knowledge point`)
    if (s.builds && !built.has(s.builds)) say('bp-refs', s.id, `builds ${s.builds}, which is no built part`)
    if ((s.adds ?? []).length && !s.teaches) say('bp-adds-teaches', s.id, `adds ${s.adds.join(', ')} and brings no knowledge point that needs it`)
    const challenge = s.role === 'challenge' || s.series.kind === 'challenge'
    if (!s.teaches && !challenge && !s.uses.some((u) => points.has(u))) say('bp-knowledge', s.id, 'it neither brings a knowledge point nor uses one')
    if (s.role === 'practice' && !s.facet) say('bp-facet', s.id, 'a practice slot without the facet it shows')
    // The main path teaches the lectures' theory only; technical content lives in optional topics.
    const technical = (id) => points.get(id)?.basis === 'technical'
    const tech = [s.teaches, ...s.uses].filter(technical)
    if (['foundation', 'practice'].includes(s.series.kind) && tech.length) say('bp-main-tech', s.id, `on the main path, it ${technical(s.teaches) ? 'brings' : 'uses'} ${tech.join(', ')}`)
    if (!s.question || !s.chain) say('bp-question', s.id, `it has no ${[!s.question && 'question', !s.chain && 'chain'].filter(Boolean).join(' and no ')}`)
  }
  for (const r of bp.requests ?? []) for (const id of r.for) if (!slots.some((s) => s.id === id)) say('bp-refs', r.id, `the request is for ${id}, which is no slot`)
  for (const k of bp.knowledge) for (const d of k.depends ?? []) if (!points.has(d)) say('bp-refs', k.id, `depends on ${d}, which is no knowledge point`)
  // Knowledge comes from the sources, and is knowledge: a primitive is a tool, not a point. (A built part may embody a
  // point the player builds: cropping is built as crop.)
  const low = (x) => String(x ?? '').trim().toLowerCase()
  const toolNames = new Set(bp.primitives.flatMap((p) => [p.part, p.about?.zh, p.about?.en].map(low)).filter(Boolean))
  for (const k of bp.knowledge) {
    if (!k.term || !k.source || !k.basis || !k.difficulty) {
      say('bp-point', k.id, `it has no ${[!k.term && 'term', !k.source && 'source', !k.basis && 'basis', !k.difficulty && 'difficulty'].filter(Boolean).join(' and no ')}`)
      continue
    }
    if (!bp.sources.some((src) => k.source.startsWith(src))) say('bp-source', k.id, `cites ${k.source}, no file of the sources`)
    if ([k.id, k.term.zh, k.term.en].map(low).some((n) => toolNames.has(n))) say('bp-part-point', k.id, 'it is named as a primitive')
  }
  for (const [i, era] of bp.eras.entries()) if (i > 0 && era.keeps === undefined) say('bp-keeps', `era ${era.id}`, 'it does not say what it keeps')
  if (out.some((f) => f.rule === 'bp-refs' || f.rule === 'bp-unique')) return out

  // Where each thing comes in: the slot that brings a knowledge point or a primitive, the slot that first builds a part. A part
  // may be built again by later slots, each requiring the one before (an upgrade chain, DESIGN 1).
  const { plan, ancestors } = prerequisites(bp)
  const where = new Map()
  for (const [kind, of] of [['primitive', (s) => s.adds ?? []], ['built part', (s) => (s.builds ? [s.builds] : [])], ['knowledge point', (s) => (s.teaches ? [s.teaches] : [])]]) {
    const at = new Map()
    for (const s of slots) for (const x of of(s)) at.set(x, [...(at.get(x) ?? []), s.id])
    const names = kind === 'primitive' ? prims.keys() : kind === 'built part' ? built.keys() : points.keys()
    for (const x of names) {
      const list = at.get(x) ?? []
      if (kind === 'knowledge point' && !list.length) {
        if (points.get(x).difficulty !== 'intuitive') say('bp-taught', x, 'no slot brings it')
        continue
      }
      const chain = kind === 'built part' && list.length > 1 && list.every((id, k) => !k || ancestors(id).has(list[k - 1]))
      if (list.length !== 1 && !chain) say('bp-placed', x, list.length ? `the ${kind} ${x} comes in at ${list.join(', ')}${kind === 'built part' ? ', not a chain of upgrades' : ''}` : `no slot brings the ${kind} ${x}`)
      else where.set(x, list[0])
    }
  }

  const role = (id) => plan.place.get(id)?.role
  const optional = (id) => ['intro', 'step', 'finale', 'challenge'].includes(role(id))
  const byId = new Map(slots.map((s) => [s.id, s]))
  // What a slot holds: whatever came in at it or on every path to it, and its machine's abilities.
  const holds = (s, x) => {
    if (abilities.has(x)) return machines.get(s.era.machine)?.can.includes(x)
    const at = where.get(x)
    return at === s.id ? !built.has(x) : at !== undefined && ancestors(s.id).has(at)
  }
  for (const s of slots) {
    for (const u of s.uses) {
      if (abilities.has(u)) {
        if (!holds(s, u)) say('bp-machine', s.id, `uses the ability ${u}, which the machine ${s.era.machine} lacks`)
      } else if (!holds(s, u)) say('bp-order', s.id, `uses ${u}, which ${where.has(u) ? `comes in at ${where.get(u)}, not on every path to it` : 'comes in nowhere'}`)
    }
    if (s.builds) for (const f of built.get(s.builds).from) if (!holds(s, f) && where.get(f) !== s.id) say('bp-order', s.builds, `built at ${s.id} from ${f}, which is not there yet`)
    if (s.role === 'challenge' || s.series.kind === 'challenge') {
      if (s.teaches || (s.adds ?? []).length) say('bp-challenge', s.id, 'a challenge brings something new')
      if (!s.naive) say('bp-challenge', s.id, 'a challenge has no naive answer')
    }
    const plain = s.uses.filter((u) => !abilities.has(u) && u !== s.teaches && !(s.adds ?? []).includes(u))
    if ((s.adds ?? []).length && !plain.length && !s.showcase) say('bp-bare', s.id, `its answer stands only on what it brings (${s.adds.join(', ')})`)
  }

  // A point is used where it comes in, and again (on a slot that has it as a prerequisite) before two more points.
  const order = plan.order
  const usesPoint = (s, point) => s.uses.includes(point) || s.uses.some((u) => built.has(u) && builtOn(u, point))
  const builtOn = (part, point, seenParts = new Set()) => {
    if (seenParts.has(part)) return false
    seenParts.add(part)
    const b = built.get(part)
    return b.from.includes(point) || where.get(part) && byId.get(where.get(part)).teaches === point || b.from.some((f) => built.has(f) && builtOn(f, point, seenParts))
  }
  for (const [point, at] of where) {
    if (!points.has(point)) continue
    const s = byId.get(at)
    if (optional(at)) continue
    if (!usesPoint(s, point) && !(s.builds && builtOn(s.builds, point))) say('bp-first-use', at, `brings ${point} and does not use it`)
    const later = order.filter((id) => ancestors(id).has(at))
    const next = later.find((id) => usesPoint(byId.get(id), point))
    if (!next) {
      // An optional topic hung after it (an extension once the main path ends) need not use it.
      if (later.some((id) => !optional(id))) say('bp-reuse', at, `no slot after it uses ${point}`)
      continue
    }
    const between = later.filter((id) => !optional(id) && byId.get(id).teaches && ancestors(next).has(id) && id !== next)
    if (between.length >= 2) say('bp-reuse', at, `${point} comes back first at ${next}, after ${between.join(', ')} bring two more points`)
  }
  // A point that is not hard and takes many slots: each must be a facet of its own, never the same puzzle again.
  for (const k of bp.knowledge) {
    const on = slots.filter((s) => s.teaches === k.id || (s.role === 'practice' && s.uses.includes(k.id)))
    if (k.difficulty !== 'hard' && on.length > 4) say('bp-heavy', k.id, `${on.length} slots: ${on.map((s) => s.id).join(', ')}`)
  }

  // Where the levels go: by how hard and how central a point is, never to cover everything (DESIGN 1, 4.1).
  const level = (id) => points.get(id)?.difficulty
  for (const s of slots) {
    if (level(s.teaches) === 'intuitive' || (s.role === 'practice' && s.uses.some((u) => level(u) === 'intuitive') && !s.uses.some((u) => points.has(u) && level(u) !== 'intuitive'))) say('bp-trivial', s.id, `it trains ${s.teaches ?? s.uses.find((u) => level(u) === 'intuitive')}, which a sentence makes plain`)
    for (const m of s.mentions ?? []) if (points.has(m) && level(m) !== 'intuitive') say('bp-mentioned', s.id, `mentions ${m}, which is not intuitive: teach it`)
  }
  for (const k of bp.knowledge) if (k.difficulty === 'intuitive' && !slots.some((s) => (s.mentions ?? []).includes(k.id))) say('bp-mentioned', k.id, 'an intuitive point no slot mentions')
  // The graph runs bottom up: what a point is built from comes first, on every path (a mention counts for an
  // intuitive one); a hard point stands on at least two points taught before it.
  const before = (s, d) => (level(d) === 'intuitive' ? slots.some((x) => (x.mentions ?? []).includes(d) && (x.id === s.id || ancestors(s.id).has(x.id))) : where.has(d) && ancestors(s.id).has(where.get(d)))
  const closure = (id, seenIds = new Set()) => {
    for (const d of points.get(id)?.depends ?? []) if (!seenIds.has(d)) { seenIds.add(d); closure(d, seenIds) }
    return seenIds
  }
  for (const [point, at] of where) {
    if (!points.has(point)) continue
    const s = byId.get(at)
    for (const d of points.get(point).depends ?? []) if (points.has(d) && !before(s, d)) say('bp-depends', at, `brings ${point} before ${d}, which it is built from`)
    if (points.get(point).difficulty === 'hard') {
      const steps = [...closure(point)].filter((d) => level(d) !== 'intuitive' && where.has(d) && ancestors(at).has(where.get(d)))
      if (steps.length < 2) say('bp-shallow', at, `brings the hard point ${point} on ${steps.length ? steps.join(', ') : 'nothing taught before it'}: take it apart into steps`)
    }
  }
  for (const era of bp.eras) {
    const own = era.series.flatMap((x) => x.slots.map((s) => s.teaches)).filter((id) => points.get(id)?.core)
    if (!own.length) {
      say('bp-core-none', `era ${era.id}`, 'it names no core point')
      continue
    }
    const ladder = new Set(own.flatMap((c) => [c, ...closure(c)]))
    const main = era.series.filter((x) => x.kind === 'foundation' || x.kind === 'practice').flatMap((x) => x.slots)
    const on = main.filter((s) => ladder.has(s.teaches) || (s.role === 'practice' && s.uses.some((u) => ladder.has(u))))
    if (main.length && on.length * 2 < main.length) say('bp-ladder', `era ${era.id}`, `${on.length} of ${main.length} main-path slots are on the ladders to ${own.join(', ')}`)
  }

  for (const [part, at] of where) {
    if (!built.has(part)) continue
    if (!slots.some((s) => s.id !== at && s.uses.includes(part) && ancestors(s.id).has(at))) say('bp-unused', part, `built at ${at}; no later slot stands on it`)
  }

  for (const era of bp.eras) {
    const path = era.series.filter((x) => x.kind === 'foundation' || x.kind === 'practice')
    // A practice cluster: the practice slots after a slot that brings a point, up to the next point, on one series run.
    const flat = path.flatMap((x) => x.slots)
    flat.forEach((s, k) => {
      if (!s.teaches) return
      const cluster = []
      for (const x of flat.slice(k + 1)) {
        if (x.teaches) break
        if (x.role === 'practice') cluster.push(x)
      }
      if (!cluster.length) {
        say('bp-lonely', s.id, `${s.teaches} has no practice slot before the next point`)
        return
      }
      const dims = cluster.map((x) => x.dimension ?? '(none)')
      const twice = dims.filter((d, i) => dims.indexOf(d) !== i)
      if (twice.length) say('bp-practice', s.id, `its practice repeats ${[...new Set(twice)].join(', ')}: ${cluster.map((x) => `${x.id} ${x.dimension ?? '(none)'}`).join(', ')}`)
      if (cluster.length >= 2 && !['combine', 'false'].includes(cluster.at(-1).dimension)) say('bp-practice', s.id, `its practice ends at ${cluster.at(-1).id} on ${cluster.at(-1).dimension ?? 'no dimension'}, not combine or false`)
    })
    // What a run of slots brings, and whether another run stands on any of it.
    const brings = (list) => new Set(list.flatMap((s) => [s.teaches, ...(s.adds ?? []), s.builds].filter(Boolean)))
    const needs = (list, from) => list.some((s) => s.uses.some((u) => from.has(u) || (built.has(u) && built.get(u).from.some((f) => from.has(f)))) || (s.builds && built.get(s.builds).from.some((f) => from.has(f))))
    // Consecutive series on the main path outside any parallel set: the later must need the earlier.
    for (let k = 1; k < path.length; k++) {
      const [a, b] = [path[k - 1], path[k]]
      if (a.parallel || b.parallel) continue
      if (!needs(b.slots, brings(a.slots))) say('bp-branch', b.id, `stands on nothing ${a.id} brings: put them in a parallel set, or hang ${b.id} where it is needed`)
    }
    const sets = new Map()
    for (const x of path) if (x.parallel) sets.set(x.parallel, [...(sets.get(x.parallel) ?? []), x])
    for (const [id, branches] of sets) {
      if (branches.length < 2 || branches.length > 3) say('bp-parallel', id, `has ${branches.length} branches`)
      for (const a of branches) for (const b of branches) if (a !== b && needs(b.slots, brings(a.slots))) say('bp-parallel', id, `${b.id} stands on what ${a.id} brings: they are not independent`)
    }
    const madeHere = new Set(era.series.flatMap((x) => x.slots.map((s) => s.builds).filter(Boolean)))
    const last = path.at(-1)
    if (madeHere.size && last && !last.slots.some((s) => s.uses.some((u) => madeHere.has(u)))) say('bp-abstraction', last.id, `stands on none of ${[...madeHere].join(', ')}`)
  }

  for (const r of bp.requests ?? []) if (r.status === 'open') say('bp-open', r.id, `${r.kind} request open: ${r.about.en ?? r.about}`)
  return out
}

/**
 * The blueprint with slot `from` renamed `to`, wherever it names it (a level renamed: ops level.rename). When the
 * blueprint has a slot `to` already, the level is moving to a slot the blueprint planned, and the blueprint stays.
 */
export function renameSlot(bp, from, to) {
  if (slotsOf(bp).some((s) => s.id === to)) return bp
  const one = (id) => (id === from ? to : id)
  const many = (v) => (Array.isArray(v) ? v.map(one) : v === undefined ? v : one(v))
  return {
    ...bp,
    eras: bp.eras.map((era) => ({ ...era, series: era.series.map((x) => ({ ...x, ...(x.after !== undefined ? { after: many(x.after) } : {}), slots: x.slots.map((slot) => ({ ...slot, id: one(slot.id) })) })) })),
    ...(bp.requests ? { requests: bp.requests.map((r) => ({ ...r, for: r.for.map(one) })) } : {}),
  }
}

/** The rules a game's levels are checked by against its blueprint (conformance). */
export const CONFORMANCE_RULES = {
  'bp-levels': 'a slot has no level, or a level no slot',
  'bp-eras': 'game.json’s eras are not the blueprint’s (npm run pipeline -- <game> eras prints them)',
  'bp-primitives': 'game.json’s primitives are not the blueprint’s',
  'bp-adds': 'a level adds other parts than its slot',
  'bp-builds': 'a level builds another part than its slot, or none',
  'bp-uses': 'a level’s reference answer leaves out a part its slot stands on',
  'bp-naive': 'a slot with a naive answer whose level has none',
  'bp-entry': 'a knowledge point has no encyclopedia entry of its id (a lecture point’s opened at the level that brings it)',
  'bp-term': 'the level that brings a knowledge point (or mentions an intuitive one) does not link its entry where the player reads it',
  'bp-main-link': 'a main-path level links a technical point’s entry: the main path stays free of technical content',
}

/** Every text of a level, its tasks' included, as plain strings. */
const textsOf = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(textsOf) : v && typeof v === 'object' ? Object.values(v).flatMap(textsOf) : [])

/**
 * A game's levels against its blueprint: [{ rule, at, says }]. content: the game (../engine/content.js); spec: its
 * domain's spec (for what each reference answer uses: course.needed).
 */
export function conformance(bp, content, spec) {
  const out = []
  const say = (rule, at, says) => out.push({ rule, at, says })
  const slots = slotsOf(bp)
  const levels = new Map(content.levels.map((l) => [l.id, l]))
  for (const s of slots) if (!levels.has(s.id)) say('bp-levels', s.id, 'the slot has no level')
  for (const id of levels.keys()) if (!slots.some((s) => s.id === id)) say('bp-levels', id, 'the level is in no slot')
  const plain = (v) => JSON.stringify(v)
  if (plain(erasOf(bp)) !== plain(content.eras)) say('bp-eras', 'game.json', 'its eras differ from the blueprint’s')
  const prims = bp.primitives.map((p) => p.part).sort()
  if (plain(prims) !== plain([...(content.primitives ?? [])].sort())) say('bp-primitives', 'game.json', `the blueprint has ${prims.join(', ')}`)
  const parts = new Set([...bp.primitives.map((p) => p.part), ...bp.built.map((b) => b.part)])
  const course = spec.course
  for (const s of slots) {
    const level = levels.get(s.id)
    if (!level) continue
    const adds = [...new Set([...(level.adds ?? []), ...(level.tasks ?? []).flatMap((t) => t.adds ?? [])])].sort()
    if (plain(adds) !== plain([...(s.adds ?? [])].sort())) say('bp-adds', s.id, `adds ${adds.join(', ') || 'nothing'}, its slot ${(s.adds ?? []).join(', ') || 'nothing'}`)
    const builds = level.builds?.type ?? null
    if (builds !== (s.builds ?? null)) say('bp-builds', s.id, `builds ${builds ?? 'nothing'}, its slot ${s.builds ?? 'nothing'}`)
    const at = course.index.get(s.id)
    const needed = new Set(at === undefined ? [] : course.needed(course.levels[at]) ?? [])
    for (const u of s.uses) if (parts.has(u) && !needed.has(u)) say('bp-uses', s.id, `its answer does not use ${u}`)
    if (s.naive && !(level.tasks ?? [level]).some((task) => task.naive)) say('bp-naive', s.id, 'its slot has a naive answer, no task of the level has one')
    // The point a level brings is named by the field's term, linked to its entry, where the player reads it; a level on
    // the main path links no technical point's entry.
    const { title, intro, after, note, tasks, brief, hint } = level
    const read = textsOf({ title, intro, after, note, tasks, brief, hint })
    const entryOf = (id) => (content.glossary?.entries ?? []).find((e) => e.id === id)
    if (s.teaches) {
      const entry = entryOf(s.teaches)
      if (!entry || entry.at !== s.id) say('bp-entry', s.teaches, entry ? `its entry opens at ${entry.at}, not ${s.id}` : 'no entry of its id')
      if (!read.some((x) => x.includes(`wiki-ref to="${s.teaches}"`))) say('bp-term', s.id, `links no <wiki-ref to="${s.teaches}">`)
    }
    for (const m of s.mentions ?? []) {
      if (!entryOf(m)) say('bp-entry', m, 'no entry of its id')
      if (!read.some((x) => x.includes(`wiki-ref to="${m}"`))) say('bp-term', s.id, `mentions ${m} and links no <wiki-ref to="${m}">`)
    }
    if (['foundation', 'practice'].includes(s.series.kind)) {
      for (const k of bp.knowledge) if (k.basis === 'technical' && read.some((x) => x.includes(`wiki-ref to="${k.id}"`))) say('bp-main-link', s.id, `links the technical entry ${k.id}`)
    }
  }
  return out
}
