# COMP90049 Lecture 19 - Semi-supervised Learning, Active Learning and Pre-training

Sources: `lecture/19-semisupervised.pdf` (p.1–55); Apple Notes: CS/25S2/IML — "W10L19 Weakly supervised learning". Pages 41–42 are exam-style example questions and are not included in these notes.

This lecture asks: **when there is little labelled data and lots of unlabelled data, how can we use both?**

Learning path: [Why use both](#topic-1) → [Semi-supervised learning and self-training](#topic-2) → [Active learning](#topic-3) → [Data augmentation](#topic-4) → [Self-supervised pre-training and fine-tuning](#topic-5).

Key points: the self-training loop and its confidence threshold; the three uncertainty-sampling strategies. Hard parts: the bias each method introduces. Common mistakes: "cluster, then label by the majority" looks reasonable but is a bad idea; different uncertainty-sampling strategies can pick different instances.

<a id="topic-1"></a>
## 1. Why use both

### Supervised and unsupervised learning each fall short

![Slide 03 - Supervised vs unsupervised pros and cons](assets/12-semi-supervised-learning/slide-03.png)

The top half lists the pros and cons of each kind of learning with blue plus and minus signs; the three bar charts below are three "topics" (topic 1–3) found by a topic model, each bar being a word and its weight. The annotation with the arrow on the right is the reminder: an unsupervised result "makes only as much sense as you can make out of it".

| | Supervised learning | Unsupervised learning |
| --- | --- | --- |
| Pros | Clear-cut and interpretable | Can discover new things; data is abundant |
| Cons | We must already know what we are looking for (classes, labels); annotated data is scarce | Often noisy and hard to interpret |
<!-- Sources: L19 p.3 -->

### Labels are the bottleneck, and the amount of data matters

![Slide 06 - More data helps as much as more layers](assets/12-semi-supervised-learning/slide-06.png)

The horizontal axis is the number of layers (50, 101, 152); the vertical axis is mean AP (average precision). The blue line is trained on ImageNet, about 14 million images; the orange line on 300 million images (300M). At every depth the orange line is higher, and the gain from going from 50 to 152 layers is about as large as the gain from switching from ImageNet to 300M. So adding data is nearly as effective as adding layers; with little data, more parameters do not help.

Labels may need experts or special devices, or be hard to obtain for privacy reasons, while unlabelled data is cheap and plentiful. On the other hand, clusters or latent features from purely unsupervised learning may not match the task, may be hard to interpret, or may even point in the wrong direction (p.7).
<!-- Sources: L19 p.4-7 -->

### Four ways out

![Slide 08 - Four alternatives to going unsupervised](assets/12-semi-supervised-learning/slide-08.png)

This page asks four "what if..." questions, each with a red arrow to one method; these are the four later topics of the lecture:

| What you have | Method |
| --- | --- |
| A little labelled + lots of unlabelled data | Semi-supervised learning (self-training) |
| A little labelled data + a limited labelling budget | Active learning |
| The ability to modify labelled data to make more of it | Data augmentation |
| A related unsupervised (self-supervised) task to "warm up" on first | Pre-training + fine-tuning |
<!-- Sources: L19 p.8; Apple Notes W10L19 Weakly supervised learning -->

The student's notes put it memorably: the few labelled examples "give a direction", the many unlabelled examples "give a push".
<!-- Sources: Apple Notes W10L19 Weakly supervised learning -->

<a id="topic-2"></a>
## 2. Semi-supervised learning and self-training

### A passive learner takes in both kinds of data

![Slide 11 - Semi-supervised learning diagram](assets/12-semi-supervised-learning/slide-11.png)

At the top is the raw unlabelled data $X_1,X_2,X_3,\dots$. The Expert/Oracle on the right labels part of it, producing $(X_1,Y_1),(X_2,Y_2),\dots$ at the bottom, which go to the **passive learner** on the left. Compared with the previous page (ordinary supervised learning), this page adds the arrow at the upper left: unlabelled data also goes straight into the learner. "Passive" means the learner cannot decide which data gets labelled (contrast active learning).

### The goal

Let $L=\{(x_i,y_i)\}_{i=1}^{l}$ be the labelled instances and $U=\{x_i\}_{i=l+1}^{l+u}$ the unlabelled ones, usually with $U\gg L$. **Semi-supervised learning** aims to learn a better classifier from $L\cup U$ than is possible from $L$ alone.
<!-- Sources: L19 p.12 -->

### A bad idea: cluster, then label by majority

![Slide 13 - Clusters over labelled and unlabelled points](assets/12-semi-supervised-learning/slide-13.png)

Hollow circles are unlabelled points, the red and blue dots are the few labelled points, and the dashed outlines are the two clusters found. The idea: give each cluster's unlabelled members the majority class of its labelled members.

![Slide 15 - Clustering plus majority voting is a bad idea](assets/12-semi-supervised-learning/slide-15.png)

This is the result after labelling: every point in the upper cluster turns red, every point in the lower cluster turns blue, and the diagonal line is the boundary this produces. Note that only four labelled points decide the labels of about forty points; the small group at the very top and the small group at the lower left are far from any labelled point, yet each inherits its cluster's label wholesale just because clustering put it there. If the clustering does not match the true classes (for example, if the lower-left group actually belongs to another class), the whole group is wrong together. The upper right of the page says outright "A bad idea".
<!-- Sources: L19 p.12-15 -->

**Common mistake:** clusters need not align with classes. The student's notes add why: errors spread systematically through a whole cluster, and points near the boundary are lumped together, ignoring the assumption that classes should be separated by low-density regions.
<!-- Sources: L19 p.15; Apple Notes W10L19 Weakly supervised learning -->

### Self-training

![Slide 16 - Self-training algorithm](assets/12-semi-supervised-learning/slide-16.png)

**Self-training (also called bootstrapping)** uses no external resources; it enlarges its own training set with its own predictions:

```text
repeat
    train a model f on L with any supervised method
    use f to predict labels for the instances in U
    pick the subset of U with "high confidence" labels
    move them from U to L, using the predictions as ground truth
until L does not change
```
<!-- Sources: L19 p.16 -->

**Key point:** what moves into $L$ are the model's **predictions**, not true labels; every later round trains on these predictions as if they were the truth.

#### With 1-NN

With 1-NN, "high confidence" means the unlabelled instances whose nearest neighbour is already in $L$.
<!-- Sources: L19 p.17 -->

![Slide 19 - One step of 1-NN self-training](assets/12-semi-supervised-learning/slide-19.png)

The filled red and blue dots are already in $L$. The hollow point with a red ring and the hollow point with a blue ring are the ones selected this round: their nearest neighbour is a labelled point, so they take that point's colour. On the next page (p.20) they become filled, and on the page after that new points are ringed — this is how labels spread outwards step by step.

![Slide 22 - Self-training with 1-NN over iterations](assets/12-semi-supervised-learning/slide-22.png)

The process on real data: weight on the horizontal axis, height on the vertical axis, green points not yet labelled. The four panels are iterations 1, 25, 70 and 100: starting from one red cross and one blue dot, labels spread outwards along nearest neighbours, until the two groups are coloured red and blue.
<!-- Sources: L19 p.18-22 -->

![Slide 24 - Self-training can propagate errors](assets/12-semi-supervised-learning/slide-24.png)

The red and blue ellipses are the true extents of the two classes; the red cross and blue dot are the initial labelled points. The slide then asks: what if the initial labelled point were at the arrow (a small cluster at the edge of the blue group)? Labels can only spread step by step along nearest neighbours from the starting points, so a different start can give a different propagation path and result; once a step assigns a wrong label, the error keeps spreading.
<!-- Sources: L19 p.23-24 -->

### Self-training's assumption and safety net

![Slide 25 - Self-training assumptions](assets/12-semi-supervised-learning/slide-25.png)

Propagating labels relies on an assumption: nearby (similar) points are likely to share a label. Classification errors propagate, so a "safety net" is needed: do not add to $L$ when the confidence is below a threshold, e.g. in 1-NN only accept points whose nearest-neighbour distance is below $\tau$. Without this threshold, wrong low-confidence predictions are also added to $L$ as true labels and keep spreading in every later round.
<!-- Sources: L19 p.25 -->

Self-training with Naive Bayes is the same: train on $L$, predict class probabilities for $U$, move instances whose probability exceeds a threshold (or the top-N most confident) into $L$ with their predicted labels, until $L$ stops changing or changes very little.
<!-- Sources: L19 p.26 -->

<a id="topic-3"></a>
## 3. Active learning

### Let the model choose what to label

![Slide 29 - Active learning loop](assets/12-semi-supervised-learning/slide-29.png)

The same figure as slide 11, but "Passive" on the left is crossed out and replaced with "Active". A column of arrows going back and forth is added in the middle: the red arrows are the learner's requests $(X_1,?)$, $(X_3,?)$, and the blue arrows are the oracle's replies $(X_1,Y_1)$, $(X_3,Y_3)$. So in **active learning** the learner picks some unlabelled instances and asks an **oracle** (e.g. a human annotator) for their labels, then trains on the new labels.
<!-- Sources: L19 p.28-30 -->

The underlying hypothesis: if the classifier has a say in choosing its training instances, it can reach higher accuracy with fewer of them; labelling is a finite resource and should be spent where it improves effectiveness most.
<!-- Sources: L19 p.30 -->

![Slide 32 - Which mushrooms to ask about](assets/12-semi-supervised-learning/slide-32.png)

Top left and top right are two references with known labels: red with white spots is poisonous, brown is not poisonous. The pile in the middle is unlabelled. The two circled mushrooms are exactly the ones that are hard to call: the upper one is brown but has white spots, the lower one has a red cap but a different kind of stem, so each resembles both references. The learner should ask the expert about these, not about the ones that can be judged at a glance.

### Which instances to choose

![Slide 33 - Choose uncertain instances](assets/12-semi-supervised-learning/slide-33.png)

Worth labelling are the instances the model is most **uncertain** about: points near the class boundary (the small black dots near the red line where the × and o meet), or points in regions with few labels.
<!-- Sources: L19 p.33 -->

Query strategies fall into two families: **uncertainty sampling** (the three below) and **query by committee**.

### Uncertainty sampling

All three pages use the same example: the predicted probabilities of three characters, Left, Middle and Right, over Cat/Dog/Pig.

#### Least confidence

![Slide 36 - Least confidence](assets/12-semi-supervised-learning/slide-36.png)

**Least confidence**: look at each instance's probability for its most likely class, then pick the instance where this probability is smallest:

$$
x^{*}=\arg\min_x \max_y P(y\mid x).
$$

The green cells are each row's maximum (0.70, 0.50, 0.34); the red box marks the smallest of them: Right.

#### Margin sampling

![Slide 38 - Margin sampling](assets/12-semi-supervised-learning/slide-38.png)

**Margin sampling**: look at the gap between the top two classes; the smaller the gap, the harder the call:

$$
x^{*}=\arg\min_x \big(P(y_1\mid x)-P(y_2\mid x)\big),
$$

where $y_1,y_2$ are the most likely and second most likely classes for $x$. The yellow highlights are each row's top two: Left's gap is 0.45, Middle's 0.05, Right's only 0.01, so Right is chosen.

#### Entropy sampling

![Slide 39 - Entropy uses all class probabilities](assets/12-semi-supervised-learning/slide-39.png)

The first two strategies look at only one or two probabilities; **entropy sampling** uses all of them. The two hand-drawn bar charts are two predicted distributions: on the left all classes are about equally tall (a flat distribution, high entropy, a very uncertain model); on the right one bar is clearly taller (a peaked distribution, low entropy). In the slide's formula $\theta$ is the model's parameters, $\hat y_i$ ranges over all classes, and the logarithm is base 2.

![Slide 40 - Entropy sampling table](assets/12-semi-supervised-learning/slide-40.png)

$$
x^{*}=\arg\max_x \Big(-\sum_y P(y\mid x)\log P(y\mid x)\Big).
$$

The table's last column only says Low / Medium / High. The table below fills in the numbers (the entropies are our own base-2 calculation):

| Instance | P(Cat) | P(Dog) | P(Pig) | Max probability | Top-two gap | Entropy |
| --- | --- | --- | --- | --- | --- | --- |
| Left | 0.70 | 0.05 | 0.25 | 0.70 | 0.45 | 1.08 |
| Middle | 0.45 | 0.05 | 0.50 | 0.50 | 0.05 | 1.23 |
| Right | 0.34 | 0.33 | 0.33 | 0.34 | 0.01 | 1.58 |
<!-- Sources: L19 p.34-40 -->

All three strategies pick Right: its maximum probability is lowest, its top two are almost tied, and its entropy is highest.
<!-- Sources: L19 p.35-40 -->

**Common mistake:** the three agree in this example, but that is not guaranteed in general. `Worked example (my own)`: two instances have predicted distributions (0.5, 0.5, 0) and (0.4, 0.3, 0.3). Least confidence compares 0.5 with 0.4 and picks the second; margin sampling compares 0 with 0.1 and picks the first. The reason is that the margin looks only at the top two, while least confidence looks only at the top one.

### Query by committee

![Slide 43 - Query by committee](assets/12-semi-supervised-learning/slide-43.png)

**Query by committee (QBC)**: keep a set of models, all trained on the same labelled data but in different ways; let them vote on each unlabelled instance, and pick the one with the **most disagreement** for labelling. If the committee disagrees, the model is uncertain and gains most from the true label. Disagreement can be measured by **vote entropy**: the more spread out the votes, the higher the entropy.
<!-- Sources: L19 p.43 -->

**Note:** the student's notes write vote entropy as $-\sum_y\frac{V(y)}{C}\log\frac{V(y)}{C}$, where $V(y)$ is the number of votes for class $y$ and $C$ is the committee size. It is simply the entropy of the vote proportions treated as a probability distribution.
<!-- Sources: Apple Notes W10L19 Weakly supervised learning -->

### Practicalities

Active learning is used more and more and is empirically robust, but lacks a theoretical justification; it introduces bias, because the data chosen and labelled no longer follows the true label distribution (what gets chosen is always "hard" instances near the boundary, not a random sample from the true distribution); and uncertainty sampling can pick outliers or noise.
<!-- Sources: L19 p.44 -->

<a id="topic-4"></a>
## 4. Data augmentation

![Slide 45 - Augmented versions of one image](assets/12-semi-supervised-learning/slide-45.png)

On the left is one original image (a cat); on the right are six variations of it: flip, rotation, blur, exposure, contrast and grayscale. All six are still labelled "cat", so one labelled example has become seven.

**Data augmentation**: add a small amount of "noise" to each labelled instance to create several variations (p.46 illustrates this with several cropped and rotated versions of a puppy).
<!-- Sources: L19 p.46 -->

- Images: adjust brightness, flip left-right, shift up/down/left/right, resize, rotate;
- Audio: adjust volume, shift in time, adjust frequencies;
- Text: synonym substitution.
<!-- Sources: L19 p.47 -->

These perturbations should not change the instance's label, and should generally be the kind of variation expected in real-world data.
<!-- Sources: L19 p.47 -->

**Common mistake:** whether a transformation is "safe" depends on the task. `Worked example (my own)`: flipping handwritten digits left-right turns some digits into something that is no longer the same digit, and mirrored digits do not occur in real handwriting, so it is usually unsuitable.

![Slide 49 - Crops that lose the object](assets/12-semi-supervised-learning/slide-49.png)

This page sits under the "Pros and Cons" title and is a visual example of a disadvantage: of six random crops of the same puppy, the top-middle one shows only the ground, the top-left one only a paw, and the others only parts such as the nose or an ear. Still labelling these as "dog" feeds the model features that are not there, or even wrong labels.

| Pros | Cons |
| --- | --- |
| More data nearly always improves learning | Biased training data |
| Most learning algorithms are somewhat robust to noise | May introduce features that do not exist in the real world |
| | May propagate errors |
| | Increases problems with interpretability and transparency |
<!-- Sources: L19 p.48 -->

<a id="topic-5"></a>
## 5. Self-supervised pre-training and fine-tuning

### Pre-training plus fine-tuning

![Slide 52 - Pre-training and fine-tuning](assets/12-semi-supervised-learning/slide-52.png)

Deep learning's success comes from better models, bags of tricks, more powerful machines (GPUs) and more data — but not all data can be labelled (p.51). The key practice is **pre-training + fine-tuning**:
<!-- Sources: L19 p.51-52 -->

1. Pre-train reusable parameters on an unsupervised (**self-supervised**) task;
2. Initialise the model with the pre-trained weights;
3. Fine-tune on the (usually supervised) target task.
<!-- Sources: L19 p.52 -->

Self-supervised "labels" come from the data itself: corrupt or modify the data, then ask the model to reconstruct it. Text: masked-token prediction, sentence shuffling, next-token prediction (auto-regression); images: diffusion (noising and denoising), contrastive learning (create augmented versions and learn that they are the same).
<!-- Sources: L19 p.52 -->

### Example: BERT

![Slide 53 - BERT pre-training tasks](assets/12-semi-supervised-learning/slide-53.png)

BERT is pre-trained with two tasks: **masked language modelling (MLM)** — predict the masked word in a sentence, e.g. "The cat [MASK] on the mat."; and **next sentence prediction (NSP)** — decide whether one sentence follows another. The two boxes below are a positive and a negative NSP example: the cat sitting on the mat followed by a sentence about it purring in the sun is labelled `IsNext`; followed by a stock-market sentence it is labelled `NotNext`. The labels for both tasks come straight from the original text, with no human annotation.

![Slide 54 - BERT fine-tuning](assets/12-semi-supervised-learning/slide-54.png)

The three icons at the top are downstream tasks it can be fine-tuned for: spam detection, IT-ticket categorisation and review sentiment analysis. The three steps below: take the pre-trained BERT, add a classification layer on top, and fine-tune the whole model on a small labelled dataset.
<!-- Sources: L19 p.53-54 -->

## Self-check

1. What happens in self-training if no confidence threshold is set?
2. Three instances have predicted distributions (0.6, 0.4, 0), (0.5, 0.25, 0.25) and (0.45, 0.45, 0.1). Which does least confidence pick, which does margin sampling pick, and which does entropy sampling pick?
3. Why does active learning make the label distribution of the training set drift from the true distribution?
4. When augmenting data for a traffic-sign recognition model, which transformations are appropriate, and which might change the label?
5. Why do BERT's MLM and NSP need no human annotation?
