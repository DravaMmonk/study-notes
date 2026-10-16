# Topic 4: How to match and recover 3D

This topic answers: **how do we find the same point in two images, and then use it to compute 3D information?** The route is: first find points that are "easy to find again" (corners), then find a consistent geometric relationship despite wrong matches (Hough, RANSAC), and finally use the geometry of two cameras to compute depth (stereo, epipolar lines).

Learning path: [Harris probe](#1-harris-probe-lecture-11) → [Hough voting machine](#2-hough-voting-machine-lecture-12) → [RANSAC pegboard](#3-ransac-pegboard-lecture-12) → [stereo rangefinder](#4-stereo-rangefinder-lecture-13) → [epipolar rig](#5-epipolar-rig-lecture-14).

## 1. Harris probe (Lecture 11)

<!-- figure: harris-probe -->

**What this device is**: a test plate with a step on it. The height of the step block is the brightness (the block face is bright, the floor dark), so the plate has a flat region, a straight edge and a corner all at once. A gantry carries a square probe window across the plate; beside it are a circular chart recorder, two gauges and a post with an indicator lamp.

**The concept**: the window is shifted a little in every direction, and the chart recorder draws the shift cost E(u,v) ≈ [u v] M [u v]ᵀ. The two gauges read the two eigenvalues of M, λ1 and λ2, and the post reads R = det M − k(tr M)² (k = 0.05).

**How to play**: hover the mouse over the test plate to move the window; the arrow keys fine-tune it; press 1, 2, 3 to jump to flat, edge or corner; space makes the window wobble again.

**What to watch**: the curve on the circular chart. In a flat region it shrinks to a dot, on a straight edge it is a figure "8" (change only in the cross-edge direction), and at a corner it is close to a circle (change in every direction). Also check the two gauges and whether the lamp is lit.

**Common misconceptions**: a corner is not "a place with a strong gradient". A straight edge can have a very strong gradient too, but it only grows in the cross-edge direction (λ2 ≈ 0, R < 0). A corner requires even the weakest direction to be large.

Lecture notes: [Lecture 11 · Harris corners](../11-features.en.md)

## 2. Hough voting machine (Lecture 12)

<!-- figure: hough-accumulator -->

**What this device is**: on the left is a pegboard with 12 "edge point" pegs standing on it, with a rotating arm and a straightedge at its centre. On the right is an accumulator tray divided into cells, with a coin slot above it dropping tokens into the cells.

**The concept**: the arm's direction is the line's normal θ, and the slider's distance from the centre is ρ = x cosθ + y sinθ. A point is a sinusoid in parameter space; the curves of collinear points cross in the same cell, and the votes pile up into a peak. "Finding a line" becomes "finding the tallest stack".

**How to play**: space reads the next point (slowly), A casts all the votes at once, R restarts, and B or a button switches the bin size (coarse 15°×6, fine 7.5°×3).

**What to watch**: the sinusoids formed by the tokens on the tray, the tallest stack, and which row of pegs the straightedge finally settles on.

**Common misconceptions**: finer bins are not always better. With fine bins, noisy votes get split into neighbouring cells, and the peak drops from 9 votes to 6. The three outliers each cast a whole curve of votes too; their votes are just scattered and do not stack up.

Lecture notes: [Lecture 12 · Hough voting](../12-feature-matching.en.md)

## 3. RANSAC pegboard (Lecture 12)

<!-- figure: ransac-pegboard -->

**What this device is**: the 20 pegs on the board are 20 data points; some lie roughly along a straight line (inliers) and the rest are scattered at random (outliers). Each round, two pegs are raised at random, and a straightedge with two side rails rests on them; the distance from the rails to the centre line is the threshold δ.

**The concept**: each RANSAC round: draw a minimal sample (2 points for a line), propose a model, let all points vote, and remember the round with the most votes. The number of rounds needed is k ≥ log(1 − P) / log(1 − pⁿ), and at the end the model is refitted using all inliers of the best round.

**How to play**: space or the "Next round" button runs one round, R or "Restart" starts over; switch the outlier ratio between 30% / 50% and the threshold δ between 3 / 6. When left alone it automatically demonstrates a full run.

**What to watch**: the pegs that fall between the two rails pop up; this is the voting. The slider on the tally column is this round's vote count, and the stop above it only rises, never falls, remembering the best. The number of ticks around the dial is the k given by the formula: 7 ticks at 30% outliers, 17 ticks at 50%. After a full turn, all inliers of the best round rise together and the straightedge comes to rest on them; this is the refit, and the final line is engraved on the board.

**Common misconceptions**: the two sampled points only "propose" a line; how good it is depends on the votes of all points, because any two points can be passed through perfectly by a line. δ is a distance threshold, not a number of rounds. k guarantees that the probability of "drawing an all-inlier sample at least once" reaches P; it does not guarantee that the final output is correct.

Lecture notes: [Lecture 12 · RANSAC](../12-feature-matching.en.md)

## 4. Stereo rangefinder (Lecture 13)

<!-- figure: stereo-rangefinder -->

**What this device is**: two cameras mounted side by side on a lateral slide, looking down a rail marked in metres. A small cart on the rail carries a target ball, and two thin strings run from the two lenses to the ball, representing the two lines of sight. A viewfinder screen on top of each camera shows where the target is imaged as a bright dot; a dial between the two cameras reads the disparity d.

**The concept**: for aligned stereo cameras, depth z = f·b / d. With a 1-pixel error in disparity, the depth error is about z² / (f·b), so the farther away, the less accurate.

**How to play**: move the mouse along the rail to push or pull the target, and fine-tune with the left/right arrow keys; the up/down arrow keys or the buttons below switch the baseline between 6 / 10 / 16 cm.

**What to watch**: push the target back and the bright dots on both viewfinders move towards the middle while the dial's needle falls, showing that disparity shrinks as 1/z. The shaded segment between the two stop blocks on the rail is the range of depths that could be reported if the disparity were off by 1 pixel: moving the target from 2 m to 4 m makes this range about four times longer. Widening the baseline shortens the shaded segment.

**Common misconceptions**: the drawing uses 300 units per metre horizontally and 40 units per metre in depth so that both cameras can be seen clearly, so the angles are not to true scale. A wider baseline gives more accurate ranging, but the two images also differ more in appearance and have more occlusion, making matching harder.

Lecture notes: [Lecture 13 · Disparity and depth error](../13-depth-stereo.en.md)

## 5. Epipolar rig (Lecture 14)

<!-- figure: epipolar-rig -->

**What this device is**: two box cameras with ground glass at the back, on an optical bench; camera 2 is further forward and rotated by 9°, and the two cameras are not rectified. A thin thread runs from camera 1's lens to a distant target board, with a bead on it; another thin string runs from the bead to camera 2's lens; and a baseline string runs from lens 1 to camera 2's ground glass.

**The concept**: a point x in image 1 only fixes a line of sight, with unknown depth. Every point on that line of sight projects into image 2 onto one epipolar line l′ = F x, that is, x′ᵀ F x = 0. All epipolar lines pass through the epipole e′, which is the image of the other camera's centre.

**How to play**: hover over the rail or use the left/right arrow keys to move the bead; the up/down arrow keys or buttons A, B, C change the image point in image 1.

**What to watch**: the bright dot on camera 2's ground glass only moves along the engraved line, and the readout "0.0 px from epipolar line" never changes; when you change the image point, the engraved line pivots around the point where the baseline passes through the glass.

**Common misconceptions**: F x is a line in image 2, not the location of the corresponding point; the epipolar constraint only narrows the search from the whole image to a line and has not yet found the match. The image on the ground glass is upside down, which is simply how pinhole imaging works.

Lecture notes: [Lecture 14 · The epipolar constraint](../14-two-view-geometry.en.md)

## Putting it together

The whole pipeline can be remembered like this: **Harris** finds points that "change when shifted slightly", which are the easiest to find again in the other image; candidate matches based on appearance similarity always contain errors, so **Hough** (each point votes for all possible models) or **RANSAC** (propose models at random and let all points vote) finds the most consistent geometric relationship. Once we have corresponding points, the **epipolar constraint** tells us a correspondence can only lie on one line, turning the search from 2D into 1D; when the two cameras are aligned, that line is the same row, and **stereo** only needs to measure the horizontal offset d to compute depth with z = f·b/d.

## Hands-on self-test

1. On the Harris probe, roughly what are the two eigenvalues on a straight edge? Why is R negative?
2. After switching the Hough voting machine to fine bins, why does the peak vote count actually go down?
3. On the RANSAC pegboard, change the outlier ratio from 30% to 50%. How many ticks does the dial go from and to? Check it once with the formula.
4. When the stereo rangefinder's baseline is widened from 10 cm to 16 cm, roughly what fraction of its previous length does the shaded segment shrink to at the same depth?
5. On the epipolar rig, why can the image in camera 2 only move along one line as the bead moves along the line of sight?
