# 2 N-gram Language Model
---
## Probability Foundation

Joint to Conditional:  
$$
P(w_1, w_2, \cdots, w_m) = P(w_1)P(w_2 \mid w_1)P(w_3 \mid w_1,w_2)\cdots P(w_m \mid w_1, \cdots, w_{m-1})
$$

### Markov Assumption

$$
P(w_i \mid w_1, \cdots, w_{i-1}) \approx P(w_i \mid w_{i-n+1}, \cdots, w_{i-1})
$$

> The Markov Assumption simplifies language modelling by assuming that the probability of a word depends only on a limited number of context instead of the entire word history.

When $n=1$, a **uni-gram model**:  
$$
P(w_1, w_2, \cdots, w_m) = \prod_{i=1}^{m}P(w_i)
\tag*{the dog $\overset{w_i}{\textcolor{red}{\text{barks}}}$}
$$

- Output mostly random - not practical

When $n=2$, a **bi-gram model**:  
$$
P(w_1, w_2, \cdots, w_m) = \prod_{i=1}^{m}P(w_i \mid w_{i-1})
\tag*{the \textcolor{blue}{dog} $\overset{w_i}{\textcolor{red}{\text{barks}}}$}
$$
- Only one preceding word

When $n=3$, a **tri-gram model**:  
$$
P(w_1, w_2, \cdots, w_m) = \prod_{i=1}^{m}P(w_i \mid w_{i-2}, w_{i-1}) \tag*{\textcolor{blue}{the dog} $\overset{w_i}{\textcolor{red}{\text{barks}}}$}
$$

...

The **N-gram Model**:  
$$
P(w_1, w_2, \cdots, w_m) = \prod_{i=1}^{m} P(w_i \mid w_{i-n+1}, \cdots, w_{i-1})
$$

### Maximum Likelihood Estimation

How to calculate $P(w_i)$?

For uni-gram models,  
$$
P(w_i)=\frac{C(w_i)}{M}
\tag*{$\frac{C(\text{barks})}{M}$}
$$

where,  
- $M$ - Total number of word tokens in *corpus*

For bi-gram models,  
$$
P(w_i)=\frac{C(w_{i-1}, w_i)}{C(w-{i-1})}
\tag*{$\frac{C(\text{dog barks})}{C(\text{barks)}}$}
$$

...

For n-gram models,  
$$
P(w_i \mid w_{i-n+1}, \cdots, w_{i-1}) = 
\frac{C(w_{i-n+1}, \cdots, w_i)}{C(w_{i-n+1}, \cdots, w_{i-1})}
$$

### Problems of N-gram

- Language has long distance effects
	- large *n*
- Resulting probabilities are often very small
	- log transition
- $P(w_i) = 0$ - one unseen n-grams → $P(\text{all}) = 0$
	- smoothing

### Smoothing

Goal: Effective counts > 0; Total of smoothed probability = 1  

**Laplacian** (Add-one)  
- $\frac{C+1}{C+|V|}$
- `<s>` is not part of vocabulary because we never need to infer its conditional probability (like $P(\text{<s>} \mid \text{something})$)

**Lidstone** (Add-$\alpha$)  
- $\alpha$ - a small number than 1
- $\frac{C+\alpha}{C+\alpha|V|}$

**Good-Turing** (Absolute Discounting)  
- Seen: $C-d$; Unseen: $C+(d \times |V_{\text{seen}}|)/2$

 ![[Screenshot 2026-03-14 at 2.58.00 pm.png]]
 
**Backoff**  
- Use a lower-order n-gram model when the higher-order n-gram is unseen.
- **Katz Backoff** = Backoff + Good-Turing
	- Discount probabilities of seen n-grams and assign the remaining probability mass to unseen n-grams via backoff.
	- ⚠️It relies on unstable Good-Turing estimates and backs off to lower-order models that ignore useful contextual information.

$$
P_{Katz}(w_i|h) =  
\begin{cases}  
\frac{C(h,w_i)-d}{C(h)}, & C(h,w_i) > 0 \\  
\alpha(h) P_{Katz}(w_i|h'), & C(h,w_i) = 0  
\end{cases}
$$
where,  
- $h = w^{i-1}_{i-n+1}$ - history

**Kneser-Ney** (Continuation probability)
- vs. Katz: For Lower-order Model - absolute counting → counting in distinct context
$$
P_{KN}(w_i \mid h) =  
\frac{\max(C(h,w_i)-d,0)}{C(h)}  
+  
\alpha(h) P_{KN}(w_i \mid h')
$$