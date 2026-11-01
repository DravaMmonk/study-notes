// The course blueprint (games/DIRECTION.md decision 1, games/DESIGN.md 7.2): the first of a game's three content
// products, written before any level. It is data (games/<id>/blueprint.json, written through the operation set's
// blueprint.put / blueprint.set) and says what the course is made of and why it is in that order:
//
//   the topic, its learner and endpoint, and how far this blueprint goes (scope, deferred)
//   the mechanisms picked from the catalogue (DESIGN 6.5), the machines and the abilities each has (the machine ladder)
//   every new idea with the wall the player hits without it; the primitives, each with why it cannot be wired from
//   what is held; the parts the player builds, each with what it is built from
//   the eras, each a run of series (foundation, practice, topic, challenge; series sharing `parallel` are one parallel
//   set), each series a run of slots: a slot is a level to be, saying what the player does, the idea it brings, the
//   primitives it adds, the part it builds, what its answer stands on (`uses`), the practice dimension it varies
//   the requests the blueprint makes of the domain or the kernel (decision 3), and their status
//
// auditBlueprint(bp) checks the plan by the handbook's course rules (DESIGN 1, 2): one idea a slot, every idea on the
// slot that needs it and soon used again, nothing used before it is there, built parts used later, practice that
// varies, series that do not depend on each other branched, abstraction rising. conformance(bp, content, spec) checks
// a game's levels against its blueprint once they exist. erasOf(bp) is game.json's eras as the blueprint lays them out.
import { S, validate } from '../engine/schema.js'
import { layout } from '../course.js'

const t = (zh, en) => ({ zh, en })
const ID = S.str({ pattern: '^[A-Za-z][A-Za-z0-9_-]*$' })
const SLOT_ID = S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$', about: t('关卡 id（也是将来的文件名）', 'the level id (its file name to be)') })

/** The catalogue's mechanisms (games/DESIGN.md 6.5). */
export const MECHANISMS = ['circuit', 'step-machine', 'tick-bus', 'frame', 'strip', 'table', 'bench', 'audit', 'manual']
/** The practice dimensions (games/DESIGN.md 2.3). */
export const DIMENSIONS = ['surface', 'direction', 'depth', 'scaffold', 'combine', 'false']
const ROLES = ['foundation', 'practice', 'intro', 'step', 'finale', 'challenge']
const KINDS = ['foundation', 'practice', 'topic', 'challenge']

const SLOT = S.obj({
  id: SLOT_ID,
  title: S.text(),
  task: S.text({ about: t('玩家在这一关做什么，一句话', 'what the player does in it, one sentence') }),
  role: S.oneOf(ROLES),
  idea: S.opt(ID),
  adds: S.opt(S.list(ID)),
  builds: S.opt(ID),
  uses: S.list(ID, { about: t('参考解站在哪些元件、想法、能力上', 'the parts, ideas and abilities its answer stands on') }),
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
  ideas: S.list(S.obj({ id: ID, about: S.text(), wall: S.text() })),
  primitives: S.list(S.obj({ part: ID, about: S.text(), why: S.text({ about: t('为什么不能用已有的元件接出来', 'why it cannot be wired from the parts held') }) })),
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
  'bp-adds-idea': 'a slot adds a primitive without naming the idea it brings',
  'bp-placed': 'a primitive has not exactly one slot that brings it, or a built part is built nowhere or by slots that are no chain of upgrades',
  'bp-order': 'a slot (or a built part) stands on something not there yet on every path to it',
  'bp-first-use': 'an idea is not used where it comes in, or not used again before two more ideas arrive',
  'bp-unused': 'a built part no later slot stands on',
  'bp-practice': 'a practice cluster repeats a dimension (padding) or does not end in combine or false',
  'bp-branch': 'a series on the main path needs nothing from the series before it: branch it',
  'bp-parallel': 'a parallel set has one branch or more than three, or one branch needs another',
  'bp-abstraction': 'the last series of an era stands on no part built in it',
  'bp-machine': 'a slot uses an ability its era’s machine lacks',
  'bp-challenge': 'a challenge brings something new or has no naive answer',
  'bp-keeps': 'an era after the first does not say what it keeps',
  'bp-bare': 'a slot only places what it brings (report: a showcase or a real problem?)',
  'bp-lonely': 'an idea on the main path has no practice slot after it (report: is one needed?)',
  'bp-open': 'a request is still open (the domain step resolves it)',
}
/** Rules that are reported for a person to judge, never failed. */
export const REPORTED = new Set(['bp-bare', 'bp-lonely', 'bp-open'])

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
 * is: a slot id, an idea, a part, an era.
 */
export function auditBlueprint(bp) {
  const out = []
  const say = (rule, at, says) => out.push({ rule, at, says, ...(REPORTED.has(rule) ? { report: true } : {}) })
  for (const p of validate(BLUEPRINT, bp)) say('bp-schema', p.at, p.says)
  if (out.length) return out

  const slots = slotsOf(bp)
  const ideas = new Map(bp.ideas.map((i) => [i.id, i]))
  const prims = new Map(bp.primitives.map((p) => [p.part, p]))
  const built = new Map(bp.built.map((b) => [b.part, b]))
  const abilities = new Set(bp.abilities.map((a) => a.id))
  const machines = new Map(bp.machines.map((m) => [m.id, m]))
  const known = (id) => ideas.has(id) || prims.has(id) || built.has(id) || abilities.has(id)

  // Ids are unique: slots, series, and the names ideas, parts and abilities share.
  const seen = new Map()
  for (const [kind, ids] of [['slot', slots.map((s) => s.id)], ['series', bp.eras.flatMap((e) => e.series.map((s) => s.id))], ['name', [...ideas.keys(), ...prims.keys(), ...built.keys(), ...abilities]]]) {
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
    if (s.idea && !ideas.has(s.idea)) say('bp-refs', s.id, `brings the idea ${s.idea}, which is not defined`)
    if (s.builds && !built.has(s.builds)) say('bp-refs', s.id, `builds ${s.builds}, which is no built part`)
    if ((s.adds ?? []).length && !s.idea) say('bp-adds-idea', s.id, `adds ${s.adds.join(', ')} and names no idea`)
  }
  for (const r of bp.requests ?? []) for (const id of r.for) if (!slots.some((s) => s.id === id)) say('bp-refs', r.id, `the request is for ${id}, which is no slot`)
  for (const [i, era] of bp.eras.entries()) if (i > 0 && era.keeps === undefined) say('bp-keeps', `era ${era.id}`, 'it does not say what it keeps')
  if (out.some((f) => f.rule === 'bp-refs' || f.rule === 'bp-unique')) return out

  // Where each thing comes in: the slot that brings an idea or a primitive, the slot that first builds a part. A part
  // may be built again by later slots, each requiring the one before (an upgrade chain, DESIGN 1).
  const { plan, ancestors } = prerequisites(bp)
  const where = new Map()
  for (const [kind, of] of [['primitive', (s) => s.adds ?? []], ['built part', (s) => (s.builds ? [s.builds] : [])], ['idea', (s) => (s.idea ? [s.idea] : [])]]) {
    const at = new Map()
    for (const s of slots) for (const x of of(s)) at.set(x, [...(at.get(x) ?? []), s.id])
    const names = kind === 'primitive' ? prims.keys() : kind === 'built part' ? built.keys() : ideas.keys()
    for (const x of names) {
      const list = at.get(x) ?? []
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
      if (s.idea || (s.adds ?? []).length) say('bp-challenge', s.id, 'a challenge brings something new')
      if (!s.naive) say('bp-challenge', s.id, 'a challenge has no naive answer')
    }
    const plain = s.uses.filter((u) => !abilities.has(u) && u !== s.idea && !(s.adds ?? []).includes(u))
    if ((s.adds ?? []).length && !plain.length && !s.showcase) say('bp-bare', s.id, `its answer stands only on what it brings (${s.adds.join(', ')})`)
  }

  // An idea is used where it comes in, and again (on a slot that has it as a prerequisite) before two more ideas.
  const order = plan.order
  const usesIdea = (s, idea) => s.uses.includes(idea) || s.uses.some((u) => built.has(u) && builtOn(u, idea))
  const builtOn = (part, idea, seenParts = new Set()) => {
    if (seenParts.has(part)) return false
    seenParts.add(part)
    const b = built.get(part)
    return b.from.includes(idea) || where.get(part) && byId.get(where.get(part)).idea === idea || b.from.some((f) => built.has(f) && builtOn(f, idea, seenParts))
  }
  for (const [idea, at] of where) {
    if (!ideas.has(idea)) continue
    const s = byId.get(at)
    if (optional(at)) continue
    if (!usesIdea(s, idea) && !(s.builds && builtOn(s.builds, idea))) say('bp-first-use', at, `brings ${idea} and does not use it`)
    const later = order.filter((id) => ancestors(id).has(at))
    const next = later.find((id) => usesIdea(byId.get(id), idea))
    if (!next) {
      if (later.length) say('bp-first-use', at, `no slot after it uses ${idea}`)
      continue
    }
    const between = later.filter((id) => !optional(id) && byId.get(id).idea && ancestors(next).has(id) && id !== next)
    if (between.length >= 2) say('bp-first-use', at, `${idea} comes back first at ${next}, after ${between.join(', ')} bring two more ideas`)
  }

  for (const [part, at] of where) {
    if (!built.has(part)) continue
    if (!slots.some((s) => s.id !== at && s.uses.includes(part) && ancestors(s.id).has(at))) say('bp-unused', part, `built at ${at}; no later slot stands on it`)
  }

  for (const era of bp.eras) {
    const path = era.series.filter((x) => x.kind === 'foundation' || x.kind === 'practice')
    // A practice cluster: the practice slots after a slot that brings an idea, up to the next idea, on one series run.
    const flat = path.flatMap((x) => x.slots)
    flat.forEach((s, k) => {
      if (!s.idea) return
      const cluster = []
      for (const x of flat.slice(k + 1)) {
        if (x.idea) break
        if (x.role === 'practice') cluster.push(x)
      }
      if (!cluster.length) {
        say('bp-lonely', s.id, `${s.idea} has no practice slot before the next idea`)
        return
      }
      const dims = cluster.map((x) => x.dimension ?? '(none)')
      const twice = dims.filter((d, i) => dims.indexOf(d) !== i)
      if (twice.length) say('bp-practice', s.id, `its practice repeats ${[...new Set(twice)].join(', ')}: ${cluster.map((x) => `${x.id} ${x.dimension ?? '(none)'}`).join(', ')}`)
      if (cluster.length >= 2 && !['combine', 'false'].includes(cluster.at(-1).dimension)) say('bp-practice', s.id, `its practice ends at ${cluster.at(-1).id} on ${cluster.at(-1).dimension ?? 'no dimension'}, not combine or false`)
    })
    // What a run of slots brings, and whether another run stands on any of it.
    const brings = (list) => new Set(list.flatMap((s) => [s.idea, ...(s.adds ?? []), s.builds].filter(Boolean)))
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
}

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
    const adds = [...(level.adds ?? [])].sort()
    if (plain(adds) !== plain([...(s.adds ?? [])].sort())) say('bp-adds', s.id, `adds ${adds.join(', ') || 'nothing'}, its slot ${(s.adds ?? []).join(', ') || 'nothing'}`)
    const builds = level.builds?.type ?? null
    if (builds !== (s.builds ?? null)) say('bp-builds', s.id, `builds ${builds ?? 'nothing'}, its slot ${s.builds ?? 'nothing'}`)
    const at = course.index.get(s.id)
    const needed = new Set(at === undefined ? [] : course.needed(course.levels[at]) ?? [])
    for (const u of s.uses) if (parts.has(u) && !needed.has(u)) say('bp-uses', s.id, `its answer does not use ${u}`)
    if (s.naive && !level.naive) say('bp-naive', s.id, 'its slot has a naive answer, the level none')
  }
  return out
}
