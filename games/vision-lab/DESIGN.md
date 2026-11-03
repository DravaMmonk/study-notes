# Vision Lab

Status: a trial of the first two chapters of the course map in
`docs/Unimelb/26S2/CV/vision-game-specs/knowledge-map-1-12.md`, laid out the way Turing Complete teaches: each chapter
builds a machine, each level builds, uses, discovers or judges, and a part built is called directly by later levels.
`blueprint.json` is the authority for the knowledge points, slots and order; the encyclopedia entries come from the
entries of the course map.

## Chapter 1, the camera (lectures 1–2)

| Level | Does | Teaches | Part |
| --- | --- | --- | --- |
| 1A1 | bench, then circuit | pinhole projection u = fX/Z | project |
| 1A2 | equal images, then claims over a picture | the forward and inverse problems | |
| 1A3 | bench (90° field of view), then circuit | focal length in pixels and the field of view | |
| 1A4 | grid (coordinates, a colour pixel), then circuit | the image as an array, (x, y) | |
| 1A5 | grid, then circuit | cropping is not resizing | crop |
| 1A6 | grid, then circuit (positions given) | nearest neighbour | |
| 1A7 | two grids, then circuit (positions given) | bilinear interpolation | |
| 1W1, 1W2 | optional, Workshop 2 | pixels to millimetres; shape vs size and the centre crop | |

## Chapter 2, the convolver (lecture 3, the gradient of lecture 5)

| Level | Does | Teaches | Part |
| --- | --- | --- | --- |
| 2B1 | one pixel or a patch, a row by hand, a valid circuit | the sliding weighted sum | |
| 2B2 | grid, circuit | padding | rowFilter |
| 2B3 | an impulse by hand, true convolution from rowFilter | convolution vs correlation | |
| 2B4 | circuit | the same down the columns | colFilter |
| 2B5 | the merged kernel by hand, circuit | separable filters | filter2D |
| 2B6 | a blurred point by hand, circuit | the Gaussian filter | blur |
| 2B7 | signs of responses, circuit | the Sobel filter | sobel |
| 2B8 | gradient direction, circuit | the gradient and its size | |
| 2B9 | circuit | colour filtering, channel by channel | |
| 2W1 | optional, Workshop 2 | BGR vs RGB; uint8 overflow | |

## Where it departs from the course map

- Resampling positions are given, not worked out: the pixel-centre convention is a library's, not the lecture's.
- 2B1 opens with the map's "one pixel or a patch" level as its first task.
- A column filter (2B4) is built before the separable filter, which is a row pass and a column pass.
- The row filter becomes a part only once it pads (2B2), so every filter after keeps the image's size.
- The nearest and bilinear samplers and the gradient are not parts yet: no level in these two chapters calls them.
  They become parts when the chapters that call them (the panorama stitcher) are built.
