# 05 Feedforward Networks

## Scope

- Lecture: `L7 Feedforward Networks`.
- Workshop: `Week 5` feedforward language model exercises.
- Reading: `JM3 Chapter 6`.

## What the lecture means by feedforward networks

- The lecture introduces feedforward neural networks as multilayer perceptrons in which information moves forward through weighted connections and selected layers apply non-linear activations. [Sources: L7 p.3-4]
- JM3 positions them as the neural successor to traditional linear models, but still as non-recurrent networks with fixed-size inputs. [Sources: JM3 Ch.6, feedforward discussion]

## Core notation

- In the lecture, a hidden layer with multiple units is written as `h = tanh(Wx + b)`, where `W` collects the weight vectors and `b` collects the biases. [Sources: L7 p.6]
- The activation function is applied element-wise, which is what turns a linear projection into a non-linear representation. [Sources: L7 p.6]

## Output layer choices

- For binary classification, the lecture uses the sigmoid or logistic function to map a score into a probability in `[0, 1]`. [Sources: L7 p.7]
- For multiclass classification, the lecture uses softmax so that all class probabilities are positive and sum to 1. [Sources: L7 p.7]

## Learning objective

- The lecture defines the training objective as maximising the probability assigned to the correct outputs on the training set, or equivalently minimising the negative log-likelihood. [Sources: L7 p.8]
- Gradient descent is used for training, and the lecture notes that deep learning toolkits compute gradients automatically. [Sources: L7 p.8]

## Regularisation and dropout

- The lecture warns that neural networks have many parameters and therefore overfit easily; it explicitly characterises them as low-bias, high-variance models. [Sources: L7 p.9]
- The lecture lists `L1`, `L2`, and dropout as important forms of regularisation. [Sources: L7 p.9]
- Dropout is described as randomly zeroing some neurons in a layer, usually in hidden layers. [Sources: L7 p.10]
- The lecture explains dropout with four effects: discouraging reliance on specific neurons, penalising large weights, normalising neuron values, and introducing noise. [Sources: L7 p.11]

## Feedforward networks for topic classification

- The lecture first applies a feedforward network to topic classification, using a bag-of-words vector as input. [Sources: L7 p.13]
- The training example computes hidden states, applies softmax to get a class distribution, and then uses the negative log probability of the gold class as the loss. [Sources: L7 p.14]
- Prediction is simply the class with the highest output probability on a test document. [Sources: L7 p.15]
- The lecture then suggests improvements such as adding bigrams, preprocessing with lemmatisation and stopword removal, and replacing raw counts with TF-IDF or indicator features. [Sources: L7 p.16]

## Recasting language modelling as classification

- The lecture revisits language modelling as a classification problem over the next word given a finite context window. [Sources: L7 p.17-18]
- The feedforward neural language model predicts `P(w_i | context)` using a neural classifier rather than corpus counts. [Sources: L7 p.19]
- The main representational change is that words are no longer handled as isolated symbols; they are mapped to embeddings. [Sources: L7 p.19-20]

## Why embeddings help

- The lecture defines word embeddings as continuous vectors in a low-dimensional space. [Sources: L7 p.20]
- The lecture's claim is that embeddings let the model capture similarities such as `dog` versus `cat` or `walking` versus `running`, which improves generalisation. [Sources: L7 p.20]
- The workshop makes this contrast explicit: a neural language model can transfer knowledge across similar words, whereas a count-based n-gram model treats them as unrelated types. [Sources: Wk5 p.8]

## Feedforward neural language model architecture

- The lecture's training example for `P(grass | a, cow, eats)` first looks up embeddings for the context words, concatenates them, applies a hidden layer, and predicts a probability distribution over the vocabulary with softmax. [Sources: L7 p.22-23]
- The lecture emphasises that most parameters live in the input embedding matrix and the output embedding matrix. [Sources: L7 p.23-24]
- The language-model architecture slide attributes this style of model to Bengio et al. (2003). [Sources: L7 p.25]
- The workshop expands this with concrete parameter counting for a `300`-dimensional embedding layer, `300`-dimensional hidden layer, a `10K` vocabulary, and a 3-word context. [Sources: Wk5 p.12]

## Advantages over count-based n-grams

- The lecture compares feedforward neural language models with count-based n-grams by saying that count-based models are cheap to train but sparse, limited in context, and unable to represent semantic similarity. [Sources: L7 p.26]
- The lecture then argues that feedforward neural language models give more robust estimates because they capture properties shared across related words. [Sources: L7 p.26]
- The workshop also describes neural language models as strongly outperforming n-gram language models in practice. [Sources: Wk5 p.6]

## Feedforward tagging model

- The lecture reframes POS tagging as a classification task where the current tag is predicted from nearby words and recent tags. [Sources: L7 p.27-28]
- The feedforward tagging architecture in the lecture uses three word embeddings and two tag embeddings as input and predicts the current tag with a softmax over the tagset. [Sources: L7 p.28]

## Main strengths and weaknesses

- The lecture summarises the main strengths of feedforward NLP models as strong performance, reduced feature engineering, and flexible task-specific architecture design. [Sources: L7 p.29]
- The main weaknesses are computational cost, very large parameter counts due to the vocabulary, and poor behaviour on very small datasets without pretraining. [Sources: L7 p.29]
