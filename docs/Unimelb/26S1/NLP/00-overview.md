# 00 Course Overview and NLP History

## Source Pack
- Lecture: `L1 Course Overview & Introduction (v1)`, pp. 14-33.
- Reading: Christopher D. Manning, "Human Language Understanding & Reasoning", *Daedalus* 151(2), 2022, pp. 127-137.

## What NLP Studies
- The lecture defines natural language processing as an interdisciplinary area spanning linguistics, computer science, and artificial intelligence, with the goal of designing algorithms that process and analyse human language data. [Source: L1 p.14]
- The course motivation is that large amounts of information are trapped in unstructured text, so automatic systems need to identify structure, salient elements, and relations before they can reason over the data. [Source: L1 p.15]
- Manning argues that language is central to human societal intelligence because it lets groups of humans network brains together, and writing later made knowledge transferable across both time and space. [Source: Manning 2022, pp. 127-128]

## Why Language Is Hard
- The lecture uses "I made her duck" to show that a short sentence can have multiple interpretations because individual words and the sentence structure are ambiguous. [Source: L1 pp. 23-24]
- In the lecture's analysis, `duck` can be either a noun or a verb, `her` can be dative or possessive, and `make` supports multiple syntactic frames, so ambiguity appears at both lexical and syntactic levels. [Source: L1 p.24]

## Course Roadmap up to L11
- The course groups the early material into word-, sequence-, and document-level processing: text preprocessing, n-gram language models, and text classification. [Source: L1 p.20]
- It then moves to structure learning with sequence tagging, followed by deep learning architectures for NLP: feedforward, recurrent, and transformer networks. [Source: L1 p.20]
- The next block introduces pretrained and large language models, including prompting, post-training, multimodal models, and retrieval-augmented generation. [Source: L1 p.21]

## Historical Through-line in the Lecture
- The lecture places the 1950s around Turing's "Computing Machinery and Intelligence" and Chomsky's "Syntactic Structures", highlighting the distinction between syntax and semantics via "Colorless green ideas sleep furiously." [Source: L1 p.26]
- For the 1960s-1970s, the lecture distinguishes a symbolic paradigm centred on generative grammar and parsing algorithms from a stochastic paradigm, and notes the Brown Corpus as the first online corpus of American English. [Source: L1 p.27]
- For the 1970s-1980s, the lecture lists hidden Markov models and noisy-channel decoding under the stochastic paradigm, and points to Winograd's SHRDLU as a landmark for natural language understanding in a blocks world. [Source: L1 p.28]
- For the 1980s-1990s, the lecture emphasises the "return of empiricism": probabilistic IBM models for speech recognition, data-driven methods for tagging/parsing/semantics, and evaluation on held-out data with quantitative metrics. [Source: L1 p.29]
- For the 1990s-2000s, the lecture links the rise of machine learning in NLP to better computational power, larger annotated corpora such as Penn Treebank and PropBank, and adapted ML models such as support vector machines and logistic regression. [Source: L1 p.30]
- For the 2000s onward, the lecture describes deep learning as using raw data with less hand-engineered features, while requiring GPUs and large training corpora to scale. [Source: L1 p.31]

## Historical Through-line in the Reading
- Manning divides NLP history into four broad eras: early machine translation research (1950-1969), hand-built rule-based NLP systems (1970-1992), empirical machine learning over large text collections (roughly 1993-2012), and the current era of very large self-supervised neural models. [Source: Manning 2022, pp. 128-130]
- The reading notes that the Georgetown-IBM machine translation demonstration in 1954 slightly predates the coining of the term "artificial intelligence" in 1956. [Source: Manning 2022, p. 128]
- Manning characterises the empirical era as a reorientation around machine learning over abundant digital text, first with count-based models and later with richer statistical learning. [Source: Manning 2022, pp. 129-130]
- The reading identifies 2018 as the key break point for large-scale self-supervised NLP: systems learn from huge unlabeled corpora by solving prediction tasks such as next-word prediction and masked-word prediction billions of times. [Source: Manning 2022, pp. 130-131]
- The reading also states that since 2018 the transformer has become the dominant neural architecture for NLP applications. [Source: Manning 2022, p. 131]

## Current Direction and Limits
- The lecture explicitly says current conversational agents are still far from being "truly intelligent" under the Turing-style framing. [Source: L1 p.22]
- The lecture ends with unresolved issues rather than claiming NLP is solved: long-context tasks, AI-generated misinformation, smaller parameter-efficient models, hallucination, stereotyping, and bias. [Source: L1 p.32]
- Manning similarly argues that large pretrained models are broadly effective and easy to adapt, but are still likely to remain limited in careful logical or causal reasoning. [Source: Manning 2022, p. 136]
