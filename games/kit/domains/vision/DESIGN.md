# Vision domain: learning and display contract

This contract governs domain capabilities and their acceptance before a level author uses them. It does not modify
any level, release the trial, or claim that all capabilities below are implemented. The shared rules are in
`games/DESIGN.md` §4.3; the semantic review procedure is in
[learning-review.md](../../../../.agents/skills/turing-complete-games/references/learning-review.md).

## Boundaries

- The kernel owns task progression, controls and general bench state. The vision domain owns camera/image
  semantics, explanatory marks, quantity names and presentation of its model. Content chooses supported scenes
  and tasks, without executable UI logic.
- Mathematical correctness, an available widget and an educationally usable interaction are separate criteria.
  A passing unit test or reference answer proves neither adequate guidance nor good composition.
- The minimal `starter/` fixtures exercise a contract; they are not a model curriculum to copy unchanged.

## Required concept-to-picture mapping

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

## Discovery versus assessment

A display must support the visibility required by its learning use. Current `Bench` exposes `ctx.revealed` and
`PinholeRays` hides computed rays and image results until a submit-mode setting is checked. That is an assessment
mechanism, not sufficient discovery support by itself. A prompt cannot ask a learner to follow a ray that has not
been drawn. When result withholding is necessary, prior tasks must already establish the relation and feedback
must explain the observed result after submission. If the needed discovery phase, before/after comparison or
annotated coordinate view cannot be expressed, it remains an open domain requirement rather than a copy workaround.

## Composition and interaction acceptance

- Scene, manipulated quantity, measurement and result have a clear visual hierarchy. Relevant objects have
  recognisable silhouettes; label placement must not depend on colour memory or a distant legend alone.
- State changes explain the model: move the object, show the relevant measurement, compare baseline and changed
  state. Animation should track causality, with a readable paused/static state; it must not merely decorate a pass.
- Required labels and unit markers remain legible in both languages at desktop and phone sizes. Leader lines,
  spacing and contrast prevent object/label overlap. Keyboard/touch actions do not require hover to learn a name.
- Discovery feedback supports an observation; assessed feedback shows the actual relevant condition and mismatch.
  A red/green number alone does not explain a wrong geometric or representational assumption.
- Judge claims of “high visual quality” from screenshots and interaction, not from the presence of SVG, 3D or
  animation code. No visual acceptance is granted by this document alone.

## Capability status and release evidence

| Capability | Current evidence | Acceptance still required |
| --- | --- | --- |
| Pinhole projection and sensor quantities | `benches/pinhole.js`, domain tests | Unit and coordinate conventions matched to the learning view |
| Stable pinhole comparison scale | `ui/benches/Displays.jsx`, range-corner scale calculation | Legibility and disclosed geometry under both languages/viewports |
| Optical-axis name | `PinholeRays` explicitly labels the line | Remaining centre/object/measurement referents and angle/coordinate explanations |
| Submit-mode result withholding | Kernel bench plus `ctx.revealed` in domain displays | Discovery-compatible evidence and a coherent assessment phase |
| Annotated sensor-coordinate view and inspectable comparison | Not established by the present side-view renderer | Domain design and implementation before a level depends on them |

For each future display change, retain source/units/assumptions, meaningful geometry tests, pre/post-check states,
and desktop/phone screenshots of labels and feedback. A renderer review identifies a concrete absent or misleading
referent; subjective styling is recorded separately. No levels, content JSON, migrations or player saves change as
part of establishing this contract.
