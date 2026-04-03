# 03 Text Classification

## Task shape

- Text classification maps a document or text pair to one label from a fixed class set.
<!-- Sources: L4 p.3 -->
- Common task types include topic classification, sentiment analysis, native-language identification, and natural language inference.
<!-- Sources: L4 p.4-12 -->

## Standard workflow

1. Identify the task.
2. Collect a corpus.
3. Annotate it.
4. Select features.
5. Choose a learning algorithm.
6. Train and tune on development data.
7. Iterate if needed.
8. Train the final model.
9. Evaluate on held-out test data.
<!-- Sources: L4 p.13 -->

- Development data is for tuning, while test data is reserved for final evaluation.
<!-- Sources: L4 p.13, p.30 -->

## Algorithm selection criteria

- Bias, variance, modelling assumptions, complexity, and speed are the main comparison axes.
<!-- Sources: L4 p.15 -->

## Classical model comparison

| Model | Main strengths | Main weaknesses |
| --- | --- | --- |
| Naive Bayes | fast, robust, simple, low variance | unrealistic independence assumption, smoothing needed |
| Logistic regression | handles correlated features well, probabilistic output | needs scaling, regularisation, and more data |
| SVM | strong linear baseline, good with huge feature sets | multiclass awkwardness, class imbalance, scaling |
| kNN | simple, naturally multiclass, no training | slow inference, sensitive to `k` and feature space |
| Decision tree | fast, no scaling requirement, useful on small feature sets | weaker on large feature spaces |
| Random forest | more robust than a single tree | reduced interpretability, slower at scale |
| Neural network | strong capacity, less feature engineering | many hyper-parameters, slow training, overfitting risk |
<!-- Sources: L4 p.16-29 -->

## Naive Bayes

$$
P(C \mid F) \propto P(F \mid C) P(C)
$$
<!-- Sources: L4 p.16 -->

- Feature independence is assumed conditionally on the class.
<!-- Sources: L4 p.16 -->

## Logistic regression

$$
P(c \mid f_1,\dots,f_m)=\frac{1}{Z}\exp\left(\sum_{i=0}^{m} w_i f_i\right)
$$
<!-- Sources: L4 p.18 -->

- The training objective is likelihood maximisation with regularisation.
<!-- Sources: L4 p.18 -->

## Decision trees and forests

- Decision-tree splits are selected greedily using mutual information.
<!-- Sources: L4 p.24 -->
- Random forests aggregate predictions from trees trained on different subsets of data and feature space.
<!-- Sources: L4 p.26 -->

## Practical notes from the workshop

- Text representation is the central difficulty in many classification tasks.
<!-- Sources: Wk3 p.4-8 -->
- Cosine similarity is often preferable to Euclidean distance for text kNN.
<!-- Sources: Wk3 p.10-11 -->
- Linear kernels are often effective in text SVM settings.
<!-- Sources: Wk3 p.15 -->

## Main takeaway

- Dataset quality, dataset size, and feature design often matter more than the difference between several reasonable classifier choices.
<!-- Sources: L4 p.31 -->
