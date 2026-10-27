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

**Docs first, and only the current design.** Every change to a course (a new chapter, a reordering, parts split
or merged, a mechanism moved) is made in the design docs before the code: `games/DESIGN.md` for what holds for every
game, the game's own design doc for its course. Then the code follows the docs. The docs describe the design as it is
and the plan ahead, never "it used to be …, now …": delete what no longer holds as you change it (git keeps the
history); a reordering still to do may stand as a work list in the doc, deleted once done. After each piece of work,
think about whether it taught a rule more general than the case at hand: if so, write it into the handbook (and into
this skill's checklists if it is something to check by hand), and rewrite any rule it makes wrong, rather than
copying the last wording forward.

## Hard rules

- A game writes only its spec. Parts, worlds, evaluation and UI belong in `games/kit` (domain modules under
  `games/kit/domains/`); add new capabilities there, never inside a game folder.
- Never grant a part directly; a non-primitive part is unlocked only by the level that builds it.
- `npm run check` (in `trace-viewer/`) must be clean before committing curriculum changes; `npm test` for kit
  changes.
- Part types, port names and setting values are ASCII, so every board prints as a blueprint (`kit/circuit/text.js`,
  `games/DESIGN.md` §6): symbols go in labels; a notation that is symbolic by nature gets a `parts.text` spelling.

## Purpose: depth, not brevity

These games exist to go step by step from the very first idea to advanced knowledge. Length is never a reason to
cut: as long as every level has real content and the layout follows the rules below, a longer era or a longer
course is better — a complex mechanism taken apart into more pieces, each built up from the one below it in more
detail, is exactly the point. When planning, do not cap the number of levels or chapters, merge eras to save
length, or skip a sub-mechanism because "the course is already long"; take a hard mechanism apart until each piece
is one small step, and give each piece its practice. What is not allowed is padding: levels that repeat without a
new dimension, or chapters with no mechanism of their own.

## Curriculum review checklist

The audit cannot see everything. Before calling a curriculum done, check these by hand (`games/DESIGN.md` §11
shows them at work in 《证明完毕》):

- **Practice density.** Each new mechanism is followed by its own cluster of 3–5 levels that vary it along
  different dimensions (§2.3 table: surface, direction, depth, scaffolding, combination, true-or-false), easy to
  hard, ending in a combination or a false-target level — before the next mechanism appears. The era must not
  read as a list of one theorem or rule per level.
- **Lead-in.** Every new part or ability has a cause: an earlier level where the player does it by hand or hits
  the wall it removes. A level whose reference answer is "place the new part, wire it to the goal" is a smell. The
  one exception is a part whose use is itself abstract enough to get wrong from its description (an assumption box:
  a region, two dots, results leaving only through its conclusion): one level may just show how it is used, marked
  `showcase: '<what is abstract about it>'`. A part one sentence explains (a block gate: "yes" gives "—", else it
  passes) gets no level of its own; it first appears inside a real problem.
- **Motivation on the main path.** A required level's intro must not depend on an optional challenge or topic.
- **Abstraction keeps rising.** Draw the part dependency graph (§7 step 5). Every built part is used by later
  reference answers, in places where not having it would be long. Later levels lean on higher-level parts; a
  late reference answer built only from primitives means the chain is broken.
- **Across eras.** Within an era every part met stays usable. Every era after the first declares `keeps`: `'all'`
  when it continues the previous machine (extends or upgrades it), so earlier work is never dropped; a list (possibly
  `[]`) when it changes topic, leaving the rest behind. Ask: is the new machine a continuation of the last one?
- **Discovery, not transcription.** No level hands over a formula to wire up; a quantity with several parameters
  is a bench that opens one knob per step. A hard mechanism gets its own intro levels as a named series (§2.2).
- **Branch whatever does not depend** (§1, §2). A run of levels that needs no part unlocked and no idea taught by the
  run before it must not wait behind it: make them a parallel set, or hang the run after the level it really needs.
  For each series, list the levels its reference answers and copy actually draw on; a series placed earlier that is
  not on the list is where the path should split. A branch may be long (several series in a row); at most three
  branches per set. Anything that asks "what has the player seen" (new-part marks, view unlocks, unlock-all flags,
  linked levels in copy) uses the level's prerequisites, never the flat play order.
- **Intros assemble the machine** (§1). The point is building one big machine from the bottom up, not a run of
  puzzles. Every intro says what the machine in hand (or the level before) cannot do here, what piece this level
  adds, and where it goes in the machine; "A new part, X: …" only comes after the need for it is said, and an intro
  that is just that sentence is lazy. A practice level with no new part says which dimension it changes. A chapter's
  first level says what module the chapter adds and why the last chapter's machine is not enough.
- **A mechanism goes where it is first needed** (§1). Being provable or buildable early is no reason to place it
  early: ask of each mechanism where it is first indispensable, and put it there, ideally as the wall that level
  hits (in 《证明完毕》 excluded middle comes after the player's own auto fails on it; De Morgan comes with the
  simplifier that pushes negations in; proof terms come just before the chapters built on them). A chapter that
  only looks again at what was done before, in a new light, gathers each point's small tasks into one level.
- **Primitives stay minimal** (§1). Whatever can be wired from parts already held is built by a builder level, never
  given as a new primitive: ask of every primitive whether the parts in hand make it. A description saying "X and Y in
  one step", "X, then Y" or "tries each of them" names a built part. A setting that hides a combination of parts (a
  card offering "a set of rules") is a primitive in disguise too. The built part's implementation does exactly what
  its circuit does, side effects included (the circuit keeps a hypothesis, so the part keeps it); a choice made in the
  circuit (which rule, a constant) may stay as a setting on the built part. A builder level of a one-step transform
  states what the step makes (`becomes` in 《证明完毕》), so the built-in alone can pass it.
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
- References to a level, a part or an encyclopedia entry are links, on both the zh and en side:
  `<level-ref to="id">`, `<part-ref to="part key">`, `<wiki-ref to="entry id">` (each closed at once). They show the
  name (a level's number too) read live, so renaming or renumbering needs no copy change; a level asks before going
  there, a part or an entry opens the box or the encyclopedia at it. Never 「its name」, "上一关", "前两关", "the last
  level" or a number; `npm run check` reports them. A name used for something else (a phrase, a button) goes in the
  spec's `quotes`.
- Everything on a board is a 元件 (part) in copy, never 卡片/card or 块/block; the phone board never names slot numbers
  ("放在这一格", "放下了「① 套用」").
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

Before calling a change done (`games/DESIGN.md` §7, steps 9–11):

1. The design docs say what the change did (docs first, see above), with nothing outdated left in them.
2. `npm run check` and `npm test` in `trace-viewer/` are clean; build the touched games.
3. Look in a browser on desktop and phone at a few typical levels per game (layers, sweeps, intervals, big tables),
   not only the one you changed. To watch a run, write the reference solution into the save, then step and run.
4. Report what was checked and what was not.

## Interaction

The shared editors are in `games/kit/circuit/`:

- Desktop: free canvas of cards, wires dragged from an output port (dropping on a card wires its first free
  input); clicking a wired input takes its wire off and leaves it in hand on its output, to click onto another
  input or drop on the board; Delete removes the selection, pan / pinch / Ctrl-wheel zoom, fit-to-board.
- Phone: slot grid with inputs on top and outputs at the bottom, no pan or zoom; tap a port, compatible ports
  light up, tap another to wire; drags start after a short hold so swipes still scroll; tray doubles as delete.
- Both edit the same graph; illegal wires are refused at connection time with a reason
  (`parts.refuse`); wire colour follows its source.

- Frames (`kit/circuit/frames.js`, first used by 《证明完毕》's assumption box) are shared: a domain makes a frame
  part with `framePart(own, regions)` and evaluates each region's value by `key`; the editors, scoping and save
  checks (`regionsFit`) come from the kit. Dragging a card over a region it can go into lights that region up.

Keep a change to either editor working for every game that uses the kit.
