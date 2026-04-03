# 08 Word Embeddings

## Scope

- Lecture: `L10 Word Embeddings`.
- Reading: `JM3 Chapter 5`.
- Workshop support: `Week 5` word representation recap.

## Distributional hypothesis

- The lecture opens with Firth's statement, "You shall know a word by the company it keeps". [Sources: L10 p.2]
- It uses two related intuitions:
  - documents as context capture topic-level association;
  - nearby words as context capture finer-grained meaning. [Sources: L10 p.2]
- JM3 defines vector semantics in exactly this distributional spirit: words are points in a semantic space derived from their contextual distributions. [Sources: JM3 Ch.5, opening sections]

## Count-based word vectors

- The lecture first builds a term-document matrix and treats either documents or words as vectors in that matrix. [Sources: L10 p.8-9]
- TF-IDF is introduced as a weighting scheme that discounts words appearing in many documents. [Sources: L10 p.11]
- The lecture then motivates dimensionality reduction because term-document matrices are sparse and noisy. [Sources: L10 p.12]
- Singular value decomposition is introduced as a matrix factorisation that can be truncated to produce low-dimensional dense vectors; the lecture labels this latent semantic analysis. [Sources: L10 p.13-14]
- JM3 presents the same count-based progression from co-occurrence matrices, to weighting, to cosine similarity, and then to denser vector spaces. [Sources: JM3 Ch.5, count-based embedding discussion]

## Word-context matrices and PMI

- The lecture next switches to `words as context`, counting how often a word appears with nearby words. [Sources: L10 p.15]
- Raw co-occurrence frequency is criticised because common words dominate the counts. [Sources: L10 p.15]
- Pointwise mutual information is then introduced as
  `PMI(x, y) = log2( P(x, y) / (P(x) P(y)) )`, measuring how far actual co-occurrence deviates from independence. [Sources: L10 p.16]
- The lecture walks through a concrete PMI calculation for `state` and `country`. [Sources: L10 p.17]
- The lecture also notes that SVD can again be applied after TF-IDF or PPMI weighting to obtain dense vectors. [Sources: L10 p.19]

## Neural embedding methods

- The lecture points out that embeddings already appear inside neural language models, but there they are only a by-product of solving another task. [Sources: L10 p.21]
- It then asks for models that are explicitly designed to learn embeddings, with the desiderata of being unsupervised and efficient. [Sources: L10 p.22]
- JM3 presents word2vec for exactly this purpose and frames it as a static embedding method. [Sources: JM3 Ch.5, skip-gram discussion]

## Word2Vec: skip-gram and CBOW

- The lecture presents two word2vec variants:
  - skip-gram predicts surrounding words from a target word;
  - CBOW predicts the target word from surrounding words. [Sources: L10 p.24]
- The skip-gram objective is written in the lecture as the product of the probabilities of each neighbouring context word given the target word. [Sources: L10 p.25]
- The lecture defines the softmax probability using a dot product between a target embedding and a context embedding. [Sources: L10 p.25-26]
- It also stresses that skip-gram maintains two embedding matrices, one for target words and one for context words. [Sources: L10 p.26-27]

## Negative sampling

- The lecture says that full softmax training is too slow because it normalises over the full vocabulary. [Sources: L10 p.28]
- It therefore reduces training to binary classification between real context pairs and randomly sampled non-context pairs. [Sources: L10 p.28]
- The resulting loss sums positive and negative terms over observed and sampled pairs. [Sources: L10 p.29-30]
- JM3 describes the same learning intuition: move the target embedding closer to observed context words and farther from noise words. [Sources: JM3 Ch.5, negative sampling discussion]

## How embeddings are evaluated

- The lecture lists three evaluation styles:
  - word similarity via cosine similarity,
  - word analogy,
  - downstream-task usefulness. [Sources: L10 p.32-36]
- Word similarity compares model scores with human judgements on sets such as WordSim-353 and SimLex-999. [Sources: L10 p.33]
- Word analogy uses vector arithmetic, for example `woman - man + king ≈ queen`. [Sources: L10 p.34]
- The lecture's strongest claim is that the best evaluation is downstream performance, either by using embeddings as features or by using them to initialise the first layer of larger neural models. [Sources: L10 p.36]
- JM3 likewise treats cosine similarity as the standard vector similarity metric and also discusses analogy as an important but imperfect probe of embedding structure. [Sources: JM3 Ch.5, cosine and analogy sections]

## General findings from the lecture

- The lecture summarises that neural embedding methods usually outperform count-based methods. [Sources: L10 p.37]
- It also says pretrained word vectors are useful for initialising downstream networks. [Sources: L10 p.36-37]
- The lecture uses this result to motivate the next conceptual step: pretraining entire models rather than just the first embedding layer. [Sources: L10 p.37]

## Workshop reinforcement

- Week 5 distinguishes count-based word representations such as bag-of-words and TF-IDF from prediction-based ones such as Word2Vec and GloVe. [Sources: Wk5 p.7]
- The workshop defines word embeddings as low-dimensional continuous representations that encode semantic and syntactic relationships and support generalisation to unseen sequences. [Sources: Wk5 p.8]
