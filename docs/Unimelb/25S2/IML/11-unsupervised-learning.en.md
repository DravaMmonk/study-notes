# COMP90049 Lecture 18 - Unsupervised Learning: Clustering

Sources: `lecture/18-unsupervised.pdf` (p.1–98; its cover says Lecture 19); Apple Notes: CS/25S2/IML — "W9L18 Unsupervised Learning", "★5 Evaluation" (clustering-metrics part).

This lecture asks: **without labels, how do we find "groups of similar items" from the data alone, and how do we judge whether a grouping is good?**

Learning path: [Unsupervised learning and clustering assumptions](#topic-1) → [K-means](#topic-2) → [Choosing K: what makes a good clustering](#topic-3) → [Hierarchical clustering](#topic-4) → [Evaluating clusters](#topic-5).

Key points: the assign–update loop of K-means, computing the three linkages by hand, WCSS/BCSS/CH. Hard parts: the two conditional entropies in homogeneity and completeness. Common mistakes: forgetting to normalise first; reversing the conditioning in homogeneity and completeness; the numbers on slide p.90 are wrong.

<a id="topic-1"></a>
## 1. Unsupervised learning and clustering assumptions

### Supervised versus unsupervised

![Slide 04 - Supervised vs unsupervised learning](assets/11-unsupervised-learning/slide-04.png)

The top half is **supervised learning**: the training data are already sorted into Apple / Banana columns, and the trained model, given a new apple, predicts "Apple". The bottom half is **unsupervised learning**: the training data are a pile of unnamed fruit, and the model outputs not class names but three circles — apples in one group, watermelons in one, bananas in one. It only knows "these look alike", not what the group is called.

The datasets so far all had instances, features and a clear target class. But finding the correct label for an instance is often hard and expensive (usually done by hand), so labelled data are limited, while unlabelled data are far more plentiful.
<!-- Sources: L18 p.3-5 -->

Common unsupervised tasks:

| Type | What it does |
| --- | --- |
| PCA | Extracts the most essential information from data with many features (dimensionality reduction) |
| Clustering | Finds groups of instances that are similar to each other |
| Anomaly detection | Finds rare, suspicious cases that differ from the established pattern; see [15](15-anomaly-detection.en.md) |
| Association rule mining | Predicts whether an item occurs given the other items in a transaction (e.g. {Diaper} → {Beer}) |
<!-- Sources: L18 p.6-7 -->

### Five questions to settle before clustering

Clustering learns structure from the data alone, but we usually bring our own assumptions about that structure:
<!-- Sources: L18 p.9-12 -->

| Question | Two options |
| --- | --- |
| Can an instance belong to more than one cluster? | Exclusive vs overlapping |
| Can it belong to a cluster partially, to some degree? | Deterministic / hard vs probabilistic / soft |
| Do clusters contain each other (nested as a tree)? | Hierarchical vs partitioning |
| Must every point be assigned to a cluster? | Complete vs partial |
| Do clusters differ widely in size, shape and density? | Homogeneous vs heterogeneous |
<!-- Sources: L18 p.12-17 -->

![Slide 14 - Hard vs soft clustering](assets/11-unsupervised-learning/slide-14.png)

The left plot is hard clustering: each point belongs to exactly one cluster (green dot or blue hexagon). The right plot is soft clustering: the brackets give the probabilities of belonging to (first cluster, second cluster). (0.99, 0.01) almost certainly belongs to the first cluster, (0.02, 0.98) almost certainly to the second, while the light-blue point in between, (0.51, 0.49), is roughly even.
<!-- Sources: L18 p.14 -->

![Slide 15 - Hierarchical vs partitioning](assets/11-unsupervised-learning/slide-15.png)

On the left, the large yellow ellipse contains green and grey ellipses, and the grey one contains a still smaller ellipse: hierarchical clusters contain one another and can be drawn as a tree. On the right, three blue ellipses contain nothing of each other: partitional clustering cuts the data into side-by-side pieces.
<!-- Sources: L18 p.15 -->

![Slide 17 - Homogeneous vs heterogeneous clusters](assets/11-unsupervised-learning/slide-17.png)

On the left, the two blobs are similar in size, density and shape (homogeneous). On the right, the top shows a large sparse blob next to a small dense red one; the bottom shows a "smiley face": a ring outside, two eyes and a mouth inside, all completely different in size and shape (heterogeneous). We will see that K-means handles exactly this kind of data badly.

Both algorithms in this lecture are exclusive, deterministic and complete; K-means is partitional, agglomerative clustering is hierarchical.
<!-- Sources: L18 p.18 -->

**Common mistake: normalise first.** Many clustering methods are distance based, so each attribute usually needs to be scaled into $[0,1]$ first; otherwise attributes with large ranges dominate the distance (see [scaling numeric features in 00](00-ml-concepts.en.md#topic-4)).
<!-- Sources: L18 p.19 -->

<a id="topic-2"></a>
## 2. K-means

### The algorithm: an assign-and-update loop

![Slide 22 - K-means algorithm](assets/11-unsupervised-learning/slide-22.png)

This slide is the whole algorithm. The "→ K" at the top right is a reminder that **the number of clusters $K$ is given by the user in advance**. Then two steps repeat: assign each instance to the nearest **centroid**, then recompute each centroid as the mean of all points in its cluster.

```text
ask the user for the number of clusters K
randomly pick K points as the initial centroids (seeds)
repeat
    assign each instance to the cluster with the nearest centroid
    recompute the centroid (mean) of each cluster
until the centroids do not change
      (or the change is below a threshold, or few points change clusters)
```
<!-- Sources: L18 p.22 -->

The three coloured words at the bottom of the page say K-means is an **exclusive, complete, partitional** clustering method; it tends to produce **compact, spherical clusters**.
<!-- Sources: L18 p.22 -->

### One run: from iteration 1 to iteration 7

![Slide 23 - K-means iteration 1](assets/11-unsupervised-learning/slide-23.png)

![Slide 29 - K-means iteration 7](assets/11-unsupervised-learning/slide-29.png)

Both plots show the same 2D data; the crosses are the current centroids and a point's colour is its current cluster. In iteration 1 all three centroids sit near the upper blob, so the upper blob is shared among red, blue and green, and the two lower blobs are simply given to the nearest of green and blue. Slides p.24–28 show the iterations in between: each round, every centroid moves a little towards the centre of "its" blob. By iteration 7 the three crosses sit at the centres of the three blobs, the colours match the three blobs the eye sees, and further iterations no longer move the centroids, so the algorithm stops.
<!-- Sources: L18 p.23-29 -->

<details markdown="1">
<summary>Extension (optional): why K-means always stops</summary>

Neither step can increase the within-cluster sum of squares (WCSS, defined in [the next section](#topic-3)): the assignment step sends each point to its nearest centroid, so each point's squared distance can only fall or stay the same; in the update step, the mean is exactly the point that minimises the sum of squared distances to the points in the cluster. WCSS never increases, and there are only finitely many ways to split $N$ points into $K$ groups, so the algorithm must stop after finitely many steps. But it stops at a **local optimum**, not necessarily the globally best split — which is why it is "sensitive to the initial centroids" below.

</details>

### Limitations

- "Mean" is not defined for categorical attributes;
- Sensitive to outliers: an outlier pulls the centroid;
- Sensitive to the initial centroids: different initialisations can converge to sub-optimal solutions;
- Cannot handle non-spherical clusters, or clusters of very different sizes or densities;
- $K$ must be given in advance.
<!-- Sources: L18 p.30-35 -->

![Slide 30 - Sensitivity to outliers](assets/11-unsupervised-learning/slide-30.png)

In (A), the outlier on the right is forced into a cluster, the centroid (+) is dragged into the empty middle, and the cluster becomes a long strip; (B) is the ideal result: two compact clusters, with the outlier left on its own. Because a mean is pulled by extreme values, a single point can distort a whole cluster.

![Slide 31 - Sensitivity to initial centroids](assets/11-unsupervised-learning/slide-31.png)

On the left are the ideal three clusters (green top, red bottom-left, blue bottom-right); on the right, two runs with the same $K=3$ , differing only in their initial centroids, both split the upper blob into green and blue halves and merge the two lower blobs into one red cluster. Both runs converged, but both are sub-optimal. In practice one runs several initialisations and keeps the run with the smallest WCSS.
<!-- Sources: L18 p.31 -->

![Slide 32 - Non-spherical clusters](assets/11-unsupervised-learning/slide-32.png)

The top row shows two crescent moons: the ideal split follows the crescent shapes, one red and one blue; K-means ( $K=2$ ) instead draws a straight line by distance to the two centroids and cuts a piece off each crescent. The bottom row is the "smiley face": K-means ( $K=3$ ) cuts the plane into three wedge-shaped regions, blue, red and green, slicing through the ring, the eyes and the mouth. The reason is that a K-means boundary is always the straight dividing line of "which centroid is nearer", so it can only cut out convex pieces. Slides p.33–34 show in the same way that clusters of different sizes or different densities are also split wrongly.
<!-- Sources: L18 p.32 -->

Strengths: simple and easy to understand; computationally efficient and converges fairly quickly, suitable for large data; results are easy to interpret and visualise; widely applicable, and works well when clusters are roughly spherical and well separated.
<!-- Sources: L18 p.36 -->

<a id="topic-3"></a>
## 3. Choosing K: what makes a good clustering

### The elbow method

![Slide 37 - Elbow method](assets/11-unsupervised-learning/slide-37.png)

The horizontal axis is the number of clusters $k$ , the vertical axis is the error (distortion, i.e. the WCSS below; the red circle on the left marks "Error"). From $k=1$ to $k=3$ the curve drops steeply, marked by green dashed lines; after $k=3$ (the red cross, "Elbow Point") the decrease clearly flattens. The **elbow method** picks this turning point, $k=3$ .

Why not simply pick the $k$ with the smallest error? Because the error always decreases as $k$ grows (it is 0 when every point is its own cluster), so the minimum is meaningless; we want the place where "adding one more cluster buys little improvement".
<!-- Sources: L18 p.37, p.41 -->

### Two criteria for a good clustering

![Slide 38 - Cohesion and separation](assets/11-unsupervised-learning/slide-38.png)

The red arrows join points **inside the same cluster**: the closer the better, which is called **cohesion**. The purple arrows go **between different clusters**: the farther the better, which is called **separation**. A good clustering has both (or at least one). Cohesion is measured by the within-cluster sum of squares, separation by the between-cluster sum of squares (see [Evaluating clusters](#topic-5)).
<!-- Sources: L18 p.38-39 -->

### Within-cluster sum of squares

![Slide 40 - WCSS as K grows](assets/11-unsupervised-learning/slide-40.png)

The **within-cluster sum of squares (WCSS)** adds up the squared distance from each point to the centroid of its cluster:

$$
\mathrm{WCSS}=\sum_{j=1}^{K}\sum_{x_i\in C_j}(x_i-\mu_j)^2 ,
$$

where $C_j$ is the $j$ -th cluster and $\mu_j$ its mean (centroid); for multidimensional data $(x_i-\mu_j)^2$ means the squared Euclidean distance $\lVert x_i-\mu_j\rVert^2$ . The smaller the WCSS, the more compact the clusters.

The bottom row shows $K=1,2,3$ from left to right: in one big circle the points are far from the centre (×); with two clusters, the green elongated ellipse is still loose; with three clusters every small circle is tight. WCSS keeps decreasing as $K$ grows, and plotting it gives the elbow curve above. The procedure is: run the clustering for a range of $K$ , compute the WCSS of each run, plot them, and look for the point where the decrease slows down markedly.
<!-- Sources: L18 p.40, p.73 -->

<a id="topic-4"></a>
## 4. Hierarchical clustering

### The dendrogram

![Slide 44 - Dendrogram](assets/11-unsupervised-learning/slide-44.png)

Hierarchical clustering produces a set of nested clusters, drawn as a **dendrogram**: the points are at the bottom, the vertical axis (distance) is the distance between two clusters when they merge, and the height of a horizontal bar is the distance at which that merge happened. The red-circled numbers 1–5 are the merge order and match the numbers on the nested circles on the right: first 1 and 3 merge (lowest), then 2 and 5, … and finally everything merges into one cluster at the top. Drawing a horizontal line at some height "cuts" the dendrogram, and the number of vertical lines it crosses is the number of clusters.
<!-- Sources: L18 p.44, p.69 -->

Two directions: **agglomerative (bottom-up)** starts with every point as its own cluster and merges the two closest clusters at each step; **divisive (top-down)** starts with one big cluster and splits one cluster at each step. Both are based on a distance (dissimilarity) matrix.
<!-- Sources: L18 p.45 -->

### The agglomerative algorithm

![Slide 46 - Agglomerative clustering steps](assets/11-unsupervised-learning/slide-46.png)

Read the nine small plots on the right left to right, top to bottom: 9 points, each its own cluster → 8 clusters (the two closest points circled) → 7 clusters → … → 1 cluster (all circles inside one big circle). Each step performs exactly one merge, and the pseudocode on the left is this process:

```text
compute the distance (dissimilarity) matrix
let each data point be a cluster
repeat
    merge the two closest clusters
    update the distance matrix
until only a single cluster remains
```
<!-- Sources: L18 p.46 -->

### Distance between clusters: linkage

![Slide 48 - Four linkage definitions](assets/11-unsupervised-learning/slide-48.png)

The key operation is: how do we measure the distance between two **clusters**? The lines in the four pairs of circles on the right show four definitions:

- **Single linkage**: the distance between the closest pair of points across the two clusters, $D(c_1,c_2)=\min D(x_1,x_2)$ ;
- **Complete linkage**: the distance between the farthest pair, $D(c_1,c_2)=\max D(x_1,x_2)$ ;
- **Average linkage**: the average over all cross-cluster pairs, $D(c_1,c_2)=\frac{1}{\lvert c_1\rvert\,\lvert c_2\rvert}\sum_{x_1\in c_1}\sum_{x_2\in c_2}D(x_1,x_2)$ ;
- **Centroid method**: the distance between the two clusters' centroids.

| Linkage | Strength | Weakness |
| --- | --- | --- |
| Single | Can handle non-spherical shapes | Sensitive to noise and outliers |
| Complete | Less sensitive to noise and outliers | Tends to give spherical clusters of similar diameter; tends to break large clusters |
| Centroid | — | Can violate the hierarchical structure; sensitive to outliers |
<!-- Sources: L18 p.49-50, p.61-65, p.68 -->

### A worked example: single and complete linkage

The distance matrix from the slides:

| | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | 15 | 30 | 5 | 10 |
| 2 | 15 | 0 | 35 | 20 | 25 |
| 3 | 30 | 35 | 0 | 50 | 40 |
| 4 | 5 | 20 | 50 | 0 | 45 |
| 5 | 10 | 25 | 40 | 45 | 0 |
<!-- Sources: L18 p.51 -->

![Slide 54 - Updating the distance matrix after merging 1 and 4](assets/11-unsupervised-learning/slide-54.png)

The first step is the same for both linkages: the smallest distance is 1–4 (5, orange in the left table), so {1,4} is merged first. Then the distances from {1,4} to the other points must be updated. Look at the two green cells in the left table: 1 to 2 is 15, 4 to 2 is 20. Single linkage takes the smaller, 15 (top-right table); complete linkage takes the larger, 20 (bottom-right table). The same is done for 3 and 5:

| | to 2 | to 3 | to 5 |
| --- | --- | --- | --- |
| Single (take min) | min(15,20)=15 | min(30,50)=30 | min(10,45)=10 |
| Complete (take max) | max(15,20)=20 | max(30,50)=50 | max(10,45)=45 |
<!-- Sources: L18 p.52-56 -->

- **Single linkage**: the next smallest is 10, so {1,4,5} merge; then 2 joins at 15; finally 3 joins at 30.
- **Complete linkage**: the next smallest is 20 ({1,4} with 2), so {1,4,2} merge; for the remaining {3,5} the distance 40 is smaller than {1,4,2} to 3 (50) or to 5 (45), so {3,5} merge; finally everything merges at 50.
<!-- Sources: L18 p.57-59 -->

![Slide 60 - Single vs complete linkage dendrograms](assets/11-unsupervised-learning/slide-60.png)

The original distance matrix is in the middle, with the two results on either side. The complete-linkage tree on the left: {1,4} merge first, then 2 is attached, while 5 and 3 form their own branch on the other side; the two big branches meet at the top (50), so cutting into two clusters gives {1,4,2} and {3,5}. The single-linkage tree on the right is a "chain" in which points are attached one at a time: {1,4} takes 5, then 2, and 3 joins only at the end, with a final height of only 30 (the slide draws the lines for 2 and 5 slightly crossed, but the order is as above). Same matrix, different linkage, different tree.
<!-- Sources: L18 p.60 -->

### The weakness of single linkage: noise builds bridges

![Slide 62 - Single linkage is sensitive to noise](assets/11-unsupervised-learning/slide-62.png)

The original data on the left are a small blob and a large blob, with some scattered noise points between them. On the right is the single-linkage split into two clusters: the dark-blue cluster includes not only the small blob on the left but also follows the noise points into the edge of the large blob on the right, giving a very unnatural red/blue boundary. Because single linkage looks only at **the closest pair of points**, a string of noise points acting as a bridge is enough to "chain" two groups together; this is called **chaining**. Conversely, this same "closest points only" property is what lets it follow non-spherical shapes such as crescents and rings (p.61). Complete linkage looks at the farthest points and is insensitive to noise, but it will break a large cluster apart to favour spherical clusters of similar diameter (p.63–64).
<!-- Sources: L18 p.61-64 -->

### The centroid method

![Slide 66 - Centroid linkage example](assets/11-unsupervised-learning/slide-66.png)

This is **a different dataset**: the top-left table gives the 2D coordinates of 5 points and the bottom-left table their distances. Note that the distance here is the **Manhattan distance** $\lvert\Delta x\rvert+\lvert\Delta y\rvert$ ; for example point 1 $(0,10)$ to point 2 $(5,0)$ is $5+10=15$ ; and values such as 2–4 and 3–4 differ from the previous example, so do not mix the two tables.

The first step again merges 1 and 4, which are closest (5). After the merge, {1,4} is represented by the centroid of the two points, $(2.5,10)$ (top-right table), and its distances to the other points are recomputed (bottom-right table): to 2 it is $2.5+10=12.5$ , to 3 it is $7.5+20=27.5$ , to 5 it is $7.5+5=12.5$ . 2 and 5 tie, and the slides choose 2. Slide p.67 continues: the new centroid of {1,4,2} is taken as $(3.75,5)$ , its distance 18.75 to 5 is the smallest, so 5 merges; the centroid of {1,4,2,5}, $(-0.625,10)$ , is 30.625 from 3, which merges last.
<!-- Sources: L18 p.66-67 -->

**Note:** the slides' new centroid is "the midpoint of the two merged clusters' centroids": the midpoint of (2.5,10) and point 2 (5,0) is (3.75,5). Averaging the three points of {1,4,2} directly would give $(10/3,\ 20/3)\approx(3.33,6.67)$ . Both update rules are in use, so when computing by hand first check which one the question uses.

![Slide 68 - Centroid, complete and single linkage dendrograms](assets/11-unsupervised-learning/slide-68.png)

The three trees side by side. The centroid-method tree on the left: {1,4} → add 2 → add 5 → add 3, with merge heights 5, 12.5, 18.75, 30.625. The red arrow and the text below flag two problems of the centroid method: it **can violate the hierarchical structure**, and, like K-means, it is **sensitive to outliers** (a centroid is a mean).
<!-- Sources: L18 p.68 -->

**Extension (making sense of the warning on p.68):** in this example the heights actually increase monotonically, and the tree is not "upside down"; the arrow is about a general risk of the centroid method. Violating the hierarchy means an **inversion** can occur: a later merge happens at a smaller distance than an earlier one, so on the dendrogram a horizontal bar sits below the bar beneath it, and "cutting at a height" no longer gives consistent groupings. Worked example (my own): three points form an equilateral triangle with side 1 (Euclidean distance). Merge any two first, at height 1; their centroid is the midpoint of that side, whose distance to the third point is $\sqrt3/2\approx0.87<1$ , so the second merge is lower than the first. Single, complete and average linkage cannot produce this.

Strengths and weaknesses of hierarchical clustering:

- Strengths: no number of clusters needs to be assumed, since cutting the dendrogram gives any number; no assumption about cluster shape, size or density; the result may correspond to a meaningful taxonomy (e.g. biological classification).
- Weaknesses: a merge can never be undone, so a misplaced point stays in the wrong cluster forever; no objective function is directly minimised.
<!-- Sources: L18 p.69-70 -->

<a id="topic-5"></a>
## 5. Evaluating clusters

### Unsupervised metrics: cohesion and separation

Cohesion uses [WCSS](#topic-3) (smaller is better); separation uses the **between-cluster sum of squares (BCSS)** (larger is better):

$$
\mathrm{BCSS}=\sum_{j=1}^{K}n_j(\mu-\mu_j)^2 ,
$$

where $\mu$ is the mean of all the data and $\mu_j$ , $n_j$ are the mean and size of cluster $j$ . The farther each cluster's centroid is from the overall centre, and the larger the cluster, the larger the BCSS.
<!-- Sources: L18 p.38-39, p.72-74 -->

The **Calinski–Harabasz index** (also called the variance ratio criterion) combines both; larger is better:

$$
\mathrm{CH}=\frac{\mathrm{BCSS}}{\mathrm{WCSS}}\times\frac{N-K}{K-1},
$$

$N$ is the total number of data points and $K$ the number of clusters. The second factor offsets the built-in advantage that "WCSS gets smaller as $K$ grows".
<!-- Sources: L18 p.75 -->

![Slide 76 - CH index example](assets/11-unsupervised-learning/slide-76.png)

The data are 6 points on a number line, 0, 0.5, 1, 3, 4, 5 (there is no point at 2; it is only a tick), with overall mean $\mu=2.25$ . A splits them into left and right clusters; B uses three clusters, the middle one spanning the gap and putting 1 and 3 together. Slides p.77–83 work it out step by step:

| Option | Clusters | WCSS | BCSS | CH |
| --- | --- | --- | --- | --- |
| A ( $K=2$ ) | {0, 0.5, 1}, {3, 4, 5} | 0.5 + 2 = 2.5 | $3(1.75)^2+3(1.75)^2=18.375$ | $\frac{18.375}{2.5}\times\frac{4}{1}=29.4$ |
| B ( $K=3$ ) | {0, 0.5}, {1, 3}, {4, 5} | 0.125 + 2 + 0.5 = 2.625 | $2(2)^2+2(0.25)^2+2(2.25)^2=18.25$ | $\frac{18.25}{2.625}\times\frac{3}{2}\approx10.43$ |
<!-- Sources: L18 p.76-83 -->

A has the higher CH, so it is the better clustering: B uses one more cluster yet has a larger WCSS, because it puts 1 and 3, which are 2 apart, into the same cluster.

### Supervised metrics: homogeneity

If true labels are available, the clustering can be compared with the true classes. Let $C$ be the true classes and $K$ the clustering.
<!-- Sources: L18 p.84 -->

![Slide 85 - Homogeneity definition](assets/11-unsupervised-learning/slide-85.png)

**Homogeneity**: whether each cluster contains points of only one class.

$$
\text{homogeneity}=1-\frac{H(C\mid K)}{H(C)} .
$$

$H(C\mid K)$ is "how much uncertainty about the class remains once we know which cluster a point is in". If every cluster is pure, knowing the cluster tells us the class, $H(C\mid K)=0$ , and homogeneity is 1.
<!-- Sources: L18 p.85 -->

**Common mistake (slide typo):** the denominator of the middle expression on this slide is written $Y_{true}$ ; it should be $H(Y_{true})=H(C)$ . The last sentence says that $H(Y_{pred}\mid Y_{true})$ "will be 0"; by the definition on the same slide it should be $H(Y_{true}\mid Y_{pred})=H(C\mid K)$ . $H(K\mid C)$ belongs to completeness below. Mnemonic: homogeneity asks "**given the cluster**, how mixed are the classes?", so the condition is the cluster $K$ .

![Slide 86 - Homogeneity improves with more clusters](assets/11-unsupervised-learning/slide-86.png)

In the top row, smaller circles are drawn inside each of the three big circles; in the bottom row, every point gets a circle of its own. The finer the clusters, the more likely each cluster holds only one colour; with one point per cluster, homogeneity is necessarily 1. So **homogeneity alone rewards splitting clusters ever finer**, and completeness is needed to balance it.
<!-- Sources: L18 p.86 -->

### Supervised metrics: completeness

**Completeness**: whether all points of the same class end up in the same cluster.

$$
\text{completeness}=1-\frac{H(K\mid C)}{H(K)} .
$$

When it is perfect, $H(K\mid C)=0$ (knowing the class tells us the cluster) and completeness is 1. With one point per cluster, completeness is very low, because each class is split across many clusters.
<!-- Sources: L18 p.85-87 -->

### Example: three clusters, three colours

The conditional entropies are computed the same way as in [decision trees](03-DT.md), i.e. a weighted average of each group's entropy by group size (entropy is defined in [01 Probability](01-probability.md)):

$$
H(C\mid K)=\sum_k P(k)\,H(C\mid k),\qquad H(K\mid C)=\sum_c P(c)\,H(K\mid c).
$$

The slides' example (from p.88) divides 17 points into three clusters; counting the colours in each circle gives the contingency table:

| Cluster \ class | Red | Blue | Green | Total |
| --- | --- | --- | --- | --- |
| I | 5 | 1 | 0 | 6 |
| II | 1 | 4 | 1 | 6 |
| III | 2 | 0 | 3 | 5 |
| Total | 8 | 5 | 4 | 17 |
<!-- Sources: L18 p.88-95 -->

The class distribution 8/17, 5/17, 4/17 gives $H(C)\approx1.52$ (slide p.89 writes 1.527; the formula gives 1.522, a difference only in the third decimal).

![Slide 90 - Homogeneity calculation (contains an error)](assets/11-unsupervised-learning/slide-90.png)

This slide computes the class entropy cluster by cluster: cluster I is 5 red and 1 blue, cluster II is 1 red, 4 blue and 1 green, cluster III is 2 red and 3 green; the last line weights them by cluster sizes 6/17, 6/17, 5/17 to get $H(C\mid K)$ . The footer "Decision Tree lecture (lecture 5) – slide 45" at the bottom right is left over from copying an older slide and can be ignored.
<!-- Sources: L18 p.89-91 -->

**Extension (a correction to the slides' numbers):** $H(C\mid C_1)\approx0.65$ and $H(C\mid C_3)\approx0.97$ are correct, but $H(C\mid C_2)$ is not 0.81. Recomputing with the formula on the same slide:

$$
H(C\mid C_2)=-\Big(2\cdot\tfrac16\log_2\tfrac16+\tfrac46\log_2\tfrac46\Big)\approx0.862+0.390\approx1.25 .
$$

Therefore

$$
H(C\mid K)\approx\tfrac{6}{17}(0.65)+\tfrac{6}{17}(1.25)+\tfrac{5}{17}(0.97)\approx0.96,
\qquad
\text{homogeneity}\approx1-\frac{0.96}{1.52}\approx0.37,
$$

rather than the $1-0.799/1.527\approx0.477$ on slide p.91. (The slides' 0.799 is exactly what the wrong value 0.81 gives when weighted in.) The method is unchanged; only this one entropy is miscalculated. Sanity check: cluster II contains three colours, so its entropy should be larger than that of cluster III (0.97), which has only two; 0.81 is clearly too small.
<!-- Sources: L18 p.89-91 -->

![Slide 94 - Completeness calculation](assets/11-unsupervised-learning/slide-94.png)

Completeness groups the other way round, **by class**: the 8 red points are spread over clusters I, II, III as 5, 1, 2; the 5 blue points over I and II as 1, 4; the 4 green points over II and III as 1, 3. Each colour gets an "entropy of its cluster distribution", weighted by class sizes 8/17, 5/17, 4/17:

$$
H(K\mid C)=\tfrac{8}{17}(1.30)+\tfrac{5}{17}(0.722)+\tfrac{4}{17}(0.811)\approx1.01 .
$$

Cluster sizes 6/17, 6/17, 5/17 give $H(K)\approx1.58$ , so completeness $\approx1-1.01/1.58\approx0.36$ (p.96). These numbers all check out.
<!-- Sources: L18 p.92-96 -->

<details markdown="1">
<summary>Extension (optional): V-measure</summary>

The student notes also record the V-measure: the harmonic mean of homogeneity and completeness, $V=\dfrac{2\,h\,c}{h+c}$ , which combines both into one number (the same way F1 combines precision and recall; see [08 Evaluation](08-evaluation.en.md#topic-2)). With the corrected homogeneity 0.37 and completeness 0.36, this example gives $V\approx0.36$ . It is not in this lecture's slides.

</details>
<!-- Sources: Apple Notes W9L18 Unsupervised Learning -->

## Self-check

1. One-dimensional data 1, 2, 10, 11, 12, with $K=2$ and initial centroids 1 and 2. Run K-means by hand until it converges: what are the final clusters and WCSS? What if the initial centroids are 11 and 12 instead?
2. The data are two concentric rings. Of K-means, single linkage and complete linkage, which is most likely to separate the two rings? Why do the other two fail?
3. Use average linkage on the first distance matrix of this lecture: after merging {1,4}, what are the distances from {1,4} to 2, 3 and 5? What merges next?
4. Make every point its own cluster: what are homogeneity and completeness? Can the CH index be computed in this case?
5. Put all 17 points into a single cluster: what are homogeneity and completeness? Together with question 4, explain why the two metrics must be read together.
