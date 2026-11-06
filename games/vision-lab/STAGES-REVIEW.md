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
