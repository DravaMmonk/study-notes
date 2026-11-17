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
  installed content consumer are outside this corpus (including rows/tick-bus template-only consumers).
- Determinism is checked by a second independent run. Cross-Node/CPU floating-point portability is not claimed;
  numeric comparisons are exact, without rounding or tolerance that could hide drift. Existing check output
  includes author log drift notices, so real content/log edits can change it intentionally.

The `kind` registry describes object types, not work-instance identities. Its names are excluded from the
instance-name alias inventory so a new built-in type cannot make an existing instance name ambiguous.
New code packages outside the locked corpus are reported explicitly during `compare`; existing missing
snapshots still fail. Their Node and Vite contracts validate the new package independently.
