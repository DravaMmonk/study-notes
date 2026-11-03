# Vision Lab: construction stages 0–2

## Scope and purpose

The player builds an inspection instrument, a neighbourhood processor/scanner and a frequency analyser. Image
arithmetic and traversal execute automatically; selecting and composing the visual relationships is the puzzle.
The long-term plan is [the machine-first outline](../../docs/Unimelb/26S2/CV/vision-game-specs/curriculum-construction-outline.md).
This specification covers stages 0–2, not later camera, learning or geometry machines.

## Primitive and reuse contracts

Images are immutable floating-point scalar/RGB arrays. Inspection keeps original signed values; display clipping
never changes computations. Spatial reads use output(x,y)=input(x+dx,y+dy); x grows right and y grows down.
Known offsets are supplied data, not estimated registration. Comparisons are controlled defect evidence, not
claims of general recognition. Thresholds are given; no arithmetic-fill or slider assessment is used.

A weighted line is built from shifts, multiplication and addition. A separable filter reuses that line along both
axes through an exposed axis parameter. A general correlation is built by multiplying a window table by its weights, summing and restoring shape;
the table supplies traversal, not a weighted sum. Convolution reverses the written kernel before correlation.
Parameterised border rules propagate through the player's actual nested graph. Zero, clamp, wrap and reflect
are explicit assumptions; a valid interior is a separate cropped output. Reflection includes the edge sample.

Frequency construction uses cosine in turns, per-row means/sums, transpose and coordinate/repetition helpers.
No FFT/DFT primitive is supplied. The player's wave feeds a projection, quadrature probe, row spectrum, inverse
and complex row transform. Two-dimensional analysis reuses row transforms and transposes. Forward coefficients
are divided by the row length; inverse synthesis is a sum. Frequencies use unshifted array order, with k and N-k
paired for real signals. Numerical products, sums, phase and amplitude are computed, not handwritten.

The engine's packed parts execute the player's passed circuits. Built parts that expose `outside` forward only
that declared setting to their internal spatial reads. Input contracts, including weights and complex components,
remain visible. There are no separate built-in implementations of earned methods.

## Course dependency graph

Stage 0 has a shared inspection-station introduction before any branch: signed/absolute comparison -> known-offset
comparison -> a controlled inspection pipeline. Simple facets are tasks, not padded levels. Its comparator is
reused in smoothing residuals and reconstruction checks.

Stage 1 opens with a weighted three-sample construction, then three independent routes:

- Direction/composition: two-axis separable processing -> smoothing/detail enhancement with given Gaussian weights.
- Local kernels: general correlation -> convolution orientation -> boundary/valid-domain upgrade -> signed spatial
  derivatives -> Sobel and gradient strength.
- Channels: construct a channel-weighted measurement from RGB samples.

The scanner joins these routes because it consumes all three constructions. Kernel/convolution and boundary
materials include asymmetric impulses, constants, unequal dimensions, narrow images and meaningful failure cases.
The scanner is a controlled response pipeline, not an implementation of document detection or perspective correction.

Stage 2 opens by constructing a wave, then a single-frequency projection and a quadrature probe. From that basis,
analysis/synthesis and phase/measurement facets are practiced before the final interference-removal machine:
row spectrum -> inverse synthesis -> phase-preserving filtering; complex row transforms -> 2D transform using two
axis passes. Frequency masks are given scientific specifications with selectable contributions, not green-target
sliders. Low/high/band effects, conjugate pairs, phase loss and ringing are tested through actual reconstructed
images. Circular spatial convolution is compared only with the corresponding periodic frequency computation. The final
machine consumes the row-frequency branch as a one-axis comparison, the 2D branch for reconstruction, and the
earlier convolver as a spatial baseline. Vertical variation appearing as per-row DC exposes the row-only limit.
Sampling/Nyquist and image compression are not silently claimed as audited L4 requirements.

## Guidance and interaction

Each chapter begins in a concrete apparatus with its purpose, input evidence, output meaning and available tools.
Intro figures use independent material, never the target circuit. Every task states its conventions and necessary
mathematical support before use, gives observation-first hints, and includes a characteristic wrong graph with a
specific explanation. Repeated layout is supplied in incomplete editable starters; they never complete the decisive
signal path. Changed cases include signed values, colour, rectangular images, phases, frequencies and boundaries.

The workbench retains compact input groups, touch/hover pixel inspection, moving wires and a closed initial result
drawer. Frequency rows use numeric cell views; complex coefficients retain real and imaginary data. Small images and
window tables can be inspected without expanding every numeric value. Desktop and phone must be checked in the
actual browser; headless reference checks do not establish usability or novice understanding.

## Sources and acceptance

L2 original PDF image arrays/value representation; L3 locality, convolution/correlation, common filters,
separability, colour and borders; L4 waves, complex magnitude/phase, image spectra, convolution theorem,
frequency filtering and ringing; L5 gradient components/length. Source anchors and assessed facets are recorded
in the blueprint and the stage coverage review. Task conventions and controlled application assumptions are
identified separately from lecture facts.

Acceptance: domain mathematical tests against independent reference calculations; every solution and hidden case;
characteristic wrong circuits; packed reuse with a changed passed circuit; blueprint/content conformance; source
and prerequisite review; real desktop/phone interaction and screenshots. No claim of measured learning outcomes
is made. Later whole-course machinery remains a proposal.

Current coverage and release checks: [stage review](../../docs/Unimelb/26S2/CV/vision-game-specs/stages-0-2-review.md).

## Task-scoped tools and numeric interaction

Parts are introduced by the task that first needs them; level-level inventory is the union used by the map and
audit. A current task sees only its own and preceding introductions. The components book uses stable task keys
to gate primitives. Absolute value starts with the second comparison task. Arithmetic is one configurable
add/subtract/multiply/divide component. A one-time node migration preserves IDs, wires, settings, boards and slots;
old arithmetic types are not offered by this curriculum.

Outside-value settings are introduced with independent numeric examples before use. Zero extension starts at
known-offset comparison; replicate extension starts on both independent branches that first need it; periodic
and edge-inclusive reflection have their own boundary tasks. Unintroduced choices stay locked. Valid interior
has a separate introduction and changes the output domain, rather than pretending to be a padding rule.

Images have one numeric cell view, including original values and coordinates, with touch/hover inspection for
full precision. No line plot or picture/numbers toggle is used. Small board previews are bounded numeric grids.
Phone numeric fields use an in-app keypad with signed decimals, fractions, exponent notation, erase, cancel and
explicit commit. Incomplete or nonfinite values cannot be committed and the system keyboard is not summoned.
