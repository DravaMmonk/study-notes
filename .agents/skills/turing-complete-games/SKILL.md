---
name: turing-complete-games
description: Design, extend or review the Turing-Complete-style learning games in study-notes (games/, built on games/kit) — curricula, eras, levels, parts, and component-wiring interaction.
---

# Turing-Complete-style learning games

## Scope

Use this skill in the study-notes repository for any work on the learning games under `games/`
(《视觉完备》《状态之图》《证明完毕》《句法之图》《一切皆文件》 and new ones): designing a curriculum,
adding or reordering levels, adding parts or machine abilities, or changing the shared kit's editors.

## Source of truth

The design rules live in the repository, not in this skill. Before designing or reviewing, read:

1. `games/DESIGN.md` — the shared handbook: principles (§1), course structure and practice clusters (§2,
   especially §2.3), level spec (§4), audit rules (§5), engine layering (§6), author workflow (§7), pitfalls (§8)
   and case studies (§9–11).
2. `games/<game>/DESIGN.md` (or `CURRICULUM.md`) — the topic's own design.
3. The game's spec: `games/<game>/spec.js` and its `levels/` (eras in `levels/eras.js` or `levels/route.js`).

When a lesson is learned while working on a game, write it into `games/DESIGN.md` (and the game's own
design doc if it is topic-specific), not into this skill.

## Hard rules

- A game writes only its spec. Parts, worlds, evaluation and UI belong in `games/kit` (domain modules under
  `games/kit/domains/`); add new capabilities there, never inside a game folder.
- Never grant a part directly; a non-primitive part is unlocked only by the level that builds it.
- `npm run check` (in `trace-viewer/`) must be clean before committing curriculum changes; `npm test` for kit
  changes.

## Curriculum review checklist

The audit cannot see everything. Before calling a curriculum done, check these by hand (they come from real
problems in 《证明完毕》, see `games/DESIGN.md` §11):

- **Practice density.** Each new mechanism is followed by its own cluster of 3–5 levels that vary it along
  different dimensions (§2.3 table: surface, direction, depth, scaffolding, combination, true-or-false), easy to
  hard, ending in a combination or a false-target level — before the next mechanism appears. The era must not
  read as a list of one theorem or rule per level.
- **Lead-in.** Every new part or ability has a cause: an earlier level where the player does it by hand or hits
  the wall it removes. A level whose reference answer is "place the new part, wire it to the goal" is a smell.
- **Motivation on the main path.** A required level's intro must not depend on an optional challenge or topic.
- **Abstraction keeps rising.** Draw the part dependency graph (§7 step 4). Every built part is used by later
  reference answers, in places where not having it would be long. Later levels lean on higher-level parts; a
  late reference answer built only from primitives means the chain is broken.
- **Across eras.** Within an era every part met stays usable. Every era after the first declares `keeps`: `'all'`
  when it continues the previous machine (extends or upgrades it), so earlier work is never dropped; a list (possibly
  `[]`) when it changes topic, leaving the rest behind. Ask: is the new machine a continuation of the last one?
- **Discovery, not transcription.** No level hands over a formula to wire up; a quantity with several parameters
  is a bench that opens one knob per step. A hard mechanism gets its own intro levels as a named series (§2.2).
- **Order by dependency.** Parallel sets and optional branches follow the part and concept dependencies (§2).
  Anything that asks "what has the player seen" (new-part marks, view unlocks, unlock-all flags, linked levels in
  copy) uses the level's prerequisites, never the flat play order.
- **Renumbering needs a save migration** (§2): renamed ids, flags now set by another level, new intro levels
  marked passed when a later one is.
- **Level tree shape.** The map tree is at most three columns wide, at most three levels per row. A parallel set
  (`branches`) has at most three branches; split more into two sets in sequence. An optional branch does not get
  its own outward column: `LevelMap.jsx` drops it into the first free rows inside the existing columns below its
  anchor. Check the map in a browser after reordering; if a branch lands far below its anchor, pick another
  anchor (`after`) that has the same prerequisites.
- The usual pitfalls in §8: one new idea per level, no orphan levels, intro text that does not give the answer,
  topics that are one problem growing, challenges that are hard by insight rather than by tedium.

## Copy checklist

The rules are in `games/DESIGN.md` §4. Read every intro, hint, pass text and part description against them:

- No spoiler of a core idea of the topic (a recurrence, why a merge operation is right); say what a part does,
  never why it solves the level. Mechanical levels may hand-hold.
- No forward references: nothing about later levels; a pass text only sums up this level.
- References to another level are links, `<level-ref to="id"></level-ref>` on both the zh and en side (shown as the
  level's number and title with a link icon, read live, so renumbering needs no copy change; clicking asks, then goes there). Never 「its title」, "上一关", "前两关", "the last
  level" or a number; `npm run check` reports them. A title that is also a part's name goes in the spec's `quotes`.
- No level numbers in level copy; refer to earlier things by name. Level numbers belong on the map, in the
  components box and in the encyclopedia.
- After any reordering, every linked level must still be a prerequisite, and every "又是", "新元件" must hold on every
  prerequisite path.

## Interface checklist

Shared conventions are in `games/DESIGN.md` §2.5 (the map's level tree) and §6 (interface conventions): level tree
with centred rows and one column per series; a left drawer of level trees inside a level; the pass dialog returns to
the map and the map lands on that level; input cards hold what they read and are clicked to wire; the test board
sits in the strip at a modest size; card values repaint on every step of a run; no newer JS APIs that break older
iOS Safari.

## Verification

Before calling a change done (`games/DESIGN.md` §7, steps 8–10):

1. `npm run check` and `npm test` in `trace-viewer/` are clean; build the touched games.
2. Look in a browser on desktop and phone at a few typical levels per game (layers, sweeps, intervals, big tables),
   not only the one you changed. To watch a run, write the reference solution into the save, then step and run.
3. Report what was checked and what was not.

## Interaction

The shared editors are in `games/kit/circuit/`:

- Desktop: free canvas of cards, wires dragged from an output port (dropping on a card wires its first free
  input), Delete removes the selection, pan / pinch / Ctrl-wheel zoom, fit-to-board.
- Phone: slot grid with inputs on top and outputs at the bottom, no pan or zoom; tap a port, compatible ports
  light up, tap another to wire; drags start after a short hold so swipes still scroll; tray doubles as delete.
- Both edit the same graph; illegal wires are refused at connection time with a reason
  (`parts.refuse`); wire colour follows its source.

Keep a change to either editor working for every game that uses the kit.
