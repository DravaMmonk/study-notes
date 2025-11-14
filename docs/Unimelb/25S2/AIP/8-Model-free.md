# 08. Model-free Reinforced Learning
---
## Monte Carlo (MC) Learning
- Set the state as initial state and run-to-end in the environment for multiple times
- Calculate the **average reward** of them: _value = mean return_
- *Note: can only apply to **episodic** MDPs （有终止状态的Markov Decision Process)*

## MC Prediction
### Classical Policy Evaluation
- Compute value-function by using **empirical mean** instead of expectation
	$$
	V(s) = \frac{1}{N(s)} \sum_{i=1}^{N(s)} G_t^{(i)}
	$$
		
	- $N(s)$ - how many times $G_t$ is visited
	- when $N(s) \to \infty$, $V(s) \to v_\pi(s)$.

####  First-Visit vs. Every-Visit
- In each episode, when the state will be counted and updated

| Aspect            | First-Visit MC                            | Every-Visit MC                          |
| ----------------- | ----------------------------------------- | --------------------------------------- |
| When?             | Only the *first* time appeard             | *Every* time appeard                    |
| Pros              | Avoids dependence between multiple visits | Faster convergence in practice          |
| Cons              | Some visits ignored                       | Higher variance                         |
| Suitable Scenario | Long episodes with repeated states        | Short episodes or rare-state situations |

### $\alpha$-style prediction
- In practice, we often use learning rate $\alpha$ to replace strict mean:
	$$
	V(s) \gets V(s) + \alpha(G_t - V(s))
	$$
	
	- online learning supported
	- better performance in non-stationary environment

---
## Temporal Difference (TD) Learning
- Key Mechanisms: **bootstrap + sample**
	- Sampling: an "1-step experience" (TD(0))
		- $e = \{S_t \to A_t \to R_{t+1}, S_{t+1}\}$
	- Bootstrapping: use estimation of future values to update the current value

$$
\text{TD-target} = \text{sample} + \gamma \cdot \text{bootstrap}
$$

---
## TD Prediction

### TD(0)
- Look 1-step

	$$
	\begin{align}
	V(S_t) 
	&\gets V(S_t) + \alpha \big({{G_t^{(0)} - V(S_t))}} \\[2pt]
	&= V(s_t) + \alpha(R_{t+1} + \gamma V(s_{t+1})-V(s_t))
	\end{align}
	$$

	- $\delta = R_{t+1} + \gamma V(s_{t+1})-V(s_t)$ - TD Error

### TD(n) 
- Look more steps into the future

$$
G^{(n)}_t = R_{t+1} + \gamma R_{t+2} + \ldots + \gamma^{n-1} R_{t+n} + {{\gamma^n V(S_{t+n})}}
$$

$$
\begin{align*}
\color{red}{n} & \color{red}{= 1}\ \text{(TD(0))}      & G_t^{(1)}      & = R_{t+1} + \gamma V(S_{t+1})\\[2pt]
\color{red}{n} & \color{red}{= 2}                   & G_t^{(2)}      & = R_{t+1} + \gamma R_{t+2} + \gamma^2 V(S_{t+2})\\[2pt]
\color{red}{\vdots} &                   & \vdots         & \\[2pt]
\color{red}{n} & \color{red}{= \infty}\ \text{(MC)} & G_t^{(\infty)} & = R_{t+1} + \gamma R_{t+2} + \cdots + \gamma^{T-1} R_T
\end{align*}
$$

- Update in direction of error
$$
V(S_t) \;\gets\; V(S_t) + \alpha \big({{G_t^{(n)} - V(S_t)}} \big)
$$

- How to choose $n$:
	- Root Mean Square (RMS) Errors 均方差根
		- change $\alpha$ → vary RMS Errors → different optimal $n$
	- Small n → More rely on prediction, faster but higher bias
	- Large n → More rely on exploitation, more precise but higher variance

### TD($\lambda$) 
- Average n-Steps Returns - use weight ${{(1 - \lambda)\lambda^{\,n-1}}}$ to balance short-term and long-term rewards
	$$
	G_t^{\lambda} \;=\; {{(1 - \lambda) \sum_{n=1}^{\infty} \lambda^{\,n-1}}} G_t^{(n)}
	$$

	$$
	V(S_t) \;\leftarrow\; V(S_t) + \alpha \big( G_t^{\lambda} - V(S_t) \big)
	$$

	- ✅Memoryless - i.e space complexity is same as TD(0)
	- ⚠️Forward View - We cannot look into the far future during learning👇

### Backward View 
- backward propagation
	- state visited more times  = more responsible on current TD error
	- Update **online**, every step, from incomplete sequences
1. Update **Eligibility Trace**
	- For each state s, at each time step:
		- reduction by $\gamma \lambda$
		- $+1$ if currently visiting
	$$
	E_t(s) = \gamma \lambda E_{t-1}(s) + \mathbf{1}(S_t = s)
	$$
	
2. Compute TD Error
	$$
	\delta_t = R_{t+1} + \gamma V(S_{t+1}) - V(S_t)
	$$

3. Update Value Function
	$$
	V(s) \gets V(s) + \alpha \, \delta_t \, E_t(s)
	$$

- In Batch/offline update, Forward View = Backward View
$$
\sum_{t=1}^T \alpha \, \delta_t \, E_t(s) = \sum_{t=1}^T \alpha (G_t^\lambda  - V(S_t)) \; \mathbf{1}(S_t = S)
$$


---
## MC vs. TD

| Aspect                                     | Monte-Carlo (MC)                           | Temporal-Difference (TD)                                         |
| ------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| Learning timing                            | Offline - Must wait until the episode ends | Online - Learn after each step                                   |
| Assumption Needed                          | episodic (terminating) environment only    | both episodic and continuing                                     |
| Target used                                | $G_t$                                      | $R_{t+1} + \gamma V(S_{t+1}$)                                    |
| Exploits Markov property?                  | ❌                                          | ✅                                                                |
| Bias                                       | Unbiased (return is true target)           | Biased (bootstraps using V(s′))                                  |
| Variance                                   | High (Every-visit)                         | Low                                                              |
| B-V Trade-off                              | Bias = 0, Variance ↑                       | Bias ↑, Variance ↓                                               |
| Efficiency in Markov env                   | ⚠️Less efficient                           | ✅More efficient                                                  |
| Efficiency in non-Markov or PMDP env       | ✅More efficient with backup learning       | ⚠️Less efficient                                                 |
| Optimisation in limited experience (Batch) | Average Return = minimise MSE              | Fit the most likelihood Markov model that best explains the data |


##### Example - Driving Home

| State              | Elapsed Time (min) | Predicted Time to Go | Predicted Total Time | MC Update (After Back Home) | MC New Predicated Time | TD(0) Update - $\gamma = 1, \alpha = 0.5$ | TD New Predicated Time |     |
| ------------------ | ------------------ | -------------------- | -------------------- | --------------------------- | ---------------------- | ----------------------------------------- | ---------------------- | --- |
| leaving office     | 0                  | 30                   | 30                   | 43                          | 43-0=43                | 30+0.5(5+35-30)=35                        | 35-0=35                |     |
| reach car, raining | 5                  | 35                   | 40                   | 43                          | 43-5=38                | 40+0.5(20+15-40)=37.5                     | 37.5-5=32.5            |     |
| exit highway       | 20                 | 15                   | 35                   | 43                          | 43-20=23               | 35+0.5(30+10-35)=37.5                     | 37.5-20=17.5           |     |
| behind truck       | 30                 | 10                   | 40                   | 43                          | 43-30=13               | 40+0.5(40+3-40)=41.5                      | 41.5-30=11.5           |     |
| home street        | 40                 | 3                    | 43                   | 43                          | 43-40=3                | 43+0.5(43+0-43)=43                        | 43-40=3                |     |
| arrive home        | 43                 | 0                    | 43                   | 43                          | 43-43=0                | 43                                        | 43-43=0                |     |
|                    |                    |                      |                      |                             |                        |                                           |                        |     |
##### Example - BATCH

- 2-states: $A$, $B$
- Reward Signal = $\{0, 1\}$
- Sampled Episodes:
	- $A \to 0$, $B \to 0$, $B \to 1$, $B \to 1$, $B \to 1$, $B \to 1$, $B \to 1$, $B \to 1$, $B \to 0$
- MC Update:
	- $V(B) = 6/8 = 0.75$
	- $V(A) = 0 / 1 = 0$
- TD(0) Update:
	- $V(B) \to0.75$
	- $V(A) \to V(B) \to 0.75$

---
## Model-based vs. Model-free

| Aspect                   | Backup           | Bootstrap?                 | Sampling?      | Pros                                            | Cons                                             |
| ------------------------ | ---------------- | -------------------------- | -------------- | ----------------------------------------------- | ------------------------------------------------ |
| MC                       | Full return      | ❌Only real return          | ✅Whole episode | Unbiased; simple; intuitive                     | High Variance; episodic needed; slow convergence |
| TD(0)                    | Next Step        | ✅Estimate by next state V  | ✅1-Step        | Low variance; online                            | Biased; se                                       |
| Classical DP/Tree Search | Full Expectation | ✅model-based bootstrapping | ❌All branches  | Precise; Fast convergence; High Controllability | Model needed; Low Generalisation                 |


![Comparison](assets/8_1_depth_width.svg)