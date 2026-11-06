# Pipeline stage acceptance

Stages are derived from passed boards by node identity. The full graph is always the runner's input. Stage
ownership and connection navigation never enter the blueprint. Divider notes and fold state are saved as layout metadata, without changing evaluation.

## Reference provenance

| Task | Prior stages with surviving nodes | Current loose nodes |
| --- | --- | --- |
| Signed derivatives | Kernel computation (4), kernel orientation (1) | Vertical response (5) |
| Gradient length | Kernel computation (4), kernel orientation (1), vertical response (5) | Length (1) |
| Sobel | Kernel computation (4), kernel orientation (1), vertical response (5), length (1) | Perpendicular smoothing (5) |
| Scanner | Kernel computation (4), kernel orientation (1), vertical response (5), length (1), perpendicular smoothing (5) | Channel weights, channel measurement, presmoothing, threshold (5) |

Border changes retain existing node ids and therefore remain in their original stages. A valid-interior crop
that is absent from a later board creates no empty stage. No unavailable reference board was encountered.

## Miniature face

The studio's fourth pane was edited through its block controls, previewed live and applied through the operation
set. Arithmetic now demonstrates a summary and bilingual text on that face. The schema rejects control settings,
actions, ports, rows and widgets on miniatures. The other faces and circuit expressions are unchanged.

## Desktop folding

The scanner opens with five course presets and its current parts. Desktop groups read the same slot-row
dividers, notes and fold states as the phone. Folding changes only board layout metadata; the runner and
blueprint APIs continue receiving the complete graph. SVG layout tests pass with the shared column layout.
Automatic arrangement treats each section as a unit and reserves separate input and output columns.

## Phone slot dividers

The accordion has been removed. At 390 × 844, compact parts remain on the original slot grid and folded sections
occupy their divider line. Inserting a divider, naming it “取样与汇总”, folding it and reloading preserves the note
and folded interval. There is no horizontal overflow. Compact and full views share one toggle button. Arrange
orders parts within their existing section boundaries; it does not change wires or settings.

## Connection labels

Desktop and phone use the same crossing/fanout/length policy. Phone labels were followed from a folded kernel
stage to its presmoothing source and back, opening the kernel stage and highlighting its paired labels. Desktop
labels highlight the pair and pan to the destination. Multiple consumers are cycled from the single source tag.
Tags are an interaction layer above cards; long cross-stage strokes are omitted, while intra-stage wires remain.

## Open-part audit across all games

The complete game audit reports one staged task over the limit: From One Wire (`network`), task `1-40`, has
10 loose parts against the limit of 8. It is recorded as `open-crowded: 1-40@1-40` in that game's work list;
no puzzle, reference circuit or dependency was changed. Vision Lab has no over-limit staged tasks. Vision
Complete, State Graph, Q.E.D., Syntax Graph, Software Factory and The Car Talks also have no findings.

## Player settings and final browser checks

The gear is available on maps and in levels. Language and theme now live inside that panel, using the existing
site-wide preference keys. Language choices are exactly 简体中文 and English. Other preferences use the single
per-game `games.settings` key; grid choices are shared with results and cycle through one button.

On the scanner at 390 × 844, manual section editing starts hidden. Enabling it exposes insertion, handles, notes
and deletion; disabling it removes every editing control while retaining saved dividers. A temporary divider was
inserted at row 11, renamed, dragged to row 12 and deleted: all 27 nodes remained. Compact initial mode survives
reload. The custom “取样与汇总” note and fold state survive reload and appear on desktop too. Desktop Arrange
changes coordinates, preserves wires and section membership, and Undo restores the exact previous graph.
New parts skip holes inside folded sections; if all sections are folded, adding a part reveals its section.

The scanner still passes all cases. Label preferences remove and restore paired tags. Setting Picture changes the
results preference immediately, and its single view button changes it back to Numbers. English phone settings
have no horizontal overflow. Settings were inspected in light and dark themes on phone and 1440 × 900 desktop.
Q.E.D.'s map offers language and theme without the irrelevant manual-section option. Registry tests cover
per-game isolation, defaults, malformed/unavailable storage, validation, filtering, reset and subscriptions.

Final verification: 416 tests passed; course checks, vocabulary snapshots, duplication, styles and all-game builds passed. The completed implementation plan was consolidated into DESIGN and PLAN.
