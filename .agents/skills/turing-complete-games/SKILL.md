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
3. The game's content (`games/DESIGN.md` §6.1): `games/<game>/game.json` (eras, parts, saves), `levels/<id>.json`
   and `glossary.json`, written in its domain's vocabulary (`games/kit/domains/<domain>/vocabulary.js`).

**Docs first, and only the current design.** Every change to a course (a new chapter, a reordering, parts split
or merged, a mechanism moved) is made in the design docs before the code: `games/DESIGN.md` for what holds for every
game, the game's own design doc for its course. Then the code follows the docs. The docs describe the design as it is
and the plan ahead, never "it used to be …, now …": delete what no longer holds as you change it (git keeps the
history); a reordering still to do may stand as a work list in the doc, deleted once done. After each piece of work,
think about whether it taught a rule more general than the case at hand: if so, write it into the handbook (and into
this skill's checklists if it is something to check by hand), and rewrite any rule it makes wrong, rather than
copying the last wording forward.

## Hard rules

- Three layers: kernel (`games/kit/engine`, `circuit`, `shell`), domain (`games/kit/domains/<domain>`: vocabulary,
  model, items, ui), content (`games/<game>/`). Content is data only: it picks vocabulary items `{ item: params }`
  and writes tests, copy and reference / naive boards as blueprint text, never a function. Anything new (an engine
  resource, a world, a check, a panel) goes into the domain's vocabulary and implementation.
- Where the domain gives engine resources (`op` kind), a game's primitive parts are content: `games/<game>/parts.json`
  (`games/DESIGN.md` §6.9) — ports, settings in the six kernel controls, an ASCII expression calling only resources
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
- A new topic's content is made by the agent pipeline (`games/DESIGN.md` §7.2, `kit/pipeline/`, `npm run pipeline --
  <game> …`): blueprint, domain (code, by an engineer), levels, copy, review, queue — each step a brief
  and a gate, each product written through the operation set, every run and gate recorded in `pipeline.json`. When a
  later step stops on an earlier one's product, hand its report back (`run <step> --from <later step>`); do not work
  around it in the later step.
- Choose a learner-built part only when substantively different passing implementations can differ in complexity
  or execution cost. Fixed computations use code presets; wiring order and equivalent expansions do not qualify.
  A built part runs the board the player passed its level with; that board must read exactly the part's ports.
- Never grant a part directly; a non-primitive part is unlocked only by the level that builds it.
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

## Purpose: playing is learning

Every wire placed, knob turned and claim judged must be the player working out a piece of the field; what they
carry away is knowledge they can state in the field's own terms, not the game's controls (`games/DESIGN.md` §1,
§4.1). For a user-directed construction-led course, plan the machine, capability ladder and reusable parts first, then
audit coverage of **knowledge points** from the sources (concepts, methods, conventions and facts, with their terms
and teaching locations). Prefer construction, use, debugging, constraints and upgrades; only important residual
knowledge that cannot be meaningfully carried there receives an extra lesson. Do not choose parts for their own
sake or turn the source inventory into lecture-ordered gates. **The main path is the lectures' theory and nothing else** (concepts,
models, methods and how they relate). Technical content — a library's or a tool's way (OpenCV's channel order,
`uint8`, function names), a file format, a workshop's recipe — never appears on the main path, not as a task, a
sentence or a link: it is taught only in optional topics hung after the theory it applies or after the era's main
path ends.

**Levels go where the difficulty is, not over everything.** The point of a Turing-Complete-style game is taking a
complex body of knowledge apart and climbing it bottom up: plain, direct points are the base components, abstraction
rises layer by layer, and the hard core (the complicated circuit) becomes understandable. So before placing levels,
place the knowledge: which points are the chapter's core (what the lectures spend effort on, later chapters stand
on, students get wrong); how hard each is (`intuitive`: a sentence makes it plain, nobody is stumped by it — only
mentioned in copy and entries, never trained; `learnable`; `hard`: abstract, far from daily life, hard-named); and
what shallower points each is built from (`depends`). A hard point is taken down to its origins and reached by a
series of levels, one step each; most of a chapter's levels are on the ladders to its core. The number of levels
follows the difficulty: a hard point is taken apart
into steps, each a level, and each of its facets (a convention, an edge, a failure, a look-alike) is practised; a
level with no point and no new facet of one is padding and is cut, and new numbers alone are tests or tasks, not a
level. When a check says something is under-practised, look for a missing facet; if there is none, the course did
not need more levels.

## Learning design and static review

For chapter topology, task scaffolding or non-assembly interactions, read
[references/learning-review.md](references/learning-review.md), alongside handbook §4.3 and the domain's design.
Use its task-by-task evidence worksheet and finding IDs: required parallel routes versus optional topics; concept
and representation steps; guidance visible before use; principle-level synthesis; meaningful bench decisions and
labelled causal displays. A clean automated audit does not establish these semantic properties. For a docs-only
request, record the current findings and domain requirements without changing content or claiming visual fixes.

## Learning checklist

Read every level as a learner who has not taken the course, against its blueprint slot (`question`, `chain`,
`teaches`/`facet`, the point's `term`, `source`, `wall`, `misconception`):

- **Give capabilities when needed.** Introduce components and configurations at task-level first use, including
  folded trays, detail sheets and review mode. Before a combined construction, establish unfamiliar model
  assumptions and representation changes through meaningful prerequisite tasks. Familiar arithmetic and simple
  controls need concise guidance, not filler exercises. Omit unavailable options and singleton selectors.
- **Worth training.** Would an adult who has not taken the course get it wrong without this level? If a sentence
  makes it plain ("different vision tasks give answers of different shapes"), it is not a level (`bp-trivial`):
  mention it in an intro, a summary or an entry.
- **Climbed, not jumped.** A hard point (abstract, far from daily life) is the top of a ladder of levels from its
  shallowest origins (`bp-shallow`, `bp-depends`); most levels sit on the ladders to the chapter's core
  (`bp-ladder`).
- **A point of the field.** Name the knowledge point and its source. A level whose only content is a part or an
  operation ("take the larger", "round down") is a tool level: fold the tool into the level that needs it.
- **No technical content on the main path.** A main-path level that teaches, uses, mentions or links a library's
  or a tool's way (`bp-main-tech`, `bp-main-link`) turns the course into a tool manual: move it to an optional topic
  after the theory it applies, or after the main path.
- **A question, then a chain.** The intro leaves the learner holding the slot's question, in the field's words, with
  what is given and what counts as right. Walk the chain: can every step be taken from what is on screen (a task,
  a test, a feedback line, a counterexample)? A one-step chain ("do what the brief says") is a task or a test of a
  neighbouring level, not a level.
- **No quizzes.** A task that only asks the player to pick an answer (`pd-quiz`) builds, tries and works out nothing.
  What it would ask goes into the intro and the pass text; what must be practised becomes something to do: make a
  counterexample on a bench, work a cell out by hand, wire a circuit. To teach what one picture cannot settle, have
  the player build a second scene that pictures the same.
- **The answer depends on the material.** Where a judgement is kept, cover the picture and the data: if the answer
  still follows from the wording, from matching the prompt's words to an option's label, or from the options'
  order, the level teaches nothing. Options get neutral names; the difference lives in the material.
- **No sliding to green.** A bench whose single open knob is dragged until the goal's readout turns green is solved
  without thought (`pd-slide`): open knobs that pull against each other, ask for a prediction before the result, or
  judge only on submit (`check: 'submit'`: readings and results stay hidden until the player checks a setting).
- **The misconception fails, with a reason.** The naive answer is the point's misconception; a test makes it fail,
  and its feedback says what is wrong in the field's terms, never "the goal is not met".
- **Named after it is done.** Passing a level that brings a point names it by its term and links its entry; the entry
  defines it in the field's words, cites the source and sets it apart from its neighbours. After a chapter, the
  learner can retell it in the field's terms.
- **No repeats.** The same reference board in two levels (`pd-repeat-board`), the same intro, brief, hint or "why it
  is wrong" in two places (`pd-repeat-text`): one of them is padding, or boilerplate standing in for what this level
  says.

## Curriculum review checklist

The audit cannot see everything. Before calling a curriculum done, check these by hand (`games/DESIGN.md` §11
shows them at work in 《证明完毕》):

- **Practice density.** Each new knowledge point is followed by practice of its facets, one facet a level, varied
  along the §2.3 dimensions (direction, depth, scaffolding, combination, true-or-false), easy to hard, ending in a
  combination or a false-target level — before the next point appears. New surface or new numbers are tests or
  tasks of a level, never a level. The era must not read as a list of one theorem or rule per level. Practice is
  judged by hand, for real variation; never add levels to reach a count. The audit's `idle-idea` (§5) only checks placement: an idea is used by the level that
  brings it in, and put to work again before two more new ideas arrive. Its fix is moving the idea to where it is
  needed or making the later levels truly use it. A finding a game cannot fix yet goes on its work list (its design
  doc and `game.json` `open`), never away by loosening the rule.
- **Lead-in.** Every new part or ability has a cause: an earlier level where the player does it by hand or hits
  the wall it removes. A level whose reference answer is "place the new part, wire it to the goal" is a smell. One
  exception is a part whose use is itself abstract enough to get wrong from its description (an assumption box:
  a region, two dots, results leaving only through its conclusion): one level may just show how it is used, marked
  `showcase: '<what is abstract about it>'`. Configuring a semantic operator against contrasting visual cases
  is another justified use, documented by the theory-tools rule below. A part one sentence explains (a block gate: "yes" gives "—", else it
  passes) gets no level of its own; it first appears inside a real problem.
- **Motivation on the main path.** A required level's intro must not depend on an optional challenge or topic.
- **Abstraction keeps rising.** Draw the part dependency graph (§7 step 5: `npm run deps -- <game>`). Every built part is used by later
  reference answers, in places where not having it would be long. Later levels lean on higher-level parts; a
  late reference answer built only from primitives means the chain is broken.
- **Across eras.** Within an era every part met stays usable. Every era after the first declares `keeps`: `'all'`
  when it continues the previous machine (extends or upgrades it), so earlier work is never dropped; a list (possibly
  `[]`) when it changes topic, leaving the rest behind. Ask: is the new machine a continuation of the last one?
- **Discovery, not transcription.** A level must retain a substantive reasoning decision beyond formula transcription.
  Supply prerequisite formulas when implementation is not the learning objective. A quantity with several parameters
  is a bench that opens one knob per step (every bench is the kernel's parameter bench, written as data: a model
  from the domain, knobs, stages, a goal of limits and a layout of display items; `games/DESIGN.md` §6.4). A hard
  mechanism gets its own intro levels as a named series (§2.2).
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
- **Theory tools may be supplied.** Primitive minimality is relative to the course's learning objective. When
  indexing, rounding, arithmetic loops or repeated wiring are not assessed, provide semantic operators, formulas
  and editable starters. Preserve the assessed visual decomposition: do not provide a complete sampler, filter,
  attention block, matcher or evaluator before its construction when that is the point of the course. A parameter
  choice on a supplied box does not replace earning the abstraction. This qualifies the minimality rule below
  for execution helpers, not for bypassing core constructions.
- **Choose presets versus assembled parts by implementation choice** (§1). Keep a learner-built component only
  when multiple correct implementations can differ substantively in algorithmic complexity or execution cost.
  Equivalent rewiring, reordered arithmetic and a fixed composition alone do not justify storing a learner board.
  Supply fixed computations as code presets at the task that needs them; explain their mathematical relationships
  without promising that the preset runs a learner implementation. Assembled parts run exactly the passed circuit,
  including side effects, and expose choices through explicit inputs.
- **Parts that stay where they are brought.** A go-between soon wrapped into a built part (one round of resolution,
  inside the saturator) or a part made for one level's scene (someone else's wrong prover) is `local`: never unlocked,
  never carried; a later level that needs it brings it again. A level whose puzzle turns around something ready-made
  presets it on the board (`preset`): locked, movable, never deleted or rewired.
- **Renumbering needs a save migration** (§2), and the operations generate it: renamed or removed ids, a level
  put where it is now a prerequisite counted solved for whoever passed what follows it, new builds, and (where the
  domain says so) dropped boards of a puzzle that changed. Read the generated step in the dry run.
- **Topic codes.** One letter per series: topics hanging on each other's levels (`after`) share a letter, across
  chapters too, numbered on; unrelated series take different letters (audit `topic-code`).
- **Level tree shape.** The map tree is at most three columns wide, at most three levels per row. A parallel set
  (`branches`) has at most three branches; split more into two sets in sequence. An optional branch does not get
  its own outward column: `LevelMap.jsx` drops it into the first free rows inside the existing columns below its
  anchor. Check the map in a browser after reordering; if a branch lands far below its anchor, pick another
  anchor (`after`) that has the same prerequisites.
- The usual pitfalls in §8: one new idea per level, no orphan levels, intro text that does not give the answer,
  topics that are one problem growing, challenges that are hard by insight rather than by tedium.

## Copy checklist

Component descriptions are plain text: use names directly, without HTML or reference markup. They are exempt
from the reference and terminology-annotation requirements below; those still apply to other learning prose.

The rules are in `games/DESIGN.md` §4. Read every intro, hint, pass text and part description against them:

- **One term registry per game** (handbook §4). Use `glossary.json`: canonical titles, optional bilingual `aliases`,
  existing entry `body` as explanation and `at` as opening level. No parallel simple-definition field. Prose uses
  term references; titles may use registered names. Diagram/control labels need clickable access.
  `./terminology --json` gives registry/reference errors and literal bare-name candidates. Semantic review independently inventories terms absent from the dictionary,
  including domain UI/diagram labels, then reconciles every candidate. Do not mistake ordinary-language matches
  for professional usage or infer completeness from a clean lookup.
- **Click for meaning; copy guides reasoning** (handbook §4; manual review). Professional terms in prose link
  to available glossary entries. The existing body explains the term; no inline definition or evidence of prior
  reading is required. Keep definitions and reference detail in entries, not repeated or paraphrased in intros,
  hints or summaries. Copy supplies the situation, reasoning support and synthesis. Diagram/control labels identify
  visible referents and offer a clickable term or adjacent tag. Check both languages and each task: missing,
  locked or inaccessible explanations block under `terminology-before-use`; duplicated definitions block under
  `term-definition-duplication`. A term link does not replace observations or practice for a hard reasoning step.
- Before discovery, define the model and conventions without supplying the target's complete derivation or
  construction. After discovery, explain the general causal principle and its limits without replaying a board or
  numeric answer. Meaningful analysis is not a spoiler; missing foundations are not desirable difficulty.
- **Pass texts name the knowledge, never the answer (hard rule).** A level that brings a knowledge point names what
  the player just did by the field's term, links its entry, and says in a sentence or two where it sits in the field
  (what it solves, what it is not, what the course calls it; on the main path never a library's name). It says nothing of the level's
  answer, wiring or way of solving it: no retelling of the particular wiring or target answer. Explain why the observed relationship follows from the model and what it does not establish.
  Practice levels may have none.
- **Complete, not padded.** An intro lets someone who has not taken the course know where the machine is stuck (in
  the field's words), the question this level answers, what is given and what counts as right. A sentence that
  would fit any level ("the pipeline must now handle new numbers") says nothing. Copy runs on from the level before;
  a point is made once, where it first comes up. Standard written language, no translationese.
- **The wording does not answer.** A brief, a prompt or an option never uses the answer's words ("box its location"
  against an option "a location box"); options are named neutrally.
- **The field's terms.** Terms are the sources' and the field's own, in both languages; every knowledge point has an
  entry of its id, opened at the level that brings it, linked there.
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
sits in the strip at a modest size; card values repaint on every step of a run; a board's last run stays on it while
the level is open, across tasks and slots (`lastRun` / `keepRun`, in memory), and is gone once the level is left; no newer JS APIs that break older
iOS Safari.

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
