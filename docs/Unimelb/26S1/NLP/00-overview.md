# 00 Course Overview and History

## Scope

- Lectures: `L1 Course Overview and Introduction`.
- Reading: Christopher D. Manning, "Human Language Understanding & Reasoning".

## What NLP is studying

- The lecture defines NLP as an interdisciplinary area involving linguistics, computer science, and artificial intelligence, with the goal of designing algorithms that process and analyse human language data. [Sources: L1 p.14]
- The motivation in the lecture is that large amounts of information are trapped in unstructured text, so automatic systems must identify structure, important elements, and relations before they can reason over text. [Sources: L1 p.15]
- The course scope is organised from word- and document-level methods, to structure learning, to deep learning architectures, and then to pretrained and large language models. [Sources: L1 p.20-21]

## Course outcomes and working expectations

- The stated expectations are to develop Python skills, keep up with readings, and participate in lectures or the discussion board. [Sources: L1 p.5]
- The stated outcomes are practical familiarity with text analysis technologies, understanding of the theoretical models behind them, and competence in reading research literature. [Sources: L1 p.5]
- Lecture content and workshop content are both examinable according to the assessment slide. [Sources: L1 p.6]

## Core language challenges introduced in L1

- The lecture uses "I made her duck" to show that a short sentence can have multiple interpretations because lexical category, pronoun function, and argument structure are all ambiguous. [Sources: L1 p.23-24]
- In the lecture, `duck` can be a noun or a verb, `her` can be dative or possessive, and `make` can take different syntactic frames; the example is used to motivate why language processing is difficult. [Sources: L1 p.24]
- The lecture also flags broader unsolved challenges including long-context tasks, misinformation, parameter-efficient models, hallucination, stereotyping, and bias. [Sources: L1 p.32]

## Historical trajectory from the lecture

- The 1950s slide ties early NLP to Turing's conversational test and to Chomsky's formal language theory, and uses "Colorless green ideas sleep furiously" to separate grammatical well-formedness from semantic plausibility. [Sources: L1 p.26]
- The 1960s-1970s slide highlights two strands: symbolic work on generative grammar and parsing, and stochastic work on Bayesian methods for OCR and authorship attribution; it also names the Brown corpus as an early online corpus with 1 million words and 500 documents. [Sources: L1 p.27]
- The 1970s-1980s slide associates the stochastic paradigm with hidden Markov models and noisy-channel decoding, and associates natural language understanding with SHRDLU and the blocks world. [Sources: L1 p.28]
- The 1980s-1990s slide marks a return to empiricism, including probabilistic models for speech recognition and empirical evaluation on held-out data with quantitative metrics. [Sources: L1 p.29]
- The 1990s-2000s slide describes the rise of machine learning through more compute, more corpora, and models such as support vector machines and logistic regression. [Sources: L1 p.30]
- The 2000s slide describes deep learning as using raw data rather than hand-engineered features, while also being computationally expensive and tied to GPU scaling. [Sources: L1 p.31]

## Historical trajectory from the Manning reading

- Manning writes that early NLP grew alongside early AI, and notes that machine translation work, including the Georgetown-IBM demonstration in 1954, slightly preceded the coining of the term "artificial intelligence" in 1956. [Sources: Manning 2022, pp. 127-128]
- Manning divides NLP history into four eras: 1950-1969, 1970-1992, 1993-2012, and 2013-present. [Sources: Manning 2022, pp. 127-129]
- For the first era, Manning characterises early machine translation systems as relying mostly on word-level lookup plus simple, not very principled rule-based handling of morphology and word order. [Sources: Manning 2022, p. 128]
- For the second era, Manning emphasises hand-built rule-based understanding systems such as SHRDLU, LUNAR, and SAM, which modelled syntax and reference in more depth. [Sources: Manning 2022, p. 128]
- For the third era, Manning describes a reorientation toward empirical machine learning over digital text, including counting-based models, annotated resources, and supervised learning on tasks such as word sense, named entities, and treebanks. [Sources: Manning 2022, p. 128]
- For the fourth era, Manning argues that deep learning first improved supervised NLP from 2013 onward, and that the decisive shift in 2018 was very large-scale self-supervised learning on massive text collections. [Sources: Manning 2022, pp. 128-129]

## How the reading connects to the later lectures

- Manning describes the transformer as the dominant modern model family for NLP applications and explains its central idea as attention, where a representation at one position is computed as a weighted combination of representations at other positions. [Sources: Manning 2022, p. 130]
- Manning also describes pretrained language models such as BERT and GPT-3 as early examples of what are now called foundation models: large self-supervised models that can be adapted to many downstream tasks. [Sources: Manning 2022, pp. 127, 132]
- This reading therefore provides the long-range narrative that links later lectures on neural language models, transformers, and pretrained models. [Sources: L1 p.31-33; Manning 2022, pp. 129-132]
