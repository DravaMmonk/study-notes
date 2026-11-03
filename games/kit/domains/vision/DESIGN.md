# Vision domain: learning and display contract

This contract governs domain capabilities and their acceptance before a level author uses them. The stages 0–2
construction course uses the execution and inspection capabilities below; this is not acceptance of every future vision display. The shared rules are in
`games/DESIGN.md` §4.3; the semantic review procedure is in
[learning-review.md](../../../../.agents/skills/turing-complete-games/references/learning-review.md).

## Boundaries

Circuit inputs can carry a coordinate point `{ x, y }`. A point source exposes x and y as separately labelled,
independently connectable outputs on the existing shared editors; tests display the point as one coordinate pair.

Part details show live inputs and outputs separately. Images use intrinsic cells of at least 44 px in a bounded preview, with compact size/channel metadata. Per-cell numbers
and coordinate axes are always shown in the single numeric image view. Value ranges and
display clipping are secondary information. Mouse hover, touch selection and keyboard activation reveal the selected cell's
position and original scalar/RGB value. Large grids scroll without shrinking touch targets. Coordinate-grid
values remain distinct from the positions of their cells; adding a scalar changes stored values, not grid shape.
Addition details compare actual operands with the output and offer independent examples of number, image and
coordinate arithmetic. Descriptions remain plain text. Desktop cards offer the same detail content as phone sheets.

- The kernel owns task progression, controls and general bench state. The vision domain owns camera/image
  semantics, explanatory marks, quantity names and presentation of its model. Content chooses supported scenes
  and tasks, without executable UI logic.
- Mathematical correctness, an available widget and an educationally usable interaction are separate criteria.
  A passing unit test or reference answer proves neither adequate guidance nor good composition.
- The minimal `starter/` fixtures exercise a contract; they are not a model curriculum to copy unchanged.

Introduction figures may compare integer pixel centres with continuous sample positions. A sampling ruler
shows the original row, the continuous position and the selected nearest sample. Midpoint ties use the declared larger-coordinate convention; nearest integer selection is separate
from clamping to the finite source row. This is an optional observation, never a slider assessment gate.

## Required concept-to-picture mapping

Introduction pages may choose domain figures for the lab, projection measurements, image samples, physical/pixel
units, coordinate origins and a local filtering window. These are explanatory displays, not additional benches or
assessment gates. They show prerequisite conventions and independent examples without supplying the target circuit.

Every display used for a task must identify the parts needed to reason about that task. Keep unrelated quantities
out of the initial explanation; do not expose every capability simply because the model computes it.

| Learning focus | Required visible referents | Convention that must be stated |
| --- | --- | --- |
| Projection | Camera centre, optical axis, object/point, image plane, image point, X/Z/f/u measurements | Virtual or physical image plane; sign and directions; length units |
| Inverse ambiguity | A fixed image target and two inspectable scene states | What stays equal; what varies; which depth or size is assumed rather than recovered |
| Field of view | Sensor edges and rays through them, the full angle and its half-angle | Horizontal or vertical slice, symmetric/centred assumption, physical sensor size and units |
| Pixel coordinates | Sensor front view or equivalent coordinate strip, pixel direction/origin, axis intersection, principal point | Signed offset versus array coordinate, physical versus pixel units, stated pixel-centre convention |
| Filtering | Image samples, kernel orientation, current window, weighted contributions and output location | Padding, stride, channel mapping and whether the kernel is flipped |

Use labels on the figure or unambiguous leader annotations; match names/symbols in controls, feedback and accessible
text. A dot must not silently stand for both the camera centre and an image point. A side-view displacement named
u must not silently become a horizontal pixel-column coordinate. A centred principal point is a teaching assumption,
not a fact about every camera.

## Geometric and numerical honesty

- Use an explicit length unit, or identify consistent model units. Do not place metres and millimetres on one
  apparently uniform ruler. Separate scene and sensor scales where necessary and label the schematic compression.
- Keep the scale fixed during a controlled comparison. A deliberate zoom must be visible and must not masquerade
  as physical motion. Draw an angle in a metric-preserving inset, or explicitly mark the diagram schematic;
  stretched coordinates must not visually establish a 45-degree triangle.
- A field-of-view claim concerns both sensor edges unless a half-angle is explicitly requested. Identify the centre
  and reference direction before relying on “top,” “left,” or a principal point.
- Distinguish an axis-relative projected offset, its conversion to pixels, and a pixel coordinate relative to an
  image origin. Preserve the axis-specific scale; square pixels and centred principal points must be explicit
  assumptions when used. Do not add a principal-point shift to a height or distance.
- Quantities in the figure, controls and verdict come from the same model state. A label and its measurement must
  remain attached as the object moves. Available observations in the textual play interface must match visibility
  on the screen; hidden model facts are not teaching evidence.

## Construction services and earned algorithms

Vision Lab stages 0–2 supply arithmetic, offset reads, axis selection, window expansion, row reduction, shape
restoration, transpose and repetition. `windowTable` exposes matching samples and written weights, without a
product or sum. A learner circuit multiplies, reduces and restores. Gaussian, Sobel, correlation/convolution,
Fourier projection, spectrum and inverse are never supplied algorithm boxes in this course.

`expandRows` repeats each width-N input row N times, exposing position x/N and repetition index k. The learner's
wave/projection circuit computes coefficients. Row reduction and shape restoration supply traversal arithmetic;
they do not compute Fourier coefficients. Full complex row transforms preserve both components before the second
axis pass. The forward normalisation is 1/N per axis; reconstruction contracts state the corresponding scale.

A built component may declare `outside` and `axis` settings. The shared packed evaluator forwards declared
parameters to matching internal parts; the inspector uses the same settings application. New node defaults
contain only exposed settings. Adding a hidden `axis=x` default to a two-pass wrapper would overwrite its internal
perpendicular pass, so the saved reference, a newly placed part and the inspected interior must all be checked.
Zero/clamp/wrap/reflection are explicit. Reflection repeats the edge sample. `trim` provides a declared valid
interior and reports the changed dimensions; it never pretends border assumptions are observations.

The domain also retains semantic sampling/stencil/kernel/colour operators for its independent fixtures and
other declared curricula. Vision Lab does not introduce them as primitives. Execution-service availability is
not a licence to bypass the method being constructed.

Short weight fields share one row. A computed weight sum and a one-click unit-sum action remove normalisation
arithmetic while retaining its effect on gain. Stencil axis, sample method and kernel convention remain visible
on phone tiles; detailed settings and touch-inspectable outputs live in the compact part sheet.

A circuit task may declare an editable `starter` blueprint. It is parsed with the same vocabulary as the solution,
checked against available parts, cloned for each opening/reset, and must not already satisfy the task. Changed
starters invalidate saved boards. A `naiveWhy` explanation is shown only when all observed outputs match the
characteristic wrong program; other failures retain their actual mismatch rather than an unrelated diagnosis.

## Calculation displays

The domain retains independent sampling/window arithmetic for explanatory observations and vocabulary fixtures.
The construction course has no numeric-fill assessment. Its introductions compare material-dependent interpolation,
weight gain, separable outer products and signed differences using independent examples and computed values.
Coordinates and raw pixel values remain available on interaction; normalisation and boundary assumptions are
visible. Definitions and auxiliary calculations never substitute for the learner's intended visual decision.

## Discovery versus assessment

A display must support the visibility required by its learning use. `PinholeRays` presents a concrete camera and
calibration object, retaining a compact reference photograph while `ctx.revealed` withholds the current trial
result. A check reveals the trial ray and measurement. An inverse task compares another scene with the retained reference.
Projection cases expose controlled changes without a separate prediction gate. Pixel-unit conversion is
explained alongside a prewired projection; coordinate-origin reasoning remains the learner decision. A term entry
provides its meaning; the task provides observable evidence and a concrete inference. Definitions must not
be repeated in introductions or summaries merely to satisfy a timing check.

## Composition and interaction acceptance

- Scene, manipulated quantity, measurement and result have a clear visual hierarchy. Relevant objects have
  recognisable silhouettes; label placement must not depend on colour memory or a distant legend alone.
- State changes explain the model: move the object, show the relevant measurement, compare baseline and changed
  state. Animation should track causality, with a readable paused/static state; it must not merely decorate a pass.
- Required labels and unit markers remain legible in both languages at desktop and phone sizes. Leader lines,
  spacing and contrast prevent object/label overlap. Keyboard/touch actions do not require hover to learn a name.
- A phone scene must not displace all controls below an inaccessible or horizontally clipped area. The shell
  owns the fixed Check/Next control. RGB answers use a selected-pixel inspector, not three fields per visible cell.
  Every editable answer remains reachable with scrolling and the software keyboard open.
- Discovery feedback supports an observation; assessed feedback shows the actual relevant condition and mismatch.
  A red/green number alone does not explain a wrong geometric or representational assumption.
- Judge claims of “high visual quality” from screenshots and interaction, not from the presence of SVG, 3D or
  animation code. No visual acceptance is granted by this document alone.

## Capability status and release evidence

| Capability | Current evidence | Acceptance still required |
| --- | --- | --- |
| Pinhole projection and sensor quantities | `benches/pinhole.js`, axis-pitch and FOV tests | Keep conventions explicit in future scenes |
| Stable reference and trial scale | `ui/benches/Pinhole.jsx`, extents include stage states and knob limits | Inspect new ranges rather than assuming old framing fits |
| Annotated geometric referents | O, plane, scene/image values, f/Z rulers and clickable term tags | New scene types need their own referents |
| Reference and result revelation | Reference photograph visible before Check; trial photograph is withheld | Check novel experiments independently |
| Camera framing | Whole-subject inclusion, minimum image height and complete exclusion are distinct model conditions | Check partial visibility at sensor boundaries |
| Equal-scale FOV view | `PinholeField`, both edges, full/half arcs and fixed parameter range | Other sensor sizes/ranges need legibility checks |
| Local filter window | `filter-window.js`, `FilterWindow.jsx`: samples, positional weights, padding and input/output positions | Arithmetic shown for the selected output; explicit transfer to result cells; dimensions validated |

The course review records viewport sizes, actual interaction evidence and verification limits for each release.
Display changes require model tests, pre/post-check inspection, touch interaction and desktop/phone review. These
checks do not establish novice mastery or subjective puzzle quality.

## Stage 0–2 interaction evidence

The inspection opening introduces the growing machine before a separate pixel-evidence page. Window examples
identify one output location, its samples/weights, computed contributions and output. Numeric cells retain
negative values hidden by grayscale clipping. Pixel details remain opt-in; complex output inspection also gives
coefficient length and phase in turns, with undefined phase stated for zero coefficients. Result drawers start
closed on phone tasks. Actual viewport and interaction checks are recorded in the stage review, not inferred
from a build.
