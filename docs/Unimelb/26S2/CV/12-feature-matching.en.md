# COMP90086 Lecture 12 - Feature Matching

Sources: `lecture/COMP90086_12_feature-matching.pdf` (29 pages, Week 6 Lecture 2) and `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` (original file `F-transcript-5.txt`). The main content follows the slide order; the Week 6 Readings & Links are kept only in a collapsed section at the end. Page numbers are PDF page numbers; the webcam views, buttons and sliders in the screenshots cannot be operated.

Continuing from [Local Features](11-features.en.md): with keypoints and descriptors we can propose "these two points might correspond". This lecture goes further and asks: **can a single geometric transformation explain how the positions of a set of matched points change?** We study, in turn, wrong matches, Hough voting and RANSAC random sampling, and finally connect them to instance recognition of a book cover.

Learning path: [telling noise from outliers](#topic-1) → [turning consistency into voting](#topic-2) → [sampling and probability in RANSAC](#topic-3) → [filter candidates, estimate, check](#topic-4).

Key points: geometric consistency, RANSAC, homography. Hard part: the two probabilities in the number of sampling rounds. Common mistakes: the nearest neighbour does not guarantee a correspondence, four point pairs are not four single points, and a planar model cannot be applied freely to a full 3-D scene.

<a id="topic-1"></a>
## 1. The matching problem: telling noise from outliers

### Why similar appearance is not enough

![PPT 5 - Matching two views of a toy truck](assets/12-feature-matching/slide-05.png)

The toy truck on the slide looks different from two viewpoints. A **correspondence** means two image locations come from the same physical point; **matching** is the process of finding such relationships.

The difficulty is not only that the patches look different. A point may be occluded or out of frame in the other image, so it has no visible counterpart at all; the background and repeated structures may also provide very similar false candidates. The transcript explains this with similar desk corners and chairs in a classroom: every local piece looks alike, so you cannot tell which desk it is from appearance alone.

So we need to check **geometric consistency**: can these candidate correspondences all obey one transformation together? What this lecture actually estimates is the **homography** of a plane seen from different viewpoints. The truck image at the start illustrates the matching problem; it does not mean the whole 3-D truck can be fully explained by a single planar transformation.

> **Lecturer's words**: "Today we're going to look at planar geometry, so this is what's called a homography,"
>
> **Interpretation**: here the lecturer limits the scope of the model; a book cover fits this assumption, while 3-D objects sticking out of the paper may not.

### Noise and outliers are not the same kind of error

![PPT 8 - Noise, outliers and model fitting](assets/12-feature-matching/slide-08.png)

**Model fitting** means choosing parameters so that a model explains the observations. The model here can be just a line, or a geometric transformation between images; it is not necessarily a neural network.

- **Noise**: the relationship is basically correct, but the measured position is off, e.g. a corner localised a few pixels away.
- **Outlier**: does not obey the target model at all, e.g. a book corner matched to a desk corner in the background.
- **Inlier**: data that supports the current model within the allowed error.

**Least squares** sums the squares of all residuals. It can handle measurement deviations under a suitable noise assumption, but it is easily pulled away by large-error outliers, because a large error has a huge influence once squared.

PPT 9 introduces **voting**: let the data support the models compatible with it, and look for where the support concentrates. Hough and RANSAC share this idea; they differ in how candidate models are proposed.

<a id="topic-2"></a>
## 2. Hough: turning consistency into voting

### Hough turns "find a line" into "find a peak"

![PPT 12 - Image space and parameter space](assets/12-feature-matching/slide-12.png)

The **Hough transform** first represents the model by its parameters, then lets the observed points vote for compatible parameters.

Start with the familiar line $y=mx+b$ : $m$ is the slope and $b$ is the intercept. A point $(x_i,y_i)$ in an image can lie on many lines; fixing this point, all feasible parameters satisfy:

$$
b=y_i-mx_i.
$$

In **image space** this is a point, but in **parameter space** $(m,b)$ it is a line. If several image points come from the same line, their voting traces in parameter space pass through a common location; that location gives the parameters of the shared line.

The slope becomes very large near vertical lines. So the slides switch to the normal form:

$$
\rho=x\cos\theta+y\sin\theta.
$$

  $\theta$ is the angle between the line's **normal vector** and the horizontal axis, not the angle of the line itself to the horizontal axis; $\rho$ is the signed distance from the origin to the line along that normal. For each image point, enumerate $\theta$ and compute the corresponding $\rho$ ; this traces a sinusoid in parameter space. The curves of several collinear points intersect at the same $(\theta,\rho)$ .

So when the top of the slide says "it is a line in parameter space", that refers to the earlier $(m,b)$ representation; the $(\theta,\rho)$ plot below shows curves. Do not mix up these two stages.

### Why bin the space, and how to read the vote table

![PPT 13 - Quantised accumulator](assets/12-feature-matching/slide-13.png)

Real points are noisy, so the voting traces may only come close rather than intersect exactly at one point. The solution is **quantisation**: divide the continuous parameter space into small cells (**bins**) and accumulate the votes falling in the same cell. This table of counts is called the **accumulator**.

A **peak** is a cell with locally high votes. The neighbouring large numbers circled on the slide show that many observations support similar line parameters. A peak corresponds to an infinitely extended line; the start and end of a line segment need extra processing.

![PPT 14 - Edges, accumulator and recovered lines](assets/12-feature-matching/slide-14.png)

Read the three images in order: the original image first produces edge points; the edge points vote into the accumulator; the high peaks are selected and turned back into lines/segments in the original image. Edge detection only tells you "where there are brightness changes"; Hough goes further to organise "which edge points can belong to the same line".

![PPT 15 - Hough parameters](assets/12-feature-matching/slide-15.png)

| Parameter | Too small / too low | Too large / too high |
| --- | --- | --- |
| Bin size | Noisy votes from the same line get split up | Different lines merge together |
| Peak threshold | Weaker chance clusters of votes may be accepted | Real but weaker lines disappear |
| Number of peaks | Other structures may be missed | Weak peaks may be included |
| Minimum length | Very short fragments are kept | Short real segments are discarded |
| Maximum gap | The same segment easily breaks apart | Separate fragments may be joined |

These parameters correspond to different decisions; you cannot fix everything by tuning a single "sensitivity".

<!-- figure: hough-accumulator -->

### Why Hough is not suited to searching an eight-dimensional transformation directly

![PPT 16 - Dimension and grid size](assets/12-feature-matching/slide-16.png)

A line needs two parameters; a circle needs three: the horizontal and vertical coordinates of its centre and its radius. If each dimension uses $B$ bins, a $d$-dimensional accumulator has $B^d$ cells; $B$ is the resolution per dimension and $d$ is the number of independent parameters.

The homography on the slide has 8 degrees of freedom, so even with only 10 bins per dimension there are $10^8$ cells. This is **the number of grid cells exploding as the parameter dimension grows**. What class discusses here is exhaustive grid-style Hough; it does not mean every observation votes for every cell — an observation only supports models compatible with it.

Next we switch approach: instead of enumerating the whole grid in advance, let a few data points generate a model directly, then verify it with the rest of the data.

<a id="topic-3"></a>
## 3. Hard part: sampling and probability in RANSAC

### What one round of RANSAC actually does

![PPT 19 - RANSAC line-fitting loop](assets/12-feature-matching/slide-19.png)

**RANSAC** stands for RANdom SAmple Consensus. First use the line example from the slide:

1. Randomly draw two distinct points. Two points are the minimal sample that determines a line.
2. Compute the line through these two points, i.e. a **hypothesis** (candidate model).
3. Compute the distance from every data point to the line.
4. Points whose distance is below the threshold $\delta$ cast a supporting vote, forming the **consensus set**, i.e. the set of inliers for this model.
5. If this round's support is higher than the current best, save it.
6. Repeat for a number of rounds; at the end, refit using all the inliers of the best model to reduce the effect of measurement noise.

The two sampled points are only responsible for proposing the model; **evaluation looks at all the points**. What is saved should also not just be a model that "has zero error because it passes through the sampled points", since any two points can be fitted that way.

  $\delta$ is the inlier threshold, not the number of iterations. For geometric distances in pixel coordinates its unit can be pixels; it should be chosen according to the localisation error of correct matches. Too narrow loses correct points; too wide accepts wrong ones. The slides suggest letting correct measurements fall within the threshold with high probability, e.g. 95%.

**Refit** means re-estimating the parameters using all the inliers that were selected; it does not mean adding back the outliers that were rejected. The initial minimal sample is sensitive to noise, and more trustworthy points help stabilise the estimate.

### How many rounds are needed, derived step by step

![PPT 20 - RANSAC iteration probability](assets/12-feature-matching/slide-20.png)

Using the slide's notation: $p$ is the probability that a random point is an inlier; $n$ is the minimum number of samples a model needs; $k$ is the number of sampling rounds; $P$ is the desired probability of drawing an all-inlier sample at least once. $P$ and $p$ are different, and $n$ is not the size of the whole dataset.

Under the independent-sampling approximation used in class:

$$
\Pr(\text{one round is all inliers})=p^n.
$$

The probability that one round contains at least one outlier is $1-p^n$ ; the probability that $k$ rounds in a row all fail to draw an all-inlier sample is $(1-p^n)^k$ . So we want:

$$
1-(1-p^n)^k\ge P.
$$

Rearranging gives:

$$
k\ge\frac{\log(1-P)}{\log(1-p^n)},\qquad 0<p<1,\quad 0<P<1.
$$

The denominator is negative, so when dividing by it after taking logs the inequality sign flips. Finally round up.

Slide example: half the points are outliers, i.e. $p=0.5$ ; a line needs $n=2$ ; we require $P=0.99$ :

$$
k\ge\frac{\log0.01}{\log0.75}\approx16.008,
$$

so at least **17 rounds** are needed, not 16. This means the probability of "drawing at least one all-inlier minimal sample" reaches the target; it is not an unconditional guarantee that the final output is correct.

<!-- figure: ransac-pegboard -->

<details>
<summary>Extension (optional): how to understand RANSAC's cost and guarantees accurately</summary>

<p>The slides contrast it with Hough as "not depending on the dimension of the parameter space". More precisely, it avoids an exhaustive high-dimensional grid, but more complex models usually need a larger minimal sample n; from the formula on this page, a larger n lowers the probability of success per round. Each round also has to check all the data, so the amount of data still affects running time. The slides' statement that "outliers will never agree with each other" is an idealised intuition: repeated structures or another moving object may also support a wrong model, so the threshold, the model assumptions and the distribution of inliers still need to be checked.</p>

</details>

<a id="topic-4"></a>
## 4. Planar alignment: filter candidates, estimate, check

### First use the distance ratio test to reduce ambiguous matches

![PPT 22 - Candidate descriptor matches](assets/12-feature-matching/slide-22.png)

**Instance recognition** asks "is this that specific object", e.g. whether this particular cover of the same book appears in both images; recognising only "both are books" is not enough.

First detect keypoints in both images and compute SIFT descriptors. For each descriptor in the left image, find the nearest candidate in the right image. The slide's book-cover example produces 1722 candidates, of which the figure shows only 150. Even though each point found its "nearest" match, it may just be the relatively nearest of many unsuitable candidates.

![PPT 23 - Nearest-to-second-nearest distance ratio](assets/12-feature-matching/slide-23.png)

The **ratio test** compares the first-ranked and second-ranked candidates:

$$
\frac{d_1}{d_2}<r.
$$

  $d_1$ is the distance to the nearest descriptor, $d_2$ is the distance to the second-nearest descriptor, and $r$ is the acceptance threshold. Smaller distance means more similar; a ratio clearly below 1 means the first candidate is well ahead; a ratio close to 1 means the two candidates are almost equally good and the match is ambiguous.

![PPT 24 - Ratio test at 0.8](assets/12-feature-matching/slide-24.png)

The slide uses $r=0.8$ , keeping 1156 of the 1722 candidates. Of the original 563 wrong matches, 465 are removed, while 101 of the 1159 correct matches are also lost. So $98$ wrong and $1058$ correct matches remain, with wrong matches making up about $98/1156\approx8.5\%$ , which the slides write as about 8%. These are example figures from the slides, not results re-run for these notes.

The distance ratio test improves the quality of the candidates but does not check geometric relationships, so RANSAC is still needed. Reducing outliers also raises the $p$ from the previous section, making it easier to obtain an all-inlier sample.

### Why a homography needs four point pairs

![PPT 25 - Transformation families and degrees of freedom](assets/12-feature-matching/slide-25.png)

**Degrees of freedom** are the number of independent parameters. Following the slide's table, from most to least constrained: translation has 2, planar rigid (Euclidean) transformation 3, similarity transformation 4, affine transformation 6, and projective transformation 8.

An **affine** transformation keeps parallel lines parallel; a **projective transformation** allows lines that were parallel to converge in the image. When a book cover is photographed at an angle, its rectangle may become a trapezoid, so a more general planar projective model is needed.

![PPT 26 - Four point pairs for eight unknowns](assets/12-feature-matching/slide-26.png)

A homography is represented by a $3\times3$ matrix $H$ ; scaling it by an overall factor does not change its projective result, so it has 8 independent degrees of freedom. One pair of corresponding points provides two constraints, the target's horizontal and vertical coordinates; so at least **4 pairs of corresponding points** are needed, not four individual points in total.

The slide's four-corner example also helps show that well-spread points on the plane should be used. Do not crowd all the points along one edge. Here we study planar relationships; the geometric constraints of general non-planar 3-D scenes come later in the course.

### Connecting the whole pipeline

![PPT 27 - Homography consensus and image alignment](assets/12-feature-matching/slide-27.png)

Following the content of this lecture:

1. Input two images of the same plane.
2. Detect keypoints and compute descriptors in each.
3. Find each descriptor's first and second nearest neighbours, and filter candidates with the distance ratio test.
4. In each RANSAC round, draw 4 usable pairs of correspondences and fit a homography.
5. Use this transformation to predict where all candidate points land in the other image; matches within the geometric error threshold support it.
6. Keep the model with the most support, refit it on its inliers and check the alignment result.

A **warp** maps the first image into the coordinates of the second image according to the estimated relationship. PPT 27 shows that in another example run, 138 of 193 matches support the same homography and 55 are excluded. These are not the same numbers as the 1156 matches from PPT 24 processed further.

The slide's parameter panel gives $\delta=3$ px and 150 iterations. These are the settings of that demo, not recommended values for all data. Watching which green lines are kept and which red lines are rejected, and whether the book covers overlap, helps you understand the model's result better than just seeing "a matrix was estimated".

The applications listed in the course include instance recognition, video stabilisation, panorama stitching, plane and vanishing point detection, and 3-D reconstruction. These applications share the ideas of features and robust fitting, but they do not all use the same planar model.

### How Hough and RANSAC compare

| Question | Hough | RANSAC |
| --- | --- | --- |
| Where candidate models come from | Searching a gridded parameter space | Generated from random minimal samples |
| How data supports a model | Voting for compatible parameter cells | Counted as an inlier if the residual is below the threshold |
| Key limitation in this lecture | High-dimensional grids are too large | Needs more rounds when the inlier ratio is low or the sample size is large |
| Main parameters | Bins, peak threshold, segment settings | Inlier threshold, number of rounds, model type |
| Where it is used in this lecture | Explaining line detection and voting | Fitting a planar transformation from candidate correspondences |

<details>
<summary>Extra: reading and demos</summary>

All links are in the [Week 6 reading index](READING-LINKS.md). Just observe how Hough accumulates votes and how RANSAC samples repeatedly; external demos may score with truncated residuals, which is not necessarily the same as the inlier-counting version in the slides.

</details>

### Workshop 7: from descriptor candidates to locating a book cover

`workshop/week-07/worksheet07.ipynb` connects Hough, Harris, SIFT, nearest-neighbour search and homography estimation. FLANN is a tool for speeding up nearest-neighbour lookup; it proposes candidates but is not responsible for proving geometric correspondence.

<details>
<summary>Extension: the direction of the ratio test in the exercise text</summary>

<p>The original exercise text says "keep only if the ratio is greater than the threshold"; following this lecture's formula and the exercise code, it should be understood as accepting a match only when the nearest distance is clearly smaller than the second-nearest distance. A distance ratio close to 1 means the candidates are hard to tell apart, not that the match is more reliable.</p>

</details>

## Self-test

1. What do a Hough peak and a RANSAC consensus set each represent?
2. When the inlier ratio drops, why are more rounds needed to reach the same success probability?
3. Why do matches that have already passed the distance ratio test still need a geometric check?
