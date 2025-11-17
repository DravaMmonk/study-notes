# 1 Foundations & Basic Statistics
---
## **Data**

- Discrete vs. Continuous
- Big vs. Small
- Labeled vs. Unlabelled
- Public vs. Sensitive

---
## **Models**

- Basic Assumption: Samples are independent
- Function mapping from inputs to outputs

- Parameters of function are unknown ← what the model need to learn
- Hyper-parameters are pre-defined and fixed

- Probabilistic vs. Geometric
- Discriminative vs. Generative
- Linear vs. Non-linear
- Parametric vs. Non-parametric

---
## **Learning**

- Find the best model parameters
- Supervised vs. Unsupervised vs. Weak Supervised

---
## Probability Basics Formula

### Change of Logarithm Base

$$
\log_a b = \frac{\log_c b}{\log_c a}
$$

Commonly used for converting between $\log_2$, $\log_{10}$, and $\ln$.

---

### Conditional Probability

$$
P(A \mid B) = \frac{P(A \cap B)}{P(B)}
$$

---

### Joint Probability

$$
P(A \cap B)
= P(A \mid B)\, P(B)
= P(B \mid A)\, P(A)
$$

---

### Law of Total Probability

$$
P(A) = \sum_i P(A \mid B_i)\, P(B_i)
$$

---

### Bayes' Theorem (Naïve Bayes)

$$
P(A \mid B) = \frac{P(B \mid A)\, P(A)}{P(B)}
$$

In Naïve Bayes, assuming feature independence:

$$
P(y \mid x_1, x_2, \ldots, x_n)
\propto P(y)\, \prod_i P(x_i \mid y)
$$

---
## Entropy

### Information (Self-Information)

The information content of an outcome $x$:

$$
I(x) = -\log_2 P(x)
$$

- Maps probability range $[0, 1]$ to information range $[0, +\infty)$  
- Rare events $\to$ larger information gain

---

### Entropy (Expected Information)

Entropy is the expected information obtained from a random variable $X$:

$$
H(X) = \mathbb{E}[I(X)] = -\sum_x P(x)\, \log_2 P(x)
$$

Interpretation:

- $X$ is a random variable with possible values $x$
- $P(x)$ is the probability (weight) of outcome $x$
- $-\log_2 P(x)$ is the information carried by outcome $x$

High entropy = the random variable is highly uncertain / disordered.

---

### Joint Entropy

$$
H(X, Y)
= -\sum_{x,y} P(x, y)\, \log_2 P(x, y)
$$

---

### Conditional Entropy

Definition:

$$
H(X \mid Y) = H(X, Y) - H(Y)
$$

Derivation via chain rule:

Given  
$$
P(x, y) = P(y)\, P(x \mid y),
$$

Substitute into joint entropy:

$$
H(X, Y)
= -\sum_{x,y} P(x, y)\, \log_2 \big[ P(y)\, P(x \mid y) \big]
$$

Split the log:

$$
H(X, Y)
= -\sum_{x,y} P(x, y)\, \log_2 P(y)
  - \sum_{x,y} P(x, y)\, \log_2 P(x \mid y)
$$

Since $\sum_x P(x,y) = P(y)$:

$$
H(X, Y)
= -\sum_y P(y)\, \log_2 P(y)
  - \sum_{y} P(y) \sum_x P(x \mid y)\, \log_2 P(x \mid y)
$$

Thus:

$$
H(X, Y) = H(Y) + H(X \mid Y)
$$

Interpretation:

- For each $y$, compute uncertainty of $P(x \mid y)$  
- Weight it by $P(y)$  
- Sum over all $y$

---

## Information Gain (Mutual Information)

Mutual Information measures how much knowing $Y$ reduces uncertainty about $X$:

$$
IG(X; Y) = H(X) - H(X \mid Y)
         = H(Y) - H(Y \mid X)
$$

Mutual information can be expressed using joint probabilities:

$$
IG(X; Y)
= \sum_{x,y} P(x,y)\,
\log_2 \frac{P(x,y)}{P(x)\, P(y)}
$$

Interpretation:

- Enumerate all $(x, y)$ pairs
- Compute marginal probabilities $P(x)$ and $P(y)$
- Compute joint probabilities $P(x,y)$  
- Compare joint probability with the “independent joint” $P(x)P(y)$

Meaning of the log ratio:

- $\log_2 \frac{P(x,y)}{P(x)P(y)} = 0$ → occurs as expected under independence  
- $> 0$ → co-occur more than expected → positive association  
- $< 0$ → co-occur less than expected → negative association

---