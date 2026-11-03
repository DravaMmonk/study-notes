# Vision Lab chapters 1–2: static learning review

Reviewed on 2026-11-03 against the trial at `4a1a67de`, including its optical-axis correction. The shared handbook,
current blueprint, selected level/task copy and reference boards, pinhole model, renderer and bench visibility logic were read.
The optical axis is defined in 1A1 and labelled by `PinholeRays`; the old missing-axis finding is not repeated.

Scope: source-based learning/design review. No level JSON, blueprint, glossary, save migration or renderer was
changed to close these findings. No new blind play or screenshot-based visual acceptance was performed. The
current topology is described below; proposed route splits are design candidates, not a new executable order.

## Findings that block pedagogical acceptance

| ID / rule | Evidence | Learning problem | Required repair / owner |
| --- | --- | --- | --- |
| R1 `route-serialisation` | `games/vision-lab/game.json`: eras 1 and 2 each list a single serial `foundation`; blueprint series `camera` and `convolver` contain no parallel tracks | Image-array learning waits for the full optics line; column processing waits for kernel orientation; Sobel/gradient waits for Gaussian filtering, although the latter cases have independent dependencies in `uses` | Audit concept and part dependencies, distinguish required parallel routes from optional topics, and specify real joins. Do not add decorative forks. Owner: blueprint |
| R2 `concept-jump` | `levels/1A3.json`: level intro, tasks `1A3` and `1A3_2`; `image-array-checks` is taught later at 1A4 | Physical/pixel scale, full/half field of view, pixel origin and principal-point shift must become usable within one level. Some names are defined in sentences, but their coordinate operations have not been established by prior actions | Inventory each representation change, provide smaller acquired steps before combination, and check both route orders if optics and arrays split. Owner: blueprint / levels |
| R3 `guidance-gap` | `1A1.tasks[0].hint[0]` asks to follow the ray; its bench uses `check: 'submit'`; kernel `Bench.jsx` derives `revealed` from the last checked setting; `PinholeRays` draws rays only when `shown` | The observation requested for discovery is absent while choosing a new setting. Submitting once reveals the ray only at that setting; changing the knob hides it again | Specify discovery evidence separately from assessed-result withholding. Changing submit to live alone is not sufficient: the interaction must require a meaningful observation and transfer. Owner: domain / levels |
| R4 `guidance-gap` | `1A1.tasks[1].hint[0]` asks what happened when Z or f doubled, but the first bench opens only X, with Z=4 and f=2 fixed | The hint presumes an experiment this task never lets the learner perform. One X-to-u example does not establish the full dependence on Z and f | Plan accessible controlled variations or other visible contrasts, then a circuit transfer check. Owner: levels / copy |
| R5 `principle-synthesis` | `1A2.after.zh` says colour and object count are determined by an image; the English summary repeats the claim | The size/depth ambiguity experiment cannot establish that general claim. Occlusion can hide object counts, and illumination can confound intrinsic surface colour | Summarise the ambiguity actually demonstrated, explain the assumption permitting conditional reconstruction, and state the model's limits. Owner: copy |
| R6 `principle-synthesis` | `1A1.after` states u=fX/Z and a doubling result; `1A2.after` states size/depth ambiguity; neither supplies the complete explanatory bridge needed before the later coordinate task | Naming the relationship or repeating a result is not the same as explaining the geometric reason and which information has been lost. This is a scaffolding judgement, not a claim that both summaries contain no explanation at all | Specify a short post-discovery geometric/causal synthesis and an uncertainty boundary, without replaying a board or numeric target. Owner: copy / levels |
| R7 `display-semantics` | `ui/benches/Displays.jsx`, `PinholeRays`: explicit axis/plane labels exist, but the camera-centre circle has no label and X/H do not have attached dimension marks; no full/half FOV arc or image-origin/principal-point coordinate panel is drawn | The learner must infer what each mark measures and transfer a side-view displacement into a pixel column from prose alone | Define a concept-to-mark contract; provide only the relevant annotated geometry and coordinate views at each learning step, with matching names in controls and feedback. Owner: domain |
| R8 `display-semantics` | `PinholeRays` uses different transforms for depth and height (`x` from zMax, `y` from tall); 1A3's clue appeals to 45-degree geometry | Equal physical rises and runs need not look equal in this schematic. A stable scale prevents misleading auto-zoom, but does not make the picture angle-preserving | Provide an angle-preserving inset or visibly declare the schematic and show the relevant angular construction separately; identify units and axes. Owner: domain |

R1 uses actual dependencies rather than assuming all neighbouring levels are independent: 2B5 currently needs
both kernel orientation and the column-filter output, while 2B9 uses outputs from both the Gaussian and gradient
lines. Those are possible joins, not arguments for keeping every step serial. A different reference design may
change these dependencies, but that needs a separate content revision.

## Task-boundary evidence sample

| Task | Guaranteed before it | New burden | What must become visible or actionable |
| --- | --- | --- | --- |
| 1A1 bench | New learner; optical axis is now defined locally | Projection of a point and ratio of distances | Named point, centre and plane; an observable ray; controlled comparison with an interpretable result |
| 1A1 circuit | One fixed-Z/f bench example | Generalising a relation to independently varying X, Z and f | Evidence about those variations before the transfer hint relies on them |
| 1A2 bench/circuit | Projection relation | Non-unique inverse; reconstruction conditional on a depth | Two inspectable scene states for the same image; a clear distinction between assumed and recovered depth |
| 1A3 bench | Projection and size/depth ambiguity | Sensor extent, angle/half-angle, length-to-pixel scale | Sensor edges and reference direction; the angular geometry and what units each measurement uses |
| 1A3 circuit | Prior optics tasks, but no earlier array-coordinate practice | Image-origin shift, principal point, scaled focal length | An annotated coordinate strip/front view, then a changed case distinguishing signed displacement from pixel column |

This sample motivates the blocking findings; it is not a completed audit of every task in both chapters. Future
content revision must complete the worksheet from the shared skill reference for every changed task and both
languages.

## Domain requirements and candidate learning routes

The domain contract (`games/kit/domains/vision/DESIGN.md`) separates numerical validity, explanatory
geometry and visual acceptance. It requires named referents/measurements, explicit units and coordinate frames,
stable controlled comparisons, a meaningful discovery/assessment distinction and high-quality legible interaction.
These capabilities are requirements to meet, not claims that new displays have already shipped.

| Chapter | Candidate required routes | Possible convergence | Optional material |
| --- | --- | --- | --- |
| Camera | Geometric projection/inverse reasoning; image arrays and coordinate meaning | Physical-to-pixel camera coordinates only after the relevant geometry and representation steps | Workshop/library conventions and peripheral imaging topics |
| Convolver | Kernel orientation versus column/separable reasoning after shared local filtering; smoothing versus derivatives after the required filter construction | Separable construction where both branches are needed; a later use that genuinely needs smoothing and gradients | Workshop channel-order conventions and peripheral applications |

Route order is the choice; core competence is still required. The existing `parallel` contract requires all branch
ends at a join. The present game data has not been reordered by this review.

## Static automation and limits

`npm run pipeline -- vision-lab pedagogy` (from `trace-viewer/`) is read-only; `pd-serial-chapter` reports both current chapter shapes without claiming that every serial edge is wrong. Tests
cover serial foundation/practice, optional topics, genuine required parallel routes, a one-level chapter and an
empty decorative branch. Semantic judgement still decides R1–R8. Existing schema, knowledge and copy audits cannot
infer whether a diagram teaches a concept or whether several representations overload a novice.

No renderer change or screenshot was made here. Label overlap, typography, overall visual polish, touch usability
and motion clarity remain unverified by this static review; they require inspection of the implemented screens.

## Verification of the review tooling change

- Pipeline tests: 9 passed, including the serial/parallel topology cases.
- Complete shared kit test suite: 303 passed. An initial restricted run could not bind the local test server;
  the permitted rerun completed with no failures or cancellations.
- Current `vision-lab` reference-answer and course checks passed; this is not pedagogical approval.
- The read-only pedagogy command reports eras 1 and 2 as serial candidates and leaves pipeline state unchanged.
- Skill validation and document-link/whitespace checks passed. Hash comparison confirmed all 24 trial content,
  blueprint, glossary, change-log and pipeline-state files remained unchanged relative to the reviewed version.
