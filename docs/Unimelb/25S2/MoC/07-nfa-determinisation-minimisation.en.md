# COMP30026 Lecture 13 - NFA Determinisation and DFA Minimisation

Sources: `lecture/13.pdf`; Apple Notes: CS/25S2/MoC — "LEC13 NFA Determinisation and Minimisation".

This lecture asks: **nondeterminism looks like extra power — is it? How do we turn an NFA into an equivalent DFA, and a DFA into the one with the fewest states?**

Learning path: [Subset construction: from NFA to DFA](#topic-1) → [Proving closure with NFAs](#topic-2) → [Minimal DFAs and Brzozowski's algorithm](#topic-3).

Key points: the subset construction and $\varepsilon$ -closure; the NFA constructions for union, concatenation and star. Hard parts: the two rounds of "reverse, then determinise" in Brzozowski's algorithm. Common mistakes: forgetting to take the $\varepsilon$ -closure while determinising; forgetting the dead state for the empty set.

<a id="topic-1"></a>
## 1. Subset construction: from NFA to DFA

### Equivalence and the theorem

![Slide 4 - Equivalence and the NFA-to-DFA theorem](assets/07-nfa-determinisation-minimisation/slide-04.png)

Start with the definition box: two machines are **equivalent** iff they recognise the same language, i.e. they agree on accepting or rejecting every string. How different the machines look inside does not matter; only "which strings are accepted" counts.

The theorem below says: **every NFA has an equivalent DFA**. The last line gives the method: **simulate** the NFA with a DFA. While reading input, an NFA may "be in" several states at once (see [the NFA part of note 6](06-finite-automata.en.md#topic-4)); a DFA keeps up step by step if each of its states is "the set of all states the NFA **might** be in right now". This is the **subset construction**.

<!-- Sources: L13 p.4; Apple Notes LEC13 -->

### Example: the subset construction step by step

![Slide 7 - Subset construction table](assets/07-nfa-determinisation-minimisation/slide-07.png)

Top right is the NFA to convert: the start is 1 and the only accept state is 2 (double circle); 1 reads a to 2, 1 moves to 3 for free via $\varepsilon$ , 3 reads a back to 1, 2 stays at 2 on a or b, and 2 reads b to 3. The table at the bottom right is the DFA transition table being filled in: rows are DFA states (sets of NFA states), columns are input characters.

<!-- Sources: L13 p.5 -->

Read the table from top to bottom:

1. the start 1 can reach 3 via $\varepsilon$ without reading anything, so the DFA's start state is $A=\{1,3\}$ ;
2. from $\{1,3\}$ on a: 1 goes to 2 and 3 goes to 1, and the $\varepsilon$ -closure adds 3, which 1 reaches for free, giving $B=\{1,2,3\}$ ; on b: neither 1 nor 3 has a b-transition, written "–" in the table, i.e. the empty set;
3. from $\{1,2,3\}$ , a returns to $\{1,2,3\}$ and b gives $C=\{2,3\}$ ;
4. from $\{2,3\}$ , a gives $\{1,2,3\}$ and b gives $\{2,3\}$ ;
5. the red word at the bottom left stresses "**contains**": any set that contains the NFA's accept state 2 is a DFA accept state (marked $*$ ). So $B$ and $C$ accept and $A$ does not.

<!-- Sources: L13 p.6-7 -->

![Slide 8 - Resulting DFA with dead state](assets/07-nfa-determinisation-minimisation/slide-08.png)

This is the result drawn out. Compared with the previous table there is an extra row $D=\emptyset$ : the "–" entry now points to $D$ . $D$ is a **dead state**: once entered, the machine stays there whatever it reads (see the a, b self-loop on $D$ ) and never accepts. With it, the transition function is defined for every state and character, as a DFA requires.

<!-- Sources: L13 p.8 -->

### Formally

![Slide 10 - Subset construction formally](assets/07-nfa-determinisation-minimisation/slide-10.png)

The top half first defines the $\varepsilon$ **closure** $E(R)$ : all states reachable from some state of $R$ by following 0 or more $\varepsilon$ -transitions. "0 or more" means $R\subseteq E(R)$ : the original states are always included.

The bottom half gives the four parts of the DFA $M$ :

$$
Q'=\mathcal{P}(Q),\quad q_0'=E(\{q_0\}),\quad F'=\{R\in Q'\mid R\text{ contains an accept state of }N\},\quad \delta'(R,a)=\bigcup_{r\in R}E(\delta(r,a)).
$$

Item by item: DFA states are subsets of the NFA's states ( $\mathcal{P}(Q)$ is the power set); the start is the $\varepsilon$ -closure of the start state; the accept states are the subsets that contain an NFA accept state; a transition means "each state in the set takes one a-step, each result is $\varepsilon$ -closed, and the union is taken". The theorem box at the bottom says the resulting $M$ is equivalent to $N$ .

<!-- Sources: L13 p.10; Apple Notes LEC13 -->

**Common mistake**: the start must be $E(\{q_0\})$ , not $\{q_0\}$ . The NFA can move along $\varepsilon$ before reading the first character; if an accept state is reachable from $q_0$ only via $\varepsilon$ , the empty string should be accepted, but starting from $\{q_0\}$ would wrongly reject it.

**Hard part**: the DFA has at most $2^{|Q|}$ states (all subsets of $Q$ ), but only subsets **reachable** from the start state need to be built: of the $2^3=8$ subsets in the example, only 4 are used.

<a id="topic-2"></a>
## 2. Proving closure with NFAs

Since NFAs can be turned into DFAs, proving a language regular only requires building an NFA. The next three slides each glue known machines together with $\varepsilon$ -transitions; they give constructive proofs of the closure results listed in [note 6](06-finite-automata.en.md#topic-3).

### Union

![Slide 11 - Closure under union](assets/07-nfa-determinisation-minimisation/slide-11.png)

Let $M_A,M_B$ recognise $A,B$ . The figure adds a new start state (the circle on the left) with two $\varepsilon$ -transitions to the start states of $M_A$ and $M_B$ . The NFA first "guesses" which language the input belongs to and lets that machine check it, so it recognises $A\cup B$ . The whole construction has just one more state than $M_A$ and $M_B$ together.

<!-- Sources: L13 p.11 -->

### Concatenation

![Slide 12 - Closure under concatenation](assets/07-nfa-determinisation-minimisation/slide-12.png)

The two boxes at the top are the DFAs for $A$ and $B$ ; below is the combined NFA. Look at the two $\varepsilon$ arrows in the lower figure: they go from every accept state of $M_A$ to the start state of $M_B$ ; at the same time $M_A$ 's accept states become ordinary single circles and only $M_B$ 's accept states remain. After reading a first part that belongs to $A$ , the NFA can "guess" that this is the split point and jump into $M_B$ to check the rest.

<!-- Sources: L13 p.12 -->

![Slide 14 - Concatenation construction formally](assets/07-nfa-determinisation-minimisation/slide-14.png)

This slide writes the figure as a formula. $Q$ and $Q'$ must be disjoint so that the two machines' states do not clash when they are put together. The new NFA is $N=(Q\cup Q',\Sigma,\delta'',\{q_0\},F')$ : the start is $M_A$ 's start, and the only accept states are $M_B$ 's $F'$ . The transition function has three cases:

$$
\delta''(q,v)=\begin{cases}\{\delta'(q,v)\} & q\in Q',\ v\in\Sigma\\ \{\delta(q,v)\} & q\in Q,\ v\in\Sigma\\ \{q_0'\} & q\in F,\ v=\varepsilon\end{cases}
$$

The first two lines say "move as usual inside each machine" (an NFA's transitions return sets, so the DFA results are wrapped in braces); the third line is the $\varepsilon$ arrows in the figure. **Note**: every case not listed (for example a non-accept state reading $\varepsilon$ ) gives the empty set.

<!-- Sources: L13 p.14 -->

### Kleene star

![Slide 15 - Closure under Kleene star](assets/07-nfa-determinisation-minimisation/slide-15.png)

The dashed box in the lower figure is the original DFA. Outside it a new start state is added that is itself accepting (double circle), with an $\varepsilon$ -transition to the old start state; inside, each old accept state has an $\varepsilon$ curving back to the old start state. The new start accepts the empty string ( $L^0=\{\varepsilon\}$ ); the backward $\varepsilon$ -arrows let the machine "finish one piece that belongs to $A$ and start reading the next".

<!-- Sources: L13 p.15 -->

<details markdown="1">
<summary>Extension (optional): why a new start state</summary>

Simply making the old start state accepting may accept too much: if the original DFA has arrows back into its start state, strings that "return to the start halfway" would be accepted even though they need not belong to $A^*$ . A fresh start state whose only job is to accept $\varepsilon$ avoids the problem.

</details>

### More closure properties

![Slide 16 - More closure results](assets/07-nfa-determinisation-minimisation/slide-16.png)

The theorem box lists: if $A,B$ are regular languages over the same alphabet $\Sigma$ , then the intersection $A\cap B$ , the complement $A^c=\Sigma^*\setminus A$ , the difference $A\setminus B$ and the **reversal** of $A$ (every string written backwards) are also regular. The difference needs no separate proof, since $A\setminus B=A\cap B^c$ follows from the first two. The corollary below says the regular languages are closed under **Boolean combination**: any combination of union, intersection and complement is still regular.

The next slide (PDF page 17) has a single message: these algorithms come up in the tutorials, plus a bonus question — how to define a DFA for $A\cap B$ formally. The usual answer is in the extension below. The reversal construction is used by the minimisation algorithm in section 3.

<!-- Sources: L13 p.16-17; Apple Notes LEC13 -->

<details markdown="1">
<summary>Extension (optional): the usual constructions for complement and intersection</summary>

- **Complement**: take a complete DFA (a transition for every state and character, adding a dead state if needed) and swap accept and non-accept states. This does not work for an NFA, because an NFA rejects only when all paths fail.
- **Intersection (product construction)**: the new DFA's states are pairs $(p,q)$ , $p$ from the DFA for $A$ and $q$ from the DFA for $B$ ; both machines step together: $\delta((p,q),a)=(\delta_A(p,a),\delta_B(q,a))$ ; accept when both $p$ and $q$ are accepting.

</details>

<a id="topic-3"></a>
## 3. Minimal DFAs and Brzozowski's algorithm

### Minimal DFAs and testing equivalence

![Slide 18 - Equivalence of DFAs](assets/07-nfa-determinisation-minimisation/slide-18.png)

First paragraph: for every regular language there is a **minimal DFA**, the DFA with the fewest states. Second paragraph: a DFA has a unique start state and a total, deterministic transition function, so two DFAs can be tested for equivalence by minimising both.

<!-- Sources: L13 p.18; Apple Notes LEC13 -->

**Extension**: the fact behind this is that the minimal DFA of a regular language is unique **up to renaming states** (a corollary of the Myhill–Nerode theorem). So two DFAs are equivalent iff their minimisations differ only in state names.

Equivalent DFAs can differ in size, and algorithms (such as the subset construction) often give non-minimal results. The next slide (PDF page 20) puts the NFA from section 1 next to its 4-state DFA: looking back at Slide 8 in [section 1](#topic-1), $B^*$ and $C^*$ are both accepting, both go to $B^*$ on a and to $C^*$ on b — they behave identically and can be merged.

<!-- Sources: L13 p.20 -->

### Brzozowski's algorithm

![Slide 22 - Generating a minimal DFA](assets/07-nfa-determinisation-minimisation/slide-22.png)

The top half is **Brzozowski's algorithm**: given an NFA (or a DFA), the four steps "reverse → determinise → reverse again → determinise again" produce an equivalent minimal DFA. "Determinise" here is exactly the subset construction from section 1.

<!-- Sources: L13 p.22; Apple Notes LEC13 -->

The bottom half explains how to **reverse** an NFA with initial state $q_0$ and accept states $F\ne\emptyset$ :

1. if $F=\{q\}$ has one state, use it;
2. otherwise add a new state $q$ as the only accept state, with an $\varepsilon$ -transition to $q$ from each state in $F$ ;
3. reverse every transition, making $q$ the initial state and $q_0$ the (only) accept state.

The first two steps make sure the reversed machine has a single start. The reversed machine recognises every string of the original language written backwards — this is also the construction behind "closure under reversal" in the previous section.

<!-- Sources: L13 p.22; Apple Notes LEC13 -->

<details markdown="1">
<summary>Extension (optional): why two rounds of "reverse, then determinise" give a minimal DFA</summary>

The key fact: if every state of an NFA is reachable from its start, then reversing it and determinising yields a minimal DFA. The DFA produced by the first two steps contains only reachable subsets (the subset construction builds only reachable states), so it meets this condition; the last two steps apply the fact to it. The algorithm is simple to state, but the subset constructions in the middle can produce exponentially many states in the worst case.

</details>

### Example: minimising the NFA from section 1

![Slide 23 - Reverse and determinise](assets/07-nfa-determinisation-minimisation/slide-23.png)

At the top, the left figure is the NFA from section 1 and the right figure is its reversal. The original NFA has a single accept state 2, so no new state is needed: after reversal 2 is the start, the old start 1 becomes the accept state, and every arrow turns around (for example $1\xrightarrow{\varepsilon}3$ becomes $3\xrightarrow{\varepsilon}1$ ).

The bottom right is the DFA obtained by determinising the reversal, with states renamed 4, 5, 6 standing for $\{2\}$ , $\{1,2\}$ , $\{1,2,3\}$ . Check one step yourself: from $\{1,2\}$ on a, 2 goes to 2 and 1 goes to 3, and the $\varepsilon$ -closure adds 1, giving $\{1,2,3\}$ , i.e. $5\xrightarrow{a}6$ . The sets containing the old start 1 are accepting, so 5 and 6 accept.

<!-- Sources: L13 p.23 -->

![Slide 24 - Reverse again and determinise again](assets/07-nfa-determinisation-minimisation/slide-24.png)

The top half is step 3, "reverse again": there are two accept states, 5 and 6, so a new start 7 is added with $\varepsilon$ to 5 and 6, all arrows are reversed, and the old start 4 becomes accepting. The bottom half is step 4, "determinise again": only 3 states remain — from the start $\{5,6,7\}$ , a leads to the accepting $\{4,5,6\}$ , which loops forever, and b leads to the dead state $\emptyset$ .

<!-- Sources: L13 p.24 -->

Reading off the result: the language is "strings starting with a", i.e. $a(a\cup b)^*$ (see [note 8](08-regular-expressions.en.md) for regular-expression notation). The subset construction gave 4 states; the minimal DFA needs only 3 — exactly the effect of merging $B^*$ and $C^*$ .

## Self-check

1. Delete the edge $1\xrightarrow{\varepsilon}3$ from the NFA in section 1 and redo the subset construction: what is the start state, and how many reachable DFA states are there (including the dead state)?
2. When building the NFA for $A\circ B$ with the concatenation construction, suppose $\varepsilon\in A$ ( $M_A$ 's start state is itself accepting). How is a string that belongs to $B$ accepted?
3. With the union construction, how many more states does the NFA for $A\cup B$ have than $M_A$ and $M_B$ together? How many states would the product construction use for the union instead?
4. Two people draw DFAs for the same language with different numbers of states. If you run Brzozowski's algorithm on each, how are the two outputs related?
