# COMP90086 Lecture 14 - Two-view Geometry

Sources: `lecture/COMP90086_14_two-view-geometry.pdf` (33 pages) and `transcript/COMP90086_2026_SM2 Week-07-F-transcript.txt`. Filed under Canvas Week 7; page numbers are PDF page numbers.

This lecture answers: **when the cameras are not neatly side by side, where can a point appear in the other photo? Going further, can we recover the camera motion and the 3D scene?**

Learning path: [Coordinate tools](#topic-1) → [Cameras and planes](#topic-2) → [Epipolar constraint](#topic-3) → [Estimation and recovery](#topic-4).

Key points: homogeneous coordinates, the camera matrix, and what $H/E/F$ are used for. Hard part: understanding epipolar lines through coplanarity. Common mistakes: a point-to-line constraint is not a point-to-point mapping, and two images alone usually cannot determine true distances in metres.

<a id="topic-1"></a>
## 1. Coordinate tools: write one extra number to simplify computation

### Why homogeneous coordinates allow overall scaling

![PDF 6 - Homogeneous coordinates](assets/14-two-view-geometry/slide-06.png)

A 2D point $(u,v)$ is written as $p=(u,v,1)^\top$ . If we obtain $(a,b,c)^\top$ with $c\ne0$ , divide by the last entry to get back $(a/c,b/c)$ . So $(u,v,1)$ and $(2u,2v,2)$ represent the same point.

The arrow in the figure going from the three-vector back to the plane is exactly this division. The symbol $\sim$ means "equal up to a non-zero multiple", e.g. $p\sim2p$ ; it must not be treated as ordinary vector equality.

**Interpretation**: the division in perspective projection has not disappeared; it is just postponed until the coordinates are read out. A 3D world point is likewise written as $X=(X,Y,Z,1)^\top$ , so that translation can also be put into matrix multiplication.

### How points and lines are computed from each other

![PDF 7 - Points and lines](assets/14-two-view-geometry/slide-07.png)

The line $au+bv+c=0$ is represented by the vector $l=(a,b,c)^\top$ . A point lying on the line is equivalent to:

$$
l^\top p=0.
$$

In the figure two lines intersect; below, the intersection is obtained by a cross product. The **cross product** $a\times b$ yields a vector perpendicular to both 3D vectors, so it can be used for:

- The line through two points: $l=p_1\times p_2$ .
- The intersection of two lines: $p=l_1\times l_2$ , then read the coordinates back using the homogeneous rule.

**Common mistake**: here points and lines are both represented by three numbers, but they mean different things. An intersection whose last entry is 0 cannot be divided as usual; it represents a direction at infinity, e.g. the intersection of parallel lines in projective geometry.

<a id="topic-2"></a>
## 2. Cameras and planes: writing imaging as matrices

### Intrinsics, extrinsics and rigid motion

![PDF 12 - Camera matrix](assets/14-two-view-geometry/slide-12.png)

Read the multiplication in the figure from right to left: first transform the world point into camera coordinates, then into image coordinates. In one expression:

$$
p\sim K[R\mid t]X.
$$

- $R$ : a $3\times3$ rotation matrix describing the change of orientation.
- $t$ : a 3D translation vector; together with $R$ these are the **extrinsics**, determined by where the camera is and which way it faces.
- $K$ : the $3\times3$ **intrinsics**, the camera's own parameters such as focal length in pixel units and principal point position.

The $K$ in the figure uses the common zero-skew simplification. More general intrinsics also include pixel-axis skew, for five free parameters in total; rigid motion has three rotational and three translational degrees of freedom.

Rigid motion can be written on its own as:

$$
T=\begin{bmatrix}R&t\\0\ 0\ 0&1\end{bmatrix}.
$$

It preserves the shape and size of objects and does not include scaling. Multiple motions are multiplied in order, and the inverse matrix undoes a motion.

> **Lecturer's words**: "If I multiply two matrices of this sort, I get another matrix of this sort"
>
> **Interpretation**: moving the camera twice in a row can still be combined into one rotation plus translation; when computing, be consistent about "from which coordinate frame to which coordinate frame".

**Supplement: calibration**. Photograph a planar pattern of known size such as a checkerboard while changing the camera pose. Each image has different extrinsics but shared intrinsics, so together they constrain $K$ , after which lens distortion can be handled. The principal point is where the optical axis meets the image plane, and should not be assumed to be the exact image centre.

### Why a homography needs only one 3 × 3 matrix

![PDF 15 - Plane and homography](assets/14-two-view-geometry/slide-15.png)

The points on the book cover in the figure all lie on the same plane. Choosing this plane as $Z=0$ in world coordinates, the column of the camera matrix that multiplies $Z$ drops out:

$$
p\sim K[r_1\ r_2\ t]\begin{bmatrix}X\\Y\\1\end{bmatrix}
=H\begin{bmatrix}X\\Y\\1\end{bmatrix}.
$$

$r_1,r_2$ are the first two columns of $R$ . So the mapping from plane coordinates to image coordinates is represented by a single $H$ ; the plane mappings of two views can also be composed into an image-to-image $H$ . Its eight degrees of freedom, estimation from four point pairs and use with RANSAC are covered in [Lecture 12](12-feature-matching.en.md).

Another case is when the camera only rotates and its centre does not translate. Image changes for points at all depths can then be described by $H=K'RK^{-1}$ . Stereo rectification likewise changes the projection plane of each image separately, without first recovering each point's depth.

<a id="topic-3"></a>
## 3. Hard part: why a point constrains a line in the other image

### Look at coplanarity first, then the formula

![PDF 19 - Epipolar plane and lines](assets/14-two-view-geometry/slide-19.png)

In the figure, the two camera centres and the scene point form a plane called the **epipolar plane**. It cuts through the two image planes, giving each its **epipolar line**. Where the baseline passes through an image plane is the **epipole**, which can be thought of as the projection of the other camera centre into this image.

Fixing a point in the first image only determines one viewing ray in space; the point could be at different depths along that ray. Projecting these possible positions into the second image, they all fall on the same epipolar line. **This narrows the search range, but does not yet determine the specific corresponding point.**

<!-- figure: epipolar-rig -->

### The essential matrix E: using normalised camera coordinates

![PDF 21 - Cross product and essential matrix](assets/14-two-view-geometry/slide-21.png)

Denote the motion that takes first-camera coordinates to second-camera coordinates by $R,t$ . Let $x,x'$ be the normalised direction vectors of a corresponding point in the two cameras; then $Rx,x',t$ are coplanar. $t\times Rx$ is perpendicular to this plane, so its dot product with $x'$ is zero:

$$
x'^\top(t\times Rx)=x'^\top[t]_\times Rx=0,
\qquad E=[t]_\times R.
$$

$[t]_\times$ is the matrix form of "take the cross product with a fixed $t$ ", which the figure expands into ordinary multiplication. It is enough to remember what it is for: $E$ encodes the rotation and translation direction between the cameras, and gives $x'^\top Ex=0$ .

### The fundamental matrix F: folding in the intrinsics too

![PDF 23 - Fundamental matrix](assets/14-two-view-geometry/slide-23.png)

The figure first uses $x=K^{-1}p$ , $x'=K'^{-1}p'$ to turn pixel coordinates into normalised camera coordinates, then substitutes into the previous equation:

$$
p'^\top Fp=0,
\qquad F=K'^{-\top}EK^{-1}.
$$

| Matrix | Input and output / constraint | Conditions for use here |
| --- | --- | --- |
| $H$ homography | Maps one image point to another image point | Scene plane, or pure camera rotation |
| $E$ essential matrix | Two normalised directions satisfy the epipolar constraint | Known intrinsics, non-zero translation |
| $F$ fundamental matrix | Two pixel points satisfy the epipolar constraint | No need to know intrinsics in advance; estimation must avoid degenerate configurations |

**Common mistake**: $Fp$ is the coefficient vector of the epipolar line in the second image, not a pixel position in the second image. The corresponding point $p'$ only needs to lie on this line. The line in the reverse direction is $F^\top p'$ .

<a id="topic-4"></a>
## 4. Estimation and recovery: what we get and what is still missing

### How the eight-point algorithm sets up equations

Write a pair of corresponding points as $p=(u,v,1)^\top$ , $p'=(u',v',1)^\top$ . Expanding $p'^\top Fp=0$ gives one row of a linear equation:

$$
[u'u,\ u'v,\ u',\ v'u,\ v'v,\ v',\ u,\ v,\ 1]f=0.
$$

$f$ is the vector formed by arranging the nine entries of $F$ row by row. Eight well-placed, independent correspondences can be stacked into $Af=0$ ; the overall scale does not matter, so finding one non-zero direction suffices. With more points and noise, SVD (singular value decomposition) is used to find the direction with small error.

![PDF 26 - Normalisation and rank constraint](assets/14-two-view-geometry/slide-26.png)

On the left of the figure are epipolar lines from direct fitting; on the right, after imposing the rank constraint, the lines better match the structure of converging at the epipole. The practical pipeline also needs:

1. Translate and scale the points of each image separately so that the centroid is zero and the mean distance is $\sqrt2$ , improving numerical scale.
2. Solve the linear system, then set the smallest singular value of $F$ to zero so that its rank is 2.
3. Undo the coordinate normalisation; wrap everything in [RANSAC](12-feature-matching.en.md) to reject wrong matches.

**Common mistake**: $F$ has seven degrees of freedom, but here we use the eight-point algorithm because it makes the linear system easy to set up. Do not misremember "this algorithm samples eight pairs" as "every algorithm needs at least eight pairs in theory".

### From F to camera motion, then to 3D points

![PDF 29 - Motion and triangulation](assets/14-two-view-geometry/slide-29.png)

Read this page in order: with $K,K'$ known, first compute $E=K'^\top FK$ ; decompose $E$ into candidate rotations and translations; then pick the plausible solution by checking whether reconstructed points lie in front of both cameras.

**Triangulation** recovers the 3D position from the two viewing rays of a correspondence. With measurement error, the rays do not necessarily intersect exactly, so we look for the position most consistent with both observations.

**Key limitation: scale ambiguity.** Doubling the distance between the cameras and all distances in the scene at the same time leaves the projected images unchanged. So translation and depth recovered from two images alone are usually only determined up to a common scale; only a known baseline or a real length in the scene allows conversion to metres.

**Common mistake: degenerate cases**. Pure rotation has no baseline for measuring depth; with only planar correspondences, the $F$ of a general scene cannot be uniquely determined. The former should use the homography induced by rotation, and for the latter one should first detect the planar model; do not treat an arbitrary matrix output by software as a reliable 3D recovery.

**Supplement**: SfM (structure from motion) extends this process to many images and then jointly refines cameras and 3D points; SLAM simultaneously localises and maps as images keep arriving. For this lecture, mastering the two-view case is enough.

### Workshop 8: calibrate first, then check epipolar lines

`workshop/week-08/worksheet08.ipynb` first compares single-image and multi-image checkerboard calibration, then estimates F from feature matches and draws epipolar lines. Check whether points fall on their corresponding epipolar lines, rather than only whether the function returned a matrix. The original task also gives a known 10-metre baseline: when matches are valid, the configuration is non-degenerate and the intrinsics are known, this length can supply the missing scale information. This is a solution approach based on this lecture. The official solution has now been saved as `worksheet08_solution.ipynb` in the same directory and can be used to check results.

## Self-test for this lecture

1. Which 2D point does $(4,6,2)^\top$ correspond to? Why does multiplying homogeneous coordinates by a constant not change the result?
2. How do the geometric meanings of $H p$ and $F p$ differ?
3. Why, when the camera only rotates, are two sharp photos still not enough to recover depth from disparity?
