# 01 Text Preprocessing

## Core motivation

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
