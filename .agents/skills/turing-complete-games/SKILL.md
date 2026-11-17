---
name: turing-complete-games
description: Design, extend or review the learning games in study-notes (games/ and packages/, built on games/kit) — curricula, chapters, levels, parts, stages, and component-wiring interaction.
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

- After `games/MODULES.md` step 3, packages may provide `core/index.js` and `view/index.jsx`, both exporting
  `register(kernel)`. Follow MODULES.md over older architecture prose. New mechanisms belong in packages;
  the two remaining `kit/modules/` implementations retain explicit public circuit dependencies until their scheduled migration.
- Read [references/package-plugins.md](references/package-plugins.md) for package registration, data kinds,
  import boundaries, contracts and the remaining Studio integration. Core runs independently in Node;
  game/Studio Vite entries register both sides in topological `uses` order.
- Load installed game/package layers only through `engine/resolver.js:resolveLayers`. The resolver owns content
  roots, `GAMES_ROOT`, source directories and code-entry locations; the default is the current content workspace.
  Game consumers, builds and arrange workspaces consume resolved public data, never dependency files.
  `engine/existence.js` collects schema references, override/contribution targets, relation endpoints, grants and
  dependency selections, then checks `publicSurfaces` and manifest code identities. Never add another missing-target guard
  to loading, collection expansion or an object-specific checker. Keep `{ rule: "exists", at, layer, kind, target,
  member?, reason, says }` intact for consumers; manifest identities now provide the public surface in step 4.
- There is one capability vocabulary (`kit/engine/kernel.js`) and one platform version (`kit/platform.json`),
  and one course model (`packages/circuit/core/course-model.js`, `kit/course.js`). Capability names are `<module>:<name>`;
  typed operations declare ports, optional inputs, regions and parameters. Wiring and part checks use value types.
- Content is data. `packages/<package>/package.json` declares its semantic `version`, a `kernel` range, and a direct `uses` range map.
  A package can use its own objects and direct dependencies, without transitive reference authorization. Games
  select the complete dependency closure in `game.json`'s ordered `packages` range map and declare `kernel`; the first key is primary; loading is topological, with the game last.
- Each object has its own file: `levels/`, `parts/`, `symbols/`, `entries/`, `tags/<kind>/` (package kinds use `tags/<package>/<kind>/`), `relations/`,
  `trays/`, `sections/`, or a package-declared kind folder (`kinds/<name>.json`) or an unmigrated content-kind folder (`wordset/`).
  File names supply object ids; task, stage and menu ids remain inside their containing objects. Chapters are game objects in chapters/<name>.json.
  Do not recreate `groups/`, `parts.json`, `glossary.json`, `trays.json`, or package layouts/courses.
- Object full names are `<package>/<name>`, game copy uses the `@<game>` namespace, and tag references use `#`.
  Local short references are qualified on assembly. Tags are unordered, typed development collections; they
  have no runtime teaching or presentation role. Relations use typed `edges` fields (`requires`, `replaces`).
  Tag identity is member type plus full name. Read `registries.tag[tagKey(member, name)]`.
  Studio members use `orderedMembers(content, ids, kind)` for prerequisite order, then names.
  Trays and encyclopedia sections are separate objects with their own ordered lists.
- Overrides belong to the authoring layer in `overrides/<namespace>/`: `levels/`, `parts/`, `symbols/`, `entries/`,
  `tags/<kind>/`, `relations/`, `trays/`, `sections/`, content-kind folders, or `i18n/<lang>.json`.
  Collection semantics follow field schemas, implemented in `engine/collections.js`. `set<T>` and `edges<T>`
  accept `{ add, remove }`; `list<T>` also accepts `{ insert: [{ before|after, values }] }`. Arrays replace
  the entire field. Omitted fields remain. Nested identified lists use `id`; edge identity uses endpoints and game.
  Independent typed tag contributions use `values: { add: [...] }`. Provenance is
  `sources[kind][identity].collections[fieldPath][memberKey] = [layer, ...]`; edge keys serialize `[from,to,game|null]`.
  Independent collection patches compose by field type; replacements and scalar overrides require a dependency. Every foreign target needs a declaration or code registration.
  Core registers `kernel/studio-left` (`kind`); `kernel` is reserved. Preserve override history.
- All object types declare `declares: package|game` and `overrides: { package?: [fieldPath], game?: [fieldPath] }`.
  `*` permits every field; `$text` permits schema text fields. The common `layerProblems` check enforces these
  attributes. Native level/task/tag/relation/entry/section kinds declare at package level; chapter/game at game level.
  Game overrides may change requires.edges and all localized copy. Package-declared game kinds use the same registry.
- A game arranges `game.json`'s `chapters: list<chapter>`. Chapter objects are `games/<game>/chapters/<id>.json`,
  named `@<game>/<id>`, with concrete `levels: list<level>` and map `rows`. Chapter copy and machine settings stay
  on the chapter; optional/skippable and other startup settings stay in course.json. `number` preserves authored
  numeric chapter labels; `game.json.encyclopedia: list<section>` preserves section display order. Importing a tag is a one-time expansion into the chapter list.
- A package has no course, chapters, unlock graph or learning progress. `check -- --package` checks objects,
  parts and each level separately; package play opens a single level with its tray (all parts/stages when
  omitted). Never generate a package course to reuse a game-only check or UI path.
- Circuit owns content meanings, availability state, work readers, authoring operations and shell extensions through package protocols. Kernel progression only unlocks tasks and levels. Circuit-specific editors remain in Studio until step 11. See `references/package-plugins.md`.
- Parts in `parts/<name>.json` choose `op` (or one operation per output) and narrow its settings, then add
  presentation. Settings are inline, not independent objects. No `compute` expressions implement calculations;
  expressions remain for interaction rules, checks and readouts. `stages` lists later linear upgrades, with the
  part itself as stage one. Part and stage ids share a namespace. `opens` applies at task start; `awards`
  applies after passing. `gives`/`withholds` adjust only this task; `local` stays with its introducing level/task.
- Symbols in `symbols/<name>.json` have `mark`, `name`, `desc`, `icon` and optional `stages`, with
  `@symbol.<name>.*` copy keys and `tags/symbol/` membership. Formula connectives use symbols.
  `packages/circuit/core/grants.js` centralizes registered grantable types and name/stage resolution. Circuit and logic own
  their `circuit/part` and `symbol` registrations and `used(work)` readers. Grant fields and trays accept mixed full
  names across registered types, rejecting ambiguous names and unregistered types. `course.state(at, flags)`
  returns separate `circuit/part` and `symbol` maps. Stages apply to every registered type, while workshops and
  `replaces` remain part-only. Studio lists symbols separately and shares tray and stage editing.
- Built parts use `inside` variants and reference works; tasks `publish` through the `publishes` list and
  explicitly award stages. They normally run the player's passing work, using a reference if unavailable;
  plays may explicitly choose reference works. Keep the selected variant and its dependency closure intact.
- Ids never change after creation, including task, stage and chapter ids. Rename visible text, not identity.
  There is no rename operation. New identity requires explicit creation and deletion. Task moves preserve ids.
- Tag title/description keys use `@tag.<name>.title` and `@tag.<name>.desc`; tray keys retain `@tray.`.
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
- New objects copy any existing object (own or dependency) or start from their schema; curated starts are ordinary tags, with no template tag convention. The legacy starter directory remains until their mechanisms migrate. New content currently starts from `kit/templates/<template>/starter/`: `npm run new-package -- <id> --template <name>`,
  `npm run new-game -- <id> --template <name>`. To reuse an existing game’s packages and startup settings,
  use the `create_game` tool (`id`, `from`, `title`), then the package-selection operations.
  Package plugins can also start with `npm run new-package -- <id> --from text` or `--empty`.
  Templates are copied, not depended upon. Shared evolving parts belong in library packages such as `arithmetic`.
- Tests use content written in the test or template `starter/`, never real game levels, ids or counts. Actual
  game/package correctness belongs to `npm run check -- <game>` and `npm run check -- --package <package>`.
  All commands here run in `trace-viewer/`. Kernel changes require `npm test`, `npm run lint:kit`, and
  `npm run words -- --check`. Use `deps -- lock <target>` to update dependency hashes, `deps -- upgrade <target> [package]` for explicit upgrades,
  and `publish -- <package> --launch` only for the explicit first launch and later checked releases in `releases/`. Before launch, package/platform versions stay at `0.0.0` and dependency ranges at `^0.0.0`; publication without `--launch` is rejected. Platform structure uses
  `publish -- kernel --launch`; platform behavior probing remains pending. Do not hand-edit versions or recreate vocabulary snapshots. For behavior refactors, capture affected game
  check output before the change and compare afterwards, reporting only explicitly authorized differences.
- For bounded copy, UI or local behavior changes, select checks from handbook §7.0; inspect desktop and phone
  when interaction changes. Passing tests or a build do not establish visual or teaching quality.
- The optional author pipeline (§7.2, `kit/pipeline/`) retains the CLI step name `domain` for kernel capability
  requests. It does not create a domain layer or grant content agents code ownership. Pipeline gates and
  teaching lint are authoring aids, distinct from kernel technical checks and §5.1 review duties.

## Level authoring standards

Read `games/DESIGN.md` §5.1 when authoring or reviewing levels. These are human and agent review duties,
not kernel gates or content fields. The implemented package and kernel structure is in handbook §6.1–6.3.

- Introduce a main idea through a real problem, judging cognitive load rather than counting parts. Do not create
  concept tags or a `concept()` mapping; tags are development collections with no runtime behavior.
- Put a new capability to work when it appears and reuse it soon in subsequent tasks or packed works. Reconsider
  early introductions instead of adding filler to satisfy counts or intervals (`many-new`, `idle-idea`).
- Make first encounters observable and meaningful. A tool that a sentence explains should enter a real task;
  an abstract tool may warrant a focused encounter with intermediate states and contrasting cases. Explain this in
  design notes, never a `showcase` exception field (`bare-intro`).
- Review reuse of built works and repeated structures. Prefer an appropriate abstraction where it serves the task;
  terminal works may stand on their own (`unused`, `bypass`).
- Review loose parts and the actual phone workflow after staging. Eight loose parts is a review prompt, not an
  enforced limit; split tasks or build intermediate works when the observed load warrants it (`open-crowded`).
- Prefer meaningful construction, but lend tools or givens through `gives` where appropriate. Avoid redundant
  introduction declarations when they add no clarity (`granted`, `carried`).
- Interpret attempts, hints, abandonment and time with player context and sample size. Difficulty thresholds do not
  decide pedagogical correctness (`difficulty-spike`).
- Check still enforces schemas, references, types, passing references, failing naive works, reachable unlocks,
  prerequisites and introduced tray parts/stages. A passing check does not establish teaching quality.
- New badges follow the first introduction of each part or stage on the prerequisite route; a new stage marks its
  existing part card. They are independent of how the author explains the underlying ideas.

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
4. New package plays register core `agent`, `check` and paired view `play` hooks (handbook §6.3.1).
   Existing unmigrated modules give their `play` hook in `runtime.js` (circuit play through `packages/circuit/core/play.js`): the
   level in words and an attempt judged, which `run_tests` uses; its play tests run in `npm test`. Blind play is
   paused (`games/DESIGN.md` §6.6).
5. Report what was checked and what was not.

## Interaction

The shared editors are in `packages/circuit/view/board/`:

- Desktop: free canvas of cards, wires dragged from an output port (dropping on a card wires its first free
  input); clicking a wired input takes its wire off and leaves it in hand on its output, to click onto another
  input or drop on the board; Delete removes the selection, pan / pinch / Ctrl-wheel zoom, fit-to-board.
- Phone: slot grid with inputs on top and outputs at the bottom, no pan or zoom; tap a port, compatible ports
  light up, tap another to wire; drags start after a short hold so swipes still scroll; tray doubles as delete.
- Both edit the same graph; illegal wires are refused at connection time with a reason
  (`parts.refuse`); wire colour follows its source.

- Frames (`packages/circuit/core/board/frames.js`, first used by 《证明完毕》's assumption box) are shared: a module makes a frame
  part with `framePart(own, regions)` and evaluates each region's value by `key`; the editors, scoping and save
  checks (`regionsFit`) come from the kit. Dragging a card over a region it can go into lights that region up.

Keep a change to either editor working for every game that uses the kit.

## Circuit extraction checkpoint

- `packages/circuit/core/index.js` and `view/index.jsx` are the public circuit entries. Core owns grants,
  stages, trays, evaluation, text blueprints, workshop works and circuit progress. View owns the editors,
  circuit screens, part book, readouts, training controls and styles. Use canonical `circuit/part` and
  `circuit/tray` identities and `tags/circuit/part/`; file folders and `@part.*` / `@tray.*` keys stay stable.
- Node command/test processes preload `engine/package-imports.mjs` before linking package dependencies.
  The direct `check.js` entry establishes that import environment itself.
- The remaining native modules use circuit public exports. `engine/circuit-bridge.js` temporarily registers
  the logic symbol provider. Move that call into the logic package at step 9.
- Native capability/reader dispatch and content/authoring projections still need the remaining step-5
  boundary cleanup. Do not describe this checkpoint as zero circuit knowledge in the kernel.
- Studio's dedicated editors still live in Studio until step 10. Type names, grouping keys and paths must
  stay canonical while preserving its current editing workflow.

Step 7: `rows` and `tick-bus` are package plugins, each with core/view/kinds and Node/Vite contracts.
Their starter objects live in the packages; copy with `new-package --from rows|tick-bus`. Neither package
has a course. Both use circuit's public exports at `^0.0.0`; bus-only ticking and textual tick play live in
`tick-bus`, not circuit. Native imports remain only for image/table/logic and the symbol bridge.
Task declarations can scope `extends: task` fields with `play`; this creates a separate schema branch
without redefining native fields. Keep required fields required on that branch.


## Image extraction (MODULES step 8)

`image` depends on `circuit` and owns image operations, graph/probe/bench works, judges, blind-play
adapters, scoped task declarations, parameter benches, displays and previews. Image registration and workshop dispatch load through
package entries. Consumers select `image` directly.
`vision-complete` owns its scenes and dedicated bench models/displays. Only the filter scene,
obscura/wave models and obscura displays are shared by vision-complete and comp90086.
Both content packages declare their own namespaced power/box kinds and folders.
Keep Studio source and tests with its owner when the user assigns that boundary.
