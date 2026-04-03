# 04 Sequence Labelling: POS and HMMs

## Source Pack
- Lectures: `L5 Part of Speech Tagging (v1)`, pp. 2-30; `L6 Hidden Markov Models (v2)`, pp. 2-46.
- Workshop: `workshop_nlp_JL_2026s1_wk4.pdf`.
- Readings: course readings for these lectures (`JM3 Chapter 17-17.2` and `JM3 Chapter 17.4`).

## What POS Tagging Is For
- The lecture defines part of speech (POS) as word classes, morphological classes, or syntactic categories. [Source: L5 p.2]
- POS is useful because it helps identify the grammatical roles of words needed for downstream tasks such as information extraction. [Source: L5 pp. 2-3]
- The lecture also says POS tagging supports lemmatisation, feature design for classification, word-sense disambiguation, and the construction of larger syntactic structures. [Source: L5 p.22]

## Open and Closed Classes
- The lecture presents nouns, verbs, adjectives, and adverbs as the major open classes in English. [Source: L5 pp. 5-6]
- It presents prepositions, particles, determiners, pronouns, conjunctions, and modal verbs as closed classes. [Source: L5 pp. 7-8]
- The lecture also notes that languages differ in how universal particular categories are, and explicitly raises the question of whether open classes are universal. [Source: L5 p.9]

## Ambiguity Is Central
- POS ambiguity is context-sensitive: the lecture contrasts `Time flies like an arrow` with `Fruit flies like a banana` to show that the same surface words can take different tags in different contexts. [Source: L5 p.10]
- It further uses news headlines such as `Teachers Strike Idle Kids` and `Eye Drops Off Shelf` to show how POS ambiguity affects parsing and meaning. [Source: L5 p.11]

## Tagsets
- The lecture defines a tagset as a compact representation of POS information, usually using short capitalised labels and often encoding inflectional distinctions. [Source: L5 p.13]
- It lists Brown, Penn Treebank, CLAWS/BNC, and Universal tagsets as major English tagsets. [Source: L5 p.13]
- The lecture's Penn Treebank examples include `NN`, `VB`, `JJ`, `RB`, `DT`, `CD`, `IN`, `PRP`, `MD`, `CC`, `RP`, `WH`, and `TO`, with further derived tags such as `NNS`, `NNP`, `VBZ`, `VBD`, `VBG`, `VBN`, `JJR`, `JJS`, `PRP$`, `WDT`, and `WRB`. [Source: L5 pp. 14-17]
- The workshop additionally names Brown, Penn Treebank, CLAWS/BNC, and Universal as major English tagsets. [Source: wk4 introductory POS slides]

## Automatic Tagging Methods in L5

### Rule-based Taggers
- The lecture says rule-based tagging usually starts from a list of candidate tags for each word and then eliminates candidates using constraints derived from relatively unambiguous contexts. [Source: L5 p.24]
- It notes that large rule-based systems can contain thousands of constraints. [Source: L5 p.24]

### Unigram Taggers
- A unigram tagger assigns the most common tag to each word type. [Source: L5 p.25]
- The lecture characterises it as a lookup-table baseline that still achieves about 90% accuracy and resolves roughly 75% of ambiguity. [Source: L5 p.25]

### Classifier-based Taggers
- The lecture frames classifier-based tagging as discriminative prediction over the target word, its lexical context, and already-predicted tags in the sentence. [Source: L5 p.26]
- Its main weakness is error propagation from earlier tagging decisions. [Source: L5 p.26]

### HMM Taggers
- The lecture introduces HMMs as basic sequential or structured models that use both previous-tag information and lexical evidence while considering all possible previous tags jointly. [Source: L5 p.27]
- The lecture also says HMMs treat previous-tag evidence and lexical evidence as independent, which reduces sparsity and enables fast sequence-level search. [Source: L5 p.27]

## Unknown Words
- The lecture treats unknown words as a major POS-tagging problem, especially in morphologically rich languages such as Turkish. [Source: L5 p.28]
- Suggested heuristics include learning from hapax legomena and using subword patterns such as affixes. [Source: L5 p.28]

## From Local Tagging to Sequence Labelling
- L6 begins by showing why full-sequence tagging cannot be treated as a flat classification problem: the number of tag sequences grows exponentially with sentence length. [Source: L6 p.2]
- The lecture's alternative is sequence labelling: decompose the task into word-level steps while still learning and decoding with respect to the whole tag sequence. [Source: L6 p.3]

## HMM Assumptions and Factorisation
- The lecture defines the tagging goal as finding the best tag sequence `t` for the observed sentence `w`. [Source: L6 p.4]
- It factorises the problem using two assumptions: output independence, where each observed word depends only on its hidden tag, and the Markov assumption, where the current tag depends only on the previous tag. [Source: L6 pp. 4-5]
- Under this factorisation, the two learned probability families are emission probabilities `P(w_i | t_i)` and transition probabilities `P(t_i | t_{i-1})`. [Source: L6 pp. 4-6]
- The workshop states the same assumptions explicitly and names the model parameters `pi`, `A`, and `B` for initial-state, transition, and emission probabilities. [Source: wk4 HMM slides]

## Training an HMM
- The lecture says HMM training uses maximum-likelihood estimation by counting tagged-word and tag-transition frequencies, in direct analogy with n-gram language modelling. [Source: L6 p.6]
- The workshop operationalises this by having students estimate `pi`, `A`, and `B` from a tagged toy corpus and visualise the HMM as a graph. [Source: wk4 parameter-estimation slides]

## Decoding and the Viterbi Algorithm
- The lecture contrasts greedy local decisions with global sequence decoding and then uses Viterbi dynamic programming to recover the best full tag path. [Source: L6 pp. 2-3, 34-40]
- The lecture states the Viterbi complexity as `O(T^2 N)`, where `T` is the tagset size and `N` is sequence length. [Source: L6 p.39]
- The lecture explains that Viterbi works precisely because the HMM independence assumptions decompose the problem into reusable subproblems. [Source: L6 p.39]
- The lecture's pseudocode recommends two practical implementation details: operate in log space to avoid underflow and use vectorisation where possible. [Source: L6 p.40]
- The workshop defines decoding as finding the most likely hidden tag sequence for an observation sequence and also identifies Viterbi as the common dynamic-programming decoder for HMMs. [Source: wk4 Viterbi slides]

## Higher-order HMMs and Practical Accuracy
- The lecture notes that the examples shown in class are first-order/bigram HMMs, while stronger taggers often use second-order/trigram HMMs. [Source: L6 p.41]
- The lecture also says trigram HMMs reintroduce sparsity, so interpolation across lower-order tag models is used in practice. [Source: L6 p.41]
- With additional features, the lecture cites 96.5% accuracy on Penn Treebank for a strong HMM tagger. [Source: L6 p.41]

## Generative vs Discriminative Sequence Models
- The lecture labels HMMs as generative because they model `P(W | T) P(T)` and can in principle generate sentences. [Source: L6 p.42]
- It contrasts them with discriminative sequence models that model `P(T | W)` directly and therefore support richer feature sets, usually with better accuracy when enough labelled data is available. [Source: L6 p.43]
- The lecture names MEMMs and CRFs as example discriminative sequence models and states that most deep sequence models are discriminative. [Source: L6 p.43]

## Main Takeaway
- Across L5 and L6, POS tagging functions as the course's first full sequence-labelling case study: it ties linguistic structure, probabilistic modelling, sparsity, and dynamic programming together in one task. [Source: L5 p.29; L6 pp. 44-45]
