# Vision Lab

Status: a playable revision of Chapters 1–2. The blueprint is the executable curriculum authority; content is
written through the operation set. Definitions live in clickable glossary entries. Copy gives a question,
experimental conditions, reasoning support and synthesis, without repeating entry definitions.

## Visual and interaction direction

A quiet optical instrument: one geometric drawing dominates the workspace, with fixed rulers, attached quantity
marks and readable term tags. Reference and trial states use identical scales; result revelation follows the
player's prediction, while the reference remains inspectable. Sensor coordinates use a separate labelled strip;
angles use equal horizontal and vertical scales, never the stretched side-view schematic. On phones the same
views stack instead of shrinking labels beyond readability. Motion follows state changes and result revelation;
reduced-motion preferences suppress decorative transitions.

## Chapter 1: camera and image coordinates

Required parallel routes, in either study order:

- Geometry: 1A1 (predict controlled X/Z/f changes, then build projection), 1A2 (construct a different scene with the
  same image, then conditional inversion).
- Arrays: 1A4 (locate and edit cells, then read neighbours). Arithmetic addition is introduced here, so this route
  needs no parts or explanations from geometry.

Join at 1A3: first convert a signed sensor offset into pixels, then translate the origin on a coordinate strip,
then compose projection with that translation. The horizontal slice and increasing-right convention are explicit;
it does not silently reuse the vertical field-of-view drawing. The main route then continues through cropping
(1A5), nearest sampling (1A6) and bilinear sampling (1A7). The optional framing topic 1F1 hangs after projection: its equal-scale field-of-view experiment is independent
of pixel-coordinate arithmetic and does not block the camera join. Workshop-only units/library details remain
optional (1W1, 1W2). These topics have separate blueprint points and entry opening levels.

## Chapter 2: filtering and a combined image processor

Shared basis: 2B1 local weighted sums, 2B2 boundary handling and the reusable row filter.

Required parallel routes: 2B3 kernel orientation and 2B4 vertical neighbourhoods. Join at 2B5 to reason about a
separable 2D convolution filter: inputs are kernels in written order and both axes must be flipped before the
positional row/column parts are called. Asymmetric tests distinguish the roles and reject omitted flips. Sobel
uses the same written-kernel contract; its outputs retain the declared positive-change convention. After that:

- Smoothing: 2B6 builds blur.
- Changes: 2B7 builds directional responses; 2B8 combines them into a reusable edge-strength part.

Join at 2B9: produce a weighted blurred colour image and its edge strength. Both branches are actually used by
the reference and tests; a blueprint-only dependency is insufficient. 2W1 remains an optional Workshop topic.

## Acceptance and evidence

Validate both route orders, term access on every prerequisite path, wrong strategies, prediction outcomes,
reference circuits, generated save migration and glossary body references. Check desktop/phone screenshots,
pre/post-check result visibility, keyboard term activation and fresh-game route choice. Source-based requirements
and remaining issues are recorded in the chapter review; automated passing is not a claim of novice mastery.
