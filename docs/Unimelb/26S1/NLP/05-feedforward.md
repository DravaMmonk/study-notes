---

---
# 05 Feedforward Networks

aka multi-layer perceptrons

## Matrix Vector Notation

$$
h_i = \tanh \left(\sum_j w_{ij} x_j + b_i \right)
$$
where,  
- $w$ is a matrix comprising the weight vectors;
- $b$ is a vector of all bias terms;

## Output Layer

1. Binary Classification Problem
	- Sigmoid / Logistic Activation Function $\frac{1}{1+e^{-z}}$
2. Multi-class Classification Problem
	- Softmax

## Regularisation

Prevent from overfitting

## Dropout

- A fixed possibility to turn the value of random neurones into **0**
- Mostly applied in Hidden Layer
- Useful in DL NLP
	- **Large models easily overfit**
		- Dropout helps add noise / smooth the loss surface to find better minima
	- **Text data is sparse and discrete**
	    - Models can easily memorise word patterns
		- Dropout helps avoid Co-Adaptation (dependency between linked neurons)
	- **Language depends on context**
		- Dropout forces the model to use broader context
	    - Not just specific keywords



