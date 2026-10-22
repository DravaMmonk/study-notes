# COMP30026 Lectures 19–20 - Turing Machines and the Church–Turing Thesis

Sources: `lecture/Lecture 19 Part 2 - Turing machines prelecture.pdf` (second half of Lecture 19, adapted from Sipser's slides), page 1 of `lecture/w10l1part1.pdf`, page 2 of `lecture/w11l1.pdf`, page 9 of `lecture/Lecture 24.pdf`; Apple Notes: CS/25S2/MoC — "LEC19 Turing Machine", "LEC20 Church-Turing Thesis".

This lecture asks: **finite automata and pushdown automata have restricted memory; if a machine has an infinite tape it can read, write and move along in both directions, what can it compute? Is this the final definition of "algorithm"?**

Learning path: [From restricted models to Turing machines](#topic-1) → [Formal definition and three outcomes](#topic-2) → [Drawings and configurations](#topic-3) → [Recognisers and deciders](#topic-4) → [The Church–Turing thesis and Hilbert's tenth problem](#topic-5) → [Lecture 20: simulations and encodings](#topic-6).

Key points: the three outcomes of a TM, the difference between recognisable and decidable. Hard parts: configuration notation and the formal definition of one step. Common mistakes: thinking that "recognising" requires halting on every input.

**Coverage is limited**: the Lecture 20 (Church–Turing Thesis) slides timed out on Canvas and are not available locally; the material in [section 6](#topic-6) on multi-tape TMs, nondeterministic TMs and encodings follows the student's Apple Notes and could not be checked against the slides. All screenshots in this note come from the PDF for the second half of Lecture 19.

<a id="topic-1"></a>
## 1. From restricted models to Turing machines

### Recap: two restricted models

![Slide 3 - Recap: finite automata](assets/11-turing-machines/slide-03.png)

On the left is the schematic of a finite automaton: the input is written on a "tape", the head can only read from left to right, and the **finite control** is the state diagram itself. On the right is the equivalent generative model — regular expressions. The key line is at the bottom: its "memory" is bounded by the size of the finite control.

![Slide 4 - Recap: pushdown automata](assets/11-turing-machines/slide-04.png)

A pushdown automaton hangs a **stack** next to the finite control; c, d, d in the picture are symbols on the stack. It runs like an NFA, except that each step may also push or pop; the matching generative model is the context-free grammar on the right. The note at the bottom: memory is no longer bounded by the size of the control, but it is still restricted — only the top of the stack is accessible.

| Machine model | Generative model | Memory |
| --- | --- | --- |
| Finite automata (DFA/NFA) | Regular expressions | bounded by the size of the finite control |
| Pushdown automata | Context-free grammars | the stack is unbounded but only its top is accessible |

<!-- Sources: L19-TM p.2-4 -->

The models of the previous weeks are all **restricted**; the Turing machine (TM) is the **unrestricted** model of computation. The first half of Lecture 19 wraps up context-free languages (see [note 10](10-cfl-pda.en.md)); the second half introduces Turing machines.

<!-- Sources: L19-TM p.2; W10L1part1 p.1 -->

### What a Turing machine adds

![Slide 5 - TM informal picture](assets/11-turing-machines/slide-05.png)

The picture shows just one tape and one finite control, but the tape is now a "read/write input tape", the jagged right end means it goes on forever, and the input `ababb` is followed only by blanks $\sqcup$ . The five differences:

1. the head **can read and write** (overwrite tape symbols);
2. the head **moves both ways**, left or right;
3. the tape is **infinite** to the right;
4. infinitely many blanks $\sqcup$ follow the input;
5. it can accept or reject **at any time**, not only at the end of the input.

<!-- Sources: L19-TM p.5; Apple Notes LEC19 -->

Points 1 and 2 together turn the tape into "scratch paper" that can be read and rewritten repeatedly; point 5 means the machine may also **never stop**, which becomes the third outcome in [section 2](#topic-2).

### An informal example

![Slide 6 - Informal TM example](assets/11-turing-machines/slide-06.png)

On the left is a TM idea for $B=\{a^kb^kc^k\mid k\ge0\}$ (a language no PDA can recognise):

1. scan right until $\sqcup$ , checking that the input has the form $a^*b^*c^*$ ; reject if not;
2. return the head to the left end;
3. scan right, crossing off one a, one b and one c;
4. if those were the last of each symbol, accept;
5. if one symbol has run out but others remain, reject;
6. if all symbols remain, return to the left end and repeat from step 3.

The tape on the right shows `aaabbbccc` with everything crossed off; the long arrows below the tape trace the head sweeping back and forth: the first pass runs to the blank to check the format, each later pass crosses off one group, and after the last pass the machine outputs accept. The yellow box answers how "crossing off" is done: add slashed symbols $\not a,\not b,\not c$ to the tape alphabet, $\Gamma=\{a,b,c,\not a,\not b,\not c,\sqcup\}$ , and overwrite a symbol with its slashed version — exactly the power that "can write" provides.

<!-- Sources: L19-TM p.6 -->

<a id="topic-2"></a>
## 2. Formal definition and three outcomes

### Definition

![Slide 7 - Formal definition](assets/11-turing-machines/slide-07.png)

A Turing machine consists of:

| Part | Description |
| --- | --- |
| $Q$ | set of states |
| $\Sigma$ | input alphabet |
| $\Gamma$ | tape alphabet, $\Sigma\subseteq\Gamma$ , including the blank $\sqcup$ |
| $q_0$ | initial state |
| $q_{acc}$ , $q_{rej}$ | accept and reject states (sometimes $q_a,q_r$ ) |
| $\delta:Q\times\Gamma\to Q\times\Gamma\times\{L,R\}$ | transition function |

<!-- Sources: L19-TM p.7; Apple Notes LEC19 -->

The lower half of the slide reads the transition function through an example: $\delta(q,a)=(r,b,R)$ means that if the current state is $q$ and the symbol under the head is $a$ , then (1) change state to $r$ ; (2) overwrite $a$ with $b$ ; (3) move the head one cell right. Compared with a DFA's $\delta:Q\times\Sigma\to Q$ , the output gains two items: "what to write" and "which way to move".

<!-- Sources: L19-TM p.7 -->

### Three outcomes

![Slide 8 - Three outcomes and deciders](assets/11-turing-machines/slide-08.png)

On input $w$ , a TM $M$ may **halt** (enter $q_{acc}$ or $q_{rej}$ ) or **run forever**. So each input has three possible outcomes:

1. accept (enter $q_{acc}$ );
2. reject by halting (enter $q_{rej}$ );
3. loop (run forever).

**Definition**: $M$ is a **decider** if it halts on all inputs. The language of $M$ is $L(M)=\{w\mid M\text{ accepts }w\}$ .

<!-- Sources: L19-TM p.8; Apple Notes LEC19 -->

Note that $L(M)$ collects only the strings that are accepted; strings that are rejected by halting and strings that loop are both outside $L(M)$ . The difference between the two only matters in [section 4](#topic-4).

<a id="topic-3"></a>
## 3. Drawings and configurations

### Drawing notation

![Slide 10 - Drawing TMs](assets/11-turing-machines/slide-10.png)

The top half gives the notation: an arrow labelled $a\to b,R$ means $\delta(q,a)=(r,b,R)$ ; when the symbol is not changed, it is abbreviated $a\to R$ . The machine $M_1$ in the bottom half recognises "strings containing the substring 11": its structure is almost that of the DFA for the same language (which the previous PDF page draws), except that every transition moves right; on reading a blank $\sqcup$ , it goes to $q_{acc}$ if in $q_2$ (11 already seen) and to $q_{rej}$ otherwise. So any DFA can be rewritten this way as a TM that "only moves right and never overwrites".

<!-- Sources: L19-TM p.9-10 -->

### Configurations

![Slide 11 - Configurations](assets/11-turing-machines/slide-11.png)

A **configuration** is a "snapshot" of the execution at one moment: the current state, the current tape contents and the current head position. In the picture the control is in $q$ and the head points at the a in the third cell; the notation $xqy$ writes the state immediately to the **left** of the symbol under the head: the state is $q$ , the tape holds $xy$ , and the head is on the first symbol of $y$ . So this picture is written $ab\,q\,abb$ .

<!-- Sources: L19-TM p.11; Apple Notes LEC19 -->

### One step of computation and acceptance

![Slide 12 - Computation formally](assets/11-turing-machines/slide-12.png)

If applying $\delta$ once to configuration $C$ yields $C'$ , write $C\Rightarrow C'$ . With tape symbols $u,b,c$ and string $v$ :

$$
\begin{aligned}
u\,q\,bv &\Rightarrow uc\,t\,v && \text{if }\delta(q,b)=(t,c,R)\\
u\,q\,bv &\Rightarrow t\,ucv && \text{if }\delta(q,b)=(t,c,L)\\
q\,buv &\Rightarrow t\,cuv && \text{if }\delta(q,b)=(t,c,L)\text{ (the head is already at the left end and cannot move left)}
\end{aligned}
$$

<!-- Sources: L19-TM p.12; Apple Notes LEC19 -->

How to read them: all three lines first rewrite $b$ as $c$ and then move. On a right move the state marker jumps to the right of $c$ ; on a left move it jumps to the left of the neighbour $u$ ; the third line is the boundary case — already in the leftmost cell, a left move leaves the head where it is.

The start configuration of $M$ on input $w$ is $q_0w$ . **Definition**: $M$ accepts $w$ iff there is a sequence of configurations $C_1,\dots,C_k$ with $C_1=q_0w$ , $C_i\Rightarrow C_{i+1}$ for each $i$ , and the state of $C_k$ equal to $q_{acc}$ .

<!-- Sources: L19-TM p.12 -->

**Worked example (my own)**: run $M_1$ from the previous slide on input `011`. Every step moves right, so the state marker moves one cell right each time:

$$
q_0011\Rightarrow0q_011\Rightarrow01q_11\Rightarrow011q_2\sqcup\Rightarrow011\sqcup q_{acc}.
$$

The first 1 takes it to $q_1$ , the second 1 to $q_2$ , and on reading the blank it is in $q_2$ , so it accepts. The state of the last configuration is $q_{acc}$ , which meets the definition of acceptance.

<a id="topic-4"></a>
## 4. Recognisers and deciders

![Slide 13 - Recognizers and deciders](assets/11-turing-machines/slide-13.png)

The two groups of definitions on the left sit side by side: "recognise" above, "decide" below, and the only difference is the extra condition below that "$M$ is a decider".

| Concept | Definition |
| --- | --- |
| $M$ recognises $A$ | $A=L(M)$ |
| Turing-recognisable (also semi-decidable) | $A=L(M)$ for some TM $M$ |
| $M$ decides $A$ | $A=L(M)$ and $M$ is a decider |
| Turing-decidable | $A=L(M)$ for some decider $M$ |

<!-- Sources: L19-TM p.13; Apple Notes LEC19 -->

The nested circles on the right: regular ⊂ context-free ⊂ Turing-decidable ⊂ Turing-recognisable. Each layer strictly contains the one inside it; the gap between the outer two (there are languages that are recognisable but not decidable) is proved in [note 12](12-decidability-universality.en.md).

<!-- Sources: L19-TM p.13 -->

**Common mistake**: a recogniser need **not** halt on every input. On inputs outside $A$ it may reject or run forever; only on inputs in $A$ must it eventually accept. For example, a TM that accepts every string in $A$ and runs forever on every other string recognises $A$ , but it is not a decider and therefore does not decide $A$ . The student's notes say "a TM that accepts all valid inputs is a recogniser"; more precisely, every TM recognises its own language $L(M)$ , and "recognisable" is a property of a language.

<a id="topic-5"></a>
## 5. The Church–Turing thesis and Hilbert's tenth problem

### The thesis

![Slide 14 - Church–Turing thesis](assets/11-turing-machines/slide-14.png)

The equation in the middle is the heart of the page: "Algorithm" on the left is labelled Intuitive, "Turing machine" on the right is labelled Formal. The **Church–Turing thesis (c. 1936)** says: the intuitive "algorithm" = the formal "Turing machine". Every "reasonable" model of unrestricted computation is equivalent to Turing machines: λ-calculus, rewriting systems, random-access machines, your favourite programming language… It had a big impact on mathematics. The photographs on either side are Alonzo Church and Alan Turing.

<!-- Sources: L19-TM p.14; W11L1 p.2 -->

The L24 review gives a stronger "computational lens" version: every physically realisable process can be carried out by a Turing machine; the lecture's example was markets converging to an equilibrium in economics.

<!-- Sources: L24 p.9 -->

The student's notes add (from Lecture 20):

- it is an **empirical hypothesis**: "algorithm" and "reasonable" on the left of the equation are informal notions, and mathematical proof can only relate formal objects, so the thesis cannot be rigorously proved; but there is a mountain of supporting evidence — every reasonable model proposed so far has been shown equivalent to TMs;
- hence "algorithmically computable" = "Turing computable";
- no reasonable model is more powerful than the standard Turing machine.

<!-- Sources: Apple Notes LEC20 -->

### Hilbert's tenth problem

![Slide 15 - Hilbert's 10th problem](assets/11-turing-machines/slide-15.png)

In 1900 Hilbert posed 23 problems; the tenth asks for an algorithm that decides whether a Diophantine equation (a polynomial equation with integer coefficients, requiring integer solutions) has a solution. The slide's example $3x^2-2xy-y^2z=7$ has the integer solution $x=1,y=2,z=-2$ (substituting: $3-4+8=7$ ). Let

$$
D=\{p\mid p(x_1,\dots,x_k)=0\text{ has an integer solution}\}.
$$

In 1970 Matiyasevich proved that $D$ is **not decidable** — a result that could only be proved once "algorithm" had a precise definition: to say "no algorithm exists", you must first know what an algorithm is.

<!-- Sources: L19-TM p.15 -->

The bottom of the slide leaves an exercise: show that $D$ is Turing-recognisable. The idea is **enumerate and check**: enumerate all integer tuples in some order (e.g. by increasing sum of the absolute values of the variables) and substitute each one; accept as soon as one gives $p=0$ . If a solution exists it is reached in finitely many steps; if none exists the machine runs forever — which recognising allows, and which is exactly why it cannot be a decider. This "stop if found, keep searching otherwise" shape is the typical form of a problem that is recognisable but not necessarily decidable.

<a id="topic-6"></a>
## 6. Lecture 20: simulations and encodings (per the student's notes)

There are no local slides for this section; everything here comes from the Apple Note "LEC20 Church-Turing Thesis" and is kept as limited coverage of Lecture 20.

### Multi-tape Turing machines

**Multi-tape TM**: a fixed number $k$ of tapes and $k$ heads (one tape is the input tape). One configuration = 1 current state + $k$ tape contents + $k$ head positions; in a single step it writes to every tape and moves every head simultaneously.

Simulating a multi-tape TM $M$ with a single-tape TM $S$ :

- concatenate the contents of $M$ 's tapes on $S$ 's tape, separated by a special symbol not in the original tape alphabet;
- to track $M$ 's head positions, $S$ "marks" the symbols under them;
- to simulate one step of $M$ , $S$ scans the tape to read all marked symbols, then scans again to update them according to $\delta$ .

<!-- Sources: Apple Notes LEC20 -->

### Nondeterministic Turing machines

**Nondeterministic TM (NTM)**: the transition function can lead one configuration to several configurations at once; it accepts if some configuration eventually enters $q_{acc}$ .

Simulating an NTM $N$ with a deterministic TM $S$ :

- write encodings of all current configurations of $N$ on $S$ 's tape, separated by a special symbol;
- to simulate a step, $S$ scans the list left to right, applies the transition function to each configuration that is neither accepting nor rejecting, and appends the new configurations at the end;
- accept as soon as a configuration with state $q_{acc}$ appears.

<!-- Sources: Apple Notes LEC20 -->

**Interpretation**: expanding all configurations level by level amounts to a breadth-first search of the computation tree, so even if some branches run forever, an accepting branch of finite depth is never missed.

### Encoding machines as strings

For a Turing machine to "read" another automaton, the automaton must be encoded as a string, written $\langle\cdot\rangle$ . A good encoding should be:

| Requirement | Meaning |
| --- | --- |
| Representable | covers all objects |
| Unambiguous | different machines get different codes: $\langle M_1\rangle\ne\langle M_2\rangle$ |
| Finite | the code is a finite string |
| Computable | the code can be processed by a Turing machine |

<!-- Sources: Apple Notes LEC20 -->

Encodings are the prerequisite for the [universal Turing machine](12-decidability-universality.en.md) of the next note: programs themselves can be inputs.

## Self-check

1. Write the configuration sequence of $M_1$ (contains 11) on input `0101`. Which state does it end in?
2. Give informal steps for a TM that recognises $\{w\#w\mid w\in\{0,1\}^*\}$ . Does it need "crossing off"?
3. A TM runs forever on some inputs. Can it be a recogniser for some language? Can it be a decider?
4. Why does the "enumerate integer tuples" method only show that $D$ is recognisable, and not that $D$ is decidable?
