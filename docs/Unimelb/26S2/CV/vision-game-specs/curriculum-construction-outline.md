# COMP90086: machines, parts and knowledge coverage

Status: stages 0–2 implemented in Vision Lab, 2026-11-04; later chapters are planned in [the chapter map](chapter-map.md). See
[the executable stage design](../../../../../games/vision-lab/DESIGN.md) and
[the stage review](stages-0-2-review.md) for actual tasks, contracts and verification limits.
Capability labels in this outline are not executable level IDs.

## 1. Priority and planning method

Components and assembly are the core. Plan the machine first, then the capability ladder and reusable parts;
cover as much course knowledge as possible through those constructions, applications, debugging cases and
constraints. Only important knowledge that cannot be meaningfully covered by these mechanisms receives an
additional lesson. The main path is not a lecture sequence with circuit exercises attached.

Planning order:

1. Define a concrete machine the player will make and its observable input/output contract.
2. Work backwards to the capabilities and parts it needs, ending at a small useful primitive vocabulary.
3. Arrange construction -> immediate use -> changed-case debugging -> encapsulation -> larger construction.
4. Map lecture knowledge onto those actions. Improve the test material, parameter exposure, failure feedback or
   construction stages to cover missing facets before adding another level.
5. Move a mechanism to where the machine first needs it. Lecture number records provenance, not play order.
6. Create an extra lesson only for an important residual concept that does not fit the construction path.

A level is worth keeping when the learner must understand a relationship to make a working construction. A
part must earn its place through subsequent use. New pictures or numbers alone are tests. Copying a coordinate,
learning an arithmetic button or choosing a named ready-made answer is not a complete level.

Original lecture PDFs and transcripts establish what the knowledge means. Necessary prerequisites and
scaffolding may be supplied. A novel scanner or retrieval scene can be on the main path when it combines learned
course ideas; an unverified additional scientific claim must not be smuggled in as a required discovery.

## 2. Primitive boundary: assist execution, preserve construction

| Supplied support | Learner-owned construction |
| --- | --- |
| Image/vector arithmetic, constants, numeric evaluation and visual inspection | How information paths are combined to satisfy the visual specification |
| Spatial shift or sample access, coordinate generation, fixed conventions and index/rounding helpers | Neighbour selection, weighted spatial composition and interpolation contributions |
| Pattern duplication, traversal/repetition, normalisation arithmetic and reductions | The rule being repeated, its weights, its assumptions and the composition of rules |
| Basic mathematical functions, linear-system solvers and automatic cost accounting | Fourier projection, geometric relations, robust-estimation policy and efficiency decisions |
| Parameter storage, differentiation, optimiser updates, random draws and training execution | Model structure, objectives, data routing, training/evaluation protocol and sampling process |
| A declared sensor, scene renderer or physical model | A forward model or processing system where that relation is actually constructible |

Do not hand out complete Gaussian/Sobel filters, a bilinear sampler, an attention block, a matcher or an AP
calculator before the player has built the corresponding core. These are earned abstractions. A shift is a
reasonable starting spatial operation; a complete method hiding the assessed decomposition is not a convenience.

Arithmetic evaluation does not need to be hand-written or calculated. Keeping multiplication and addition as
parts is compatible with supplying their numerical results. Provide prerequisites, examples and accessible
formulas; retain a real decomposition or design decision rather than a transcription exercise. Starter wiring
may remove repetition but must not preassemble the target's decisive information path.

A familiar mathematical helper gets a brief explanation where needed, not its own test. A repeated graph pattern
can be cloned after its meaning has been acquired. The learner's actual passed graph is what an earned part runs.
Parameter exposure, gradients, iteration and value shapes must be implemented before promising executable reuse.

## 3. Course map

The chapter list, the per-chapter construction ladders, part run modes and the knowledge coverage audit are in
[the chapter map](chapter-map.md). It supersedes the chapter table and part ledger that this section and section 6
used to hold.

## 4. Opening: a small image machine with an immediate purpose

### Shared introduction

Start in an inspection station with an observed image and a reference. State what a controlled defect means in
this scene and what the requested output represents. Explain image coordinates, channel values and the first
few operations alongside this problem. A camera is an available source of images, not an optics prerequisite.
No isolated coordinate-copying, constant-setting, arithmetic drill or task-name quiz precedes construction.

### Short construction sequence

| Sequence | Construction and observable problem | Knowledge covered | What is supplied / what must remain |
| --- | --- | --- | --- |
| F1. Compare image evidence | Build a reusable per-location comparison that exposes both darker and brighter changes across different images | Values versus locations, corresponding cells/channels, signed difference and magnitude as necessary mathematical support | Arithmetic/absolute-value evaluation; the player still combines observation and reference in the correct roles |
| F2. Compare the same locations | Reuse comparison after correcting a supplied, known spatial displacement | Spatial movement versus brightness change, coordinate direction and correspondence | The shift operation and displacement; do not introduce an image-registration algorithm here |
| F3. A controlled inspection instrument | Compose alignment, comparison and a supplied comparison/threshold primitive to produce the declared change evidence | Image-shaped outputs, composition and the limits of a pixelwise inspection rule | Numeric tolerance and comparison mechanics; no industrial calibration or object-recognition claim |

F1–F3 are a short opening sequence, not a demand for three separately padded levels. Combine simple steps as
tasks and tests when they do not introduce a substantive new facet. Inversion, brightness and contrast examples
are included only where they challenge this construction; they do not each require a separate level.

The inspection problem has controlled images and a known displacement. Variable illumination is a later upgrade
using learned light-invariant measurements, not an unexplained extra requirement at the beginning. Its comparator
is reused for residual/error inspection. No one-use helper is packaged merely to advertise an unlock.

## 5. Neighbourhood machine: the first substantial construction ladder

Begin with a concrete failure of pointwise comparison: local nuisance and broad boundaries cannot be separated
by looking at one reading alone. Establish the controlled signal/nuisance assumptions. The player extends the
existing image machine rather than entering a new worksheet.

| Sequence | Learner-owned construction | Knowledge embedded in construction, use and debugging | Later use |
| --- | --- | --- | --- |
| N1. Combine neighbours | Build a three-sample weighted line filter from spatial reads/shifts and arithmetic | Locality, positional weights, gain and the change from one reading to a neighbourhood; normalisation arithmetic is automatic | Reused along both axes and inside later local methods |
| N2. Compose directions | Reuse the acquired filter structure in perpendicular directions to make a 2D average | Outer-product contributions, direction and the first concrete case of separability; automatic cost shows the saving | A reusable separable composition, later tested with other weights |
| N3. Generalise the local rule | Build a reusable local-kernel structure, with repeated layout assistance rather than nine copies typed by hand | Impulse response, weight placement, written kernel versus neighbourhood convention, convolution/correlation | General kernels for smoothing, derivatives, sharpening, colour and convolutional layers |
| N4. Make a smoother | Use the player's kernel to construct Gaussian/average smoothing, exposing the relevant parameters | Normalisation, point spread, sigma versus support, constant gain and fine-detail loss; Gaussian values/formula are available | Scanner preprocessing, structure tensors and signal conditioning |
| N5. Measure change | Build signed differences, then compose perpendicular smoothing for Sobel; combine components into strength only when needed | Direction, contrast sign, orthogonal smoothing and L5 vector meaning; supplied magnitude arithmetic does not choose the information path | Scanner measurements, later Harris/descriptor evidence and illumination tests |
| N6. Stop inventing border evidence | Extend the player's filter/composition with explicit boundary behaviour and valid/same output domains | Missing neighbours, valid output size, zero/wrap/replicate/reflect assumptions, artificial responses and equivalence limits | Every later spatial operator that reaches an image edge |
| N7. Use the machine in different ways | Reuse the general kernel/composition for sharpening, directional variations and a changed factorable/non-factorable case | Common-filter effects, separability limits, linearity and combined-kernel efficiency | Meaningful practice of the same machine, not a new primitive per filter |
| N8. Extend across channels | Generalise the acquired weighted neighbourhood into spatial-and-channel aggregation | Image shape, channel contributions and the role of multiple kernels; channel storage/looping is supplied | A real prerequisite for a parameterised convolutional layer |
| N9. Build the scanner response pipeline | Compose the player's smoother, directional responses/strength and boundary handling | Scale choices, signal path and the interaction of already learned methods on noise, fine text and broad page boundaries | A concrete chapter payoff; later line fitting and geometry can upgrade the same scanner |

The table describes dependencies and practice facets, not nine mandatory serial levels. N1 is the common basis.
Smoothing, change responses and boundary upgrades can branch after their actual prerequisites. N9 uses only the
branches actually consumed by its reference and transfer cases. Colour aggregation is required course learning,
but it need not be a fake prerequisite of a greyscale scanner; it leads naturally into the learned-network branch.

The Gaussian, Sobel, kernel and separable operators are earned abstractions. Giving them as complete initial
primitives and asking for a mode choice would remove this ladder. Conversely, normalisation fractions, repeated
weight wiring, image traversal and hand-calculated output tables are not the ladder and are assisted.

Kernel convention is exposed by asymmetric impulse material; separability by equivalence plus automatically
accounted cost; boundary assumptions by meaningful image evidence. These are embedded in construction and
practice instead of separate reading-comprehension gates. Compare composed filters over a common valid interior
or an explicitly correct padded/cropped domain; ideal linear identities must not be falsely asserted at edges.

## 6. Cross-chapter part ledger

See [the chapter map](chapter-map.md), sections 3 and 4.

## 7. Knowledge coverage audit and residual lessons

Every course knowledge point receives one of the following planned coverage records. A mention or glossary link
does not establish practice or mastery. Record the actual action, material, misconception and source.

| Coverage route | Use it when | Example |
| --- | --- | --- |
| Build | The idea can be embodied in a reusable relationship or algorithm | Weighted neighbourhood, attention, interpolation or IoU |
| Use | A constructed part can be put into a new meaningful role | Smoothing before a change measurement; crop/sampling inside an aligner |
| Debug/counterexample | A wrong model or assumption becomes visible in a changed case | Padding creates a false boundary; data leakage or duplicate detections changes evaluation |
| Constraint/upgrade | A theoretical property explains why an implementation can be improved | Separable equivalence and cost, parameter sharing, residual identity paths |
| Extra lesson | Important knowledge cannot be meaningfully expressed by the construction path or the available model | A physical focus/depth-of-field experiment after the camera module |
| Reference | Background or implementation detail needs explanation but no substantial practice | File/API conventions, channel storage order, numeric format and interface operation |

Before allocating an extra lesson, try to expose the concept in an existing construction's parameters, input
conditions, failure case or later upgrade. Do not force an arbitrary fact into wiring just to claim coverage, and
do not change meaningful construction into a generic named-operator choice merely to count another point.

Examples of placement decisions:

- Image values/coordinates/channels are acquired while building and inspecting the opening machine. There is no
  preliminary coordinate worksheet.
- Camera projection, intrinsics/extrinsics and field of view belong with the camera/depth machine, where they
  change the actual mapping and search. They do not gate image filtering.
- Forward/inverse ambiguity can be exposed using two constructed forward models yielding the same observation
  in the light or geometry machine. If the required evidence cannot be presented there, create one focused
  extra experiment after its real prerequisite.
- Nearest and bilinear interpolation belong to the first machine that genuinely needs source-image resampling,
  provisionally the planar aligner. The general rule is first need, not a permanently fixed chapter number.
- Aperture/depth of field is a candidate extra physical-model experiment. Its model and explanatory image must
  be adequate; a fact-only quiz or a slider with a green target is insufficient.
- Train/validation/test, regularisation, transfer and robustness should be exercised in the learner's training
  controller and its new-data tests before considering a separate experimental lesson.
- Occlusion/CAM-style computations and attribution checks should extend the player's own model where possible.
  True Grad-CAM needs access to channel-wise feature gradients; a linear toy heatmap is not equivalent.
- References to a lecture, transcript, assignment or Workshop remain explicit. Existing prototype tricks such
  as repeated box smoothing, photometric stereo or a particular sampling puzzle are not automatically required
  course facts. Verify their sources and role; use them only as justified construction support or labelled extensions.

## 8. Evidence, scope and implementation requirements

Sources are the original COMP90086 lecture PDFs/transcripts under `../lecture/` and `../transcript/`. The notes
below navigate those sources, not a claim that all final tasks have been audited:

[L1](../01-introduction.md), [L2](../02-basics.md), [L3](../03-filters.md), [L4](../04-fourier.md),
[L5](../05-image-formation-ii.md), [L6](../06-cnns-i.md), [L7](../07-cnns-ii.md), [L8](../08-cnns-iii.md),
[L9](../09-vit.md), [L10](../10-representations.md), [L11](../11-features.md), [L12](../12-feature-matching.md),
[L13](../13-depth-stereo.md), [L14](../14-two-view-geometry.md), [L15](../15-generation.md), [L16](../16-gans.md),
[L17](../17-diffusion.md), [L19](../19-segmentation-i.md), [L20](../20-segmentation-ii.md),
[L21](../21-object-detection-i.md), [L22](../22-object-detection-ii.md).

Original headings and available learning outcomes were inspected for the complete course in the outline work.
Early source anchors include L2 p5/p22–26 for images, p34–40 for resampling; L3 p6–18 for locality/weights/convention,
p21–35 for common filters/colour/support, p37–40 for properties/separability, p41–45 for borders; and L5 p39–42
for gradient meaning. Page numbers are PDF indices. Later tasks still need exact source and prerequisite audits.

Before implementation:

1. Specify every machine's inputs/outputs, primitive boundary, part graph and actual next use. Draw real branches.
2. Audit course coverage through build/use/debug/constraint records. Identify important unplaced knowledge and
   justify each extra lesson. Do not infer coverage from a title, test pass or diagram.
3. Ensure mobile/desktop interaction exposes original values, contributions and failures at a compact size.
   Provide repeat-layout/calculation assistance and keep result drawers initially closed. Do not hide the
   central relation inside the tool supplied to make a puzzle easier.
4. Verify that saved constructions can be parameterised, iterated, differentiated and traced as later machines
   require. A missing capability is domain work, not a reason to replace construction with instruction text.
5. Validate mathematical cases and characteristic wrong methods, source/prerequisite access, actual interactions
   and fresh-player learning separately. Automated checks cannot establish understanding or enjoyment.

The executable Vision Lab now covers stages 0–2 through its own blueprint, task data and domain implementations.
Later stages remain machine-level proposals and require the source, interface and interaction work listed above.
