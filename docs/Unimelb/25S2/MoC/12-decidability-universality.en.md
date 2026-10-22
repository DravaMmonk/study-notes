# COMP30026 Lectures 21–22 - Universal Turing Machines, Diagonalisation and Undecidability

Sources: `lecture/w11l1.pdf` (Lecture 21) and `lecture/w11l2.pdf` (Lecture 22), both handwritten board slides; Apple Notes: CS/25S2/MoC — "LEC21-22 Universality of Turing Machines", "★3 Languages".

This lecture asks: **Turing machines are the most powerful model, so can they compute everything? — No. How do we prove that uncomputable problems exist, and find a concrete one?**

Learning path: [Uncomputable means undecidable](#topic-1) → [Universal Turing machines: programs as input](#topic-2) → [Counting: fewer Turing machines than languages](#topic-3) → [The diagonal language and TM acceptance](#topic-4) → [Proof by self-reference](#topic-5).

Key points: $A_{TM}$ is recognisable but undecidable; diagonalisation. Hard parts: self-reference — feeding a machine its own encoding. Common mistakes: taking "the universal machine $U$ can simulate any TM" to mean "$U$ decides $A_{TM}$".

Both PDFs are handwritten board notes from class, where a page is often filled in step by step before moving on; the screenshots use the completed version of each page.

<a id="topic-1"></a>
## 1. Uncomputable means undecidable

### The limits of computation

![W11L1 slide 2 - Uncomputable equals undecidable](assets/12-decidability-universality/slide-w11l1-02.png)

The top half draws the Church–Turing thesis as "Input → Algorithm → Output", with "= Turing Machine" under Algorithm (see [note 11](11-turing-machines.en.md#topic-5)). This gives the red line:

$$
\text{uncomputable}=\text{undecidable}.
$$

The three red lines below are an addendum: even allowing quantum computation, nondeterminism or "time travel" does not move this boundary — none of them makes an undecidable problem decidable.

<!-- Sources: W11L1 p.1-2; W11L2 p.2; Apple Notes LEC21-22 -->

In the student's notes: a language $L$ is decidable iff its **characteristic function**

$$
f(w)=\begin{cases}1 & w\in L\\ 0 & w\notin L\end{cases}
$$

is computable, i.e. some TM $M$ , on every input $w$ , halts, accepts if $w\in L$ and rejects if $w\notin L$ .

<!-- Sources: Apple Notes LEC21-22 -->

The route of these lectures: first prove that unrecognisable languages **exist**, then prove that "TM acceptance" is undecidable. Note that "not recognisable ⇒ not decidable", because every decider is also a recogniser.

<!-- Sources: W11L1 p.1 -->

<a id="topic-2"></a>
## 2. Universal Turing machines: programs as input

### Example 1: finite-automaton acceptance

![W11L1 slide 4 - FA acceptance](assets/12-decidability-universality/slide-w11l1-04.png)

The heading "Source code as input" is the theme of this section: a Turing machine can take another machine's **source code** as input. The picture encodes a DFA $B$ as $\langle B\rangle$ and feeds it, together with an input $w$ , into a TM box; on the right is what the output must be:

$$
A_{DFA}=\{\langle B,w\rangle\mid B\text{ is a DFA that accepts }w\}.
$$

Below the box is the method: the TM simulates $B$ on $w$ ; a DFA reads each character once, so after $\text{len}(w)$ steps it accepts if $B$ is in an accept state and rejects otherwise. The simulation always halts, so $A_{DFA}$ is **decidable**.

<!-- Sources: W11L1 p.3-4; Apple Notes LEC21-22 -->

The student's notes add: only Turing machines can perform such simulation. $A$ simulates $B$ means $A(\langle B,w\rangle)=B(w)$ ; finite automata have finitely many states and bounded memory, and PDAs can only access their stack last-in-first-out, so neither can simulate arbitrary machines.

<!-- Sources: Apple Notes LEC21-22 -->

### Example 2: Turing-machine acceptance

![W11L1 slide 5 - TM acceptance](assets/12-decidability-universality/slide-w11l1-05.png)

The same box, now with a TM encoding $\langle M\rangle$ and $w$ as input:

$$
A_{TM}=\{\langle M,w\rangle\mid M\text{ is a TM that accepts }w\}.
$$

The **universal Turing machine** $U$ simulates $M$ on $w$ (the three lines inside the brace):

$$
U(\langle M,w\rangle)=\begin{cases}\text{accept} & M\text{ accepts }w\\ \text{reject} & M\text{ rejects }w\\ \text{loop forever} & M\text{ loops on }w\end{cases}
$$

The red note on the left gives the conclusion: $U$ is a **recogniser** for $A_{TM}$ but **not a decider** — if $M$ never halts, neither does $U$ . So $A_{TM}$ is recognisable. The difference from Example 1 is exactly this: simulating a DFA has a bound of $\text{len}(w)$ steps, simulating a TM has none.

<!-- Sources: W11L1 p.5; Apple Notes LEC21-22 -->

### How powerful a decider for A_TM would be

![W11L1 slide 6 - A decider for TM acceptance](assets/12-decidability-universality/slide-w11l1-06.png)

Suppose a "unicorn" decider $U$ existed (the box has a unicorn drawn in it, meaning "too good to be true"): on input $\langle M,w\rangle$ it always halts, accepting if $w\in L(M)$ and rejecting otherwise. Then any recogniser $M$ could be turned into a decider $D$ — "on input $w$ , run $U$ on $\langle M,w\rangle$ and copy its answer". In other words, every recognisable language would become decidable. That is suspiciously good; [section 4](#topic-4) proves no such $U$ exists.

<!-- Sources: W11L1 p.6 -->

<a id="topic-3"></a>
## 3. Counting: fewer Turing machines than languages

### Theorem and idea

![W11L1 slide 7 - More languages than TMs](assets/12-decidability-universality/slide-w11l1-07.png)

**Theorem**: there is a non-recognisable language.

The sizes of the two circles are the proof idea: the small circle is all Turing machines, the large one all languages. There are **more** languages than Turing machines — the set of Turing machines is "countable", the set of all languages is "uncountable", so some language has no machine recognising it. The next few pages make "more" and "countable" precise.

<!-- Sources: W11L1 p.7, p.14 -->

### Sizes of sets

![W11L1 slide 8 - Cantor and bijections](assets/12-decidability-universality/slide-w11l1-08.png)

**Cantor**: two sets have the same size if their elements can be paired up. In the picture the red dots (set $A$ ) and blue dots (set $B$ ) are joined one-to-one by the arrows $f$ . Formally, there is a bijection $f:A\to B$ , i.e.:

- **injective**: different elements of $A$ map to different elements of $B$ ;
- **surjective**: $f(A)=B$ , every element of $B$ is paired.

A set $S$ is **countable** if it has the same size as the natural numbers $\mathbb{N}$ .

<!-- Sources: W11L1 p.8, p.10; Apple Notes LEC21-22 -->

### Countable examples

![W11L1 slide 9 - Naturals vs Boolean strings](assets/12-decidability-universality/slide-w11l1-09.png)

The left column is the natural numbers 1, 2, 3, …; the right column is the Boolean strings $\varepsilon$ , 0, 1, 00, 01, … in "string order" (by length, then lexicographically). Each natural number is paired with exactly one string, so $\{0,1\}^*$ is countable.

![W11L1 slide 10 - Naturals vs TMs](assets/12-decidability-universality/slide-w11l1-10.png)

Turing machines can be listed the same way: each TM $M$ has an encoding $\langle M\rangle\in\{0,1\}^*$ ; let $M_i$ be the TM whose encoding is $i$ -th in string order, and $f(n)=M_n$ . Below that is the definition of a countable set, with the note "the sets of TMs and of Boolean strings are countable".

| Set | Pairing with $\mathbb{N}$ |
| --- | --- |
| Boolean strings $\{0,1\}^*$ | $f(n)$ = the $n$ -th string in string order: 1↦ $\varepsilon$ , 2↦0, 3↦1, 4↦00, 5↦01, … |
| Integers $\mathbb{Z}$ | 0, −1, 1, −2, 2, −3, 3, … (the alternating order from the student's notes) |
| Turing machines | $M_i$ = the TM whose encoding $\langle M_i\rangle\in\{0,1\}^*$ is $i$ -th in string order; $f(n)=M_n$ |

<!-- Sources: W11L1 p.9-11; Apple Notes LEC21-22 -->

The board page "naturals vs integers" has only its heading; the ordering of the integers in the table comes from the student's notes. The student's notes also record that the rationals $\mathbb{Q}$ are countable ( $|\mathbb{N}|=|\mathbb{Z}|=|\mathbb{Q}|$ ).

<!-- Sources: W11L1 p.10; Apple Notes LEC21-22 -->

### Diagonalisation: the reals are uncountable

![W11L1 slide 13 - Diagonalisation](assets/12-decidability-universality/slide-w11l1-13.png)

Top left: **Theorem** — there are fewer naturals than reals in $[0,1]$ . The proof shows that every $f:\mathbb{N}\to[0,1]$ misses some real number.

List the decimal expansions of $f(1),f(2),\dots$ as a table (here $f(1)=0.71828\ldots$ , $f(2)=0.11159\ldots$ , …). Look at the **diagonal** digits circled in pink: the $n$ -th digit of row $n$ . Build $x$ so that its $n$ -th digit **differs** from the $n$ -th digit of $f(n)$ (the figure adds 1 to 7, 1, 0, 2, 6, giving $x=0.82137\ldots$ ). Then $f(n)\ne x$ for every $n$ (they differ in the $n$ -th digit), so $x$ is not in the list and $f$ is not surjective.

<!-- Sources: W11L1 p.12-13; Apple Notes LEC21-22 -->

The key is "every row differs in at least one digit": if we simply copied the diagonal digits, the resulting $x$ might equal some $f(n)$ and the argument would fail.

<details markdown="1">
<summary>Extension (optional): "add 1" meeting a 9, and double decimal representations</summary>

A rigorous proof must also avoid cases like $0.0999\ldots=0.1$ , where one real number has two decimal expansions: if the expansion of $x$ happened to be the other way of writing some $f(n)$ , "differs in the $n$ -th digit" would not show the two reals are different. A common fix is to build $x$ only from digits such as 4 and 5 (e.g. take 5 unless the diagonal digit is 5, in which case take 4), so $x$ does not end in all 0s or all 9s and has only one expansion. The board's "add 1" also needs another choice when the diagonal digit is 9. This supplements the classroom simplification.

</details>

The two circles at the top right repeat the theorem from [the start of this section](#topic-3): the same argument shows the set of all languages is uncountable (the student's notes say "the same size as $\mathbb{R}$"), while there are only countably many Turing machines, each recognising just one language, so some language is not recognisable.

<!-- Sources: W11L1 p.14; Apple Notes LEC21-22 -->

<a id="topic-4"></a>
## 4. The diagonal language and TM acceptance

### A concrete non-recognisable language

![W11L1 slide 15 - The diagonal language](assets/12-decidability-universality/slide-w11l1-15.png)

The table at the bottom left carries the diagonal argument of the previous section over to languages. List all TMs by encoding as $M_1,M_2,\dots$ and all strings in string order as $\varepsilon,0,1,00,\dots$ . Row $i$ , column $j$ of the table says in/out: whether the $j$ -th string is in $L(M_i)$ . Flip the diagonal and define

$$
L_D=\{x\mid x\notin L(M_x)\},
$$

where $M_x=M_k$ if $x$ is the $k$ -th string. The diagonal in the figure reads out, in, in, in, so the $L_D$ row reads in, out, out, out. For every $n$ , $L(M_n)$ and $L_D$ differ on the $n$ -th string, so no TM recognises $L_D$ — **$L_D$ is not recognisable**.

<!-- Sources: W11L1 p.15 -->

### Why care about this "artificial" language

![W11L1 slide 17 - L_D and TM acceptance](assets/12-decidability-universality/slide-w11l1-17.png)

The board first asks: "$L_D$ seems artificial — who cares?" The answer is that it yields a genuinely important conclusion.

**Claim**: if TM acceptance $A_{TM}$ were decidable, then $L_D$ would be decidable. Let $U$ decide $A_{TM}$ and build a decider for $L_D$ : on input $x$ , run $U$ on $\langle M_x,x\rangle$ ; if $U$ rejects, accept; if $U$ accepts, reject.

<!-- Sources: W11L1 p.16-17 -->

But $L_D$ is not even recognisable, let alone decidable. So **$A_{TM}$ is undecidable**, and the "unicorn" of [section 2](#topic-2) does not exist. This is already the shape of a "reduction" argument, made systematic in [note 13](13-unrecognisable-reductions.en.md#topic-1).

<a id="topic-5"></a>
## 5. Proof by self-reference

### Recap: the hierarchy of languages

![W11L2 slide 3 - Hierarchy recap](assets/12-decidability-universality/slide-w11l2-03.png)

The takeaway of the previous lecture: uncomputable problems exist. From inside out: regular (Reg) ⊂ context-free (CFL, e.g. $0^n1^n$ ) ⊂ decidable (e.g. $0^n1^n2^n$ ) ⊂ recognisable (e.g. TM acceptance) ⊂ all languages ( $L_D$ sits outside).

<!-- Sources: W11L2 p.3 -->

![W11L2 slide 4 - Two methods](assets/12-decidability-universality/slide-w11l2-04.png)

Two methods for identifying "impossible" problems (unrecognisable, undecidable): (1) **diagonalisation / self-reference** — explained in red as "programs that perform on their own source code"; (2) **reductions**. This lecture retells the proof with the first method; the second is the subject of [note 13](13-unrecognisable-reductions.en.md).

<!-- Sources: W11L2 p.4 -->

### The liar paradox

![W11L2 slide 6 - Liar paradox](assets/12-decidability-universality/slide-w11l2-06.png)

The previous lecture's proof is not the usual "direct contradiction" proof, and students found it confusing, so it was retold via self-reference. First a logic puzzle: there are two kinds of people, truth-tellers (every statement true, the haloed face in the picture) and liars (every statement false, the little devil). Someone says "I am a liar": if they are a truth-teller, the statement is true, so they are a liar; if they are a liar, the statement is false, so they are a truth-teller. Both cases contradict.

<!-- Sources: W11L2 p.5-6 -->

### L_s is not recognisable

![W11L2 slide 7 - L_s, first case](assets/12-decidability-universality/slide-w11l2-07.png)

This time the columns of the table are machine encodings $\langle M_1\rangle,\langle M_2\rangle,\dots$ . The pink diagonal records "does $M_i$ accept its own encoding"; flipping it gives the bottom row $L_s$ :

$$
L_s=\{\langle M\rangle\mid M\text{ does not accept }\langle M\rangle\}.
$$

Suppose some TM $R$ has $L(R)=L_s$ . $R$ itself appears in the table (the last row $L(R)$ and last column $\langle R\rangle$ , with an empty oval where they cross). Does $R$ accept $\langle R\rangle$ ? This page writes out the first case:

1. $R$ accepts $\langle R\rangle$ ⇒ $\langle R\rangle\in L_s$ (since $L(R)=L_s$ ) ⇒ $R$ does not accept $\langle R\rangle$ (definition of $L_s$ ).

![W11L2 slide 8 - L_s, second case](assets/12-decidability-universality/slide-w11l2-08.png)

The next page, with the same table, writes out the second case:

2. $R$ does not accept $\langle R\rangle$ ⇒ $\langle R\rangle\notin L_s$ ⇒ $R$ accepts $\langle R\rangle$ .

These are the only two possibilities, and both lead to contradictions, so the assumption "some $R$ has $L(R)=L_s$" is false, and $L_s$ is not recognisable. This is the machine version of the liar paradox: neither in nor out fits the empty oval.

<!-- Sources: W11L2 p.7-9; Apple Notes LEC21-22 -->

**Note**: conversely, the complement of $L_s$ , $\{\langle M\rangle\mid M\text{ accepts }\langle M\rangle\}$ , **is** recognisable: on input $\langle M\rangle$ , use the universal machine $U$ to simulate $M$ on $\langle M\rangle$ and accept if it accepts. It is only flipping the diagonal that takes us outside the recognisable languages.

### A_TM is undecidable

![W11L2 slide 10 - A_TM is undecidable](assets/12-decidability-universality/slide-w11l2-10.png)

Suppose $A_{TM}$ is decidable: some TM $H$ , on $\langle M,w\rangle$ , accepts if $M$ accepts $w$ and rejects otherwise. Use $H$ to build $D$ :

```text
D = on input ⟨M⟩:
    run H on ⟨M, ⟨M⟩⟩
    if H rejects, accept
    if H accepts, reject
```

Then for every $M$ : $D$ accepts $\langle M\rangle$ iff $M$ does not accept $\langle M\rangle$ , i.e. $L(D)=L_s$ (the note beside the vertical bar on the right). Take $M=D$ : $D$ accepts $\langle D\rangle$ iff $D$ does not accept $\langle D\rangle$ — a contradiction! So $A_{TM}$ is undecidable.

<!-- Sources: W11L2 p.10; Apple Notes LEC21-22 -->

**Common mistake**: $D$ is guaranteed to halt only because $H$ is a decider (it always halts). With the universal machine $U$ (a recogniser) in its place, $D$ might run forever and the contradiction disappears — which is exactly why $A_{TM}$ is recognisable yet undecidable.

The student's notes list the "halting function" $halt(M,w)$ (1 if $M$ halts on $w$ , else 0) as uncomputable; its proof uses a reduction, see [note 13](13-unrecognisable-reductions.en.md#topic-2).

<!-- Sources: Apple Notes LEC21-22 -->

### Preview: reductions

![W11L2 slide 11 - Reductions preview](assets/12-decidability-universality/slide-w11l2-11.png)

The last page of Lecture 22 gives the definition of a reduction $A\le B$ and three examples; the red line "$A$ undecidable ⇒ $B$ undecidable" is exactly how [section 4](#topic-4) derived the undecidability of $A_{TM}$ from $L_D$ (the last example, $L_D\le$ TM Acceptance). The full treatment of the definition, its direction and the examples is in [note 13, section 1](13-unrecognisable-reductions.en.md#topic-1).

## Self-check

1. Why does simulating a DFA always finish within $\text{len}(w)$ steps, while simulating a TM may not? What does this mean for $A_{DFA}$ and for $A_{TM}$ ?
2. In the diagonal argument, if we kept the $n$ -th digit unchanged instead of adding 1, could we still show that $f$ misses some real number?
3. Is $\{\langle M\rangle\mid M\text{ accepts }\langle M\rangle\}$ decidable? Justify using this lecture's results.
4. In the proof that $A_{TM}$ is undecidable, if $H$ were only a recogniser, at which step would $D$ go wrong?
