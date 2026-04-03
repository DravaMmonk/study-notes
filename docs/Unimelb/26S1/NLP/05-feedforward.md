# 05 Feedforward Networks

## Source Pack
- Lecture: `L7 Feedforward Networks (v2)`, pp. 2-30.
- Workshop: `workshop_nlp_JL_2026s1_wk5.pdf`.
- Reading: course reading for this lecture (`JM3 Chapter 6.3-6.4`).

## Basic Neural-network Framing
- The lecture places feedforward networks inside deep learning, which it describes as neural networks with many layers chained together. [Source: L7 p.3]
- Feedforward neural networks are introduced as multilayer perceptrons. [Source: L7 p.4]
- The lecture defines a neuron as a function that linearly combines weighted inputs plus a bias and then applies a non-linear activation such as sigmoid, tanh, or ReLU. [Source: L7 p.5]
- With multiple hidden units, the lecture rewrites the layer computation in matrix-vector form as `h = tanh(Wx + b)`, with the non-linearity applied element-wise. [Source: L7 p.6]

## Output Layers and Learning Objective
- For binary classification, the lecture uses the sigmoid/logistic activation. [Source: L7 p.7]
- For multiclass classification, the lecture uses softmax so that output probabilities are positive and sum to one. [Source: L7 p.7]
- The lecture defines learning as maximising the probability assigned to correct outputs, or equivalently minimising negative log-likelihood, and says training is done with gradient descent. [Source: L7 p.8]

## Regularisation and Dropout
- The lecture states that neural networks have many parameters, are low-bias/high-variance models, and therefore overfit easily. [Source: L7 p.9]
- The three regularisation approaches named in the lecture are L1 penalties, L2 penalties, and dropout. [Source: L7 p.9]
- Dropout is defined as randomly zeroing some neurons in a layer; the lecture says it can be applied to any layer but is mostly used in hidden layers. [Source: L7 p.10]
- When explaining why dropout works, the lecture lists four effects: it reduces over-reliance on particular neurons, penalises large weights, normalises layer values toward zero mean, and introduces noise. [Source: L7 p.11]

## Feedforward Networks for Topic Classification
- The lecture uses topic classification as its first NLP application: the input is a bag-of-words document representation, and the output is a topic label. [Source: L7 pp. 13-15]
- The training example uses a two-hidden-layer network followed by softmax, with the loss defined as the negative log probability of the true class. [Source: L7 p.14]
- The lecture recommends three practical improvements to this baseline: use bag-of-bigrams as additional input, preprocess by lemmatising and removing stop words, and replace raw counts with TF-IDF or indicator features. [Source: L7 p.16]

## Feedforward Neural Language Models
- The lecture then reframes language modelling as classification: predict the next word from a fixed-size context window. [Source: L7 pp. 17-19]
- In the lecture's example, the input features are the previous words and the output class is the next word. [Source: L7 p.19]
- Word embeddings are introduced here as low-dimensional continuous vectors that let the model capture similarities such as `dog` vs `cat` or `walking` vs `running`. [Source: L7 p.20]
- The lecture's feedforward neural language model looks up embeddings for context words, concatenates them, passes them through hidden layers, and outputs a softmax distribution over the vocabulary. [Source: L7 pp. 22-25]
- The lecture highlights that a large share of the parameters sits in the embedding matrices because their size scales with vocabulary size. [Source: L7 pp. 23-24]

## Why FFNN LMs Improved on Count N-grams
- The lecture contrasts count-based n-gram models with FFNN n-gram models and says the neural version can automatically capture word properties such as grammatical and semantic similarity. [Source: L7 p.26]
- This gives more robust estimates than pure count-based models, which struggle with sparsity and larger contexts. [Source: L7 p.26]

## FFNNs for POS Tagging
- The lecture notes that POS tagging can also be cast as classification and adapts the feedforward language-model architecture to that task. [Source: L7 pp. 27-28]
- In the lecture's tagging setup, the inputs include recent word embeddings and recent tag embeddings, and the output is a softmax over the current tag. [Source: L7 p.28]

## Workshop Emphasis
- The workshop defines a neural network language model broadly as a language model implemented with a neural network, including FFNNs, RNNs, CNNs, and Transformers. [Source: wk5 opening slides]
- It uses a concrete FFNN parameter-count example to show where model size comes from: an embedding layer scales with `d x |V|`, while concatenating multiple previous words expands the hidden-layer input dimensionality. [Source: wk5 parameter slides]

## Final Trade-offs
- The lecture's summary gives three main strengths of feedforward networks: strong performance, less hand-engineered features, and architectural flexibility. [Source: L7 p.29]
- Its main weaknesses are slower training than classical ML models, large parameter counts due to vocabulary size, and poorer behaviour on tiny datasets unless pretraining is used. [Source: L7 p.29]


