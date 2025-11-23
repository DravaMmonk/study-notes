# 1 Probability
---
## Probability Theory

**Probability Theory** is the *theoretical and mathematical foundation* of Machine Learning.

> [!faq] What is Probability?
> 
> - A *language* used for describing and quantifying **Uncertainty**
> - A *framework* of designing Machine Learning **Models**
> 	- Distribution
> 	- Prediction
> 	- Optimisation
> 	- Generalisation
> 	- Evaluation

### Sample Space

Defines a set of events with mutually **exclusive** and **exhaustive** possibilities.

$$
\Omega = \{ \omega_1, \omega_2, \ldots \}
$$

**Exclusive**: Different events won't happen at the same time.

$$
P(\omega_i \cap \omega_j) = 0, \forall (\omega_i, \omega_j )\in A
$$

**Exhaustive**: The events listed is exactly all of possible events.

$$
P(\Omega)=1
$$

> [!example]- Sample spaces of Coin & Dice
> 
> $$
> \Omega_\text{Coin} = \{\text{heads}, \text{tails}\}
> $$
> 
> $$
> \Omega_\text{D6} = \{1,2,3,4,5,6\}
> $$

---
### Random Variable

A function maps the outcome of a sample space to a value.

$$
X: \Omega \to E
$$

> [!example]- the Random Variable of Coin
> 
> Use $Y$ to model a coin payoff for a successful bet on heads:
> 
> $$
> Y(\omega) = 
> \begin{cases}
> 1, &\text{if}\; \omega = \text{heads} \\
> 0, &\text{if}\; \omega = \text{tails}
> \end{cases}
> $$
> 

---
## Bayes Rule

$$
P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}
$$

where

- $P(A \mid B)$ - The *belief* of $A$ while given knowledge of $B$
- $P(A)$ - The *belief* of $A$ without any knowledge
- $P(B \mid A)$ - The support $B$ provides for $A$
- $P(B)$ - Constant for normalising

---

## Entropy

### Information (IG)

The information content of an outcome $x$:

$$
I(x) = -\log_2 P(x)
$$

- Certain Events → Zero Information carried
- Common Events → Poor Information carried
- Rare Events → High Information carried
- Impossible Events → Infinity Information carried

> [!faq] Why is *Information* so denoted?
> 
> Map a *probability* (range $[0, 1]$) to a quantified score of *Information* (range $[0, +\infty)$ ).
> 

---

### Entropy

The expected *Information* obtained from a random variable.

$$
H(X) = \mathbb{E}[I(X)] = -\sum_x P(x)\, \log_2 P(x)
$$

where

- $X$ - a random variable with possible values $x$
- $P(x)$ - the probability (weight) of outcome $x$
- $-\log_2 P(x)$ - the information carried by outcome $x$

- The value of $X$ is 100% $a$ → $H(X) = 0$
- The value of $X$ is almost certain → Low Entropy
- The value of $X$ is highly uncertain → High Entropy
- The value of $X$ is 50% $a$ and 50% $b$ → $H(X) = 1 \text{bit}$

> [!example]- Low Entropy vs. High Entropy
> 
> $X = \{a, b\}$
> 
> - **Low Entropy** ($P(X = a) = 0.99; P(X = b) = 0.01$):
> 
> $$
> H(X) = - ((0.99 * \log_2 0.99) + (0.01 * \log_2 0.01) \approx 0.0807 \text{bits}
> $$
> 
> - **High Entropy** ($P(X = a) = 0.51; P(X = b) = 0.49$):
> 
> $$
> H(X) = - ((0.51 * \log_2 0.51) + (0.49 * \log_2 0.49) \approx 0.9989 \text{bits}
> $$

---

### Joint Entropy

The expected *Information* obtained from joint variables.

$$
H(X, Y)
= -\sum_{x,y} P(x, y)\, \log_2 P(x, y)
$$

---

### Conditional Entropy

The expected *Information* obtained from one variable given knowledge of the other.

$$
H(X \mid Y) = H(X, Y) - H(Y)
$$

> [!NOTE]- Derivation via chain rule
> 
> Given  
> 
> $$
> P(x, y) = P(y)\, P(x \mid y),
> $$
> 
> Substitute into joint entropy:
> 
> $$
> H(X, Y)
> = -\sum_{x,y} P(x, y)\, \log_2 \big[ P(y)\, P(x \mid y) \big]
> $$
> 
> Split the log:
> 
> $$
> H(X, Y)
> = -\sum_{x,y} P(x, y)\, \log_2 P(y)
>   - \sum_{x,y} P(x, y)\, \log_2 P(x \mid y)
> $$
> 
> Since $\sum_x P(x,y) = P(y)$:
> 
> $$
> H(X, Y)
> = -\sum_y P(y)\, \log_2 P(y)
>   - \sum_{y} P(y) \sum_x P(x \mid y)\, \log_2 P(x \mid y)
> $$
> 
> Thus:
> 
> $$
> H(X, Y) = H(Y) + H(X \mid Y)
> $$

---
## Mutual Information

If we get the knowledge of $Y$ , how much we can reduces the *Uncertainty* about $X$:

$$
\begin{align}
IG(X; Y) &= H(X) - H(X \mid Y) \\[4pt]
         &= H(Y) - H(Y \mid X)
\end{align}
$$

Mutual information can be expressed using joint probabilities:

$$
IG(X; Y)
= \sum_{x,y} P(x,y)\,
\log_2 \frac{P(x,y)}{P(x)\, P(y)}
$$

> [!tip]- Log Ratio
> 
> $$
> r = \log_2 \frac{P(x,y)}{P(x)P(y)}
> $$ 
> 
> -  $r = 0$ → occurs as expected under independence 
> - $r > 0$ → co-occur more than expected → positive association 
> - $r < 0$ → co-occur less than expected → negative association
> 

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
## Machine Learning

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

---