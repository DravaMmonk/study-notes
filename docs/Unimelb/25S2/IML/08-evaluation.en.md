# COMP90049 Lectures 11–12 - Evaluation and Generalisation

Sources: `lecture/11-evaluation-1.pdf`, `lecture/12-evaluation-2.pdf`; Apple Notes: CS/25S2/IML — "W6L11 Evaluation", "W6L12 Generalisation", "★5 Evaluation", "★5.1 Bias vs. Variance".

This lecture asks: **how do we know a model has really learned, and will also do well on data it has never seen?**

Learning path: [How to split the data](#topic-1) → [Classification metrics](#topic-2) → [Regression metrics](#topic-3) → [Overfitting and learning curves](#topic-4) → [Bias and variance](#topic-5) → [Diagnosis, remedies and bias in evaluation itself](#topic-6).

Key points: cross-validation, Precision/Recall/F1, the three averaging methods, the bias–variance decomposition. Hard parts: using learning curves to tell high bias from high variance. Common mistakes: tuning hyper-parameters on the test set (data leakage); looking only at accuracy when classes are imbalanced.

<a id="topic-1"></a>
## 1. Evaluation strategies: splitting the data and tuning hyper-parameters

### Why split

The goal is a model that performs well on **unseen data**. Usually we only have one collection of data, so we partition it into training data and test data. The assumptions are that training and test sets come from the same distribution and that samples are drawn independently.
<!-- Sources: L11 p.5-7 -->

### Holdout

**Holdout**: each instance is randomly assigned to training or testing, with no overlap; the model is built only on the training instances and evaluated only on the test instances. Typical splits are 50–50, 80–20, 90–10. It is simple and reproducible, but has three problems: split size, sampling bias, and wasted data.
<!-- Sources: L11 p.10-12 -->

![L11 slide 13 - Holdout split size](assets/08-evaluation/slide-l11-13.png)

In both bars the green part is the training set and the white part the test set. The top bar has much test and little training data: the learner lacks the information to build an accurate model. The bottom bar has much training and little test data: the model is good, but a small test set may not be representative, so the performance estimate can be too high or too low.

![L11 slide 14 - Sampling bias in holdout](assets/08-evaluation/slide-l11-14.png)

The top bar of each pair is the original data; orange, purple and yellow are three classes, and the length of each block is the class proportion. In the upper draw the test set gets only yellow; in the lower draw the test set gets only orange and purple, and the training set has no orange. Both draws are "random", yet the training and test sets end up with different class distributions: this is **sampling bias**.

The third problem is **wasted data**: some instances are used only for training and some only for testing; no instance serves both purposes.
<!-- Sources: L11 p.13-14 -->

### Stratification

![L11 slide 15 - Stratification](assets/08-evaluation/slide-l11-15.png)

Compare with the previous slide: after stratification both the test set and the training set contain orange, purple and yellow, in the same proportions as the original bar at the top.

**Stratification**: each partition (or fold) keeps the same class distribution as the original data, which matters most for imbalanced data. It ensures small classes are represented, but is more complex to implement and still does not let every instance be used for both training and testing.
<!-- Sources: L11 p.15-16 -->

### k-fold cross-validation

![L11 slide 18 - k-fold cross-validation](assets/08-evaluation/slide-l11-18.png)

**k-fold cross-validation**: split the data into $k$ folds. In iteration $i$, fold $i$ is the test data and the other $k-1$ folds are training data, giving $E_i$; finally average $E=\frac{1}{k}\sum_{i=1}^{k}E_i$. Each row of the figure is one iteration and the blue cell is that iteration's test fold: it moves from right to left, so every fold is the test fold exactly once; the brace on the right combines $E_1,\dots,E_k$ into one average.
<!-- Sources: L11 p.17-18 -->

- Pro: every instance is used for both training and testing, so the estimate is more reliable;
- Con: the model is trained $k$ times, which takes longer;
- Fewer folds: larger folds but more variance in the performance estimate; more folds: less variance but slower. The most common choice is $k=10$ (sometimes 5), like a far more reliable 90–10 holdout;
- **Stratified cross-validation** is also possible: each fold keeps the original class distribution.
<!-- Sources: L11 p.19-21 -->

**Leave-one-out cross-validation** is k-fold cross-validation with $k$ equal to the number of samples: no sampling bias and generally the lowest bias and variance, but the most time-consuming.
<!-- Sources: L12 p.44; Apple Notes W6L12 Generalisation -->

### Hyper-parameter tuning needs a third dataset

A decision tree that is too shallow is close to 1-R; one that is too deep cannot generalise. A quantity like "depth" that must be fixed before training is a **hyperparameter**, and choosing it is **hyperparameter tuning**. In scikit-learn it is the argument of `DecisionTreeClassifier(max_depth=...)`.
<!-- Sources: L11 p.22-24 -->

**Common mistake: data leakage.** If the test set is used to choose hyper-parameters, no truly unseen data is left to evaluate the final model. So we need a third set, the **validation data**.
<!-- Sources: L11 p.25 -->

![L11 slide 26 - Supervised models pipeline](assets/08-evaluation/slide-l11-26.png)

Read the circled numbers: training data (1) and the chosen algorithm (2) train the model (3), giving model parameters (4); the model predicts on validation data (5), giving validation performance (6); that performance guides hyper-parameter tuning or feature selection (7), and the dashed arrow returns to 3 for retraining. This loop (3→4→5→6→7→3) uses only training and validation data. Once settled, the final model (9) is evaluated on the test data (8). The red dashed box surrounds the "predict and measure performance" part: validation data is used again and again inside the tuning loop, test data only once at the end.

**Common mistake:** do not read the red dashed box as "the tuning loop". It contains both the validation and the test data; the tuning loop is the cycle above, and the test data is not part of it.
<!-- Sources: L11 p.26-27 -->

After choosing the best hyper-parameter, merge the training and validation data, retrain with that hyper-parameter, then check performance on the test set.
<!-- Sources: L11 p.27 -->

![L11 slide 28 - Cross-validation for hyperparameter tuning](assets/08-evaluation/slide-l11-28.png)

Instead of a separate validation set, we can run k-fold cross-validation inside the training data to choose hyper-parameters: in the figure the training data is cut into 3 blocks, each row uses a different block as validation data (light blue) and trains on the other two; each candidate hyper-parameter is run $k$ times and its scores averaged. The test data on the right is always kept aside and takes part in no row.
<!-- Sources: L11 p.28 -->

<a id="topic-2"></a>
## 2. Classification metrics

### The confusion matrix

![L11 slide 33 - Confusion matrix](assets/08-evaluation/slide-l11-33.png)

In a **confusion matrix** the rows are the actual classes and the columns the predicted classes. The green diagonal cells are correct predictions: TP (true positive, actually positive and predicted positive) and TN (true negative, actually negative and predicted negative); the red cells are the two kinds of error: FN (false negative, actually positive but predicted negative) and FP (false positive, actually negative but predicted positive). Mnemonic: the second letter is "what was predicted", the first letter is "was the prediction right".
<!-- Sources: L11 p.33 -->

$$
\text{Accuracy}=\frac{TP+TN}{TP+TN+FP+FN},\qquad
\text{Precision}=\frac{TP}{TP+FP},\qquad
\text{Recall}=\frac{TP}{TP+FN},
$$

$$
F_1=\frac{2\times\text{Precision}\times\text{Recall}}{\text{Precision}+\text{Recall}} .
$$
<!-- Sources: L11 p.31, p.35-36, p.41 -->

### Recall and precision

![L11 slide 35 - Recall](assets/08-evaluation/slide-l11-35.png)

The red box surrounds the "actually Positive" row: recall looks only at this row and asks how many of its instances were predicted correctly. The next slide (Precision) moves the red box to the "predicted Positive" column and asks how many of the predicted positives are really positive.

- **Recall**: of the instances that are actually positive, the fraction found. Close to 1 means few FNs.
- **Precision**: of the instances predicted positive, the fraction that are truly positive. Close to 1 means few FPs.
- **F1**: their harmonic mean, used to balance the two. Precision and recall usually trade off: loosen the threshold and more positives are found (recall rises), but more negatives slip in too (precision falls).
<!-- Sources: L11 p.35-36, p.40-41 -->

Not all errors cost the same: labelling someone who really has a viral infection as negative (FN) should be avoided, so recall matters; labelling an innocent person a criminal (FP) should be avoided, so precision matters.
<!-- Sources: L11 p.34 -->

**Note:** specificity (TNR) $=TN/(TN+FP)$ is the fraction of actually negative instances recognised correctly; it complements recall.
<!-- Sources: Apple Notes W6L11 Evaluation; Apple Notes ★5 Evaluation -->

### Accuracy can mislead: use baselines

![L11 slide 38 - 99 percent accuracy that finds no patient](assets/08-evaluation/slide-l11-38.png)

The confusion matrix on the right covers 100 people: the only patient is predicted negative (FN = 1), all 99 healthy people are right (TN = 99), and the predicted-Positive column is all zeros. Accuracy is $99/100=99\%$, but recall is $0/1=0$: not a single patient is found; precision is $0/0$, not even defined.

If only 1% of people have a disease, a model that always predicts "no disease" has 99% accuracy yet is useless. So compare with a **baseline**, such as [Zero-R and One-R](03-DT.md); baselines also show how hard the task itself is (the same accuracy means very different things against a 5% or a 99% baseline).
<!-- Sources: L11 p.37-39 -->

### A binary worked example

![L11 slide 42 - Binary worked example](assets/08-evaluation/slide-l11-42.png)

The upper-right table lists the true Label and the Prediction for 4 instances, with Red as the positive class. Row by row: row 1 Red→Red is a TP; rows 2 and 4 Blue→Red are FPs; row 3 Red→Blue is an FN; there is no Blue→Blue, so TN = 0. The confusion matrix below holds these four counts, and the formulas on the left substitute them: accuracy $=1/4$, recall $=1/2$, precision $=1/3$.

**Common mistake:** the slide rounds precision to 0.33 before computing F1 and gets $\approx 0.398$; with the exact values $P=1/3$, $R=1/2$, $F_1=\frac{2\cdot\frac13\cdot\frac12}{\frac13+\frac12}=0.4$. Keep fractions until the last step when working by hand.

### Multi-class: pick an "interesting" class

![L11 slide 44 - Multi-class confusion matrix with Red as the interesting class](assets/08-evaluation/slide-l11-44.png)

With several classes, treat one class as the interesting positive class and all others as negative, which gives one set of TP/FP/FN per class. See how the $3\times3$ confusion matrix at the bottom right (5 instances, classes Red/Blue/Gold) is labelled with Red as positive:

- TP: the cell where the Red row meets the Red column;
- FN: the other cells of the Red row (actually Red, predicted something else);
- FP: the other cells of the Red column (actually something else, predicted Red);
- TN: the remaining $2\times2$ block at the bottom right, every cell not involving Red.
<!-- Sources: L11 p.43-46, p.49 -->

With Red as positive: TP = 1 and FP = 2 (actual Blue predicted Red), so $\text{Precision}_{Red}=1/3$; FN = 1, so $\text{Recall}_{Red}=1/2$. With Blue or Gold as the positive class, TP is 0, so their precision and recall are both 0.
<!-- Sources: L11 p.44-46, p.48 -->

### Three ways to average

![L11 slide 48 - Macro averaging](assets/08-evaluation/slide-l11-48.png)

**Macro averaging**: the left side lists each class's own precision and recall; the right side simply adds them and divides by the number of classes $c=3$. Every class has the same weight, however many instances it has.

![L11 slide 49 - Micro averaging](assets/08-evaluation/slide-l11-49.png)

**Micro averaging**: instead of computing a ratio per class, pool the counts of all classes and divide once. The precision denominator $1+0+0+2+2+0$ is the three TPs plus the three FPs (the Red column has 2 FPs, the Blue column has 2: one actually Red, one actually Gold); the recall denominator is the three TPs plus the three FNs (the off-diagonal sums of each row: 1, 2, 1).

| Averaging | How | Precision in this example | Character |
| --- | --- | --- | --- |
| Macro | Compute per class, then take the plain mean | $(0.33+0+0)/3=0.11$ | All classes equally important; emphasises small classes |
| Micro | Pool the TPs and FPs of all classes, then compute | $1/(1+2+2)=0.2$ | All instances equally important; dominated by large classes |
| Weighted | Weight each class by its share of instances | $\frac{2}{5}\times0.33+\frac{2}{5}\times0+\frac{1}{5}\times0=0.132$ | Larger classes weigh more |
<!-- Sources: L11 p.47-51 -->

The weighted row of the table is **weighted averaging**: the weight $n_i/N$ is the share of actual instances in class $i$ (2 Red, 2 Blue, 1 Gold).

![L11 slide 52 - Comparing averaging methods](assets/08-evaluation/slide-l11-52.png)

This slide switches to a confusion matrix with very unequal classes: 200 actual Red, 20 Blue, 10 Gold. Bottom right first computes per-class recall: 0.9, 0.25, 0.1; on the left the three averages give macro ≈ 0.42, while micro and weighted are both ≈ 0.81 — good performance on the large class hides poor performance on the small ones. If the small classes matter, look at macro.
<!-- Sources: L11 p.52 -->

**Note:** when each instance has exactly one true label and one predicted label, the total number of FPs over all classes equals the total number of FNs (each misclassified instance is an FP for one class and an FN for another), so micro precision = micro recall = accuracy (all 0.2 here). Likewise weighted recall $=\sum_i \frac{n_i}{N}\cdot\frac{TP_i}{n_i}=\frac{\sum_i TP_i}{N}$ also equals accuracy, which is why micro and weighted recall are both 0.81 on the slide above.
<!-- Sources: L11 p.44, p.49 -->

<a id="topic-3"></a>
## 3. Regression metrics

Regression does not count right and wrong; it measures the **size** of the errors. The smaller the error, the better the predictions on new instances.
<!-- Sources: L11 p.54 -->

![L11 slide 55 - Sum of squared errors](assets/08-evaluation/slide-l11-55.png)

Start with the definition in the middle: the **residual** of instance $i$ is the true value minus the prediction, $y_i-\hat{y}_i$, which can be positive or negative; SSE at the bottom squares each residual and adds them up. Squaring removes the sign and gives large errors more weight. MSE, RMSE and MAE all start from the same residual and differ only in how they aggregate it.

$$
\mathrm{SSE}=\sum_{i=1}^{n}(y_i-\hat{y}_i)^2,\qquad
\mathrm{MSE}=\frac{1}{N}\sum_{i=1}^{N}(y_i-\hat{y}_i)^2=\frac{\mathrm{SSE}}{N},
$$

$$
\mathrm{RMSE}=\sqrt{\mathrm{MSE}},\qquad
\mathrm{MAE}=\frac{1}{N}\sum_{i=1}^{N}\lvert y_i-\hat{y}_i\rvert .
$$
<!-- Sources: L11 p.55-58 -->

| Metric | Character |
| --- | --- |
| SSE (also RSS, SSR) | Sum of squared residuals |
| MSE | Squaring emphasises large errors; sensitive to outliers |
| RMSE | Square root of MSE, in the same units as the target; easier to interpret |
| MAE | Treats all errors equally; less sensitive to outliers |
<!-- Sources: L11 p.55-59 -->

`Worked example (my own)`: four residuals are $1,1,1,10$. MAE $=13/4=3.25$; MSE $=(1+1+1+100)/4=25.75$, RMSE $\approx5.07$. One outlying residual makes RMSE more than half as large again as MAE — that is what "sensitive to outliers" means.

<a id="topic-4"></a>
## 4. Generalisation: overfitting and learning curves

### Underfitting, overfitting and a good fit

- **Underfitting**: the model is not expressive enough to capture the patterns in the data;
- **Overfitting**: the model is too complicated and also captures the noise;
- A suitable model captures the essential patterns in the data.

The three scatter plots on this slide have no decision boundaries in the PDF, and the points in all three are identical; for a comparison with fitted lines see L12 slide 29 under [Bias and variance](#topic-5).
<!-- Sources: L12 p.4 -->

### Learning curves

A **learning curve** plots learning performance against "experience": the y-axis is a metric such as accuracy or error rate; the x-axis can be training-set size, model complexity or number of iterations. The training curve shows how well the model is learning; the validation curve shows how well it generalises.
<!-- Sources: L12 p.6 -->

![L12 slide 9 - Learning curve over training size](assets/08-evaluation/slide-l12-09.png)

The x-axis is the percentage of data used for training (splits such as 10–90, 20–80, …, 90–10, ideally averaged over several runs each); red × is training accuracy, blue + is test accuracy. Test accuracy rises with more training data and then levels off; training accuracy stays above it, and the two lines draw closer. The conclusion is written at the top: more training instances usually give a better model; more evaluation instances give a more reliable estimate — the two compete for the same data, and the learning curve makes that trade-off visible.
<!-- Sources: L12 p.8-9 -->

### Model complexity: polynomial order

![L12 slide 10 - MSE against polynomial order](assets/08-evaluation/slide-l12-10.png)

This is the second kind of learning curve: the x-axis is now model complexity (the maximum polynomial order $D$) and the y-axis is MSE. The blue training error keeps falling as the order grows; the orange test error is lowest around $D\approx2$, then creeps up and jumps at $D=10,11$. Training error shrinking while test error grows is exactly the signal of overfitting.

![L12 slide 11 - Polynomial orders](assets/08-evaluation/slide-l12-11.png)

Extend linear regression with $\phi(x)=[1,x,x^2,\dots,x^D]$: $y=\mathbf{w}\cdot\phi(x)$. The four panels are $D=0$ (a horizontal line, MSE 84.4), $D=1$ (a straight line), $D=2$ and $D=3$ (curves); each panel's title gives its MSE, and higher orders give more flexible curves and lower training MSE. **Model complexity** can be thought of as the number of adjustable parameters, e.g. the depth of a decision tree or the order of a polynomial.
<!-- Sources: L12 p.10-14 -->

![L12 slide 15 - Overfitting and underfitting](assets/08-evaluation/slide-l12-15.png)

The x-axis is the number of leaf nodes in a decision tree, the y-axis the error rate ($=100\%-$ accuracy); the solid line is the training set, the dashed line the test set, and the blue vertical dashed line sits at about 100 leaves. On the left both training and test errors are high: evidence of underfitting. On the right the training error keeps falling while the test error rises again, leaving a large gap: evidence of overfitting.
<!-- Sources: L12 p.15 -->

<a id="topic-5"></a>
## 5. Bias and variance

### Each word has three uses

An **expectation** can be thought of as "the average over unlimited samples": the average of fair coin tosses gets closer to $1/2$ as the number of samples grows. Bias and variance are both defined through expectations.
<!-- Sources: L12 p.17 -->

![L12 slide 18 - Model bias](assets/08-evaluation/slide-l12-18.png)

Top right: the thick grey line is the true function $f(x)$, the three colours of points are three training sets, and the three straight lines are linear models fitted to each. The three lines almost coincide (changing the training set changes little), but none can follow the curved true function: they are systematically too low at both ends and too high in the middle. This is **high bias**.

![L12 slide 19 - Model variance](assets/08-evaluation/slide-l12-19.png)

Same three training sets, now with a very flexible model: each of the three jagged lines passes through its own training points, and they differ a lot from one another. On average they are not far from the true function, but any single one swings with its training set. This is **high variance**.

| | Bias | Variance |
| --- | --- | --- |
| Model | Tendency to make systematically wrong predictions | How much predictions change when the training data changes slightly |
| Evaluation | The evaluation strategy systematically over- or under-estimates the model | How much the metric varies across different test sets |
| Sampling | Training or evaluation data is not representative of the population | — |
<!-- Sources: L12 p.18-19 -->

In regression, model bias can be seen as the average signed error $\frac{1}{N}\sum_{i=1}^{N}(y_i-\hat{y}_i)$. If predictions are systematically too high or too low, the model is biased; if some are too high and some too low so they cancel, it is unbiased. Model variance measures how much predictions change with a different training set — high variance says nothing about whether predictions are correct, only whether they are stable:

$$
\mathrm{Var}(\hat{f})=\mathbb{E}\big[(\hat{f}(x)-\mathbb{E}[\hat{f}(x)])^2\big].
$$
<!-- Sources: L12 p.20-21; Apple Notes W6L12 Generalisation -->

### Decomposing the generalisation error

Assume the data is generated as $Y=f(X)+\epsilon$, where the noise $\epsilon\sim\mathcal{N}(0,\sigma^2)$ comes from an unmeasurable source (e.g. annotation or measurement error). Different training sets give different $\hat{f}$, so we look at the expected squared error over many trainings, $\mathbb{E}[(Y-\hat{f}(x))^2]$. In regression it decomposes as:
<!-- Sources: L12 p.23-24 -->

![L12 slide 25 - Bias-variance decomposition](assets/08-evaluation/slide-l12-25.png)

$$
\mathrm{Err}=\underbrace{\big(\mathbb{E}[f(x)-\hat{f}(x)]\big)^2}_{\text{Bias}^2}
+\underbrace{\mathbb{E}\big[(\hat{f}(x)-\mathbb{E}[\hat{f}(x)])^2\big]}_{\text{Variance}}
+\underbrace{\sigma^2}_{\text{Irreducible error}} .
$$
<!-- Sources: L12 p.25 -->

The red brackets under the formula label the three terms Bias, Variance and, in blue, Irreducible Error. In the figure below: the red line is the true $f(x)$; each yellow line is the $\hat{f}(x)$ obtained from one training set; the green dashed line is the average over many trainings, $\mathbb{E}[\hat{f}(x)]$. The gap between the average model (green) and the true $f(x)$ (red) is the bias; the swing of the yellow lines around the green one is the variance; the scatter of the data points around the red line is the noise $\sigma^2$.

- **Variance**: how much the model changes with a different training set — how "over-specialised" it is to one training set;
- **Bias**: the error that remains even with infinitely many training instances, because the model itself favours a particular kind of solution;
- **Noise**: ambiguity due to the data distribution and feature representation, which no model can beat; when it is too high, consider changing the data or the features.
<!-- Sources: L12 p.26; Apple Notes W6L12 Generalisation -->

### Targets and the two kinds of failure

![L12 slide 28 - Bias and variance targets](assets/08-evaluation/slide-l12-28.png)

Take the bullseye as the true value and the green dots as predictions from models trained on different training sets: the two rows show whether the dots are tight (variance), the two columns whether the cluster is centred on the bullseye (bias). The best case is the top left: low bias and low variance; the bottom right is worst: the dots are scattered and off-centre.
<!-- Sources: L12 p.27-28 -->

![L12 slide 29 - Overfitting, underfitting and good balance](assets/08-evaluation/slide-l12-29.png)

The three plots at the bottom turn the targets into regression fits: on the left a jagged line passes through every point (high variance, overfitting); in the middle a horizontal line (high bias, underfitting); on the right a smooth curve that follows the trend of the data (low bias, low variance).

Both high bias and high variance lead to poor generalisation. For example, Zero-R has zero variance but high bias.
<!-- Sources: L12 p.29 -->

### The bias–variance trade-off

![L12 slide 31 - Bias-variance trade-off](assets/08-evaluation/slide-l12-31.png)

**Bias-variance trade-off**: as model complexity grows, squared bias (red) falls and variance (teal) rises; the total error (black) is U-shaped, and the vertical dashed line marks its lowest point, the most suitable complexity. Left of that line is the underfitting region, right of it the overfitting region: dealing with bias and variance is really dealing with underfitting and overfitting.
<!-- Sources: L12 p.31 -->

**Note: typical tendencies of common models.** This table comes from the student's review notes and links hyper-parameters to bias and variance:

| Model / hyper-parameter | Tendency |
| --- | --- |
| Linear / logistic regression | Higher bias, lower variance |
| Increasing $k$ in kNN | Bias ↑, variance ↓ |
| Increasing decision-tree depth | Bias ↓, variance ↑ |
| Increasing SVM's $C$ | Less tolerance of margin violations, variance ↑ |
| Multilayer perceptron | Very expressive, low bias, prone to overfitting |
| Random forest (bagging) | Mainly reduces variance |
| AdaBoost (boosting) | Mainly reduces bias; may overfit with many iterations |
<!-- Sources: Apple Notes ★5.1 Bias vs. Variance; L11 p.24; L15 p.45; L20 p.15, p.44 -->

<a id="topic-6"></a>
## 6. Diagnosis, remedies and bias in evaluation itself

### Diagnosing with learning curves

Plot training and test error as functions of the training-set size $N'$. The slides fit a quadratic regression $h(x;\theta)=\theta_0+\theta_1x+\theta_2x^2$ while adding training points $N'=1,2,3,\dots$: with very few points the model fits them perfectly, so training error is near 0 and test error is high; as points are added, training error rises and test error falls.

![L12 slide 34 - Diagnosing high bias](assets/08-evaluation/slide-l12-34.png)

**High bias**: in the lower-left plot the yellow training error and the red test error both flatten quickly, both end up high, and they are close together; the black double arrow measures this overall high error level. In the two small plots on the right, the blue straight line fits the curved data badly whether there are only a few points (top) or many (bottom). More data alone will not help much.
<!-- Sources: L12 p.32-34 -->

![L12 slide 35 - Diagnosing high variance](assets/08-evaluation/slide-l12-35.png)

**High variance**: training error is low, test error is high, and the double arrow marks a clear **gap** between the curves. In the top-right small plot a wiggly curve passes through every training point; in the bottom-right plot, with many more points, the curve becomes smooth and sensible. More training data is likely to help — the gap narrows as data grows.
<!-- Sources: L12 p.35 -->

| Problem | Remedy |
| --- | --- |
| High bias | Use a more complex model (e.g. a non-linear one); add features; boosting |
| High variance | Add training data; reduce features ([09 Feature selection](09-feature-selection.en.md)); reduce model complexity; bagging |
<!-- Sources: L12 p.37-38 -->

Boosting and bagging are covered in [13 Ensemble learning](13-ensemble-learning.en.md).

### The evaluation metric is an estimator too

We want a classifier's "true" error rate, but can only compute an estimate from a particular set of evaluation instances. Only with infinitely many instances does the apparent error rate equal the true one. Possible problems: high accuracy on some evaluation sets but poor accuracy on others; and overfitting to the validation data.
<!-- Sources: L12 p.40-42 -->

- **Evaluation bias**: the estimated effectiveness is systematically too high or too low;
- **Evaluation variance**: the estimate changes a lot when the test instances change (hard to separate from model variance).
<!-- Sources: L12 p.43 -->

| Technique | Effect |
| --- | --- |
| Holdout: more training, less test data | Less model variance, more evaluation variance (and vice versa) |
| k-fold cross-validation | Less model and evaluation variance than holdout |
| Stratification | Less model and evaluation bias |
| Leave-one-out cross-validation | No sampling bias; generally the lowest bias and variance |
<!-- Sources: L12 p.44 -->

![L12 slide 45 - Report mean and variance of k-fold scores](assets/08-evaluation/slide-l12-45.png)

This is the same figure as in [k-fold cross-validation](#topic-1), except that the right side now gives the variance of the $k$ scores $E_1,\dots,E_k$ as well as the mean $\mu$.

**Key point:** when reporting cross-validation, report the variance $\frac{1}{k}\sum(E_i-\mu)^2$ as well as the mean $\mu=\frac{1}{k}\sum E_i$, so readers know how stable the estimate is.
<!-- Sources: L12 p.45 -->

## Self-check

1. You compared 5 values of $k$ on the test set, picked the best, and reported its test accuracy. What is wrong, and how should you fix it?
2. One cancer-screening model has precision 0.9 and recall 0.3; another has precision 0.4 and recall 0.95. Which should screening prefer? What is each model's F1?
3. In three-class data one class holds 90% of instances. Why can micro-averaged F1 look good while macro-averaged F1 is poor?
4. Training error is 2%, validation error 25%, and the gap shrinks as training data is added. Is this high bias or high variance? What else could you do?
5. A regression model's RMSE is much larger than its MAE. What does this say about its residuals?
