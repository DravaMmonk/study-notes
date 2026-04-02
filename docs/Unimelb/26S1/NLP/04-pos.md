# 4 Part of Speech Tagging
---
## Part Of Speech (POS)

- Syntactic layer in NLP

### Major Penn Treebank Tagsets

- **Tagsets**: A compact representation of POS info.  

**Open Classes**  
- **NN** noun
- **VB** verb
- **JJ** adjective
- **RB** adverb

**Closed Classes**  
- **DT** determiner
- **CD** cardinal number
- **IN** preposition
- **PRP** pronoun personal
- **WP** Wh-pronoun
- **TO** to
- etc.

## Automatic Tagging

### Unigram Tagger

- Assign **most common** tag to each word type
- "Model" = just a look-up table
- ~90& accuracy✅
- Requires a corpus of tagged words⚠️

### Classifier-Based Tagger

- Usea a standard discriminative classifier
	- Target word
	- Lexical context around the word
	- Already classified tags in sentence
- May suffer from error propagation⚠️ (wrong predictions from previous steps affect the next ones)

### Hidden Markov Model Tagger

- Tagging is a sentence-level task but as humans we **decompose** it into small word-level tasks.
- Solution: 
	- Define a model that decomposes process into individual word level steps 
	- But that takes into account the whole sequence when learning and predicting
- In general, this is the idea of **structured prediction**

**Hidden Markov Model**:  
- Useful for modelling "Hidden Reason → Observed Result"
- **Generative** capability

General:  
- Use **both previous tag & lexical evidence**
	- Consider all possibilities of previous tag
	- Treat previous tag evidence and lexical evidence as independent from each other

Goal:

$$
\hat{t} = \arg \max_{t} P \left(t \mid w \right)
$$

1. Rewrite the formula by NB  
$$
\hat{t} = \arg \max_{t} 
\frac{P \left(w \mid t \right) P(t)}{P(w)}
$$

2. $P(w)$ is a constant, which can be ignored:  
$$
\hat{t} = \arg \max_{t} P \left(w \mid t \right) \cdot P(t)
$$

3. Decompose the problem into 2 parts:
	- P1: Prob. of a word depends only on its tag
	- P2: Prob. of a word depends only on the previous tag

4. Part 1 -  Emission  
$$
P(w \mid t) = \prod^n_{i=1} P(w_i \mid t_i)
$$

5. Part 2 - Transition  
$$
P(t) = \prod^n_{i=1} P(t_i \mid t_i)
$$

6. Combination  
$$
\hat{t} = \arg \max_{t} \prod^n_{i=1} P(w_i \mid t_i)
 \cdot P(t_i \mid t_i)
$$

7. Training  
	- Use MLE
	- Smoothing for unseen w/t t/t combinations


> [!NOTE] Huge Problem in Auto Tagging - Unknown Words
> 
> - Huge problem in morphologically rich languages (e.g. Turkish)
> - Can use things we've seen only once to best guess for things never seen before
> - Can use sub-word representations to capture morphology

### HMM Search Algorithms
### Greedy

For each word, take the tag that maximises its $P(w_i \mid t_i) \cdot P(t_i \mid t_{t-1})$. Do it left-to-right.  
- ❌Not syntactically reasonable
- ❌Error propagation
- We are looking for $\arg \max_t$ in a sequence, not individual

### Brute Force

Consider **all** possible tag combinations, evaluate them, then take the $\max$.  
- ✅Theoretically runnable
- ❌Exponentially increasing the complexity 

### Viterbi (Dynamic Programming)

$$
dp[i][t] = \max_{t'} dp[i-1][t'] \cdot P(t \mid t') \cdot P(w_i \mid t)
$$

- Regression
- Consider all possible path
- But avoid repetitive computation
- Complexity: $O(T^2 \cdot n)$ where $T$ = the size of the tagset

![[Screenshot 2026-03-23 at 3.50.32 pm.png]]

### HMM in Practice

- ✅Scalable from Bi-grams (first order HMM) to Tri-grams (second order HMM) ...
- ⚠️Still need to deal with sparsity (unseen word)