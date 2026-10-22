# COMP30026 Lectures 15–16 - Proving Non-Regularity: Fooling Sets and Closure

Sources: `lecture/w8l1-slides.pdf` (Lecture 15), `lecture/w8l2-slides.pdf` (Lecture 16), both handwritten whiteboard notes; Apple Notes: CS/25S2/MoC — "LEC15-16 Proving Non-regularity".

This lecture asks: **how do we prove that "no DFA can recognise a language" — not "I couldn't think of one", but "none can exist"?**

Learning path: [Two routes and memorylessness](#topic-1) → [Distinguishable strings](#topic-2) → [The fooling set lemma](#topic-3) → [Non-regularity via closure](#topic-4).

Key points: the memorylessness lemma, the fooling set lemma and the proof for $\{0^n1^n\}$ . Hard parts: constructing a fooling set of size $k$ for an arbitrary $k$ , together with the distinguishing suffixes. Common mistakes: claiming "not regular" from one finite fooling set; reversing the direction of reasoning when using closure; treating "seems to need counting" as a proof of non-regularity.

The board pages are handwritten; the lecturer uses red, blue, green and other colours to separate "past/future" or "prefix/suffix" and to highlight key lines; the text below explains the colours page by page.

<a id="topic-1"></a>
## 1. Two routes and memorylessness

### The two methods of this lecture

![W8L1 slide 1 - Two ways to prove non-regularity](assets/09-non-regularity/slide-w8l1-01.png)

The first page gives two routes:

1. **Fooling sets**: formalise the "memorylessness" (in red) of finite automata, and thereby show that the number of states a language needs has no upper bound;
2. **Closure properties**: leverage the fact that some other language is already known to be non-regular, reasoning backwards through the closure of regular languages under operations.

The next two pages are a warning and a title: this material is hard, and the lecturer advises multiple passes and lots of practice; the title page reads "Fooling Sets vs Pumping Lemma". The subject uses fooling sets instead of the textbook **pumping lemma**; both can prove non-regularity, and the Lecture 24 feedback page also mentions that the pumping lemma was replaced by fooling sets this time.

<!-- Sources: W8L1 p.1-3; L24 p.14 -->

### The fooling-set roadmap

![W8L1 slide 4 - Fooling sets roadmap](assets/09-non-regularity/slide-w8l1-04.png)

The red text gives a two-step goal:

1. first prove a **lower bound**: e.g. "no DFA with fewer than 5 states can recognise $L$ ";
2. then generalise to all $k$ : if for **every** $k>0$ no DFA with fewer than $k$ states can recognise $L$ , then no (finite) DFA recognises $L$ at all, i.e. $L$ is not regular.

The 4-state DFA on the right is the demonstration machine used throughout the lecture: the start $q_0$ (also accepting) goes to $q_1$ on 0 and to $q_2$ on 1; it only illustrates the notation, and the language it recognises does not matter.

<!-- Sources: W8L1 p.1, p.4; Apple Notes LEC15-16 -->

### Recap: the five parts of a DFA

![W8L1 slide 5 - Finite automaton definition recap](assets/09-non-regularity/slide-w8l1-05.png)

This page recaps the definition of a DFA: alphabet $\Sigma$ , set of states $Q$ , initial state $q_0$ , transition function $\delta:Q\times\Sigma\to Q$ , accept states $F$ . The green highlight stresses the transition function: input "current state, next character", output "next state". Below, on the left is a half-filled transition table and on the right the matching state diagram; [note 6](06-finite-automata.en.md#topic-2) explains both representations in detail.

### The extended transition function

![W8L1 slide 6 - Extended transition function](assets/09-non-regularity/slide-w8l1-06.png)

$\delta$ reads one character at a time. The **extended transition function** $\delta^*(q,w)$ is the state reached after reading the whole string $w$ starting from state $q$ (blue notes: the first argument is the current state, the second the remaining input):

$$
\delta^*(q,w)=\delta(\cdots\delta(\delta(q,w_1),w_2)\cdots,w_n).
$$

The lower half of the board introduces two notations:

1. **Resulting state**: $q(w)=\delta^*(q_0,w)$ , i.e. where we stop after reading $w$ from the start;
2. **Prefix-suffix decomposition**: split $w$ into a red prefix $x$ and a blue suffix $y$ , $w=xy$ . Then $q_0\xrightarrow{x}q(x)\xrightarrow{y}q(xy)$ , i.e. $q(xy)=\delta^*(q(x),y)$ .

The example at the bottom left splits $01011$ into $010$ and $11$ : on the DFA on the right, $q_0\xrightarrow{0}q_1\xrightarrow{1}q_1\xrightarrow{0}q_2$ , so $q(010)=q_2$ ; reading $11$ next gives $q_2\xrightarrow{1}q_3\xrightarrow{1}q_1$ , so $q(01011)=\delta^*(q_2,11)=q_1$ .

<!-- Sources: W8L1 p.6; Apple Notes LEC15-16 -->

### Key takeaway: the future depends only on the present

![W8L1 slide 7 - Key takeaway](assets/09-non-regularity/slide-w8l1-07.png)

In the three strings, the red parts are the "past" (prefixes $010$ , $00$ , $1$ ) and the blue parts the "future" (the same suffix $110110$ ). Check on the DFA on the right: all three red prefixes end in $q_2$ (e.g. $q_0\xrightarrow{0}q_1\xrightarrow{0}q_2$ , $q_0\xrightarrow{1}q_2$ ). From then on the transitions depend **only** on two things: ① the present state; ② the future input. The DFA has no memory of how it got here, so the three full strings must end in the same state.

<!-- Sources: W8L1 p.7 -->

![W8L1 slide 8 - Memorylessness lemma](assets/09-non-regularity/slide-w8l1-08.png)

The previous page written as a lemma. **Memorylessness lemma**: for all strings $x,y$ , if $q(x)=q(y)$ then $q(xz)=q(yz)$ for every string $z$ . The consequence on the right: $M$ either accepts both $xz$ and $yz$ or rejects both. The example at the bottom left takes $x=010$ and $y=00$ (both reach $q_2$ , as seen on the previous page) and appends the same blue suffix $z=101$ ; the two strings must share the same fate.

<!-- Sources: W8L1 p.8; Apple Notes LEC15-16 -->

### A first application: 1-state DFAs

![W8L1 slide 9 - Languages of 1-state DFAs](assets/09-non-regularity/slide-w8l1-09.png)

If $M$ has only 1 state ( $q_0$ on the right, looping on every character), every string has the same resulting state (the proof on the last line). So $M$ either accepts everything or rejects everything: $L(M)=\Sigma^*$ or $L(M)=\emptyset$ . This is the smallest example of "too few states to recognise it"; the next section generalises it.

<!-- Sources: W8L1 p.9; Apple Notes LEC15-16 -->

<a id="topic-2"></a>
## 2. Distinguishable strings

### Definition

![W8L1 slide 10 - Distinguishable pairs and distinguishing suffixes](assets/09-non-regularity/slide-w8l1-10.png)

Let $L$ be a language and $x,y$ any strings (the board stresses: not necessarily in $L$ ). If there is a $z$ such that

$$
(xz\in L\text{ and }yz\notin L)\quad\text{or}\quad(xz\notin L\text{ and }yz\in L),
$$

then $x,y$ are **distinguishable** with respect to $L$ , and the $z$ the arrow points to is a **distinguishing suffix**. That is: after appending the same suffix, one lands in $L$ and the other does not.

The example at the bottom: $L$ is the strings of even length. $\varepsilon$ and $0$ are distinguished by the suffix $0$ : $\varepsilon0=0$ has odd length and is not in $L$ ; $00$ has even length and is in $L$ .

<!-- Sources: W8L1 p.10; Apple Notes LEC15-16 -->

![W8L1 slide 11 - Distinguishing example for strings ending in 10](assets/09-non-regularity/slide-w8l1-11.png)

A second example: $L$ is the strings ending in 10. Take $x=1$ , $y=0$ and the suffix $z=0$ : $xz=10\in L$ while $yz=00\notin L$ , so $1$ and $0$ are distinguishable.

<!-- Sources: W8L1 p.10-11 -->

### Distinguishable ⇒ different states

![W8L2 slide 3 - Distinguishable strings reach different states](assets/09-non-regularity/slide-w8l2-03.png)

Lecture 16 starts with this lemma (the first two pages are an epigraph page quoted from Jeff Erickson's notes and an announcement). The black text is the original statement; the red text is the lecturer's clearer rewording: for every DFA $M$ recognising $L$ , if $x,y$ are distinguishable with respect to $L$ , then $q(x)\ne q(y)$ .

The consequence at the bottom: if $L$ has at least one distinguishable pair, no 1-state DFA can recognise it (in a 1-state DFA all strings have the same resulting state).

![W8L2 slide 11 - Why distinguishable strings need separate states](assets/09-non-regularity/slide-w8l2-11.png)

This extra board on the last page of the PDF explains why the lemma holds and previews the next section. The top half is the contrapositive argument: if $z$ distinguishes $x,y$ , i.e. $xz\in L$ and $yz\notin L$ , then $q(xz)\ne q(yz)$ (one is accepting, the other is not); if $q(x)=q(y)$ , the memorylessness lemma would give $q(xz)=q(yz)$ , a contradiction, so $q(x)\ne q(y)$ .

The bottom half extends this to three strings: if $w,x,y$ are pairwise distinguishable, then $q(w)$ , $q(x)$ , $q(y)$ are pairwise different — the three circles are all marked $\ne$ — so the DFA needs at least 3 states. This is exactly the idea of the fooling set lemma in the next section.

<!-- Sources: W8L2 p.3, p.11; Apple Notes LEC15-16 -->

<a id="topic-3"></a>
## 3. The fooling set lemma

### Definition and lemma

![W8L2 slide 4 - Fooling set definition and lemma](assets/09-non-regularity/slide-w8l2-04.png)

**Definition**: a set of strings $F$ is a **fooling set** for $L$ iff every pair of **distinct** strings in $F$ (the red $x\ne y$ ) is distinguishable with respect to $L$ .

**Fooling set lemma**: if $F$ is a fooling set for $L$ with $|F|=k$ , then every DFA recognising $L$ has at least $k$ states. Moreover, if for **every** $k$ there is a fooling set $F_k$ of size at least $k$ , then $L$ is not regular.

**Common mistake**: finding a fooling set of size 100 only shows that at least 100 states are needed, not that $L$ is non-regular; to prove non-regularity you must give a family of fooling sets that can be built for **any** $k$ .

<!-- Sources: W8L2 p.4-5; Apple Notes LEC15-16 -->

![W8L2 slide 5 - Proof of the fooling set lemma](assets/09-non-regularity/slide-w8l2-05.png)

Below the line is the proof: suppose $M$ has only $k-1$ states. $F$ has $k$ strings, so by the **pigeonhole principle (PHP)** two distinct $x,y\in F$ land in the same state $q(x)=q(y)$ ; then for every $z$ , $M$ accepts both $xz,yz$ or rejects both. But $x,y$ are distinguishable — a contradiction. So $M$ needs at least $k$ states.

<!-- Sources: W8L2 p.5 -->

**Note (from the student's notes, corrected)**: if a fooling set has exactly as many strings as some DFA for $L$ has states, that DFA is minimal. The student's notes also said "such an exactly-sized fooling set cannot always be constructed"; that sentence is wrong. **Extension**: for any regular language, pick one string reaching each state of its minimal (complete) DFA; these strings are pairwise distinguishable (otherwise two states could be merged), so a fooling set of size equal to the minimal DFA's state count always exists (the Myhill–Nerode theorem). Count the dead state too: only when counting an "incomplete" DFA that omits the dead state can a fooling set be one larger than the number of states.

<!-- Sources: Apple Notes LEC15-16 -->

### Example: strings ending in 10 need at least 3 states

![W8L2 slide 6 - Fooling set for strings ending in 10](assets/09-non-regularity/slide-w8l2-06.png)

Take $F=\{\varepsilon,1,10\}$ ; the board writes the distinguishing suffix to the right of each pair:

- $(\varepsilon,1)$ : suffix $0$ , since $10\in L$ but $0\notin L$ ;
- $(\varepsilon,10)$ : suffix $\varepsilon$ , since $10\in L$ but $\varepsilon\notin L$ ;
- $(1,10)$ : suffix $\varepsilon$ , likewise.

All three pairs are distinguishable, so recognising $L$ needs at least 3 states. The three strings match the three situations that must be remembered: "no progress yet", "just read 1", "just read 10".

<!-- Sources: W8L2 p.6 -->

### Example: 0^n 1^n is not regular

![W8L2 slide 7 - Fooling set for 0^n 1^n](assets/09-non-regularity/slide-w8l2-07.png)

We need a fooling set of size $k$ for **every** $k$ . In the figure the four strings $1,01,001,0001$ are joined pairwise by red lines labelled with distinguishing suffixes: e.g. $\varepsilon$ between $1$ and $01$ ( $01\in L$ , $1\notin L$ ), and $11$ between $001$ and $0001$ ( $000111\in L$ , $00111\notin L$ ). In general take

$$
F_k=\{1,\ 01,\ 001,\ \dots,\ 0^{k-1}1\}=\{0^i1\mid 0\le i\le k-1\}.
$$

For any $0\le i<j\le k-1$ , take the suffix $z=1^{j-1}$ (red, at the bottom of the board):

- $0^j1\cdot1^{j-1}=0^j1^j\in L$ ;
- $0^i1\cdot1^{j-1}=0^i1^j\notin L$ (since $i\ne j$ ).

So $F_k$ is a fooling set of size $k$ ; this holds for every $k$ , hence $L$ is not regular.

<!-- Sources: W8L2 p.7; Apple Notes LEC15-16 -->

**Hard part**: the choice of fooling set is not unique. The slide's strings have already read one 1, so the suffix only needs the remaining $j-1$ 1s; **Illustrative example (our own)**: $\{0^i\mid 0\le i\le k-1\}$ works just as well, with suffix $1^j$ distinguishing $0^i$ from $0^j$ for $i<j$ .

### Strategies for building fooling sets

![W8L2 slide 8 - Strategies for fooling sets](assets/09-non-regularity/slide-w8l2-08.png)

There is no sure-fire method, but the board gives three rules of thumb:

1. consider **prefixes** of strings in $L$ (the $0^i1$ above are all prefixes of strings in $L$ );
2. look for a counting process that must reach at least $k$ (above: counting the 0s);
3. find one form of distinguishing suffix that works for every pair (above: $1^{j-1}$ ).

<!-- Sources: W8L2 p.8; Apple Notes LEC15-16 -->

<a id="topic-4"></a>
## 4. Non-regularity via closure

### Two theorems used backwards

![W8L2 slide 9 - Non-regularity via closure](assets/09-non-regularity/slide-w8l2-09.png)

The top half uses the closure theorems "backwards". The green and pink highlights are these two backward uses:

| Forward | Backward (used to prove non-regularity) |
| --- | --- |
| $A,B$ regular ⇒ $A\cap B$ regular | if $A\cap B$ is **not** regular and $A$ is regular, then $B$ is not regular |
| $A$ regular ⇒ $A^c$ regular | if $A^c$ is not regular, then $A$ is not regular |

(The first line of the board states union, but the highlighted backward use relies on intersection; closure under intersection is in [note 7](07-nfa-determinisation-minimisation.en.md#topic-2).)

<!-- Sources: W8L2 p.9; Apple Notes LEC15-16 -->

The example in the bottom half: $B=$ "strings with equally many 0s and 1s" ( $\varepsilon,01,10,0011,1010,\dots$ ). Take the regular language $A=0^*1^*$ ; then $A\cap B=\{0^n1^n\mid n\ge0\}$ , proved non-regular in the previous section, so $B$ is not regular. The idea: use a simple regular language $A$ to "filter" $B$ down to a language already known to be non-regular.

<!-- Sources: W8L2 p.9 -->

![W8L2 slide 10 - Complement example](assets/09-non-regularity/slide-w8l2-10.png)

A second example uses the complement: let $B$ be "strings with **unequal** numbers of 0s and 1s"; then $B^c$ is the "equal numbers" language from the previous page, known to be non-regular, so $B$ is not regular either. Note that this page's $B$ is exactly the complement of the previous page's $B$ .

<!-- Sources: W8L2 p.10 -->

### Comparing the two methods

| | Fooling sets | Closure |
| --- | --- | --- |
| Proof length | often longer | often much shorter |
| Applicability | every non-regular language can be proved this way | not always applicable |
| Difficulty | constructing the fooling set and distinguishing suffixes | finding a suitable helper language (such as $A$ or $L^c$ ) |

<!-- Sources: Apple Notes LEC15-16 -->

**Common mistake**: closure only goes "from regular to regular". From "$A$ is not regular and $B$ is not regular" nothing follows about $A\cap B$ ; in a proof, the language used as "known" must be **regular**.

### Common mistake: seeming to need counting does not mean non-regular

The [last slide of Lecture 14](08-regular-expressions.en.md#topic-4) left two exercises that show how the "needs counting" intuition can mislead:

- $L_1=\{0^n1^n\mid 0\le n\le 999999999\}$ **is regular**: it is a finite language (only $10^9$ strings), and every finite language is a finite union of strings, hence a regular expression. Its DFA may be large but has finitely many states; its fooling sets can only be of bounded size, so they cannot prove it non-regular.
- $L_2$ = "binary strings with equally many occurrences of the substrings 01 and 10" **is also regular**: in a binary string, 01 (a switch from 0 to 1) and 10 (a switch from 1 to 0) must alternate, so the counts are equal iff the string is empty or starts and ends with the same character, e.g. $\varepsilon\cup0\cup1\cup0(0\cup1)^*0\cup1(0\cup1)^*1$ .

So a non-regularity proof cannot rest on "it seems to need counting"; it needs arbitrarily large fooling sets or a closure argument.

<!-- Sources: L14 p.29 -->

## Self-check

1. Find a fooling set of size 3 for $L=\{w\mid w\text{ contains the substring }11\}$ , and give the distinguishing suffix for each pair.
2. Prove with fooling sets that $\{0^n1^m\mid n>m\}$ is not regular.
3. Prove with closure that $\{0^n1^m\mid n\ne m\}$ is not regular (hint: first think about which regular language it is intersected with or complemented against).
4. Someone says: "$\{w\mid \text{the number of 0s in }w\text{ is a multiple of 3}\}$ also needs counting, so it is not regular." Is that right? Explain with the tools of this lecture.
