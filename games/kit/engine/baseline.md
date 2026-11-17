# Mechanism migration baseline

This is the behaviour lock for `games/MODULES.md` step 1, not the plugin protocol for step 2.
Run from `trace-viewer/`:

```sh
npm run baseline -- save
npm run baseline -- compare
npm run baseline -- compare state-graph
npm run baseline -- compare --package arithmetic
```

With no selector, both commands include every installed game and every package (including libraries).
Packages run each level independently through `packageLevel`; no synthetic course is created.
`GAMES_ROOT` can select an isolated project containing `games/` and `packages/`.

`save` replaces the selected snapshots in `output/modules-baseline/`. Preserve this directory across
migration steps; use `compare`, not `save`, after a move. Output is local and must not be committed. As mechanisms move, update collector imports to call the relocated
production runners; keep the saved observations unchanged.
A missing snapshot, interrupted check, unknown play or failed collector aborts instead of silently skipping it.
`compare` exits 1 on differences, prints the first 30 per target, and writes every difference with a JSON
pointer to `<kind>-<id>.diff.json` (the same shared-node encoding as snapshots). Check failures are captured with their exit status, even if already present
in a saved baseline. Zero differences does not turn an existing check failure into a pass.

Each target stores:

- Fresh production `check` stdout, stderr and exit status, with the project path replaced by `<project>`.
  The cache is bypassed; Node's host-specific module-type warning is suppressed.
- Authored assembled levels/tasks, chapters, relations, parts/stages and trays; the runtime course plan,
  publication information and stages; and task availability with empty progress and with prerequisites earned.
  Availability uses the production course model, including actual stage definitions and tray ordering.
- One report per task containing the reference and naive works wherever they exist. Graphs use all visible
  and hidden cases, full node traces (including packed paths and regions), outputs, scores, constraints and
  failures. Robots retain every cell read/write, table, mismatch and round. Additional image `alsoFails`
  boards and every probe choice/output are retained. A direct judge has a single judgement step; truth,
  script, model and audit plays also retain their existing table/row/run reports.
- For the seven table hand plays, generated deterministic complete reference and incomplete naive works use
  the pure judges in `modules/table/model/hand-verdict.js`. There are eight current tasks because fill is used
  twice. The judges also check the legal-work invariants enforced by UI action guards. The UI is untouched.
- For benches, existing `verify` results plus every stage's initial values/process/view/verdict and the
  configured button actions, in order, including every configured repetition. These are observations, not a
  claim that the action sequence is a passing reference solution.

The printed record count includes one task-report and one availability record per task, plus one course
record per runtime projection (per independently opened level for packages). A package with no levels still
captures checks and all its part definitions.

Stable serialization preserves undefined, nonfinite numbers, negative zero, typed arrays, maps and sets.
Array order is retained; map/set order and object key order are canonical. Structurally equal subtrees are
interned, and the JSON uses shared-node references, so long search traces do not expand into gigabytes of
repeated proof states. `unpackBaseline` in `baseline-value.js` reads it. Comparison ignores object sharing.
No clock, timestamps, absolute project paths, machine timings or random identifiers are added. Physical
quantities such as a bench's configured countdown seconds remain part of its behaviour.

Only registered instance object, task and vocabulary names are normalized before comparing. Unique local names
ignore their namespace/module and existing world/robot/port/want/family prefixes. Ambiguous local names keep
qualified identities, and normalized key collisions fail explicitly. The mechanical `piece`/`pieces`/`parts`,
`circuit/part`, and `@piece.`/`@part.` spellings explicitly declared equivalent in MODULES.md §10.3 also normalize, including plural/camel-case identifiers, diagnostic names and override `tag/` → `tags/` paths. The two authored English uses of `pieced` use `assembled` (with `pieced it together` → `assembled it`). Prose/formulas with arbitrary slashes
are not globally rewritten. Future migrations that rename a semantic local identifier need an explicit,
reviewed observation update; the tool must not mask arbitrary renames or collapse distinct objects.

The symbol split has one additional narrow normalization for `formulaAnd`, `formulaOr`, `formulaNot`,
`formulaImplies`, `formulaIff`, `formulaForall`, `formulaExists`, and `formulaFalse` (QED full names or their
normalized local names). It moves those eight definitions from the old part inventory into the symbol inventory,
normalizes only their `part.<name>.*` copy keys and `parts/<name>.json` paths, removes their retired
`editor: "strip"` discriminator, and compares their typed order edges in a stable order with the old `part`
ownership. All other order edges retain their order. Their formula notation inventory's field name also follows
symbol ownership. Marks, labels, descriptions, icons, stages, availability and executed results remain compared.
Other object names, definitions, editor fields and ownership are unaffected. Snapshots are never rewritten for this rule.

The typed-tag migration normalizes only tag-shaped inventory names (`<member>:<namespace>/<name>`)
back to their full name when building the existing instance alias inventory. Member types do not become
extra namespaces or make an unchanged object alias ambiguous. This inventory is metadata; actual tag
keys and membership are not globally stripped or merged. A distinct object's qualified name still collides
and remains qualified as before. The collector's behavioural projection does not include tag definitions.

Exactly five QED cross-type order edges retire `of: "grant"`: `certificate-certificate`, `gIff`,
`machine-certificate`, `natInd`, and `res`, each pointing to `formulaForall`. For these exact QED
full names (or their existing normalized local names), omitted `of` and old `grant` normalize to the
existing formula-symbol ownership projection (`part`) and stable affected-edge ordering. No other
untyped edge, endpoint, relation ownership, member sequence or runtime result is rewritten.
Snapshots remain unchanged; this rule accepts no arbitrary edge rename or reordering.

Step 3 adds two narrow comparison rules in `existenceBaseline`: only `$key` values matching
`[namespace/]group.<name>.title|desc` or `[namespace/]glossary.groups.<name>.title|desc` become
`[namespace/]tag.<name>.title|desc`. Ordinary prose, other glossary keys, tray keys, translations, identities
and membership remain compared. Only complete `FAIL content:` stdout lines ending in an old
`unknown <object-type> <target>[; expected <member>]` diagnostic normalize to the new
`missing target <object-type> <target> [(member <member>)]` wording. The source location, target, type,
member, check status and every other output line remain compared. Loader stack traces and unrelated failures
are not removed or broadly rewritten. Snapshots are unchanged; never run `save` for this migration.

Step 4 adds `versionMetadataBaseline` for objects explicitly keyed `package.json` or `game.json`.
Only the initial package shape (`vocabulary` integer plus optional ordered `uses` array) and the exact
`version: "1.0.0"`, `kernel: "^1.0.0"`, `uses` map with every range `^1.0.0` normalize to the ordered
uses list. Only game maps whose kernel and every selection are `^1.0.0` normalize to the old ordered
packages list. The first package remains primary. Other ranges, versions, fields, object payloads and
all runtime/check observations remain compared. The current runtime projection excludes these files,
so this rule does not suppress diagnostics or log drift. Locks and release metadata never enter task
reports. Preserve snapshots and use `compare` only.

## Current evidence boundaries

- This is a finite reference/naive corpus, not equivalence for every possible player work. No browser,
  animation, delay, haptic, layout or save/resume interaction is exercised. Hand-play UI still has its original
  checks; sharing the pure judge with the UI is a separate frontend change.
- Bench content usually has no explicit reference/naive work. `verify` sometimes tests passing settings or
  training internally but returns only a diagnostic string. Its internal steps are not observable here.
  Button sampling does not explore all knob settings, adaptive actions, `model.after` timers or complete
  interactive training trajectories. No wall clock is simulated.
- Plays without authored naive works record that absence. Generated truth/formula references and hand-play
  examples are collector fixtures, not new content. Formula equivalence uses the existing bounded finite
  model judge; capturing it does not strengthen its logical guarantee.
- Blind play is currently paused and its hooks do not cover every play. This tool does not run an LLM or claim
  new blind-play results. External-game progress/localStorage and saved player publications are not exercised;
  packed parts use production reference implementations in this corpus.
- Host Node warnings, cache status and source-file locations are not behaviour. Runtime function closures are
  represented only as markers; their executed outputs are captured. Unexecuted callbacks and code with no
  installed content consumer are outside this corpus (the former rows/tick-bus starter consumers are now package examples, covered separately by package contracts).
- Determinism is checked by a second independent run. Cross-Node/CPU floating-point portability is not claimed;
  numeric comparisons are exact, without rounding or tolerance that could hide drift. Existing check output
  includes author log drift notices, so real content/log edits can change it intentionally.

The `kind` registry describes object types, not work-instance identities. Its names are excluded from the
instance-name alias inventory so a new built-in type cannot make an existing instance name ambiguous.
New code packages outside the locked corpus are reported explicitly during `compare`; existing missing
snapshots still fail. Their Node and Vite contracts validate the new package independently.

Step 5 treats only the declared `circuit/tray` object-type spelling and
`tags/circuit/tray/` directory spelling as their former `tray` equivalents.
The already declared `circuit/part` alias also covers `tags/circuit/part/`.
Version metadata accepts the prelaunch `0.0.0` package version and `^0.0.0`
package/platform ranges alongside their historical `1.0.0` / `^1.0.0` / `^2.0.0`
spellings, and removes the explicit `circuit` dependency from package/game
selection metadata, where that dependency was previously native. Object values,
ordered members, reference works, verdicts and traces still compare normally.

Kind meanings provide course, structure, availability and execution-report observers after extraction.
The observer location changes without changing the compared values. Declared relation kinds retain empty
edge arrays even when no objects use them. No work, verdict, trace, member ordering or availability result
is excluded by the step-5 normalization.

Step 6 adds `collectionFieldsBaseline`. It removes only `structure.relations.order`, whose authored
presentation order has moved into the tray/section list fields. Tray items, menus, ordered menu members,
requires/replaces edges, works, availability and execution reports continue to compare exactly.
Chapter identities normalize only at `structure.eras[].id`, course plan place.era, rows/tracks map keys,
and dependencyLinks.detail when source is course. These positions accept the new @game/chapter identity
and historical local id, including numeric chapter ids. Map keys are re-sorted after this identity conversion.
An era.number equal to its numeric file id carries the old displayed chapter number and normalizes away;
other number changes remain differences. Chapter and game-configuration objects are excluded from the instance-alias inventory,
so a chapter name cannot create artificial ambiguity with an entry, level or robot of the same local name.
Missing eras are serialized undefined markers and remain unchanged. No check lines or task array order
are suppressed by this rule. Snapshots remain unchanged.

Step 7 retains exactly `tick-bus:family-value` and `tick-bus:family-memory` as alias-inventory
reservations. Their removal from the global vocabulary must not make the existing circuit families
newly unique and turn `circuit:family-value` into `value`. Only ambiguity bookkeeping changes; family
values, schemas, works, checks and reports remain compared. No arbitrary removed capability is reserved,
no output line is suppressed, and snapshots are unchanged.


Step 8 adds `imageFieldsBaseline` before name normalization. Only authored tasks at
`structure.levels[].tasks[]` with no `kind` and an exact `play` of `image:graph`, `image:board`
or `image:probe` project that discriminator back to `kind`. Other plays, fields, task order,
works, checks, traces and reports remain compared.

The exact retired image ambiguity reservations are `image:add`, `image:board`, `image:const`,
`image:family-search`, `image:merge`, `image:mul` and `image:sub`. These keep historical local-name
collisions when image is absent from a package closure. They affect only alias bookkeeping, as
with the two bus families in step 7. No missing runtime object or availability entry is removed.
Shared bench display names move from `circuit:display-*` to `image:display-*` through the existing
registered-name alias inventory. The shared image kind meaning supplies graph, probe and bench
reports from `packages/image/core/baseline.js`, including immutable stage/action observations.
Snapshots remain unchanged. Use `compare` only.


## Step 8 Studio measurements

Measurements use the local Vite Studio bridge on 127.0.0.1:5178, with sequential HTTP reads.
All measured requests return HTTP 200. Times are wall-clock seconds and stay outside snapshots.

| Request | Before extraction | After extraction |
|---|---:|---:|
| packages | 0.697 | 0.967 |
| games | 1.620 | 1.065 |
| vision-complete vocabulary | 0.703 | 0.489 |
| vision-complete preview, check false | 5.061 | 4.852 |

After extraction, comp90086 vocabulary/quick preview take 0.096/2.926 seconds,
qed 0.325/4.136 seconds, and state-graph 0.206/3.465 seconds.
Shared discriminator fields reduce source declaration duplication. Name-indexed existence checks,
resolved-layer reuse, parsed-import reuse and unchanged-JSON/diff reuse retain validation results.

Browser acceptance still reaches the 20-second deadline with the main loading indicator visible
for vision-complete, comp90086, qed and state-graph. Initial navigation issues repeated packages,
games and preview requests. Studio's loading orchestration requires its owner's follow-up.
The untouched Studio starter-control test fails at studio.test.js:352 with `some field is chips`.
Its traversal covers the remaining native starters. Package-provided controls require the Studio
owner's test adaptation. Core/view contracts, independent checks and behaviour comparisons pass.


## Step 9 table extraction

State-graph provides its own execution observer; the kernel no longer dispatches table reports.
`tableFieldsBaseline` accepts only the eight exact table/state-graph play identities (`circuit`,
`fill`, `trace`, `link`, `pack`, `breach`, `policy`, `seam`). For these task/reference objects,
`play` projects back to `mode`; their demonstration `panel` projects back to `after` only when
that old field is absent. Other fields, verdicts, traces, numeric results and arbitrary play names
are unchanged. The exact migrated world/robot/port/figure/condition/trace/panel/explain and play
names listed in `nameNormalizer` map from state-graph ownership to historical table ownership
before building the alias inventory. Unknown names and suffixed names are not rewritten.

Exactly `table:not`, `table:robot-loop` and `table:circuit` retain their historical alias collisions
when a consumer does not install the course-specific vocabulary. Package primitive palettes are
preserved by explicit table dependencies in comp90086, qed, state-graph and vision-complete, not
by suppressing missing entries. Snapshots are unchanged; only `compare` is used.

Studio HTTP timings (sequential requests, seconds, HTTP 200): packages 0.909 -> 1.010;
games 1.048 -> 1.110; state-graph vocabulary 0.196 -> 0.239 and quick preview (`check:false`)
3.681 -> 4.209. After extraction, vision-complete vocabulary/quick preview are 0.482/4.809,
comp90086 0.082/3.005, and qed 0.332/5.352. The measured state-graph requests remain below twice
their pre-extraction durations. Browser acceptance and Studio-owned failures are reported separately.


Browser package navigation on the same Studio server reaches the level list in 9.096 s (state-graph),
13.530 s (vision-complete), 9.428 s (comp90086) and 10.746 s (qed), all within 20 seconds.
An earlier run under simultaneous verification reached the deadline for comp90086/qed; both passed
on repeat. Browser requests include bridge queue time: comp90086 packages/games/quick preview/
vocabulary took 2.005/1.111/3.230/6.784 s; qed 1.958/1.089/4.536/4.880 s. These queued browser times
are distinct from the sequential HTTP service measurements above. No Studio implementation was edited.
The remaining Studio-owned failure is studio/studio.test.js:353, `some field is choice`: its native
starter traversal no longer includes the extracted table controls.
