# COMP90086 Lecture 11 - Local Features

Sources: `lecture/COMP90086-11-features.pdf` (31 pages, Week 6 Lecture 1) and `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt` (original file `W-transcript-5.txt`). The cover still says Semester 2, 2025; based on this offering, the Week heading and the lecture content, it is filed under 2026 Week 6. All page numbers are PDF page numbers, and interactive views appear as static screenshots in the PDF.

Moving from [Representation Learning](10-representations.en.md) to geometry: the previous lecture asked "what is in the image"; this lecture starts asking "can the same location be found again in a different photo". **First detect points worth finding, then describe the appearance around them.** The Harris derivation is the core of this lecture, and SIFT explains how to make descriptions that can still be compared after the image changes.

Learning path: [which points are easy to find again](#topic-1) → [Harris: from shift cost to corners](#topic-2) → [limits of detection and other scores](#topic-3) → [how SIFT makes comparison easy](#topic-4).

Key points: change in two directions at a corner, the Harris score, the SIFT descriptor. Hard part: connecting the shift cost to the matrix and its eigenvalues. Common mistakes: a strong gradient is not a corner, and 128 dimensions is not 128 points.

<a id="topic-1"></a>
## 1. Choosing locations: which points are easy to find again

### Should local features keep their positions

![PPT 6 - Three uses of local features](assets/11-features/slide-06.png)

**Local features** describe the appearance of a small region of an image. The slides divide their uses into three kinds:

- **Bag of words / bag of features**: summarise which local features are present, ignoring their exact positions.
- **Spatial pyramid**: keeps rough regional relationships; this lecture only mentions it and does not go into the algorithm.
- **Explicit spatial relations**: keeps the geometric relationships between features, used for keypoint tracking and matching. The slides also list deformable part models; here you only need to know that they model the positional relationships between parts.

The difference between these methods is not just "which features are extracted", but also "how much position is kept after extraction". To align two photos, it is not enough to know that both contain a few similar patches; you also need to know where each of them is.

> **Lecturer's words**: "We're going to use the where in a geometry sense."
>
> **Interpretation**: from here on we keep not only the descriptor but also its position in the image; otherwise the geometric relationship between two photos cannot be established.

### Which points are worth finding again and again

![PPT 10 - Shift a window over the flower garden](assets/11-features/slide-10.png)

**Dense** methods compute features at every position; **sparse** methods select only a small number of points, reducing the number of descriptions and comparisons. This lecture takes the sparse route, so we first have to define what an **interest point / keypoint** is.

What matters is not how bright a single pixel is, but whether the surrounding patch is easy to recognise again. A good point should have **repeatability**: after a change in viewpoint, rotation or lighting, there is still a chance of detecting the same physical location. It also needs local distinctiveness; it must not look almost identical to its immediate neighbours.

![PPT 11 - Uniform, edge and corner](assets/11-features/slide-11.png)

Imagine moving each of the slide's three windows slightly:

- **Flat / uniform**: moving in any direction looks about the same, so you cannot tell which point was the original.
- **Edge**: moving across the edge changes a lot, but sliding along the edge changes little, so the position along the edge is hard to pin down.
- **Corner**: moving in any direction changes the window's content, making the position easier to lock down.

A corner here is a property of local intensity variation; it does not have to be a right-angled building corner that a human would recognise. The local structure of the flowers in the slide's garden can provide such points as well.

<a id="topic-2"></a>
## 2. Hard part: Harris, from shift cost to corners

### Writing "changes a lot after moving" as a formula

![PPT 12 - Weighted squared difference](assets/11-features/slide-12.png)

$$
E(u,v)=\sum_{x,y}w(x,y)\left[I(x+u,y+v)-I(x,y)\right]^2.
$$

Term by term: $I(x,y)$ is the intensity of a pixel in the window; $(u,v)$ is the horizontal and vertical shift, in pixels in image coordinates; the difference compares the brightness at the same relative position before and after the shift; squaring prevents positive and negative differences from cancelling; finally everything is summed over the window.

  $w(x,y)\ge0$ is the window weight. A box window weights all pixels in the window equally; a Gaussian window gives larger weight to the centre pixels and smaller weight to those near the edge. $E$ is a weighted sum of squared differences, not a "corner probability".

  $E(0,0)=0$ always holds, because with no shift the patch is identical to itself. What we care about is **whether it increases quickly in every direction as we move away from zero shift**, not whether its value at zero is large.

### Why one small matrix is enough

![PPT 13 - Taylor expansion](assets/11-features/slide-13.png)

You have seen in calculus how derivatives approximate small changes. Here we use a two-dimensional first-order Taylor expansion:

$$
I(x+u,y+v)\approx I(x,y)+uI_x+vI_y,
\qquad I_x=\frac{\partial I}{\partial x},\quad I_y=\frac{\partial I}{\partial y}.
$$

  $I_x,I_y$ are the rates of change of brightness along the two axes at the current position. Substituting back into the previous formula, $I(x,y)$ cancels, giving:

$$
E(u,v)\approx\sum_{x,y}w(x,y)(uI_x+vI_y)^2
=\begin{bmatrix}u&v\end{bmatrix}M\begin{bmatrix}u\\v\end{bmatrix}.
$$

This approximation only holds for small shifts; it means we do not have to re-compare the whole window for every candidate shift.

![PPT 14 - The matrix M](assets/11-features/slide-14.png)

$$
M=\sum_{x,y}w(x,y)
\begin{bmatrix}
I_x^2&I_xI_y\\
I_xI_y&I_y^2
\end{bmatrix}.
$$

  $M$ is a $2\times2$ matrix that summarises the gradient information of a window. The top-left entry records the strength of horizontal change, the bottom-right records the strength of vertical change, and the two identical off-diagonal entries record how changes in the two directions relate.

Writing $M=\begin{bmatrix}A&B\\B&C\end{bmatrix}$ , we get $E\approx Au^2+2Buv+Cv^2$ . So this matrix determines the cost of moving in different directions. Do not read $I_x^2$ as a second derivative: it is **the square of a first derivative**.

### Why eigenvalues can tell edges from corners

![PPT 15 - Eigenvalues and unit shifts](assets/11-features/slide-15.png)

An **eigenvector** is a special direction that does not change when the matrix is applied; an **eigenvalue** is the scaling along that direction. Let $M e_i=\lambda_i e_i$ and set the direction vector's length to 1; then the approximate shift cost in that direction is $e_i^\top M e_i=\lambda_i$ .

  $M$ is symmetric and made of non-negatively weighted squared terms, so both eigenvalues are non-negative. Write $\lambda_1\ge\lambda_2\ge0$ ; among shift directions of length 1, the lowest approximate cost is $\lambda_2$ and the highest is $\lambda_1$ . This compares the local quadratic model using unit directions; it does not mean the Taylor approximation is exact for arbitrarily large shifts.

The slide title "On a unit shift, E is an eigenvalue" should be read together with the body text: it equals the corresponding eigenvalue **along a unit eigenvector direction**; for a general unit direction the value lies between the two.

![PPT 17 - Both eigenvalues must be large](assets/11-features/slide-17.png)

| Window type | Eigenvalues | What moving the window means |
| --- | --- | --- |
| Flat | Both small | Easy to slide in every direction |
| Edge | One large, one small | There is still a low-cost sliding direction |
| Corner | Both large | Even the easiest direction to move in has a large cost |

The key to understanding corners is "even the weakest direction is strong", not merely "there is one very strong gradient". A single edge can also have a very strong gradient.

> **Lecturer's words**: "E is a weighted sum of squares and it can't be negative,"
>
> **Interpretation**: if computing this squared difference directly gives a negative value, check your implementation first; it is different from the Harris response R later on, which can be negative.

### From the matrix to the points actually detected

![PPT 18 - Harris response](assets/11-features/slide-18.png)

The **Harris response** uses the determinant and the trace to avoid an explicit eigenvalue decomposition:

$$
R=\det(M)-k\left(\operatorname{tr}(M)\right)^2
=\lambda_1\lambda_2-k(\lambda_1+\lambda_2)^2.
$$

The **determinant** is the product of the two eigenvalues; the **trace** is the sum of the main diagonal, which is also the sum of the two eigenvalues. For $M=\begin{bmatrix}A&B\\B&C\end{bmatrix}$ , compute directly $\det(M)=AC-B^2$ and $\operatorname{tr}(M)=A+C$ .

  $k$ is an empirical parameter; the slides give about $0.04$ – $0.06$ . It penalises the case where "the total change is large but concentrated mainly in one direction": in flat regions $R$ is close to 0, on edges it is usually negative, and corner candidates have a large positive response. You cannot keep every point just because $R>0$ ; you also need a strength threshold.

![PPT 19 - Response and non-max suppression](assets/11-features/slide-19.png)

Implementing it following the method from class, the steps are:

1. Compute $I_x,I_y$ from the greyscale image.
2. Take weighted sums of $I_x^2,I_xI_y,I_y^2$ over a local window to get $A,B,C$ at each position.
3. Compute $R=AC-B^2-k(A+C)^2$ , giving a response map.
4. Discard responses below the threshold.
5. Apply **non-maximum suppression**: keep only the peak within each local neighbourhood, so that one corner does not report a cluster of points around it.

The window size, $k$ and the threshold each control something different: how large a neighbourhood is summarised, how edges are penalised, and how strong a response must be to be accepted. The slide's room example shows the original image, the response and the final corners side by side, and you should check them in that order too.

<!-- figure: harris-probe -->

<a id="topic-3"></a>
## 3. Limits of detection and other scores

### What Harris can and cannot do, and other detectors

![PPT 20 - Harris invariances](assets/11-features/slide-20.png)

When the image is translated, the local gradient structure and the response move with it; under in-plane rotation, the eigenvector directions of the ideal local model change but the eigenvalues do not. The slides therefore call it translation/rotation invariant. The point here is that the corresponding corners can still be detected; **the coordinates are not invariant**.

Under a global brightness offset the gradients are fairly stable; but "tolerant to lighting changes" does not mean absolutely invariant to any change in brightness. A fixed window is also **not scale invariant**: after zooming in, a corner that was sharp in the original window may become just a gently curving line locally.

<details>
<summary>Extension (optional): why a brightness gain affects a fixed threshold</summary>

<p>Deriving further from the formulas in this lecture: if the new image is I′ = aI + b, the constant offset b disappears when differentiating; the gradient is multiplied by a, the matrix M by a², and the Harris response R by a⁴. So the corner structure may be preserved, but the response values change, and a fixed threshold is not guaranteed to keep exactly the same points. This is a supplementary derivation for the slide's "tolerant".</p>

</details>

![PPT 21 - Other corner scores](assets/11-features/slide-21.png)

**Shi–Tomasi** uses $\min(\lambda_1,\lambda_2)$ directly, i.e. the strength of the weakest direction. **Brown–Szeliski–Winder** uses $\det(M)/\operatorname{tr}(M)$ ; when the trace is non-zero, this equals half the harmonic mean of the two eigenvalues. Neither score needs Harris's $k$ , but a detection threshold still has to be chosen.

A **blob detector** looks for local regional structure; a **learned detector** uses a network to learn repeatable points, with SuperPoint given as an example on the slide. These are brief introductions to other approaches; the one derived in detail in this lecture is still Harris.

<a id="topic-4"></a>
## 4. Describing appearance: how SIFT makes comparison easy

### Detecting a corner does not tell you what it matches

![PPT 24 - Corners in two views](assets/11-features/slide-24.png)

Look at the two building photos on the slide: each has many red dots, but the coordinates of a red dot alone cannot tell us which dot in the other image corresponds to it. The same physical location usually has different coordinates in the two images.

A **detector** answers "where is worth looking"; a **descriptor** answers "what does it look like there". The latter encodes the patch around a keypoint into a vector or code that can be compared.

Using the raw patch directly is simple, but changes in lighting, rotation and viewpoint alter the pixel values. The slides list the hand-designed SIFT, GLOH, BRIEF, BRISK and ORB, as well as learned descriptors. You do not need to memorise all the acronyms; first grasp the common goal: the same physical point should remain similar after changes, and different points should remain distinguishable.

### Why SIFT has 128 dimensions

![PPT 26 - Gradient histograms in cells](assets/11-features/slide-26.png)

The **SIFT (Scale-Invariant Feature Transform)** descriptor collects statistics of local gradient orientations rather than storing brightness pixel by pixel. A **histogram** groups values into bins and accumulates them; here what is binned is orientation.

Reading the figure: each arrow on the left is a pixel's gradient, its direction showing the direction in which brightness increases and its length showing the strength of the change. The window is divided into cells, and each cell accumulates gradients by orientation; gradients with the same orientation together increase the value of the corresponding bin. Strong gradients get large weights, and gradients close to the centre also get greater influence through a Gaussian weighting.

The figure only draws $2\times2$ cells for clarity; this **is not the number of cells in the final descriptor**.

![PPT 27 - SIFT dimensions](assets/11-features/slide-27.png)

The full setup on the slide is: a standard descriptor window of $16\times16$ pixels, divided into $4\times4$ cells, each with 8 orientation bins, so:

$$
\text{descriptor length}=4\times4\times8=128.
$$

128 dimensions is not 128 corners; it is 128 descriptor values for one keypoint. The spatial cells still preserve local layout; the orientations of the whole window are not all mixed into a single histogram.

The slides and transcript describe normalisation as "normalise → clip large values at 0.2 → normalise again", using sum-to-1 as an intuitive explanation. For now, remember its teaching purpose: reduce differences in overall intensity and stop a few very strong gradients from dominating the description; do not take this brief classroom summary as a complete specification of a SIFT implementation.

### Align scale and orientation before comparing

![PPT 28 - Scale and dominant orientation](assets/11-features/slide-28.png)

When the **scale** grows, the same physical region occupies more pixels in the image. SIFT detects at multiple scales, selects the scale with a suitable response, and then builds the descriptor region at that scale, so patches from the two images can correspond to the same part of the object.

The **dominant orientation** is the locally most prominent gradient direction. When building the descriptor, the dominant orientation is used as the reference, instead of always using the horizontal axis of the whole image. After the camera rotates, if the region and its dominant orientation rotate together, the relative orientations in the descriptor stay fairly stable.

These two steps deal respectively with "how big is the same local structure" and "which way does it face", and then gradient statistics describe the appearance. They improve stability, but do not guarantee a unique match under severe occlusion, arbitrary 3-D viewpoints or repeated textures.

The next lecture puts the candidate matches produced by comparing descriptors into a single geometric model to check them. **Similar appearance is candidate evidence; only consistent spatial relationships further support a correspondence.**

### Workshop 7: keep the window parameters separate from the score parameter

`workshop/week-07/worksheet07.ipynb` uses `cornerHarris`. There, `blockSize` controls the neighbourhood over which gradients are summed, `ksize` controls the size of the derivative operator, and `k` controls the penalty term in the Harris score. They correspond to different steps in this lecture and should not all be understood as "corner sensitivity".

## Self-test

1. Why is a position on a straight edge harder to pin down uniquely than a corner?
2. What does it mean when both eigenvalues of the Harris matrix are large?
3. How do you count SIFT's 128 dimensions, and what change does each of scale and dominant orientation deal with?
