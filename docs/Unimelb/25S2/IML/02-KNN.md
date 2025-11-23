# 2 K-Nearest Neighbours
---
## Lazy Learning

- **Lazy**: No training; Compute at **query** time

1. Store the training data; No Modelling & Training
2. Computing when only predicting

Pros & Cons

- Effective
- Long predicting time (need to traverse the data)

## Measuring

### Nominal Features

- **Hamming Distance** $N(\text{mismatching features})$
- **Simple Matching Distance** $1 - \frac{N(\text{matching features})}{N(\text{all features})}$
- **Jaccard Distance** $1-\frac{|A \cap B|}{|A \cup B|}$
### Numerical Feature Vectors

- **Manhattan Distance** $\sum(A_i - B_i)$
- **Euclidean Distance** $\sqrt{\sum(A_i - B_i)^2}$
- **Cosine Distance** $1 - \cos(a,b) = 1 - \frac{a \cdot b}{|a||b|}$

> [!tip]- When is ***Cosine Distance*** commonly used?
> 
> - _Normalised a·b = comparison only directions, no lengths_
> - _Useful when compare long vs short documents / high vs low resolution images_

### Ordinal Feature Vectors

- **Normalised Ranks** map ranks evenly spaced in [0,1] then use numerical comparisons

  

  

**Measure Weight** 

- **Majority Voting** choose the most common label (all’s weight = 1)
- **Inverse Distance Weighting** weight = 1/(distance + ϵ)
- **Inverse Linear Distance** weight = ( max - each distance) / ( max - min distance) among neighbours 

- _Normalised d(each) between [0, 1]_

  

**Select K (The number of neighbours)**

**Small K**

- Jagged decision boundary
- Capturing noise more easily
- Lower classifier performance

**Large K**

- Smooth decision boundary
- Risk of grouping together unrelated classes
- Lower classifier performance as well if K is too big like even K = N)

  

  

**KNN Algorithm Pros and Cons**

**Pros**

- Intuitive and simple
- No need assumptions
- Supports both classification and regression
- No pre-training needed **_lazy_**

**Cons**

- Expensive large data sets
- How to decide sub-methods is still a problem

  

**Vs. Eager Learning**

- **Train** a model using labelled training instances
- The model will **generalise** from seen data to unseen data
- Using the model to **predict** labels for test instances

