# 06 Recurrent Networks

## Scope

- Lecture: `L8 Recurrent Networks`.
- Workshop: `Week 5` recurrent language model recap.
- Reading: `JM3 Chapter 13`.

## Why move beyond feedforward language models

- The lecture uses a generated trigram-style sentence such as `I saw a table is round and about` to illustrate that finite-context models can miss global coherence. [Sources: L8 p.3-9]
- The lecture identifies the fixed context window as the core limitation of n-gram and feedforward language models. [Sources: L8 p.9]
- JM3 makes the same comparison explicitly: n-gram models have a limited context, feedforward neural language models have a fixed context, and RNNs instead process the sequence incrementally. [Sources: JM3 Ch.13, RNN language-model discussion]

## Basic RNN idea

- The lecture defines an RNN as processing the sequence one input at a time with a recurrent state vector that stores previously processed context. [Sources: L8 p.11-13]
- The recurrence in the lecture is `s_i = tanh(W_s s_{i-1} + W_x x_i + b)`. [Sources: L8 p.13]
- Unrolling the network over time makes the recurrence explicit and also shows that the same parameters are reused at every time step. [Sources: L8 p.14]
- JM3 calls this simple architecture an Elman network or simple recurrent network and notes that it is the foundation for later recurrent variants. [Sources: JM3 Ch.13, section 13.1]

## Training with backpropagation through time

- The lecture says that an unrolled RNN is just a very deep network with shared parameters, so it can be trained with backpropagation on the unrolled computation graph. [Sources: L8 p.15]
- This training method is named backpropagation through time. [Sources: L8 p.15]
- JM3 describes the same idea: first perform forward computation on the unrolled graph, then backpropagate gradients through that graph while tying repeated parameters together. [Sources: JM3 Ch.13, BPTT discussion]

## RNNs as language models

- In the lecture's RNN language model, the current token is the input, the recurrent state encodes prior context, and the output distribution predicts the next token. [Sources: L8 p.16]
- The training example `a cow eats grass` uses a per-step cross-entropy loss and sums the losses across time. [Sources: L8 p.17]
- The generation slide shows the model running autoregressively: previously generated tokens become the next inputs. [Sources: L8 p.18]
- The lecture then lists three generation problems: train-test mismatch, error propagation, and a tendency toward bland or generic language. [Sources: L8 p.19]

## Why RNNs should be better than n-grams

- The lecture claims that RNNs can in principle model infinite context because the state can summarize arbitrarily long prefixes. [Sources: L8 p.21]
- The workshop translates this into a comparison statement: RNN language models can capture arbitrarily long contexts, while n-gram models use fixed-width histories. [Sources: Wk5 p.16]
- The workshop also says that RNNs generalise better to unseen sequences than count-based n-gram models. [Sources: Wk5 p.16]

## The vanishing gradient problem

- The lecture answers its own `Language Model... Solved?` question by saying no: simple RNNs still fail to capture long-range dependencies well in practice because of vanishing gradients. [Sources: L8 p.21]
- The explanation given is that gradients shrink quickly during backpropagation, so early inputs receive very weak updates. [Sources: L8 p.21]
- The workshop reinforces the same point by saying that earlier layers in a deep unrolled RNN learn very slowly when gradients become tiny. [Sources: Wk5 p.17-18]
- JM3 identifies vanishing gradients as one major reason simple RNNs struggle on long inputs. [Sources: JM3 Ch.13, LSTM motivation]

## LSTM motivation and components

- The lecture introduces LSTMs as the standard remedy for vanishing gradients. [Sources: L8 p.22]
- The core idea is a memory cell whose contents are managed by gates that decide what to forget, what to write, and what to expose. [Sources: L8 p.22-30]
- The lecture defines a gate as a vector with values between `0` and `1`, produced by a sigmoid and applied element-wise to control information flow. [Sources: L8 p.23]
- The forget gate decides how much of the previous cell state to discard; the input gate decides how much new information to write; the output gate decides how much of the cell state becomes the next hidden state. [Sources: L8 p.26-29]
- The summary slide provides the standard equations for `f_t`, `i_t`, `o_t`, `C_t`, and `h_t`. [Sources: L8 p.30]
- The workshop states the same high-level point: LSTM and GRU variants address vanishing gradients through memory cells that preserve gradients across time. [Sources: Wk5 p.18]

## Typical NLP uses

- The lecture presents text classification as a sequence-classification application where the recurrent state over a sentence feeds a polarity decision. [Sources: L8 p.37]
- It also presents sequence labelling, such as POS tagging, where an output label is produced at each time step. [Sources: L8 p.38]
- Multi-layer LSTMs stack recurrent layers so that the output sequence of one layer becomes the input sequence of the next. [Sources: L8 p.39]
- Bidirectional LSTMs use both left-to-right and right-to-left recurrent passes so that each output can depend on both past and future context. [Sources: L8 p.40]
- JM3 makes the same architectural distinction and notes that bidirectional RNNs are especially useful when outputs at time `t` need information from both directions. [Sources: JM3 Ch.13, stacked and bidirectional RNN discussion]

## Strengths and limitations

- The lecture's final comparison is that recurrent models are flexible and can in principle capture long contexts. [Sources: L8 p.41]
- Their main drawbacks are sequential computation, weak long-range behaviour in practice, poor stacking compared with later architectures, and reduced popularity after transformers. [Sources: L8 p.41]
