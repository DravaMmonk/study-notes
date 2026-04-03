# 04 Sequence Labelling: POS Tagging and HMMs

## POS tagging basics

- Part-of-speech tagging assigns a syntactic category to each token in a sequence.
<!-- Sources: L5 p.2, p.12-14 -->
- POS information is useful for morphology, selected-category retrieval, classification features, word-sense disambiguation, and larger syntactic structures.
<!-- Sources: L5 p.22 -->

## Tagsets and ambiguity

- Open classes include nouns, verbs, adjectives, and adverbs.
<!-- Sources: L5 p.5-6 -->
- Closed classes include determiners, prepositions, pronouns, particles, and related function-word categories.
<!-- Sources: L5 p.7-8 -->
- The Penn Treebank tagset is a compact English tag inventory with categories such as `NN`, `VB`, `JJ`, `RB`, `DT`, `IN`, and `PRP`.
<!-- Sources: L5 p.13-18 -->
- The same surface word can receive different tags in different contexts.
<!-- Sources: L5 p.10-11 -->

## Baseline taggers

| Approach | Core idea |
| --- | --- |
| rule-based | start from lexical possibilities and constrain them with hand-written rules |
| unigram | assign the most frequent observed tag for each word type |
| classifier-based | predict each tag from local lexical features and previous tag decisions |
| HMM | model the whole tag sequence with transition and emission probabilities |
<!-- Sources: L5 p.23-27 -->

- A unigram tagger is a strong baseline and is presented as achieving about 90% accuracy.
<!-- Sources: L5 p.25 -->
- Local classifier-based taggers can suffer from error propagation.
<!-- Sources: L5 p.26; L6 p.2-3 -->

## Unknown words

- Unknown words are especially difficult in morphologically rich languages.
<!-- Sources: L5 p.28 -->
- Hapax legomena and subword or affix information can improve guesses for unseen forms.
<!-- Sources: L5 p.28 -->

## HMM factorisation

$$
\hat{t}_{1:n}=\arg\max_{t_{1:n}} P(t_{1:n}\mid w_{1:n})
=
\arg\max_{t_{1:n}} P(w_{1:n}\mid t_{1:n})P(t_{1:n})
$$
<!-- Sources: L6 p.4 -->

$$
P(w_{1:n}\mid t_{1:n})=\prod_{i=1}^{n} P(w_i \mid t_i)
\qquad
P(t_{1:n})=\prod_{i=1}^{n} P(t_i \mid t_{i-1})
$$
<!-- Sources: L6 p.5 -->

- The output-independence assumption makes each observed word depend only on its current hidden tag.
<!-- Sources: L6 p.5; Wk4 p.12-14 -->
- The Markov assumption makes each current tag depend only on the previous tag in the first-order model.
<!-- Sources: L6 p.5; Wk4 p.12-14 -->

## Training an HMM tagger

- Training estimates an initial-state distribution, a transition matrix, and an emission matrix from tagged corpus counts.
<!-- Sources: L6 p.6-9; Wk4 p.15 -->
- A sentence-start symbol such as `<s>` provides first-tag probabilities.
<!-- Sources: L6 p.7 -->
- Unseen word-tag and tag-tag combinations require smoothing.
<!-- Sources: L6 p.7 -->

## Viterbi decoding

$$
\mathrm{dp}[i,t]
=
\max_{t'}
\mathrm{dp}[i-1,t'] \cdot P(t \mid t') \cdot P(w_i \mid t)
$$
<!-- Sources: L6 p.11-13, p.39-40 -->

- Viterbi is a dynamic-programming algorithm that keeps the best partial score for each tag at each position and later backtraces through stored predecessors.
<!-- Sources: L6 p.11-13, p.33-36 -->
- Greedy left-to-right decoding is insufficient because the locally best tag may not belong to the globally best sequence.
<!-- Sources: L6 p.10-11 -->
- First-order Viterbi decoding has complexity `O(T^2 N)`.
<!-- Sources: L6 p.39; Wk4 p.22 -->

## Higher-order models and comparisons

- Trigram HMMs improve context sensitivity by conditioning on the two previous tags.
<!-- Sources: L6 p.41 -->
- Trigram decoding increases the search cost to `O(T^3 N)` and increases sparsity pressure.
<!-- Sources: L6 p.41 -->
- MEMMs, CRFs, and deep CRF variants are presented as stronger but related sequence-tagging models.
<!-- Sources: L6 p.43-44 -->

## Main takeaway

- HMMs remain fast, conceptually clean, and competitive baseline models for sequence labelling.
<!-- Sources: L6 p.45 -->
