# COMP30026 Lectures 17–19 - Context-Free Languages and Pushdown Automata

Sources: `lecture/16.pdf` (named 16, but its first page is Lecture 18 Pushdown Automata), `lecture/w10l1part1.pdf` (first half of Lecture 19, wrapping up context-free languages); Apple Notes: CS/25S2/MoC — "LEC17-18 Context-free Language & Pushdown Automaton", "★3 Languages".

This lecture asks: **a "matching" language like $\{a^nb^n\}$ is beyond finite automata; if we give the machine a stack, or generate strings with "rewrite rules", which languages can we describe?**

Learning path: [Machines and languages](#topic-1) → [Context-free grammars](#topic-2) → [Parse trees and ambiguity](#topic-3) → [Pushdown automata](#topic-4) → [Grammar–automaton equivalence](#topic-5).

Key points: the four parts of a CFG, derivations, the PDA transition notation $a,b\to c$ . Hard parts: using nondeterminism to guess the "middle" (palindromes); converting a CFG to a PDA. Common mistakes: misreading ${\$}$ and $\varepsilon$ in PDA transitions.

**Coverage is limited**: the Sipser CFG/PDA slides (PowerPoint) used in Lecture 17 were not downloaded locally, so the definitions of grammars (CFGs) in [section 2](#topic-2) rely mainly on the student's notes and the review pages at the start of Lecture 18. Screenshots in this note come from `16.pdf` (short name L18) and `w10l1part1.pdf`.

<a id="topic-1"></a>
## 1. Machines and languages

![L18 slide 5 - Machines vs languages](assets/10-cfl-pda/slide-l18-05.png)

Lecture 18 opens with a set of nested circles for orientation: the left side lists **machines**, the right side the **language classes** they recognise, matched from the inside out — finite automata ↔ regular languages, pushdown automata ↔ context-free languages, linear-bounded automata ↔ context-sensitive languages, halting Turing machines ↔ decidable languages, Turing machines ↔ Turing-recognisable languages. The two solid blue layers are the scope of these lectures: one step out from the regular languages.

| Generative model | Machine model | Memory | Example |
| --- | --- | --- | --- |
| Regular expressions | Finite automata | finitely many states | $a^*b^*$ |
| Context-free grammars | Pushdown automata (NFA + stack) | unbounded but last-in-first-out only | $a^nb^n$ |
| Context-sensitive languages | Linear-bounded automata | tape length bounded by the input | $a^nb^nc^n$ |
| Decidable languages | Turing machines that always halt | infinite tape | see [note 12](12-decidability-universality.en.md) |
| Turing-recognisable languages | Turing machines | infinite tape | see [note 11](11-turing-machines.en.md) |

<!-- Sources: L18 (16.pdf) p.5; Apple Notes ★3 Languages -->

The example column comes from the student's notes: each row's example lies just beyond the power of the model in the row above. Linear-bounded automata and context-sensitive languages are only named in this course, not developed.

<a id="topic-2"></a>
## 2. Context-free grammars

### Four parts

There are no local slides for this subsection (Lecture 17); it follows the student's notes.

A **context-free grammar (CFG)** consists of:

| Part | Description |
| --- | --- |
| A finite set $\Sigma$ of terminals | the alphabet, the characters of the final string |
| A finite set $V$ of variables (nonterminals) | symbols still to be expanded |
| A finite set $R$ of production rules | of the form $A\to w$ , where $A$ is a variable and $w$ a string of terminals and variables |
| A start variable $S$ | where derivations begin |

<!-- Sources: Apple Notes LEC17-18 -->

Several rules for the same variable can be combined with $\mid$ . For example, arithmetic expressions:

```text
Expr → 0 | 1 | ... | 9 | Expr Op Expr | (Expr)
Op   → + | - | × | /
```

<!-- Sources: Apple Notes LEC17-18 -->

"Context-free" means the left side of every rule is a single variable: whatever surrounds that variable, the same rule may replace it.

### Derivations and the generated language

To generate a string: let the current string be $x=S$ ; while $x$ still contains a variable, pick a rule $A\to w$ and replace **one occurrence** of $A$ in $x$ by $w$ ; when no variables remain, the result is the generated string.

Notation:

- $xAz\Rightarrow xyz$ : applying the rule $A\to y$ to $xAz$ yields $xyz$ in one step;
- $x\Rightarrow^* z$ : $x=z$ , or there are $y_1,\dots,y_k$ with $x\Rightarrow y_1\Rightarrow\cdots\Rightarrow y_k\Rightarrow z$ (the star means "zero or more steps", as in Kleene closure);
- the language of the grammar is $L(G)=\{x\mid S\Rightarrow^* x,\ x\text{ contains only terminals}\}$ .

<!-- Sources: Apple Notes LEC17-18 -->

**Common mistake**: a single derivation step replaces only **one** occurrence of a variable, not every occurrence at once.

### A derivation example

![L18 slide 12 - Derivation example](assets/10-cfl-pda/slide-l18-12.png)

Top right is the grammar $A\to0A0\mid1A1\mid\varepsilon$ ; bottom left is the derivation unfolding step by step, each line replacing the single $A$ with one rule:

$$
A\Rightarrow0A0\Rightarrow00A00\Rightarrow001A100\Rightarrow0010A0100\Rightarrow00100100 ,
$$

The last step uses $A\to\varepsilon$ to make the variable disappear, so $G$ generates $00100100$ . Every rule adds the **same** character at both ends, so this grammar generates exactly the even-length binary palindromes — the same language the palindrome PDA in [section 4](#topic-4) recognises.

<!-- Sources: L18 (16.pdf) p.7-12 -->

<a id="topic-3"></a>
## 3. Parse trees and ambiguity

### Parse trees

A **parse tree** records the structure of a derivation:

- every node is a terminal or a variable; the root is the start variable;
- each non-leaf node with its children corresponds to a production $A\to w$ ;
- every leaf is a terminal; reading the leaves left to right gives the string $w$ .

<!-- Sources: Apple Notes LEC17-18 -->

### Ambiguity

![L18 slide 13 - Ambiguity](assets/10-cfl-pda/slide-l18-13.png)

The grammar $E\to E+E\mid E*E\mid(E)\mid0\mid1\mid\dots\mid9$ allows not only different derivation orders but two **different parse trees** for `3 + 7 * 2`: the left tree has `+` at the root, meaning $3+(7*2)$ ; the right tree has `*` at the root, meaning $(3+7)*2$ . The two trees compute different values — that is the danger of ambiguity.

<!-- Sources: L18 (16.pdf) p.13 -->

| Concept | Definition |
| --- | --- |
| Ambiguous string | string $x$ has **more than one** parse tree in grammar $G$ |
| Ambiguous grammar | some string is ambiguous with respect to it |
| Inherently ambiguous language | **every** CFG generating it is ambiguous |

<!-- Sources: Apple Notes LEC17-18 -->

**Common mistake**: merely different derivation orders (expanding the left $E$ first or the right $E$ first) do not count as ambiguity; the test is whether the parse trees differ.

A common way to remove ambiguity is to fix the levels and associativity of operators in the grammar; the student's notes record:

```text
Expr   → Expr + Term | Expr - Term | Term
Term   → Term * Factor | Term / Factor | Factor
Factor → (Expr) | number
```

<!-- Sources: Apple Notes LEC17-18 -->

Here multiplication and division can only occur at the `Term` level, "closer to the leaves" than addition and subtraction, so `1 + 2 × 3` has just one tree and the multiplication is done first.

<a id="topic-4"></a>
## 4. Pushdown automata

### Adding a stack to an NFA

![L18 slide 15 - PDA = NFA + stack](assets/10-cfl-pda/slide-l18-15.png)

The "state control" on the right and the input tape below it are just an NFA; the extra column of cells on the left is the **stack**, with an arrow pointing at the top symbol y. DFAs and NFAs have limited memory. A **pushdown automaton (PDA)** is **an NFA with an unlimited stack**: it can push symbols onto the top and pop them off, but can only see the top.

<!-- Sources: L18 (16.pdf) p.14-15 -->

![L18 slide 18 - Matching a's with b's](assets/10-cfl-pda/slide-l18-18.png)

This is a middle frame of the $a^nb^n$ animation: both a's of the input `aabb` have been read and pushed onto the stack, and `bb` remains to be read. A DFA cannot recognise $\{a^nb^n\mid n\ge0\}$ because it has no memory; a PDA can: push an a for each a read, pop an a for each b read; if the stack is exactly empty when the input ends, the counts match.

<!-- Sources: L18 (16.pdf) p.16-20 -->

### Example 1: recognising a^n b^n

![L18 slide 21 - PDA example 1](assets/10-cfl-pda/slide-l18-21.png)

Below the diagram is the transition notation: $a,b\to c$ reads "read input $a$ , replace top of stack $b$ by $c$". Going through the diagram from left to right:

1. $q_0\to q_1$ : $\varepsilon,\varepsilon\to{\$}$ — read nothing, pop nothing, push the special symbol ${\$}$ as a **bottom-of-stack marker**;
2. the $q_1$ self-loop $a,\varepsilon\to a$ : push an a for each a read;
3. $q_1\to q_2$ and the $q_2$ self-loop $b,a\to\varepsilon$ : pop an a for each b read;
4. $q_2\to q_3$ : $\varepsilon,{\$}\to\varepsilon$ — seeing the bottom marker means every a has been matched, so move to the accept state.

$q_0$ is also accepting (double circle), to accept the empty string ( $n=0$ ).

<!-- Sources: L18 (16.pdf) p.21, p.26 -->

**Common mistake**: the student's notes record ${\$}$ as "push the input onto the stack" and $\varepsilon$ as "pop". The correct reading: the three positions of $a,b\to c$ are "input read", "stack top popped" and "new top pushed", and $\varepsilon$ in a position means that step does **nothing** there; ${\$}$ is just an ordinary stack symbol, used by convention to mark the bottom so the PDA can detect "the stack is empty".

### How a PDA runs

![L18 slide 23 - How PDAs work](assets/10-cfl-pda/slide-l18-23.png)

The three items at the top are what each step looks at: the current state, the input symbol and the top of the stack. Below is the procedure:

1. Start in the start state;
2. while input remains or the machine is not in a final state:
    1. nondeterministically pick a valid transition $a,b\to c$ from the current state to a new state $q$ ; reject if there is none;
    2. consume input $a$ ;
    3. replace $b$ on top of the stack with $c$ ;
    4. move to state $q$ ;
3. accept.

<!-- Sources: L18 (16.pdf) p.23; Apple Notes LEC17-18 -->

"Reject" here only means this branch cannot continue; as with an NFA, the whole PDA accepts as long as **some** branch reads all the input and stops in an accept state.

### Formal definition

![L18 slide 24 - PDA formal definition](assets/10-cfl-pda/slide-l18-24.png)

A PDA is a 6-tuple $(Q,\Sigma,\Gamma,\delta,q_0,F)$ :

| Part | Description |
| --- | --- |
| $Q$ | finite set of states |
| $\Sigma$ | finite input alphabet |
| $\Gamma$ | finite stack alphabet |
| $\delta:Q\times\Sigma_\varepsilon\times\Gamma_\varepsilon\to\mathcal{P}(Q\times\Gamma_\varepsilon)$ | transition function, where $\Sigma_\varepsilon=\Sigma\cup\{\varepsilon\}$ |
| $q_0\in Q$ | start state |
| $F\subseteq Q$ | accept states |

<!-- Sources: L18 (16.pdf) p.24; Apple Notes LEC17-18 -->

The type of the transition function says three things: the input position may be $\varepsilon$ (read nothing), the stack-top position may be $\varepsilon$ (pop nothing), and the result is a **set** (nondeterminism) of "new state + one stack symbol to push, or $\varepsilon$".

**Note**: under this definition a single transition pushes at most **one** stack symbol. If a design wants to push two at once (e.g. pushing two a's per a read when recognising $a^nb^{2n}$ ), chain an intermediate state: read a and push one a into the intermediate state, then use $\varepsilon,\varepsilon\to a$ to push the second a and return to the original state.

![L18 slide 25 - Example transitions](assets/10-cfl-pda/slide-l18-25.png)

The two examples are "a deterministic step" and "a nondeterministic step that reads no input":

- $\delta(q_5,a,b)=\{(q_7,\varepsilon)\}$ : in $q_5$ , reading a, with b on top of the stack: consume the a, pop the b, go to $q_7$ ;
- $\delta(q_5,\varepsilon,b)=\{(q_6,a),(q_7,b)\}$ : in $q_5$ with b on top: either replace b by a and go to $q_6$ , or leave the stack as is and go to $q_7$ ; in both cases **no** input is consumed.

<!-- Sources: L18 (16.pdf) p.25 -->

![L18 slide 26 - Example 1 formally](assets/10-cfl-pda/slide-l18-26.png)

This page translates the state diagram of Example 1 item by item into the 6-tuple: $Q=\{q_0,q_1,q_2,q_3\}$ , $\Sigma=\{a,b\}$ , $\Gamma=\{a,{\$}\}$ , $F=\{q_0,q_3\}$ , with transitions $\delta(q_0,\varepsilon,\varepsilon)=\{(q_1,{\$})\}$ , $\delta(q_1,a,\varepsilon)=\{(q_1,a)\}$ , $\delta(q_1,b,a)=\{(q_2,\varepsilon)\}$ , $\delta(q_2,b,a)=\{(q_2,\varepsilon)\}$ , $\delta(q_2,\varepsilon,{\$})=\{(q_3,\varepsilon)\}$ ; every other input returns $\emptyset$ . Note that the stack alphabet contains ${\$}$ but not b: b is never pushed.

<!-- Sources: L18 (16.pdf) p.26 -->

![L18 slide 27 - Empty stack notes](assets/10-cfl-pda/slide-l18-27.png)

**About the empty stack**: there is **no** requirement that the stack be empty when the machine stops (whether it accepts or not); an empty stack cannot be popped. This is why Example 1 pushes ${\$}$ first: the machine cannot "ask" whether the stack is empty; it can only check whether the top is ${\$}$ .

<!-- Sources: L18 (16.pdf) p.27 -->

### Example 2: even-length palindromes

![L18 slide 29 - PDA for ww^R](assets/10-cfl-pda/slide-l18-29.png)

$w^R$ denotes $w$ reversed. This PDA recognises $\{ww^R\mid w\in\{0,1\}^*\}$ : in $q_1$ it pushes each 0 or 1 it reads (the first half); the middle transition $\varepsilon,\varepsilon\to\varepsilon$ reads and pushes nothing — it just **nondeterministically guesses** "the first half ends here"; in $q_2$ each character read must match the top of the stack, which is popped (the second half is the first half reversed); finally, seeing ${\$}$ leads to the accept state. Branches that guess the middle wrongly fail, but one correct guess is enough to accept.

<!-- Sources: L18 (16.pdf) p.28-29 -->

**Hard part**: why is nondeterminism indispensable here? While reading the input the machine does not know where the middle is, so it must "guess once" at every position and let the branch that guessed right do the accepting. A deterministic machine has no way to "try every middle at once".

<a id="topic-5"></a>
## 5. Grammar–automaton equivalence

### CFGs and PDAs are equivalent

![L18 slide 30 - CFLs have PDAs as recognisers](assets/10-cfl-pda/slide-l18-30.png)

**Theorem**: a language is context-free iff some (nondeterministic) PDA recognises it (see Sipser for the proof). The handwritten page in the first half of Lecture 19 writes this as "CFG = PDA".

<!-- Sources: L18 (16.pdf) p.30; W10L1part1 p.2; Apple Notes LEC17-18 -->

![W10L1part1 slide 3 - CFG to PDA](assets/10-cfl-pda/slide-w10l1part1-03.png)

Proof sketch for "CFG → PDA", using balanced parentheses. The red brackets at the top mark a few balanced strings, and the red line is the grammar $S\to SS\mid(S)\mid\varepsilon$ . The conversion algorithm:

1. push $S$ ;
2. while the stack is not empty: if the top is a variable $A$ , nondeterministically choose a rule $A\to w$ and replace the top by $w$ (pushed in reverse, so the first symbol of $w$ is on top); if the top is a terminal, require it to equal the next input symbol and pop it;
3. accept when the stack is empty and no input remains.

The small stacks on the right show the stack while reading `(()())`: it starts as $S$ , becomes two $S$ 's via $S\to SS$ , then $S\to(S)$ replaces the top with `(`, $S$ , `)`; terminals are matched against the input one by one and popped, and finally the stack is empty. The stack really holds "the part of the derivation not yet matched", and nondeterminism guesses which rule to use at each step.

<!-- Sources: W10L1part1 p.3 -->

### Regular grammars

![L18 slide 31 - Regular grammars](assets/10-cfl-pda/slide-l18-31.png)

If CFG rules are restricted to the forms $A\to w$ or $A\to wB$ (with $w\in\Sigma^*$ and $A,B\in V$ ), we get **regular grammars**, which generate exactly the regular languages.

<!-- Sources: L18 (16.pdf) p.31 -->

Intuition: each rule has at most one variable on its right side, and only at the right end, so the "current variable" during a derivation acts like a DFA's current state — each step emits some characters and moves to another state.

### Closure properties

- Every regular language is a context-free language (CFL);
- CFLs are closed under union, concatenation and Kleene star (the student's notes add reversal);
- CFLs are **not** closed under intersection, nor under complement; but the intersection of a CFL with a regular language is still a CFL.

<!-- Sources: Apple Notes LEC17-18; L24 p.16 -->

The full closure table is in [note 13](13-unrecognisable-reductions.en.md#topic-5).

### The hierarchy picture

![W10L1part1 slide 4 - Regular inside context-free](assets/10-cfl-pda/slide-w10l1part1-04.png)

The handwritten page narrows the nested circles of [section 1](#topic-1) to two layers: the black circle is the regular languages (finite automata = regular expressions), example $0^*1^*$ ; the red circle is the context-free languages (pushdown automata = context-free grammars), example $0^n1^n$ ; outside, in blue, $0^n1^n2^n$ is beyond even PDAs, which is why the second half of Lecture 19 turns to [Turing machines](11-turing-machines.en.md).

<!-- Sources: W10L1part1 p.4 -->

## Self-check

1. Write a CFG generating $\{a^nb^n\mid n\ge0\}$ and give a derivation of $aabb$ .
2. Trace input `aab` on the PDA of Example 1: what is on the stack after each step? Why is it rejected in the end?
3. When the palindrome PDA reads `0110`, which guess of the middle leads to acceptance? Where do the other branches fail?
4. Design a PDA recognising $\{a^nb^{2n}\mid n\ge0\}$ (describing the idea is enough).
5. Apply the CFG → PDA conversion algorithm to the grammar $S\to aSb\mid\varepsilon$ and the input `aabb`, and write down how the stack contents change.
