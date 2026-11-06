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

## Component faces

Parts have three configurable faces: desktop card, phone tile and shared detail. The fourth miniature face and
its schema, content and rendering were removed. Studio's live preview was inspected and contains exactly three
panes. A folded component is the ordinary card with its body omitted; its head and real ports remain.

## Desktop folding

The scanner retains all 27 original cards when sections fold. Comparing the board before and after a section
toggle found identical node identities and desktop x/y coordinates; only body height changed. Each group is a
passive faint background derived from component bounds, with a note and fold control. It has no border, title
bar, proxy ports or independent drag surface. Nested frames keep their cards and inherit folded bodies.

## Phone slot sections

At 390 × 844, section folding retains all 21 working-part tiles and their slot rows. All-fold mode marks every
tile as folded and renders no tile values, settings or summaries. Section mode folds only its member bodies.
Both views use the same card names and actual input/output dots, above the same faint section backgrounds.
There is no horizontal overflow. Saved dividers and notes, insert/move/delete editing and undoable arrangement
remain the same layout metadata. Deleting a divider never deletes a component.

## Connection labels

Desktop and phone share the same crossing/fanout/length policy when labels are enabled. Phone labels were followed from a folded kernel
stage to its presmoothing source and back, opening the kernel stage and highlighting its paired labels. Desktop
labels highlight the pair and pan to the destination. Multiple consumers are cycled from the single source tag.
Labels use actual component ports. There are no folded-boundary proxy ports or special crossing rules. Desktop
defaults to continuous wires: with the original cards present, their actual endpoints make the data flow easier
to follow without duplicate name tags. Phones default to labels because long wires cross many scrolling rows.
An explicit per-game preference overrides either default. Both defaults and the override were tested.

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

## Folding revision acceptance

The scanner still passes every case after section toggles and note editing. Light and dark themes were inspected
on desktop and phone. The Studio preview contains card/tile/detail only. The shared folding test covers nested
frames and graph immutability; layout tests preserve section membership and circuit expressions. All 416 tests,
content checks, vocabulary snapshots, duplication, styles and all-game builds passed. No vocabulary snapshot
changed: the removed parts-file face is outside the domain vocabulary snapshots. Vision Lab's parts change was
adopted through the operation log.
