// The rules every course follows, the same in every game. A course starts from a few primitives; every other part is
// built: a level asks the player to build it, and solving that level unlocks it. From then on it is a black box (a
// built-in implementation, for speed) that the validator checks against that level's tests, so the box is exactly
// what the player built. The design behind these rules is games/DESIGN.md.
//
// A course is a run of eras, one per machine (a robot, a camera…). Its levels make a tree:
//   main path   the foundation (the machine's outside abilities, each level unlocking one part), then the practice
//               (problems in order of difficulty). Both run in order, and the next era opens at its end.
//               An item of the main path is a level id, or a set of branches the player takes in any order, every
//               one of them before the path goes on: { parallel: [{ id, title?, levels: [level id] }] }. A branch of
//               one is a titled stretch of the path: a series the levels after it need.
//   topics      optional series: each opens on a small version of its finale (or one of its core mechanisms alone)
//               and adds one mechanism a level until the finale. It hangs after the level it needs (`after`, by
//               default the end of the main path) and nothing on the main path waits for it.
//   challenges  optional: the machine's limits, with nothing new; each hangs after a level (`after`, by default the
//               end of the main path) and nothing needs them.
// A branch hangs as early as what it needs allows: once the parts and ideas it uses are in hand.
//
// eras: [{ id, title?, machine?, keeps?: 'all' | [part], foundation: [item], practice?: [item], topics?: [{ id, title?,
//          levels: [level id], after?, requires? }], challenges?: [{ level, after? }] }]
// A branch's `after` is a level, or several when it needs the ends of a parallel set's branches but not the rest; a
// topic may also name levels of earlier eras there (a topic that goes on from one in an earlier chapter): it requires
// them, and hangs on its own era's track at its last `after`.
// Within an era every part, once met, is in every later level of it. Between eras it is the era's call, and every era
// after the first must make it (audit `era-keeps`): keeps: 'all' when it carries on from the eras before it (the same
// machine extended or upgraded), keeps: [part…] when it changes topic and takes only those parts across ([] for none).
// layout(eras) gives the play order, each level's place ({ era, role, topic | branch }), what it requires and each
// era's track for the map; the shell opens a level once everything it requires is solved.
//
// defineCourse({
//   levels      [{ id, unlocks: [flag] }]  in play order (layout(eras).order when the course has eras)
//   eras?                                  the course's eras, for the era rules of the audit
//   primitives  [part]                     available from the start
//   adds(level) → [part]                   the parts a level brings in (everything else carries, see reach)
//   needs(part) → flag | null              the flag solving its builder level sets (null: built nowhere)
//   builds(level) → [part]                 the parts solving the level unlocks
//   granted(level) → [part]                parts a level hands out without their builder being solved
//   concept(part) → key | null             parts that are one new idea together (a merger's models), by default itself;
//                                          null for a part that is never a new idea (a level's own givens: its axioms)
//   machine(level) → machine | null        the machine a level is played on, checked against its era's
//   uses(level) → [mechanism]              what a level's board relies on (its view, an arm, a scan order…)
//   can(machine) → [mechanism] | null      what a machine can do: a level needs a machine that can do all it uses
//   world(level) → key | null              what a level's world is, the same across a topic
//   naive(level) → bool                    whether a challenge comes with a naive answer that fails
//   replaces(part) → [part]                the parts it supersedes: an upgrade, or a merger of several into one
//   local(part) → bool                     a part that stays in the levels that bring it (`adds`, or a board's preset):
//                                          solving them never unlocks it, and no later level carries it (a go-between
//                                          soon replaced, as one round of resolution by the saturator; a part one
//                                          level's puzzle needs, as someone else's wrong prover). It is in no components
//                                          box and on no map label; text names it plainly, not as a link.
//   needed(level) → [part] | null          the parts its reference answer uses (null: no reference to go by)
//   boards(level) → [board]                the reference boards themselves, every task's or stage's in order, in the
//                                          shared circuit model (circuit/model.js), what it starts with left out; a
//                                          built part runs its level's last one
//   folds(level) → [part]                  parts the level's spec folds away anyway
//   showcase(level) → reason | null        why a level shows a new part alone, wired to the goal by itself: only for
//                                          a part whose use is abstract enough to get wrong from its description
//                                          (an assumption box), never for one a sentence explains (a block gate). The
//                                          bare-intro rule lets a level with a reason be
//   declares(level) → [part]               parts whose definition the level's answer works on (a declaration,
//                                          checking one): that puts them to work (idle-idea)
//   abstraction                            also audit the abstraction chain (bare-intro, unused); a course turns it on
//                                          once its curriculum keeps it
// })
// reach(course, level) is every part a level can hold; usable(course, level, flags) what it holds for a player;
// offer(course, level, flags) splits that into what the level shows and what it folds away; fresh(course, level) the
// ideas new in a level; introductions(course) where each primitive comes in; isCore(course, level) whether a level is
// a milestone the map draws full size; audit(course) lists every broken rule.
import { rebuilt } from './engine/match.js'

/** What each rule of the audit means, for reports (../engine/check.js). */
export const RULE_TEXT = {
  'not-built': 'offered, but no level builds it and it is not a primitive',
  'own-level': 'offered in the very level that builds it',
  'built-later': 'offered before the level that builds it',
  carried: 'named in a level that holds it anyway (an unlocked part carries into every level after it)',
  granted: 'handed out by a level (grants)',
  'many-new': 'more than one new part in one level',
  unplaced: 'in no era',
  'era-keeps': 'an era after the first that does not say which parts it takes from the eras before it (keeps)',
  machine: 'played on a machine of a later era',
  'machine-role': 'a foundation, practice, finale or challenge level played on an older machine',
  mechanism: 'played on a machine that cannot do what its board uses',
  'topic-world': 'a topic that spans several worlds',
  'topic-code': 'topics of one series (one hanging on another\'s level) under different letters, or unrelated series under one',
  'challenge-new': 'a challenge that brings something new',
  'challenge-required': 'a level that requires a challenge',
  'challenge-naive': 'a challenge without a failing naive answer',
  'topic-finale': 'a topic level its finale’s board does not solve (the topic is not one problem growing)',
  'carry-unseen': 'starts from the board of a level that is not among its prerequisites',
  'bare-intro': 'a new primitive whose first level is just that part, wired to the goal',
  unused: 'a built part that no later reference answer (nor a later task of its own level) uses',
  'optional-built': 'a part built on an optional level (a topic or a challenge) used by a level that does not require that level',
  'upgrade-order': 'a level upgrading a part that does not require the level that built it before',
  'idle-idea': 'a new idea no later level puts to work before two more new ideas come in (brought in before it is needed)',
  bypass: 'a reference answer of no built part that wires up, from three parts or more, the board of a part it holds',
}

/** Roles of a level within its era. A topic of one level is just its finale. */
export const ROLES = ['foundation', 'practice', 'intro', 'step', 'finale', 'challenge']

/** The level ids of a main path's items, branches flattened in order. */
export const pathLevels = (items) => items.flatMap((item) => (typeof item === 'string' ? [item] : item.parallel.flatMap((b) => b.levels)))
/**
 * A main path's levels in the order they are numbered: every level after the levels it requires (`requires`, from
 * layout), and among the levels open at each point the one highest in its parallel branch first, ties in the order
 * written. So a parallel set is numbered row by row, branch after branch, and the map (which lays its branches out by
 * their first numbers) reads left to right on every row; no level is numbered before one it needs.
 */
export function numbered(items, requires) {
  const ids = pathLevels(items)
  const depth = new Map(items.flatMap((item) => (typeof item === 'string' ? [[item, 0]] : item.parallel.flatMap((b) => b.levels.map((id, k) => [id, k])))))
  const on = new Set(ids)
  const done = new Set()
  const out = []
  while (out.length < ids.length) {
    const open = ids.filter((id) => !done.has(id) && (requires.get(id) ?? []).every((r) => !on.has(r) || done.has(r)))
    const next = open.reduce((best, id) => (depth.get(id) < depth.get(best) ? id : best))
    done.add(next)
    out.push(next)
  }
  return out
}

/** Every level of an era: its main path, then its topics and challenges. */
export const eraLevels = (era) => [...pathLevels([...era.foundation, ...(era.practice ?? [])]), ...(era.topics ?? []).flatMap((t) => t.levels), ...(era.challenges ?? []).map((c) => c.level)]

/**
 * Play order, places, requirements and tracks from a course's eras. The main path runs in order from the end of the
 * previous era's; a parallel set's branches each start where the path stands and the path goes on once all of them
 * end. A topic opens after its `after` level (by default the end of the main path) and any topic it requires, and runs
 * in order to its finale; a challenge opens after its `after` level.
 * A track lists an era's main path for the map: { level, branches } or { parallel: [{ id, title, levels }], branches },
 * where `branches` are the optional topics and challenges hanging there ({ kind, id, title, levels, after }, after: the
 * levels they follow).
 */
export function layout(eras) {
  const place = new Map(), requires = new Map(), tracks = new Map()
  let before = [] // where the previous era's main path ended
  for (const era of eras) {
    const track = []
    const at = new Map() // a main-path level → its track item
    let ends = before
    for (const [items, role] of [[era.foundation, 'foundation'], [era.practice ?? [], 'practice']]) {
      for (const item of items) {
        if (typeof item === 'string') {
          place.set(item, { era: era.id, role })
          requires.set(item, [...ends])
          const entry = { level: item, branches: [] }
          track.push(entry)
          at.set(item, entry)
          ends = [item]
          continue
        }
        const entry = { parallel: item.parallel.map((b) => ({ id: b.id, title: b.title, levels: b.levels })), branches: [] }
        for (const b of item.parallel) {
          b.levels.forEach((id, k) => {
            place.set(id, { era: era.id, role, branch: b.id })
            requires.set(id, k ? [b.levels[k - 1]] : [...ends])
            at.set(id, entry)
          })
        }
        track.push(entry)
        ends = item.parallel.map((b) => b.levels.at(-1))
      }
    }
    // An optional branch hangs on the track where its `after` level is (the end of the main path by default).
    const hang = (after, branch) => (at.get(after) ?? track.at(-1) ?? track[0])?.branches.push(branch)
    for (const topic of era.topics ?? []) {
      const finales = (topic.requires ?? []).map((t) => era.topics.find((x) => x.id === t)?.levels.at(-1)).filter(Boolean)
      const after = topic.after ? [topic.after].flat() : ends
      topic.levels.forEach((id, k) => {
        const last = k === topic.levels.length - 1
        place.set(id, { era: era.id, role: last ? 'finale' : k ? 'step' : 'intro', topic: topic.id, after: after.at(-1) })
        requires.set(id, k ? [topic.levels[k - 1]] : [...after, ...finales])
      })
      hang(after.at(-1), { kind: 'topic', id: topic.id, title: topic.title, levels: topic.levels, after })
      // A topic may hang after another topic's level (`after: 'x-2'`): it goes on the track where that topic does,
      // after it, so two topics can branch off from the end of a third.
      for (const id of topic.levels) if (!at.has(id)) at.set(id, at.get(after.at(-1)) ?? track.at(-1) ?? track[0])
    }
    for (const c of era.challenges ?? []) {
      const after = c.after ? [c.after].flat() : ends
      place.set(c.level, { era: era.id, role: 'challenge', after: after.at(-1) })
      requires.set(c.level, [...after])
      hang(after.at(-1), { kind: 'challenge', id: c.level, levels: [c.level], after })
    }
    tracks.set(era.id, track)
    before = ends
  }
  // Play order: each era's track, every branch right after the place it hangs from.
  const order = [...tracks.values()].flatMap((track) => track.flatMap((entry) => [...(entry.level ? [entry.level] : entry.parallel.flatMap((b) => b.levels)), ...entry.branches.flatMap((b) => b.levels)]))
  return { order, place, requires, tracks }
}

// A showcase's reason, written plainly or in each language.
const shown = (reason) => (typeof reason === 'string' ? reason.trim() : reason?.en?.trim() ?? '')

export function defineCourse({ levels, eras = null, primitives, adds, needs, builds, granted = () => [], concept = (p) => p, machine = () => null, uses = () => [], can = () => null, world = () => null, naive = () => true, replaces = () => [], local = () => false, needed = () => null, boards = () => [], folds = () => [], showcase = () => null, declares = () => [], abstraction = false }) {
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
  // A part met at one level reaches another across every era between them: each era on the way that keeps a list
  // lets through only the parts on it; one that keeps 'all' lets everything through.
  const eraOf = (id) => (plan ? eras.findIndex((e) => e.id === plan.place.get(id)?.era) : 0)
  const crosses = (part, from, to) => eras?.slice(eraOf(from) + 1, eraOf(to) + 1).every((e) => e.keeps === 'all' || e.keeps?.includes(part)) ?? true
  return { levels, eras, plan, primitives: new Set(primitives), adds, needs, builds, granted, concept, machine, uses, can, world, naive, replaces, local, needed, boards, folds, showcase, declares, abstraction, index, builder, crosses, before: (a, b) => up(b).has(a) }
}

/**
 * Every part a level can ever hold, by the rule every course follows: a part, once met, stays usable in every level
 * after it on the tree (every level this one comes after), unless a part met since replaces it (an upgrade, or a
 * merger), a later machine leaves it behind (an era's `keeps`) or it stays where it is brought (`local`). So a level's spec names only the parts it brings in
 * (`adds`); a part the player builds needs no naming at all. In order: the level's own parts, then the carried ones in
 * the order they were met.
 */
export function reach(course, level) {
  const own = course.adds(level)
  const earlier = course.levels.filter((l) => course.before(l.id, level.id))
  const met = earlier.flatMap((l) => [...course.adds(l), ...course.builds(l)].filter((p) => course.crosses(p, l.id, level.id)))
  const gone = new Set([...own, ...met].flatMap((p) => course.replaces(p)))
  const carried = met.filter((p) => !own.includes(p) && !gone.has(p) && !course.local(p))
  return [...new Set([...own, ...carried])]
}

/**
 * The parts a level really holds for a player with `flags` (the unlocks of the levels solved, plus a level's grants):
 * of everything it can reach, a primitive, and a built part once its builder level is solved (until the content is
 * fixed, a part no level builds, or one the level builds itself: audit reports both). A part built on an optional level
 * (a topic or a challenge) is held only by the levels that require that level.
 */
export function usable(course, level, flags) {
  return reach(course, level).filter((p) => {
    if (course.primitives.has(p)) return true
    const need = course.needs(p), by = course.builder(p)
    if (!need || !by || by === level.id) return true
    // A part built on an optional level is only for the levels that require that level.
    if (OPTIONAL.includes(course.plan?.place.get(by)?.role) && !course.before(by, level.id)) return false
    return flags.has(need)
  })
}
const OPTIONAL = ['intro', 'step', 'finale', 'challenge']

/**
 * What a level shows of the parts it holds, so that a level with many parts does not leave the player lost: the parts
 * new here (not its givens, which show as its answer uses them), the parts the levels just before it have built, and
 * the ideas its reference answer uses (`needed`, by concept; with no reference to go by, every part). Everything else carried from earlier levels is folded away, still
 * usable, and so is every part the level's spec folds (`folds`). `also`: parts held here beyond those the course
 * carries (a task's own level's part, proved by the task before it). Returns { shown, folded }.
 */
export function offer(course, level, flags, also = []) {
  const all = [...usable(course, level, flags), ...also]
  const own = new Set(course.adds(level))
  // The answer goes by its parts (not a board's own fixed cards), and only when the player holds them all: a reference
  // built from parts the player cannot have yet says nothing about what to show.
  const isPart = (p) => course.primitives.has(p) || Boolean(course.needs(p)) || course.levels.some((l) => course.adds(l).includes(p))
  // A part that is no idea of its own (a level's givens) goes by itself.
  const idea = (p) => course.concept(p) ?? p
  const held = new Set(all.map(idea))
  const parts = course.needed(level)?.filter(isPart)
  const ideas = parts && parts.every((p) => held.has(idea(p))) ? new Set(parts.map(idea)) : null
  const just = new Set((course.plan?.requires.get(level.id) ?? []).flatMap((id) => course.builds(course.levels[course.index.get(id)])))
  const fold = new Set(course.folds(level))
  // What the level brings is shown, but for its givens: only those its answer uses.
  const brought = (p) => own.has(p) && course.concept(p) !== null
  const shows = (p) => !fold.has(p) && (brought(p) || just.has(p) || !ideas || ideas.has(idea(p)))
  return { shown: all.filter(shows), folded: all.filter((p) => !shows(p)) }
}

/**
 * The ideas a level meets first: of the parts it brings in (not built ones), the concepts that no level before it on
 * the tree brought in or built. These are what its tray marks 新.
 */
export function fresh(course, level) {
  const seen = new Set(course.levels.filter((l) => course.before(l.id, level.id)).flatMap((l) => [...course.adds(l), ...course.builds(l)].map(course.concept)))
  return new Set(course.adds(level).filter((p) => !course.builder(p)).map(course.concept).filter((c) => c !== null && !seen.has(c)))
}

/**
 * Where the primitives come in, for the components box and the map: for each key (keyOf(part), how the box lists
 * parts; one entry a part by default), the levels on the tree that bring in a part with that key while no level before
 * them has. A part that stays where it is brought (`local`) is no component to keep: it is left out. In play order.
 */
export function introductions(course, keyOf = (p) => p) {
  const out = new Map()
  const placed = (l) => !course.plan || course.plan.place.has(l.id)
  const keys = (l) => course.adds(l).filter((p) => course.primitives.has(p) && !course.local(p)).map(keyOf)
  for (const level of course.levels.filter(placed)) {
    const seen = new Set(course.levels.filter((l) => placed(l) && course.before(l.id, level.id)).flatMap(keys))
    for (const k of keys(level)) {
      if (seen.has(k)) continue
      if (!out.has(k)) out.set(k, [])
      if (!out.get(k).includes(level.id)) out.get(k).push(level.id)
    }
  }
  return out
}

/**
 * Whether a level is a milestone of the tree, drawn full size on the map; the others are drawn smaller. A milestone
 * brings something in: the first level on a machine, a level that meets a new idea or unlocks a part, a challenge,
 * or a topic's finale. A topic's opening and middle levels, and the practice after a mechanism, are not.
 */
export function isCore(course, level) {
  const at = course.plan?.place.get(level.id)
  if (!at) return true
  if (at.role === 'finale' || at.role === 'challenge') return true
  if (at.role === 'intro' || at.role === 'step') return false
  const own = course.levels[course.index.get(level.id)]
  const era = course.eras.find((e) => e.id === at.era)
  return pathLevels(era.foundation)[0] === level.id || (own.unlocks ?? []).length > 0 || fresh(course, own).size > 0
}

/** Every broken rule, as { rule, level, part, text }, in play order. */
export function audit(course) {
  const out = []
  const say = (rule, level, part, text) => out.push({ rule, level, part, text })
  const plan = course.plan
  const levels = course.levels
  const unbuilt = new Set()
  for (const level of levels) {
    const granted = new Set(course.granted(level))
    const earlier = levels.filter((l) => course.before(l.id, level.id)).flatMap((l) => course.adds(l).filter((p) => course.crosses(p, l.id, level.id)))
    // The ideas new here; a part built by the player is never new where it is first used.
    const ideas = fresh(course, level)
    const role = plan?.place.get(level.id)?.role
    for (const p of course.adds(level)) {
      const by = course.builder(p)
      if (course.primitives.has(p)) { if (earlier.includes(p) && !course.local(p)) say('carried', level.id, p, 'brought in again, though an earlier level already did'); continue }
      if (granted.has(p)) say('granted', level.id, p, 'handed out by the level, not built by the player')
      else if (!by) { if (!unbuilt.has(p)) say('not-built', level.id, p, 'no level builds it and it is not a primitive'); unbuilt.add(p) }
      else if (by === level.id) say('own-level', level.id, p, 'offered in the very level that builds it')
      // A part that stays where it is brought is brought again by name: that is no carry.
      else if (course.before(by, level.id) && course.crosses(p, by, level.id)) { if (!course.local(p)) say('carried', level.id, p, `named, though it carries here from ${by} anyway`) }
      else {
        const optional = ['intro', 'step', 'finale', 'challenge'].includes(plan?.place.get(by)?.role)
        say(optional ? 'optional-needed' : 'built-later', level.id, p, optional ? `needs ${by}, which sits on an optional branch it does not require` : `offered where ${by}, the level that builds it, need not be solved yet`)
      }
    }
    // A new primitive has a lead-in: its first level asks for more than placing it and wiring it to the goal.
    // And a part a level builds is used by a later level's reference answer. Both for courses that keep the chain.
    if (course.abstraction) {
      const used = course.needed(level)?.filter((p) => course.primitives.has(p) || course.needs(p))
      for (const p of ideas) if (used?.length === 1 && course.concept(used[0]) === p && !shown(course.showcase(level))) say('bare-intro', level.id, p, 'its first level is that part alone, wired to the goal')
      // A later task of the level itself counts: it may put to work what its earlier task proved.
      for (const b of course.builds(level)) if (!course.needed(level)?.includes(b) && !levels.some((l) => course.before(level.id, l.id) && course.needed(l)?.includes(b))) say('unused', level.id, b, 'built here, and no later reference answer uses it')
    }
    // A part built on an optional level is for the levels that require it alone: anyone else may not have it.
    for (const p of course.needed(level) ?? []) {
      const by = course.builder(p)
      if (by && by !== level.id && OPTIONAL.includes(plan?.place.get(by)?.role) && !course.before(by, level.id)) say('optional-built', level.id, p, `built on the optional level ${by}, which this level does not require`)
    }
    // A level that builds a part built before (an upgrade) requires every level that built it before.
    for (const b of course.builds(level)) {
      const earlier = levels.filter((l) => l.id !== level.id && course.builds(l).includes(b) && !course.before(level.id, l.id))
      for (const l of earlier) if (!course.before(l.id, level.id)) say('upgrade-order', level.id, b, `builds ${b} as ${l.id} does, and does not require it`)
    }
    if (role === 'challenge' && ideas.size) say('challenge-new', level.id, [...ideas].join(' '), 'a challenge brings nothing new')
    else if (ideas.size > 1) say('many-new', level.id, [...ideas].join(' '), `${ideas.size} new parts in one level (one new idea per level)`)
  }
  idle(course, say)
  bypass(course, say)
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
  // Every era after the first says what it takes from the ones before: everything, or a list.
  course.eras?.slice(1).forEach((era) => { if (era.keeps !== 'all' && !Array.isArray(era.keeps)) say('era-keeps', pathLevels(era.foundation)[0] ?? era.id, String(era.id), `era ${era.id} has no keeps`) })
  // A letter is a series: topics joined by one hanging on another's level share it, across eras too; unrelated series
  // do not.
  const topics = course.eras.flatMap((e) => e.topics ?? []).filter((t) => t.code)
  const series = new Map(topics.map((t) => [t.id, t.id]))
  const root = (id) => (series.get(id) === id ? id : root(series.get(id)))
  for (const t of topics) for (const after of [].concat(t.after ?? [])) {
    const u = topics.find((x) => x.levels.includes(after))
    if (u) series.set(root(t.id), root(u.id))
  }
  for (const t of topics) {
    const kin = topics.filter((u) => root(u.id) === root(t.id))
    if (kin.some((u) => u.code !== t.code)) say('topic-code', t.levels[0], t.code, `topic ${t.id} is in one series with ${kin.filter((u) => u.code !== t.code).map((u) => `${u.id} (${u.code})`).join(', ')}`)
    else if (topics.some((u) => u.code === t.code && root(u.id) !== root(t.id))) say('topic-code', t.levels[0], t.code, `topic ${t.id} shares its letter with a series it does not hang on`)
  }
  // A topic stays in one world.
  for (const era of course.eras) {
    for (const topic of era.topics ?? []) {
      const worlds = [...new Set(topic.levels.map((id) => course.world(levels.find((l) => l.id === id) ?? { id })).filter(Boolean))]
      if (worlds.length > 1) say('topic-world', topic.levels.at(-1), worlds.join(' '), `topic ${topic.id} spans several worlds`)
    }
  }
  return out
}

/**
 * The audit's findings (audit, or a game's own) against the ones a game leaves open (game.json `open`, the work list in
 * its design doc: { rule: ['part@level'] }): for every rule with any, { rule, fresh: found and not listed, left: found
 * and listed, gone: listed and met since }. npm run check fails on fresh and gone, and lists left.
 */
export function againstOpen(found, open = {}) {
  const rules = [...new Set([...found.map((f) => f.rule), ...Object.keys(open)])]
  return rules.map((rule) => {
    const hits = [...new Set(found.filter((f) => f.rule === rule).map((f) => `${f.part}@${f.level}`))]
    const listed = open[rule] ?? []
    return { rule, fresh: hits.filter((h) => !listed.includes(h)), left: hits.filter((h) => listed.includes(h)), gone: listed.filter((h) => !hits.includes(h)) }
  })
}

/**
 * idle-idea: a new idea goes where it is first needed (games/DESIGN.md 1 and 5). After a level meets a new idea, a
 * level after it on the tree puts the idea to work before two more new ideas have come in: the next new idea may come
 * first (it may build on this one, or this one returns right after it), a second may not. A new idea is a primitive's
 * concept met first (fresh, but no part that stays where it is brought: a puzzle's given), or an ability of the
 * machine (uses) that no level before it on the tree relied on. Any later level that uses it counts, optional or not,
 * and so does one using a built part made with it (the idea keeps working inside the part);
 * the new ideas counted between the two are those of required levels on the way. The level that brings an idea in
 * uses it itself (a level with a reference answer). An idea met on an optional level is
 * not checked: a topic adds one idea a level and its finale uses them all (topic-finale).
 * The rule finds an idea brought in early, or several stacked before any is used. It asks for no number of levels:
 * the fix is to move an idea to where it is needed, never to pad the course.
 */
function idle(course, say) {
  const placed = course.levels.filter((l) => !course.plan || course.plan.place.has(l.id))
  const required = (l) => !OPTIONAL.includes(course.plan?.place.get(l.id)?.role)
  const abilities = (l) => course.uses(l) ?? []
  // The concepts a level's reference answer puts to work: its parts', the parts it declares, and those inside each
  // built part it uses (the reference of the level that builds it, all the way down).
  const inside = new Map()
  const concepts = (l, seen = new Set()) => {
    if (inside.has(l.id)) return inside.get(l.id)
    seen.add(l.id)
    const out = new Set(course.declares(l).map((p) => course.concept(p) ?? p))
    for (const p of course.needed(l) ?? []) {
      out.add(course.concept(p) ?? p)
      const by = course.builder(p)
      const at = by && placed.find((m) => m.id === by)
      if (at && !seen.has(at.id)) for (const c of concepts(at, seen)) out.add(c)
    }
    inside.set(l.id, out)
    return out
  }
  const news = new Map(placed.map((l) => {
    const seen = new Set(placed.filter((m) => course.before(m.id, l.id)).flatMap(abilities))
    const kept = new Set(course.adds(l).filter((p) => !course.local(p)).map(course.concept))
    return [l.id, [
      ...[...fresh(course, l)].filter((c) => kept.has(c)).map((key) => ({ key, uses: (m) => concepts(m).has(key) })),
      ...[...new Set(abilities(l))].filter((a) => !seen.has(a)).map((key) => ({ key, uses: (m) => abilities(m).includes(key) })),
    ]]
  }))
  for (const level of placed.filter(required)) {
    const after = placed.filter((l) => course.before(level.id, l.id))
    for (const idea of news.get(level.id)) {
      if (course.needed(level) && !idea.uses(level)) {
        say('idle-idea', level.id, idea.key, 'its own level does not use it')
        continue
      }
      const users = after.filter(idea.uses)
      const first = users.filter((u) => !users.some((x) => x !== u && course.before(x.id, u.id)))
      if (!first.length) {
        if (after.length) say('idle-idea', level.id, idea.key, 'no level after it uses it')
        continue
      }
      const between = (u) => [...new Set(after.filter((m) => m !== u && required(m) && course.before(m.id, u.id)).flatMap((m) => news.get(m.id).map((i) => i.key)))]
      const [at, ideas] = first.map((u) => [u.id, between(u)]).reduce((a, b) => (b[1].length < a[1].length ? b : a))
      if (ideas.length >= 2) say('idle-idea', level.id, idea.key, `first put to work at ${at}, after ${ideas.length} other new ideas (${ideas.join(', ')})`)
    }
  }
}

/**
 * bypass: a level whose reference answer uses no built part, while a built part it holds would make it clearly
 * shorter (games/DESIGN.md 5). Shorter: one of its reference boards has, among its parts, the very board that part runs
 * (the last board of the latest level before it that builds the part, engine/match.js rebuilt: same parts, settings
 * and wiring, inputs read alike, nothing else reading inside), which one card of the part could replace. Clearly: that
 * board is at least three parts, so the part saves two or more; a part of two saves one card, and that is no climb.
 */
function bypass(course, say) {
  const isPart = (p) => course.primitives.has(p) || Boolean(course.needs(p)) || course.levels.some((l) => course.adds(l).includes(p))
  const built = (p) => Boolean(course.builder(p))
  const flags = new Set(course.levels.flatMap((l) => l.unlocks ?? []))
  for (const level of course.levels) {
    const used = course.needed(level)
    if (!used?.length || used.some(built)) continue
    for (const part of usable(course, level, flags)) {
      if (!built(part) || !course.before(course.builder(part), level.id)) continue
      const by = course.levels.filter((l) => course.builds(l).includes(part) && course.before(l.id, level.id)).at(-1)
      const own = course.boards(by).at(-1)
      const hit = own && course.boards(level).map((b) => rebuilt(own, b, isPart)).find((phi) => phi?.size >= 3)
      if (hit) say('bypass', level.id, part, `${hit.size} of its parts are the board of ${by}, which one ${part} would replace`)
    }
  }
}

/**
 * The forms a part's card offers in level `id` (engine/forms.js): its first, and every one an upgrade passed before
 * the level brings (`revisions` [{ by, forms }], as shell/index.js reads them).
 */
export const formsAt = (course, first, revisions = [], id) => [first, ...revisions.filter((r) => r.by && r.forms && course.before(r.by, id)).flatMap((r) => r.forms)]
