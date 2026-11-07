# Vision Lab chapter 1 rebuild and chapter 2 migration

Status: implementation specification for the first rebuild milestone. The playable course still uses the
existing [stage design](../../../../../games/vision-lab/DESIGN.md). The
[chapter map](chapter-map.md) sets the teaching sequence and the runtime policy. Lecture references below
use the local PDF page order and must be confirmed against the PDFs, which are not committed. The machine
scenarios, test values and acceptance rules are design fixtures.

## Target and sequence

A learner investigates a blur, builds a spatial processor, adds an efficient form for kernels that factor,
and uses it to find the boundary of a noisy grayscale scan. Old 1-9 leaves this chapter; trainable channel
aggregation belongs to chapter 4. Resolve every reference to the retired lesson and its part in the content
operation that removes it.

Level IDs follow play order. Saves are not migrated during development, so the renumbering has no player cost:

| New | Old | Lesson | Processor |
| --- | --- | --- | --- |
| 1-1 | 1-1 | Probe a blur, then weight neighbours | — |
| 1-2 | 1-3 | General weighted kernel | publishes the dense form |
| 1-3 | 1-4 | Convolution direction | upgrades the dense form |
| 1-4 | 1-6 | Finite boundaries | upgrades the dense form |
| 1-5 | 1-2 | Two passes when the kernel factors | adds the separable form |
| 1-6 | 1-5 | Smooth and enhance | calls |
| 1-7 | 1-7 | Signed directional response | calls |
| 1-8 | 1-8 | Sobel and response strength | calls |
| 1-9 | 1-10 | Grayscale scan | calls |

The renames form a cycle (1-2 → 1-5 → 1-6 → 1-4 → 1-3 → 1-2). Remove old 1-9 first, then apply the renames
through temporary IDs in one changeset. Task IDs (`v1_*`) are already distinct and keep their values.

Chapter layout: `1-1 → 1-2 → 1-3 → 1-4 → 1-5`, then a parallel group with the smoothing route `[1-6]` and the
response route `[1-7, 1-8]`, joining at `1-9`. Neither route uses the other's results; the scanner uses both.

Only 1-2 to 1-5 publish the spatial processor. 1-6 to 1-9 are application boards that call it. Remove
`builds` from old 1-7, 1-8 and 1-10, which currently publish processor revisions. The scanner's threshold and
response outputs belong to the scanner level. Chapter 2 calls the dense form.

## Level specifications

In the table, a starter gives tools, supplied signals and reusable context. The reference board and
the rejected approaches belong to the level checks. The player sees causal feedback from the rejected
approach, with the general formula in the completion text and linked encyclopedia.

| Level and decision | Starter and player action | Pass evidence and counterexample | Source |
| --- | --- | --- | --- |
| **1-1 · Probe a blur, then weight neighbours**. Which input reveals where the output comes from? | Add the opening probe below, then keep the current signed three-point construction and vertical transfer. The probe supplies no reusable part or board to the construction tasks. | Probe: the evidence predicate below. Construction: a displaced impulse, a constant with non-unit weight sum and a vertical case. A circuit using only the centre passes some constant examples and fails the impulse. | L3 pp. 9–18, 24–28. |
| **1-2 · General weighted kernel**. How does one neighbourhood become one output? | Supply window expansion, the written kernel and shape restoration. The player connects the contribution and reduction paths, then generalises across the image. Publish the dense form. | Distinct 3×3 and 5×3 kernels on a non-square image, a signed kernel and a kernel whose sum differs from one. An extra mean or a transposed result fails. | L3 pp. 9–18, 32. |
| **1-3 · Convolution direction**. What changes when the kernel is reversed? | Carry 1-2. Provide an asymmetric kernel and an off-centre impulse. The player adds the reversal required for mathematical convolution. | Exact orientation and origin, including a rectangular odd kernel. A symmetric Gaussian is an equivalence control. A direct correlation answer fails the asymmetric case. | L3 pp. 17–18. |
| **1-4 · Finite boundaries**. Where can the circuit read at the edges? | Carry 1-3. Reuse the current boundary tasks and expose the shared zero, clamp, wrap and reflect setting through the processor. Keep valid output as an explicit interior crop. | A radius-two kernel distinguishes clamp from reflection including the edge; an asymmetric edge signal distinguishes wrap from zero. Exact valid crop and dimensions. A constant interior alone cannot distinguish the policies. | L3 pp. 41–45. |
| **1-5 · Two passes when the kernel factors**. When can the same operator use fewer products? | Task 1: build the separable form from the same window, multiply, reduce and restore parts, applied with a 1×kx window and then a ky×1 window. The dense form is on the board for comparison on the same input. Task 2: an application board with three kernels, a multiply budget and the processor in both forms. The player decides per kernel which form to use and, for a factorable kernel, writes its two factors as constants. | Task 1: outputs equal the dense form for 3×3, 5×5 and 5×3 outer products with unequal and signed factors, a zero factor, and each boundary rule. Summing two one-axis results, or applying ky along x, fails. Task 2: a 5×5 box, a 5×5 Gaussian and a 3×3 Laplacian (rank two), with the budget at the minimum 29·W·H products (10 + 10 + 9). Dense everywhere (59·W·H) exceeds it; a separable attempt on the Laplacian gives a wrong output, and writing it as a sum of two separable passes (12·W·H) is correct but over budget. | L3 pp. 38–40. |
| **1-6 · Smooth and enhance**. Which signal was removed by smoothing? | Give the processor, one-dimensional Gaussian weights, a noisy grayscale image and a gain input. Reuse the three existing tasks on smoothing, residual and enhancement. | A constant, a bright and a dark impulse, and gain zero. Outputs are the smoothed image, signed detail, enhanced image and absolute change, as applicable per task. Using absolute detail in enhancement fails the dark case. | L3 pp. 26–28, 32, 35. |
| **1-7 · Signed directional response**. Which direction and sign describe an edge? | Give the processor, horizontal and vertical difference kernels, and a non-square ramp. The player builds both response paths in one application circuit. | Horizontal and vertical ramps and reversed contrast. Using the same kernel for both directions or discarding the sign fails. | L3 pp. 29–30 and L5 pp. 39–42. |
| **1-8 · Sobel and response strength**. What does perpendicular smoothing add? | Carry the 1-7 board. Provide smoothing weights. The player adds perpendicular smoothing to each response, which makes each Sobel response the separable form with a difference factor along one axis and a smoothing factor along the other, then combines the two into a magnitude. | Axis-specific edge fixtures, contrast reversal and a noisy step: numeric response, sign and joint magnitude. Summing signed responses or smoothing along the derivative axis fails. | L3 pp. 29–30 and L5 pp. 39–42. |
| **1-9 · Grayscale scan**. How do preprocessing and a threshold interact? | Start from the 1-8 board. Supply a grayscale scan with noise, fine text and a paper edge, Gaussian weights and a threshold. The player connects preprocessing, response magnitude and the threshold mask. | Clean and noisy edges, an edge touching the boundary and a value equal to the threshold. Expect the response and a strict-exceedance mask. Keep a non-judged scan sample that reveals detail loss. | L3 pp. 26–30, 41–45 and L5 pp. 39–42. The scan and threshold are application design. |

### Opening probe contract

- The local blur is a 3×3 box with unit sum. It accepts the learner's editable array and shows the output as
  image and numeric values. Provide reset and optional example inputs. Keep submitted evidence separate from
  the current edit.
- Two independently judged questions. Support: the candidates are 1×3, 3×1 and 3×3 boxes, all with unit DC
  gain. Gain: the candidates share the true support and differ in their sums. The learner selects or
  constructs an input, runs it, and identifies the supported conclusion.
- Compute every candidate's output on the submitted input with the same boundary rule. The evidence is
  sufficient when the observed output differs from each wrong candidate beyond tolerance on the inspection
  domain. A flat input cannot separate the support candidates; an all-zero input cannot separate the gain
  candidates. Any input meeting the predicate passes: an impulse reveals both support and gain (the output
  sums to the kernel sum), and a flat interior patch reveals gain directly. The completion text names both.
- The learner first sees the ordinary output. The neighbour-contribution display is available for inspecting
  the explanation and reappears with the learner circuit in 1-2. The black box stays scoped to the probe.
- The existing choice tasks judge supplied observations, and the existing sample tab is ungraded. Implement
  the editable probe and its evidence predicate as a small vision-domain task capability before authoring
  the opening content. Use the shared image editor/display where the supported controls fit. Supply reference
  and insufficient-evidence cases to the domain check. The phase succeeds when a learner can run and submit
  their own input on both desktop and phone.

## Final processor contract

- One part, two forms, chosen on the card (`engine/forms.js`). Only the selected form's passed board runs.

  | Form | Ports | Built in | Accepts |
  | --- | --- | --- | --- |
  | Dense | `image`, `kernel` → `out` | 1-2, upgraded in 1-3 and 1-4 | any nonempty kernel, odd in each dimension |
  | Separable | `image`, `kx` (1×kx row), `ky` (ky×1 column) → `out` | 1-5 | any two odd factors |

  The separable form applies `kx` horizontally and then `ky` vertically; its result equals the dense form on
  the outer product `ky·kx`. Deciding whether a kernel factors, and writing the factors, is the caller's
  decision. No adapter factors kernels at run time.
- All inputs are real single-channel grids. Convolution uses centred written coordinates and reads
  `image(x-u,y-v)` for a coefficient at offset `(u,v)`. Values stay signed and unclipped.
- `outside` is forwarded to the actual reads of the selected form. Supported values are zero, clamp, wrap and
  reflection including the edge. Each rule maps coordinates per axis, so the two forms agree under all four.
  The output is the same size as the input; applications that want valid output crop explicitly by the
  kernel radii.
- Cost is the multiply count measured on the executed board, shown with output dimensions and the form. On a
  W×H image the expected counts are W·H·kx·ky (dense) and W·H·(kx+ky) (separable). A learner board may count
  fewer, for example by eliding zero terms; the display reports the measurement, not the formula.

Domain capability, prototyped before 1-5 is authored: a learner-built part whose forms each run their own
passed board, with forms gained along the course (`revisions` with `by` and `forms`). The logic domain does
this for De Morgan's forms; the vision domain does not yet. The prototype must show that a board calls the
selected form only, that its cost counts that form only, and that detail and Edit open the board of the
selected form.

## Chapter 2 interface migration

| Consumer | Migration | Acceptance |
| --- | --- | --- |
| **2-1 opening** | Add a read-only spectrum view for a controlled image and a comparison image with a changed grid frequency. Preserve the wave construction tasks. | A learner can locate the bright pair for the grid and observe it move when the period changes. The view is not a component or an unlock. |
| **2-4 · v2_spectrum** | Show the learner's row spectrum in two result rows: numbers in array order and the shared spectrum view, which centres the zero frequency. | The same values appear in both rows, so the pairing of k with N−k and the centring are visible without a label. |
| **2-11 · Compare spatial and frequency paths** | Replace both `convolve[outside=wrap]` calls in the reference with the processor's dense form. Keep the impulse-response path so it inherits the same origin and border rules as the spatial path. Migrate starter, rejected board, introduction, hint, availability declarations and sample together. | With forward normalization 1/N and an unnormalized inverse, frequency coefficients use N times the spectral product. Check a non-symmetric signed kernel, a constant and a border impulse. A zero-padded spatial path and a missing N factor each fail. |
| **2-13 · Remove interference** | Replace the local smoothing baseline with the processor under periodic boundaries. Preserve the row and 2D frequency paths and matched gain shapes. | Check all four outputs on a non-square image. Row filtering leaves a component constant along each row but varying between rows. The 2D mask suppresses it while the spatial baseline remains separately inspectable. |
| **Shared cleanup** | Audit all direct `convolve` and `separable3` references, including part catalog, configurations, examples and reference boards. Retire both presets in the changeset that migrates their last consumers; `weightedLine` stays for 1-1. | Content checks resolve every part and configuration. Chapter 2 calls the last passed dense form on its dependency path. Inspect both the saved-player and supplied-reference execution paths. |

For a small independent 2-11 oracle, use row `[1,2,4,8]` and written kernel `[2,-1,3]`.
The periodic spatial result is `[27,9,18,6]`, and its unit impulse response is `[-1,3,0,2]`.
The three graded outputs remain spatial, frequency and error. The four finale outputs remain out,
imaginary, local and rowOnly. The numbers above are game fixtures. The Fourier slide establishes spatial convolution versus spectral multiplication
(L4 p. 37), and the normalization and circular boundary are the game's declared conventions.
Use L4 pp. 18–26 and 33–34 for spectrum and phase, and pp. 45–47 for ringing.

## Implementation sequence and gates

1. Implement and exercise the opening probe as a standalone domain capability. Check distinguishing and
   insufficient inputs, including an impulse and a flat patch for gain, before adding it to 1-1.
2. Prototype per-form passed boards for a learner-built part in the vision domain, with form selection,
   cost counting and detail views as above.
3. Remove old 1-9, renumber, rearrange the chapter into the parallel layout, publish the dense form through
   1-2 to 1-4, add the separable form in 1-5 and turn 1-6 to 1-9 into callers, all through the content
   operation set.
4. Migrate chapter 2 consumers and retire superseded presets together with the dependent content changes.
   Keep playable intermediate commits by leaving a referenced preset available until this change lands.
5. Run the Vision Lab content check, affected domain and circuit tests, and game build. Audit final
   capability unlocks, actual saved-board reuse in both forms, all sample inputs and outputs, and the
   dependency graph. Review the probe, both forms and the 2-4 result rows in desktop and phone views. Whether
   a player can explain the evidence and apply it in the next task needs a human session; blind play by an
   agent does not show this.
6. Start the chapter 3 illumination route after the processor is stable. Before writing chapter 4 level
   content, demonstrate parameter storage, differentiation through a composed learner circuit, repeated
   updates and separation of training and validation data in a minimal prototype.
