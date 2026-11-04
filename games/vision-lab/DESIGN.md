# Vision Lab: construction stages 0–2

## Scope and purpose

The player builds an inspection instrument, a neighbourhood processor/scanner and a frequency analyser. Image
arithmetic and traversal execute automatically; selecting and composing the visual relationships is the puzzle.
The long-term plan is [the machine-first outline](../../docs/Unimelb/26S2/CV/vision-game-specs/curriculum-construction-outline.md).
This specification covers stages 0–2, not later camera, learning or geometry machines.

## Primitive and reuse contracts

Images are immutable floating-point scalar/RGB arrays. Inspection keeps original signed values; display clipping
never changes computations. Spatial reads use output(x,y)=input(x+dx,y+dy) for an offset vector d=(dx,dy); x grows right and y grows down.
An offset and the valid-interior radii are each one supplied integer vector, not separate x and y inputs.
Known offsets are supplied data, not estimated registration. Comparisons are controlled defect evidence, not
claims of general recognition. Thresholds are given; no arithmetic-fill or slider assessment is used.

The weighted-line preset receives an image, one three-element weight vector [first, centre, last] and an
integer direction vector d. It reads at -d, zero and +d, retains signed values and channels, and applies the chosen
border rule without normalising weights. The weight vector is carried as one single-channel row, using the existing
numeric-array representation and one wire. It executes domain code, never a saved learner circuit. The introductory
horizontal and vertical tasks explain the weighted sum without building a reusable component; the preset is introduced
in the vertical transfer task before the processing routes diverge. Only assembled components with substantively different passing implementations
and resulting complexity or execution-cost tradeoffs should retain learner circuits. Wiring order alone is not such a choice.
All spatial neighbour reads use the single shift primitive; horizontal reads use d=(1,0) and vertical reads use d=(0,1).
A general correlation is built by multiplying a window table by its weights, summing and restoring shape;
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
remain visible. Presets execute their domain implementation; assembled components execute the learner circuit.

## Course dependency graph

Stage 0 has a shared inspection-station introduction before any branch: signed/absolute comparison -> known-offset
comparison -> a controlled inspection pipeline. Simple facets are tasks, not padded levels. Its comparator is
reused in smoothing residuals and reconstruction checks.

Stage 1 opens with horizontal three-sample reasoning followed by vertical transfer on the same graph, then
three independent routes. All routes therefore have both directions before reusing the line:

- Direction/composition: two-axis separable processing -> smoothing with replicated edges -> signed removed detail
  -> detail enhancement with given Gaussian weights.
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

The workbench retains compact input groups, touch/hover pixel inspection, moving wires, and on a phone the results
below the board. Frequency rows use numeric cell views; complex coefficients retain real and imaginary data. Small images and
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

Inspected images use the domain's fixed display window with its overview and information views; information
shows original values and coordinates, with touch/hover inspection for full precision. No line plot is used.
Small board previews are bounded numeric grids.
Phone numeric fields use an in-app keypad with signed decimals, fractions, exponent notation, erase, cancel and
explicit commit. Incomplete or nonfinite values cannot be committed and the system keyboard is not summoned.

## Mobile information hierarchy

The circuit remains the primary workspace. Task text, the tray and result panels use compact spacing while ports
and actions retain usable touch targets. Image outputs use one selected output at a time; scalar-only outputs
share a compact comparison table. Current and target always remain visible side by side, including mixed scalar/image values; a missing result is
a note on the target, not an empty frame. Image windows share the row equally, so the pair never wraps or hides
one value behind a switch. Numeric cells start at 36 px (56 px for RGB), expanding for longer values.
Image dimensions appear once per comparison when the shapes match; scalar labels and values share one line.
Marked mismatches and
pixel inspection supply both original values and their difference; inputs are not
repeated in the results, the board's input cards hold them. Image captions carry a meaningful name once, with size/channel metadata
on the same line. Avoid generic reading labels, repeated headings and explanatory copy where layout or controls
already establish the relationship. Component detail sheets show outputs and settings, with the description under the title, unfolded; input values are not repeated.

Neighbourhood weights in the first two filtering tasks share one three-output source (first, centre, last),
while packed components retain separate weight inputs. Numeric image previews use up to two decimal places
and smaller text; inspection exposes full precision. Small component matrices show every row without clipping.

## Capability introduction ledger

Components and enumerated settings open at task boundaries through `adds` and `configurations`. The latter
maps `part.setting` to introduced values; `*.outside` records a shared boundary assumption. Only prerequisite
routes and completed earlier tasks in the current level supply capabilities. The current task opens what it
introduces, including all-unlocked review. Defaults, restored boards, selectors and headless play share this policy.

| Construction | Prerequisite task | Combined task | Newly available capability |
| --- | --- | --- | --- |
| Replaceable local kernel | Inspect per-position weighted contributions | Sum and restore a local result | Window unfolding first; row sum and shape restoration next |
| Detail enhancement | Preserve constant edges under replication; separate the signed removed detail | Smooth/detail enhancement | Boundary assumption, then the signed residual, before enhancement |
| Frequency wave | Shift one cycle without changing its spacing | Add variable cycles per row | Cosine and phase before frequency control |
| Stable gradient | Measure the length of raw signed directional responses | Perpendicular smoothing and strength | Magnitude before Sobel composition |
| Row spectrum | Scan the earned probe into one coefficient column | Restore all three coefficient channels | Repeated rows and frequency indices before full spectrum assembly |
| Magnitude/phase exchange | Rescale coefficient pairs without changing direction | Exchange sources and reconstruct | Safe division and length control before image-level synthesis |
| Two-dimensional spectrum | Apply the row machine to columns and restore orientation | Compose both spatial directions | Transpose through a real column-transform task |

Arithmetic starts with subtraction, adds addition/multiplication for spatial weights, and introduces division
when coefficient rescaling needs it. Row reduction starts with sum and adds mean for the normalised projection.
The size component first appears at frequency/spatial normalisation. Simple scalar constants, channel selectors
and row-position services reuse established arithmetic, RGB and normalised-position knowledge; they receive
concise task guidance rather than unrelated tool exercises.
