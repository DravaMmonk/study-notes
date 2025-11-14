# 10 Value Function Approximation
---
## Function Approximation

Approximate value function by tuning parameters $w$ of a function

- *instead of a table ($s$-$a$) of discrete values (tabular)*

$$
\begin{align}
\hat{v}(s, {\color{red}{\mathbf{w}}})\; & {\color{red}{\approx}}\; v_{\pi}(s)\\[0pt]
\;\;\;\hat{q}(s, a, {\color{red}{\mathbf{w}}})\; & {\color{red}{\approx}}\; q_{\pi}(s, a)
\end{align}
$$

### Tabular vs. Function

| Aspect               | Tabular                                | Function Approx.                                              |
| -------------------- | -------------------------------------- | ------------------------------------------------------------- |
| **Interpretability** | ✅Intuitive                             | ❌Hard to interpret                                            |
| **Scalability**      | ❌Difficult for large/continuous spaces | ✅Much less memory required                                    |
| **Generalisability** | ❌Poor                                  | ✅Generalises from seen situations to unseen situations        |
| **Bias**             | ✅Accurate when state space is small    | ⚠️**Biased** \- State values cannot be represented accurately |

---
## Object Function

Goal: $minimise$ *MSE* between approx function and true value function.

$$
J(\mathbf{w}) = \mathbb{E}_\pi \left[ (v_\pi(S) - \hat{v}(S, \mathbf{w}))^2 \right]
$$

where $S \in \mathcal{S}$ - the state is a *Random Variable* which follows the probability distribution, e.g.:

- **Uniform Distribution**
	- All with the same probability
	- $S = \frac{1}{|\mathcal{S}|}$
	- ❌Too simple; not practical
- **Stationary Distribution**
	- Describe the long-term behaviour of a Markov process
		- $d_\pi(s) \approx \frac{N(s)}{\sum_{s \in \mathcal{S}} N(s)}$
	- Which can also be predicted by using $P$ from a model (MDP)
		- $d_\pi = d_\pi P$
	- ✅Stationary; can be learned

---
## Optimise Object Function

By using Gradient Descent:

$$
w_{k+1} = w_k - \alpha \nabla J(w_k)
$$

$\nabla J(w_k)$ can be calculated by:

- **Ture Gradient Descent**
	- need to calculate the expectation (collect all $N$ samples), not practical❌

$$
\begin{align}
\nabla J(w)
& = \nabla \mathbb{E} \left[ (v_\pi(S) - \hat{v}(S, w))^2 \right] \\[0pt]
& \propto \mathbb{E}[(v_\pi(S)-\hat{v}(S,w))\,\nabla\hat{v}(S,w)]
\end{align}
$$

- **Stochastic Gradient Descent**
	- Use only 1 sample $s_t$ 
	- Online update, better generalisation✅

$$
w_{k+1} = w_k - \alpha\,
\bigl(v_\pi(s_t) - \hat{v}(s_t,w_t)\bigr)\,
\nabla \hat{v}(s_t,w_t)
$$

For remaining two terms:

- $\nabla\hat{v}(s_t,w_t)$ ← Feature Vectors (Linear)
- $v_\pi(s_t)$ ← Value Function Approximation

---
## Feature Vectors

Represent the state by a feature of vectors $\mathbf{x}(s)$, so that in **linear case**:

- State-value Gradient:

$$
\nabla\hat{v}(s,w) = \frac{\partial \hat v(s)}{\partial w} = \mathbf{x}(s)
$$

- State-action-value Gradient:

$$
\nabla \hat q(s,a,w) = \mathbf{x}(s,a)
$$

- Intuitive; easy to implement; high interpretability✅
- Difficult to select appropriate feature vectors⚠️

---
## State-value Approximator

### Derive from Monte Carlo

Use $g_t$ (discounted return starting from $s_t$) to approximate:

$$
v_\pi(s_t) = g_t
$$

- converges to a local optimum, even for _non-linear_ approximation

---
### Derive from Temporal Difference

Use $r_{t+1} + \gamma \hat v(s_{t+1}, w_t) - \hat{v}(s_t, w_t)$ (TD Error) to update approximator at each step:

$$
v_\pi(s_t) = r_{t+1} + \gamma \hat v(s_{t+1}, w_t)
$$

- Linear TD(0) converges close to the global optimum

---
### Derive from TD(λ)

- Forward View:

$$
v_\pi(s_t) = g_t^\lambda
$$

- Backward View: 

$$
\begin{align}
\delta_t & = r_{t+1} + \gamma \hat v(s_{t+1}, w_t)-\hat{v}(s_t, w_t) \\[4pt]
E_t & = \gamma \lambda E_{t-1} + \nabla\hat{v}(s_t,w_t) \\[4pt]
w_{k+1} &= w_k - \alpha \, \delta_t \, E_t
\end{align}
$$

---
## Action-state-value Approximator

Generally change $v$ to $q$ :

$$
w_{k+1} = w_k 
- \alpha\,
\bigl(q_\pi(s_t,a_t)-\hat{q}(s_t,a_t,w_t)\bigr)\,
\nabla \hat{q}(s_t,a_t,w_t)
$$

### Derive from Monte Carlo

$$
q_\pi(s_t,a_t) = g_t
$$

### Derive from Sarsa

$$
q_\pi(s_t,a_t) = r_{t+1} + \gamma \hat{q} (s_{t+1}, a_{t+1}, w_t)
$$

### Derive from TD(λ)

- Forward View:

$$
q_\pi(s_t, a_t) = g_t^\lambda
$$

- Backward View: 

$$
\begin{align}
\delta_t & = r_{t+1} + \gamma \hat q(s_{t+1}, a_{t+1}, w_t)-\hat{q}(s_t, a_t, w_t) \\[4pt]
E_t & = \gamma \lambda E_{t-1} + \nabla\hat{q}(s_t,a_t,w_t) \\[4pt]
w_{k+1} &= w_k - \alpha \, \delta_t \, E_t
\end{align}
$$

### Derive from Q-learning

$$
q_\pi(s_t,a_t) = r_{t+1} + \gamma \max_{a \in \mathcal{A}(s_{t+1})}\hat{q} (s_{t+1}, a, w_t)
$$
