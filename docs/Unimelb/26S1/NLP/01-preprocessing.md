# 01 Text Preprocessing

## Scope

- Lecture: `L2 Text Preprocessing`.
- Workshop: `Week 2`.
- Reading: `JM3 Chapter 2`.

## Why preprocessing is the first step

- The lecture frames preprocessing as necessary because most NLP applications receive documents as input, and computers must break language into smaller components before analysis. [Sources: L2 p.2]
- The lecture's preprocessing pipeline has five steps: remove unwanted formatting, sentence segmentation, word tokenisation, word normalisation, and stopword removal. [Sources: L2 p.6]
- The workshop repeats this motivation by defining tokenisation as segmenting text into tokens and by arguing that a document can be too large to manipulate directly without decomposition. [Sources: Wk2 p.11-12]
- JM3 likewise describes tokenization as the first stage of modern NLP and as the process of segmenting running text into tokens. [Sources: JM3 Ch.2, opening pages; JM3 Ch.2 summary]

## Basic units

- The lecture distinguishes `word`, `sentence`, `document`, and `corpus`, and also distinguishes `word token` from `word type`. [Sources: L2 p.3]
- In the lecture, a lexicon is the set of word types. [Sources: L2 p.3]
- JM3 makes a related distinction between word types, the vocabulary size `|V|`, and word instances, the total number `N` of running words. [Sources: JM3 Ch.2, section 2.1]
- The lecture uses corpus statistics from Switchboard, Shakespeare, and Google N-grams to show that the number of observed word types grows as the corpus grows. [Sources: L2 p.5]

## Sentence segmentation

- The lecture shows that a naive rule of splitting on sentence punctuation fails because periods also appear in abbreviations. [Sources: L2 p.8]
- A regex-based refinement such as requiring sentence punctuation followed by a capital letter also fails, because abbreviations can be followed by proper names. [Sources: L2 p.8]
- The lecture therefore presents machine learning sentence segmentation as a binary classification problem over each period. [Sources: L2 p.9]
- The listed features include words before and after the period, word shape features such as case and length, and part-of-speech information. [Sources: L2 p.9]

## Word tokenisation

- For English, the lecture lists abbreviations, hyphens, numbers, dates, clitics, internet language, and multiword units as reasons a naive `\\w+` approach is inadequate. [Sources: L2 p.11]
- For Chinese, the lecture explains that some Asian languages are written without spaces between words and that words often correspond to more than one character. [Sources: L2 p.12]
- The lecture presents MaxMatch as a vocabulary-based greedy algorithm that chooses the longest matching word. [Sources: L2 p.13]
- The lecture also shows a Chinese ambiguity example where the same character sequence can support different segmentations, demonstrating that an existing vocabulary is not enough to solve tokenisation perfectly. [Sources: L2 p.14]
- The workshop mirrors the lecture by defining tokenisation as segmentation into words or subwords. [Sources: Wk2 p.11]
- JM3 stresses that defining "word" is itself language- and task-dependent, especially across languages that do not mark word boundaries orthographically. [Sources: JM3 Ch.2, section 2.1]

## Subword tokenisation and BPE

- The lecture introduces subword tokenisation with the example `colourless -> [colour] [less]` and motivates it as a way to be data-informed, multilingual, and more robust to unknown words. [Sources: L2 p.15]
- The lecture's BPE walkthrough starts from characters, repeatedly merges the most frequent adjacent pair, and gradually creates larger units such as `er_`, `new`, and `low`. [Sources: L2 p.16-21]
- The lecture states that, in practice, many merges are performed, so frequent words become whole tokens while rarer words are kept as shorter subwords; in the worst case, unseen words can still be decomposed into letters. [Sources: L2 p.22]
- The workshop defines BPE as a subword tokenisation algorithm that iteratively merges frequent pairs of characters, and repeats the same advantages as the lecture. [Sources: Wk2 p.18]
- JM3 explains BPE as a training phase that learns a vocabulary by iteratively merging frequent adjacent tokens and an encoding phase that segments test text using the learned vocabulary. [Sources: JM3 Ch.2, BPE discussion]
- JM3 also states the main practical motivation for subwords: every unseen word can be represented as a sequence of known subword units. [Sources: JM3 Ch.2, BPE discussion]

## Word normalisation

- The lecture lists lowercasing, removing morphology, correcting spelling, and expanding abbreviations as normalisation operations. [Sources: L2 p.24]
- The lecture gives the goal of normalisation as reducing vocabulary size and mapping related forms to the same type. [Sources: L2 p.24]
- The workshop notes one trade-off explicitly: stemming and lemmatisation can keep some useful semantic information while also losing contextual information. [Sources: Wk2 p.13]

## Inflectional vs derivational morphology

- The lecture defines inflectional morphology as creating grammatical variants, and gives English examples on nouns, verbs, and adjectives. [Sources: L2 p.25]
- The lecture notes that many languages have richer inflectional morphology than English, with French noun gender used as one example. [Sources: L2 p.25]
- The lecture defines derivational morphology as creating distinct words, often by changing lexical category with suffixes or changing meaning with prefixes. [Sources: L2 p.27]
- The workshop uses `teacher -> teachers` as an inflectional example and `teach -> teacher` as a derivational example. [Sources: Wk2 p.14]

## Lemmatisation and stemming

- The lecture defines lemmatisation as removing inflection to reach the lemma, and notes that irregular forms such as `was -> be` require a lexicon. [Sources: L2 p.26]
- The lecture defines stemming as stripping suffixes to leave a stem, and notes that the result may not be a valid lexical item. [Sources: L2 p.28]
- The lecture presents stemming as more aggressive than lemmatisation and as popular in information retrieval. [Sources: L2 p.28]
- The lecture describes the Porter stemmer as the most popular English stemmer and says that it first strips inflectional suffixes and then derivational suffixes. [Sources: L2 p.29]
- The workshop uses `Computers -> Computer` versus `Computers -> Comput` to contrast lemmatisation with stemming. [Sources: Wk2 p.13]
- The workshop comparison table reinforces that stemming can output garbage tokens, whereas lemmatisation relies on a lexicon of valid words. [Sources: Wk2 p.15]

## Stopword removal

- The lecture defines stop words as words removed from a document, especially in bag-of-words representations. [Sources: L2 p.31]
- The lecture warns that stopword removal is not appropriate when sequence information matters. [Sources: L2 p.31]
- The lecture lists closed-class words and very high-frequency words as common sources of stopword lists, and names `NLTK` and `spaCy` as toolkits that provide them. [Sources: L2 p.31]

## Practical takeaways

- The lecture concludes that preprocessing is unavoidable in text analysis, can strongly affect downstream tasks, varies by corpus and task, and is often language-dependent. [Sources: L2 p.32]
- The workshop learning goals for Week 2 were to become familiar with tokenisation, stemming, lemmatisation, and the BPE algorithm, including implementation. [Sources: Wk2 p.6]
