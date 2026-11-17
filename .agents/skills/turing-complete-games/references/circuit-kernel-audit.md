# Circuit extraction audit

The production boundary uses object declarations, schemas and registered kind/state/check/play protocols.

## Kernel scan

The scan includes production code, test code and comments. Documentation prose is excluded. Each listed line is a match, and its row explains all listed matches.

```sh
rg -n -i 'circuit|part|tray|stage|workshop|grant' games/kit/engine games/kit/app games/kit/shell games/kit/views games/kit/course.js -g '*.js' -g '*.jsx' -g '*.mjs' -g '*.css'
```

| File | Matching lines | Explanation |
|---|---|---|
| `games/kit/app/plugin-game.jsx` | 2, 33, 36 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/app/studio.test.js` | 154, 155, 163, 165 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/baseline-reports.js` | 66, 73 | Native table and logic observation dispatch. Image observations are supplied by the image kind meaning. |
| `games/kit/engine/baseline-value.js` | 43, 45, 46, 58, 59, 65, 68, 69, 70, 72, 74, 75, 77, 80, 82, 87, 89, 100, 101, 102, 103, 104, 105, 106, 107, 202, 224, 226 | Frozen-corpus identity/path/copy-key and diagnostic spelling normalization, documented in engine/baseline.md. No execution results are dropped. |
| `games/kit/engine/baseline.test.js` | 61, 63, 64, 65, 71, 72, 73, 80, 81, 86, 87, 88, 91, 94, 106, 109, 124, 126, 127, 131, 132, 133, 134, 135 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/capabilities.test.js` | 6, 8, 24, 36, 37, 38, 39, 43, 44, 46, 47, 63, 64, 65, 66, 68, 71, 72, 74, 75, 76, 78 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/check-cache.js` | 22, 24 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/checks.js` | 11, 13, 79 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/circuit-bridge.js` | 2, 3, 4, 5, 6 | Permitted temporary bridge. Registers the logic symbol grant provider in the public circuit registry. |
| `games/kit/engine/content.test.js` | 22 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/contract.test.js` | 4, 10, 18 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/course-dependencies.test.js` | 4, 7, 9, 40, 42, 62, 70 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/course.test.js` | 5, 6, 32, 42, 48, 65, 75, 76, 77, 78, 80, 83, 86, 88, 89, 92, 95, 104, 105, 110, 122, 165, 167, 168, 175, 176, 178 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |

| `games/kit/engine/encyclopedia.test.js` | 20 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/engine.test.js` | 1, 4, 5, 6, 8, 12, 18, 21, 29, 34, 43, 45, 50, 53, 55, 60, 65, 67, 69, 74, 77, 79, 81, 84, 86, 89, 94, 96, 98, 99, 100, 102, 105, 109, 111, 113, 115, 118, 120, 123, 128, 129, 130, 131, 160, 162, 177, 184, 186, 192 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/existence.test.js` | 1, 10, 12, 18, 19, 22, 24, 25, 30 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/i18n.test.js` | 25, 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/kernel.js` | 2, 11 | Calls/imports of the permitted symbol-registration bridge. Other matches are ordinary identifiers. |
| `games/kit/engine/layers.test.js` | 243, 248, 255, 278, 282, 285 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/multi-package.test.js` | 33, 38 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/names.test.js` | 3, 9, 10, 14, 15, 16, 24, 25, 36, 39, 40, 44, 48, 53, 55, 56, 57, 59, 62, 83, 88, 89, 90, 92 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/objects.test.js` | 1, 4, 10, 13, 14, 40, 41, 42, 44, 45, 62, 64, 72, 73, 74, 75, 76, 77, 79, 116, 118, 119, 120, 121, 123, 126, 129, 145, 147, 148, 150, 151, 163, 165, 167, 205, 222 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/fixture.js` | 23, 24, 68, 69, 71, 122, 133, 134, 141, 143, 144, 147, 148, 153, 154, 165, 172, 178, 180, 185, 186, 190, 191, 198, 211, 212, 215, 219, 220, 221, 222, 224, 228, 230, 231, 234, 237, 238, 243, 244 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/mcp.test.js` | 56 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/operations.test.js` | 1, 19, 31, 34, 61, 116, 119, 121, 122, 123, 124, 128, 129, 173, 384, 406, 411, 412, 415, 419, 420, 421, 424, 426, 427, 428, 429, 430, 433, 434, 436, 437, 438, 439, 440, 441, 444, 445, 446, 447, 448, 450, 453, 454, 457, 458, 466, 479, 480, 483, 484, 487, 488, 489, 490, 540, 548 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/package-selection.test.js` | 19 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/workspace.js` | 8 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/package-content.test.js` | 12, 31, 36, 47, 55, 62, 65, 72, 82, 90, 92, 113, 116, 117, 122, 124, 125, 126, 134, 135, 140, 185, 188, 189, 196 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/package-prototypes.test.js` | 12, 24, 25, 26, 59, 72, 82, 84, 85, 86, 87, 88, 89, 98 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/play/blind.mjs` | 48, 49, 50 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/play.js` | 177 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/play.test.js` | 5, 82 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/play/session.js` | 2, 5, 7 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/stats.js` | 13 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/words.js` | 2 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/plays.js` | 9 | Generic play schema/layout and native parameter/grid exercise resource adapter. The circuit workshop is supplied by the package shell extension. |
| `games/kit/engine/plugin-boundaries.js` | 26, 27 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/plugins.test.js` | 86 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/releases.js` | 131, 132, 134, 138, 139, 141, 143 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/resolver.js` | 2, 181 | Calls/imports of the permitted symbol-registration bridge. Other matches are ordinary identifiers. |
| `games/kit/engine/scaffold.test.js` | 1, 14, 23 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/seed.js` | 2, 3, 5, 6, 9, 10 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/stamp.js` | 5 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/stamp.test.js` | 4, 12, 27, 30, 33, 35, 36, 37, 44, 45, 46 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/styles.js` | 11 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/styles.test.js` | 1 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/tape.js` | 49, 50, 52, 53 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/tape.test.js` | 1, 6, 7, 20, 26, 28, 31, 37, 39, 42, 55, 57 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/terminology.test.js` | 47, 52, 76, 78, 79 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/tests.test.js` | 25, 41 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/views.js` | 12, 13 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/Dialogs.jsx` | 11 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/EditMarks.jsx` | 17 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/IntroFigure.jsx` | 13, 20 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/Layout.jsx` | 21, 23, 24 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/Timeline.jsx` | 43, 48, 54, 55 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/Workbench.jsx` | 14, 24, 27, 35, 37 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |



| `games/kit/shell/edit.js` | 2 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/number-entry.js` | 4, 5, 6, 7 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/plays/BoardChecks.jsx` | 36, 37, 49 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/FieldRows.jsx` | 55, 56, 84 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/ManualBoardPlay.jsx` | 125 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |

| `games/kit/shell/plays/PlayLayout.jsx` | 3, 4, 6 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/Rows.jsx` | 15, 16, 21 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/ScenarioCheck.jsx` | 32, 33, 51 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/TreeWork.jsx` | 42, 43, 60 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/ValueTables.jsx` | 53, 54, 76 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |

| `games/kit/shell/refs.js` | 55, 56 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/run-marks.test.js` | 3 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/shell/settings.test.js` | 1, 6 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/shell/shell.css` | 131, 135, 165, 168, 169, 170, 317, 428, 442, 443, 683, 684, 685, 701, 727 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/views/Show.jsx` | 11 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/views/picks.js` | 1, 2, 8 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/views/picks.test.js` | 27 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/views/plots/Plot.jsx` | 15 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/views/plots/plane.js` | 7 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |

## Native public-export bridges

The remaining native modules consume circuit through its public core/view exports. Each call below leaves with its owning module in MODULES.md steps 7–10. The symbol provider bridge leaves with logic.

| Consumer | Import lines | Removal |
|---|---|---|
| `games/kit/modules/table/plays.js` | 1 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/items/conditions.js` | 5 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/work.js` | 7, 8, 9, 10, 11, 12, 16, 18, 21 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/vocabulary.js` | 14, 15 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/model/parts.js` | 1 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/model/wiring.js` | 8, 9, 10, 11 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/model/run.js` | 5, 6, 7, 8, 9 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/model/world.js` | 34, 38 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/model/board.js` | 13 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/table.test.js` | 7, 9, 10 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/module.js` | 1 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/runtime.js` | 9 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/play.js` | 13 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/game.js` | 1, 7, 10 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/ui/useRobotWorld.js` | 1, 2 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/ui/board.js` | 5, 8 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/ui/partDemo.js` | 1, 2, 3, 4, 6 | Move with `table`; import only public package exports. |
| `games/kit/modules/table/ui/circuitCourse.js` | 1 | Move with `table`; import only public package exports. |
| `games/kit/modules/logic/play.test.js` | 1, 5 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/gates.js` | 9, 10, 11, 12 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/logic.test.js` | 16 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/play.js` | 2 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/grants.js` | 1 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/game.js` | 1, 8, 9, 18 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/scriptValues.js` | 2 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/proof.js` | 1, 15, 16, 17, 19, 20 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/elimgen.js` | 18 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/plays.js` | 1 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/machine.js` | 1, 42, 43, 53 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/work.js` | 10, 12, 17, 22, 23, 24, 31, 32, 33, 34 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/validate.js` | 7, 16 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/ops.js` | 8 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/auditWork.js` | 2 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/vocabulary.js` | 17, 18 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/content.test.js` | 7, 9, 13, 14, 19, 20 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/module.js` | 1 | Move with `logic`; import only public package exports. |
| `games/kit/modules/logic/ui/machine.js` | 8 | Move with `logic`; import only public package exports. |

## Studio handoff

Only `studio/object-types.test.js` required a mechanical update in this continuation. Its quote fixture now declares `circuit/quote` and expects generic object operations. Studio production UI files remain owned by Claude. The existing part, tray and stage-chain editors can use the declared schemas and operation metadata. Package-provided specialized editors remain step 11.

## Corpus coverage

The locked corpus contains all four games and five pre-existing content packages. `circuit` and `text` are newer code packages and have no locked snapshot. The baseline command reports this explicitly and their individual checks/contracts cover them. No snapshots were saved.

## Step 6 collection checkpoint

Collection composition now belongs to `engine/collections.js`. Circuit's tray-specific override hook and all
runtime display-order relation interpretation were removed. Circuit consumes `circuit/grant` reference lists,
keeps menu and direct-grant order, and retains the existing workshop default. The remaining native module bridges
listed above remain scheduled for steps 7–10 with their existing public imports.

Chapters are kernel game-layer objects in `chapters/`; game.json stores their ordered full-name list.
Chapter copy/machine metadata stays on each chapter, while optional/skippable and startup settings stay in course.json.
`kind-policy.js` supplies common declaration/override checking; package declarations carry the same policy fields.
Provenance uses `sources[kind][name].collections[path][memberKey]`, including nested menu values and edge identities.
Studio production files were left to their owner. Mechanical changes affect only api.test.js, object-types.test.js,
list-groups.test.js and tag-order.test.js. The Studio owner connects schema-driven list/set/edges controls,
chapter objects, policies and contributor audit through the existing operation/tool API.

Game configuration is exposed as `registries.game["@<game>/config"]`, with collection provenance in sources.game.
`game.json.encyclopedia` preserves former section order, and the shell consumes each section list in that order.

## Step 7 bridge removal

Rows and tick-bus are now ordinary packages. Their module registrations, static kernel imports and native
Vite dispatch are removed. Package code consumes only `kernel`, `kernel/view`, `circuit` and `circuit/view`.
The bus-only tick runner, reports, textual tick-play adapter and tick tests moved from circuit to tick-bus.
The former native starter objects moved to the owning packages, with no package course or chapter.

Remaining temporary bridges are exactly the table/logic public circuit imports listed above, plus
`engine/circuit-bridge.js` for logic symbol grants. These leave in their respective extraction steps.


## Step 8 bridge removal

Image is an ordinary circuit-dependent package. Its native kernel registration, content-kind
registration, preparation dispatch and image-only workshop dispatch are removed. Parameter-bench
core, controls, displays, black-box probe judge/view and observation collectors moved to image.
Circuit no longer registers bench displays. Shared layouts use image display names.
Vision-complete owns its dedicated catalog and presentation. Each image content package owns
its power/box kinds. Package imports use only public exports.

Remaining temporary bridges are the table and logic public circuit imports in the table above,
and `engine/circuit-bridge.js` for logic symbol grants. Studio editors remain with their owner
until step 11. No image bridge remains.
