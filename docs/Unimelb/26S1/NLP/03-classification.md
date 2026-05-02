---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Text Classification
source_type: lecture+workshop
status: draft
review_priority: high
---

# 03 Text Classification

## Big Picture

Text classification turns text into a fixed label decision. It is the first major supervised-learning setting in the course and introduces the full modelling workflow: dataset construction, annotation, feature design, model choice, development tuning, and held-out evaluation.
<!-- Sources: L4 p.3-13, p.30-31; Wk3 p.4-15 -->

## Learning Map

- Prerequisite ideas: labelled datasets, features, train/dev/test splits, probability, and vector representations.
<!-- Sources: L4 p.13, p.30; Wk3 p.4-8 -->
- Core concepts: fixed label set, feature extraction, bias-variance trade-off, Naive Bayes, logistic regression, SVM, kNN, decision trees, random forests, and neural classifiers.
<!-- Sources: L4 p.3-29 -->
- Main procedures: define labels, collect and annotate data, choose representations, train models, tune on dev data, and evaluate once on held-out test data.
<!-- Sources: L4 p.13, p.30 -->
- Tutorial skills: choose suitable similarity metrics and model families for sparse text features.
<!-- Sources: Wk3 p.10-15 -->
- Common traps: tuning on test data, using Euclidean distance blindly for text kNN, or choosing a model without considering data size and feature space.
<!-- Sources: L4 p.13, p.30-31; Wk3 p.10-15 -->

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

<!-- Figure source: L4 p.13 -->

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

<!-- Figure source: L4 p.30 -->

- Text representation is the central difficulty in many classification tasks.
<!-- Sources: Wk3 p.4-8 -->
- Cosine similarity is often preferable to Euclidean distance for text kNN.
<!-- Sources: Wk3 p.10-11 -->
- Linear kernels are often effective in text SVM settings.
<!-- Sources: Wk3 p.15 -->

## Main takeaway

- Dataset quality, dataset size, and feature design often matter more than the difference between several reasonable classifier choices.
<!-- Sources: L4 p.31 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Workflow question | asks how to build a classifier | describe task, corpus, labels, features, train/dev/test, model, evaluation | skipping dev data or using test data for tuning |
| Model comparison | asks which classifier fits text data | compare feature size, data size, speed, and assumptions | choosing only by headline accuracy |
| kNN text similarity | sparse high-dimensional text vectors | prefer cosine similarity when vector direction matters | using Euclidean distance without justification |
| Linear SVM text task | many sparse features | use a linear kernel as a strong baseline | assuming nonlinear kernels are always better |
<!-- Sources: L4 p.13-31; Wk3 p.10-15 -->

## Key Comparisons

| Model | Main assumption or mechanism | Good fit | Risk |
| --- | --- | --- | --- |
| Naive Bayes | conditional feature independence | small data, fast baseline | correlated features violate assumption |
| Logistic regression | linear log-probability model | probabilistic classification | needs regularisation and scaling |
| SVM | margin-based separator | sparse high-dimensional text | multiclass and imbalance handling |
| kNN | nearest labelled examples | simple multiclass baseline | slow inference and sensitive feature space |
| Neural network | learned nonlinear features | large datasets | overfitting and tuning cost |
<!-- Sources: L4 p.16-29 -->

## Revision Checklist

- Can define text classification as input text to fixed label.
- Can explain why dev and test data have different purposes.
- Can compare Naive Bayes, logistic regression, SVM, and kNN for text.
- Can explain why feature design matters in classical classifiers.
<!-- Sources: L4 p.3-31; Wk3 p.4-15 -->

## Active Recall

1. Why is the test set not used during model tuning?
2. What independence assumption makes Naive Bayes simple?
3. Why can cosine similarity be better than Euclidean distance for text vectors?
4. What makes linear SVMs strong baselines for sparse text?
<!-- Sources: L4 p.13-31; Wk3 p.10-15 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Label set | The finite set of possible classes. |
| Development set | Data used to tune features, models, and hyperparameters. |
| Test set | Held-out data used for final evaluation. |
| Feature | A measurable property of the input used by a classifier. |
| Regularisation | A training constraint or penalty to reduce overfitting. |
<!-- Sources: L4 p.3-31 -->
