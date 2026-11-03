# Vision Lab stages 0–2: construction and coverage review

Date: 2026-11-04. Scope: 26 levels, 31 circuit tasks, 18 earned parts. The course replaces the executable camera-first
trial. All task content and save migrations were written through the operation set. The long-term outline remains
proposed beyond stage 2. This is a source, implementation and interaction review, not a measured learning study.

## Construction and source map

Level IDs here are source IDs, usable with `?level=<id>`. Display labels are derived from the branch topology.
Original lecture PDFs take precedence over note summaries. Application models and mathematical execution helpers
are declared separately from independent lecture knowledge.

| Construction/tasks | Course anchor | Learner relationship and transfer evidence |
| --- | --- | --- |
| 0-1 signed then absolute comparison | L2 PDF pp22–26; L3 point operations pp6–7 | Corresponding values/channels, sign versus magnitude; brightening, darkening and RGB. Absolute value is mathematical support. |
| 0-2 known-offset comparison | L2 image coordinates; declared fixture offset convention | Sample positions change before comparison; dx/dy are given, not estimated registration. Different axes and signs. |
| 0-3 inspection composition | Point operations; controlled task criterion | Separate measured differences from tolerance decisions. Lighting, known alignment and tolerance are assumptions, not general recognition. |
| 1-1 weighted line | L3 pp8–18,21–23 | Read neighbours, match positional weights, multiply and add. Impulse, constant, asymmetric signed weights and narrow images. |
| 1-2 two-axis reuse; 1-5 smooth/detail application | L3 pp24–28,35,37–40 | Sequential passes versus adding independent responses; corners/outer products. Given normalised Gaussian weights, signed detail versus absolute change. |
| 1-3 general local kernel | L3 pp9–18,31–35 | Samples and weights remain separate until the player composes multiplication, sum and shape restoration. Identity, asymmetric and averaging rules. |
| 1-4 kernel orientation | L3 pp17–18 | Earn convolution by reversing a kernel before the player's correlation; asymmetric impulses expose a distinction hidden by symmetric kernels. |
| 1-6 four border/valid tasks | L3 pp41–45 | Replicate, periodic and edge-inclusive reflection versus zero; valid interior changes size. Independent numeric continuations precede each configuration. |
| 1-7 signed components; 1-8 Sobel/strength | L3 pp29–30; L5 pp39–42 | Axis/sign from ramps; perpendicular smoothing reuses the weighted line. Supplied length arithmetic prevents manual squaring/root calculation. |
| 1-9 channel measurement | L3 pp31–32 | Reuse weighted aggregation on channels; independent R/G/B evidence and changed channel contributions. Weights are an instrument specification. |
| 1-10 scanner | L3 common filters/composition | Actual join consumes the learner's channel measurement, two-axis filter and Sobel. Noise conditioning precedes measurement; no complete-document detection claim. |
| 2-1 wave; 2-2 projection | L4 pp7–24 | Position × cycles plus phase, then observation × basis and mean. Changed cycle counts and quarter phases; a null projection need not mean no frequency. |
| 2-3 quadrature; 2-4 complete row spectrum | L4 pp18–26 | Retain cos/−sin projections, magnitude and every discrete index. DC, shifted stripes, odd lengths and multiple rows. Repetition/indexing is a supplied service. |
| 2-5 synthesis; 2-6 magnitude/phase mixture | L4 pp18–35 | Reuse the player's wave. Forward mean versus inverse sum; coefficient magnitude is not sinusoid peak amplitude. Zero-phase direction is explicitly undefined. |
| 2-7 complex row reuse; 2-8 2D spectrum | L4 pp25–32; complex linear arithmetic support | Preserve both components between axes, restore rectangular orientation, expose magnitude. No FFT/DFT primitive. |
| 2-9 paired gains | L4 pp38–44 | Construct a symmetric low-pass criterion, scale both coefficient components, reconstruct. Low-pass, DC removal and an explicit band-pass case. |
| 2-10 ringing comparison | L4 pp45–47 | Compare hard/tapered responses on an impulse and a step using the player's frequency filter and comparator. Inspect unclipped overshoot. |
| 2-11 convolution equivalence | L4 p37; L3 boundaries | The player's periodic convolver supplies the impulse response; complex products and inverse match spatial output. Match origin, boundaries and normalisation. |
| 2-12 inverse 2D | Fourier/inverse representation; supplied conjugation identity | Reuse the 2D forward graph through conjugation and WH scaling; check imaginary residual and non-square dimensions. |
| 2-13 interference machine | L4 2D spectra/frequency filtering; controlled known-interference model | Actual join consumes 2D analysis/inversion, the row-frequency filter and the convolver. Row-only filtering cannot isolate y variation from retained row DC. |

All images retain floating-point original values. Display clipping does not change comparisons, convolution or
reconstruction. The numerical fixtures were generated from direct spatial sums and complex exponential definitions,
not by running the domain's row-expansion graph to manufacture its expected answers.

## Dependencies and practice decisions

- Stage 0 is deliberately short and serial: absolute comparison needs the signed comparison task, alignment
  wraps that comparator, and inspection consumes aligned evidence. No arbitrary branch or coordinate-copying gate.
- Stage 1 branches only after the common weighted relationship. Separable/detail, local-kernel/direction and
  channel routes do not consume sibling parts. The scanner consumes all three.
- Stage 2 branches only after a complete row spectrum. The synthesis/filtering route and complex/2D route use
  their own constructions; the finale requires the row-frequency comparison as well as 2D processing.
- Blueprint `bp-lonely` reports identify first-use points without separate practice levels. Facets in those short
  ladders are covered by tasks, asymmetric/constant/changed-phase tests and downstream compositions; no extra levels
  were added solely to clear a density report. The stage-0 ladder report reflects its short application opening.
- Boundary tasks use the same carried board for changing continuation models. Signed-to-absolute comparison also
  carries the player's graph. Incomplete starters remove layout work without solving the decisive signal path.
- Tools follow task introductions: absolute value enters the second comparison task, and valid-domain trimming
  enters the final boundary task. Arithmetic is one configurable component. Outside settings remain unavailable
  until their path introduces them; zero and replicated extension are explained at their first actual use.
- No source point is considered mastered merely because a term appears or a reference graph passes. Camera optics,
  interpolation, learning and later machines remain outside this executable scope. Stride variants, a full scale/
  support design ladder and additional factorisation efficiency constraints remain coverage opportunities.

## Verification and limits

Mathematical checks independently cover zero/replicate/wrap/reflected reads, RGB local processing, axis settings,
valid shapes, complex 2D coefficients, DC/phase, rectangular reconstruction and imaginary residuals. Packed reuse
is checked with a different passed graph, including nested settings and inspector settings. New packed-node
defaults are checked against their declared interfaces so hidden axis choices cannot be overwritten.

Opening tasks were checked through part placement, tapped ports and runs. A fresh task-scoped session starts
with Arithmetic alone, passes the signed task, then sees the absolute-value introduction. Later-machine UI checks
use an explicitly seeded review state containing reference boards; they
are not evidence that a fresh player solved the course. Emulated touch dragging moved connected tiles while SVG
wire paths updated during movement. Details, axis/border controls, pixel popovers, numeric image cells, task scrolling,
closed initial result drawers and the final comparison outputs are checked at recorded desktop/phone viewports.

The check log and screenshots are local QA artifacts under `output/playwright/`. Automated checks establish
contracts and mathematical examples, not enjoyment, novelty, novice mastery or behaviour on a physical iPhone.
The independent-agent review gate is not claimed: this revision was implemented and reviewed in the current session.

### Recorded checks

- Full kit suite: 342 tests passed; all-game reference/hidden/wrong-program checks passed.
- All standalone game builds passed. Scoped ESLint and `git diff --check` passed.
- Blueprint, level-conformance and copy gates passed. The remaining serial-opening report is justified above;
  static gates do not replace an independent learner review.
- Desktop: 1440 × 1000, English/light; phone: emulated touch at 390 × 664, 390 × 844 and 375 × 812, Chinese/light.
- Opening tasks were manually solved through the UI. On the later seeded boards, the two-axis filter and final
  interference machine ran successfully. Axis selection, original pixel values, coefficient magnitude/phase,
  numeric-only image views and no document-level horizontal overflow were observed. Desktop hover and phone tap
  reveal original pixel coordinates and values; the phone result drawer starts closed.
- The phone keypad was exercised with a negative decimal, fraction, scientific notation, an invalid draft and
  cancellation. It retains viewport height, returns focus to its trigger, and uses no native numeric input.
- A version-26 browser fixture migrated 77 arithmetic nodes across 50 current, built and alternate-slot boards.
  Node IDs, coordinates, wires and the alternate slot name were retained; old arithmetic types were absent.
- During emulated touch movement, the connected tile moved and the wire path changed before release.
  These are Chromium emulation checks; physical iOS Safari overscroll/keyboard behaviour is not revalidated here.
