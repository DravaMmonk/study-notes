# Vision Lab: construction stages 0–2

## Scope and purpose

The player builds an inspection instrument, a neighbourhood processor/scanner and a frequency analyser. Image
arithmetic and traversal execute automatically; selecting and composing the visual relationships is the puzzle.
The long-term plan is [the machine-first outline](../../docs/Unimelb/26S2/CV/vision-game-specs/curriculum-construction-outline.md).
This specification covers stages 0–2, not later camera, learning or geometry machines.
The [remake chapter map](../../docs/Unimelb/26S2/CV/vision-game-specs/chapter-map.md) governs the
replacement curriculum. This directory is the working entry point until the new chapters 0–2 are ready
for the Vision Complete cutover.

## Chapter 0: inspection station

The main line progresses from reading cells, coordinates and RGB channels to a pointwise negative.
After that, contrast, difference and displacement are independent routes. Contrast preserves values
outside the display range. Difference distinguishes signed change from magnitude before applying a
strict threshold. The unknown-shift task accepts evidence only when the player's input distinguishes
the competing offsets. The three routes join before registration. The final station must report
both the aligned difference and a thresholded mask, including cases with either displacement axis.

The optional outline challenge uses a three-part budget to exploit a binary image's one-sided
boundary. Topic Q first selects a tolerance from noisy calibration cases, then compares two
candidate read offsets by summed absolute error. Its final task applies a threshold after selecting
the offset. No result from this topic unlocks a main-line capability.

## Samples for every task

Every circuit task has an optional, non-judged sample tab, using the same input/output and reference comparison
flow as the smoothing tasks. Samples are distinct from the graded numeric cases. Spatial tasks use shapes,
edge-touching structures, repeatable noise or RGB patches appropriate to their purpose. Frequency tasks use
longer periodic rows, paired coefficient arrays or small non-square 2D signals. Paired images, coefficients,
frequency-index tables, gains and impulse arrays share dimensions and the task's mathematical conventions.
Keep sample sizes bounded for the learner circuits: spatial pictures up to 64 × 64, one-dimensional frequency
signals up to 64 positions and two-dimensional transforms 16 × 12. Samples never alter tests, judging or unlocks.

## Completion explanations

Every circuit task shows a short conceptual explanation and its general mathematical relationship after passing,
including intermediate tasks within a level. Explain symbols, what the relationship measures and one relevant
limit; do not retell the reference wiring. Blank lines separate formula and explanation paragraphs in pass text. Formulas use LaTeX display delimiters
and KaTeX mathematical fonts, with explicit multi-line layout for long relationships on phones.
Chinese and English carry the same meaning. Keep definitions in the linked encyclopedia entries.

Frequency explanations follow the implemented negative-exponent forward transform with 1/N normalisation
(and 1/(WH) in 2D), with unnormalised inverse sums. Two quadrature coefficients aggregate all N samples; they
are not two raw sample points. For an isolated integer-bin sinusoid away from DC and Nyquist, re=(A/2)cos φ,
im=(A/2)sin φ and A=2|C|. At zero amplitude phase is undefined; DC/Nyquist are degenerate real bins. Complete
periods and matching sample frequencies are the orthogonality conditions; unknown frequency still needs a scan.
Convolution-theorem explanations retain the factor N required by this forward normalisation.

## Encyclopedia presentation

The encyclopedia groups terms by the chapter of their unlock level, in course order. Chapter headings
come from the level map.

Chinese encyclopedia entry names include their existing English titles in parentheses, in the entry list,
article headings and related-entry chips. English names and inline term references remain unchanged.
This content pack enables the shared glossary presentation option; other games do not opt in.

## Primitive and reuse contracts

Images are immutable floating-point scalar/RGB arrays. Inspection keeps original signed values; display clipping
never changes computations. Spatial reads use output(x,y)=input(x+dx,y+dy) for an offset vector d=(dx,dy); x grows right and y grows down.
An offset and the valid-interior radii are each one supplied integer vector, not separate x and y inputs.
Known offsets are supplied data, not estimated registration. Comparisons are controlled defect evidence, not
claims of general recognition. Thresholds are given; no arithmetic-fill or slider assessment is used.

The constant preset can produce a scalar, a two-dimensional direction, or a row of three or five weights.
The card shows the numeric fields for its selected type and exposes one output. Fixed directions in the
introductory neighbourhood tasks come from editable constant nodes. The multiply-budget task introduces
five-weight rows, which players can transpose into columns. Sobel introduces three-weight constants for
its perpendicular smoothing. Measured alignment offsets remain variable inputs.

The weighted-line preset receives an image, one three-element weight vector [first, centre, last] and an
integer direction vector d. It reads at -d, zero and +d, retains signed values and channels, and applies the chosen
border rule without normalising weights. The weight vector is carried as one single-channel row, using the existing
numeric-array representation and one wire. It executes domain code, never a saved learner circuit. The introductory
horizontal and vertical tasks explain the weighted sum without building a reusable component; the preset is introduced
in the vertical transfer task before the processing routes diverge. Run modes follow the handbook's final-use rule (`../DESIGN.md`, chapter
hard rules); the per-part decisions are in the [chapter map](../../docs/Unimelb/26S2/CV/vision-game-specs/chapter-map.md).
All spatial neighbour reads use the single shift primitive; horizontal reads use d=(1,0) and vertical reads use d=(0,1).
A general correlation is built by multiplying a window table by its weights, summing and restoring shape;
the table supplies traversal, not a weighted sum. Convolution reverses the written kernel before correlation.
Parameterised border rules propagate through the player’s actual circuit. Zero, clamp, wrap and reflect
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

Chapter 0 opens on the inspection station. Players derive signed and absolute comparison, use the
preset absolute comparator after alignment, then extend the alignment board with a strict threshold.
Later tasks reuse the absolute comparator for residual and reconstruction checks.

Chapter 1 opens with an editable blur probe. The player submits an input and a conclusion about support
and gain. Evidence must distinguish the selected explanation from every alternative under the same
border rule. The weighted-line construction and vertical transfer follow. Levels 1-2 through 1-4
build the dense processor from window expansion, elementwise multiplication, reduction and restoration,
then add kernel reversal and explicit border policies. The reflected full-size board in 1-4 publishes
the dense revision, with its border policy exposed on the card. Valid output remains a separate crop.

Level 1-5 builds the separable form from two consecutive one-dimensional convolutions. The resulting
part has two selectable forms. Dense takes an image and a written kernel, while Separable takes an
image, a horizontal weight row and a vertical weight column. Each form executes and opens its own
passed circuit. Both forward the chosen outside policy. The final task of 1-5 compares the measured
multiply costs on a box, a Gaussian and a Laplacian under a 29-products-per-pixel budget.

Smoothing and detail enhancement in 1-6 form one branch. Signed responses and Sobel in 1-7 and 1-8
form the other. These tasks call the processor. The grayscale scanner in 1-9 starts from the Sobel
board, adds Gaussian preprocessing and outputs response strength and a strict threshold mask.
The noisy paper sample lets the player inspect detail lost in preprocessing.

Chapter 2 starts by comparing the spectra of two grids with different spatial periods. The wave,
single-frequency projection and quadrature probe lead to a row spectrum and phase-preserving
synthesis. The row spectrum displays the same magnitudes in array order and with zero frequency
centred. Complex row transforms and transposition compose into 2D analysis and synthesis. Circular
spatial convolution uses the dense processor in both the convolution theorem comparison and the
interference remover. The final board compares spatial smoothing, row filtering and 2D filtering
on the same sample.

## Guidance and interaction

Show the failure or the material evidence before asking for a circuit decision. Boundary tasks
show distinct edge traces, and a single separable board is tested under every outside policy.
The budget task supplies full kernels so the learner must find the factors. Directional tasks
use ramps and noisy edges as evidence, and the scanner tests the chosen Gaussian scale against
both false marks and missing edges. The frequency chapter opens with a controlled spectrum
experiment before wave construction. Two-dimensional synthesis composes inverse row passes.

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

The first weighting task groups first, centre and last on one source. Subsequent tasks and presets use one three-element weight-vector input. Numeric image previews use up to two decimal places
and smaller text; inspection exposes full precision. Small component matrices show every row without clipping.

## Capability introduction ledger

Components and enumerated settings open at task boundaries through `adds` and `configurations`. The latter
maps `part.setting` to introduced values; `*.outside` records a shared boundary assumption. Only prerequisite
routes and completed earlier tasks in the current level supply capabilities. The current task opens what it
introduces, including all-unlocked review. Defaults, restored boards, selectors and headless play share this policy.

| Construction | Prerequisite task | Combined task | Newly available capability |
| --- | --- | --- | --- |
| Replaceable local kernel | Inspect per-position weighted contributions | Sum and restore a local result | Window unfolding first; row sum and shape restoration next |
| Dense and separable forms | Build full-size convolution and its boundary rules | Compare three filters under a multiply budget | Two saved implementations of the spatial processor, and five-weight constants |
| Detail enhancement | Preserve constant edges under replication; separate the signed removed detail | Smooth/detail enhancement | Signed residual before enhancement |
| Frequency wave | Shift one cycle without changing its spacing | Add variable cycles per row | Cosine and phase before frequency control |
| Stable gradient | Measure the length of raw signed directional responses | Perpendicular smoothing and strength | Magnitude before Sobel composition |
| Row spectrum | Scan the earned probe into one coefficient column | Restore all three coefficient channels | Repeated rows and frequency indices before full spectrum assembly |
| Magnitude/phase exchange | Rescale coefficient pairs without changing direction | Exchange sources and reconstruct | Safe division and length control before image-level synthesis |
| Two-dimensional spectrum | Apply the row machine to columns and restore orientation | Compose both spatial directions | Reuse the transpose introduced for separable weight columns |

Arithmetic starts with subtraction, adds addition/multiplication for spatial weights, and introduces division
when coefficient rescaling needs it. Row reduction starts with sum and adds mean for the normalised projection.
The size component first appears at frequency/spatial normalisation. Scalar constants and row-position services reuse established arithmetic and normalised-position knowledge.

### Completion explanation verification

All 40 task completions (26 final and 14 intermediate) have Chinese and English formula explanations.
The operation-set checks pass with no changes to puzzles, tests, starters, reference solutions or unlocks.
The quadrature amplitude/sign identities were checked independently on 204 combinations of row length,
frequency, amplitude and phase, excluding degenerate bins. Browser review covers the intermediate smoothing
completion and full quadrature completion on phones, with formula paragraphs and no horizontal overflow;
the longer quadrature explanation scrolls and retains reachable actions. Desktop layout is also reviewed.
The transform sign convention was cross-checked against the [FFTW DFT definition](https://www.fftw.org/doc/The-1d-Discrete-Fourier-Transform-_0028DFT_0029.html);
FFTW leaves both transforms unnormalised, whereas this game deliberately assigns 1/N to forward analysis.

Completion formulas use LaTeX rather than code spans. All 116 bilingual expressions in the completion texts
and linked frequency explanations compile with the installed KaTeX version under strict error checking.
429 tests pass, including inline/display delimiter parsing, literal code spans and malformed-fence rejection.
Phone review at 390 px confirms quadrature, 2D-transform and convolution-theorem formulas fit the dialog;
desktop review confirms mathematical fonts, successful font loading and no runtime errors. The renderer and
its fonts are loaded only when mathematical markup is shown, following the [KaTeX rendering API](https://katex.org/docs/api).

### Sample verification

All 40 circuit tasks now supply samples, including the three existing smoothing samples. The 37 additions
leave graded tests, hidden cases, reference circuits and unlock rules unchanged. Operation-set validation checks
every reference output; a separate audit verifies all sample outputs are finite. On this machine, the reference
runs for all samples totalled about 90 ms, with the 2D final task the slowest at 27 ms (excluding rendering).
The earlier browser review covered RGB scanning before the grayscale rebuild, as well as 1D gain filtering and the 16 × 12 final 2D sample on a phone; switching to
that phone sample took about 128 ms in this session. These are local measurements, not device-wide guarantees.
The reference 2D circuit shows all sample outputs without unconnected terminals. The shared regression suite
passes 432 tests, and the Vision Lab production build passes.
