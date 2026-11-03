# Vision Lab chapters 1–2: learning review

Reviewed 2026-11-04. Scope: the revised trial's blueprint, both-language copy, every changed task, glossary,
reference and naive programs, pinhole displays, neighbourhood aid and generated save migrations. This review
replaces the findings against the trial at `4a1a67de`; it is not a novice learning-outcome study.

## Curriculum decisions

- Chapter 1 starts with two required routes: geometry (1A1 → 1A2) and arrays (1A4). Neither needs the other's
  parts. Both join at 1A3, then continue through cropping and sampling. Displayed main-path numbers are 1-1 to 1-7;
  stable content ids are retained. The former overloaded field-of-view experiment is F1 (1F1), an optional topic
  after 1A1. It is independent of pixel-coordinate conversion and must not block that join.
- Chapter 2 shares 2B1–2B2, splits kernel orientation (2B3) from column addressing (2B4), and joins at 2B5.
  This join actually flips both written kernels before calling positional row/column parts. Asymmetric tests
  reject omitted flips. Smoothing (2B6) and changes (2B7–2B8) then run independently; 2B9 outputs a weighted
  blurred colour image and that image's edge strength, calling both branches' built parts.
- Workshop content remains optional. Framing and camera Workshop topics have distinct F/W labels. Looking up a
  foundation's meaning does not replace the practical task that teaches the reasoning.

## Disposition of the original blockers

| Finding | Repair and evidence |
| --- | --- |
| R1: serial routes | Blueprint parallel groups and actual `course.before` relations are checked. Both initial routes are open in a fresh game; genuine joins require both ends. Orientation affects the 2D program; smoothing and gradient parts affect the final program. |
| R2: concept jump | 1A3 separately checks signed unit conversion, origin translation and circuit transfer. Task 2 retains the measured −1 px offset rather than asking the learner to rediscover it. Array conventions are acquired on the other required route. Field of view is separate and optional. |
| R3: hidden discovery evidence | A fixed reference image and ray remain visible before checking a prediction. A submitted trial reveals its ray and measurement; changing the guess hides that trial again. The reference is never hidden by the assessment control. |
| R4: inaccessible X/Z/f comparisons | 1A1 uses three controlled stages changing only X, Z or f from the same reference, then generalises in a circuit with independently varying inputs. Stage initial states and incorrect predictions fail. |
| R5: unsupported inverse claims | 1A2 constructs a different height/depth pair with the same projection. Its synthesis distinguishes assumed depth from recovered depth and makes no uniqueness claim about colour or object count. |
| R6: inadequate synthesis | Summaries connect observed constraints, consequences and limits. Definitions remain in clickable entries; summary review does not demand duplicated dictionary prose. Kernel sign, boundary artefacts and interpolation's information limits are addressed. |
| R7: missing referents | Side views label O, the plane, scene/image values and distances. Term tags open meanings. The sensor strip separates a signed offset from an image-origin coordinate; c_x appears in the origin task rather than the unit task. |
| R8: misleading angles | Side views explicitly disclose unequal axis scales. F1 uses one scale for both axes, sensor edges and full/half-angle arcs. Its parameter range keeps the construction readable at phone size. |

## Task-boundary worksheet

The same instructional contract applies to Chinese and English. Reference programs and calculations are checked
independently of whether the copy reads well. Repeated terms in one visible field share one clickable tag.

| Task(s) | Guaranteed basis | New action / representation | Evidence and transfer check |
| --- | --- | --- | --- |
| 1A1 | No prior course knowledge; entries give geometric meanings | Predict three isolated X/Z/f changes | Fixed reference ray; trial result only after check; wrong predictions fail |
| 1A1_2 | Three comparisons | General projection circuit | Positive, negative, zero and independently varying distance/focal inputs |
| 1A2 | Projection | Construct a different scene with one image | Fixed H=1, Z=4 reference; H/Z construction, not an answer choice |
| 1A2_2 | Non-unique inverse experiment | Reconstruction conditional on Z | Same image with different supplied depths produces different X |
| 1A4 | Independent starting route | Locate row/column | Non-square grid exposes swapped coordinates |
| 1A4_2 | Located cells | Change one RGB sample | Wrong-cell edit fails; other cells must stay unchanged |
| 1A4_3 | Coordinates and sample values | Read two positions and subtract | Different rows, columns and signs; no projection part needed |
| 1A3_scale | Both required routes | Convert signed physical offset | Horizontal strip; negative offset and explicit sensor size/count |
| 1A3_origin | Checked −1 px offset | Translate to image-origin coordinate | Supplied c_x=7.5; keep sign; separate task and feedback |
| 1A3_2 | Both acquired transformations | Compose projection and origin shift | Zero/negative X and different c_x values reject a hard-coded centre |
| 1A5, 1A5_2 | Arrays and coordinate composition | Crop by hand, then map a whole output grid | Nonzero source origin; varied region sizes |
| 1A6, 1A6_2 | Coordinate grids | Nearest sampling, then circuit | Supplied positions include ties, fractions and out-of-range values |
| 1A7, 1A7_2, 1A7_3 | Nearest sampler and position convention | Row interpolation, four-neighbour combination, circuit | Unequal distances, interior and boundary samples; no claim of recovered detail |
| 1F1 | Projection only; optional | Predict/check full FOV using equal-scale geometry | Both sensor edges and the half-angle; wrong full-height guess fails |
| 2B1, 2B1_2 | Image coordinates and circuit tools | Inspect a moving window, then general weighted sum | Three source factors shown; output grid remains empty; valid-output offset is labelled |
| 2B2, 2B2_2 | Local weighted sum | Keep boundary outputs with zero padding | Window exposes absent neighbours; constant row darkens at the ends |
| 2B3, 2B3_2 | Padded row filter | Trace an impulse and reverse written weights | Asymmetric kernel distinguishes correlation from convolution |
| 2B4_window, 2B4 | Same shared basis as 2B3 | Trace vertical neighbours, then column circuit | Column selection and y movement; non-square and asymmetric input |
| 2B5, 2B5_2 | Both direction routes | Compose written kernels and implement 2D convolution | Unequal row/column weights, zero middle weight and signed rows; both-axis asymmetric hidden case rejects omitted flips |
| 2B6, 2B6_2 | 2D filter | Predict a point spread, then build blur | Point, step and irregular-image tests; boundary caveat in synthesis |
| 2B7, 2B7_2 | 2D filter and direction convention | Signed local differences, then Sobel pair | Positive/negative transitions and both axes; written kernels match actual part semantics |
| 2B8_vectors, 2B8 | Sobel responses | Compare rotations/signs, then build strength part | Equal-length vectors reject signed addition; varied image outputs |
| 2B9 | Both smoothing/change routes | Assemble a colour processor with two outputs | Weighted channels → blur → strength; both out and mag checked |
| 1W1, 1W2, 2W1 | Their theory anchors; optional | Workshop units, shape/crop and channel conventions | Source labels retained; never required by a main route |

## Interaction and visual acceptance

Inspected the implemented local app at its desktop viewport and at 390 × 844. Verified the fresh-game branch
choice, clicked a workbench optical-axis tag, opened the principal-point entry using Return, exercised all three
projection stages with an incorrect and corrected prediction, completed unit conversion, inspected the separate
origin task, moved a filtering window and submitted its hand calculation. The FOV construction was checked at
phone size and its fixed range tightened for legibility. No claim is made about untested devices or measured
learning gains. The browser's testing mode opens later levels for inspection; it is not evidence that prerequisites
work. Required dependencies are checked separately against the actual course graph.

## Automated and migration evidence

- Complete kit suite: 315 tests passed, none failed or cancelled. Targeted vision/terminology checks cover route
  independence, real joins, prediction error, axis-specific pitch, FOV invariance, window samples, aid/answer consistency and save invalidation.
- Every game's content/reference-answer checks pass. The revised trial passes blueprint audit and conformance.
- Pedagogy check: no structural failures or serial-chapter report. Terminology: 48 entries, no registry/reference
  failure. The literal substring “卷积” in the machine name “卷积器” in the overview is a reviewed candidate, not a
  bare mathematical operation or a missing usable definition in a task. No other literal candidates remain.
- Existing ids remain stable; task moves/renames and prerequisite changes have generated save steps. Changed
  puzzle contracts/reference programs drop incompatible stored boards, including the revised 2D/Sobel programs;
  wording changes preserve answers. Existing completion records are retained by the shared migration contract.
- The game builds successfully. Build outputs are local preview artifacts; nothing has been deployed or pushed.

Remaining evidence limit: this is an implemented, reviewed trial. A learner study has not established the right
amount of guidance, puzzle enjoyment or long-term transfer. Those require observing fresh players, not adding
more static rules or treating correct reference answers as proof of understanding.
