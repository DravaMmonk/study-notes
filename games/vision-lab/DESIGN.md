# Computer Vision Game: Chapter 0 and 1 Level Specifications

Status: in-development course, implemented in the `vision-lab` content folder on the `vision` domain. The current first two chapters have 59 levels; the detailed outline below is the source specification and the blueprint records the actual additions and sequence. Player-facing copy is bilingual. This is a hidden development game, separate from the existing demo.

Open work before release: the blueprint reports 16 mechanisms with insufficiently varied practice; several now have multiple tasks within their introduction but need a manual practice-density review. The levels pipeline gate reports `bp-naive` for 1X1 despite its task carrying a failing naive board: the checker reads the obsolete level-level field. Eight early levels were independently blind-played; the play interface cannot turn the scene and its text omits shading, making some lighting and test-set choices indistinguishable. Full blind play, desktop and phone checks beyond the first level, and the review queue remain open. Do not report this course as fully validated.

Sources: COMP90086 2026 lectures 1–2 and workshop 2, the course notes `01-introduction.md` and `02-basics.md`, and `games/DESIGN.md`. Some imaging details here are deliberately simplified; each model states its assumptions. Refer to `engine-domain-assessment.md` for implementation dependencies and unresolved design choices.

## Common contract

- A level contains at least one uniquely identified task. Each task has an input, player action, success condition, visible and hidden cases, and feedback. A multi-task level progresses in order; only completing the final task completes the level.
- Level references and parts below express prerequisites and outputs, not a requirement to implement the current image vocabulary as-is. New reusable parts are created only by builder tasks; they execute the player's saved board and accept exactly the declared ports. An observation, scene or model may be supplied as a local primitive, not presented as a player-built part.
- Chapter 0 is a task-selection and observation branch. Chapter 1 carries the task/test vocabulary but does not require a reusable artefact from Chapter 0. All parts built within Chapter 1 remain available there. Subsequent chapters should carry the relevant image and resampling parts.
- Each group is an ordered learning series. Where branches share an anchor, neither is a prerequisite of the other; the named join requires both. At most three parallel branches are displayed together. Challenge levels are optional and never gate a required level.
- Image coordinate convention: zero-based `(x,y)` with x right and y down; array access `I[y,x]`. RGB channels are ordered R, G, B. Values are real numbers unless a level explicitly quantises them. Tests compare dimensions and values independently; floating-point tolerance is `1e-5` unless otherwise stated. Do not silently clip values during computation.
- Public examples are shown to players; hidden cases cover changed data, geometry and boundary conditions. A concrete failing case shows input, requested output, actual output and the mismatch; interactive tasks show the failed condition. Hidden cases are not a claim of exhaustive verification.
- Intros identify the present limitation and the role of the new action without giving the key solution. Hints progress from what to examine to a more specific direction; they do not prescribe a full board. Pass text never explains the answer; omitted pass text is intentional. These specs describe author-facing reference strategies, not text shown before solving.
- Each level below specifies reference behaviour and at least one counterexample; implementers must encode and run reference boards or interactions against all cases before calling the content ready. Where a task requires a model or operation not yet present, it is **proposed**, not implemented.

# Chapter 0 — What Is the Question?

Machine: a visual test station that can inspect a scene, its image and candidate answers. The station's immediate limitation is that a picture alone does not say what kind of answer is requested. No trained detector is implied.

Topology: `0A1–0A4` → parallel series `0B1–0B4` and `0C1–0C4` → `0D1–0D3`. The final join needs both branches. Cases within a level can be multiple tasks; the learner receives the full task statement and candidate outputs, not a fabricated model confidence.

## Series 0A — State the output

### 0A1 · One image, one question
- Goal: match each question to an output shape. Actions: select among a class label, box, per-pixel category map and depth map. No need to recognise the object itself.
- Public tasks: “What object class is present?” → class label; “Where is the bicycle?” → bounding box. Hidden: reverse the option order and use a different class and location.
- Check: exact mapping for every question; show the question and chosen versus required output. Reference: label for a whole-image classification request; box for a single requested object's location. Misconception: always choose the most detailed output.
- Hint: compare the question's requested information with what each output contains. Unlock: none.

### 0A2 · A label is not a location
- Goal: distinguish class-only output from class-plus-position detection. Select which of two supplied outputs answers each request.
- Public: an image contains two cats; a label `cat` answers presence, while two labelled boxes answer where the cats are. Hidden: one instance, different class, and boxes with labels removed; a box alone is not a labelled detection.
- Check: all outputs must meet the request; feedback highlights missing class or location. Reference: evaluate required fields, not appearance. Naive: class label alone for detection. Hint: ask whether the answer identifies both what and where. Unlock: none.

### 0A3 · Regions and instances
- Goal: distinguish a semantic map from an instance map. Public: two touching dogs, one semantic class colour versus two instance IDs. Hidden: two separate instances and a single instance with multiple disconnected visible pieces.
- Check: output type and instance identity, not chosen colours or numerical IDs. Reference: semantic assigns classes per pixel; instance output distinguishes individual objects. Naive: assign all same-class pixels the same instance. Hint: count objects, not colours. Unlock: none.

### 0A4 · What can the answer tell you?
- Goal: route three requests to suitable supplied outputs: classification, semantic segmentation and depth. The player may choose more than one sufficient output when genuinely sufficient; ground-truth task wording determines sufficiency.
- Public: class label for presence; per-pixel class map for where road pixels are; depth map for distance at a visible pixel. Hidden: reorder outputs and change targets. Reference: choose an output containing the requested information. Naive: choose a class map to answer metric distance. Hint: inspect the units or meaning of each value. Unlock: none.

## Series 0B — Appearance changes

### 0B1 · Change the view
- Goal: identify which of several supplied images can be produced by changing camera viewpoint around a fixed object in a controlled scene. Scene simulator supplies renderings; player can rotate viewpoint and compare.
- Public: fixed asymmetric object, front and side views. Hidden: different asymmetric object, camera angles and distractor depicting a changed object. Check: classify all candidates using the scene's known state, not an inferred real-world identity. Reference: explore viewpoint and compare candidates. Naive: treat any pixel change as object change. Hint: move only the camera. Unlock: camera-view control, local to the station.

### 0B2 · Light changes the picture
- Goal: match two images of the same fixed object under different lighting, among candidates generated from a known controlled scene. Public: left/right light, one object; hidden: new object and intensity, including shadow. Check by scene identity metadata. Reference: examine stable shape across lighting changes. Naive: exact pixel equality. Hint: isolate the variable controlled by the light. Unlock: none; detailed reflectance belongs to a later chapter.

### 0B3 · Hidden from view
- Goal: distinguish visible evidence from occluded scene content. Public: an opaque screen hides one of two scene objects; select claims established by the image. Hidden: swap hidden object while maintaining identical visible rendering.
- Check: all and only claims true across supplied compatible scenes; show two compatible scenes on failure. Reference: withhold a claim about an entirely hidden object. Naive: infer hidden identity from the visible scene. Hint: compare what changes behind the screen. Unlock: none.

### 0B4 · A test set with variation
- Goal: choose a minimal test set satisfying explicit coverage requirements: at least one changed viewpoint, one changed lighting and one occlusion; one test may cover multiple requirements. Public: five labelled cases; hidden: permuted cases and overlapping coverage.
- Check: all required factors covered; no strict minimum-cardinality requirement unless the task explicitly asks for it. Reference: choose cases covering each factor. Naive: several nearly identical images. Hint: mark the variable changed in each case. Unlock: reusable test-case selection concept, not an executable part.

## Series 0C — Evidence and ambiguity

### 0C1 · Scene and image
- Goal: place supplied artefacts on the correct side of a scene-to-image mapping: 3D object, camera, image and pixel array. Public: one rendered object and its image; hidden: reordered artefacts. Check: correct role for every artefact. Reference: distinguish world, sensor and stored representation. Naive: classify a pixel array as the object itself. Hint: which items exist in the scene before capture? Unlock: none.

### 0C2 · Same image, different world
- Goal: decide whether depth is uniquely determined by the supplied image and calibration. Public: two labelled scenes scale both object size and distance by the same factor under a pinhole camera and share the same image. Hidden: another pair with different scale factor. Check: select “not uniquely determined” and identify the compatible scenes; explain with visual comparison rather than free text. Reference: both scenes remain possible. Naive: pick a unique distance from apparent size alone. Hint: compare projected size and the information supplied. Unlock: none.

### 0C3 · Inspect a prediction
- Goal: compare a preset classifier's outputs against labelled examples and identify an error. Public: three labels, including one incorrect prediction; hidden: reordered samples, including a correct set where “no error shown” is accepted.
- Check: compare predictions with supplied labels, not with model internals. Reference: find mismatch or select no visible mismatch. Naive: assume high confidence proves correctness. Hint: inspect prediction and reference side by side. Unlock: local prediction/label comparison view.

### 0C4 · A counterexample to a claim
- Goal: test the claim “this classifier recognises objects regardless of background” on supplied labelled cases and choose an observation that can refute it. Public: same foreground object, two backgrounds, different predictions, at least one incorrect. Hidden: different classes and candidate order.
- Check: selected case must violate the stated claim; distinguish a passing case from proof of universal correctness. Reference: choose a falsifying case. Naive: choose a single correct prediction as proof. Hint: look for a case inconsistent with the claim. Unlock: none.

## Series 0D — Put the station to work

### 0D1 · Specify the task
- Goal: given a rescue scene and a request to locate each person, configure required output fields. Public: two people; hidden: zero and three people. Check: a set of labelled boxes, including an empty set when no target is present; no requirement to produce detections. Reference: choose class and position per instance. Naive: one whole-image class or one unlabelled box. Hint: the request asks both what and where. Unlock: none.

### 0D2 · Decide what can be tested
- Goal: pair an existing output with a valid test: predicted labels vs class labels, boxes vs reference boxes, or depth vs known distances. Public: three pairs; hidden: reorder and include an unmatched candidate. Check: field compatibility and units. Reference: matching predicted and reference quantities. Naive: evaluate a predicted distance against a class label. Hint: compare what the two sides measure. Unlock: none.

### 0D3 · The limits of one image
- Goal: classify statements about a supplied image as supported, contradicted, or undetermined across a finite set of fully specified candidate scenes. Public: visible red object; one fully occluded object differs across two otherwise identical scenes. Hidden: candidates reordered and different scene. Check: evaluate all candidate scenes: supported = true in all; contradicted = false in all; undetermined = mixed. The finite candidate set is explicitly declared exhaustive for this puzzle only.
- Reference: compare the same claim across all scenes. Naive: choose a single plausible world as certain. Feedback: show a pair of scenes that disagrees. Hint: look for a claim that changes while the picture does not. Unlock: chapter completion. No claim that all real-world alternatives have been enumerated.

# Chapter 1 — From Scene to Pixels

Machine: a controlled camera and image workbench. Introductory optical levels use local scene primitives, not a player-built physical camera. The image pipeline is built from primitive coordinate sampling and scalar arithmetic only after the learner has seen the data it operates on.

Topology: `1A1–1A4` → parallel `1B1–1B4` (pinhole) and `1C1–1C4` (arrays) → `1D1–1D4` (crop and translation) → `1E1–1E4` (resizing) → `1F1–1F3` (representation). Optional `1X1` attaches to `1E4`. 1B and 1C require only 1A. 1D needs the array branch and the image notion introduced in 1A; the chapter join also requires 1B. Keep lens/defocus `1G1–1G3` parallel to 1D–1F after 1B4, with chapter completion after both. This preserves independent paths and fits three columns.

## Series 1A — Observe a digital image

### 1A1 · The sensor grid
- Goal: inspect a tiny 3×2 grayscale image and reproduce its six numeric entries in the supplied grid. Public rows `[0, 0.5, 1]`, `[1, 0.25, 0]`. Hidden: asymmetric values and 2×3 shape.
- Check: dimensions and each entry, tolerance `1e-5`. Reference: read each labelled cell. Naive: transpose rows and columns. Hint: compare width, height and the top-left corner. Unlock: image grid inspection view; it is not a fabricated built part.

### 1A2 · Select a pixel
- Goal: select pixel at `(x,y)` in a displayed image; two tasks switch from coordinate → cell to cell → coordinate. Public: 3×2, coordinate `(2,0)` means top-right. Hidden: `(0,1)` and non-square grids.
- Check exact position; output highlights the corresponding coordinate. Reference: x moves right, y down. Naive: swap x and y. Hint: follow the labelled axes. Unlock: none.

### 1A3 · Three channels
- Goal: read and edit RGB values of one pixel. Public: `(1,0,0)` is red, set a different pixel to `(0,0,1)` for blue. Hidden: asymmetric triples and channel swaps; no perceptual requirement beyond the declared RGB display.
- Check exact numeric channel vector, not image colour alone. Reference: edit named channels. Naive: exchange R and B. Hint: inspect the channel labels. Unlock: channel inspection view, requiring colour support.

### 1A4 · One image, different values
- Goal: identify which of two changed arrays represents a brightness change and which only moves values. Public: `[0.2,0.8]` versus `[0.3,0.9]` and `[0.8,0.2]`. Hidden: asymmetric 2D inputs, no clipping. Check each specified case by values, not inferred physical illumination. Reference: compare locations and values. Naive: say all changes are movement. Hint: compare the value at each coordinate. Unlock: none.

## Series 1B — The pinhole camera

Coordinate convention for all pinhole tests: camera at origin, optical axis +Z, image coordinates x and y right/up in an ideal *virtual image plane* at distance f; `u=fX/Z`, `v=fY/Z`, `Z>0`. The physical screen behind a pinhole is inverted; do not mix the two conventions in a test. Projection is independent of pixel conversion until 1C. These are ideal geometric scenes, not lens models.

### 1B1 · Through a small opening
- Goal: align a virtual screen marker with the projected point by moving the object in X while f and Z are fixed. Public: f=2, Z=4, X=2 → u=1; hidden: X=-2 → -1 and X=0 → 0. Player sees rays and can experiment; formula is not shown as the answer.
- Check marker position within 0.05 scene units; feedback overlays the ray and marker. Reference: trace the line from point through camera centre to plane. Naive: assume u=X for every depth. Hint: follow the ray through the opening. Unlock: local pinhole scene primitive.

### 1B2 · Move the object away
- Goal: restore a target image size by moving the object along Z. Public: object height H=2, f=2, target projected height 1 → Z=4. Hidden: H=3, f=2, target 1 → Z=6; restrict Z to positive range.
- Check projected height within 0.05; show actual vs target. Reference: explore distance while holding f and object fixed. Naive: assume projected size is unchanged by distance. Hint: compare the rays for near and far positions. Unlock: none.

### 1B3 · Change focal length
- Goal: match a target projected size using f, with H and Z fixed. Public H=2, Z=4, target 2 → f=4; hidden H=3, Z=6, target 1.5 → f=3. Check tolerance 0.05. Reference: explore f at fixed scene and distance. Naive: move the object when only f may change. Hint: watch where the image plane lies. Unlock: none.

### 1B4 · Same image, different distances
- Goal: find two allowed `(H,Z)` pairs that yield the same projected height at fixed f. Public f=2: `(H,Z)=(1,2)` and `(2,4)` both yield 1. Hidden: a different target and finite set of candidate pairs.
- Check projected equality and distinct depths; show both scenes. Reference: choose pairs with equal H/Z. Naive: conclude apparent size alone determines depth. Hint: change size and distance independently. Unlock: none; links back conceptually to 0C2 without requiring it on this branch.

## Series 1C — Arrays, coordinates and channels

### 1C1 · Row and column
- Goal: reproduce a 3×2 array in an image grid and answer two coordinate queries. Public `[[1,2,3],[4,5,6]]`; `(2,0)=3`, `(0,1)=4`. Hidden: different shape and asymmetric entries.
- Check grid dimensions and query values. Reference: array row is y, column is x. Naive: use `I[x,y]`. Hint: compare labels on the grid and array. Unlock: none.

### 1C2 · Read any pixel
- Goal: build a sampler with inputs `image,x,y` and scalar output `value`; coordinates are in-bounds integers. The only new primitive is local integer lookup. Public input `[[1,2,3],[4,5,6]]`, `(2,1)` → 6. Hidden: non-square images, all corners, arbitrary values.
- Check all cases, including output scalar shape. Reference: connect image and coordinates to lookup. Since using a lookup is itself a first encounter with a typed coordinate port, this is an interaction showcase, not a substantive algorithmic builder; **do not unlock the lookup as a player-built part**. Primitive becomes available for later genuine construction. Hint: inspect the source coordinate. Unlock: integer lookup primitive.

### 1C3 · Separate colour channels
- Goal: given a colour image, construct an RGB channel inspector returning the selected channel as a scalar image. Inputs `image,channel`; output `plane`. Public: 1×2 pixels `[(1,0,0),(0,0,1)]`, blue plane `[0,1]`. Hidden: green, red and asymmetric values.
- New primitive: channel selection; if it is itself merely selected and wired, treat as a local demonstration rather than a built part. Reference: use channel selection. Check shape and values. Naive: assume all channels equal. Hint: compare the labelled channels. Unlock: channel selection primitive, no built part.

### 1C4 · Reassemble colour
- Goal: build `composeRGB(R,G,B) → image` from the primitive channel assembly operation, then use it in a second task on a multi-pixel image. Public R=`[1,0]`, G=`[0,0.5]`, B=`[0,1]` → pixels `[(1,0,0),(0,0.5,1)]`. Hidden: asymmetric planes and distinct dimensions; unequal dimensions are invalid and must produce a visible error.
- Reference: connect each named plane to the matching input. This is a single primitive call and **must not be represented as a player-built abstraction**; unlock the assembly primitive after successful interaction, then use it with channel selection in a genuine reorder task. Naive: swap red and blue. Hint: inspect each channel independently. Unlock: channel assembly primitive.

## Series 1D — Crop and translate

Coordinate-sampling primitive: for each output coordinate, a mapping provides a source coordinate; integer lookup reads the source. Output size is specified by the task, not guessed from the input. Outside-image policy for this series is explicitly zero unless a task says otherwise.

### 1D1 · A window into an image
- Goal: construct `crop(image,x0,y0,w,h) → image`, with valid integer rectangle inputs. Public `[[1,2,3],[4,5,6],[7,8,9]]`, rectangle `(1,0,2,2)` → `[[2,3],[5,6]]`. Hidden: non-square source, edge-aligned rectangle, 1×1 crop, varying origins and sizes.
- Adds: coordinate-grid and integer arithmetic primitives, with lookup from 1C2. Reference: map each output coordinate to an offset source coordinate and sample. Naive: resize full source instead of selecting a rectangle. Hint: compare output's top-left with source position. Build: crop part with all five declared input ports; board must read each. Use later in 1D2 and later image workflows.

### 1D2 · Cropping keeps the samples
- Goal: use the crop part to extract a requested rectangle, then extract a different-sized rectangle from a second image. Public: above image, `(0,1,3,2)` → `[[4,5,6],[7,8,9]]`. Hidden: dynamic rectangle and asymmetric pixels.
- Check exact dimensions and values; reference uses crop. Naive: stretch the full image to target dimensions. Hint: compare which original samples remain. Unlock: none.

### 1D3 · Move the picture
- Goal: build `translate(image,dx,dy) → image`, retaining input dimensions and filling uncovered pixels with zero. Public input `[[1,2,3],[4,5,6]]`, `(dx,dy)=(1,0)` → `[[0,1,2],[0,4,5]]`. Hidden: negative x, vertical shifts, zero shift and values crossing all borders.
- Adds: in-bounds test and conditional selection primitives if not derivable from existing scalar primitives. Reference: map each output location back to the corresponding source location; use zero outside. Naive: source mapping in the same direction as visible content motion. Hint: for an output cell, ask where its value came from. Build: translate part with dynamic dx/dy; later used in 1D4 and subsequent filtering.

### 1D4 · Crop a moving target
- Goal: use translate and crop on the same input to produce a specified moved and extracted region. Public: input `[[1,2,3],[4,5,6]]`, translate `(1,0)`, then crop `(1,0,2,2)` → `[[1,2],[4,5]]`. Hidden: alternate shift, crop position and source image; both operations are task inputs.
- Reference: use previously built parts in the required order. Naive: crop first without adjusting coordinates. Check image and size. Hint: inspect the intermediate image. Unlock: none.

## Series 1E — Resampling

Resizing convention: source and destination pixel centres align at their endpoints. For destination size n>1, source coordinate `s=i*(m-1)/(n-1)`; for n=1 use the source centre `(m-1)/2`. Nearest-neighbour ties round towards the larger index. Bilinear interpolation clamps at the source boundary. Images have positive integer sizes. This convention is explicit because libraries differ.

### 1E1 · Where should the new samples go?
- Goal: place sample coordinates for a 1D row before choosing their values. Public: 3 source samples at x=0,1,2 resized to 5 positions → `0,0.5,1,1.5,2`. Hidden: 2→3, 4→1 (centre 1.5), and identity. Check coordinates within `1e-5`. Reference: distribute output centres using the declared endpoint convention. Naive: use output indices directly. Hint: compare the first and last sample positions. Unlock: no part.

### 1E2 · Nearest neighbour
- Goal: build `resizeNearest(image,w,h) → image` from output grid, source-coordinate mapping, rounding and lookup. Public: row `[0,1]` to width 3 → `[0,1,1]` under the stated tie rule. Hidden: 2D asymmetric input, width or height 1, identity, enlargement and reduction.
- Check dimensions and exact source values. Reference: compute mapped coordinate, choose nearest source pixel, sample. Naive: always take floor; `[0,1]`→3 exposes the tie. Hint: compare distances from each output position to source centres. Build: nearest-neighbour resize with dynamic dimensions; use in 1E4.

### 1E3 · Between pixels
- Goal: build `resizeLinear(image,w,h) → image` with bilinear interpolation, starting with a 1D task and continuing to 2D. Public 1D `[0,1]`→3 = `[0,0.5,1]`; public 2D `[[0,1],[1,0]]`→3×3 has centre 0.5. Hidden: asymmetric values, non-square input, boundaries and output size 1.
- Adds: floor, fractional part and bounded source read if not already present. Reference: interpolate neighbouring source values in x and y; full arithmetic is author-only. Naive: nearest neighbour, exposed at the 1D middle. Hint: compare the new position's distance to its neighbours. Build: bilinear resize with dimensions as inputs; use in 1E4 and later segmentation work.

### 1E4 · Compare two enlargements
- Goal: produce both nearest and bilinear outputs for a supplied image, then identify which supplied profile matches each result. Public `[0,1]`→5: nearest `[0,0,1,1,1]`; linear `[0,0.25,0.5,0.75,1]`. Hidden: reversed edge and 2D asymmetry.
- Check both numerical images and profile assignment. Reference uses both player-built parts; no assertion that one universally recovers lost detail. Naive: use one method for both. Hint: examine newly placed samples. Unlock: none. Later anti-aliasing is outside this chapter; reductions here show samples without implying aliasing has been solved.

## Series 1F — Numeric representations

### 1F1 · Values and display range
- Goal: compare a numerical image with its displayed version. Display clips only for display to [0,1], while stored float values remain unchanged. Public stored `[-0.2,0.5,1.2]` → displayed `[0,0.5,1]`; hidden distinct out-of-range values. Check both numeric and displayed answers. Reference: distinguish representation from display mapping. Naive: assume display clipping overwrites data. Hint: inspect the numeric readout. Unlock: numeric/display comparison.

### 1F2 · Quantisation
- Goal: build a uniform scalar quantiser on [0,1] for a declared number of representable levels `L≥2`: `round((L-1)*clamp(v,0,1))/(L-1)`, ties towards the larger level. Public L=3, inputs `[0,0.2,0.7,1]` → `[0,0,0.5,1]`. Hidden: thresholds, ties and L=2 or 5.
- Adds: clamp and rounding primitives if absent. Reference: normalise to integer levels, round and scale back. Naive: truncate instead of nearest; hidden tie and near-boundary cases catch it. Build: quantiser with dynamic L; use in 1F3. This is a simplified uniform quantiser, not a claim about every image format.

### 1F3 · Preserve or discard information
- Goal: use the player's quantiser to produce a requested three-level image and choose whether the original float values can be uniquely recovered from it. Public 0.2 and 0.1 both map to 0 at L=3. Hidden: values on either side of a threshold and different L.
- Check resulting values and non-uniqueness answer; show two valid inputs mapping to the same quantised value. Reference uses quantiser. Naive: equate number of stored levels with original precision. Hint: try two input values close together. Unlock: none.

## Series 1G — Lenses and focus

The visual model must label itself a simplified thin-lens or bounded teaching model. Parameters, units and validity domain are fixed in each task; physical image inversion and finite aperture must not be hidden behind a pinhole model. Do not require quantitative lens-defocus formulas until the actual scene model is specified and validated.

### 1G1 · Collecting light
- Goal: vary aperture in a controlled lens scene and choose which of two exposures receives more light while other factors are fixed. Public and hidden: different aperture sizes with fixed exposure and illumination. Check monotonic ordering only within the model's declared range; no demand for a universal brightness equation. Reference: experiment with aperture alone. Naive: assume the lens position changed. Hint: inspect the opening. Unlock: local lens scene primitive.

### 1G2 · Focus at different depths
- Goal: focus separately on a near and a far object using a focus control. Public: two marked objects at different depths; hidden: changed distances and object order. Check by an engine-provided, independently computed sharpness target with a declared tolerance and non-overlapping acceptable ranges. Reference: alter focus and compare both objects. Naive: assume all depths can be simultaneously sharp at every aperture. Hint: inspect the two targets as focus changes. Unlock: none.

### 1G3 · Aperture and depth of field
- Goal: compare depth ranges judged acceptably sharp at two apertures under explicitly held exposure and focus, with an exposure compensation control fixed by the scene. Public: smaller and larger aperture; hidden: different near/far markers. Check only the declared model's focus range; feedback shows sharpness curves and threshold. Reference: compare depth ranges rather than raw brightness. Naive: change focus as well as aperture and attribute the result to aperture. Hint: hold the other settings fixed. Unlock: none.

## Optional challenge

### 1X1 · Resize a crop
- Anchor: 1E4. Goal: crop a supplied region and resize it to the requested dimensions using the specified interpolation. Public 2×2 crop enlarged to 3×3; hidden: non-square crop and dimensions. Reference uses the player's crop and requested resize parts. Naive: resize the entire image and then take the same numeric crop. Check dimensions and all numeric pixels; show the first differing cell. No new primitive or required unlock.

## Cross-chapter use and acceptance

- `crop` → 1D2, 1D4, 1X1; `translate` → 1D4 and spatial-filter chapter; nearest and linear resizing → 1E4 and later pipelines; quantiser → 1F3. No built part is left without a specified later use.
- The exact graph of component capabilities, typed ports and allowed operations remains a design requirement: run a dependency and minimal-primitives review before authoring executable content. A primitive may only be introduced at a real need; combining existing parts must produce a built part rather than a new shortcut.
- Acceptance before release: all reference interactions/boards pass public and hidden cases; negative examples fail; new built parts run saved boards; prerequisite graph and glossary references validate; inspect desktop and phone; run course checks and blind play. None of these checks has been executed for this proposal.
