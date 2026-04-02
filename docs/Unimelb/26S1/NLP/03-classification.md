---

---
# 3 Text Classification Algorithms
---

Motivation of Classification: Topic; Sentiment; Native-Language Id; Entailment

## Naive Bayes

$$
P(C \mid F) \propto P(F \mid C)P(C)
$$

- Fast to train and classify✅
- Robust, low-variance✅ 
- Optimal Classifier if independence assumption is correct✅
- Extremely simple to implement✅
- Independence assumption rarely holds⚠️
- lower accuracy⚠️
- smoothing required⚠️

## Logistic Regression

$$
P(c_n \mid f_1 \cdots f_m) = \frac{1}{Z} \cdot exp(\sum^m_{i=0}w_i f_i)
$$

- Not confounded by diverse, correlated features✅
- Slower training⚠️
- Feature scaling needed⚠️

## Support Vector Machine

- Fast and accurate LR✅
- Non-linearity supported✅
- Works well with huge feature sets✅
- Multi-class = Multiple SVM⚠️
- Feature scaling needed⚠️
- Poorly deal with class imbalances⚠️

## KNN

- Simple but surprisingly effective✅
- No training required✅
- Inherently multi-class✅
- Optimal with infinite data✅
- Have to select *k*⚠️
- Issues with imbalanced classes❌
- Often slow⚠️
- Features must be selected carefully⚠️

## Decision Tree

- Fast to build & test✅
- Feature scaling irrelevant✅
- Good for small feature sets⭐️
- Handles non-linearly-separable problems✅
- In practice, not interpretable❌
- Highly redundant sub-trees⚠️
- Not competitive for large feature sets⚠️

## Random Forests

- Usually more accurate & robust✅
- Great for medium feature sets⭐️
- Training easily parallelised✅
- No interpretability❌
- Slow when feature sets scale up⚠️

## Neural Networks

- Extremely powerful✅
- Little feature engineering✅
- Not an off-the-shelf classifier❌
- Many hyper-parameters, difficult to optimise⚠️
- Slow to train⚠️
- Prone to overfitting⚠️

## Hyper-parameter Tuning

- Separate Dataset for tuning
- Some parameters are classifier specific (e.g. tree depth in DT) but relate to regularisation
	- Regularisation hyper-parameters penalise model complexity so be used to prevent overfitting
- For multiple parameters, use Grid Search