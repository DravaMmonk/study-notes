---
name: turing-complete-games
description: Design, extend or review the learning games in study-notes (games/ and packages/, built on games/kit) — curricula, chapters, levels, pieces, stages, and component-wiring interaction.
---

# Turing-Complete-style learning games

## Scope and source of truth

Use this skill for the learning games under `games/`, their content in `packages/`, and their shared kernel.
Before work, read the relevant parts of:

1. [`games/DESIGN.md`](../../../games/DESIGN.md): principles (§1), course structure (§2), level design (§4),
   technical checks and authoring standards (§5), implemented architecture (§6), author workflow (§7).
   This handbook describes the current structure; source code settles implementation details when prose is stale.
2. [`games/DIRECTION.md`](../../../games/DIRECTION.md) and [`games/PLAN.md`](../../../games/PLAN.md): future
   direction and remaining work. They do not override the handbook's implemented package model.
3. `games/<game>/DESIGN.md` or `CURRICULUM.md`: the topic's own choices and intended learning route.
4. The selected packages and game data, and the kernel vocabulary (`engine/kernel.js`, module declarations,
   or the `vocabulary` tool). Read `npm run op -- list` before selecting operations.

Keep the affected design and implemented content aligned. Preserve unrelated work and follow the user's task scope.

## Implementation contracts

- The kernel owns mechanisms, editors, judging, checks, playback, feedback and availability. Code is organized in
  `games/kit/modules/<module>/`; modules register closed capabilities through `module.js`, runtime contracts through
  `runtime.js`, and displays through registered display loaders. Packages do not belong to a module. Do not create
  `domains/` or `scaffold/` layers or duplicate course logic in an adapter.
- There is one capability vocabulary and version line (`kit/engine/kernel.js`, snapshots in `engine/versions/`),
  and one course model (`engine/course-model.js`, `kit/course.js`). Capability names are `<module>:<name>`;
  typed operations declare ports, optional inputs, regions and parameters. Wiring and piece checks use value types.
- Content is data. `packages/<package>/package.json` declares direct `uses` and minimum `vocabulary` version.
  A package can use its own objects and direct dependencies, without transitive reference authorization. Games
  select the complete dependency closure in `game.json`'s `packages`; loading is topological, with the game last.
- Each object has its own file: `levels/`, `pieces/`, `entries/`, `tags/<level|piece|entry>/`, `relations/`,
  `trays/`, `sections/`, or a kernel-declared content-kind folder (`wordset/`, `quote/`, `power/`, `box/`).
  File names supply object ids; task, stage, menu and chapter ids remain inside their containing objects.
  Do not recreate `groups/`, `pieces.json`, `glossary.json`, `trays.json`, or package layouts/courses.
- Object full names are `<package>/<name>`, game copy uses the `@<game>` namespace, and tag references use `#`.
  Local short references are qualified on assembly. Tags are unordered, typed development collections; they
  have no runtime teaching or presentation role. Relations (`requires`, `order`, `replaces`) load automatically.
  Use `of: "tag"` for ordering tags themselves. Trays and encyclopedia sections are separate objects.
- Overrides belong to the authoring layer in `overrides/<namespace>/`: `levels/`, `piece/`, `entries/`,
  `tag/<kind>/`, `relations/`, `trays/`, `sections/`, content-kind folders, or `i18n/<lang>.json`.
  Objects replace by default (`$merge` opts into merge patch); collections append (`replace` and `remove`
  control membership). Independent packages overriding the same object must establish a dependency.
  Preserve source and override history; never edit a dependency's declaration from the current workspace.
- A game only arranges content: `course.json` has `chapters`, each with an ordered list of full level names
  in `levels`, and map `rows` (up to three positions per row). The order must respect `requires`. Optional and
  skippable selections belong to the game. Game overrides are limited to copy and level relations; no objects
  or behavior changes are declared there. Use a dependent package for new or changed behavior.
- A package has no course, chapters, unlock graph or learning progress. `check -- --package` checks objects,
  pieces and each level separately; package play opens a single level with its tray (all pieces/stages when
  omitted). Never generate a package course to reuse a game-only check or UI path.
- Pieces in `pieces/<name>.json` choose `op` (or one operation per output) and narrow its settings, then add
  presentation. Settings are inline, not independent objects. No `compute` expressions implement calculations;
  expressions remain for interaction rules, checks and readouts. `stages` lists later linear upgrades, with the
  piece itself as stage one. Piece and stage ids share a namespace. `opens` applies at task start; `awards`
  applies after passing. `gives`/`withholds` adjust only this task; `local` stays with its introducing level/task.
- Built pieces use `inside` variants and reference works; tasks `publish` through the `publishes` list and
  explicitly award stages. They normally run the player's passing work, using a reference if unavailable;
  plays may explicitly choose reference works. Keep the selected variant and its dependency closure intact.
- Ids never change after creation, including task, stage and chapter ids. Rename visible text, not identity.
  There is no rename operation. New identity requires explicit creation and deletion. Task moves preserve ids.
- Copy fields reference stable `@key` values. Each layer owns `i18n/<lang>.json`; overrides use
  `overrides/<namespace>/i18n/<lang>.json`. Edit with `text.set` or the applicable override operation,
  using object selectors and field paths. Text keys and blueprints accept qualified names.
- Content changes only go through operations: `npm run op -- <game> --file <changeset.json>`, or
  `npm run op -- --package <package> --file <changeset.json>`, MCP `modify`, or Studio. A changeset is
  `{ "why": "...", "ops": [...] }`; preview and validate before writing. Bulk migrations may use a temporary
  script followed by `adopt --why "..."` for each affected game/package; do not retain migration scripts.
- Studio (§6.7) has build, arrange and copy workspaces, with resource, main editor and configuration columns.
  It uses the same preview/modify/undo tools as agents. Keep adapters thin. Follow the user's ownership boundary
  when another engineer owns Studio or frontend work; schema migrations warrant only required mechanical fixes.
- New content starts from `kit/templates/<template>/starter/`: `npm run new-package -- <id> --template <name>`,
  `npm run new-game -- <id> --template <name>`. To reuse an existing game’s packages and startup settings,
  use the `create_game` tool (`id`, `from`, `title`), then the package-selection operations.
  Templates are copied, not depended upon. Shared evolving pieces belong in library packages such as `arithmetic`.
- Tests use content written in the test or template `starter/`, never real game levels, ids or counts. Actual
  game/package correctness belongs to `npm run check -- <game>` and `npm run check -- --package <package>`.
  All commands here run in `trace-viewer/`. Kernel changes require `npm test`, `npm run lint:kit`, and
  `npm run words -- --check`. Vocabulary changes require a version bump, declared `removes` for deletions or
  changes, and `npm run versions`; snapshots are immutable. For behavior refactors, capture affected game
  check output before the change and compare afterwards, reporting only explicitly authorized differences.
- For bounded copy, UI or local behavior changes, select checks from handbook §7.0; inspect desktop and phone
  when interaction changes. Passing tests or a build do not establish visual or teaching quality.
- The optional author pipeline (§7.2, `kit/pipeline/`) retains the CLI step name `domain` for kernel capability
  requests. It does not create a domain layer or grant content agents code ownership. Pipeline gates and
  teaching lint are authoring aids, distinct from kernel technical checks and §5.1 review duties.

## Level authoring standards

Read `games/DESIGN.md` §5.1 when authoring or reviewing levels. These are human and agent review duties,
not kernel gates or content fields. The implemented package and kernel structure is in handbook §6.1–6.3.

- Introduce a main idea through a real problem, judging cognitive load rather than counting pieces. Do not create
  concept tags or a `concept()` mapping; tags are development collections with no runtime behavior.
- Put a new capability to work when it appears and reuse it soon in subsequent tasks or packed works. Reconsider
  early introductions instead of adding filler to satisfy counts or intervals (`many-new`, `idle-idea`).
- Make first encounters observable and meaningful. A tool that a sentence explains should enter a real task;
  an abstract tool may warrant a focused encounter with intermediate states and contrasting cases. Explain this in
  design notes, never a `showcase` exception field (`bare-intro`).
- Review reuse of built works and repeated structures. Prefer an appropriate abstraction where it serves the task;
  terminal works may stand on their own (`unused`, `bypass`).
- Review loose pieces and the actual phone workflow after staging. Eight loose pieces is a review prompt, not an
  enforced limit; split tasks or build intermediate works when the observed load warrants it (`open-crowded`).
- Prefer meaningful construction, but lend tools or givens through `gives` where appropriate. Avoid redundant
  introduction declarations when they add no clarity (`granted`, `carried`).
- Interpret attempts, hints, abandonment and time with player context and sample size. Difficulty thresholds do not
  decide pedagogical correctness (`difficulty-spike`).
- Check still enforces schemas, references, types, passing references, failing naive works, reachable unlocks,
  prerequisites and introduced tray pieces/stages. A passing check does not establish teaching quality.
- New badges follow the first introduction of each piece or stage on the prerequisite route; a new stage marks its
  existing piece card. They are independent of how the author explains the underlying ideas.

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
- Write clear context, goals, hints and explanations in the game's language. Pass text explains the principle and its scope
  without assuming a particular reference solution. Link to available terms when helpful and compatible with
  the content's validation; glossary access does not replace instructional evidence.
- Check the actual desktop and phone flow when it changes. Use the optional review prompts in
  [references/learning-review.md](references/learning-review.md) for complex curricula or interactions.

## Interface checklist

Read `games/DESIGN.md` §6.9 before changing any interface, and §2.6 for the map's level tree. Above all: let the
layout speak — no secondary labels or descriptions, nothing said twice, dense use of space; every game gets the same
layout and interactions from the shared kit; on phone, operability comes before a complete picture. Also: a left
drawer of level trees inside a level; the pass dialog returns to the map and the map lands on that level; input cards
hold what they read and are clicked to wire; card values repaint on every step of a run; a board's last run stays on
it while the level is open (`lastRun` / `keepRun`, in memory); no newer JS APIs that break older iOS Safari.

## Verification

Before calling a change done (`games/DESIGN.md` §7.0):

1. The design docs say what the change did (docs first, see above), with nothing outdated left in them.
2. Select tests, content checks and builds from the impact matrix in handbook §7.0. Documentation-only edits need
   no executable checks. Name the affected game and test files explicitly; broaden only for demonstrated dependency
   effects, failures or changes whose consumers cannot be bounded. Do not repeat a passed check without a relevant change.
3. For visual or interaction changes, inspect the changed flow on desktop and phone; add representative consumers
   only when shared UI is affected. Pure model changes need browser review only if their displayed behaviour changes.
   To watch a run, write the reference solution into the save, then step and run.
4. A new runtime module gives its `play` hook in `runtime.js` (circuit play through `kit/engine/play/circuit.js`): the
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

- Frames (`kit/circuit/frames.js`, first used by 《证明完毕》's assumption box) are shared: a module makes a frame
  part with `framePart(own, regions)` and evaluates each region's value by `key`; the editors, scoping and save
  checks (`regionsFit`) come from the kit. Dragging a card over a region it can go into lights that region up.

Keep a change to either editor working for every game that uses the kit.
