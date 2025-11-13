# 8 Model Free Reinforced Learning
---
## Monte Carlo (MC) Learning
- Set the state as initial state and run-to-end in the environment for multiple times
- Calculate the **average reward** of them: _value = mean return_
- *Note: can only apply to **episodic** MDPs （有终止状态的Markov Decision Process)*

### MC Policy Evaluation
$$
V_\pi(s) = \mathbb{E}\left[G \mid s \right]
$$

- Compute empirical mean from current time, using as many samples as we can
- **First-Visit MC** Counting reward of only first visit of state s in each episode (from start to goal)
- **Every-Visit MC** Counting reward of every visit of s in each episode
- Approximate V𝜋(s) finally but often slow and high square error

  

**Temporal Difference (TD) Learning - bootstrap + sample**

- **Lively update Value of state** by “reward of current step + evaluation of next step”

- Don’t need to wait for the termination like MC, just approximate step by step

  

**TD(0) - Simplest TD Learning Algorithm**

- V(s) ← V(s) + 𝛼[R + 𝛾V(s′) − V(s)]

- **V** = value function
- **R** = reward
- 𝜸 = discount factor (importance of next step reward)
- **R +** 𝜸**V(s′) − V(s)** = 𝜹 =TD error (if we under/over-evaluate V(s))
- 𝜶 = learning rate (length of each step) for normalisation
- **V(s) ← V(s) +** 𝜶 · 𝜹 = Compromise of old V(s) and Error correction

  

**TD(n) - Look more steps into the future**

- G(t; n) = R(t+1) **+** 𝜸R(t+2) + 𝜸²R(t+3) + ... + 𝜸ⁿ⁻¹R(t+n) + 𝜸ⁿV(S(t+n))
- V(S(t)) ← V(S(t)) + 𝛼(G(t;n) - V(S(t))

- When n → ∞, TD(n) = MC

- How to choose n: 

- Root Mean Square (RMS) Errors 均方差根 ← 𝛼**;** online/offline updates (𝛼 → 0 or 𝛼 → 1)
- RMS Errors → different optimal choices of n
- Small n → More rely on prediction, faster but higher bias
- Large n → More rely on exploitation, more precise but higher variance

**TD(**𝝀**) - Average 1,2,…,n-Step Returns**

- G(t; 𝜆) = (1 - 𝜆) · 𝛴 𝜆ⁿ⁻¹ G(t; n)

- When 𝜆 = 1, TD(𝜆) = MC; 𝜆 = 0, TD(𝜆) = TD(0)

- Using weight (1 - 𝜆) · 𝜆ⁿ⁻¹ to balance short-term and long-term rewards

  

  

**Eligibility Traces - Simplify calculation of G(t;** 𝝀**)**

- Define a **trace** E(t; s) of every state = How many time visited and how far from current state

- E(t; s)  =  𝛾𝜆E(t-1; s) + _1 if S(t) = s else 0_

- If we visit the state, it’s trace goes up suddenly (by 1), if we don’t visit it, it falls down continuously

- V(s) ← V(s) + 𝛼 · 𝛿 · E(t; s)

  

**Forward View & Backward View**

- Original way calculating G(t; 𝜆) is a **Forward View** of 𝜆-Reward, we have to wait episodes terminate so that we can calculate all G(t; n) (offline)
- Eligibility Traces is a **Backward View** of 𝜆-Reward, we update prediction of state step by step(online)

- Backward Propagation - Use Eligibility Traces to propagate TD error 𝛿

- state visited more times  = more responsible on current TD error

- **Forward View = Backward View (in Batch/offline update)**

  

  

**MC vs. TD**

- TD can learn without knowing the final outcome

- TD can learn **online** after every step
- MC must wait until episode ends.  (offline)
- TD can learn from incomplete sequences
- MC can only learn from complete sequences
- TD works in continuing (non-terminating) environment
- MC only works for episodic (terminating) environment 

- Bias vs. Variance Trade-Off

- MC based on rewards after terminate **unbiased**
- True TD target is an **unbiased** estimated of V(s)
- Predicted TD target use V(s’) (next step value) to estimate V𝜋(s) (total value) → **biased**
- MC bias0 variance↑
- TD bias↑ variance↓

- TD exploits Markov property while MC doesn’t

- TD more efficient in Markov environment
- MC more effective in non-Markov environment

- **Partial observability & non-stationarity** → Environment can be non-Markov

- Bootstrapping and Sampling

- TD samples and bootstraps; MC samples but does not bootstrap
- Tree Search (with heuristic search)/DP bootstraps but does not sample

  

  

**Monte Carlo Tree Search (MCTS) - planning with a model**

- Selection → **Expansion** → **Simulation** → Back-propagation 

  

 **Multi-arm Bandits - UCB**