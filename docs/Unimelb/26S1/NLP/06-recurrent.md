# 06 Recurrent Networks

## Source Pack
- Lecture: `L8 Recurrent Networks (v2)`, pp. 2-42.
- Workshop: `workshop_nlp_JL_2026s1_wk5.pdf`.
- Reading: course reading for this lecture (`JM3 Chapter 13.1-13.5`).

## Why Move Beyond Fixed-context Models
- The lecture revisits n-gram language models, including feedforward neural versions, and shows that they still generate text from a fixed context window. [Source: L8 pp. 3-9]
- Its explicit diagnosis is "limited context": a fixed-size window cannot naturally expand as the useful dependency span grows. [Source: L8 p.9]

## Core RNN Idea
- Recurrent neural networks are introduced as models that can represent arbitrarily sized inputs by processing a sequence one element at a time. [Source: L8 p.11]
- The lecture states the core recurrence as updating a state vector from the previous state and the current input. [Source: L8 pp. 11-13]
- In the simple RNN shown in class, the update is `s_i = tanh(W_s s_{i-1} + W_x x_i + b)`. [Source: L8 p.13]
- When unrolled across time, the same parameters are reused at every time step. [Source: L8 p.14]

## Training and Inference
- The lecture explains that an unrolled RNN is just a very deep network with shared parameters, trained by backpropagation through time. [Source: L8 p.15]
- In the language-model setup, the current token is mapped to an embedding, the hidden state stores information from earlier words, and the output distribution predicts the next word. [Source: L8 p.16]
- The training loss in the lecture is the sum of negative log-likelihood terms over the predicted next-word distributions. [Source: L8 p.17]

## Problems in RNN Generation
- The lecture lists three problems with straightforward autoregressive generation from an RNN: mismatch between training and decoding, error propagation through intermediate predictions, and a tendency toward bland or generic language. [Source: L8 p.19]

## Vanishing Gradients
- The lecture asks whether RNNs can really use their theoretically unbounded context and answers no: in practice, long-range dependencies are hard because of vanishing gradients. [Source: L8 p.21]
- The reason given in the lecture is that gradients from later steps diminish quickly during backpropagation, so early inputs receive very small updates. [Source: L8 p.21]
- The workshop repeats vanishing gradients as the main practical obstacle in standard RNNs. [Source: wk5 RNN discussion slides]

## LSTM as the Fix
- The lecture introduces LSTMs specifically to address vanishing gradients. [Source: L8 p.22]
- Its core mechanism is a memory cell that preserves information across time, together with gates that decide what to write, forget, and expose. [Source: L8 pp. 22-30]
- The lecture defines a gate as a sigmoid-produced vector with values between zero and one that is multiplied element-wise with another vector to control information flow. [Source: L8 p.23]
- The forget gate determines how much old cell content should be discarded; the lecture illustrates this with changing subject information in `The cats that the boy likes`. [Source: L8 p.26]
- The input gate determines how much new distilled information enters the memory cell. [Source: L8 p.27]
- The output gate controls how much of the memory cell contributes to the next hidden state. [Source: L8 p.29]
- The lecture closes the LSTM block with the standard gate equations for `f_t`, `i_t`, `o_t`, candidate cell state, updated cell state, and hidden state. [Source: L8 p.30]

## Applications Shown in the Lecture
- The lecture gives character-level generation examples including Shakespeare text, Wikipedia-like text, and code generation. [Source: L8 pp. 32-34]
- It also points to Deep-Speare as an example of generating Shakespearean sonnets. [Source: L8 p.35]
- For supervised NLP, the lecture shows RNNs applied to text classification, where the word order matters, and to sequence labelling such as POS tagging. [Source: L8 pp. 37-38]
- The lecture then stacks LSTMs vertically to form multi-layer LSTMs and combines forward and backward passes in bidirectional LSTMs. [Source: L8 pp. 39-40]

## Workshop Emphasis
- The workshop compares FFNN and RNN language models through parameter counts, highlighting that an RNN reuses the same recurrent weight matrix rather than concatenating a new parameter block for every extra context position. [Source: wk5 parameter slides]
- It explicitly states that RNN language models can capture arbitrarily long contexts and generalise better to unseen sequences than fixed-window n-gram models. [Source: wk5 RNN slides]

## Final Trade-offs
- The lecture summary credits RNNs with the ability to model long-range context and with the same broad task flexibility as feedforward networks. [Source: L8 p.41]
- The lecture's downsides are sequential computation, weak practical handling of very long dependencies, poor stacking behaviour for deep LSTMs, and lower present-day popularity after the rise of Transformers. [Source: L8 p.41]
