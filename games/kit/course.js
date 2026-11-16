// The rules every course follows, the same in every game. A course starts from a few primitives; every other part is
// built: a level asks the player to build it, and solving that level unlocks it. From then on it runs the board the
// player passed that level with, so a run can step inside it, and the validator checks that level's reference board
// as that part against the level's tests. The design behind these rules is games/DESIGN.md.
//
// A chapter lists its level ids in display order. Links go from prerequisite to successor; the chapter holding the
// successor owns the link. Skippable levels are bypassed on ordinary links. A required link waits for a pass.
// Groups are independent of both numbering and links.
// defineCourse({
//   levels      [{ id, unlocks: [flag] }]  in play order (layout(eras).order when the course has eras)
//   eras?                                  the course's eras, for the era rules of the audit
//   trays       { [tray]: [part] }         the game's trays, each a list of parts in the order it shows them: a board
//                                          of one kind (a truth circuit, a proof board)
//   tray(level) → tray | [tray] | null      which trays a level or task plays with, or null for every part met
//   primitives  [part]                     available from the start
//   adds(level) → [part]                   the parts a level brings in (everything else carries, see reach)
//   needs(part) → flag | null              the flag solving its builder level sets (null: built nowhere)
//   builds(level) → [part]                 the parts solving the level unlocks; of a task ({ id, task }), those its
//                                          level's tasks up to it have built by then
//   opens(level) → [item]                  the settings and setting values a level brings in, as `adds` brings parts
//                                          (see items below): each carries into every level after it
//   gives(level) → [item]                  what a level (a task: { id, task }) holds beyond that, there only
//   withholds(level) → [item]              what a level (a task) does not hold though it would, there only
//   concept(part) → key | null             parts that are one new idea together (a merger's models), by default itself;
//                                          null for a part that is never a new idea (a level's own givens: its axioms)
//   machine(level) → machine | null        the machine a level is played on, checked against its era's
//   uses(level) → [mechanism]              what a level's board relies on (its view, an arm, a scan order…)
//   can(machine) → [mechanism] | null      what a machine can do: a level needs a machine that can do all it uses
//   replaces(part) → [part]                the parts it supersedes: an upgrade, or a merger of several into one
//   local(item, level?) → bool             an item that stays in the levels that bring it (`adds`, or a board's preset):
//                                          solving them never unlocks it, and no later level carries it (a go-between
//                                          soon replaced, as one round of resolution by the saturator; a part one
//                                          level's puzzle needs, as someone else's wrong prover). It is in no components
//                                          box and on no map label; text names it plainly, not as a link.
//   needed(level) → [part] | null          the parts its reference answer uses (null: no reference to go by); the
//                                          tray shows these and folds the rest away
//   boards(level) → [board]                the reference boards themselves, every task's or stage's in order, in the
//                                          shared circuit model (circuit/model.js), what it starts with left out; a
//                                          built part runs its level's last one
//   showcase(level) → reason | null        why a level shows a new part alone, wired to the goal by itself: only for
//                                          a part whose use is abstract enough to get wrong from its description
//                                          (an assumption box), or a semantic tool configured against contrasting visual cases.
//                                          Simply placing a tool a sentence explains is insufficient. The
//                                          bare-intro rule lets a level with a reason be
//   declares(level) → [part]               parts whose definition the level's answer works on (a declaration,
//                                          checking one): that puts them to work (idle-idea)
//   carries(level) → [level]               the levels whose boards the level starts from: each must be one of its
//                                          prerequisites (carry-unseen)

//   abstraction                            also audit the abstraction chain (bare-intro, unused); a course turns it on
//                                          once its curriculum keeps it
//   notes                                  a notes course (games/DESIGN.md 12): every level open, nothing requiring
//                                          anything, and no audit (the checks skip it)
// })
//
// What a level holds is one rule at every grain (games/DESIGN.md 2.8). An item is a part ('shift'), one of its
// settings ('shift.border') or one value of a setting ('shift.border=wrap'): itemOf, readItem. A game has several
// trays that set the display order; an item is held by default as far as the course has got — a part once a
// level before brought it in or the player built it, a setting or a value from the start unless the course opens it
// somewhere (`opens`, by a level on the way; `needs`, by a flag the player earns) — and a level or a task then
// changes that for itself alone: `gives` adds items, `withholds` takes items away, at any grain.
//
// met(course, level) is every part a level has met; reach(course, level) puts them in display order;
// usable(course, level, flags) the parts it holds for a player; holds(course, level, flags) whether it holds an item
// of any grain;
// offer(course, level, flags) splits that into what the level shows and what it folds away; fresh(course, level) the
// ideas new in a level; introductions(course) where each primitive comes in; isCore(course, level) whether a level is
// a milestone the map draws full size; audit(course) lists every broken rule.
import { OPEN_PART_LIMIT } from './engine/stages.js'
import { rebuilt } from './engine/match.js'
import { trayMembers } from './engine/trays.js'

/** What each rule of the audit means, for reports (./engine/checks.js). */
export const RULE_TEXT = {
  'not-built': 'offered, but no level builds it and it is not a primitive',
  'own-level': 'offered in the very level that builds it',
  'built-later': 'offered before the level that builds it',
  carried: 'named in a level that holds it anyway (a part met carries into every level after it)',
  granted: 'handed out by a level (gives)',
  'many-new': 'more than one new part in one level',
  unplaced: 'in no era',
  'tray-unmet': 'on a tray, and no level brings it in or builds it',
  machine: 'played on a machine of a later era',
  mechanism: 'played on a machine that cannot do what its board uses',
  'open-crowded': 'more than eight newly exposed parts in a task with prior pipeline stages',
  'carry-unseen': 'starts from the board of a level that is not among its prerequisites',
  'bare-intro': 'a new primitive whose first level is just that part, wired to the goal',
  unused: 'a built part that no later reference answer (nor a later task of its own level) uses',
  'optional-built': 'a part built on an optional level used by a level that does not require that level',
  'upgrade-order': 'a level upgrading a part that does not require the level that built it before',
  'idle-idea': 'a new idea no later level puts to work before two more new ideas come in (brought in before it is needed)',
  bypass: 'a reference answer of no built part that wires up, from three parts or more, the board of a part it holds',
  'difficulty-spike': 'a required level whose blind-play attempts stand out against its neighbours on the tree (engine/play/stats.js)',
}

export const eraLevels = (era) => era.levels.map(({ id }) => id)

/** Numeric positions follow the chapter's ordered list. */
export function levelLabels(eras) {
  return new Map(eras.flatMap((era, e) => {
    const chapter = typeof era.id === 'number' ? era.id : e
    return eraLevels(era).map((id, i) => [id, `${chapter}-${i + 1}`])
  }))
}

/** Put prerequisites before their consumers, keeping input order where possible. */
export function dependencyOrder(ids, requires) {
  const local = new Set(ids)
  const seen = new Set(), order = []
  const visit = (id) => {
    if (seen.has(id)) return
    seen.add(id)
    for (const before of requires.get(id) ?? []) if (local.has(before)) visit(before)
    order.push(id)
  }
  ids.forEach(visit)
  return order
}

/** Layer the supplied ids by the longest local prerequisite chain. */
export function dependencyLayers(ids, requires) {
  const rank = new Map()
  const layers = []
  for (const id of dependencyOrder(ids, requires)) {
    const row = Math.max(0, ...(requires.get(id) ?? []).map((before) => (rank.get(before) ?? -1) + 1))
    rank.set(id, row)
    ;(layers[row] ??= []).push(id)
  }
  return layers
}

/**
 * A chapter's map, row by row (games/DESIGN.md 2.5): each row at most three places, a level or an empty one (null).
 * The selected package layout's rows stay as authored, less the levels not on this map; every other
 * level is laid out by the map's rules around it: one layer of the prerequisite graph at a time, in rows of up to
 * three after the rows of the layers before it, below each of its prerequisites and above every saved level that needs
 * it (a row put in pushes the rows under it down). Returns { at: id → { row, col } (col 0 is the middle), rows }.
 */
export function mapRows(ids, requires, selectedLayout = null) {
  const saved = selectedLayout?.rows ?? []
  const known = new Set(ids)
  const local = new Map(ids.map((id) => [id, (requires.get(id) ?? []).filter((from) => known.has(from))]))
  const rows = []
  const placed = new Set()
  for (const row of saved) {
    const slots = row.filter((id) => id === null || (known.has(id) && !placed.has(id) && placed.add(id)))
    if (slots.some((id) => id !== null)) rows.push({ slots, layer: null })
  }
  const rowOf = (id) => rows.findIndex((row) => row.slots.includes(id))
  const after = new Map(ids.map((id) => [id, []]))
  for (const [id, froms] of local) for (const from of froms) after.get(from).push(id)
  // The saved levels that need a level, all the way down.
  const savedBelow = (id, seen = new Set()) => {
    for (const next of after.get(id)) if (!seen.has(next)) { seen.add(next); savedBelow(next, seen) }
    return [...seen].filter((x) => placed.has(x))
  }
  for (const [layer, members] of dependencyLayers(ids, local).entries()) for (const id of members) {
    if (placed.has(id)) continue
    const min = Math.max(0, ...local.get(id).map((from) => rowOf(from) + 1))
    const max = Math.min(rows.length, ...savedBelow(id).map(rowOf))
    let at = rows.findIndex((row, i) => i >= min && i < max && row.layer === layer && row.slots.length < 3)
    if (at < 0) {
      const last = rows.reduce((end, row, i) => (row.layer !== null && row.layer <= layer ? i + 1 : end), 0)
      at = min > max ? min : Math.min(Math.max(min, last), max)
      rows.splice(at, 0, { slots: [], layer })
    }
    rows[at].slots.push(id)
    placed.add(id)
  }
  const at = new Map()
  rows.forEach(({ slots }, row) => slots.forEach((id, slot) => { if (id !== null) at.set(id, { row, col: slot - (slots.length - 1) / 2 }) }))
  return { at, rows: rows.map(({ slots }) => slots) }
}

/** Direct author prerequisites, effective unlock gates, and chapter information. */
export function layout(eras, { notes = false, links = eras.flatMap((era) => era.links ?? []) } = {}) {
  const place = new Map(), requires = new Map(), tracks = new Map(), rows = new Map()
  const incoming = new Map()
  for (const era of eras) {
    for (const { id, optional = false, skippable = false } of era.levels) {
      place.set(id, { era: era.id, optional, skippable })
      incoming.set(id, [])
    }
    tracks.set(era.id, eraLevels(era))
    rows.set(era.id, era.rows ?? [])
  }
  if (!notes) for (const link of links) if (!link.fromGame) incoming.get(link.to)?.push(link)
  for (const [id, links] of incoming) requires.set(id, [...new Set(links.map(({ from }) => from))])

  const order = dependencyOrder([...place.keys()], requires)
  const required = new Map()
  for (const id of order) {
    const direct = incoming.get(id).flatMap(({ from, required: strict }) => place.get(from)?.skippable && !strict
      ? required.get(from) ?? [from]
      : [from])
    required.set(id, [...new Set(direct)])
  }
  return { order, place, requires, required, tracks, rows }
}

/** The first loop in the prerequisite graph, with its starting level repeated at the end. */
export function dependencyCycle(requires) {
  const done = new Set()
  const active = new Set()
  const visit = (id) => {
    if (active.has(id)) {
      const path = [...active]
      return [...path.slice(path.indexOf(id)), id]
    }
    if (done.has(id)) return null
    active.add(id)
    for (const before of requires.get(id) ?? []) {
      const cycle = visit(before)
      if (cycle) return cycle
    }
    active.delete(id)
    done.add(id)
    return null
  }
  for (const id of requires.keys()) {
    const cycle = visit(id)
    if (cycle) return cycle
  }
  return null
}

// A showcase's reason, written plainly or as a text.
const shown = (reason) => (typeof reason === 'string' ? reason.trim() : reason?.en?.trim() ?? '')

export function defineCourse({ levels, eras = null, plan: suppliedPlan = null, complete = true, trays = {}, tray: trayOf = () => null, primitives, adds, needs, builds, opens = () => [], gives = () => [], withholds = () => [], concept = (p) => p, machine = () => null, uses = () => [], can = () => null, replaces = () => [], local = () => false, needed = () => null, featured = () => [], boards = () => [], showcase = () => null, declares = () => [], carries = () => [], openParts = () => [], references = null, abstraction = false, notes = false, available = null, availableItems = null }) {
  // Settings brought by adds open along the route, while piece consumers keep receiving only pieces.
  const brought = adds, opened = opens
  adds = (level) => brought(level).filter(isPartItem)
  opens = (level) => [...opened(level), ...brought(level).filter((item) => !isPartItem(item))]
  const index = new Map(levels.map((l, i) => [l.id, i]))
  const setBy = new Map()
  for (const l of levels) for (const f of l.unlocks ?? []) if (!setBy.has(f)) setBy.set(f, l.id)
  /** The level that builds a part: the first to set the flag it needs. */
  const builder = (part) => (needs(part) ? setBy.get(needs(part)) ?? null : null)
  const plan = suppliedPlan ?? (eras ? layout(eras, { notes }) : null)
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
  const tray = (level) => {
    const selection = trayOf(level)
    if (selection === null) return null
    const names = Array.isArray(selection) ? selection : [selection]
    for (const name of names) if (!Object.hasOwn(trays, name)) throw new Error(`level ${level.id} is played with the tray ${name}, which the game has not`)
    return names
  }
  // The settings and values some level opens: held from that level on, not from the start.
  const gated = new Set(levels.flatMap((l) => opens(l)))
  return { levels, eras, plan, complete, trays, tray, available, availableItems, gated, primitives: new Set(primitives), adds, needs, builds, opens, gives, withholds, concept, machine, uses, can, replaces, local, needed, featured, boards, showcase, declares, carries, openParts, references, abstraction, notes, index, builder, before: (a, b) => up(b).has(a) }
}

/**
 * Every part a level has met, by the rule every course follows: the parts it brings in, and every part brought in or
 * built at a level before it on the tree (every level this one comes after), unless a part met since replaces it (an
 * upgrade, or a merger) or it stays where it is brought (`local`). So a level's spec names only the parts it brings in
 * (`adds`); a part the player builds needs no naming at all. A task ({ id, task }) has also met what the tasks before
 * it in its level built. In order: the level's own parts, then the carried ones in the order they were met.
 */
export function met(course, level) {
  if (course.available) return course.available(level)
  const own = [...course.adds(level), ...builtBefore(course, level)]
  const external = [...(course.plan?.externalItems?.get(level.id) ?? [])].filter(isPartItem)
  const earlier = [...external, ...course.levels.filter((l) => course.before(l.id, level.id)).flatMap((l) => [...course.adds(l), ...course.builds(l)].filter((p) => !course.local(p, l)))]
  const gone = new Set([...own, ...earlier].flatMap((p) => course.replaces(p)))
  const carried = earlier.filter((p) => !own.includes(p) && !gone.has(p))
  return [...new Set([...own, ...carried])]
}

/** The pieces in the level's selected groups, without duplicates and in the requested order. */
function trayPieces(course, level) {
  const trays = course.tray(level)
  return trays === null ? null : [...new Set(trays.flatMap((name) => trayMembers(course.trays[name])))]
}

/** All parts a level has met, ordered with members of its selected trays first. */
export function reach(course, level) {
  const all = met(course, level)
  const trays = trayPieces(course, level)
  if (trays === null) return all
  const metSet = new Set(all)
  return [...new Set([...trays.filter((part) => metSet.has(part)), ...all])]
}

/** The fixed pieces of selected trays, or the whole course's piece list for an implicit tray. */
export function fixedTray(course, level) {
  return trayPieces(course, level)
    ?? [...new Set([...course.primitives, ...course.levels.flatMap((entry) => course.builds(entry))])]
}

/** An item's address: a part, one of its settings (`key`), or one value of that setting. */
export const itemOf = (part, key, value) => (key === undefined ? part : value === undefined ? `${part}.${key}` : `${part}.${key}=${value}`)
/** An item read: { part, key?, value? } (a part's name has no dot; a value is everything after the first '='). */
export function readItem(item) {
  const dot = item.indexOf('.')
  if (dot < 0) return { part: item }
  const rest = item.slice(dot + 1)
  const eq = rest.indexOf('=')
  return eq < 0 ? { part: item.slice(0, dot), key: rest } : { part: item.slice(0, dot), key: rest.slice(0, eq), value: rest.slice(eq + 1) }
}
const isPartItem = (item) => !item.includes('.')
// The parts the tasks before a task have built in its level; and those its level builds that they have not: the task
// building a part does not hold it, even when an earlier level built it before (an upgrade works on the part's own
// board), unless the level brings the part in by name (a part of the engine's own, met and unlocked in one level).
const builtBefore = (course, level) => (level.task > 0 ? course.builds({ id: level.id, task: level.task - 1 }) : [])
const building = (course, level) => (level.task === undefined ? [] : course.builds({ id: level.id }).filter((p) => !builtBefore(course, level).includes(p) && !course.adds(level).includes(p)))

// Whether a player with `flags` has earned a part a level reaches: a primitive, and a built part once its builder
// level is solved (until the content is fixed, a part no level builds, or one the level builds itself: audit reports
// both). A part built on an optional level is held only by the levels that require that level.
function earned(course, level, flags, p) {
  if (course.primitives.has(p)) return true
  if (course.plan?.externalItems?.get(level.id)?.has(p)) return true
  const need = course.needs(p), by = course.builder(p)
  if (!need || !by || by === level.id) return true
  if (course.plan?.place.get(by)?.optional && !course.before(by, level.id)) return false
  return flags.has(need)
}

/**
 * The parts a level really holds for a player with `flags` (the unlocks of the levels solved): of everything it can
 * reach (or of `parts`, some it has met), those the player has earned, and those the level gives (`gives`: in their
 * place when it reaches them, after the rest when not), less those it withholds (`withholds`) and, of a task, those
 * its level builds that no task before it has built (and the level does not bring in itself).
 */
export function usable(course, level, flags, parts = reach(course, level)) {
  if (course.available) return parts
  const given = course.gives(level).filter(isPartItem)
  const withheld = new Set([...course.withholds(level), ...building(course, level)])
  return [...new Set([...parts.filter((p) => given.includes(p) || earned(course, level, flags, p)), ...given])].filter((p) => !withheld.has(p))
}

/**
 * Whether a level holds an item for a player with `flags`: has(part), has(part, key), has(part, key, value), has.inside(part, form). A part
 * as `usable` says. A setting, or a value of one, unless the level withholds it: when the level gives it; else, one
 * that needs a flag once the player has the flag, one a level opens (`opens`) from that level on along the tree, and
 * any other from the start. A value is held only with its setting.
 */
export function holds(course, level, flags) {
  const given = new Set(course.gives(level))
  const withheld = new Set(course.withholds(level))
  let parts = null
  let here = null
  // The settings and values opened by this level and the levels it comes after.
  const opened = () => (here ??= new Set([...course.opens(level), ...course.levels.filter((l) => course.before(l.id, level.id)).flatMap((l) => course.opens(l).filter((item) => !course.local(item, l)))]))
  const one = (item) => {
    if (withheld.has(item)) return false
    if (given.has(item) || course.plan?.externalItems?.get(level.id)?.has(item)) return true
    if (course.local(item, level)) return true
    const need = course.needs(item)
    if (need) return flags.has(need)
    return !course.gated.has(item) || opened().has(item)
  }
  const has = (part, key, value) => {
    if (course.available) {
      if (!course.available(level).includes(part)) return false
      if (key === undefined) return true
      const items = course.availableItems(level)
      return items.includes(part) || items.includes(itemOf(part, key)) || items.includes(itemOf(part, key, value))
    }
    if (key === undefined) return (parts ??= new Set(usable(course, level, flags))).has(part)
    return one(itemOf(part, key)) && (value === undefined || one(itemOf(part, key, value)))
  }
  has.inside = (part, form, options) => course.references?.resolve(part, form, course.available ? null : level, options) ?? null
  has.forms = (part) => course.references?.forms(part, course.available ? null : level) ?? []
  return has
}

/** The reference and author-selected parts are shown first; other usable parts stay folded. */
export function offer(course, level, flags) {
  const all = usable(course, level, flags)
  const foreground = new Set([...(course.needed(level) ?? []), ...course.featured(level)])
  const shown = all.filter((part) => foreground.has(part))
  const folded = all.filter((part) => !foreground.has(part))
  return { shown, folded, types: [...shown, ...folded] }
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
  const keys = (l) => course.adds(l).filter((p) => course.primitives.has(p) && !course.local(p, l)).map(keyOf)
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

/** Chapter starts and levels introducing parts or ideas are drawn as milestones. */
export function isCore(course, level) {
  const at = course.plan?.place.get(level.id)
  if (!at) return true
  const own = course.levels[course.index.get(level.id)]
  const era = course.eras.find((e) => e.id === at.era)
  return era.levels[0]?.id === level.id || (own.unlocks ?? []).length > 0 || fresh(course, own).size > 0
}

/** Every broken rule, as { rule, level, part, text }, in play order. */
export function audit(course) {
  const out = []
  const say = (rule, level, part, text) => out.push({ rule, level, part, text })
  const plan = course.plan
  const levels = course.levels
  const unbuilt = new Set()
  for (const level of levels) {
    for (const task of course.openParts(level)) if (task.staged && task.count > OPEN_PART_LIMIT) say('open-crowded', level.id, task.task, `${task.task}: ${task.count} loose parts (limit ${OPEN_PART_LIMIT}); split the task or build an earlier stage`)
    const granted = new Set(course.gives(level))
    const earlier = levels.filter((l) => course.before(l.id, level.id)).flatMap((l) => course.adds(l).filter((p) => !course.local(p, l)))
    // The ideas new here; a part built by the player is never new where it is first used.
    const ideas = fresh(course, level)
    for (const p of course.adds(level)) {
      const by = course.builder(p)
      if (course.primitives.has(p)) { if (earlier.includes(p) && !course.local(p, level)) say('carried', level.id, p, 'brought in again, though an earlier level already did'); continue }
      if (granted.has(p)) say('granted', level.id, p, 'handed out by the level, not built by the player')
      else if (!by) { if (!unbuilt.has(p)) say('not-built', level.id, p, 'no level builds it and it is not a primitive'); unbuilt.add(p) }
      else if (by === level.id) say('own-level', level.id, p, 'offered in the very level that builds it')
      // A part that stays where it is brought is brought again by name: that is no carry.
      else if (course.before(by, level.id)) { if (!course.local(p, level)) say('carried', level.id, p, `named, though it carries here from ${by} anyway`) }
      else {
        const optional = plan?.place.get(by)?.optional
        say(optional ? 'optional-needed' : 'built-later', level.id, p, optional ? `needs ${by}, which sits on an optional branch it does not require` : `offered where ${by}, the level that builds it, need not be solved yet`)
      }
    }
    // A new primitive has a lead-in: its first level asks for more than placing it and wiring it to the goal.
    // And a part a level builds is used by a later level's reference answer. Both for courses that keep the chain.
    if (course.abstraction) {
      const used = course.needed(level)?.filter((p) => course.primitives.has(p) || course.needs(p))
      for (const p of ideas) if (used?.length === 1 && course.concept(used[0]) === p && !shown(course.showcase(level))) say('bare-intro', level.id, p, 'its first level is that part alone, wired to the goal')
      // A later task of the level itself counts: it may put to work what its earlier task proved.
      for (const b of course.builds(level)) if (!shown(course.showcase(level)) && !course.needed(level)?.includes(b) && !levels.some((l) => course.before(level.id, l.id) && (course.needed(l)?.includes(b) || course.builds(l).includes(b) && course.carries(l).includes(level.id)))) say('unused', level.id, b, 'built here, and no later reference answer uses it')
    }
    // A part built on an optional level is for the levels that require it alone: anyone else may not have it.
    for (const p of course.needed(level) ?? []) {
      const by = course.builder(p)
      if (by && by !== level.id && plan?.place.get(by)?.optional && !course.before(by, level.id)) say('optional-built', level.id, p, `built on the optional level ${by}, which this level does not require`)
    }
    // A level that builds a part built before (an upgrade) requires every level that built it before.
    for (const b of course.builds(level)) {
      const earlier = levels.filter((l) => l.id !== level.id && course.builds(l).includes(b) && !course.before(level.id, l.id))
      for (const l of earlier) if (!course.before(l.id, level.id)) say('upgrade-order', level.id, b, `builds ${b} as ${l.id} does, and does not require it`)
    }
    if (ideas.size > 1) say('many-new', level.id, [...ideas].join(' '), `${ideas.size} new parts in one level (one new idea per level)`)
  }
  trayRules(course, say)
  idle(course, say)
  bypass(course, say)
  for (const level of levels) for (const from of course.carries(level)) if (!course.before(from, level.id)) say('carry-unseen', level.id, from)
  if (!plan) return out
  // The era rules.
  const placed = new Set(plan.order)
  for (const level of levels) if (!placed.has(level.id)) say('unplaced', level.id, '', 'in no era')
  const eraOf = new Map(course.eras.map((e, i) => [e.id, i]))
  const machines = course.eras.map((e) => e.machine ?? null)
  for (const level of levels) {
    const at = plan.place.get(level.id)
    if (!at) continue
    const m = course.machine(level), k = machines.indexOf(m)
    if (m && (k < 0 || k > eraOf.get(at.era))) say('machine', level.id, m, `played on ${m}, not a machine of era ${at.era} or before`)
    // The machine can do everything the level's board relies on.
    const can = m ? course.can(m) : null
    if (can) { const missing = course.uses(level).filter((x) => !can.includes(x)); if (missing.length) say('mechanism', level.id, missing.join(' '), `${m} cannot do what the board uses`) }
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

/** Tray entries describe real course pieces, regardless of where players first meet those pieces. */
function trayRules(course, say) {
  if (course.complete === false) return
  const met = new Set(course.levels.flatMap((level) => [...course.adds(level), ...course.builds(level)]))
  for (const [name, entries] of Object.entries(course.trays)) for (const p of trayMembers(entries)) {
    if (!met.has(p)) say('tray-unmet', '', p, `tray ${name} lists it, and no level brings it in or builds it`)
  }
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
 * not checked by this rule.
 * The rule finds an idea brought in early, or several stacked before any is used. It asks for no number of levels:
 * the fix is to move an idea to where it is needed, never to pad the course.
 */
function idle(course, say) {
  const placed = course.levels.filter((l) => !course.plan || course.plan.place.has(l.id))
  const required = (l) => !course.plan?.place.get(l.id)?.optional
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
      // An upgraded part runs the revision of a later builder: every level before this one that builds it counts.
      for (const at of placed.filter((m) => course.builds(m).includes(p) && course.before(m.id, l.id))) if (!seen.has(at.id)) for (const c of concepts(at, seen)) out.add(c)
    }
    inside.set(l.id, out)
    return out
  }
  const news = new Map(placed.map((l) => {
    const seen = new Set(placed.filter((m) => course.before(m.id, l.id)).flatMap(abilities))
    const kept = new Set(course.adds(l).filter((p) => !course.local(p, l)).map(course.concept))
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
      if (!built(part) || course.builds(level).includes(part) || !course.before(course.builder(part), level.id)) continue
      const by = course.levels.filter((l) => course.builds(l).includes(part) && course.before(l.id, level.id)).at(-1)
      const own = course.boards(by).at(-1)
      const hit = own && course.boards(level).map((b) => rebuilt(own, b, isPart)).find((phi) => phi?.size >= 3)
      if (hit) say('bypass', level.id, part, `${hit.size} of its parts are the board of ${by}, which one ${part} would replace`)
    }
  }
}
