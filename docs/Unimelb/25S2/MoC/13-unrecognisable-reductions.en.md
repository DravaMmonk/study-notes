# COMP30026 Lectures 23–24 - Reductions, Closure and Unrecognisable Problems

Sources: `lecture/w12l1.pdf` (Lecture 23, handwritten board slides), `lecture/Lecture 24.pdf` (Lecture 24: wrapping up Turing machines and the course review); Apple Notes: CS/25S2/MoC — "LEC23-24 Identify Unrecognisable Problems", "★3 Languages", "★ Review".

This lecture asks: **once we know $A_{TM}$ is undecidable, how can we prove that "program analysis" problems such as halting, emptiness and equivalence are undecidable too, without redoing diagonalisation each time? Which languages cannot even be recognised?**

Learning path: [Reductions](#topic-1) → [Halting, emptiness and equivalence](#topic-2) → [Closure of decidable and recognisable languages](#topic-3) → [Rice's theorem and intractability](#topic-4) → [Whole-course summary tables](#topic-5).

Key points: the direction of a reduction; three classic reductions. Hard parts: building the auxiliary machine $M_w$ . Common mistakes: writing a reduction backwards; thinking recognisable languages are closed under complement.

`w12l1.pdf` and pages 2–11 of `Lecture 24.pdf` are handwritten board notes, and the screenshots use the completed version of each page; pages 16–17 of `Lecture 24.pdf` are two summary tables from the 2023 review lecture.

<a id="topic-1"></a>
## 1. Reductions

### Definition

The tools for identifying "impossible" problems are diagonalisation (self-reference), **reductions** and **closure properties**. The first is covered in [note 12](12-decidability-universality.en.md#topic-5); this note covers the other two.

<!-- Sources: W12L1 p.1; Apple Notes LEC23-24 -->

**Definition**: problem $A$ **reduces to** problem $B$ , written $A\le B$ , iff given a decider for $B$ we can construct a decider for $A$ .

![W12L1 slide 3 - A reduction as nested programs](assets/13-unrecognisable-reductions/slide-w12l1-03.png)

Left: the decider for $A$ contains a decider for $B$ ; right: the same thing as programs — function `A()` calls function `B()` inside it, and the dots below mean `A()` may do other computation before and after the call. Intuitively, $A\le B$ reads "$A$ is no harder than $B$".

<!-- Sources: W12L1 p.2-3 -->

### Using it in both directions

![W12L1 slide 4 - Algorithms vs hardness](assets/13-unrecognisable-reductions/slide-w12l1-04.png)

The blue line is the "algorithms" direction and the red line the "hardness" direction; both follow at once from the definition:

| Use | Conclusion |
| --- | --- |
| Algorithms | $B$ decidable ⇒ $A$ decidable |
| Hardness | $A$ undecidable ⇒ $B$ undecidable |

<!-- Sources: W12L1 p.4; W11L2 p.11; Apple Notes LEC23-24 -->

**Common mistake**: to prove a new problem $B$ undecidable, you must reduce a **known** undecidable problem $A$ **to** $B$ ( $A\le B$ ), i.e. "assume a decider for $B$ and build a decider for $A$". Reducing $B$ to $A$ only shows that $B$ is no harder than $A$ and proves nothing.

### Examples

The three examples at the bottom of the page: the first two in blue (algorithms), the last in red (hardness):

| Reduction | Use | Idea |
| --- | --- | --- |
| NFA acceptance ≤ DFA acceptance | algorithms | convert the NFA to a DFA by the subset construction, then call the DFA-acceptance decider |
| DFA equivalence ≤ DFA emptiness | algorithms | see below |
| $L_D$ ≤ TM acceptance | hardness | see [note 12](12-decidability-universality.en.md#topic-4) |

<!-- Sources: W12L1 p.4; W11L2 p.11; Apple Notes LEC23-24 -->

**DFA equivalence ≤ DFA emptiness** (per the student's notes). Let

$$
EQ_{DFA}=\{\langle A,B\rangle\mid L(A)=L(B)\},\qquad EMPTY_{DFA}=\{\langle A\rangle\mid L(A)=\emptyset\}.
$$

Let $H$ decide $EMPTY_{DFA}$ . On input $\langle A,B\rangle$ : build a DFA $C$ recognising the symmetric difference $L(A)\,\triangle\,L(B)=(L(A)\setminus L(B))\cup(L(B)\setminus L(A))$ (possible because regular languages are closed under Boolean combinations); since $L(A)=L(B)\iff L(C)=\emptyset$ , run $H$ on $\langle C\rangle$ and accept iff it accepts.

<!-- Sources: Apple Notes LEC23-24; L13 p.16 -->

<a id="topic-2"></a>
## 2. Halting, emptiness and equivalence

### This lecture's three reductions

![W12L1 slide 5 - Today's reductions](assets/13-unrecognisable-reductions/slide-w12l1-05.png)

The board writes the route of this section as a fork: starting from TM acceptance, one branch reduces to the halting problem, the other goes first to emptiness and then to equivalence:

$$
A_{TM}\le HALT_{TM},\qquad A_{TM}\le EMPTY_{TM}\le EQ_{TM}.
$$

<!-- Sources: W12L1 p.5 -->

### Motivation: static code analysis

![W12L1 slide 9 - Static code analysis](assets/13-unrecognisable-reductions/slide-w12l1-09.png)

Static code analysis = analysing programs without executing them. We want to know whether a program has run-time errors, security vulnerabilities or violations of its specification. This matters greatly in critical applications such as defence and medicine; the question in the red box: with the rise of LLM-generated code, can we trust LLMs not to insert backdoors?

<!-- Sources: W12L1 p.6-9; L24 p.4 -->

"Run-time errors" correspond to the halting problem and "violation of specification" to TM equivalence — both are proved undecidable below (Lecture 24 draws this correspondence on the board page in [section 4](#topic-4)).

<!-- Sources: L24 p.5 -->

### The halting problem

![W12L1 slide 10 - A_TM reduces to HALT](assets/13-unrecognisable-reductions/slide-w12l1-10.png)

$$
HALT_{TM}=\{\langle M,w\rangle\mid M\text{ halts on input }w\}.
$$

**Theorem**: if $HALT_{TM}$ were decidable, then "$L$ recognisable ⇒ $L$ decidable" — we could turn recognisers into deciders.

**Proof** ( $A_{TM}\le HALT_{TM}$ ): let $H$ decide $HALT_{TM}$ and build a decider $S$ for $A_{TM}$ : on input $\langle M,w\rangle$ , (1) run $H$ on $\langle M,w\rangle$ ; (2) if $H$ rejects ( $M$ does not halt on $w$ ), reject; (3) otherwise simulate $M$ on $w$ — the simulation is now sure to halt — and copy its result. Since $A_{TM}$ is undecidable, so is $HALT_{TM}$ .

<!-- Sources: W12L1 p.10; Apple Notes LEC23-24 -->

The brace on the left ties the theorem to the proof: asking $H$ "will it halt?" first removes the only weakness of the universal machine $U$ (that it may not halt).

### The emptiness problem

![W12L1 slide 11 - A_TM reduces to EMPTY](assets/13-unrecognisable-reductions/slide-w12l1-11.png)

$$
EMPTY_{TM}=\{\langle M\rangle\mid L(M)=\emptyset\}.
$$

**Proof** ( $A_{TM}\le EMPTY_{TM}$ ): let $H$ decide $EMPTY_{TM}$ and build $S$ : on input $\langle M,w\rangle$ ,

1. construct the TM $M_w$ = "on input $x$ : ignore $x$ , run $M$ on $w$ ; accept if $M$ accepts, reject if $M$ rejects, run forever if $M$ runs forever" (the blue text). Then (the red box)

    $$
    L(M_w)=\begin{cases}\Sigma^* & M\text{ accepts }w\\ \emptyset & \text{otherwise}\end{cases}
    $$

2. run $H$ on $\langle M_w\rangle$ : if $H$ accepts ( $L(M_w)=\emptyset$ , i.e. $M$ does not accept $w$ ), reject; if $H$ rejects, accept.

<!-- Sources: W12L1 p.11; Apple Notes LEC23-24 -->

**Hard part**: $S$ only **constructs** the code of $M_w$ and hands it to $H$ ; it **never runs** $M_w$ itself, so $S$ cannot get stuck. The role of $M_w$ is to translate the question "does $M$ accept $w$ ?" into "is the language of some machine empty?". For example, when $M$ runs forever on $w$ , $M_w$ accepts no $x$ , $L(M_w)=\emptyset$ , $H$ accepts and so $S$ rejects — exactly the right answer, because $M$ does not accept $w$ .

### The equivalence problem

![W12L1 slide 12 - EMPTY reduces to EQ](assets/13-unrecognisable-reductions/slide-w12l1-12.png)

$$
EQ_{TM}=\{\langle M_1,M_2\rangle\mid L(M_1)=L(M_2)\}.
$$

**Proof** ( $EMPTY_{TM}\le EQ_{TM}$ ): let $H$ decide $EQ_{TM}$ . On input $\langle M\rangle$ : construct the TM $E$ = "on input $x$ , reject", so $L(E)=\emptyset$ ; run $H$ on $\langle M,E\rangle$ ; accept if $H$ accepts ( $L(M)=\emptyset$ ), reject if $H$ rejects.

<!-- Sources: W12L1 p.12; Apple Notes LEC23-24 -->

This time the auxiliary machine $E$ is a fixed "reference answer": asking "is $M$ empty?" is the same as asking "is $M$ equivalent to an empty machine?".

<a id="topic-3"></a>
## 3. Closure of decidable and recognisable languages

### Decidable languages

![W12L1 slide 13 - Closure of decidable languages](assets/13-unrecognisable-reductions/slide-w12l1-13.png)

| Operation | Construction |
| --- | --- |
| Complement | swap the decider's accept and reject states |
| Union | run the deciders for $L_1$ and $L_2$ in turn (both halt); accept if either accepts |
| Intersection | run both deciders in turn; accept only if both accept |
| Concatenation, Kleene star | left as questions in the lecture; see the student's idea and correction below |

<!-- Sources: W12L1 p.13; Apple Notes LEC23-24 -->

The blue text on the board gives the constructions; "run in turn" works because deciders always halt, so the first cannot block the second. The "Concatenation? Kleene closure?" at the bottom are questions left to the students.

**Concatenation** (student's notes): let $M,N$ decide $A,B$ . On input $w$ , enumerate every split $w=xy$ and for each run $M$ on $x$ and $N$ on $y$ ; accept if both accept for some split, reject once all splits have failed. **Common mistake**: a string of length $n$ has $n+1$ splits ( $x$ or $y$ may be empty), not $n-1$ .

**Kleene star**: the student's algorithm cuts $w$ into $k$ pieces of **equal** length — this is **wrong**, since the pieces of a string in $L^*$ can have different lengths. Correction: if $w=\varepsilon$ , accept; otherwise enumerate **every** way of cutting $w$ into non-empty consecutive pieces ( $2^{n-1}$ ways for length $n$ ), check each piece with $M$ , and accept if some way has every piece accepted, otherwise reject. There are finitely many ways and $M$ always halts, so this is a decider.

<!-- Sources: Apple Notes LEC23-24 -->

### Recognisable languages

![W12L1 slide 14 - Closure of recognisable languages](assets/13-unrecognisable-reductions/slide-w12l1-14.png)

**Theorem**: if both $L$ and $L^c$ are recognisable, then $L$ is decidable.

Proof: let $M_1$ recognise $L$ and $M_2$ recognise $L^c$ . On input $w$ , run them **in parallel** (alternating one step at a time) — the two columns of small downward arrows on the right are the two machines taking turns. Every $w$ is in $L$ or in $L^c$ , so one of them eventually accepts: accept if $M_1$ accepts, reject if $M_2$ accepts.

<!-- Sources: W12L1 p.14; Apple Notes LEC23-24 -->

The two boxes in the picture show why simply "swapping states" fails: the top box is the three outcomes of a recogniser $R$ , "Accept | Loop | Reject"; the bottom box is $R^c$ , with $R$ 's accept and reject states swapped, giving "Reject | Loop | Accept" — the "Loop" in the middle is untouched.

**Corollary**: $A_{TM}$ is recognisable but undecidable, so $(A_{TM})^c$ is **not recognisable** (written $(ACCEPT_{TM})^c$ on the board). In general, if $L$ is recognisable but undecidable, then $L^c$ is not recognisable.

<!-- Sources: W12L1 p.14; Apple Notes LEC23-24 -->

**Common mistake**: recognisable languages are **not** closed under complement. Swapping a recogniser's accept and reject states does not work: inputs that looped still loop, so those strings in the complement are never accepted.

<a id="topic-4"></a>
## 4. Rice's theorem and intractability

### Rice's theorem

![L24 slide 6 - Static analysis and Rice's theorem](assets/13-unrecognisable-reductions/slide-l24-06.png)

Lecture 24 returns to static code analysis: red arrows link "run-time errors" to the halting problem and "violation of specification" to TM equivalence, both undecidable ([section 2](#topic-2)). The red line at the bottom is the general conclusion.

**Rice's theorem**: every non-trivial property of program **behaviour** is undecidable. "Non-trivial" means neither all programs have it nor none do. So no program can tell "programs with some behaviour" apart from "programs without it".

<!-- Sources: L24 p.6; Apple Notes LEC23-24 -->

**Common mistake**: Rice's theorem only covers **behaviour**, i.e. the language a machine recognises. Properties of the source text (e.g. "is the source longer than 100 lines", "does it have more than 10 states") are not behavioural properties, so Rice's theorem does not apply; they are usually obviously decidable.

### Computable vs efficient

![L24 slide 7 - Computable vs efficient](assets/13-unrecognisable-reductions/slide-l24-07.png)

- Computable = finishes in finite time;
- Efficient = finishes in time polynomial in the input length.

CNF satisfiability, integer factoring and AI planning are all computable, but whether they have efficient algorithms is tied to the P vs NP question (the red text).

<!-- Sources: L24 p.7; Apple Notes LEC23-24 -->

### Dealing with intractability: relax the requirements

![L24 slide 8 - Dealing with intractability](assets/13-unrecognisable-reductions/slide-l24-08.png)

Correctness originally requires (black text): for every input $x\in\Sigma^*$ , $M$ accepts $x$ iff $x\in L$ . The blue text gives three relaxations:

- handle only a class of "structured" inputs;
- parameterised algorithms (the slide writes $2^{f(x)}$ : the exponential part depends only on some parameter of the input, not on the whole input length);
- approximately optimal solutions (e.g. a $\tfrac34$ -approximation for 3-CNF).

<!-- Sources: L24 p.8; Apple Notes LEC23-24 -->

### Computation everywhere

![L24 slide 9 - Computational lens](assets/13-unrecognisable-reductions/slide-l24-09.png)

The "computational lens" pushes the Church–Turing thesis further: every physically realisable process can be carried out by a Turing machine; the example is markets converging to an equilibrium in economics. The thesis itself is explained in [note 11](11-turing-machines.en.md#topic-5).

<a id="topic-5"></a>
## 5. Whole-course summary tables

### Review map

![L24 slide 10 - Review part 1](assets/13-unrecognisable-reductions/slide-l24-10.png)

![L24 slide 11 - Review part 2](assets/13-unrecognisable-reductions/slide-l24-11.png)

Read these two handwritten review pages together: Lecture 24 sums up the course in five threads, with blue notes giving an application or example of each (finite automata for "on-the-fly" computation; PDAs for syntax highlighting and for recognising $\{0^n1^m\mid n>m\}$ , which matches deciding "a majority winner in an election"; Turing machines letting us reason about simpler models). Revisit them through these notes:

| Theme | Notes |
| --- | --- |
| Regular languages: finite automata, regular expressions (extremely efficient "on-the-fly" computation) | [06](06-finite-automata.en.md), [07](07-nfa-determinisation-minimisation.en.md), [08](08-regular-expressions.en.md) |
| Context-free languages: PDAs, CFGs (e.g. syntax highlighting; recognising $\{0^n1^m\mid n>m\}$ ) | [10](10-cfl-pda.en.md) |
| Turing machines: the Church–Turing thesis; undecidable and unrecognisable languages exist; reasoning about simpler models | [11](11-turing-machines.en.md), [12](12-decidability-universality.en.md) |
| Operations on languages: union, intersection, concatenation | [06](06-finite-automata.en.md#topic-3), [section 3 of this note](#topic-3) |
| Proving impossibility: fooling sets for regular languages; reductions and diagonalisation for Turing machines | [09](09-non-regularity.en.md), [12](12-decidability-universality.en.md), this note |

<!-- Sources: L24 p.10-11; Apple Notes ★ Review -->

The logic part ([02](02-propositional-logic.en.md)–[05](05-unification-automated-reasoning.en.md)) is not on this handwritten review map, but it is the first half of the course.

### Closure properties

![L24 slide 16 - Closure properties table](assets/13-unrecognisable-reductions/slide-l24-16.png)

In the table, $\circ$ is concatenation, $*$ is Kleene star, and "R∩" means intersection with a regular language; DCFL is the class of languages recognised by deterministic PDAs (DPDAs).

| Language class | ∪ | ∘ | * | R∩ | ∩ | Complement |
| --- | --- | --- | --- | --- | --- | --- |
| Regular | Y | Y | Y | Y | Y | Y |
| DCFL | N | N | N | Y | N | Y |
| CFL | Y | Y | Y | Y | N | N |
| Decidable | Y | Y | Y | Y | Y | Y |
| Recognisable | Y | Y | Y | Y | Y | N |

<!-- Sources: L24 p.16; Apple Notes ★3 Languages -->

Comparing down a column is the most useful way to read it: e.g. in the "Complement" column only CFL and recognisable are N, which appeared in [note 10](10-cfl-pda.en.md#topic-5) and [section 3 of this note](#topic-3) respectively.

### Decidability of language properties

![L24 slide 17 - Decidability of language properties](assets/13-unrecognisable-reductions/slide-l24-17.png)

D = decidable, U = undecidable. Each column says whether the question is decidable when the language is given (as a machine or grammar) from that class.

| Question | Regular | DCFL | CFL | Decidable | Recognisable |
| --- | --- | --- | --- | --- | --- |
| $w\in L$ | D | D | D | D | U |
| $L=\emptyset$ | D | D | D | U | U |
| $L=\Sigma^*$ | D | D | U | U | U |
| $L_1=L_2$ | D | D | U | U | U |
| $L$ equals a given regular $R$ | D | D | U | U | U |
| $L$ regular | D | D | U | U | U |
| $L_1\subseteq L_2$ | D | U | U | U | U |

<!-- Sources: L24 p.17; Apple Notes ★3 Languages -->

For example, the U in the first row of the "Recognisable" column is exactly the undecidability of $A_{TM}$ ; the U in the second row of the "Decidable" column echoes this note's proof idea for $EMPTY_{TM}$ . The footers of these two tables say they come from the Semester 2, 2023 review lecture; they are old pages folded into this term's Lecture 24.

## Self-check

1. To prove $B$ undecidable, should you construct $A_{TM}\le B$ or $B\le A_{TM}$ ? Give one sentence for each.
2. Following $A_{TM}\le EMPTY_{TM}$ , explain how to prove $\{\langle M\rangle\mid M\text{ accepts }\varepsilon\}$ undecidable: how should the auxiliary machine be built?
3. Why are decidable languages closed under complement but recognisable languages not? Use this to say whether $(HALT_{TM})^c$ is recognisable.
4. Use Rice's theorem: is "is $L(M)$ finite?" decidable? What about "does $M$ have more than 10 states?"
