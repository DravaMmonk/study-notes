---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Sequence Labelling
source_type: lecture+workshop+reading
status: draft
review_priority: high
---

# 04 Sequence Labelling: POS Tagging and HMMs

## Big Picture

Sequence labelling predicts one label for each token while preserving dependencies between neighbouring labels. POS tagging is the course's main example, and HMMs introduce the idea that the globally best label sequence may differ from the locally best tag at each position.
<!-- Sources: L5 p.2, p.12-27; L6 p.2-13; Wk4 p.12-22 -->

## Learning Map

- Prerequisite ideas: token sequences, conditional probability, dynamic programming, and classification.
<!-- Sources: L5 p.2; L6 p.4-13 -->
- Core concepts: POS tagsets, lexical ambiguity, unknown words, transition probabilities, emission probabilities, Markov assumptions, and Viterbi decoding.
<!-- Sources: L5 p.5-28; L6 p.4-45 -->
- Main procedures: estimate HMM parameters from tagged data, smooth unseen events, run Viterbi, and backtrace the best tag sequence.
<!-- Sources: L6 p.6-13, p.33-40; Wk4 p.15-22 -->
- Tutorial skills: identify HMM independence assumptions and compute dynamic-programming updates.
<!-- Sources: L6 p.4-13; Wk4 p.12-22 -->
- Common traps: tagging greedily left-to-right, ignoring unknown words, or confusing emission and transition probabilities.
<!-- Sources: L5 p.28; L6 p.5-13 -->

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

<!-- Figure source: L6 p.4 -->

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

<!-- Figure source: L6 p.39 -->

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

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| POS ambiguity | same word can take multiple tags | use context and tag sequence probabilities | assigning one permanent tag per word type |
| HMM probability | asks for tag sequence score | multiply transition and emission terms | using word-word transitions |
| Viterbi table | asks for best sequence | fill max scores per position/tag and backtrace | choosing locally best tag without future context |
| Unknown word | word unseen in training | use smoothing, hapax, morphology, or affixes | assigning zero probability to every unseen word |
<!-- Sources: L5 p.10-28; L6 p.4-13, p.33-45; Wk4 p.12-22 -->

## Key Comparisons

| Approach | Uses sequence dependencies? | Main strength | Main weakness |
| --- | --- | --- | --- |
| Unigram tagger | no | strong simple baseline | ignores context |
| Classifier tagger | limited local features | flexible features | error propagation |
| HMM | yes, generative | global sequence decoding with Viterbi | simplifying independence assumptions |
| Trigram HMM | yes, wider tag context | more context-sensitive | higher complexity and sparsity |
<!-- Sources: L5 p.23-27; L6 p.41-45 -->

## Revision Checklist

- Can explain the difference between emission and transition probabilities.
- Can write the HMM factorisation for POS tagging.
- Can explain why Viterbi is dynamic programming.
- Can state the `O(T^2 N)` first-order Viterbi complexity.
<!-- Sources: L6 p.4-13, p.33-45; Wk4 p.12-22 -->

## Active Recall

1. Why can a unigram tagger be strong but still limited?
2. What does the output-independence assumption say?
3. Why is greedy decoding insufficient for POS tagging?
4. Why does a trigram HMM increase sparsity pressure?
<!-- Sources: L5 p.23-28; L6 p.4-45 -->

## Glossary

| Term | Meaning |
| --- | --- |
| POS tag | A syntactic category assigned to a token. |
| Emission probability | Probability of a word given its hidden tag. |
| Transition probability | Probability of a tag given previous tag context. |
| Viterbi | Dynamic-programming algorithm for the best hidden-state sequence. |
| Hapax legomenon | A word occurring once in a corpus, useful for unknown-word modelling. |
<!-- Sources: L5 p.2-28; L6 p.4-45 -->
