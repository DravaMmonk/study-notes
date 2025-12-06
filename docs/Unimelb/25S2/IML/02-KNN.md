# 2 K-Nearest Neighbours
---
## Lazy Learning

KNN is a **lazy learner**:

- Training = Storing data
	- **No** explicit (rule-based) training phase
- Predicting = Vote/Avg of labels of nearest points
	- Computation happens **only at prediction time**

> [!note] Outcomes of Lazy Learning  
> **Pros**
> - No training cost  
> - Simple and intuitive  
> - Non-parametric (no assumptions about underlying data distribution)  
> - Works for both classification and regression  
>
> **Cons**
> - Prediction is expensive on large datasets (must compute many distances)  
> - Sensitive to irrelevant or unscaled features  
> - Requires careful choice of distance metric, K, weighting  
> - Performance degrades in high dimensions (curse of dimensionality)

> [!NOTE] Lazy Learning vs. Eager Learning
> 
> **Lazy Learning**
> 
> - No model is built  
> - Must use all training samples at prediction time  
> - Slow prediction, fast “training”
> 
> **Eager Learning**
> 
> - Train a model that generalises the data  
> - Fast inference once trained  
> - Higher training cost, but much faster prediction  

> [!note] Outcomes of KNN  
> **Pros**
> - Intuitive, simple to implement  
> - No training time (lazy)  
> - Handles classification & regression  
> - Non-parametric and flexible  
>
> **Cons**
> - Slow prediction; requires large memory  
> - Sensitive to feature scaling  
> - Struggles in high dimensional spaces  
> - Many design choices (distance, K, weighting, feature scaling)

---

## Measuring Distances

### Nominal (Categorical, Unordered) Features

- **Hamming Distance**  
  $d = N(\text{mismatching features})$

- **Simple Matching Distance**  
  $d = 1 - \frac{N(\text{matching})}{N(\text{all features})}$

- **Jaccard Distance** (ignores mutual absence)  
  $d = 1 - \frac{|A \cap B|}{|A \cup B|}$

### Numerical Feature Vectors

- **Manhattan Distance**  
  $d = \sum_i |A_i - B_i|$

- **Euclidean Distance**  
  $d = \sqrt{\sum_i (A_i - B_i)^2}$

- **Cosine Distance**  
  $d = 1 - \cos(A,B) = 1 - \frac{A \cdot B}{\|A\| \|B\|}$

> [!question]- When is Cosine Distance commonly used?
> 
> - When **magnitude should not affect similarity**, only **direction**  
> - High-dimensional spaces (text embeddings, TF-IDF vectors, image feature vectors)  
> - Useful for comparing long vs short documents or high vs low resolution images

### Ordinal Features

- Map ranks to evenly spaced values in $[0,1]$  
  e.g., `Low → 0`, `Medium → 0.5`, `High → 1`  
- Then apply a numerical distance metric (Euclidean, Manhattan)

---

## Weighting Neighbours

- **Majority Voting**  
  Each neighbour has equal weight $=1$

- **Inverse Distance Weighting**  
  $\text{weight} = \frac{1}{d + \epsilon}$  
  (Closer neighbours have much larger influence)

- **Inverse Linear Distance**  
  $\text{weight} = \frac{d_{\max} - d_i}{d_{\max} - d_{\min}}$  
  Distances are first normalised into $[0,1]$

---

## Choosing K (The number of neighbours)

### Small K
- Highly sensitive to noise  
- Leads to a very jagged decision boundary  
- Risk of overfitting

### Large K
- Smoother decision boundary  
- May mix unrelated classes  
- Too large (e.g., $K=N$) → underfitting

> [!tip] Choose K by **cross-validation**
> 
> Odd K is often preferred for **binary classification** to avoid ties.

---