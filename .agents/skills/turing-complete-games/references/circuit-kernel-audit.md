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
| `games/kit/engine/baseline-reports.js` | 31, 32, 33, 34, 37, 44, 89, 101 | Native table task identifier and production runner observation; parameter-bench step observation. This code contains no circuit content or grant interpretation. |
| `games/kit/engine/baseline-value.js` | 43, 45, 46, 58, 59, 65, 68, 69, 70, 72, 74, 75, 77, 80, 82, 87, 89, 100, 101, 102, 103, 104, 105, 106, 107, 201, 223, 225 | Frozen-corpus identity/path/copy-key and diagnostic spelling normalization, documented in engine/baseline.md. No execution results are dropped. |
| `games/kit/engine/baseline.test.js` | 60, 62, 63, 64, 70, 71, 72, 79, 80, 85, 86, 87, 90, 93, 105, 108, 123, 125, 126 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/bench.js` | 9, 11, 67, 103, 133, 134, 142, 169, 170, 174, 180, 181, 201, 202, 204, 205, 206, 207, 211, 217, 218, 220, 221, 222, 224 | Parameter-bench steps and layout. These steps advance knob exercises and do not upgrade grantable objects. |
| `games/kit/engine/bench.test.js` | 20, 30, 56, 59, 67, 71, 78, 82, 107, 111, 112 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/capabilities.test.js` | 6, 8, 24, 36, 37, 38, 39, 43, 44, 46, 47, 63, 64, 65, 66, 68, 71, 72, 74, 75, 76, 78 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/check-cache.js` | 22, 24 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/checks.js` | 11, 13, 79 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/circuit-bridge.js` | 2, 3, 4, 5, 6 | Permitted temporary bridge. Registers the logic symbol grant provider in the public circuit registry. |
| `games/kit/engine/content.test.js` | 22 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/contract.test.js` | 4, 10, 18 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/course-dependencies.test.js` | 4, 7, 9, 40, 42, 62, 70 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/course.test.js` | 5, 6, 32, 42, 48, 65, 75, 76, 77, 78, 80, 83, 86, 88, 89, 92, 95, 104, 105, 110, 122, 165, 167, 168, 175, 176, 178 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/displays.test.js` | 48, 51 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/encyclopedia.test.js` | 21 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/engine.test.js` | 1, 4, 5, 6, 8, 12, 18, 21, 29, 34, 43, 45, 50, 53, 55, 60, 65, 67, 69, 74, 77, 79, 81, 84, 86, 89, 94, 96, 98, 99, 100, 102, 105, 109, 111, 113, 115, 118, 120, 123, 128, 129, 130, 131, 160, 162, 177, 184, 186, 192 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/existence.test.js` | 1, 10, 12, 18, 19, 22, 24, 25, 30 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/i18n.test.js` | 25, 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/kernel.js` | 2, 14 | Calls/imports of the permitted symbol-registration bridge. Other matches are ordinary identifiers. |
| `games/kit/engine/layers.test.js` | 70, 76, 258, 263, 270, 293, 297, 300 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/multi-package.test.js` | 32 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/names.test.js` | 3, 9, 10, 14, 15, 16, 24, 25, 36, 39, 40, 44, 48, 53, 55, 56, 57, 59, 62, 83, 88, 89, 90, 92 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/objects.test.js` | 1, 4, 10, 13, 14, 40, 41, 42, 44, 45, 62, 64, 72, 73, 74, 75, 76, 77, 79, 102, 104, 125, 127, 128, 129, 130, 131, 133, 136, 139, 154, 156, 161, 163, 164, 166, 167, 179, 181, 183, 213, 259, 273, 281, 291 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/fixture.js` | 22, 23, 67, 68, 70, 121, 132, 133, 138, 140, 141, 142, 143, 148, 149, 160, 167, 173, 175, 180, 181, 185, 186, 193, 206, 207, 210, 214, 215, 216, 217, 219, 223, 225, 226, 227, 229, 230 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/mcp.test.js` | 56 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/operations.test.js` | 1, 19, 31, 34, 61, 120, 123, 125, 126, 127, 128, 132, 133, 177, 388, 410, 415, 416, 419, 423, 424, 425, 428, 430, 431, 432, 433, 434, 437, 438, 440, 441, 442, 443, 444, 445, 448, 449, 450, 451, 452, 454, 457, 458, 461, 462, 470, 483, 484, 487, 488, 491, 492, 493, 494, 544, 552 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/package-selection.test.js` | 19 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/ops/workspace.js` | 7 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/package-content.test.js` | 12, 31, 36, 47, 55, 62, 65, 72, 82, 90, 92, 113, 116, 117, 122, 124, 125, 126, 134, 135, 140, 185, 188, 189, 196 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/package-prototypes.test.js` | 12, 24, 25, 26, 57, 70, 80, 82, 83, 84, 85, 86, 87, 96 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/play/blind.mjs` | 48, 49, 50 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/play.js` | 177 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/play.test.js` | 5, 82 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/play/session.js` | 2, 5, 7 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/stats.js` | 13 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/play/words.js` | 2 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/plays.js` | 9, 32, 33 | Generic play schema/layout and native parameter/grid exercise resource adapter. The circuit workshop is supplied by the package shell extension. |
| `games/kit/engine/plugin-boundaries.js` | 26, 27 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/plugins.test.js` | 86 | Synthetic test data, explicit circuit installation and regression assertions. These files have no production entry point. |
| `games/kit/engine/releases.js` | 131, 132, 134, 138, 139, 141, 143 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/engine/resolver.js` | 1, 181 | Calls/imports of the permitted symbol-registration bridge. Other matches are ordinary identifiers. |
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
| `games/kit/shell/bench/Bench.jsx` | 9, 10, 22, 24, 26, 27, 33, 35, 38, 39, 41, 43, 49, 52, 53, 54, 58, 92, 93, 98, 111 | Parameter-bench steps and layout. These steps advance knob exercises and do not upgrade grantable objects. |
| `games/kit/shell/bench/Rich.jsx` | 3, 5, 11, 12 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/bench/bench.css` | 14, 201 | Parameter-bench steps and layout. These steps advance knob exercises and do not upgrade grantable objects. |
| `games/kit/shell/edit.js` | 2 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/number-entry.js` | 4, 5, 6, 7 | General-purpose identifiers or explanatory comments. Matches include text/path segments (parts), partitioning, replaceState, work stages and schema-independent rendering; no circuit-specific interpretation. |
| `games/kit/shell/plays/BoardChecks.jsx` | 36, 37, 49 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/FieldRows.jsx` | 55, 56, 84 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/ManualBoardPlay.jsx` | 125 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/Play.jsx` | 4, 16 | Generic play schema/layout and native parameter/grid exercise resource adapter. The circuit workshop is supplied by the package shell extension. |
| `games/kit/shell/plays/PlayLayout.jsx` | 3, 4, 6 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/Rows.jsx` | 15, 16, 21 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/ScenarioCheck.jsx` | 32, 33, 51 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/TreeWork.jsx` | 42, 43, 60 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/ValueTables.jsx` | 53, 54, 76 | Generic main-area stage slot, shared layout/style, or prose describing that slot. No part/tray/stage-chain/grant rules. |
| `games/kit/shell/plays/WorkshopPlay.jsx` | 10, 14, 15 | Generic play schema/layout and native parameter/grid exercise resource adapter. The circuit workshop is supplied by the package shell extension. |
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
| `games/kit/modules/tick-bus/work.js` | 1, 14 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/vocabulary.js` | 11 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/module.js` | 1 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/tick-bus.test.js` | 8, 11 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/run.js` | 13, 14 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/board.js` | 17, 18 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/runtime.js` | 5 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/play.js` | 5 | Move with `tick-bus`; import only public package exports. |
| `games/kit/modules/tick-bus/game.js` | 17 | Move with `tick-bus`; import only public package exports. |
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
| `games/kit/modules/rows/module.js` | 1 | Move with `rows`; import only public package exports. |
| `games/kit/modules/rows/runtime.js` | 1 | Move with `rows`; import only public package exports. |
| `games/kit/modules/image/plays.js` | 1 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/own.js` | 1, 2, 3 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/board-view.js` | 1, 2, 3 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/colour.js` | 2 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/nodes.js` | 1 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/definitions.js` | 3, 4 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/preview.js` | 1 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/board.js` | 10, 11, 12 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/engine/graph.js` | 1, 2, 3 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/reset-training.test.js` | 5 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/colour.test.js` | 101 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/image.test.js` | 9, 10, 11, 12 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/runtime.js` | 8, 9 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/play.js` | 7 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/game.js` | 1, 2, 8, 10, 14 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/vocabulary.js` | 12, 13 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/module.js` | 1 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/work.js` | 7, 11, 12, 13, 14, 15 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/items/constraints.js` | 7 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/ui/catalog.js` | 2 | Move with `image`; import only public package exports. |
| `games/kit/modules/image/ui/displays.js` | 7 | Move with `image`; import only public package exports. |
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
keeps menu and direct-grant order, and retains the existing workshop default. The five native module bridges
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
