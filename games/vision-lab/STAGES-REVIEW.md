# Course provenance and open-part audit

Course provenance supplies identity-based block presets. Current UI and geometry acceptance is recorded in
`BLOCKS-REVIEW.md`; the course chain and open-part audit remain as below.

## Reference provenance

| Task | Prior stages with surviving nodes | Current loose nodes |
| --- | --- | --- |
| Signed derivatives | Kernel computation (4), kernel orientation (1) | Vertical response (5) |
| Gradient length | Kernel computation (4), kernel orientation (1), vertical response (5) | Length (1) |
| Sobel | Kernel computation (4), kernel orientation (1), vertical response (5), length (1) | Perpendicular smoothing (5) |
| Scanner | Kernel computation (4), kernel orientation (1), vertical response (5), length (1), perpendicular smoothing (5) | Channel weights, channel measurement, presmoothing, threshold (5) |

Border changes retain existing node ids and therefore remain in their original stages. A valid-interior crop
that is absent from a later board creates no empty stage. No unavailable reference board was encountered.

## Open-part audit across all games

The complete game audit reports one staged task over the limit: From One Wire (`network`), task `1-40`, has
10 loose parts against the limit of 8. It is recorded as `open-crowded: 1-40@1-40` in that game's work list;
no puzzle, reference circuit or dependency was changed. Vision Lab has no over-limit staged tasks. Vision
Complete, State Graph, Q.E.D., Syntax Graph, Software Factory and The Car Talks also have no findings.
