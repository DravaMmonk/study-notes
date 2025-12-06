# 6 Support Vector Machine
---
## Baseline Model

### Linear Classifier

$$
y = \theta^\top X + b
$$

- $\theta$ defines the **orientation** of the decision boundary  
- $b$ is the **bias/offset**, shifting the boundary for flexibility

Decision boundary:

$$
\theta^\top X + b = 0
$$

> [!note] Difference Between Classification and Regression
> 
> - Regression approximates **values**
> - classification separates **classes** by a boundary.
> 
> **Logistic Regression**
> 
> - Predicts a **continuous value**  
> - Decides the label by **thresholding probability**
> - Trained by $maximising$ **log-likelihood** or $minimising$ **cross-entropy**
>
> **Linear Classification**
> 
> - Predicts a **discrete label** directly for decision-making
> - No probabilistic output
> - Trained based on margin (SVM) or updating by GD methods (Neural Networks)

---

## Margin

For a labelled example $(x_i, y_i)$ where $y_i \in \{-1, +1\}$:

**Functional margin:**
$$
\gamma_i^{(f)} = y_i(\theta^\top x_i + b)
$$

**Geometric margin (normalised):**
$$
\gamma_i = \frac{y_i(\theta^\top x_i + b)}{\|\theta\|}
$$

Interpretation:
- Large $\gamma_i$ → point is far from boundary → robust  
- Small $\gamma_i$ → point near boundary → sensitive / error-prone  

**Overall geometric margin:**
$$
\gamma = \min_i \gamma_i
$$

---
## Support Vector Machine

Goal: find $(\theta, b)$ such that:

- All points correctly classified  
- Margin is **maximised**

Start from:
$$
\max_{\theta} \frac{1}{\|\theta\|} \quad 
\text{s.t. } y_i \frac{\theta^\top x_i}{\|\theta\|} \ge \frac{1}{\|\theta\|}
$$

Fix margin scale by requiring:

$$
y_i(\theta^\top x_i) \ge 1
$$

**Optimisation**:

$$
\min_\theta \frac{1}{2}\|\theta\|^2
\quad \text{s.t. } y_i(\theta^\top x_i) \ge 1
$$

> [!note] Outcomes of SVM
> 
> The solution depends only on **support vectors**:
> 
> - A few points “support” the boundary
> 	- Some points build two lines with the smallest gap
> 	- The boundary is exact the *bisector* of the gap region
> - Any other points have **zero contribution**
> 	- → The solution is **sparse**
> 
> **Pros**:
> 
> - Efficient to compute  
> - Simple and interpretable geometric model  
> - Strong generalisation ability  
> 
> **Cons**:
> 
> - Requires sufficient data  
> - Sensitive to outliers  
> - Cannot model non-linear separations (e.g., XOR) without kernels 

---
## Variants of SVM
### Soft-Margin SVM

Allows margin violations using slack variables $\xi_i$:

**Optimisation**:
$$
\min_{\theta, \xi} \frac{1}{2}\|\theta\|^2 + C\sum_i \xi_i
$$

Subject to:
$$
y_i (\theta^\top x_i + b) \ge 1 - \xi_i, \quad \xi_i \ge 0
$$

Interpretation of $\xi_i$:

- $\xi_i = 0$: correctly classified & outside margin  
- $0 < \xi_i < 1$: correctly classified but inside margin  
- $\xi_i > 1$: misclassified  

Role of $C$:

- Large $C$ → penalise violations → risk overfitting  
- Small $C$ → allow more slack → risk underfitting  

---

### Multi-Class SVM

Learn $K$ classifiers:

$$
\theta_1, \ldots, \theta_K
$$

Prediction:

$$
\hat{y} = \arg\max_k \theta_k^\top x
$$

---

### SVM for Ordinal Regression

For rating prediction (ordered labels):

Let boundaries satisfy:
$$
b_1 < b_2 < \cdots < b_{K-1}
$$

Constraint:
$$
b_{y_i-1} < w^\top x_i < b_{y_i}
$$

**Goal**:

- Learn $w$ and ordered thresholds  
- Produce discrete ordered outputs  

---

### Ranking SVM

Rank candidates $y$ for users $x$ using:

$$
f(x, y; \theta) = \theta^\top \Phi(x, y)
$$

Where

- $\Phi(x, y)$ transforms the user–candidate pair  
- Output score determines ranking  

Used for recommendation and ranking tasks.

---

### Kernel SVM

Linear SVM cannot solve non-linear problems (e.g., XOR), while Kernel functions implicitly map data to a higher dimension:

$$
x' = \Phi(x)
$$

But we avoid computing $\Phi(x)$ explicitly by using the **kernel trick**:

$$
K(x, x') = \Phi(x)^\top \Phi(x')
$$

Examples:

- Polynomial kernel  
- RBF/Gaussian kernel  
- Sigmoid kernel  

Benefits:

- Solve complex non-linear classification  
- No explicit high-dimensional transformation required  

---

