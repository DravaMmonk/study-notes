# 01 Text Preprocessing

## Source Pack
- Lecture: `L2 Text Preprocessing (v2)`, pp. 2-33.
- Workshop: `workshop_nlp_JL_2026s1_wk2.pdf`.
- Reading: SLP3 reading listed by the course for this lecture (`JM3 Chapter 2.4`).

## Why Preprocessing Exists
- The lecture motivates preprocessing by noting that most NLP applications take documents as input and that language is compositional, so a computer should break documents into smaller components before analysis. [Source: L2 p.2]
- The lecture defines the core units used throughout the rest of the subject: a word, a sentence, a document, a corpus, a word token, and a word type. [Source: L2 p.3]
- The lecture also contrasts token count and vocabulary size, illustrating that corpora with more tokens still continue to add new types; one example slide reports the Google N-gram corpus as roughly one trillion tokens and thirteen million types. [Source: L2 pp. 4-5]

## Standard Preprocessing Pipeline
- The lecture gives the following pipeline: remove unwanted formatting, perform sentence segmentation, perform word tokenisation, normalise words, and remove stop words. [Source: L2 p.6]
- The final choice of steps is task- and language-dependent; the lecture explicitly says preprocessing is unavoidable in text analysis, can strongly affect downstream applications, and is often language-dependent. [Source: L2 p.32]

## Sentence Segmentation
- A naive rule that splits on sentence punctuation such as `.`, `?`, or `!` fails because periods also appear in abbreviations and some punctuation can occur inside words. [Source: L2 p.8]
- Requiring a following capital letter improves the heuristic but still fails on cases such as abbreviations followed by names. [Source: L2 p.8]
- Lexicons can help, but the lecture says it is difficult to enumerate all relevant names and abbreviations. [Source: L2 p.8]
- The lecture says state-of-the-art systems use machine learning rather than hand-written rules; one binary-classifier formulation decides for each period whether it ends a sentence. [Source: L2 pp. 8-9]
- Example features for the binary classifier include neighbouring words, word-shape features such as casing and character length, and POS-based cues such as determiners tending to begin a sentence. [Source: L2 p.9]

## Word Tokenisation
- The workshop defines tokenisation as segmenting text into tokens, which may be words or subwords. [Source: wk2 slide "What is tokenisation?"]
- The workshop states tokenisation matters because long documents are hard to manipulate directly, and segmentation makes text easier for machines to process. [Source: wk2 slide "Why is it important?"]
- For English, the lecture lists multiple failure cases for simple alphabetic splitting: abbreviations, hyphenated forms, numbers, dates, clitics, internet language, and multiword units such as "New Zealand". [Source: L2 p.11]
- For Chinese, the lecture notes that some languages are written without spaces and that a single word may correspond to more than one character. [Source: L2 p.12]
- The lecture presents MaxMatch as a standard vocabulary-based strategy for Chinese tokenisation: greedily match the longest item in the existing vocabulary. [Source: L2 p.13]
- The same lecture immediately shows that MaxMatch can still fail because the vocabulary is uncertain and segmentation can remain ambiguous. [Source: L2 p.14]

## Subword Tokenisation and BPE
- The lecture introduces byte-pair encoding (BPE) as a popular subword method whose core idea is to iteratively merge frequent pairs of characters. [Source: L2 p.15]
- Its stated advantages are that tokenisation becomes data-informed, works across languages, and handles unknown words better than pure word-level tokenisation. [Source: L2 p.15]
- The worked example in the lecture starts from a character vocabulary and repeatedly adds merged units such as `r_`, `er_`, `ew`, `new`, `ow`, `low`, and `newer_`. [Source: L2 pp. 16-21]
- In practice, the lecture says BPE performs thousands of merges, representing frequent words as full words and rarer words as subwords; in the worst case, unseen test words fall back to individual letters. [Source: L2 p.22]
- The workshop explicitly expects students to understand BPE and to be able to implement it. [Source: wk2 learning-outcomes slide]

## Word Normalisation
- The lecture groups lowercasing, morphology removal, spelling correction, and abbreviation expansion under normalisation. [Source: L2 p.24]
- The stated goal of normalisation is to reduce vocabulary size by mapping multiple surface forms into the same type. [Source: L2 p.24]

## Inflectional vs Derivational Morphology
- The lecture defines inflectional morphology as creating grammatical variants, and gives English noun number, verb tense/aspect/agreement, and adjective comparison as examples. [Source: L2 p.25]
- The lecture separately defines derivational morphology as creating distinct words; English derivational suffixes often change lexical category, while prefixes often change meaning without changing lexical category. [Source: L2 p.27]
- The workshop reinforces the distinction with examples such as `teacher -> teachers` for inflection and `teach -> teacher` for derivation. [Source: wk2 morphology discussion slides]

## Lemmatisation
- The lecture defines lemmatisation as removing inflection to reach the lemma, the uninflected form. [Source: L2 p.26]
- The lecture emphasises that lemmatisation is not a trivial stripping process in English because irregular forms exist; its examples include `poked -> poke`, `stopping -> stop`, `watches -> watch`, and `was -> be`. [Source: L2 p.26]
- Because of these irregularities, the lecture says accurate lemmatisation requires a lexicon of lemmas. [Source: L2 p.26]
- The workshop explains the same contrast with `Computers -> Computer` as a lemmatisation example. [Source: wk2 stemming-vs-lemmatisation slide]

## Stemming
- The lecture defines stemming as stripping suffixes to obtain a stem, even if the resulting string is not an actual lexical item. [Source: L2 p.28]
- It explicitly says stemming usually produces even less lexical sparsity than lemmatisation and is popular in information retrieval, but the resulting stem may not be interpretable. [Source: L2 p.28]
- The lecture presents the Porter stemmer as the most popular English stemmer and says it applies rewrite rules in stages, first removing inflectional suffixes and then derivational suffixes. [Source: L2 p.29]
- The workshop uses `Computers -> Comput` as the contrasting stemming example. [Source: wk2 stemming-vs-lemmatisation slide]

## Stopword Removal
- The lecture defines stop words as words removed from the document, especially in bag-of-words representations. [Source: L2 p.31]
- The lecture warns that stopword removal is not appropriate when sequence information matters. [Source: L2 p.31]
- Candidate stopword lists may include closed-class/function words or high-frequency words; the lecture mentions toolkits such as NLTK and spaCy. [Source: L2 p.31]

## Practical Takeaways
- The lecture concludes that simple rule-based preprocessing can work well but is rarely perfect, which is why preprocessing choices must follow the corpus and downstream task rather than a fixed recipe. [Source: L2 p.32]
- The workshop frames the preprocessing notebook as the place where tokenisation, normalisation, and BPE move from conceptual definitions to implementation. [Source: wk2 programming slides]

