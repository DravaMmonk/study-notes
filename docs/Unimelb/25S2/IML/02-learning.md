
# 2 Machine Learning
---
## Probability Theory → Data Distribution

In Machine Learning, we treat data as samples drawn from an **unknown underlying probability distribution**.

$$
x_1, x_2, \ldots, x_n \sim P(X)
$$

where

- Data points are samples of a random variable $X$.
- Its behaviour is described by the distribution $P(X)$.
- The distribution $P(X)$ is **unknown**.
- - Our dataset is a **finite snapshot** of the true underlying distribution.

The **goal** of Machine Learning is to recover information about such distribution, which is also called **generalisation**.

- **Generalisation**: learning patterns from the underlying data distribution.

---
## Learning

*generalisation* can be categorised into different paradigms depending on the available sources and the goal of the problem.

| Learning Paradigm              | Input                                   | Mathematical Objective                                                     | Practical Objective                                 |
| ------------------------------ | --------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **Unsupervised Learning**      | Only data samples ($X$) without labels  | Directly learn the distribution ($P(X)$)                                   | Discover the structures                             |
| **Supervised Learning**        | Labeled pairs ($(X, Y)$)                | Learn the conditional distribution ($P(Y \mid X)$)                         | Solve the *classification* and *regression* problem |
| **Weakly-Supervised Learning** | Incomplete/noisy labels                 | Learn an approximate $P(Y \mid X)$ using imperfect or indirect supervision | Reduce labeling cost; learn from noisy/cheap labels |
| **Generative Models**          | Labelled or Unlabelled                  | Same output as the generative model                                        | *Generate* new samples                              |
| **Ensemble Learning**          | Diverse models trained on the same data | Same output as the meta model.                                             | Increase accuracy, stability, robustness            |

---
## Models

**Supervised Learning**

- K-Nearest Neighbours
- Linear Regression
- Logistic Regression
- Naive Bayes
- Decision Tree
- Support Vector Machine
- Perceptron
- Multilayer Perceptron (Neural Networks)

**Unsupervised Learning**

- Clustering
- K-Mean Clustering
- Hierarchical Clustering
- Agglomerative Clustering
- Divisive Clustering

**Weak-supervised Learning**

- Self-training
	- Self-supervised Learning
	- Data argumentation
- Active Learning


**Ensemble Learning**

- Stacking
- Bagging (RF)
- Boosting (AdaBoost)