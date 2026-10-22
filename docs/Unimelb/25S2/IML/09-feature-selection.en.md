# COMP90049 Lecture 13 - Feature Selection

Sources: `lecture/13-featureselection.pdf`; Apple Notes: CS/25S2/IML — "W7L13 Feature Selection", "★2 Feature Engineering", "★1 Statistics", "★3.4 Cross-Model Strategies".

This lecture asks: **out of thousands of features, which ones really help, and how can we pick them in an acceptable amount of time?**

Learning path: [Why select, and how methods are classified](#topic-1) → [Univariate filters](#topic-2) → [Why multivariate selection is hard](#topic-3) → [Filters, wrappers and embedded methods](#topic-4) → [L1 regularisation](#topic-5).

Key points: S2N and mutual information; forward selection and backward elimination. Hard parts: the difference in training runs between wrapper and embedded methods. Common mistakes: univariate methods cannot see what features do in combination.

<a id="topic-1"></a>
## 1. Why select features

### Where feature selection sits in the pipeline

![Slide 04 - Feature selection in the supervised pipeline](assets/09-feature-selection/slide-04.png)

Follow the arrows: the prepared data is split into training, validation and test sets; the training set goes into the learning algorithm to produce a model, and the model's predictions on the validation set give a performance score. The **feature selection** box at the top right is linked to that validation performance by a dotted line: it decides which attributes are fed to the algorithm based on validation results. Only the final model is tested once on the test set.

A machine-learning practitioner has three jobs: inspect and clean the data; choose a model suited to the data; and **choose useful attributes for that model**.
<!-- Sources: L13 p.4-5 -->

### What makes a good feature

![Slide 07 - Select k of d features](assets/09-feature-selection/slide-07.png)

The data matrix $X$ in the figure has $n$ rows (instances) and $d$ columns (features); the yellow $k$ columns are the selected features. There are often thousands or even millions of low-level features, and feature selection keeps $k$ of the $d$ columns.

The main goal of good features is better performance on some evaluation metric; side benefits are that seeing important features can suggest other important ones, and fewer features give smaller models, faster answers and easier understanding.
<!-- Sources: L13 p.5-7 -->

### Four terms

| Term | Meaning |
| --- | --- |
| Univariate | Considers one feature at a time |
| Multivariate | Considers subsets of features together |
| Filter | Ranks features (or subsets) with statistics, independently of the classifier |
| Wrapper | Uses a classifier's performance to assess features (or subsets) |
<!-- Sources: L13 p.8 -->

<a id="topic-2"></a>
## 2. Univariate filter methods

Each attribute's "goodness" is judged on its own, independently of the model, in time linear in the number of attributes. A good single feature should be "correlated" with the label: it can predict the label by itself. "Correlated" is used loosely here, covering both continuous and discrete values.
<!-- Sources: L13 p.10 -->

### Continuous features: signal-to-noise ratio

![Slide 11 - Signal-to-noise ratio](assets/09-feature-selection/slide-11.png)

The blue and red bars are the two classes' distributions on feature $X_i$; $\mu_-$ and $\mu_+$ at the top mark the class means, and $\sigma_-$ and $\sigma_+$ at the bottom mark each class's standard deviation. The **signal-to-noise ratio (S2N)** is

$$
\mathrm{S2N}=\frac{\lvert\mu_{+}-\mu_{-}\rvert}{\sigma_{+}+\sigma_{-}} .
$$
<!-- Sources: L13 p.11 -->

The numerator is the distance between the class means (the signal); the denominator is each class's spread (the noise). The further apart and the tighter the two groups, the larger the S2N, and the better the feature separates the classes.
<!-- Sources: L13 p.11; Apple Notes W7L13 Feature Selection -->

### Discrete features: good and bad at a glance

![Slide 12 - Good and bad discrete features](assets/09-feature-selection/slide-12.png)

The two tables hold the same data; the green cells mark what to compare. Left table: both rows with $x_1=A$ have $c=Y$ and both rows with $x_1=B$ have $c=N$, so $x_1$ is probably a good feature. Right table: of the two rows with $x_2=C$, one is Y and one is N; $x_2$'s values show no pattern with $c$, so it is probably not good.
<!-- Sources: L13 p.12 -->

### Mutual information

![Slide 13 - Mutual information](assets/09-feature-selection/slide-13.png)

This dependence is quantified by **mutual information** $I(Y,X_i)$. The bottom of the slide shows the integral form for continuous variables (the boxes are missing PDF glyphs, originally integral signs and infinity symbols); we mainly use the discrete form on the next slide.

- $I(Y,X_i)=0$ : $Y$ and $X_i$ are independent;
- $I(Y,X_i)>0$ : they are dependent, and larger means stronger dependence; select features with high $I$ .
<!-- Sources: L13 p.13 -->

![Slide 14 - Empirical mutual information](assets/09-feature-selection/slide-14.png)

For discrete variables, training-set frequencies serve as empirical estimates of the probabilities. On the slide, $\delta(y,y_t)$ is 1 when the two are equal and 0 otherwise, so $\hat{P}(y,x_i)$ is simply "the number of examples taking both values ÷ $n$ ":

$$
\hat{I}(Y,X_i)=\sum_{y\in\{-1,+1\}}\ \sum_{x_i=1}^{k}\hat{P}(y,x_i)\log\frac{\hat{P}(y,x_i)}{\hat{P}(y)\,\hat{P}(x_i)} .
$$
<!-- Sources: L13 p.14 -->

Mutual information is the **information gain** used in [decision trees](03-DT.md), and it can also be computed from entropies (entropy is defined in [01 Probability](01-probability.md)):

$$
I(X;Y)=H(X)-H(X\mid Y)=H(Y)-H(Y\mid X).
$$
<!-- Sources: L13 p.16 -->

#### Working through the slide's data

![Slide 15 - Mutual information worked example](assets/09-feature-selection/slide-15.png)

On the left are the 8 instances; the two small tables in the middle count $\hat{P}(Y)$ and $\hat{P}(X_2)$ ; on the right is the joint frequency $\hat{P}(Y,X_2)$ , and the arrows show which two marginal probabilities each term's denominator uses. The expression at the bottom is the slide's substitution; the numbers are my own calculation:

| | $X_2=1$ | $X_2=2$ | $X_2=3$ |
| --- | --- | --- | --- |
| $Y=-1$ | 1/8 | 2/8 | 1/8 |
| $Y=+1$ | 2/8 | 0 | 2/8 |

Substituting term by term (base 2; terms with probability 0 count as 0):

$$
\hat{I}(Y,X_2)=2\cdot\tfrac{1}{8}\log_2\tfrac{2}{3}+\tfrac{2}{8}\log_2 2+2\cdot\tfrac{2}{8}\log_2\tfrac{4}{3}\approx-0.146+0.25+0.208=0.31\ \text{bits}.
$$
<!-- Sources: L13 p.15 -->

**Note: pointwise mutual information.** Each term $\log\frac{P(x,y)}{P(x)P(y)}$ in the formula is the **pointwise mutual information (PMI)**: 0 means $x$ and $y$ co-occur exactly as often as independence would predict; positive means they co-occur more often than expected (positive association); negative means less often. Mutual information is the average of PMI weighted by $P(x,y)$ . The negative terms above come from combinations that are "rarer than expected".
<!-- Sources: Apple Notes ★1 Statistics; L13 p.15 -->

### Other univariate methods

![Slide 17 - Chi-squared and ANOVA](assets/09-feature-selection/slide-17.png)

The slide gives two statistical tests, with scikit-learn's `SelectKBest` usage: swap the scoring function for `f_classif` (or `mutual_info_classif` on p.16) and keep the $k$ highest-scoring features. The next slide adds the correlation-based method; the three compare as follows:

| Method | Use |
| --- | --- |
| Chi-squared ( $\chi^2$ ) | Tests whether categorical variables are significantly associated; for classification with categorical features |
| ANOVA F-value | Assesses the significance of individual features; for classification with continuous features |
| Correlation-based feature selection (CFS) | Measures each feature's correlation with the target (e.g. Pearson) and keeps those with large absolute correlation |
<!-- Sources: L13 p.17-18 -->

<a id="topic-3"></a>
## 3. Why multivariate selection is hard

### Univariate selection can fail

![Slide 20 - Univariate selection may fail](assets/09-feature-selection/slide-20.png)

Look at the projections below and to the left of the axes: on $x_1$ alone or $x_2$ alone, circles and stars are mixed together; but with both features a single diagonal line (left) or a few lines (right) separate them. Each feature is "useless" alone yet very useful in combination — a univariate method misses this.
<!-- Sources: L13 p.20 -->

### Trying every subset

![Slide 22 - Exhaustive subset search](assets/09-feature-selection/slide-22.png)

The most direct multivariate method: train a model on every feature subset, evaluate it on the validation set, and keep the best (the table on the left runs from the empty set through single attributes to several). It finds the feature combination that is optimal on the validation data for **this learner**, but the sum on the right shows that $d$ features have

$$
\binom{d}{0}+\binom{d}{1}+\cdots+\binom{d}{d}=2^{d}
$$

subsets, which is impractical.
<!-- Sources: L13 p.21-22 -->

![Slide 23 - Lattice of feature subsets](assets/09-feature-selection/slide-23.png)

Each node of the **lattice** is a string of 0/1: a 1 in position $j$ means feature $j$ is selected. 0,0,0,0 at the top is the empty set and 1,1,1,1 at the bottom selects everything; an edge between adjacent levels adds or removes one feature. The red arrows give two examples: 1,1,0,0 selects features 1 and 2. Forward selection and backward elimination both walk along the edges of this graph.
<!-- Sources: L13 p.23 -->

If each "train + evaluate" cycle takes only 10 seconds, $2^d$ subsets take about $2^d/6$ minutes: roughly 3 hours for $d=10$ and about $3.2\times10^{15}$ hours for $d=60$ . It is feasible only with very few features.
<!-- Sources: L13 p.24 -->

### How to assess a feature subset

![Slide 25 - Feature subset assessment](assets/09-feature-selection/slide-25.png)

The data block on the left has $d$ features across and $n$ samples down, cut horizontally into $n_{train}$ , $n_{val}$ and $n_{test}$ . Train on the training set for each subset, keep the subset that is best on the validation set, and test once on the test set at the end. This is the same idea as hyperparameter tuning in [08 Evaluation](08-evaluation.en.md): data used during selection cannot also be used to report final performance.
<!-- Sources: L13 p.25 -->

**Key point: no method is universally better.** Data types, distributions and learning algorithms vary widely; mind the complexity, since univariate selection is sometimes better than multivariate; and feature selection is not always necessary.
<!-- Sources: L13 p.26 -->

<a id="topic-4"></a>
## 4. Filters, wrappers and embedded methods

| | Criterion | Search | Assessment |
| --- | --- | --- | --- |
| Filter | "Relevance" of a feature (subset) to the label $Y$ | Usually just sort | None directly; cross-validation may decide how many to keep |
| Wrapper | "Usefulness" of a feature subset for predicting $Y$ | Search the space of subsets, **training a new classifier for every candidate subset** | Cross-validation |
| Embedded | Same | Knowledge from the trained classifier guides the search, avoiding retraining for every candidate | Cross-validation; cheaper than a wrapper |
<!-- Sources: L13 p.28-30 -->

### Forward selection

![Slide 31 - Forward selection (wrapper)](assets/09-feature-selection/slide-31.png)

**Forward selection** starts from the empty set 0,0,0,0 at the top. The bold black arrows are the candidates tried at each step and the red node is the one kept: the first level tries all 4 single features and keeps 0,1,0,0; the second level tries 3 from there and keeps 1,1,0,0, and so on. The wrapper version needs $d+(d-1)+\cdots+1=\frac{d(d+1)}{2}=10$ train-evaluate cycles in total.
<!-- Sources: L13 p.31-32 -->

- Advantage: performs best when the optimal subset is **small**;
- Disadvantages: slow with many attributes; greedy, so it can settle on a sub-optimal (even bad) solution; infeasible on large data sets.
<!-- Sources: L13 p.32 -->

![Slide 33 - Forward selection (embedded)](assets/09-feature-selection/slide-33.png)

Compared with the previous slide, each level here has only one bold arrow: the embedded version takes the same kind of path, but at each step it uses information from the current classifier to decide which feature to add, training only once after adding it — only $d=4$ train-evaluate cycles in total.
<!-- Sources: L13 p.33 -->

### Backward elimination

![Slide 34 - Backward elimination (wrapper)](assets/09-feature-selection/slide-34.png)

**Backward elimination** goes the other way: it starts from the full set 1,1,1,1 at the bottom and removes one feature per step, so the arrows point upwards. The wrapper version again tries every candidate removal, $\frac{d(d+1)}{2}$ training runs in total.

![Slide 36 - Backward elimination (embedded)](assets/09-feature-selection/slide-36.png)

The embedded version follows a single edge per level and needs only $d$ training runs. Backward elimination removes the most irrelevant attributes right at the start and performs best when the optimal subset is **large**; its drawbacks are the same as forward selection's.
<!-- Sources: L13 p.34-36 -->

#### Example: recursive feature elimination with an SVM

![Slide 37 - Recursive feature elimination with SVM](assets/09-feature-selection/slide-37.png)

The boxes on the slide are missing PDF glyphs: the first formula has a summation sign $\sum$ , and the constraint has a dot product $\cdot$ followed by $\ge$ . A linear [SVM](06-SVM.md) minimises $\frac12\lVert\theta\rVert^2=\frac12\sum_j\theta_j^2$ . The red curved arrow at the bottom left marks the loop; embedded **recursive feature elimination (RFE)** is:

```text
S = {1, ..., d}                       # start with all features
repeat:
    train an SVM θ on the features in S
    j = the feature in S with the smallest θ_j^2
    S = S − {j}
    check that the validation error does not get worse
```

The feature with the smallest squared weight contributes least to the decision boundary, so it goes first; only one training run per step is needed. As a wrapper, you would ignore $\theta_j^2$ and instead train and evaluate a model for every candidate removal, then compare.
<!-- Sources: L13 p.37-38 -->

<a id="topic-5"></a>
## 5. L1 regularisation: selecting features during training

### L0: count the non-zero weights directly

![Slide 40 - L0-norm regularized SVM](assets/09-feature-selection/slide-40.png)

Another approach does not pick subsets at all but **makes the algorithm use fewer features directly**: change the SVM objective to encourage zeros in $\theta$ . In the slide's objective, $1-\delta(\theta_j,0)$ is 1 whenever $\theta_j\ne0$ , so the sum counts the non-zero weights — the **L0 norm** (the boxes are again the missing $\sum$ , dot product and $\ge$ ).
<!-- Sources: L13 p.40 -->

But this objective is discontinuous and non-convex; minimising it is combinatorially hard and may require trying all $2^d$ subsets.
<!-- Sources: L13 p.41 -->

### L1: an approximation we can optimise

![Slide 42 - L1-norm regularized SVM](assets/09-feature-selection/slide-42.png)

Replace the objective with the sum of absolute weights, the **L1 norm** (the note on the right says it is also called the taxicab or Manhattan norm). The constraint is unchanged:

| Objective | Meaning | Properties |
| --- | --- | --- |
| $\min\sum_{j=1}^{d}\big(1-\delta(\theta_j,0)\big)$ , subject to $y_i(\theta\cdot\mathbf{x}_i)\ge1$ | L0 norm: the number of non-zero weights | Discontinuous, non-convex; combinatorially hard |
| $\min\sum_{j=1}^{d}\lvert\theta_j\rvert$ , same constraint | L1 norm | Convex, so it can be optimised; the solution usually has few non-zero entries |
<!-- Sources: L13 p.40-42 -->

L1 is an optimisable approximation of L0: most components of the optimal $\theta^*$ are 0, and the corresponding features are "selected out".
<!-- Sources: L13 p.42; Apple Notes W7L13 Feature Selection -->

**Note: a unified view of regularisation.** The student's revision notes write this family as "loss + penalty":

$$
J(\theta)=\mathrm{Loss}(\theta)+\lambda\,P(\theta),\qquad
P_{L1}(\theta)=\sum_j\lvert\theta_j\rvert,\qquad P_{L2}(\theta)=\sum_j\theta_j^2 .
$$

L1 tends to give sparse solutions and can be used for feature selection; L2 only shrinks the weights overall (see [05](05-LR.md)); L0 is discrete and non-differentiable, so gradient descent cannot optimise it.
<!-- Sources: Apple Notes ★3.4 Cross-Model Strategies; Apple Notes ★2 Feature Engineering; L13 p.41-42 -->

## Self-check

1. Feature A has class means 10 and 12, both with standard deviation 0.5; feature B has means 10 and 20, both with standard deviation 10. Which has the higher S2N?
2. There are 20 features. How many train-evaluate cycles do the wrapper and embedded versions of forward selection need? How many does exhaustive search need?
3. Why can two features that are each unrelated to the label classify perfectly in combination? Which kind of method can discover this?
4. Why use L1 rather than L0 as the SVM's feature-selection objective?
