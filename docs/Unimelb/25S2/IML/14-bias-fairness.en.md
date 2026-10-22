# COMP90049 Lecture 21 - Measuring and Mitigating Algorithmic Bias

Sources: `lecture/21-bias-fairness.pdf`; Apple Notes: CS/25S2/IML — "W11L21 Bias & Fairness".

This lecture asks: **where can machine-learning systems become unfair, how can "fairness" be defined in numbers, and at which stages can it be improved?**

Learning path: [Sources of bias](#topic-1) → [Bias along the ML pipeline](#topic-2) → [Sensitive attributes and "unawareness"](#topic-3) → [Formal fairness criteria](#topic-4) → [Making classifiers fairer](#topic-5).

Key points: which conditional probability each of the three group-fairness criteria compares. Hard parts: why the criteria cannot all be satisfied at once. Common mistakes: deleting the sensitive attribute does not remove discrimination (proxy variables).

<a id="topic-1"></a>
## 1. Sources of bias

Medical diagnosis, hate-speech detection, insurance recommendations, predictive policing, the legal domain… the more widely machine learning is used, the more serious the consequences of getting it wrong. Slides p.5–9 illustrate this with several news reports, which are not reproduced here.
<!-- Sources: L21 p.4-9 -->

### Humans are biased

![Slide 12 - Humans are biased](assets/14-bias-fairness/slide-12.png)

From thousands of cognitive biases, the slide picks two:

- **Out-group homogeneity bias**: people tend to see out-group members as less nuanced than in-group members — stereotypes and prejudice;
- **Correlation fallacy**: mistaking two co-incidentally co-occurring events for cause and effect.
<!-- Sources: L21 p.12 -->

### Data is biased

![Slide 13 - Historical bias in image search](assets/14-bias-fairness/slide-13.png)

**Historical bias**: even a randomly sampled dataset reflects the world as it was, including biases that should not be carried forward. The screenshot shows image-search results for "professor" (the next slide shows "nurse"): the results reflect who held these jobs in the past, and a model that learns from them treats that make-up as a "rule".

![Slide 15 - Reporting bias word counts](assets/14-bias-fairness/slide-15.png)

**Representation / reporting bias**: the data does not faithfully represent the population. Look at the word-frequency table at the bottom right (counts per trillion words): "murdered" appears over 2.8 million times, "breathed" only about 0.7 million, and "exhaled" even less — people breathe every day but rarely write it down. Obvious facts are under-reported and anomalies over-emphasised; likewise, minority groups are under-represented, and negative results are under-reported while positive ones are over-reported.

![Slide 17 - Measurement bias and remedies](assets/14-bias-fairness/slide-17.png)

**Measurement bias** takes three forms, each with an example on the slide:

| Form | Example |
| --- | --- |
| ① Noisy measurement, with errors or missing data that are not randomly distributed | Arrest records differ in detail across postcode areas |
| ② Using a noisy proxy as the label of interest | "Hiring decision" standing in for "applicant quality" |
| ③ Oversimplifying the quantity of interest | Reducing US political leaning to Democrat vs Republican |
<!-- Sources: L21 p.13-16 -->

The pink bar at the bottom gives the remedies: know your domain, know your task, know your data.
<!-- Sources: L21 p.17 -->

### Models are biased

![Slide 19 - Model bias and remedies](assets/14-bias-fairness/slide-19.png)

- **Model fit**: weak models have high bias and low variance (see [08](08-evaluation.en.md)); model assumptions may be unjustified. The two distribution curves at the top right sketch the shape a model assumes;
- **Biased loss functions**: blind to certain types of error. For example, with highly imbalanced data a 0/1 loss tends to tolerate errors on the minority class.
<!-- Sources: L21 p.18 -->

The pink box gives the remedies: consider model assumptions carefully; choose loss functions carefully; model groups separately; represent groups fairly in the data.
<!-- Sources: L21 p.19 -->

### Evaluation and deployment are biased

![Slide 21 - Evaluation and deployment bias](assets/14-bias-fairness/slide-21.png)

- **Evaluation bias**: the test set does not represent the target population; overfitting to a test set (widely used benchmark datasets can reinforce this); metrics may not capture everything of interest (e.g. accuracy can disregard minority groups or report only average effects; face-recognition models trained and evaluated largely on images of white people).
- **Deployment bias**: systems used in ways they were not intended for; end users lacking education about them.
<!-- Sources: L21 p.20 -->

The pink box at the top right gives the remedies: choose evaluation metrics carefully; use several metrics; choose test sets and benchmarks carefully; document models so they are used correctly.
<!-- Sources: L21 p.21 -->

<a id="topic-2"></a>
## 2. Bias along the ML pipeline

![Slide 22 - The machine learning pipeline](assets/14-bias-fairness/slide-22.png)

Follow the arrows round the loop: the **world** is measured to give **data**, the data is learned from to give a **model**, the model takes actions on **individuals**, and their behaviour returns to the model as feedback; the dashed arrow shows that individuals are part of the world. Every step can introduce bias (slides p.23–26 highlight each stage in turn):
<!-- Sources: L21 p.22 -->

| Stage | What to watch |
| --- | --- |
| Measurement | Define the variables of interest and the target variable; critical when the target is not measured directly, e.g. hiring decision → applicant quality, income → creditworthiness |
| Learning | Data contains both "knowledge" (smoking causes cancer) and "stereotypes" (boys like blue, girls like pink); the difference depends on social norms, with no clear line |
| Action | ML outputs (classification, regression, retrieval) become real actions: spam or not, credit granted, search results, hotel recommendations |
| Feedback | Approximated from user behaviour, e.g. click rates |
<!-- Sources: L21 p.23-26 -->

### Example: unintended discrimination

![Slide 27 - Unintended discrimination case study](assets/14-bias-fairness/slide-27.png)

Amazon introduced same-day delivery by postcode in the USA, aiming to minimise cost and maximise efficiency, and used a model to predict where to deliver. Look at the Boston and New York maps on the right: the served (blue) and unserved (grey) areas show a clear geographical pattern — nobody intended to discriminate, yet the outcome can disadvantage some groups.
<!-- Sources: L21 p.27 -->

<a id="topic-3"></a>
## 3. Sensitive attributes and "unawareness"

![Slide 29 - Sensitive attributes notation](assets/14-bias-fairness/slide-29.png)

| Symbol | Meaning |
| --- | --- |
| $X$ | Non-sensitive features |
| $A$ | Sensitive attributes with discrete values (male/female, old/young, …) |
| $Y$ | True labels |
| $\hat{Y}$ | Predicted labels |
<!-- Sources: L21 p.29 -->

Instances usually mix useful, uncontroversial attributes with **sensitive attributes** on which we do not want to base decisions. Different attributes divide the population into different demographic groups. It is rarely clear which attributes are sensitive, and the choice can have profound impact.
<!-- Sources: L21 p.29 -->

![Slide 30 - Fairness through unawareness](assets/14-bias-fairness/slide-30.png)

**Fairness through unawareness**: hide all sensitive features and train only on $X$ :

$$
P(\hat{Y}_n\mid X_n,A_n)\approx P(\hat{Y}_n\mid X_n).
$$
<!-- Sources: L21 p.30 -->

**Common mistake:** $X$ may be correlated with $A$ . The case study in the lower half of the slide: a bank serves both humans and martians, and schools and education levels on Mars differ from those on Earth, so even with "species" removed, "education" still reveals it. The student's notes call this **proxy discrimination**, e.g. education and age, or name and race or gender.
<!-- Sources: L21 p.30; Apple Notes W11L21 Bias & Fairness -->

<a id="topic-4"></a>
## 4. Formal fairness criteria

![Slide 32 - Metric recap](assets/14-bias-fairness/slide-32.png)

First recall the metrics. The table's rows are the true label $y$ and its columns the prediction $\hat{y}$ (the confusion matrix is in [08](08-evaluation.en.md)):

$$
\mathrm{PPV}=\frac{TP}{TP+FP}\ (\text{precision}),\qquad
\mathrm{TPR}=\frac{TP}{TP+FN}\ (\text{recall}),\qquad
\mathrm{FNR}=\frac{FN}{TP+FN}=1-\mathrm{TPR}.
$$
<!-- Sources: L21 p.32 -->

The example used throughout: a bank trains a classifier to decide whether to grant an applicant credit; applicants are humans (the majority) and martians (the protected minority), "species" is the **protected attribute**, and the classifier should be fair to both.
<!-- Sources: L21 p.33 -->

### Criterion I: group fairness (demographic parity)

![Slide 34 - Demographic parity example](assets/14-bias-fairness/slide-34.png)

**Demographic parity** requires the prediction to be statistically independent of the sensitive attribute, $\hat{Y}\perp A$ :

$$
P(\hat{Y}=1\mid A=m)=P(\hat{Y}=1\mid A=h).
$$
<!-- Sources: L21 p.34 -->

How to read the figure: the two boxes at the top are the two groups of applicants in the training set, filled circle = should get credit, hollow circle = should not (blue martians, red humans); the strip at the bottom is those predicted "grant credit", filled for true positives and hollow for false positives. 4 of 12 martians and 6 of 18 humans are approved: $4/12=6/18=1/3$ , so demographic parity holds.
<!-- Sources: L21 p.34 -->

Look closer at the bottom strip: the 4 approved martians are mostly hollow (unqualified), while the 6 approved humans are mostly filled (qualified). That is exactly its flaw: it is simple and intuitive, but it **ignores the true label** $Y$ entirely, so a classifier could approve truly qualified people in the majority group and unqualified people in the minority group without any penalty — which could further harm the minority group's reputation.
<!-- Sources: L21 p.35 -->

### Criterion II: predictive parity

![Slide 36 - Predictive parity example](assets/14-bias-fairness/slide-36.png)

**Predictive parity**: all groups have the same PPV (precision), i.e. the same fraction of predicted positives are truly positive:

$$
P(Y=1\mid\hat{Y}=1,A=m)=P(Y=1\mid\hat{Y}=1,A=h).
$$

In the figure, 2/4 of the approved martians and 3/6 of the approved humans are filled (truly qualified): both 1/2.
<!-- Sources: L21 p.36 -->

It takes the true label into account, but it **accepts (and can amplify) unfairness already in the ground truth**: if humans are more likely to have good credit in the data, the classifier may give humans good scores more often in the first place.
<!-- Sources: L21 p.37 -->

### Criterion III: equal opportunity

![Slide 38 - Equal opportunity example](assets/14-bias-fairness/slide-38.png)

**Equal opportunity**: all groups have the same FNR (equivalently, TPR), i.e. truly qualified people are equally likely to be rejected:

$$
P(\hat{Y}=0\mid Y=1,A=m)=P(\hat{Y}=0\mid Y=1,A=h)
\iff
P(\hat{Y}=1\mid Y=1,A=m)=P(\hat{Y}=1\mid Y=1,A=h).
$$
<!-- Sources: L21 p.38 -->

This time look at the filled circles at the top: martians and humans each have 6 truly qualified applicants, and 4 of each appear in the approved strip below, both $4/6=2/3$ . People with truly good credit should get similar predictions regardless of species; the limitation is the same as for predictive parity.
<!-- Sources: L21 p.38-39 -->

**Note:** the student's notes also record **equalised odds**: on top of equal opportunity, require $P(\hat{Y}=0\mid Y=0,A)$ to be equal across groups as well, so truly unqualified people are treated alike too.
<!-- Sources: Apple Notes W11L21 Bias & Fairness -->

| Criterion | Quantity compared | Uses $Y$ ? | Intuition |
| --- | --- | --- | --- |
| Demographic parity | $P(\hat{Y}=1\mid A)$ | No | Equal approval rates |
| Predictive parity | $P(Y=1\mid\hat{Y}=1,A)$ , PPV | Yes | Approved people are equally reliable (no wrong picks) |
| Equal opportunity | $P(\hat{Y}=1\mid Y=1,A)$ , TPR | Yes | Qualified people get the same chance (no missed picks) |
<!-- Sources: L21 p.34-39; Apple Notes W11L21 Bias & Fairness -->

**Common mistake:** the three criteria have different denominators. Demographic parity divides by "the whole group", predictive parity by "the approved people", equal opportunity by "the truly qualified people". A classifier can satisfy one and violate another: equal approval rates do not guarantee that the same share of approved people are qualified. When judging, first ask "who is in the denominator?".

### Criterion IV: individual fairness

![Slide 40 - Individual fairness](assets/14-bias-fairness/slide-40.png)

**Individual fairness** does not balance by group but compares individuals directly: people with similar features $X$ (job, education, …) should get similar scores:

$$
P(\hat{Y}_i=1\mid A_i,X_i)\approx P(\hat{Y}_j=1\mid A_j,X_j)\quad\text{if }\ \mathrm{sim}(X_i,X_j)>\theta .
$$

The figure puts a human and a martian into $\mathrm{sim}(\cdot,\cdot)$ and writes "???" as the result: the difficulty is exactly defining the similarity function $\mathrm{sim}()$ (often non-trivial) and choosing the threshold $\theta$ .
<!-- Sources: L21 p.40 -->

### No fair free lunch

![Slide 41 - No fair free lunch](assets/14-bias-fairness/slide-41.png)

Each group of bars is one ethnic group's "fraction of non-defaulters getting a loan", and the colours are different decision rules (maximum profit only, a single threshold, demographic parity, equal opportunity, equalised odds). The same group's fraction varies widely across rules: different fairness criteria give different "fair" predictions; satisfying them all is difficult, sometimes provably impossible; and there is often a trade-off between fairness and overall performance.
<!-- Sources: L21 p.41 -->

<a id="topic-5"></a>
## 5. Making classifiers fairer

Improvements can be made at three stages: pre-processing, training (optimisation) and post-processing.
<!-- Sources: L21 p.43 -->

### Pre-processing

**Balancing the dataset**: up-sample the minority group or down-sample the majority group.
<!-- Sources: L21 p.44 -->

![Slide 45 - Re-weighting data instances](assets/14-bias-fairness/slide-45.png)

**Re-weighting**: if $A$ and $Y$ were independent, the expected distribution would be $P_{\exp}(A=a,Y=y)=P(A=a)\times P(Y=y)$ ; the observed distribution is $P_{\text{obs}}(A=a,Y=y)=\frac{\#(Y=y,A=a)}{\lvert D\rvert}$ . The slide's three rows, top to bottom, are these three steps; each instance is weighted by

$$
W(X_i=\{x_i,a_i,y_i\})=\frac{P_{\exp}(A=a_i,Y=y_i)}{P_{\text{obs}}(A=a_i,Y=y_i)} .
$$
<!-- Sources: L21 p.45 -->

**Worked example (my own):** of 100 applicants, 20 are martians, 5 of whom have good credit; 50 applicants overall have good credit. $P_{\exp}(m,1)=0.2\times0.5=0.1$ , while $P_{\text{obs}}(m,1)=5/100=0.05$ , so martians with good credit get weight 2: they are "half missing" from the data, so training counts them twice.

### Constraints during training

![Slide 46 - Fairness-constrained training](assets/14-bias-fairness/slide-46.png)

Fairness criteria can be built into training directly. With logistic regression's loss $\mathcal{L}(\theta)$ , enforcing demographic parity means solving:

$$
\min_\theta\ \mathcal{L}(\theta)\quad\text{subject to}\quad P(\hat{Y}=1\mid A=m)=P(\hat{Y}=1\mid A=h).
$$

The advantage is that fairness becomes part of the training procedure; the drawback is a more complex optimisation problem.
<!-- Sources: L21 p.46 -->

### Post-processing

![Slide 47 - Post-processing](assets/14-bias-fairness/slide-47.png)

Modify the classifier's predictions: e.g. choose a threshold $\theta$ per group (predict 1 when $w\cdot x_i>\theta$ ) to adjust PPV, TPR and FNR; or use a special strategy for "difficult" instances with $P(\hat{y}_i)\approx0.5$ (the student's notes suggest human review). The advantage is model independence — it works even with proprietary black-box models; the drawback is that the protected attribute must be available at test time.
<!-- Sources: L21 p.47; Apple Notes W11L21 Bias & Fairness -->

## Self-check

1. A hiring model hires 30% of both men and women, but only 40% of hired women are truly qualified versus 80% of hired men. Which criterion holds and which is violated?
2. Why can a model still discriminate by gender after the "gender" column is deleted?
3. A face-recognition system has 98% test accuracy, and 90% of the test faces are from one ethnic group. Which kind of bias is this, and how should it be evaluated?
4. Post-processing with a different threshold per group: what extra condition does deployment require?
