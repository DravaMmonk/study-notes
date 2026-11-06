# Pipeline stage acceptance

Stages are derived from passed boards by node identity. The full graph is always the runner's input. Stage
ownership, folded state and connection navigation never enter the blueprint or player save.

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

The scanner opens as five prior stages plus the current loose parts. Light and dark views were inspected.
Expanding the kernel stage, changing its border setting and restoring it, then folding and checking still passes
all scanner cases. The saved graph is identical before and after a fold toggle; the runner and blueprint APIs
continue receiving that complete graph. SVG layout tests pass after extracting the shared column layout.

## Phone accordion

At 390 × 844, two successive stage-header taps leave exactly one stage expanded and the page has no horizontal
overflow. The scanner passes all tests from this view. Existing nodes retain their global slot identifiers while
stage grids compact their visual placement; opening a stage does not write grouping or fold state to progress.

## Connection labels

Desktop and phone use the same crossing/fanout/length policy. Phone labels were followed from a folded kernel
stage to its presmoothing source and back, opening the kernel stage and highlighting its paired labels. Desktop
labels highlight the pair and pan to the destination. Multiple consumers are cycled from the single source tag.
Tags are an interaction layer above cards; long cross-stage strokes are omitted, while intra-stage wires remain.
