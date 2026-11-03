# COMP90086: machines, parts and knowledge coverage

Status: stages 0–2 implemented in Vision Lab, 2026-11-04; later stages remain proposals. See
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

## 3. Course map: a growing workshop of machines

The chapter list is a readable construction route. Prerequisites follow actual parts and knowledge, not every
preceding chapter. Independent machine branches may be available together. The opening chapter contains images
ready to process; understanding camera optics is not required before touching a pixel pipeline.

| Chapter / machine | Main construction ladder | Course knowledge carried by construction and use | Subsequent use |
| --- | --- | --- | --- |
| 0. Image comparison instrument | Image arithmetic -> signed difference -> change evidence -> known spatial alignment -> screening/comparison pipeline | L2 image values, channels and coordinates; necessary pointwise/spatial reasoning; first concrete cases of evidence versus a task output | Image residuals, reconstruction error, local comparisons and controlled tests |
| 1. Neighbourhood processor and scanner | Small weighted line filter -> two-direction composition -> general local kernel -> smoothing -> differences/Sobel -> boundary-aware processing -> scanner responses | L3 locality, weights, convolution/correlation, common filters, support/scale, separability, borders, colour and composition; L5 gradient components/length when the scanner first needs them | Frequency filtering, feature detection, convolutional layers and visual measurements |
| 2. Frequency analyser and interference remover | Basis waves -> frequency probe -> phase-aware response -> spectrum -> gain/filter -> inverse reconstruction | L4 amplitude/frequency/phase, frequency representation, spatial/frequency equivalence, low/high/band-pass effects and artefacts | Scale/frequency diagnosis, image compression experiments and representation of structured interference |
| 3. Light-aware comparison instrument | Reflectance relation -> colour response -> normalised or derivative-based measurements -> same-observation counterexamples | L5 light/material/orientation factors, colour, inverse ambiguity and invariance/equivariance; reuse rather than reteach the gradient | Robust feature evidence, appearance changes and interpretation of model inputs |
| 4. Trainable image classifier | Parameterised filtering -> activation -> pooling -> scores -> loss -> training/evaluation controller | L6–7 parameter sharing, channels, receptive fields, nonlinearities, downsampling, softmax/cross-entropy, optimisation, splits, augmentation and regularisation | Learned backbones, embeddings, reconstruction, segmentation and detection |
| 5. Deeper and cheaper feature extractor | Small-kernel composition -> residual block -> spatial/channel factorisation -> transfer head | L8 receptive field, multi-scale composition, residuals, depthwise/pointwise operations, cost and transfer learning | Encoder blocks, efficient backbones and reuse under a changed data distribution |
| 6. Attention encoder and retrieval system | Patches/embeddings -> Q/K/V -> attention -> positions/residual encoder; pair/similarity objective -> retrieval/zero-shot route | L9–10 inductive bias, attention, position, multi-head composition, contrastive objectives, image/text alignment and representation inspection | Image-token classification, retrieval, segmentation prompts and set prediction |
| 7. Planar object matcher and aligner | Gradient products -> structure tensor/Harris -> aligned descriptor -> candidates/ratio test -> voting/RANSAC -> planar mapping -> resampling/warp | L11–12 local uniqueness, invariance, geometric consensus and outliers; L2 crop/nearest/one-axis/bilinear sampling as the aligner's real needs arise | Stereo candidates, camera geometry, robust fitting and image transformation |
| 8. Stereo/depth measurement system | Projection/camera coordinates -> disparity and matching costs -> search/constraints; homogeneous points/lines -> epipolar restriction -> triangulation | L2 camera projection and view; L13–14 depth ambiguity, window trade-offs, calibration, intrinsics/extrinsics, geometry and degeneracies | Geometric measurements, reconstruction and checks of image evidence |
| 9. Reconstruction and generation workshop | Encoder/decoder -> bottleneck; latent distribution/reparameterisation -> VAE; adversarial roles; noising -> prediction objective -> reverse sampler | L15–17 probability support, reconstruction versus generation, objectives, latent sampling, adversarial balance, realism/diversity and diffusion stages | Reusable generative toy models and conditional reconstruction experiments |
| 10. Region and pixel-label system | Feature grouping -> cluster update -> superpixels/adjacency; dense classifier -> upsampling -> encoder/decoder -> skip paths | L19–20 similarity/bandwidth, clustering, region structure, semantic/instance meaning, FCN, transposed convolution/unpooling, spatial detail and losses | Region proposals, instance outputs and dense prediction |
| 11. Detector and evaluator | Window/proposal -> shared feature extraction -> box adjustment; IoU -> suppression -> one-to-one matching -> precision/recall/AP; grid/set-prediction routes | L21–22 detection architectures, localisation, duplicates, matching, confidence ranking and evaluation protocols | An integrated detection-and-evaluation system; mixed revision diagnostics |

L23 supplies revision checks over the existing machines rather than another algorithm ladder. Its questions can
expose missing coverage, but they do not justify duplicating constructions already mastered.

A large chapter is split when a new machine or abstraction needs its own ladder, not to match a lecture count.
There is no promised total level count. Later chapters above are machine-level proposals; their exact contracts,
source anchors, misconceptions and task boundaries still need specification.

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

| Earned construction | Where it is substantively used |
| --- | --- |
| Image comparison/alignment | Local evidence, reconstruction residuals, objective inspection and controlled tests |
| Weighted line/local-kernel and separable compositions | Smoother, derivative, sharpening, multi-channel kernels, spatial/frequency comparison and efficient filters |
| Smoother and directional/gradient responses | Scanner, light-change comparisons, structure tensor/Harris, descriptors and local measurements |
| Parameterised multi-channel aggregation | Trainable convolution; parameter and derivative exposure is an explicit extension, not an assumed interface |
| Classifier, scores/loss and training controller | Transfer, attention/embedding training, reconstruction, dense prediction and detection |
| Residual/spatial-channel factorisation | Deeper backbone, encoder block and efficient learned modules |
| Attention/encoder and contrastive comparison | Retrieval, image/text scoring when taught, later segmentation/set-prediction routes |
| Corner/descriptor/matcher/robust estimator | Planar alignment, stereo candidates and robust geometric estimation |
| Crop, linear interpolation and bilinear sampler | Aligner warp, image transformations and resampling; introduce no later than the first genuine need and reuse after construction |
| Projection, camera and point/line operations | Stereo, epipolar restriction, calibration and triangulation |
| Region graph, classifier and IoU/matching/metrics | Region proposals and an end-to-end detection/evaluation machine |

Parts are not assumed reusable merely because two algorithms have similar diagrams. Value shapes, parameters,
iteration state and gradients must fit. General traversal, sorting, reduction, random sampling and solving a
linear system can be supplied execution services while the learner constructs the policy or relationship being
repeated. A complete RANSAC/matcher/AP box cannot stand in for that relationship before it has been built.

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
