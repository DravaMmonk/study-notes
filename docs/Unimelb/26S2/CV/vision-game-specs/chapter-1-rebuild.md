# Vision Lab chapter 1 rebuild and chapter 2 migration

Status: implementation specification for the first rebuild milestone. The playable course still uses the
existing [stage design](../../../../../games/vision-lab/DESIGN.md). The
[chapter map](chapter-map.md) sets the teaching sequence and the runtime policy. Lecture references below
use the local PDF page order. The machine scenarios, test values and acceptance rules are design fixtures.

## Target and sequence

A learner investigates a blur, builds a spatial processor, verifies an efficient implementation, and uses it
to find the boundary of a noisy grayscale scan. Keep the existing level IDs for retained lessons. The proposed
play order is **1-1 → 1-3 → 1-4 → 1-6 → 1-2 → 1-5 → 1-7 → 1-8 → 1-10**. Remove 1-9 from this chapter and
reserve trainable channel aggregation for chapter 4. Any remaining references to the retired lesson or
its part must be resolved in the content operation that removes it.

The spatial processor's publishing chain is **1-3 → 1-4 → 1-6 → 1-2**. Each upgrade starts with the previous
passed circuit. The 1-5, 1-7, 1-8 and 1-10 application boards call the finished processor. In particular,
the scanner ceases to publish a revision of the spatial processor. Its threshold and response outputs
belong to the scanner level. The chapter 2 consumer always sees the general processor interface.

## Level specifications

In the table, a starter gives tools, supplied signals and reusable context. The reference board and
the rejected approaches belong to the level checks. The player sees causal feedback from the rejected
approach, with the general formula in the completion text and linked encyclopedia.

| Level and decision | Starter and player action | Pass evidence and counterexample | Source |
| --- | --- | --- | --- |
| **1-1 · Probe a blur, then weight neighbours**. Which input reveals where the output comes from? | Add an opening task with a local blur and an editable 7×7 grayscale input. Let the player submit an input as evidence and record an observation. Follow it with the current signed three-point construction and vertical transfer. The opening task supplies no reusable part or board to the construction task. | Use the probe protocol below. In construction, check a displaced impulse, a constant with non-unit weight sum, and a vertical case. A circuit using only the centre passes some constant examples and fails the impulse. | L3 pp. 9–18, 24–28. |
| **1-3 · General weighted kernel**. How does one neighbourhood become one output? | Supply window expansion, the written kernel and shape restoration. The player connects the contribution and reduction paths, then generalises across the image. Publish the initial processor. | Check distinct 3×3 and 5×3 kernels on a non-square image. Include a signed kernel and a kernel whose sum differs from one. An extra mean or a transposed result fails. | L3 pp. 9–18, 32. |
| **1-4 · Convolution direction**. What changes when the kernel is reversed? | Carry 1-3. Provide an asymmetric kernel and an off-centre impulse. The player adds the reversal required for mathematical convolution. | Check exact orientation and origin, including a rectangular odd kernel. A symmetric Gaussian is an equivalence control. A direct correlation answer fails the asymmetric case. | L3 pp. 17–18. |
| **1-6 · Finite boundaries**. Where can the circuit read at the edges? | Carry 1-4. Reuse the current boundary tasks and expose the shared zero, clamp, wrap and reflect setting through the processor. Keep valid output as an explicit interior crop. | Use a radius-two kernel to distinguish clamp from reflection including the edge, and an asymmetric edge signal to distinguish wrap from zero. Check the exact valid crop and dimensions. A constant interior alone cannot distinguish the policies. | L3 pp. 41–45. |
| **1-2 · Two passes when the kernel factors**. When can the same operator use fewer products? | Carry 1-6. Give a rectangular outer-product kernel and its factors for inspection. The player assembles horizontal and vertical weighted passes, compares them to the dense circuit, and saves both under the processor contract below. | Compare outputs for 3×3, 5×5 and 5×3 outer products with unequal factors. Include a rank-two kernel requiring the general path and a zero kernel. Check signed output, border behavior and counted products for the selected path. A separable-only answer fails the rank-two case. | L3 pp. 38–40. |
| **1-5 · Smooth and enhance**. Which signal was removed by smoothing? | Give the finished processor, Gaussian weights, a noisy grayscale image and a gain input. Reuse the three existing tasks on smoothing, residual and enhancement. | Check a constant, a bright and dark impulse, and gain zero. The outputs are the smoothed image, signed detail, enhanced image and absolute change as applicable to each task. Using absolute detail in enhancement fails the dark case. | L3 pp. 26–28, 32, 35. |
| **1-7 · Signed directional response**. Which direction and sign describe an edge? | Give the processor, horizontal and vertical difference kernels, and a non-square ramp. The player builds both response paths in one application circuit. | Check horizontal and vertical ramps and reversed contrast. A circuit using the same kernel for both directions or discarding the sign fails. | L3 pp. 29–30 and L5 pp. 39–42. |
| **1-8 · Sobel and response strength**. What does perpendicular smoothing add? | Carry the 1-7 application board. Provide smoothing weights and orthogonal directions. The player builds signed Sobel responses and their magnitude. | Check axis-specific edge fixtures, contrast reversal and a noisy step. Verify the numeric response, its sign and the joint magnitude. Summing signed responses or smoothing along the derivative axis fails. | L3 pp. 29–30 and L5 pp. 39–42. |
| **1-10 · Grayscale scan**. How do preprocessing and a threshold interact? | Start from the signed-response/Sobel application board. Supply a grayscale scan with noise, fine text and a paper edge, a Gaussian kernel and a threshold. The player connects preprocessing, response magnitude and the threshold mask. | Check clean and noisy edges, an edge touching the boundary and a value equal to the threshold. Expect the response and a strict-exceedance mask. Keep a non-judged scan sample that reveals detail loss. | L3 pp. 26–30, 41–45 and L5 pp. 39–42. The scan and threshold are application design. |

### Opening probe contract

- The local blur accepts the learner's editable array and shows the output as image and numeric values.
  Provide reset and optional example inputs. Keep submitted evidence separate from the current edit.
- Give two independently judged questions. For spatial support, compare plausible horizontal and vertical
  blurs with equal DC gain. For gain, compare variants with the same support and different sums.
  The learner selects or constructs an input, runs it, and identifies the supported conclusion.
- Compute all candidate outputs on the submitted input using the same boundary rule. The evidence is
  sufficient if the observed output separates the actual candidate from each alternative within tolerance
  on the stated inspection domain. For gain, require a nonzero constant patch covering a complete
  neighbourhood in the valid interior.
  A flat input cannot distinguish the equal-gain spatial alternatives. An all-zero input cannot distinguish
  the gain alternatives. Allow any spatial input with sufficient separating evidence.
- The learner first sees the ordinary output. The neighbour-contribution display is available for inspecting
  the explanation and reappears with the learner circuit in 1-3. The black box stays scoped to the probe.
- The existing choice tasks judge supplied observations, and the existing sample tab is ungraded. Implement
  the editable probe and its evidence predicate as a small vision-domain task capability before authoring
  the opening content. Use the shared image editor/display where the supported controls fit. Supply reference
  and insufficient-evidence cases to the domain check. The phase succeeds when a learner can run and submit
  their own input on both desktop and phone.

## Final processor contract

- External data ports are `image`, `kernel` and `out`. Both inputs are real single-channel grids, with a
  nonempty odd kernel in each dimension. Convolution uses centred written coordinates and reads
  `image(x-u,y-v)` for a coefficient at offset `(u,v)`. Keep numeric values signed and unclipped.
- `outside` is forwarded to the actual reads. Supported values are zero, clamp, wrap and reflection including
  the edge. The output is the same size as the input. Applications that want valid output crop explicitly by
  the kernel radii. Use centred, odd, rectangular kernels in the contract checks.
- The dense path accepts every valid kernel. The separable path accepts a factored kernel and uses two
  one-axis passes. Proposed adapter: derive factors from a nonzero pivot and check their outer product
  against the entire kernel. A zero kernel is handled explicitly. Publish the same `image/kernel/out` ports
  for all callers. The implementation must expose the selected strategy and permit dense and separable
  comparison on the same input. General kernels always have the dense path available.
- Verify that mode selection executes only the selected circuit path and that cost accounting follows the
  learner circuit. Prototype this capability before publishing the 1-2 upgrade. Counting both paths or
  attaching a constant complexity label to any submitted board would invalidate the comparison.
- For a same-size image of width W and height H and dense kernel width kx and height ky, the expected
  full dot-product counts are W·H·kx·ky and W·H·(kx+ky). For a horizontal-first valid implementation,
  count the first-pass intermediate of width W-kx+1 and height H separately from the second pass.
  Display actual measured multiply counts with output dimensions and mode, alongside the formula.
  A particular learner implementation may have a lower count, for example by eliding zero terms.

## Chapter 2 interface migration

| Consumer | Migration | Acceptance |
| --- | --- | --- |
| **2-1 opening** | Add a read-only spectrum view for a controlled image and a comparison image with a changed grid frequency. Preserve the wave construction tasks. | A learner can locate the bright pair for the grid and observe it move when the period changes. Label the DC location and display ordering. The view is not a component or an unlock. |
| **2-11 · Compare spatial and frequency paths** | Replace both `convolve[outside=wrap]` calls in the reference with the chapter 1 processor. Keep the impulse-response path so it inherits the same origin and border rules as the spatial path. Migrate starter, rejected board, introduction, hint, availability declarations and sample together. | With forward normalization 1/N and an unnormalized inverse, frequency coefficients use N times the spectral product. Check a non-symmetric signed kernel, a constant and a border impulse. A zero-padded spatial path and a missing N factor each fail. |
| **2-13 · Remove interference** | Replace the local smoothing baseline with the same processor under periodic boundaries. Preserve the row and 2D frequency paths and matched gain shapes. | Check all four outputs on a non-square image. Row filtering leaves a component constant along each row but varying between rows. The 2D mask suppresses it while the spatial baseline remains separately inspectable. |
| **Shared cleanup** | Audit all direct `convolve` references and the `separable3` preset, including part catalog, configurations, examples and reference boards. Retire the superseded presets in the changeset that migrates the last consumers. | Content checks resolve every part and configuration. Chapter 2 calls the last passed spatial processor on its dependency path. Inspect both the saved-player and supplied-reference execution paths. |

For a small independent 2-11 oracle, use row `[1,2,4,8]` and written kernel `[2,-1,3]`.
The periodic spatial result is `[27,9,18,6]`, and its unit impulse response is `[-1,3,0,2]`.
The three graded outputs remain spatial, frequency and error. The four finale outputs remain out,
imaginary, local and rowOnly. The numbers above are game fixtures. The Fourier slide establishes spatial convolution versus spectral multiplication
(L4 p. 37), and the normalization and circular boundary are the game's declared conventions.
Use L4 pp. 18–26 and 33–34 for spectrum and phase, and pp. 45–47 for ringing.

## Implementation sequence and gates

1. Implement and exercise the opening probe as a standalone domain capability. Check distinguishing and
   insufficient inputs before adding it to 1-1.
2. Verify final processor dispatch, rank-one validation and actual cost accounting. Apply the chapter 1
   level reorder, processor revisions and grayscale scanner migration using the content operation set.
3. Migrate chapter 2 consumers and retire superseded presets together with the dependent content changes.
   Keep playable intermediate commits by leaving a referenced preset available until this change lands.
4. Run the Vision Lab content check, affected domain and circuit tests, and game build. Audit final
   capability unlocks, actual saved-board reuse, all sample inputs and outputs, and the dependency graph.
   Review the probe and both computation paths in desktop and phone views. Use a new learner session to
   measure whether a player can explain the evidence and apply it when wiring the next task.
5. Start the chapter 3 illumination route after the processor is stable. Before writing chapter 4 level
   content, demonstrate parameter storage, differentiation through a composed learner circuit, repeated
   updates and separation of training and validation data in a minimal prototype.
