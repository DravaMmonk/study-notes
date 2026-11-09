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
   especially §2.3), level spec (§4), audit rules (§5), engine layering (§6), interface (§6.9), author workflow (§7), pitfalls (§8)
   and case studies (§9–11).
2. `games/<game>/DESIGN.md` (or `CURRICULUM.md`) — the topic's own design.
3. The game's content (`games/DESIGN.md` §6.1): `games/<game>/game.json` (eras, parts), `levels/<id>.json`
   and `glossary.json`, written in its domain's vocabulary (`games/kit/domains/<domain>/vocabulary.js`).

Keep the relevant game design and handbook aligned with the implemented course. Document substantive design
changes and general lessons where they help future work; use the user's scope and judgment to choose the detail.

## Implementation contracts

- Three layers: kernel (`games/kit/engine`, `circuit`, `shell`), domain (`games/kit/domains/<domain>`: vocabulary,
  model, items, ui), content (`games/<game>/`). Content is data only: it picks vocabulary items `{ item: params }`
  and writes tests, copy and reference / naive boards as blueprint text, never a function. Anything new (an engine
  resource, a world, a check, a panel) goes into the domain's vocabulary and implementation.
- Where the domain gives engine resources (`op` kind), a game's primitive parts are content: `games/<game>/parts.json`
  (`games/DESIGN.md` §6.8) — ports, settings in the six kernel controls, an ASCII expression calling only resources
  and kernel builtins, interaction rules and checks, and the card / tile / detail views. Change a part there (studio's
  parts tab, or `part.*`, `parts.set`), never in domain code; a computation no resource can express is a new resource.
- A level is a list of tasks (`games/DESIGN.md` §4, `kit/engine/tasks.js`): what it says once (title, intro, pass
  text, parts brought and built) on the level, each puzzle (brief, hints, ports, tests, answers) a task; a level of one
  task is a plain level. Every task has an id unique in the game (a level's one task usually has the level's id); what
  players keep goes by it, so tasks are inserted, reordered, moved into another level or renamed with `task.add`,
  `task.move`, `task.remove`, `task.rename` (two levels made one: move the tasks, remove the emptied level in the same
  changeset). A new domain writes its level schema with `taskLevel(once, task)` and reads levels task by task
  (`taskLevels`); the prototype domains keep `kind` plus optional `tasks` without ids until they are redone.
- Unit tests (`npm test`) never know a level: they test the kernel and domains on content written in the test or on
  the domain's `starter/`, never a game's levels, a level or task id, or a level count. A property of every game is
  checked game by game without naming a level; exceptions are declared by the domain or the content, not listed in a
  test. Whether a game's levels are right is `npm run check`'s job alone, so changing levels never changes a test.
- A domain keeps the domain contract (`games/DESIGN.md` §6.3, `kit/engine/contract.js`, checked by `npm test`). A new
  topic picks its mechanisms from the catalogue (§6.5) and starts from `npm run new-domain -- <name> --mechanism
  <m>`; a new game on an existing domain from `npm run new-game -- <id> --domain <d>`.
- The agent pipeline can produce a new topic (`games/DESIGN.md` §7.2, `kit/pipeline/`, `npm run pipeline --
  <game> …`): blueprint, domain (code, by an engineer), levels, copy, review, queue — each step a brief
  and a gate, each product written through the operation set, every run and gate recorded in `pipeline.json`. When a
  later step stops on an earlier one's product, hand its report back (`run <step> --from <later step>`); do not work
  around it in the later step.
- Choose built parts or presets based on the learning goal and their later use. A built part executes the board
  the player passed with; its interface and the level that unlocks it must agree with the current engine contract.
- Content changes go through the operation set (`games/DESIGN.md` §7.1): `npm run op -- <game> …`, the MCP
  server's `modify`, or the studio (`npm run studio`, §6.7: the same tools over HTTP; a level edited on the
  game's own page, played from the pending changeset, a click on a field on screen opening its schema control in the
  side panel and a + adding a task, hint, page or test where it shows; fields with no place on screen as rows), never JSON edited by hand. A changeset is checked as a whole and written
  only when it passes, with its save migration generated; read the game's `vocabulary` (MCP) or `npm run op -- list`
  first. A wording changed across a game is the `replace` tool's changeset (MCP, or the studio's search), run through
  `modify` like any other — never a find-and-replace on the files. The studio knows no domain: it picks a generic kernel control from a value's schema shape; where the shape
  does not say how a value reads, the vocabulary adds a declarative hint to the schema (`view: 'grid' | 'ticks'`,
  `step`, `section`; `games/DESIGN.md` §6.7), and a domain may only add a headless display (`scene` in domain.js),
  never an editor.
- Validate the changed scope using `games/DESIGN.md` §7.0. Curriculum checks name the affected game
  (`npm run check -- <game>`); module changes run relevant test files. Do not default to the full kit suite,
  all-game checks or all-game builds for a local edit. Reuse a successful operation-set check for unchanged content.
- Part types, port names and setting values are ASCII, so every board prints as a blueprint (`kit/circuit/text.js`,
  `games/DESIGN.md` §6): symbols go in labels; a notation that is symbolic by nature gets a `parts.text` spelling.

## Learning design and copy

The handbook's teaching guidance is advisory: apply expert judgment to the subject, players and user request,
not a fixed number of concepts, steps, branches or levels. Distinguish these design choices from actual schema,
engine and automated-check behavior; report a check or implementation constraint without claiming it proves
pedagogical quality.

- Start with the field problem and what players know; select meaningful construction, exploration, observation,
  reasoning or feedback. Scale scaffolding and task boundaries to the real conceptual load.
- Review dependencies, reusable abilities, tests, meaningful decisions, counterexamples and transfer where useful.
  Preserve support for multiple correct solutions. For parameter benches, verify what learners can observe and
  how they can reason about their choice, not merely that a solver finds a passing setting.
- Write clear bilingual context, goals, hints and explanations. Pass text explains the principle and its scope
  without assuming a particular reference solution. Link to available terms when helpful and compatible with
  the content's validation; glossary access does not replace instructional evidence.
- Check the actual desktop and phone flow when it changes. Use the optional review prompts in
  [references/learning-review.md](references/learning-review.md) for complex curricula or interactions.

## Interface checklist

Read `games/DESIGN.md` §6.9 before changing any interface, and §2.5 for the map's level tree. Above all: let the
layout speak — no secondary labels or descriptions, nothing said twice, dense use of space; every game gets the same
layout and interactions from the shared kit; on phone, operability comes before a complete picture. Also: a left
drawer of level trees inside a level; the pass dialog returns to the map and the map lands on that level; input cards
hold what they read and are clicked to wire; card values repaint on every step of a run; a board's last run stays on
it while the level is open (`lastRun` / `keepRun`, in memory); no newer JS APIs that break older iOS Safari.

## Verification

Before calling a change done (`games/DESIGN.md` §7, steps 9–11):

1. The design docs say what the change did (docs first, see above), with nothing outdated left in them.
2. Select tests, content checks and builds from the impact matrix in handbook §7.0. Documentation-only edits need
   no executable checks. Name the affected game and test files explicitly; broaden only for demonstrated dependency
   effects, failures or changes whose consumers cannot be bounded. Do not repeat a passed check without a relevant change.
3. For visual or interaction changes, inspect the changed flow on desktop and phone; add representative consumers
   only when shared UI is affected. Pure model changes need browser review only if their displayed behaviour changes.
   To watch a run, write the reference solution into the save, then step and run.
4. A new domain gives its `play` hook in `domain.js` (a circuit domain through `kit/engine/play/circuit.js`): the
   level in words and an attempt judged, which `run_tests` uses; its play tests run in `npm test`. Blind play is
   paused (`games/DESIGN.md` §6.6).
5. Report what was checked and what was not.

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
