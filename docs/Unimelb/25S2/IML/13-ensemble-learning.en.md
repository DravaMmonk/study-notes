# COMP90049 Lecture 20 - Ensemble Learning

Sources: `lecture/20-ensembles.pdf`; Apple Notes: CS/25S2/IML — "W10L20 Ensemble Learning", "★3.3 Ensemble Learning".

This lecture asks: **instead of picking the single "best" classifier, can we combine many (weak or unstable) classifiers into a stronger one?**

Learning path: [Why combining works](#topic-1) → [Four ways to create diversity](#topic-2) → [Stacking](#topic-3) → [Bagging and random forests](#topic-4) → [Boosting and AdaBoost](#topic-5).

Key points: the two conditions for ensembles to work; bagging reduces variance, boosting reduces bias. Hard parts: AdaBoost's classifier weights and instance-weight updates. Common mistakes: in stacking, the meta-classifier must not "see" data the base classifiers were trained on.

<a id="topic-1"></a>
## 1. Why combining works

**Ensemble learning (also called classifier combination)** builds a set of **base classifiers** from the training data and aggregates their outputs into a single **meta-classifier**. Two intuitions: many weak classifiers combined can be at least as good as one strong classifier; a selection of strong classifiers combined is (usually) at least as good as the best of them.
<!-- Sources: L20 p.2-4 -->

### Two conditions

![Slide 07 - When does majority voting work](assets/13-ensemble-learning/slide-07.png)

Each table shows whether three classifiers $C_1,C_2,C_3$ are right or wrong (√/×) on three test instances $t_1,t_2,t_3$ ; $C^*$ is the majority vote. In A each classifier errs on a different instance, and the vote gets all three right; in B they all err on the same instance, and voting cannot rescue it; in C each classifier is right only once (the orange cells), and the vote gets everything wrong. B and C are crossed out in red, so an ensemble needs:
<!-- Sources: L20 p.5-7 -->

1. Base classifiers that **do not make the same mistakes** (different biases);
2. Base classifiers that are **reasonably accurate** (better than chance).
<!-- Sources: L20 p.5 -->

### How much the error can drop

![Slide 09 - Ensemble error vs base error](assets/13-ensemble-learning/slide-09.png)

The x-axis is the base classifiers' error and the y-axis the ensemble's error. The blue dashed line is the case where all base classifiers are identical: the ensemble equals one classifier. The red line is for independent base classifiers: with error below 0.5 the ensemble's error is pushed lower (the green region; the black dashed line marks 0.35 mapping to about 0.06); above 0.5 it gets worse. Ensembles work when base classifiers are **slightly better than random** ( $\epsilon<0.5$ ).
<!-- Sources: L20 p.8-9 -->

![Slide 11 - Binomial ensemble error](assets/13-ensemble-learning/slide-11.png)

This slide computes that point on the curve: suppose 25 independent binary base classifiers each have error rate $\epsilon=0.35$ . With majority voting, the ensemble errs only when more than half (at least 13) err:

$$
\sum_{i=13}^{25}\binom{25}{i}\epsilon^{i}(1-\epsilon)^{25-i}\approx0.06 .
$$
<!-- Sources: L20 p.10-11 -->

The red arrow points out that this is a **binomial distribution**: the sum of several independent Bernoulli trials. The slide also warns that independence usually does not hold in practice, so this is the ideal case.
<!-- Sources: L20 p.10-11 -->

### The simplest combination: voting

For classification, take the class predicted by most base classifiers; for regression, average the numeric predictions, e.g. 0.8, 0.7, 0.2, 0.9 average to 0.65.
<!-- Sources: L20 p.12 -->

<a id="topic-2"></a>
## 2. Four ways to create diversity

![Slide 13 - Instance and feature manipulation](assets/13-ensemble-learning/slide-13.png)

![Slide 14 - Algorithm and class label manipulation](assets/13-ensemble-learning/slide-14.png)

These two slides list four ways to make base classifiers "make different mistakes". The first slide's example splits the feature list into two datasets, [age, state, …] and [experience, education, …]; the second rewrites the five classes A–E as binary problems such as [A; not A] or [A or B; C or D or E], where "reversible" means the answers can be pieced back into the original five classes.

| Approach | How |
| --- | --- |
| Instance manipulation | Generate several training sets by sampling and train a base classifier on each |
| Feature manipulation | Generate several training sets from different feature subsets |
| Algorithm manipulation | Tweak the internal parameters of one algorithm (e.g. random seeds, hyperparameters) to get several base classifiers |
| Class label manipulation | Rewrite the labels reversibly |
<!-- Sources: L20 p.13-14; Apple Notes W10L20 Ensemble Learning -->

![Slide 15 - Three main algorithms](assets/13-ensemble-learning/slide-15.png)

The lecture's three main algorithms each use different manipulations from above:

| Algorithm | Base classifiers | Source of diversity | Main effect |
| --- | --- | --- | --- |
| Stacking | Different models (or one model with different features) | Different models / feature manipulation | Smooths over the biases of different algorithms |
| Bagging (e.g. random forest) | One classifier type | Instance manipulation (random forests add feature manipulation) | Reduces variance |
| Boosting (e.g. AdaBoost) | One classifier type | Instance and algorithm manipulation | Reduces bias |
<!-- Sources: L20 p.15 -->

For what bias and variance mean, see [08 Evaluation](08-evaluation.en.md).

<a id="topic-3"></a>
## 3. Stacking

Intuition: use a range of algorithms with different biases to "smooth out" each other's errors. Simple voting presupposes the classifiers perform equally well; **meta classification** instead trains a classifier on the base classifiers' outputs.
<!-- Sources: L20 p.18 -->

### Two levels

![Slide 20 - Stacking meta classification](assets/13-ensemble-learning/slide-20.png)

Read from left to right: the same training data trains C1, C2 and C3; their predictions P1, P2, P3 (the red dashed box, the Level 0 predictions) go together into the triangular meta-classifier, which gives the final prediction.

- **Level 0**: train a neural network, Naive Bayes, a decision tree and so on on the training data $(X,y)$ , producing predictions P1, P2, P3;
- Use these predictions (optionally plus extra information such as confidence scores) as new attributes: $X_{\text{new}}=[\hat{Y}_{C1},\hat{Y}_{C2},\hat{Y}_{C3},\dots,X_{\text{old}}]$ ; the original features can be kept or discarded;
- **Level 1**: train a meta-classifier on the new attributes, typically logistic regression.
<!-- Sources: L20 p.19-20 -->

### Avoiding leakage with nested cross-validation

![Slide 22 - Nested cross-validation for stacking](assets/13-ensemble-learning/slide-22.png)

**Common mistake:** the level-0 classifiers must never see the level-1 test data. The answer is **nested cross-validation**: the outer loop (blue, Level 1) splits the data into folds and holds one out (hatched) to test the meta-classifier; the red arrow takes the outer training part and runs cross-validation again inside it (green, Level 0), training the base classifiers and producing their predictions. The inner models are never exposed to the level-1 test fold, they still have enough data to train, and all the data can eventually be used to test the meta-classifier.
<!-- Sources: L20 p.18, p.21-22 -->

If the base classifiers were trained on all the data and then made predictions on that same data, those predictions would be over-optimistic; the meta-classifier would learn from inputs that never occur on new data.

Stacking is mathematically simple but computationally expensive; it can combine heterogeneous classifiers of varying performance; it is generally at least as good as the best base classifier; it is widely seen in applied research, with less interest from theoreticians.
<!-- Sources: L20 p.23 -->

<a id="topic-4"></a>
## 4. Bagging and random forests

### Bagging

Intuition: the more data, the better the performance (the lower the variance). How do we get "more" data out of a fixed training set? Build new datasets by **sampling with replacement (bootstrap)**: draw $N$ times at random with replacement from the original data, giving a new dataset of the same size. The probability that a given instance is never drawn is $(1-\frac{1}{N})^{N}\approx0.37$ , which also weakens the effect of outliers. Build $k$ datasets, train $k$ base classifiers, and vote. This is **bagging (bootstrap aggregating)**.
<!-- Sources: L20 p.25 -->

![Slide 26 - Bootstrap samples](assets/13-ensemble-learning/slide-26.png)

The original data is 1–10. Watch the yellow 2 and the green 10: in different bootstrap samples they sometimes appear several times and sometimes not at all. Each sample is as large as the original but has different contents.
<!-- Sources: L20 p.26 -->

![Slide 27 - Bagging pipeline](assets/13-ensemble-learning/slide-27.png)

The figure draws the whole process in three layers: the original data at the top is bootstrapped into several samples (each with slightly different colour proportions), each sample trains a classifier, and aggregating combines them into the ensemble classifier.

- Because bagging reduces variance through sampling, the base classifier should be **unstable (high variance)**, e.g. a [decision tree](03-DT.md);
- Simple method based on sampling and voting; base classifiers can be trained in parallel;
- Highly effective on noisy data (outliers may vanish from some samples);
- Performance is generally significantly better than the base classifiers and only occasionally substantially worse.
<!-- Sources: L20 p.27-28 -->

### Random forests

A **random tree** is a decision tree that considers only some of the attributes at each node, e.g. a fixed proportion $\tau$ of all attributes (excluding those used earlier in the tree). This is feature manipulation: it tries to control for unhelpful attributes, and it is much faster to build than a deterministic decision tree, though each tree has higher variance.
<!-- Sources: L20 p.30 -->

![Slide 31 - Random forest voting](assets/13-ensemble-learning/slide-31.png)

The three trees differ in shape and splits (the small red arrows are their decision paths) and vote together at the end. The orange text states the idea: decrease the correlation between the random trees. A **random forest** is an ensemble of random trees combined by voting, each tree built on a different bagged training set (instance manipulation). The aim is to minimise overall model variance without introducing (combined) model bias.
<!-- Sources: L20 p.31 -->

![Slide 32 - Random forest hyperparameters](assets/13-ensemble-learning/slide-32.png)

| Hyperparameter | Notes |
| --- | --- |
| Number of trees $B$ | Tuned with the **out-of-bag error**: each instance is used to train only about 63% of the trees, and for the rest it is an out-of-bag sample, acting like a validation set |
| Feature sub-sample size | As it grows, individual trees get stronger and the trees become more correlated; a common choice is $\lfloor\log_2\lvert F\rvert+1\rfloor$ |
<!-- Sources: L20 p.32; Apple Notes W10L20 Ensemble Learning -->

The 63% and the 37% above are two sides of the same fact: an instance appears in a given bootstrap sample with probability about $1-0.37$ . The logic behind one instance's prediction can be traced (tediously) through the trees, but the logic of the whole model is hard to state (the slide writes "???"). Practical properties: generally a very strong performer; parallelisable; surprisingly efficient; robust to overfitting; interpretability is sacrificed.
<!-- Sources: L20 p.32-33 -->

<a id="topic-5"></a>
## 5. Boosting and AdaBoost

### The idea

Intuition: tune base classifiers to focus on the "hard to classify" instances. Approach: iteratively change the distribution and weights of the training instances according to the previous classifier's performance. Start with every instance having probability $1/N$ of being sampled; over $T$ iterations train a classifier and update each instance's weight according to whether it is classified correctly; finally combine the base classifiers by weighted voting.
<!-- Sources: L20 p.36 -->

![Slide 37 - Boosting samples](assets/13-ensemble-learning/slide-37.png)

Compare with the bagging sampling figure: the red 4 appears once in iteration 1, three times in iteration 2, and fills half the sample by iteration 3. It keeps being misclassified, its weight keeps growing, so it is drawn more and more often.
<!-- Sources: L20 p.37 -->

### The four steps of AdaBoost

**AdaBoost (adaptive boosting)** is a sequential ensemble method whose base classifiers are typically **decision stumps**, trees with a single split (the One-R of [03](03-DT.md)).
<!-- Sources: L20 p.39 -->

![Slide 39 - AdaBoost error rate](assets/13-ensemble-learning/slide-39.png)

The instances are $\{(x_j,y_j)\}_{j=1}^{N}$ with initial weights $w^{(1)}_j=1/N$ . In iteration $i$ , **step 1:** train classifier $C_i$ and compute its weighted error rate. The red note on the right says the indicator function $\delta(\cdot)$ is 1 when the prediction is wrong and 0 when it is right, so $\varepsilon_i$ is just the total weight of the misclassified instances:

$$
\varepsilon_i=\sum_{j=1}^{N}w^{(i)}_j\,\delta\big(C_i(x_j)\ne y_j\big).
$$
<!-- Sources: L20 p.39 -->

![Slide 40 - Classifier importance alpha](assets/13-ensemble-learning/slide-40.png)

**Step 2:** compute the classifier's importance (a log-odds):

$$
\alpha_i=\frac{1}{2}\ln\frac{1-\varepsilon_i}{\varepsilon_i}.
$$

Read the curve: the x-axis is $\varepsilon$ and the y-axis is $\alpha$ . The lower the error, the larger $\alpha_i$ and the more weight its vote carries. The red box marks $\alpha_i>0$ when $\varepsilon<0.5$ : only classifiers that beat random guessing are trusted; the part with $\varepsilon>0.5$ is labelled "IGNORE". At exactly $\varepsilon=0.5$ , $\alpha=\frac12\ln1=0$ : this classifier's vote has no effect, and the next step's weight update leaves the distribution unchanged.
<!-- Sources: L20 p.40 -->

![Slide 41 - AdaBoost weight update](assets/13-ensemble-learning/slide-41.png)

**Step 3:** update the instance weights for iteration $i+1$ :

$$
w^{(i+1)}_j=\frac{w^{(i)}_j}{Z^{(i)}}\times
\begin{cases}e^{-\alpha_i} & \text{if } C_i(x_j)=y_j\\ e^{\alpha_i} & \text{if } C_i(x_j)\ne y_j\end{cases}
$$

$Z^{(i)}$ is a normalisation term that makes the weights sum to 1. Misclassified instances gain weight; correctly classified ones lose weight. The curve at the top right is $e^{\alpha_i}$ growing with $\alpha_i$ : the more trustworthy the classifier, the more strongly the instances it gets wrong are "magnified".
<!-- Sources: L20 p.41 -->

![Slide 42 - AdaBoost output and prediction](assets/13-ensemble-learning/slide-42.png)

**Step 4:** add the weighted $C_i$ to the ensemble. The final output is $\{(\alpha_1,C_1),\dots,(\alpha_T,C_T)\}$ ; to predict, add up the $\alpha$ of the classifiers voting for each class $y$ and take the class with the largest total:

$$
C^{*}(x)=\arg\max_{y}\sum_{i=1}^{T}\alpha_i\,\delta\big(C_i(x)=y\big).
$$

As long as each base classifier is better than random, convergence to a stronger model is guaranteed.
<!-- Sources: L20 p.42 -->

**Worked example (my own):** 10 instances, each with weight 0.1; the first stump misclassifies 2, so $\varepsilon=0.2$ , $\alpha=\frac12\ln4\approx0.693$ , $e^{\alpha}=2$ and $e^{-\alpha}=0.5$ .

| | Count | Weight before | Multiply by | Unnormalised | Normalised ( $Z=0.8$ ) |
| --- | --- | --- | --- | --- | --- |
| Misclassified | 2 | 0.1 | 2 | 0.2 | 0.25 |
| Correct | 8 | 0.1 | 0.5 | 0.05 | 0.0625 |

After the update the two misclassified instances together hold half the weight: the next classifier has to take them seriously.

### Summary and comparison

Boosting is mathematically complicated but computationally cheap, based on iterative sampling and weighted voting; because it is sequential it takes longer than bagging; it has guaranteed performance in the form of error bounds on the training data; in practice it tends to overfit.
<!-- Sources: L20 p.43 -->

![Slide 44 - Bagging vs boosting](assets/13-ensemble-learning/slide-44.png)

The two columns compare row by row:

| Bagging | Boosting |
| --- | --- |
| Parallel sampling | Iterative sampling |
| Simple voting | Weighted voting |
| Single classification algorithm | Single classification algorithm |
| Minimises variance | Minimises (instance) bias |
| Not prone to overfitting | Prone to overfitting |
<!-- Sources: L20 p.44 -->

## Self-check

1. Three independent classifiers each have error rate 0.4. What is the majority-vote error rate? What if each has error rate 0.6?
2. Why does bagging suit decision trees but help little with kNN (large $k$ )?
3. What happens in AdaBoost when some iteration has $\varepsilon=0.5$ ?
4. In stacking, what goes wrong if you train the base classifiers on all the training data and then train the meta-classifier on their predictions for that same data?
