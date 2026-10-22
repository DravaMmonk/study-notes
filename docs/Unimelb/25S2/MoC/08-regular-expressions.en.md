# COMP30026 Lecture 14 - Regular Expressions

Sources: `lecture/14.pdf`; Apple Notes: CS/25S2/MoC — "LEC14 Regular Expressions".

This lecture asks: **can we describe a regular language in one compact line instead of drawing a machine? Is such a description exactly as powerful as finite automata?**

Learning path: [Syntax and semantics](#topic-1) → [From regular expressions to NFAs](#topic-2) → [From NFAs to regular expressions](#topic-3) → [Algebraic laws and the limits of finite automata](#topic-4).

Key points: regular expressions ⟺ regular languages; the bypass label $R_1R_2^*R_3$ in state elimination. Hard parts: the general recipe $(R_1\cup R_2R_3^*R_4)^*R_2R_3^*$ . Common mistakes: confusing $\varepsilon$ with $\emptyset$ ; operator precedence; assuming concatenation commutes.

<a id="topic-1"></a>
## 1. Syntax and semantics

### Why regular expressions

![Slide 3 - Pattern matching](assets/08-regular-expressions/slide-03.png)

The upper box lists the uses of **pattern matching**: search engines (code search), **lexical analysis** of programs, scripting languages and tools (Perl, grep, awk, sed), and DNA analysis. The lower box asks: how would a finite automaton recognise the word "bug"?

**Illustrative example (our own)**: to find "bug" in a text, a 4-state DFA can record "how far the match has got": 0 (nothing matched), 1 (just read b), 2 (read bu), 3 (read bug — accept and stay there forever). On a mismatching character it falls back: reading b in state 1 or 2 returns to 1, any other character returns to 0. Drawing machines works, but every new pattern needs a new drawing; the regular expressions on the next slide let us write the pattern directly, e.g. $\Sigma^*\,bug\,\Sigma^*$ .

![Slide 4 - Regular expressions as compact notation](assets/08-regular-expressions/slide-04.png)

A **regular expression** is a compact notation for a regular language. "Restricted patterns" is a reminder that it uses only a few operations — fewer features than the regexes of programming languages. Look at the example at the bottom: $(0\cup1)(0\cup1)((0\cup1)(0\cup1))^*$ first demands two characters and then any number of further pairs of characters, so it describes "binary strings of positive even length"; in Python it is `r"(0|1)(0|1)((0|1)(0|1))*"`, where `|` stands for $\cup$ .

<!-- Sources: L14 p.3-4 -->

### Formal syntax and meaning

![Slide 5 - Formal syntax and semantics](assets/08-regular-expressions/slide-05.png)

The top half is a **grammar**: a regular expression is either a single character $a_i$ , $\varepsilon$ or $\emptyset$ , or is built from smaller regular expressions with union $\cup$ , concatenation $\circ$ and star $^*$ . The bottom half is the **semantics**: each expression $R$ denotes a language $L(R)$ , and the three operations are the language union, language concatenation and Kleene star from [note 6](06-finite-automata.en.md#topic-3).

<!-- Sources: L14 p.5; Apple Notes LEC14 -->

**Common mistake**: note the difference between $L(\varepsilon)=\{\varepsilon\}$ and $L(\emptyset)=\emptyset$ . The first is the language containing only the empty string, of size 1; the second is the empty language, of size 0. The difference is starker under concatenation: $\varepsilon R$ is still $R$ , whereas $\emptyset R$ is $\emptyset$ (laws in section 4).

<!-- Sources: L14 p.5; Apple Notes LEC14 -->

### Notational conveniences

![Slide 7 - Notational conveniences](assets/08-regular-expressions/slide-07.png)

We may omit $\circ$ and some parentheses. Binding precedence, from highest to lowest: star > concatenation > union. Look at the three examples: a star applies only to the single symbol immediately before it, so $ab^*$ is $a\circ(b^*)$ , not $(ab)^*$ ; $a\cup bc^*$ is $a\cup(b\circ(c^*))$ , with the union applied last.

<!-- Sources: L14 p.7; Apple Notes LEC14 -->

### Examples

![Slide 9 - Regular expression examples](assets/08-regular-expressions/slide-09.png)

Expressions on the left, the languages they denote on the right. A few lines deserve a second look:

- $(0\cup\varepsilon)(\varepsilon\cup1)$ : each bracket "picks one", $2\times2$ choices in all, giving $\{\varepsilon,0,1,01\}$ ;
- $\varepsilon\cup1\cup(\varepsilon\cup1)^*(\varepsilon\cup1)$ denotes the same language as $1^*$ : one language can be written in many ways, which is why the simplification laws in section 4 are useful;
- $(1^*0^*)^*=\Sigma^*$ : each single character 0 or 1 belongs to $1^*0^*$ , so gluing pieces together yields any binary string.

<!-- Sources: L14 p.8-9 -->

<a id="topic-2"></a>
## 2. From regular expressions to NFAs

### The theorem and base cases

![Slide 10 - Regular expressions to NFAs](assets/08-regular-expressions/slide-10.png)

Theorem box: **a language is regular iff it can be described by a regular expression.** This section proves the "⇐" direction: build an NFA bottom-up from $R$ (formally, by structural induction on $R$ ).

- **Base cases** (in red): look at the three small figures in the middle. $R=a$ : two states, one arrow labelled $a$ into an accept state; $R=\varepsilon$ : a single state that is both start and accepting, accepting without reading anything; $R=\emptyset$ : a single non-accepting start state, accepting nothing.
- **Inductive step** (red, at the bottom): $R=R_1\cup R_2$ , $R_1\circ R_2$ , $R_1^*$ — reuse the [closure constructions from note 7](07-nfa-determinisation-minimisation.en.md#topic-2).

<!-- Sources: L14 p.10; Apple Notes LEC14 -->

### Example: building the NFA step by step

![Slide 11 - NFA for a union b](assets/08-regular-expressions/slide-11.png)

To turn $(a\cup b)^*bc$ into an NFA, start from the innermost parts: build a two-state NFA for each of $a$ and $b$ (the two small figures at the top), then apply the union construction — a new start with two $\varepsilon$ arrows — to get the NFA for $a\cup b$ (lower figure).

<!-- Sources: L14 p.11 -->

![Slide 12 - NFA for the whole expression](assets/08-regular-expressions/slide-12.png)

The top half applies the star construction to get $(a\cup b)^*$ : the new start on the far left is accepting and has an $\varepsilon$ to the old start; two $\varepsilon$ arrows lead from the old accept states back to the old start in the middle, allowing "one more piece". The bottom half uses the concatenation construction to attach $b$ and then $c$ : every accept state of the previous step (the new start and the two old accept states) gets an $\varepsilon$ to the start of $b$ , and another $\varepsilon$ links in $c$ . The resulting NFA has many states and many $\varepsilon$ s, but the construction is entirely mechanical; when a smaller machine is needed, determinise and minimise it afterwards (see note 7).

<!-- Sources: L14 p.12 -->

<a id="topic-3"></a>
## 3. From NFAs to regular expressions

### First keep a single accept state

![Slide 14 - Making a single accept state](assets/08-regular-expressions/slide-14.png)

The "⇒" direction: given an NFA $N=(Q,\Sigma,\delta,I,F)$ , first make it have at most one accept state. If $|F|\le1$ , do nothing; otherwise add a new state $q_f$ , add $\varepsilon$ -transitions to $q_f$ from every state in $F$ , and make $q_f$ the only accept state:

$$
\delta'(q,v)=\begin{cases}\delta(q,v)\cup\{q_f\} & q\in F,\ v=\varepsilon\\ \delta(q,v) & \text{otherwise}\end{cases}
$$

Look at the example at the bottom: $N$ has three accept states, one of which is the start state itself (double circle). So besides the two $\varepsilon$ arrows from the old accept states on the right, $N'$ has an $\varepsilon$ straight from the start to $q_f$ ; all the old accept states become single circles.

<!-- Sources: L14 p.13-14; Apple Notes LEC14 -->

### What is left at the end

![Slide 17 - General recipe](assets/08-regular-expressions/slide-17.png)

The method repeatedly removes states that are neither start nor accept states; along the way the arrow labels are no longer single characters but regular expressions. At the end only the two shapes in the figure remain:

- start and accept state differ: start self-loop $R_1$ , start-to-accept $R_2$ , accept self-loop $R_3$ , accept-back-to-start $R_4$ ; the result is $(R_1\cup R_2R_3^*R_4)^*R_2R_3^*$ ;
- the start is the accept state, with only a self-loop $R$ : the result is $R^*$ .

Some $R$ s may be $\varepsilon$ or $\emptyset$ (a missing arrow counts as $\emptyset$ ).

<!-- Sources: L14 p.17 -->

**Hard part**: read the first formula as "loop around at the start any number of times (either take the self-loop $R_1$ , or go to the accept state, loop there and come back: $R_2R_3^*R_4$ ), then finally go to the accept state and loop there: $R_2R_3^*$ ".

### State elimination

![Slide 20 - The state elimination process](assets/08-regular-expressions/slide-20.png)

The small figure at the top is an intermediate state about to be removed: incoming arrow $R_1$ , self-loop $R_2$ , outgoing arrow $R_3$ . When it is removed, each pair "incoming arrow, outgoing arrow" gets a new **bypass** arrow labelled

$$
R_1R_2^*R_3 .
$$

That is: come in, loop on this state any number of times, then go out. If the state has $m$ incoming and $n$ outgoing arrows, removing it adds $m\times n$ bypass arrows. **Note**: with no self-loop, $R_2=\emptyset$ and $\emptyset^*=\varepsilon$ , so the label simplifies to $R_1R_3$ . If the two states already have an arrow between them, the old and new labels are merged into one with $\cup$ .

At the bottom is the example used next: the start $A$ has a self-loop $0,1$ , then $A\xrightarrow{1}B\xrightarrow{0,1}C\xrightarrow{0,1}D$ , and the accept states are $C$ and $D$ .

<!-- Sources: L14 p.20; Apple Notes LEC14 -->

### Example

![Slide 24 - State elimination example](assets/08-regular-expressions/slide-24.png)

Read the four rows from top to bottom:

1. create a single accept state $E$ , with $\varepsilon$ from $C$ and $D$ ;
2. eliminate $D$ : in $C\xrightarrow{0\cup1}D$ , out $D\xrightarrow{\varepsilon}E$ ; the bypass label is $(0\cup1)\varepsilon=0\cup1$ , merged with the existing $C\xrightarrow{\varepsilon}E$ into $C\xrightarrow{\varepsilon\cup0\cup1}E$ ; at the same time every arrow is rewritten as a regular expression ( $0,1$ becomes $0\cup1$ );
3. eliminate $B$ : giving $A\xrightarrow{1(0\cup1)}C$ ;
4. eliminate $C$ : giving $A\xrightarrow{1(0\cup1)(\varepsilon\cup0\cup1)}E$ .

<!-- Sources: L14 p.20-24; Apple Notes LEC14 -->

![Slide 26 - Applying the general recipe](assets/08-regular-expressions/slide-26.png)

The remaining figure is exactly the first shape, so apply the general recipe: $R_1=0\cup1$ , $R_2=1(0\cup1)(\varepsilon\cup0\cup1)$ , and since the accept state has neither a self-loop nor an arrow back to the start, $R_3=R_4=\emptyset$ . Because $\emptyset^*=\varepsilon$ and $R_2\emptyset=\emptyset$ , the result simplifies to

$$
(0\cup1)^*1(0\cup1)(\varepsilon\cup0\cup1).
$$

Meaning: binary strings whose second-last or third-last symbol is 1. The student's notes give the Python form `r"(0|1)*1(0|1)(|0|1)"`, where the empty alternative in `(|0|1)` corresponds to $\varepsilon$ .

<!-- Sources: L14 p.26; Apple Notes LEC14 -->

The footnote points to the Sipser textbook (Canvas Modules/Resources) for more details.

<!-- Sources: L14 p.26 -->

<a id="topic-4"></a>
## 4. Algebraic laws and the limits of finite automata

### Algebraic laws

![Slide 27 - Useful laws for regular expressions](assets/08-regular-expressions/slide-27.png)

![Slide 28 - More useful laws](assets/08-regular-expressions/slide-28.png)

These two slides list the laws commonly used to simplify regular expressions (the first covers basic properties of union and concatenation, the second distributivity and properties of star). The table explains each one:

| Law | Meaning |
| --- | --- |
| $A\cup A=A$ , $A\cup B=B\cup A$ | union is idempotent and commutative |
| $(A\cup B)\cup C=A\cup(B\cup C)$ | union is associative, so write $A\cup B\cup C$ |
| $(A\circ B)\circ C=A\circ(B\circ C)$ | concatenation is associative |
| $\emptyset\cup A=A\cup\emptyset=A$ | $\emptyset$ is the identity for union |
| $\varepsilon\circ A=A\circ\varepsilon=A$ | $\varepsilon$ is the identity for concatenation |
| $\emptyset\circ A=A\circ\emptyset=\emptyset$ | $\emptyset$ is the "zero" of concatenation: there is no string to glue on |
| $(A\cup B)\circ C=(A\circ C)\cup(B\circ C)$ | right distributivity |
| $A\circ(B\cup C)=(A\circ B)\cup(A\circ C)$ | left distributivity |
| $(A^*)^*=A^*$ | star is idempotent |
| $\emptyset^*=\varepsilon^*=\varepsilon$ | gluing zero strings gives the empty string |
| $(\varepsilon\cup A)^*=A^*$ | an extra empty string does not change the closure |
| $(A\cup B)^*=(A^*B^*)^*$ | explains $(1^*0^*)^*=\Sigma^*$ from section 1 |

<!-- Sources: L14 p.27-28; Apple Notes LEC14 -->

**Common mistake**: concatenation is **not** commutative, $AB\ne BA$ ; and $\emptyset^*=\varepsilon$ , not $\emptyset$ . Also, star does not distribute over union: $(A\cup B)^*\ne A^*\cup B^*$ . For example $ab$ belongs to $(a\cup b)^*$ but not to $a^*\cup b^*$ , whose strings are either all a's or all b's.

### How far finite automata can go

![Slide 29 - Limitations of finite automata](assets/08-regular-expressions/slide-29.png)

The last slide previews the next lecture: a finite automaton cannot look ahead and has a fixed number of bits of memory. Recognising $\{0^n1^n\mid n\ge0\}=\{\varepsilon,01,0011,000111,\dots\}$ means remembering how many 0s were read, and $n$ has no upper bound, so a fixed number of bits seems insufficient.

The slide leaves two exercises: is $L_1=\{0^n1^n\mid 0\le n\le 999999999\}$ regular? What about $L_2=\{w\mid w\text{ has equally many occurrences of the substrings }01\text{ and }10\}$ ? Both seem to require "counting", but the answers may be surprising. [Note 9](09-non-regularity.en.md#topic-4) first introduces the methods for proving non-regularity, then returns to these two exercises in its last section.

<!-- Sources: L14 p.29 -->

## Self-check

1. Write a regular expression for binary strings containing at least one 1, and say which small NFAs and which constructions the section 2 method would use to build its NFA.
2. Are $a^*\cup b$ and $(a\cup b)^*$ the same? Give a string in one but not the other (if one exists).
3. An intermediate state has 2 incoming arrows $R_1,R_1'$ , 3 outgoing arrows $S_1,S_2,S_3$ and a self-loop $0$ . How many arrows are added when it is eliminated? Write the label of one of them.
4. Simplify $(\varepsilon\cup0)^*\emptyset\cup1$ using the laws.
