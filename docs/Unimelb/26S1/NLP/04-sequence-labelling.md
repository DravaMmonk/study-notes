# 04 Sequence Labelling: POS Tagging and HMMs

## Scope

- Lectures: `L5 Part of Speech Tagging`, `L6 Hidden Markov Models`.
- Workshop: `Week 4`.
- Reading: `JM3 Chapter 17`.

## What POS tagging is for

- The lecture defines part-of-speech tagging as assigning a syntactic category to each token in a sequence. [Sources: L5 p.2, p.12-14]
- POS information is useful for morphological analysis such as lemmatisation, for applications that care about selected categories like nouns or adjectives, for classification features, for word-sense disambiguation, and for building larger syntactic structures. [Sources: L5 p.22]
- JM3 similarly frames POS tagging as mapping a token sequence to a tag sequence drawn from a fixed tagset. [Sources: JM3 Ch.17, POS tagging discussion]

## Tagsets and ambiguity

- The lecture distinguishes open classes such as nouns, verbs, adjectives, and adverbs from closed classes such as determiners, prepositions, pronouns, and `to`. [Sources: L5 p.5-8]
- The lecture introduces the Penn Treebank tagset as a major English tagset and presents its core tags as a compact representation of POS information. [Sources: L5 p.12-18]
- JM3 notes both Universal Dependencies tags and the Penn Treebank tagset, and emphasises that English-specific distinctions in Penn can be finer-grained than universal schemes. [Sources: JM3 Ch.17, tagset discussion]
- The lecture also stresses ambiguity: the same surface word can belong to multiple categories depending on context. [Sources: L5 p.10-11]

## Baseline tagging strategies

- Rule-based tagging starts from a list of possible tags and narrows them down with hand-written rules derived from lexical resources or corpora. [Sources: L5 p.24]
- The unigram tagger assigns the most common tag to each word type, needs tagged training data, and is presented as a strong baseline with about 90% accuracy. [Sources: L5 p.25]
- Classifier-based tagging uses a discriminative model with features from the target word, surrounding lexical context, and already predicted tags. [Sources: L5 p.26]
- The lecture's main criticism of local classifier tagging is error propagation from earlier decisions. [Sources: L5 p.26; L6 p.2-3]

## Why HMMs are introduced

- L6 begins by arguing that treating the whole tag sequence as a single class would be intractable because the number of tag combinations grows exponentially with sentence length. [Sources: L6 p.2]
- The lecture's alternative is structured prediction: decompose tagging into local steps while still optimising the whole sequence jointly. [Sources: L6 p.3]
- HMMs are introduced as a probabilistic sequence model that captures both lexical evidence and tag-transition structure. [Sources: L5 p.27; L6 p.4-5]

## HMM factorisation and assumptions

- The lecture defines the tagging objective as finding the tag sequence `t` that maximises `P(t | w)`, then rewrites this with Bayes' rule as maximising `P(w | t) P(t)`. [Sources: L6 p.4]
- The two HMM assumptions are:
  - output independence: each observed word depends only on its current hidden tag;
  - Markov assumption: each current tag depends only on the previous tag. [Sources: L6 p.5; Wk4 p.12-14]
- Under these assumptions, the model factorises into emission probabilities `P(w_i | t_i)` and transition probabilities `P(t_i | t_{i-1})`. [Sources: L6 p.4-6]

## Training an HMM tagger

- The lecture estimates emissions and transitions with maximum likelihood estimation from tagged corpora. [Sources: L6 p.6]
- The lecture adds a sentence-start symbol `<s>` so that first-tag probabilities can also be estimated as transitions from the start state. [Sources: L6 p.7]
- The workshop names the three parameter groups explicitly: initial-state probabilities `π`, transition matrix `A`, and emission matrix `B`. [Sources: Wk4 p.15]
- In the workshop toy corpus `silver/JJ wheels/NNS turn/VBP`, `wheels/NNS turn/VBP right/JJ`, and `right/JJ wheels/NNS turn/VBP`, the initial-state distribution gives `JJ` probability `2/3` and `NNS` probability `1/3`. [Sources: Wk4 p.16]
- The workshop also shows how transition rows are counted only when a tag actually transitions to something later in the sentence, so the rows remain valid probability distributions. [Sources: Wk4 p.17]

## Unknown words

- The lecture describes unknown words as a major practical issue, especially in morphologically rich languages such as Turkish. [Sources: L5 p.28]
- Suggested strategies include using hapax legomena to estimate likely tags for unseen forms and using subword or affix information to capture morphology. [Sources: L5 p.28]
- JM3 makes the same point more generally: unknown words are one reason POS tagging needs richer lexical features than pure memorisation. [Sources: JM3 Ch.17, unknown word discussion]

## Decoding and the Viterbi algorithm

- The lecture rejects greedy left-to-right decoding because it maximises local choices instead of the sequence-level objective, so it still suffers from error propagation. [Sources: L6 p.10-11]
- Brute-force search over all tag sequences is also rejected because the search space is exponential in sequence length. [Sources: L6 p.2, p.10]
- Viterbi is then introduced as a dynamic programming algorithm that keeps the best score reaching each tag at each position and records backpointers for the best predecessor. [Sources: L6 p.11-13, p.40]
- The lecture's worked example with `Janet will back the bill` fills a lattice column by column, then backtraces to recover the optimal sequence `Janet/NNP will/MD back/VB the/DT bill/NN`. [Sources: L6 p.12-36]
- The workshop gives the standard complexity as `O(T^2 W)` for `T` states and a sentence of length `W`, and argues that this is practical for POS tagging. [Sources: Wk4 p.22]
- The lecture gives the equivalent complexity as `O(T^2 N)` and recommends log probabilities to avoid underflow. [Sources: L6 p.39-40]

## Higher-order HMMs and practical performance

- The lecture notes that the course version is a bigram HMM, but that strong practical systems often move to trigram HMMs, where the current tag depends on the two previous tags. [Sources: L6 p.41]
- This gives a more expensive Viterbi search of `O(T^3 N)` and requires interpolation or other smoothing because many tag trigrams will be sparse. [Sources: L6 p.41]
- The lecture cites Brants (2000) for 96.5% accuracy on Penn Treebank tagging with additional features. [Sources: L6 p.41]

## Generative vs discriminative sequence models

- The lecture labels HMMs as generative because they model `P(W | T) P(T)` and can in principle generate sentences from the learned model. [Sources: L6 p.42]
- This generative structure also permits unsupervised HMM variants in which the hidden tag sequence is inferred without tagged data. [Sources: L6 p.42]
- The lecture contrasts this with discriminative models that model `P(T | W)` directly and can incorporate richer feature sets. [Sources: L6 p.43]
- Maximum Entropy Markov Models and Conditional Random Fields are given as examples of discriminative sequence taggers, and the lecture says that most deep sequence models are also discriminative. [Sources: L6 p.43]

## What to remember

- The lecture concludes that HMMs remain a simple, fast, and competitive baseline for sequence labelling, even though they are less flexible in feature design than MEMMs or CRFs. [Sources: L6 p.45]
- POS tagging is therefore both a core linguistic task and a gateway example for structured prediction in NLP. [Sources: L5 p.29; L6 p.45]
