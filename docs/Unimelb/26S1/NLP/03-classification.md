# 03 Text Classification

## Scope

- Lecture: `L4 Text Classification`.
- Workshop: `Week 3` classification recap.

## What text classification covers

- The lecture introduces text classification as assigning documents or text pairs to predefined labels. [Sources: L4 p.3]
- The lecture examples include topic classification, sentiment analysis, native-language identification, and natural language inference. [Sources: L4 p.4-12]

## Standard modelling workflow

- The lecture gives a nine-step pipeline: identify a task, collect a corpus, annotate it, select features, choose an algorithm, train and tune on development data, iterate if needed, train the final model, and evaluate on held-out test data. [Sources: L4 p.13]
- This workflow makes the data split explicit: the development set is for tuning and the test set is for final evaluation only. [Sources: L4 p.13, p.30]

## How to choose an algorithm

- The lecture recommends thinking about bias versus variance, modelling assumptions, complexity, and speed when selecting a classifier. [Sources: L4 p.15]
- The lecture repeatedly frames classifier choice as a trade-off rather than a one-size-fits-all decision. [Sources: L4 p.15-31]

## Naive Bayes

- The lecture defines Naive Bayes through Bayes' rule and the simplifying assumption that features are conditionally independent given the class. [Sources: L4 p.16]
- The lecture lists its strengths as speed, robustness, low variance, and simplicity, especially when data are limited. [Sources: L4 p.17]
- The lecture lists its weaknesses as unrealistic independence assumptions, lower accuracy in many settings, and the need for smoothing on unseen class-feature combinations. [Sources: L4 p.17]

## Logistic regression

- The lecture presents logistic regression as a linear classifier whose softmax output produces valid class probabilities. [Sources: L4 p.18]
- The training objective is to maximise the probability of the training data, subject to regularisation that prefers smaller or sparser weights. [Sources: L4 p.18]
- The lecture contrasts it with Naive Bayes by saying logistic regression handles correlated and diverse features better, but requires more data, feature scaling, and careful regularisation choices. [Sources: L4 p.19]

## Support vector machines

- The lecture describes an SVM as finding a maximum-margin separating hyperplane. [Sources: L4 p.20]
- The lecture lists its strengths as fast and accurate linear classification, support for non-linearity via kernels, and good behaviour with very large feature spaces. [Sources: L4 p.20]
- The lecture lists multiclass awkwardness, feature scaling, class imbalance, and interpretability as drawbacks. [Sources: L4 p.20]
- The lecture explicitly notes that, before deep learning, SVMs were especially popular in NLP. [Sources: L4 p.21]

## k-nearest neighbour

- The lecture defines kNN as assigning the majority class among the nearest training examples in feature space. [Sources: L4 p.22]
- Euclidean distance and cosine distance are listed as alternative similarity measures. [Sources: L4 p.22]
- The lecture presents kNN as simple, training-free, and naturally multiclass, but also slow at prediction time and sensitive to the choice of `k`, class imbalance, and feature design. [Sources: L4 p.23]

## Decision trees and random forests

- The lecture defines a decision tree as a greedy tree of feature tests whose leaves are class decisions, with splits chosen by mutual information. [Sources: L4 p.24]
- The lecture lists decision trees as fast, insensitive to feature scaling, and good for small feature sets, but weak on large feature sets and often less interpretable in practice than they appear. [Sources: L4 p.25]
- Random forests are introduced as ensembles of decision trees trained on different subsets of the data and feature space, with majority voting at the end. [Sources: L4 p.26]
- The lecture presents random forests as more accurate and robust than single trees, especially on medium-sized feature sets, while still sacrificing interpretability and speed at large scale. [Sources: L4 p.27]

## Neural classifiers

- The lecture defines neural networks as layered sets of interconnected nodes with input, hidden, and output layers. [Sources: L4 p.28]
- Each node applies a linear combination of incoming values followed by a non-linear activation before passing information onward. [Sources: L4 p.28]
- The lecture's summary is that neural networks are extremely powerful and require less feature engineering, but are not off-the-shelf, have many hyper-parameters, train slowly, and overfit easily. [Sources: L4 p.29]

## Hyper-parameter tuning

- The lecture distinguishes model parameters from hyper-parameters and says that tuning must use development data rather than the training or test set. [Sources: L4 p.30]
- It also names cross-validation and grid search as standard tools for tuning. [Sources: L4 p.30]
- The lecture emphasises regularisation hyper-parameters because they control model complexity and help prevent overfitting. [Sources: L4 p.30]

## What matters beyond the algorithm

- The lecture's closing claim is that strong results on a new task often depend more on annotation quality, dataset size, and feature design than on the precise classifier chosen. [Sources: L4 p.31]
- This is one of the key practical messages of the topic: algorithm choice matters, but data and representation often matter more. [Sources: L4 p.13-15, p.31]
