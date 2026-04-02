---

---
# 1 Word Preprocessing
---
## Overview

### Word, sequences and documents
- Text pre-processing
- N-gram Language Models
- Text Classification

### Structure Learning
- Sequence Tagging

### DL for NLP
- Feedforward, Recurrent and Transfer Networks

### LLM
- Prompting
- Post-training
- Multi-language Models
- Retrieval-augmented Generation

---
## Pre-processing

1. Remove unwanted formatting (e.g. HTML )
2. **Sentence segmentation**: break documents into sentences
3. **Word tokenisation**: break sentences into words
4. **Word normalisation**: transform words into canonical forms
5. ***Stopword* removal**: delete unwanted words

---
## Sentence Segmentation

- **Naive**: break on sentence punctuation \[.?!\]
	- abbr❌
- Use **regex** to require capital \[.?!\]+\[A-Z\]
	- name❌
- **Lexicons**
	- Difficult to enuerate all names and abbreviations ⚠️
- **ML Models**⭐️ - Binary Classifier
	- Looks at every "." and check whether it is the end of a sentences
	- Common Model: DT, LR
	
	Features
	- Look at words before and after "."
	- Word shapes:
		- Uppercase, lowercase, ALL_CAPS, number
		- Character length
	- Part-of-speech tags
		- Determiners tend to start a sentence

---
## Word Tokenisation

Goal: Give the atom a unique ID & Prepare for Word Embeddings. 

- **Naive**: separate out alphabetic strings (white space)
	- Abbreviations, Hyphens, Numbers, Dates, Clitics, Internet Language ⚠️
	- New Zealand❌ Chinese Words (no white space)❌
- Existing Vocabulary List + **MaxMatch Algorithm** (find the longest possible substrings)
	- Ambiguous phrase (how to group single word)⚠️
- **Subword Tokenisation (Byte-pair encoding)**
	- Core Idea: Iteratively merge frequent pairs of characters.  
		- Colourless green ideas sleep furiously → \[colour\] \[less\] \[green\] \[idea\] \[s\] \[sleep\] \[furious\] \[ly\]
	- ✅Data-informed tokenisation
	- ✅Works for different languages
	- ✅Deals better with unknown words

### Book-ending Sequences

Special tags(tokens) used to denote start and end of the sequence.  
- `<s>` = start
- `</s>` = end

---
## Word Normalisation

- Lower Casing
- **Removing morphology**
	- **Lemmatisation**
		- Remove **Inflectional Morphology**
			- Grammatical Variants (nouns, verbs, adjectives, ...) → **Lemma**
		- ✅Still linguistically interpretable
		- ❌Need a vocabulary list
	- **Stemming**
		- Remove **Derivational Morphology**
			- Suffixes and Prefixes → *Strip off* all of them **aggressively** → **Stem**
		- ✅popular in **information retrieval**
		- ⚠️more aggressively
		- ⚠️maybe not an actual lexical item (word) anymore
		- *The Porter Stemmer*
			- most popular stemmer for English
- Correcting spelling
- Expanding abbreviations
- Goal
	- Reduce vocabulary
	- Maps words into the same type


> [!note] Lemmatisation vs Stemming
> **Lemmatisation**
> - Dictionary lookup
> 	- studies → study
> 
> **Stemming**
> - Chopping words
> 	- studies → studi
> 	- **Less lexical sparsity** 
> 
> - Often not used in the same time
> 
> ⭐️**more aggressively normalise → less lexical sparsity**

> [!info]- "m measure" in The Porter Stemmer
> 
> Goal: To avoid over-chopping
> - v = vowel
> - c = consonant
> - Merge "vv"/"cc" → "V"/"C"
> - $m$ = number of times of "VC" appears
> - Only chop when $m > 1$
> 

---
## Stopword Removal
- A list of words to be **removed** from the document
	- Typical in **bag-of-word** representations
		- all words are seemed as a vector and re-ordered by **frequency**
		- **No Original Sequence; No Linguistic Meaning**
	- ⚠️Not appropriate when sequence is important
- Common Stop Words
	- All closed-class or function words
		- e.g. the, a, of, for, he, ...
	- Any high frequency words
	- NLTK, spaCy NLP toolkits


