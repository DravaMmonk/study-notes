---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Text Preprocessing
source_type: lecture+workshop+reading
status: draft
review_priority: high
---

# 01 Text Preprocessing

## Big Picture

Text preprocessing turns raw documents into units that downstream models can count, classify, tag, or embed. The key design issue is that preprocessing is not neutral: tokenisation, segmentation, normalisation, and stopword removal all change the evidence available to later models.
<!-- Sources: L2 p.2, p.6, p.32; Wk2 p.6; JM3 Ch.2 opening pages and summary -->

## Learning Map

- Prerequisite ideas: corpus, document, token, type, vocabulary, and downstream task.
<!-- Sources: L2 p.3-6 -->
- Core concepts: sentence segmentation, word tokenisation, subword tokenisation, BPE, normalisation, morphology, lemmatisation, stemming, and stopwords.
<!-- Sources: L2 p.6-32; Wk2 p.13-18 -->
- Main procedures: segment sentences, split tokens, handle unknown words, normalise forms when useful, and decide whether stopwords should be removed.
<!-- Sources: L2 p.6-32; Wk2 p.6 -->
- Tutorial skills: compare stemming and lemmatisation, explain BPE merges, and decide whether preprocessing fits a bag-of-words or sequence model.
<!-- Sources: L2 p.15-31; Wk2 p.13-18 -->
- Common traps: using whitespace tokenisation for every language, applying stopword removal to sequence-sensitive tasks, or assuming stemming always produces valid words.
<!-- Sources: L2 p.11-14, p.28-31 -->

## Core motivation

<!-- Figure source: L2 p.6 -->

- Most NLP applications receive documents as input and must decompose them into smaller units before analysis.
<!-- Sources: L2 p.2 -->
- A standard preprocessing pipeline contains five steps: remove unwanted formatting, sentence segmentation, word tokenisation, word normalisation, and stopword removal.
<!-- Sources: L2 p.6 -->
- Tokenisation is a first-stage operation in modern NLP pipelines because running text must be segmented into processable units.
<!-- Sources: JM3 Ch.2 opening pages and summary -->

## Basic units

| Unit | Meaning |
| --- | --- |
| word token | one running instance of a word |
| word type | one distinct vocabulary item |
| lexicon | the set of word types |
| corpus | a collection of documents |
<!-- Sources: L2 p.3 -->

- Vocabulary size grows as corpus size grows, so larger corpora keep introducing new types.
<!-- Sources: L2 p.5 -->

## Sentence segmentation

- Splitting on sentence punctuation alone fails because periods also appear in abbreviations.
<!-- Sources: L2 p.8 -->
- Requiring sentence punctuation followed by a capital letter still fails on cases such as abbreviations before proper names.
<!-- Sources: L2 p.8 -->
- Sentence segmentation can be formulated as binary classification over punctuation candidates.
<!-- Sources: L2 p.9 -->
- Useful features include neighbouring words, word-shape information such as case and length, and part-of-speech cues.
<!-- Sources: L2 p.9 -->

## Word tokenisation

- For English, abbreviations, hyphens, numbers, dates, clitics, internet language, and multiword expressions break a naive `\w+` tokeniser.
<!-- Sources: L2 p.11 -->
- For Chinese and related scripts, segmentation itself is an inference problem because word boundaries are not marked with spaces.
<!-- Sources: L2 p.12 -->
- MaxMatch is a greedy vocabulary-based strategy that repeatedly chooses the longest matching word.
<!-- Sources: L2 p.13 -->
- Vocabulary-based segmentation still leaves ambiguity because the same character sequence can support multiple valid segmentations.
<!-- Sources: L2 p.14 -->

## Subword tokenisation and BPE

<!-- Figure source: L2 p.28 -->

- Subword tokenisation improves robustness to unknown words while staying data-informed and multilingual.
<!-- Sources: L2 p.15 -->
- Byte-pair encoding starts from characters and repeatedly merges the most frequent adjacent pair.
<!-- Sources: L2 p.16-21; Wk2 p.18 -->
- After many merges, common words often become single tokens while rare words remain decomposable into shorter units.
<!-- Sources: L2 p.22 -->

## Word normalisation

- Normalisation operations include lowercasing, removing morphology, correcting spelling, and expanding abbreviations.
<!-- Sources: L2 p.24 -->
- The main goal is to reduce vocabulary size and map related forms to the same type.
<!-- Sources: L2 p.24 -->

## Morphology

| Type | Effect | Example pattern |
| --- | --- | --- |
| inflectional morphology | creates grammatical variants | number, tense, agreement, comparison |
| derivational morphology | creates distinct lexical items | category-changing suffixes, meaning-changing prefixes |
<!-- Sources: L2 p.25-27; Wk2 p.14 -->

- Languages can be much richer morphologically than English; French noun gender is one example highlighted in the slides.
<!-- Sources: L2 p.25 -->

## Lemmatisation and stemming

- Lemmatisation removes inflection to recover a lemma.
<!-- Sources: L2 p.26 -->
- Irregular forms such as `was -> be` require lexical knowledge rather than pure suffix stripping.
<!-- Sources: L2 p.26 -->
- Stemming strips suffixes more aggressively and may output a form that is not itself a valid lexical item.
<!-- Sources: L2 p.28 -->
- The Porter stemmer is presented as the most widely used English stemmer.
<!-- Sources: L2 p.29 -->
- Lemmatisation keeps outputs lexical, while stemming usually reduces sparsity more aggressively.
<!-- Sources: L2 p.28-29; Wk2 p.13-15 -->

## Stopword removal

- Stopword removal is most natural in bag-of-words representations.
<!-- Sources: L2 p.31 -->
- It is a poor fit when sequence information matters.
<!-- Sources: L2 p.31 -->
- Stopword lists commonly target closed-class words or very high-frequency words.
<!-- Sources: L2 p.31 -->

## Practical conclusion

- Preprocessing choices depend on the corpus, the language, and the downstream task.
<!-- Sources: L2 p.32; Wk2 p.6 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Token/type counting | asks for running words vs distinct vocabulary entries | count every occurrence for tokens and unique forms for types | counting types as repeated tokens |
| Sentence boundary ambiguity | punctuation is not always sentence-final | treat segmentation as classification over candidate punctuation | splitting every period |
| BPE merge trace | frequent adjacent character/subword pairs are shown | repeatedly merge the highest-frequency pair | merging by semantic intuition instead of counts |
| Stemming vs lemmatisation | asks about vocabulary reduction | lemmatisation returns dictionary forms; stemming strips affixes more aggressively | assuming stems must be valid words |
<!-- Sources: L2 p.3-32; Wk2 p.13-18 -->

## Key Comparisons

| Choice | Keeps more linguistic form? | Reduces sparsity more? | Better fit |
| --- | --- | --- | --- |
| Lemmatisation | yes | moderate | tasks needing interpretable lexical forms |
| Stemming | no | stronger | bag-of-words tasks where exact word form matters less |
| Word tokenisation | yes | weaker for rare words | classical word-level models |
| Subword tokenisation | partial | stronger for unknown words | multilingual and neural models |
<!-- Sources: L2 p.15-29; Wk2 p.13-18 -->

## Revision Checklist

- Can define token, type, lexicon, and corpus.
- Can explain why sentence segmentation is not just splitting on punctuation.
- Can trace the basic BPE algorithm.
- Can choose between stemming, lemmatisation, and no normalisation for a task.
<!-- Sources: L2 p.3-32; Wk2 p.13-18 -->

## Active Recall

1. Why does vocabulary size keep growing as corpus size grows?
2. What problem does subword tokenisation solve?
3. When is stopword removal inappropriate?
4. Why do irregular forms require lexical knowledge for lemmatisation?
<!-- Sources: L2 p.5, p.15-31 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Token | One running instance in text. |
| Type | One distinct vocabulary item. |
| BPE | Byte-pair encoding, a frequency-based subword merge algorithm. |
| Lemma | A dictionary base form after removing inflection. |
| Stem | A stripped form produced by a stemming algorithm. |
<!-- Sources: L2 p.3-32; Wk2 p.13-18 -->
