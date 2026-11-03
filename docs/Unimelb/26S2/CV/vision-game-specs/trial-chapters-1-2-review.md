# Vision Lab Chapters 1–2: theory-led learning review

Reviewed 2026-11-04. The executable trial contains 13 levels and 16 tasks. Sources are COMP90086 lectures 1–3
and lecture 5 gradient material. This is a source/content/interaction review, not a study of novice learning outcomes.
The course contract is [Vision Lab DESIGN](../../../../../games/vision-lab/DESIGN.md).

## Learning sequence and decisions

A shared camera opening precedes two independent required questions: scene ambiguity (1I1), and positions and
image transformations (1A3 → 1A5 → 1A6 → 1A7). Both precede neighbourhood processing. Ambiguity establishes that
processing an image need not recover the actual scene; the transform route supplies images and sampling meaning.
Framing remains optional. Workshop details are reference entries only and have no assessment levels.

Chapter 2 proceeds through local smoothing and its boundary assumption, a perpendicular second pass, asymmetric
kernel orientation, signed directional differences with perpendicular smoothing, vector strength, and a combined
colour processor. This serial sequence is justified by the learner's own row smoother, 2D smoother, directional
responses and strength module, plus the orientation and signal-meaning conventions each extension needs.

| Level/tasks | Guaranteed support | Assessed visual decision | Characteristic failure / transfer |
| --- | --- | --- | --- |
| 1A1 | Lab role, geometric scene, units, formula and controlled examples | Compose projection relationships | Independent changes of X/Z/f, negative and zero X |
| 1I1 | Projection and a stable reference photograph | Construct a different scene with the same observation | A taller object at the same distance changes the photograph |
| 1A3 | Array/coordinate explanation, unit conversion, prewired projection | Translate an axis-relative displacement into an image-origin coordinate | Varied principal point, negative offsets and zero X |
| 1A5 | Prewired output grid and source read, inspectable source values | Map local crop coordinates to original-image coordinates | Nonzero origin, non-square output and RGB source |
| 1A6 | Sampling semantics and distances supplied | Preserve discrete region identity and apply an outside assumption | Bilinear mixes unknown class colours; zero outside invents a black class |
| 1A7 material | Both sampling modes already explained; automatic weighting | Use interpolation according to the meaning of the material | Intensity transitions and class colours at the same coordinates |
| 1A7 region | Own crop and sampling tool | Compose cropping and reading in the correct reference image | Reading original-image coordinates instead of crop-local coordinates; RGB transfer |
| 2B1 weights | Moving weighted-window example, supplied 1:2:1 ratio, computed gain and normalisation | Preserve constant intensity while reducing rapid variation | Unnormalised sums brighten constants; copying does not smooth impulses |
| 2B1 boundary | Same circuit carried over; explicit outside assumptions | Adapt the observation model at unmeasured neighbours | Zero-padding artefact versus constant extension |
| 2B6 | Own row smoother and stencil, outer-product/cost explanation | Cover both image axes | Two horizontal passes leave horizontal stripes; non-square/RGB transfer |
| 2B3 | Own 2D smoother and a written-kernel tool | Distinguish orientation using an asymmetric probe | Correlation differs on an asymmetric impulse although symmetric blur conceals it |
| 2B7 direction | Supplied signed difference weights | Match response meaning to each image axis | Two copies of the same direction miss the perpendicular edge |
| 2B7 Sobel | Difference and smoothing weights supplied | Place smoothing perpendicular to differentiation | Smoothing along the same axis does not implement the intended response |
| 2B8 | Own directional responses and supplied vector-length formula/tool | Measure strength without signed cancellation | Reversed contrast defeats signed addition; both axes remain relevant |
| 2B9 | Colour mixture arithmetic, own smoother and strength module | Compose the intended measurement signal path | Magnitude before smoothing differs because magnitude is nonlinear |

No grid-fill tasks or nearest-integer formula assessments remain. Semantic sampling, neighbourhoods, written
kernels, magnitude and colour mixture are supplied domain tools. Ratios and formulas are accessible guidance;
manual normalisation, indexing, loops and per-channel plumbing are not assessed. Editable starters provide the
technical wiring and must fail until the learner changes the intended decision. A one-operator task is justified
by parameter/material decisions across contrasting cases, not by placing a named answer.

## Verification and limits

Model checks cover interpolation including RGB and outside samples, zero-weight interpolation neighbours,
asymmetric convolution/correlation, neighbourhood direction and boundary assumptions, separable/full-kernel
agreement on non-square RGB images, vector lengths, raw values and colour mixtures. Every reference and hidden
case passes; every declared characteristic wrong program fails. Starters are cloned and do not already pass.
Explanatory failure text is attached only to matching observed outputs.

Browser verification uses WebKit touch emulation at 390 px and 320 px, plus a desktop view. It checks editing the
three compact weight fields, running, carrying the board to the boundary task, observing the specific dark-frame
feedback, changing the outside assumption and passing. A colour-region sampler is changed through the actual
method and boundary controls and passes at 320 px without horizontal page overflow. Result drawers start closed
and open on Run. Compact images and plain component descriptions are preserved.

All 331 kit tests pass, every game builds, the complete content check passes, and the blueprint, levels and copy
gates pass. Terminology inspection has no registry/reference failures or bare-name reports. The browser also
verifies entering ratios 1:2:1, applying unit-sum normalisation and passing without calculating decimal weights.
The optional separate agent-review runner has not been executed; this document records the direct semantic review.

The automated course audit reports a wholly serial second chapter; the dependencies are justified above. Blueprint
reports about practice density require human judgement: practice is within task sequences and changed structural,
sign, material and boundary cases, rather than padded levels with changed numbers. Executable checks and UI
interaction do not establish that a new learner understands the principles, enjoys the puzzles or transfers the
knowledge to coursework. Physical iPhone keyboard and rubber-band behaviour remain unverified.
