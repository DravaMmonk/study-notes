### Basic Concepts of Problem Solving
##### Autonomous Behaviour in AI
- Programming-based
- Learning-Based
- Model-Based
- Approaches not orthogonal
- Different models yield different types of **controllers** 执行动作的策略模块
##### Solver Ambitions
- 3-level Ambition 
- **Ambition 1.0** Write one program to solve all problems
- **Ambition 2.0** Write one program to solve a large class of problems
- **Ambition 3.0** Write one program to solve a large class of problems effectively

### Solving Approaches
##### Programming-Based Approach
- **Pro**: Domain-knowledge easy to express
- **Con**: Less Flexible (Can’t deal with situations not anticipated by programmer)
##### Learning-Based Approach
- Unsupervised/Reinforced Learning: Use reward & penalise
- Supervised: Use labelled data
- Evolutionary: Use original controllers to mutate and recombine to build better controller
- **Pros** Dose not require much knowledge in principle 
- **Cons** Slower; Hard to know which features to learn 
##### Model-Based Approach (Planning)
- One model for one specific problem
![Planning Process](Unimelb/25S2/AIP/assets/3_planning_process.png)
- **Pros** Powerful; Quick; Flexible; Clear; Intelligent; Domain-independent
- **Cons** Need a model (sometimes very hard); Efficiency loss
- Always need trade-off between “Automatic and general” vs. “Manual work but effective”

### Planning Models
#### 1. Classical Planning Model = Basic State Model
- **Ambition** Write one program to solve all classical search problems
###### Assumptions
- Environment is deterministic
- Environment is fully observable
- Environment is static
- Action is instantaneous (uniform cost)
###### Components $<S, A, T, I, G>$
- State spaces $S$
- Initial state **I** & Goal states $G$
- Actions $A(s)$ applicable for every $s$
- Deterministic Transition Function: $s’ = T(A(s), s)$ shows one successor $s’$ of $s$
- Uniform action costs $c(A(s), s)$
###### Solutions
- A seq of actions map s0 into goal states
- **Optimal** if total cost to goal is minimum

#### 2. Conformant Planning Model
* $\approx$ Brute Force
**Components (Diff with classic)**
- Initial State $\to$ A set of possible initial states
- Deterministic TF $\to$ **Non**-deterministic TF
**Solutions**
- Must map any possible s0 into goal states
- **No Observation** No new info; Must pre-planning
- **Goal Guarantee** Worst/Special case sensitive
- **Unnecessary Work** Rarely optimal

#### 3. Markov Decision Processes (MDPs)
###### Assumption
* The next state only depends on the current state and actions.
$$
P(s_{t+1}|s_t,a_t,s_{t-1},a_{t-1},\dots) = P(s_{t+1}|s_t,a_t) 
$$
###### Components *(Diff with conformant)*
- Non-DTF $\to$ **Transition Probabilities**
- Actions are pre-decided but **result** of action is random
###### Solutions
- Functions/Polices mapping states to **actions**
- **Optimal** if total **expected** cost to goal is minimum

#### 4. Partially Observable MDPs (POMDPs)
###### Assumption
- Markov Property
- **Limited Observation** initial and goal state is **belief**
	- **智能体不能直接观测真实状态**，只能通过**传感器读数 / 观测值**间接获取信息 (observations)
	- 决策时必须基于**不确定的状态估计**来选择动作 (belief states)
###### Components *(Diff with MDPs)*
- Introduce **Sensor Model** (based on **Probability Distribution**)
$$
\mathrm{b}(s_t) = P(s_t \,| \,\text{historical actions and observations})
$$
- Initial/Goal States $\to$ Belief States $\mathrm{b}(s0)$ $\mathrm{b}(goal)$
###### Solutions
- Map belief states into actions
- **Optimal** if total expected cost **from b0** to goal is minimum