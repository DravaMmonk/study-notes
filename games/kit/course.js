// The rules every course follows, the same in every game. A course starts from a few primitives; every other part is
// built: a level asks the player to build it, and solving that level unlocks it. From then on it is a black box (a
// built-in implementation, for speed) that the validator checks against that level's tests, so the box is exactly
// what the player built. The design behind these rules is games/DESIGN.md.
//
// A course is a run of eras, one per machine (a robot, a camera…). An era's main path runs in order:
//   foundation  teaches the machine's outside abilities, each level unlocking one part
//   practice    problems on what the machine can do, in order of difficulty
//   topics      the era's topic series (one to begin with, side by side if there are more): each opens on a small
//               version of its finale (or one of its core mechanisms alone) and adds one mechanism a level until the
//               finale, the topic's big puzzle
// and beside it
//   challenges  optional: the machine's limits, with nothing new; nothing needs them
// The next era opens at the end of this one's main path (its last finale, or the end of its practice).
//
// eras: [{ id, title?, machine?, foundation: [level id], practice?: [level id], topics?: [{ id, title?, levels: [level id],
//          requires? }], challenges?: [{ level, after? }] }]
// layout(eras) gives the play order, each level's place ({ era, role, topic }) and what it requires; the shell opens
// a level once everything it requires is solved.
//
// defineCourse({
//   levels      [{ id, unlocks: [flag] }]  in play order (layout(eras).order when the course has eras)
//   eras?                                  the course's eras, for the era rules of the audit
//   primitives  [part]                     available from the start
//   palette(level) → [part]                what a level offers
//   needs(part) → flag | null              the flag solving its builder level sets (null: built nowhere)
//   builds(level) → [part]                 the parts solving the level unlocks
//   granted(level) → [part]                parts a level hands out without their builder being solved
//   concept(part) → key                    parts that are one new idea together (a merger's models), by default itself
//   machine(level) → machine | null        the machine a level is played on, checked against its era's
//   uses(level) → [mechanism]              what a level's board relies on (its view, an arm, a scan order…)
//   can(machine) → [mechanism] | null      what a machine can do: a level needs a machine that can do all it uses
//   world(level) → key | null              what a level's world is, the same across a topic
//   naive(level) → bool                    whether a challenge comes with a naive answer that fails
// })
// usable(course, level, flags) is what a level's palette really holds; audit(course) lists every broken rule.

/** Roles of a level within its era. A topic of one level is just its finale. */
export const ROLES = ['foundation', 'practice', 'intro', 'step', 'finale', 'challenge']

/**
 * Play order, places and requirements from a course's eras. An era's foundation and practice run in order after the
 * end of the previous era; each topic opens at the end of the practice (and once any topic it requires is finished)
 * and runs in order to its finale; a challenge opens after the level it hangs on (by default the end of the practice).
 */
export function layout(eras) {
  const order = [], place = new Map(), requires = new Map()
  let before = null // where the previous era ended
  for (const era of eras) {
    const main = [...era.foundation.map((id) => [id, 'foundation']), ...(era.practice ?? []).map((id) => [id, 'practice'])]
    main.forEach(([id, role], k) => {
      order.push(id)
      place.set(id, { era: era.id, role })
      requires.set(id, k ? [main[k - 1][0]] : before ? [before] : [])
    })
    const base = main.at(-1)?.[0] ?? before
    for (const topic of era.topics ?? []) {
      const finales = (topic.requires ?? []).map((t) => era.topics.find((x) => x.id === t)?.levels.at(-1)).filter(Boolean)
      topic.levels.forEach((id, k) => {
        order.push(id)
        const last = k === topic.levels.length - 1
        place.set(id, { era: era.id, role: last ? 'finale' : k ? 'step' : 'intro', topic: topic.id })
        requires.set(id, k ? [topic.levels[k - 1]] : [...(base ? [base] : []), ...finales])
      })
    }
    for (const c of era.challenges ?? []) {
      order.push(c.level)
      place.set(c.level, { era: era.id, role: 'challenge', after: c.after ?? base })
      requires.set(c.level, c.after ?? base ? [c.after ?? base] : [])
    }
    before = (era.topics ?? []).at(-1)?.levels.at(-1) ?? base
  }
  return { order, place, requires }
}

export function defineCourse({ levels, eras = null, primitives, palette, needs, builds, granted = () => [], concept = (p) => p, machine = () => null, uses = () => [], can = () => null, world = () => null, naive = () => true }) {
  const index = new Map(levels.map((l, i) => [l.id, i]))
  const setBy = new Map()
  for (const l of levels) for (const f of l.unlocks ?? []) if (!setBy.has(f)) setBy.set(f, l.id)
  /** The level that builds a part: the first to set the flag it needs. */
  const builder = (part) => (needs(part) ? setBy.get(needs(part)) ?? null : null)
  const plan = eras ? layout(eras) : null
  // Everything solved before a level can open: with eras, what it requires, all the way back; without, every level
  // before it in play order.
  const ancestors = new Map()
  const up = (id) => {
    if (ancestors.has(id)) return ancestors.get(id)
    const set = new Set()
    ancestors.set(id, set)
    if (plan) for (const r of plan.requires.get(id) ?? []) { set.add(r); up(r).forEach((x) => set.add(x)) }
    else levels.slice(0, index.get(id)).forEach((l) => set.add(l.id))
    return set
  }
  return { levels, eras, plan, primitives: new Set(primitives), palette, needs, builds, granted, concept, machine, uses, can, world, naive, index, builder, before: (a, b) => up(b).has(a) }
}

/**
 * The parts a level's palette really holds for a player with `flags` (the unlocks of the levels solved, plus a level's
 * grants): a primitive, a part its builder level has unlocked, and, until the content is fixed, a part no level builds
 * or the level being played builds itself (audit reports both).
 */
export function usable(course, level, flags) {
  return course.palette(level).filter((p) => {
    if (course.primitives.has(p)) return true
    const need = course.needs(p), by = course.builder(p)
    if (!need || !by || by === level.id) return true
    return flags.has(need)
  })
}

/** Every broken rule, as { rule, level, part, text }, in play order. */
export function audit(course) {
  const out = []
  const say = (rule, level, part, text) => out.push({ rule, level, part, text })
  const plan = course.plan
  const levels = course.levels
  // The ideas a level has met: every concept offered on the way to it. A primitive is new where it is first offered; a
  // part the player built is not new where it is first offered after its builder level.
  const met = (id) => new Set(levels.filter((l) => course.before(l.id, id)).flatMap((l) => course.palette(l).map(course.concept)))
  const unbuilt = new Set()
  for (const level of levels) {
    const granted = new Set(course.granted(level))
    const seen = met(level.id)
    const built = (p) => course.builder(p) && course.before(course.builder(p), level.id)
    const fresh = new Set(course.palette(level).filter((p) => !built(p)).map(course.concept).filter((c) => !seen.has(c)))
    const role = plan?.place.get(level.id)?.role
    for (const p of course.palette(level)) {
      if (course.primitives.has(p)) continue
      const by = course.builder(p)
      if (granted.has(p)) say('granted', level.id, p, 'handed out by the level, not built by the player')
      else if (!by) { if (!unbuilt.has(p)) say('not-built', level.id, p, 'no level builds it and it is not a primitive'); unbuilt.add(p) }
      else if (by === level.id) say('own-level', level.id, p, 'offered in the very level that builds it')
      else if (!course.before(by, level.id)) say('built-later', level.id, p, `offered where ${by}, the level that builds it, need not be solved yet`)
    }
    if (role === 'challenge' && fresh.size) say('challenge-new', level.id, [...fresh].join(' '), 'a challenge brings nothing new')
    else if (fresh.size > 1) say('many-new', level.id, [...fresh].join(' '), `${fresh.size} new parts in one level (one new idea per level)`)
  }
  // Every part a level builds must be used later on.
  for (const level of levels) {
    for (const p of course.builds(level)) if (!levels.some((l) => course.before(level.id, l.id) && course.palette(l).includes(p))) say('unused', level.id, p, 'built here but never offered again')
  }
  if (!plan) return out

  // The era rules.
  const placed = new Set(plan.order)
  for (const level of levels) if (!placed.has(level.id)) say('unplaced', level.id, '', 'in no era')
  const eraOf = new Map(course.eras.map((e, i) => [e.id, i]))
  const machines = course.eras.map((e) => e.machine ?? null)
  for (const level of levels) {
    const at = plan.place.get(level.id)
    if (!at) continue
    // A level is played on its era's machine, or an older one: never on one from a later era. Only a topic's opening
    // and middle levels may borrow an older one; the foundation, the practice, a topic's finale and the challenges
    // show what this era's machine can do.
    const m = course.machine(level), k = machines.indexOf(m), own = course.eras.find((e) => e.id === at.era).machine
    if (m && (k < 0 || k > eraOf.get(at.era))) say('machine', level.id, m, `played on ${m}, not a machine of era ${at.era} or before`)
    else if (m && own && m !== own && !['intro', 'step'].includes(at.role)) say('machine-role', level.id, m, `a ${at.role} level of era ${at.era} is played on ${own}, not ${m}`)
    // The machine can do everything the level's board relies on.
    const can = m ? course.can(m) : null
    if (can) { const missing = course.uses(level).filter((x) => !can.includes(x)); if (missing.length) say('mechanism', level.id, missing.join(' '), `${m} cannot do what the board uses`) }
    // Nothing needs a challenge.
    if (at.role === 'challenge') {
      for (const other of levels) if ((plan.requires.get(other.id) ?? []).includes(level.id)) say('challenge-required', other.id, level.id, 'requires a challenge')
      if (!course.naive(level)) say('challenge-naive', level.id, '', 'a challenge needs a naive answer that fails')
    }
  }
  // Every machine's era ends in a topic series.
  for (const era of course.eras) if (era.machine && !(era.topics ?? []).length) say('no-topic', era.foundation[0] ?? era.id, era.machine, `era ${era.id} has no topic series yet`)
  // A topic stays in one world.
  for (const era of course.eras) {
    for (const topic of era.topics ?? []) {
      const worlds = [...new Set(topic.levels.map((id) => course.world(levels.find((l) => l.id === id) ?? { id })).filter(Boolean))]
      if (worlds.length > 1) say('topic-world', topic.levels.at(-1), worlds.join(' '), `topic ${topic.id} spans several worlds`)
    }
  }
  return out
}
