# Vision Lab

Status: a trial of the first two chapters of the course map in
`docs/Unimelb/26S2/CV/vision-game-specs/knowledge-map-1-12.md`, with two currently serial main paths. Each chapter aims to build a machine, and
parts built are called by later levels; that structure alone does not establish a successful learning ladder.
`blueprint.json` is the authority for the knowledge points, slots and order; the encyclopedia entries come from the
entries of the course map.

## Chapter 1, the camera (lectures 1–2)

| Level | Does | Teaches | Part |
| --- | --- | --- | --- |
| 1A1 | bench, then circuit | pinhole projection u = fX/Z | project |
| 1A2 | bench (another scene with the same picture), then circuit (work back from u, given a distance) | the forward and inverse problems | |
| 1A3 | bench (90° field of view), then circuit | focal length in pixels and the field of view | |
| 1A4 | grid (coordinates, a colour pixel), then circuit | the image as an array, (x, y) | |
| 1A5 | grid, then circuit | cropping is not resizing | crop |
| 1A6 | grid, then circuit (positions given) | nearest neighbour | |
| 1A7 | two grids, then circuit (positions given) | bilinear interpolation | |
| 1W1, 1W2 | optional, Workshop 2 | pixels to millimetres; shape vs size and the centre crop | |

## Chapter 2, the convolver (lecture 3, the gradient of lecture 5)

| Level | Does | Teaches | Part |
| --- | --- | --- | --- |
| 2B1 | a row by hand, a valid circuit | the sliding weighted sum | |
| 2B2 | grid, circuit | padding | rowFilter |
| 2B3 | an impulse by hand, true convolution from rowFilter | convolution vs correlation | |
| 2B4 | circuit | the same down the columns | colFilter |
| 2B5 | the merged kernel by hand, circuit | separable filters | filter2D |
| 2B6 | a blurred point by hand, circuit | the Gaussian filter | blur |
| 2B7 | signed differences across a row by hand, circuit | the Sobel filter | sobel |
| 2B8 | circuit | the gradient and its size | |
| 2B9 | circuit | colour filtering, channel by channel | |
| 2W1 | optional, Workshop 2: circuit | BGR vs RGB (uint8 overflow in the copy) | |

## Where it departs from the course map

- Resampling positions are given, not worked out: the pixel-centre convention is a library's, not the lecture's.
- No task is a quiz: what the map's judgement levels would ask (one pixel or a patch, which way the gradient points,
  uint8 overflow) is said in the intros and pass texts; the inverse problem is practised by building a second scene.
- A column filter (2B4) is built before the separable filter, which is a row pass and a column pass.
- The row filter becomes a part only once it pads (2B2), so every filter after keeps the image's size.
- The nearest and bilinear samplers and the gradient are not parts yet: no level in these two chapters calls them.
  They become parts when the chapters that call them (the panorama stitcher) are built.

## Required learning-design repairs before content revision

The first two chapters are not accepted as pedagogically complete. See the source-based
[static review](../../docs/Unimelb/26S2/CV/vision-game-specs/trial-chapters-1-2-review.md), handbook §4.3 and the
[vision domain contract](../kit/domains/vision/DESIGN.md). This work list does not change the current blueprint or levels.

- Establish independent required learning routes and genuine joins; distinguish choice of study order from optional
  topics. In Chapter 1, geometric projection and image-array coordinates need a justified relationship before their
  pixel-camera combination. In Chapter 2, inspect kernel orientation versus column processing and the Gaussian versus
  Sobel/gradient routes after their common filtering basis. Do not impose either full route as the other's prerequisite.
  These are candidates requiring a fresh dependency audit, not an executable reordered course.
- Map the foundations of field of view, physical/pixel scale and coordinate origins before combining them in 1A3.
  Walk the tasks from novice-visible evidence and prior conventions, not from the author-facing formula or `chain`.
- Make the observations promised by 1A1's hints available in a discovery phase, and support transfer from the bench
  to its circuit. Distinguish necessary teaching evidence from a numeric answer withheld for assessment.
- Give 1A1/1A2 principle-level synthesis with model assumptions and the limits of inverse inference; remove unsupported
  generalisations about what a single image determines.
- Establish annotated optical/coordinate views and an interaction/visual acceptance plan in the domain before those
  views are used to repair the content. High-quality presentation remains unverified until the actual screens are
  inspected at desktop and phone sizes.

The present change establishes design rules and static review; it does not close these findings, implement a new
camera view, reorder levels, or alter player saves.
