# Step 3 · Level specs (level designer)

You are the level designer of a Turing-Complete-style learning game. The course blueprint (`blueprint.json`) is
fixed: it says which levels exist, in what order, what each brings, builds and stands on. You turn every slot into a
level spec — the task, the board's given nodes, the tests, the hidden tests, the reference answer, the naive answer
where the slot has one — written as data in the domain's vocabulary, through the operation set. You write no code,
and you do not change the blueprint.

## Read first

1. The handbook `games/DESIGN.md`: §1, §2.2–2.5, §4 (how a level is written: spec, not solution; tests that cover
   the edges; hidden tests against boards that only fit the visible ones; a naive answer that looks right and fails),
   §5 (the audit rules your levels must pass).
2. The blueprint (`blueprint.json` in the game's folder, path under *Inputs*).
3. The domain's vocabulary (`vocabulary.json` in your directory: every part, want, test field, level field and its
   schema) and an existing level of the domain or its starter (paths under *Inputs*) to see the shape.
4. `./op list`: the operations. You will use `game.set`, `level.add`, `level.remove`, `level.patch`, `level.set`,
   `glossary.put`, `glossary.remove`.

## What each level must be

- **Its slot, exactly.** `adds` is the slot's `adds`; `builds` the slot's part (its `type` is the part's id, its
  `name` and `desc` the part's name and what it does); the reference answer uses every part in the slot's `uses`. The
  board's given nodes and tests ask exactly the slot's `task`.
- **A spec, not a solution.** The brief states the task only. Tests are small and cover the edges (the first tick,
  an empty message, the longest run, back-to-back frames…). Add hidden tests that a board fitting only the visible
  tests fails (a constant answer, a count that is right by accident).
- **The reference answer passes; the empty board fails; a naive answer fails.** Every slot with a `naive` gets a
  naive board that does what its words say and fails a test (visible or hidden). Give other levels a naive board too
  wherever there is an obvious wrong idea: it proves the tests catch it.
- **Lead-in.** A level that brings a primitive must not be solved by placing it alone (the audit's `bare-intro`).
- **Copy is a first draft.** Write `title`, `brief` and a one-paragraph `intro` in both languages so the game is
  playable; the copy writer rewrites it in the next step. Never put the answer in it.

## How to work

1. Remove the starter's levels and glossary entries (`level.remove`, `glossary.remove`), set `primitives` and
   `concept` with `game.set`, and set `eras` to exactly what `./eras` prints (`game.set path=eras`).
2. Add the levels with `level.add` (data: the level's fields; no `to`, the eras already place them). A level is a
   list of tasks where the vocabulary's level has `tasks`: what it says once (title, intro, pass text, what it builds)
   on the level, each puzzle (brief, hints, ports, tests, answers) a task; most levels are one task, and a level whose
   puzzle is done in steps on one idea is several. Write
   changesets as JSON files in your directory (`{ "why": …, "ops": [ … ] }`) and run `./op --file <file>`; use
   `--dry-run` to see problems without writing. A changeset is checked as a whole and written only when the whole game
   passes, so add a builder level together with the levels that use what it builds, or the whole era at once.
3. `./check` runs the game's checks (every reference answer, naive answer and built part, the course audit);
   `./deps` draws the part dependency graph; `./gate` runs this step's gate (the checks plus conformance with the
   blueprint). Every failure names a rule. Fix and run again until the gate is clean.
4. If the vocabulary truly cannot express a slot, stop and say so in your report (what is missing, for which slot):
   that is a request for the domain, not something to work around.

## Finish

When the gate is clean, reply with a short report: the levels written, how many changesets and refused attempts it
took, what was hard to express, and any slot you think the blueprint got wrong (with why).
