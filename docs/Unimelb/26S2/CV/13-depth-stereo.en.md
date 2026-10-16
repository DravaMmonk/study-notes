# COMP90086 Lecture 13 - Depth and Stereo

Sources: `lecture/COMP90086_13_depth-stereo.pdf` (32 pages) and `transcript/COMP90086_2026_SM2 Week-07-W-transcript.txt`. Filed under Canvas Week 7; page numbers below are PDF page numbers, and buttons in the screenshots are not interactive.

This lecture answers: **a photo only has planar coordinates, so how do we know how far each location is from the camera?** We first look at what a single image lets us guess, then use two images to measure, and finally understand learned depth prediction.

Learning path: [Depth cues](#topic-1) → [Disparity and error](#topic-2) → [Correspondences and consistency](#topic-3) → [Learned depth](#topic-4).

Key point: the conditions and units of $z=fb/d$. Hard part: why distant depth is less accurate, and how matching affects the result. Common mistake: a plausible guess from a single image is not the same as a measured true distance.

<a id="topic-1"></a>
## 1. Depth cues: which are guesses and which are measurements

### Why a single image cannot directly give distance

![PDF 6 - Single-view depth cues](assets/13-depth-stereo/slide-06.png)

Reading the figure from left to right: lines that are originally parallel seem to converge, floor tiles look denser the farther away they are, and occlusion and the familiar size of objects also hint at what is in front and behind. All of these judgements rely on assumptions, e.g. that the tiles are actually the same size, or that the lines really are parallel in the world.

**Understanding example (my own)**: a small toy car close to the camera can occupy the same pixel extent as a large car far away. From size alone, we cannot distinguish "the object is small" from "the object is far away". So monocular cues are useful, but can be fooled by special staging.

Two cameras viewing the same point from different positions obtain different projections. If the camera parameters and the distance between the two cameras are known, the position can be found from the two lines of sight. We still have to find the same physical point correctly; the geometric formula will not automatically fix a wrong correspondence.

<a id="topic-2"></a>
## 2. Key point: computing depth from disparity

### The formula for aligned cameras

![PDF 10 - Stereo geometry and uncertainty](assets/13-depth-stereo/slide-10.png)

In the figure, $O,O'$ are the two camera centres, and $b$ is the distance between them, called the **baseline**. The two lines of sight meet at the scene point $P$; the coloured region shows the range of possible spatial positions when pixel localisation is imprecise.

First use the simplified setting of this lecture: the two images are aligned, the focal lengths are equal, and corresponding points lie on the same row. Denote the horizontal coordinates by $x,x'$; the **disparity** is $d=x-x'$. The horizontal coordinates must use a consistent origin convention, e.g. with each image's principal-point offset already subtracted. By similar triangles:

$$
\frac{z}{b}=\frac{f}{d}
\quad\Longrightarrow\quad z=\frac{fb}{d}.
$$

- $z$ : the depth of the point; $b$ : the baseline length; both in the same unit.
- $f$ : focal length; $d$ : horizontal offset; both in the same unit, usually pixels.
- Under the left/right camera convention above, near points have large disparity and far points have small disparity.

> **Lecturer's words**: "So Z is the focal length times the baseline divided by the disparity."
>
> **Interpretation**: what really has to be found from the two images is the disparity; the focal length and baseline should come from the camera setup or calibration and cannot be skipped because of this sentence.

**Understanding example (my own)**: with $f=800$ pixels, $b=0.1$ metres and $d=40$ pixels, $z=2$ metres. If the disparity is only 20 pixels, the depth becomes 4 metres. Pixels cancel between numerator and denominator, so the result is still in metres.

### Hard part: the same one-pixel error is worse far away

![PDF 12 - Depth error](assets/13-depth-stereo/slide-12.png)

The figure first differentiates $z=fb/d$, then substitutes $d=fb/z$ back in. The magnitude of the derivative tells us how much the depth changes when the disparity changes slightly:

$$
\frac{\partial z}{\partial d}=-\frac{fb}{d^2},
\qquad
|\Delta z|\approx\frac{z^2}{fb}|\Delta d|.
$$

Here $\Delta d$ is a small disparity measurement error. If the distance doubles while focal length, baseline and disparity error stay the same, the depth error becomes roughly four times larger. Far away, the two lines of sight are almost parallel, so a tiny change in direction moves the intersection a long way forwards or backwards.

**Common mistake**: a wider baseline improves ranging accuracy, but the appearance difference and occlusion between the two images can also grow, making matching harder. You cannot widen the baseline indefinitely just by looking at the formula.

<!-- figure: stereo-rangefinder -->

<a id="topic-3"></a>
## 3. Correspondences: compare appearance first, then require global plausibility

### Why only one row needs to be searched

![PDF 25 - Rectification](assets/13-depth-stereo/slide-25.png)

In the figure, $H_1,H_2$ each remap one of the two images so that corresponding epipolar lines become the same image row; this is called **rectification**. After that, a pixel in the left image only needs to search along the same row of the right image for its correspondence, rather than the whole image. Why the transformation is possible is explained in [Two-View Geometry](14-two-view-geometry.en.md).

Note: corresponding points in two arbitrary raw photos do not naturally lie on the same row; the depth formula above relied on this alignment condition.

### Compare with windows, not a single pixel

![PDF 16 - SSD and normalised correlation](assets/13-depth-stereo/slide-16.png)

Compare the small patch around a left-image pixel with each candidate patch on the same row of the right image. The figure gives two scores:

- **SSD (sum of squared differences)**: subtract at corresponding positions, square and sum; smaller means more similar. Different exposures in the two cameras can also produce a large difference.
- **NCC (normalised correlation)**: first subtract each window's mean, then divide by each vector's length, and compare the remaining shape of variation; larger means more similar. It reduces the effect of overall brightness offsets and proportional gain.

Here the $w,w'$ in the figure's NCC should be read as windows that have already had their own means subtracted. When a window is almost constant, there is not enough variation to compare, and normalisation cannot create localisation cues out of nothing.

![PDF 18 - Window size comparison](assets/13-depth-stereo/slide-18.png)

On the left is the input, in the middle the depth map from a small window, and on the right the result from a large window. The middle one keeps detail but has many noisy speckles; the right one is smoother but blends boundaries such as thin branches together. The reason is that a large window may contain both foreground and background, which should not share the same depth.

**Common mistake: the lowest cost does not mean a true correspondence exists.** Blank walls lack texture; brick walls repeat; occluded points are invisible in the other image; specular highlights move with viewing direction. These cases respectively lead to "cannot localise precisely", "multiple candidates", "no correspondence at all" and "inconsistent appearance".

### Hard part: let neighbouring answers decide jointly

![PDF 22 - Matching and smoothness energy](assets/13-depth-stereo/slide-22.png)

This page writes the quality of the whole disparity map $D$ as a single total score. Abbreviate the first term as the matching cost $C_i(D_i)$ when pixel $i$ chooses disparity $D_i$:

$$
E(D)=\sum_i C_i(D_i)
+\lambda\sum_{(i,j)\in\mathcal N}\rho(D_i-D_j).
$$

The first term asks left and right patches to be similar; the second asks that neighbours' disparities usually not differ too much. $\mathcal N$ is the set of adjacent pixel pairs, $\rho$ measures the cost of a difference, and $\lambda$ sets how strong the smoothness requirement is.

If $\lambda$ is too small, speckles are hard to remove; if too large, real object boundaries get smoothed away too. So "smoothness" should allow depth jumps rather than require the whole image to be identical. Unlike choosing the lowest cost independently for each pixel, the choice at one location now affects its neighbours, so they must be solved jointly.

**Supplement**: the slides use graph cut to show how to find a good global solution; with many disparities, one can repeatedly compare "keep the current value" against "switch to some candidate value". Master the objective first, then learn the solver details. Uniqueness and ordering along a row are also common constraints, but occlusion, transparent objects and thin foreground structures break these simple assumptions.

<a id="topic-4"></a>
## 4. Learned depth: one image at inference, but training still needs a signal

### Depth labels and stereo self-supervision

Supervised methods feed the image into a network, predict a depth for each pixel, and compare it with depth-camera or LiDAR measurements. The coarse-to-fine network in the slides first predicts the overall layout, then fills in local detail. A log-depth loss is used to focus on relative error; for example, a one-metre error up close means something different from a one-metre error very far away.

![PDF 29 - Stereo supervision](assets/13-depth-stereo/slide-29.png)

The pipeline on the left has the network predict disparity and then uses it to remap one image into the other; on the right, the original image, reference depth and predicted depth are compared. The training objective comes from "is the reconstructed other view similar?", so per-pixel depth labels can be avoided.

**Common mistake**: not using depth labels is not the same as having no supervision signal. Training still relies on stereo image pairs, the geometric setup and the reconstruction loss; appearance consistency, smoothness and left-right consistency jointly constrain the prediction.

### Learned scale cannot be separated from training conditions

A monocular network exploits size, perspective and scene regularities in the data. Indoor training data do not guarantee coverage of distant outdoor objects; predictions also tend to be blurry at boundaries. If the focal length or scene-scale assumptions do not match, the output in metres may be off overall.

For this week's readings see [Reading Links](READING-LINKS.md). First be able to explain the disparity formula and matching failures, then look at the monocular depth demos.

### Workshop 8: what to watch when tuning windows

`workshop/week-08/worksheet08.ipynb` asks you to vary `numDisparities` and `blockSize`, and to compare BM and SGBM. The former changes the disparity search range, the latter the local matching window; observe missed matches, speckles and depth boundaries for each. **Common mistake**: the disparity map an algorithm outputs is not inherently a depth map in metres; it must be converted using this lecture's camera parameters. There is no official solution for Week 8 yet, and the exercise was not run this time.

## Self-test for this lecture

1. With the same cameras, how does depth change when disparity halves? And when the distance doubles, how is the same disparity error amplified?
2. Why can a large matching window reduce noise but damage object boundaries?
3. In stereo training without depth labels, what exactly is used to judge whether the network's prediction is good?
