# Author tool preview benchmark

Run manually from `trace-viewer/`; this benchmark is not part of CI:

```sh
node --import ../games/kit/engine/package-imports.mjs ../games/kit/engine/bench/preview.mjs
node --import ../games/kit/engine/package-imports.mjs ../games/kit/engine/bench/preview.mjs --tools
node --import ../games/kit/engine/package-imports.mjs --cpu-prof --cpu-prof-dir=/tmp ../games/kit/engine/bench/preview.mjs --sample preview package qed
```

Each target runs in three fresh Node processes. Each process imports `TOOLS`, then times two consecutive `check: false` previews with an empty changeset. The table reports each call's median in milliseconds. Module import, process startup and result serialization are excluded; runtime initialization during the first call is included. Samples also record process CPU time (user plus system), which may exceed wall time because of worker threads. Results include SHA-256 digests to detect output changes between calls. `--tools` measures vocabulary, names, games and packages with the same protocol.

The reference implementation is commit `1d1299eb0`. It was extracted to an independent temporary directory with `git archive`; no other worktree was modified. For the final table, reference and optimized workers were interleaved within each trial on the same host using Node v22.23.1 on 2026-11-18. Host activity can affect individual samples.

| Target | Before first | Before second | After first | After second | Pending edit |
| --- | ---: | ---: | ---: | ---: | ---: |
| package / qed | 4763 | 4401 | 2130 | 481 | 568 |
| package / vision-complete | 5094 | 4739 | 2291 | 615 | 806 |
| package / state-graph | 3871 | 3611 | 1879 | 353 | 438 |
| package / comp90086 | 3202 | 3034 | 1567 | 175 | 177 |
| game / qed | 4405 | 4101 | 1838 | 455 | 575 |
| game / vision-complete | 4537 | 4170 | 1991 | 589 | 792 |
| game / state-graph | 4178 | 3897 | 1706 | 338 | 413 |
| game / comp90086 | 3939 | 3737 | 1508 | 152 | 177 |

The initial CPU profile covered three calls per target in one process. Inclusive sample totals overlap: cross-game dependency checking accounted for about 58% (71.5/123.1 seconds), layer composition 35%, manifests 14%, file hashing 11%, and circuit name-reader initialization 12%. Garbage collection accounted for about 13% of self samples. Repeated sibling reads and reassembly dominated; collection merging was not a leading sampled cost.

The implementation retains quick-preview validation. Read-only requests reuse resolutions, raw layers, manifests and file hashes while their inputs' paths, nanosecond modification/change times, sizes and inodes remain unchanged. Each caller receives independent mutable data; registration functions retain identity. Input additions, removals, renames, locks, catalogs, package code and external release files invalidate the cache. Write tools do not use this request cache.

Unchanged disk siblings remain frozen in the request generation; pending content is always assembled and checked afresh. A dependency check assembles each sibling once, and does not resolve extra package overrides when the extra package set is empty. A preview reuses its restored workspace for log/drift reporting. An empty changeset assembles its content once. Name readers are initialized once per layer and qualification context, so circuit part-name sets are built once rather than once per object. The same resolution cache covers vocabulary, names, games and packages, including work already performed while registering tools at module initialization.

First calls improved by 51-62%, but remain above the 1500 ms target (1508-2291 ms). Unchanged second calls take 152-615 ms. The pending-edit column measures three distinct valid English title edits after opening the workspace: level titles for packages, game titles for game targets. All 24 edits passed, with medians of 177-806 ms.

Cold calls still pay for schema/name expansion, sibling course validation and first runtime/code validation. These checks remain active to preserve the quick-preview result.

Validation:

- `npm test`: 781 passed.
- `npm run lint:kit`: passed.
- `npm run words -- --check`: passed, 1711 words.
- `GAMES_BASELINE_ROOT=/Users/drava/Local/GitHub/study-notes/output/modules-baseline npm run baseline -- compare`: zero differences for all available snapshots (four games and five packages). The existing baseline tool skips circuit, image, rows, text and tick-bus because they have no locked snapshots; their package contract tests passed. Snapshots were read only; generated differences were written locally. `save` was never used.

`GAMES_BASELINE_ROOT` selects the input snapshot directory only. Comparison reports continue to be written under the current worktree's `output/modules-baseline/`.

Raw final samples: [reference](preview-before.jsonl), [optimized](preview-after.jsonl), [pending edits](preview-edits.jsonl). All before/after preview digests match. Earlier independent runs overlapped other sessions' tests and produced large outliers; the table uses the final paired runs after this worktree's checks finished. No competing Node test runner was detected at any final sample start.

Additional read-tool samples for package `qed` (three fresh processes): vocabulary 260 / 123 ms, names 331 / 186 ms, first / second calls. The cache also wraps games and packages. Full tool-output comparison is recorded below.

Initial required shared-process pass, before optimization (three calls, milliseconds):

| Target | Calls | Median |
| --- | --- | ---: |
| package / qed | 4513, 4422, 4440 | 4440 |
| package / vision-complete | 4996, 4764, 4784 | 4784 |
| package / state-graph | 3725, 3714, 3780 | 3725 |
| package / comp90086 | 3122, 3113, 3049 | 3113 |
| game / qed | 4222, 4175, 4132 | 4175 |
| game / vision-complete | 4230, 4185, 4214 | 4214 |
| game / state-graph | 3951, 3989, 3941 | 3951 |
| game / comp90086 | 3956, 3926, 3951 | 3951 |

Strict output comparison: 42 tool results (empty previews, pending package edits, rejected game-scope level edits, unknown operations, vocabulary, names, games and packages) serialize identically to the reference, including manifest hashes. The two approximately 70 MiB JSON files share SHA-256 `b0f9f3a627ed97b23da277d966b61462d23220e6b73253db2782830bdd9c3be9`.

Four additional successful game-title previews also matched byte for byte (SHA-256 `c3c3acef8adf6a8fe69e5b3572709474987fca766039d7dc297bf8ccb531d652`). This brings the strict comparison to 46 results, covering successful edits in both workspace scopes.
