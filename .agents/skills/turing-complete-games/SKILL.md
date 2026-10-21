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
- **Across eras.** A new machine either carries the previous era's built parts or has the player rebuild them
  (an upgrade) with its new abilities; earlier work is never simply dropped.
- The usual pitfalls in §8: one new idea per level, no orphan levels, intro text that does not give the answer,
  topics that are one problem growing, challenges that are hard by insight rather than by tedium.

## Interaction

The shared editors are in `games/kit/circuit/`:

- Desktop: free canvas of cards, wires dragged from an output port (dropping on a card wires its first free
  input), Delete removes the selection, pan / pinch / Ctrl-wheel zoom, fit-to-board.
- Phone: slot grid with inputs on top and outputs at the bottom, no pan or zoom; tap a port, compatible ports
  light up, tap another to wire; drags start after a short hold so swipes still scroll; tray doubles as delete.
- Both edit the same graph; illegal wires are refused at connection time with a reason
  (`parts.refuse`); wire colour follows its source.

Keep a change to either editor working for every game that uses the kit.
