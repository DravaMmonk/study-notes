# COMP90007 Week 11 - Network Security (1): Cryptography

Sources: `lecture/Week11-Lectures2&3.pdf` (Network Security (1)), `lecture/Week12-Review-handout.pdf` p.32–34, `lecture/Week12-Review-1-sample-solution.pdf` p.1 (concepts only); Apple Notes: CS/25S1/IT — "WEEK12 - Internet Security"; CS/25S1/IT/Review — "Network Security".

This lecture asks: **data must cross a network where anyone may eavesdrop or tamper; how do we make sure only the intended reader can understand it?** The core of the answer is cryptography.

Learning path: [Goals of network security](#topic-1) → [The encryption model and keys](#topic-2) → [Classical ciphers and one-time pads](#topic-3) → [Symmetric-key algorithms and cipher modes](#topic-4) → [Public-key algorithms and RSA](#topic-5) → [Public key management](#topic-6).

Key points: the differences between the four cipher modes, RSA key generation with encryption and decryption, the role of certificates. Hard parts: the encryption/decryption diagrams of each cipher mode. Common mistakes: under Kerckhoff's principle the algorithm is public and only the key is secret; stream cipher mode and counter mode must never reuse the same (key, IV) pair.

<a id="topic-1"></a>
## 1. Goals of network security

### Five security properties

![Slide 02 - Essential security properties](assets/13-cryptography/slide-02.png)

The slide lists five properties. The first three are often called CIA; the last two concern "who is the other party, and can they deny it":

| Property | Meaning |
| --- | --- |
| Confidentiality | Information is kept hidden from unauthorised users |
| Integrity | Content has not been altered or tampered with |
| Availability | Systems and services do not become unusable |
| Authentication | The party you give content to has valid credentials |
| Non-repudiation | Proving content was created by a named user; relates to signatures |
<!-- Sources: w11sec p.2 -->

### Which properties two incidents broke

![Slide 03 - Equifax man-in-the-middle incident](assets/13-cryptography/slide-03.png)

![Slide 04 - Azure DDoS incident](assets/13-cryptography/slide-04.png)

The lower half of both slides maps the incident back to the properties on the previous slide. In 2017 Equifax suffered a **man-in-the-middle attack**: the attacker intercepted and possibly modified data between two parties; it ran 75 days before detection, about 143 million personal records were potentially affected, and the company afterwards spent $1.4 billion upgrading its security; confidentiality, integrity and authentication were involved. In 2021 Microsoft Azure mitigated a **DDoS attack** (distributed denial of service) of 3.47 Tbps and 340 million packets per second: such attacks aim to overwhelm a system's resources, breaking availability and causing financial loss.
<!-- Sources: w11sec p.3-4 -->

### Security appears at every layer

![Slide 05 - Security at every layer](assets/13-cryptography/slide-05.png)

Layer by layer: the physical layer encloses transmission lines against wiretapping; the network layer monitors traffic with firewalls; the transport layer encrypts connections; the application layer authenticates. The slide's last line is the starting point of this lecture: most security implementations rest on **cryptography** and **authentication**. Cryptography is a set of algorithms for creating secrets, authenticating users, making sure messages are not tampered with, and making sure edits cannot be denied by their author.
<!-- Sources: w11sec p.5, p.7 -->

The student's Week 12 outline lists the topics of the two security lectures: cryptography, public key management, digital signatures, authentication, and communication security (IPsec, firewalls, VPNs, HTTPS). The last four are in [14 Signatures, authentication and communication security](14-signatures-authentication-security.en.md).
<!-- Sources: Apple Notes WEEK12 Internet Security -->

<a id="topic-2"></a>
## 2. The encryption model and keys

### The encryption model

![Slide 08 - Encryption model](assets/13-cryptography/slide-08.png)

Read left to right: Alice uses an encryption method $E$ and key $K$ to turn **plaintext** $P$ into **ciphertext** $C=E_K(P)$ ; Bob uses a decryption method $D$ and the same key to recover it. Trudy in the middle is an intruder: the **passive intruder** at top left just listens, the **active intruder** at top right can also alter messages.

$$
C=E_K(P),\qquad P=D_K(C),\qquad D_K\bigl(E_K(P)\bigr)=P.
$$
<!-- Sources: w11sec p.8-9 -->

### A key selects one encryption out of many

![Slide 10 - Shift cipher example](assets/13-cryptography/slide-10.png)

A **key** is a string that selects one of many potential encryptions. The slide's example replaces each letter with the next one in the alphabet (z wraps to a); the two small tables on the right give the mapping for key 1 and key 4. With key 1 the plaintext `where` becomes `xifsf`; decryption steps back one letter. With key 4, z→d and a→e. The algorithm ("shift forward") stays the same; only the key ("by how many") changes.
<!-- Sources: w11sec p.10 -->

### Kerckhoff's principle and the key space

![Slide 11 - Kerckhoff's principle](assets/13-cryptography/slide-11.png)

**Kerckhoff's principle**: cryptographic algorithms and related functions ( $E$ , $D$ ) are public; only the keys $K$ are secret. The formula at the bottom of the slide says we want

$$
D_{K_1}\bigl(E_{K_2}(P)\bigr)=P\quad\text{if and only if}\quad K_1=K_2,
$$

that is, only the right key unlocks the message. With an $n$-bit key the **key space** has size $2^n$ . Longer keys take more effort to break; keys can be changed as often as needed, while algorithms change rarely.
<!-- Sources: w11sec p.11-12 -->

**Common mistake**: security must not rest on "nobody knows which algorithm I use". Algorithms leak sooner or later; concentrating the secret in a key that can be changed at any time is what makes it dependable. **Note**: the principle is due to Auguste Kerckhoffs, so most English sources write Kerckhoffs's principle; the slides write Kerckhoff.

<a id="topic-3"></a>
## 3. Classical ciphers and one-time pads

### Substitution ciphers

![Slide 13 - Substitution cipher](assets/13-cryptography/slide-13.png)

**Substitution cipher**: each letter or group of letters is replaced systematically by another letter or group. Example 1 is the "next letter" cipher above. Example 2 uses a scrambled alphabet as the key: the top row is the plaintext letter and the bottom row the matching ciphertext letter (a→Q, b→W, c→E, …). To decrypt, look the table up backwards: find the ciphertext letter in the bottom row and read the plaintext letter above it.

**Illustrative example (our own)**: receiving the ciphertext `TQZ`, find T, Q and Z in the bottom row; above them are e, a and t, so the plaintext is `eat`.

The slide's last point names the weakness: a cryptanalyst can break such ciphers using the statistical properties of natural language (e.g. e is the most common letter), because the same plaintext letter always becomes the same ciphertext letter.
<!-- Sources: w11sec p.13 -->

### Transposition ciphers

![Slide 14 - Transposition cipher](assets/13-cryptography/slide-14.png)

**Transposition cipher**: letters are not disguised, only reordered. The key `MEGABUCK` numbers the columns by the alphabetical order of its letters (A = 1, B = 2, C = 3, E = 4…), which is the row of digits `7 4 5 1 2 8 3 6` under the key in the figure. The plaintext is written row by row into 8 columns and read out column by column in the order 1, 2, 3, … The boxed column 1 (the A column) reads `afllskso` from top to bottom, which is exactly the start of the ciphertext `AFLLSKSO`.
<!-- Sources: w11sec p.14 -->

### One-time pads

![Slide 16 - XOR truth table](assets/13-cryptography/slide-16.png)

One-time pads rely on **XOR**: A XOR B means "A or B, but not both". The left table is the truth table; the right table restates it in bits: a data bit and a key bit give 0 when equal and 1 when different. The empty Receiver column on the right is left for the lecture animation: XORing once more with the same key bit restores the original data bit.

![Slide 17 - One-time pad worked example](assets/13-cryptography/slide-17.png)

**One-time pad**: convert the plaintext to a bit string (e.g. via ASCII), take a random bit string as the key, and XOR the two bit by bit. In the figure blue is plaintext and red is the key:

```text
encrypt  plaintext  00110101
         key        11100011
         ciphertext 11010110
decrypt  ciphertext 11010110
         key        11100011
         plaintext  00110101
```
<!-- Sources: w11sec p.15-17 -->

Information theory makes it hard to break. Disadvantages: the key cannot be memorised; the total data that can be sent is limited by the key length; it is sensitive to lost or inserted characters (one slip misaligns everything after it).
<!-- Sources: w11sec p.18 -->

<a id="topic-4"></a>
## 4. Symmetric-key algorithms and cipher modes

Modern key-based algorithms fall into two categories: **symmetric-key algorithms** and **public-key algorithms**. Symmetric-key algorithms use the same key for encryption and decryption and work by permutation, substitution and combinations of both.
<!-- Sources: w11sec p.19; rev1 p.33 -->

### DES and AES

![Slide 20 - DES and AES](assets/13-cryptography/slide-20.png)

The slide gives the block size, key length and key space of the two standard algorithms:

| Algorithm | Block | Key | Key space |
| --- | --- | --- | --- |
| DES (Data Encryption Standard) | 64 bits | 56 bits | $2^{56}$ ; the slide gives Triple DES as $3\times2^{56}$ |
| AES (Advanced Encryption Standard, since the 2000s) | the slide gives 128–256 bits | 128–256 bits | $2^{128}$ to $2^{256}$ ; still substitution and permutation based, with multiple rounds |
<!-- Sources: w11sec p.20 -->

<details markdown="1">
<summary>Extension (optional): the precise version of two figures on the slide</summary>

- **Triple DES key space**: Triple DES uses three 56-bit keys (or two, with one repeated), 168 (or 112) key bits in total, so the key space is $2^{168}$ (or $2^{112}$ ), not $3\times2^{56}$ . Because of the meet-in-the-middle attack, three-key Triple DES has an effective strength of about $2^{112}$ . The slide's $3\times2^{56}$ can only be read as a loose way of saying "DES applied three times".
- **AES block size**: the AES standard fixes the block at 128 bits; the key can be 128, 192 or 256 bits. "128–256-bit blocks" is the design range of its predecessor Rijndael.

</details>

### Why cipher modes are needed

![Slide 21 - Cipher modes](assets/13-cryptography/slide-21.png)

Used directly, DES and AES run in **Electronic Code Book (ECB)** mode: each plaintext block is encrypted independently. The slide names the limitation: **identical plaintext blocks always give identical ciphertext blocks**, so an attacker can spot repetition and even move or swap whole blocks. The four cipher modes listed below solve this, and the next four slides draw each one's structure.
<!-- Sources: w11sec p.21 -->

### Cipher block chaining mode

![Slide 22 - Cipher block chaining](assets/13-cryptography/slide-22.png)

**CBC (Cipher Block Chaining)**: each plaintext block is XORed with the **previous ciphertext block** before encryption; the first block is XORed with a randomly chosen **Initialization Vector (IV)**. Follow the left diagram top to bottom: a plaintext block enters $\oplus$ , then the encryption box E; E's output is both this block's ciphertext and, along the diagonal line, the value XORed into the next plaintext block. So $C_0=E(P_0\oplus IV)$ , $C_1=E(P_1\oplus C_0)$ , … and even if $P_0=P_1$ the ciphertexts differ. Decryption (right) reverses this: the ciphertext goes through the decryption box D first, then is XORed with the previous ciphertext block.
<!-- Sources: w11sec p.22; Apple Notes Review Network Security -->

### Cipher feedback mode

![Slide 23 - Cipher feedback](assets/13-cryptography/slide-23.png)

**CFB (Cipher Feedback)**: encrypts **byte by byte** instead of block by block. At the top of the left diagram, a 64-bit shift register holds the last 8 ciphertext bytes $C_2$ … $C_9$ ; it is encrypted, the leftmost byte is selected and XORed with the plaintext byte $P_{10}$ to give $C_{10}$ , and the return line on the right shifts $C_{10}$ into the register, pushing the oldest byte $C_2$ out. It suits data that does not arrive in whole blocks, such as encrypting keystrokes one at a time. The disadvantage is that a single-bit error has a larger impact: 1 wrong bit in the ciphertext affects 9 bytes of decrypted text (the byte itself plus the 8 bytes while it sits in the register).
<!-- Sources: w11sec p.23 -->

**Common mistake**: compare the two diagrams: the decryption side still uses the encryption box E, not D. CFB uses E only to produce "the byte to XOR with", and XOR is its own inverse, so both sides need only E. Stream cipher mode and counter mode below work the same way.

### Stream cipher mode

![Slide 24 - Stream cipher mode](assets/13-cryptography/slide-24.png)

**Stream cipher mode**: starting from the IV, encrypt repeatedly (each output feeds the next encryption, the thick arrow looping back under E) to generate a sequence of output blocks, the **keystream**. Use the keystream as a one-time pad, XORing it with the plaintext to get the ciphertext. The red box stresses that the keystream is **independent of the data** and can be computed in advance. **Note**: since no ciphertext is fed back, a 1-bit error in the ciphertext affects only the corresponding 1 bit of plaintext, instead of spreading as in CFB.
<!-- Sources: w11sec p.24 -->

### Counter mode

![Slide 25 - Counter mode](assets/13-cryptography/slide-25.png)

**Counter mode**: the plaintext is not encrypted directly; instead the IV plus a constant (IV, IV+1, IV+2, IV+3 from left to right in the figure) is encrypted and the result is XORed with the corresponding plaintext block. Each block depends only on **its own position** (the red "Step based" box).
<!-- Sources: w11sec p.25 -->

**Key point: use counter mode for random access.** If an encrypted file must be accessed in non-sequential order (say, read block 1000 directly), counter mode is best: any block can be encrypted or decrypted on its own from "IV + block number". CBC needs the previous ciphertext block, CFB needs the preceding 8 ciphertext bytes, and stream cipher mode must generate the keystream from the beginning, so none can jump straight to the middle.
<!-- Sources: rev-sol p.1; Apple Notes Review Network Security -->

**Common mistake**: the review answer says CFB depends on the "8 preceding blocks" of ciphertext; according to the diagram on slide 23 it is the 8 preceding ciphertext **bytes** (together exactly one 64-bit block).

| Mode | Unit | Depends on | Suits |
| --- | --- | --- | --- |
| ECB | Block | This block only | Not recommended: identical plaintext gives identical ciphertext |
| CBC | Block | The previous ciphertext block (IV for the first) | General file and message encryption |
| CFB | Byte | The preceding 8 ciphertext bytes | Data arriving byte by byte (e.g. keystrokes) |
| Stream cipher | Bit/byte | A keystream from repeatedly encrypting the IV | Keystream can be precomputed; errors do not spread |
| Counter | Block | IV + block position | Random access |

### The keystream reuse attack

![Slide 26 - Keystream reuse attack](assets/13-cryptography/slide-26.png)

In stream cipher mode and counter mode, if **the same (key, IV) pair is used twice**, both messages use the same keystream $K_0$ . The three middle lines of the slide are the derivation:

$$
(P_0\oplus K_0)\oplus(Q_0\oplus K_0)=P_0\oplus Q_0.
$$

An attacker who XORs the two ciphertexts cancels the keystream and can deduce the plaintexts from $P_0\oplus Q_0$ . Keys and IVs must therefore be chosen independently and at random.
<!-- Sources: w11sec p.26 -->

**Illustrative example (our own)**: two 8-bit messages $P_0=01000001$ and $Q_0=01000010$ mistakenly share the same $K_0$ . XORing the two ciphertexts gives the attacker $00000011$ , which does not involve $K_0$ at all; as soon as one message is guessed (say, a fixed-format header), the other follows directly.

<a id="topic-5"></a>
## 5. Public-key algorithms and RSA

### Asymmetric keys

![Slide 29 - Public-key encryption process](assets/13-cryptography/slide-29.png)

Symmetric-key algorithms require the key to be distributed to every user of the system, which is itself a hard problem. Diffie and Hellman proposed a new model with two keys that are **not easily derivable from each other**: **asymmetric keys**. The red text on the slide pairs the keys with the symbols:

- **Public key** $K_1$ : known to all; anyone can use it to encrypt messages for the key's owner;
- **Private key** $K_2$ : known only to the owner and required for decryption.

$$
C=E_{K_1}(P),\qquad P=D_{K_2}(C),\qquad D_{K_2}\bigl(E_{K_1}(P)\bigr)=P.
$$
<!-- Sources: w11sec p.27-29; rev1 p.34 -->

### RSA key generation

![Slide 30 - RSA key generation](assets/13-cryptography/slide-30.png)

**RSA (Rivest, Shamir, Adleman)** key generation follows the slide's five steps:

1. choose two large primes $p$ and $q$ ;
2. compute $n=p\times q$ and $z=(p-1)\times(q-1)$ ;
3. choose $d$ relatively prime to $z$ (no common factors);
4. find $e$ such that $(d\times e)\bmod z=1$ ;
5. the public key is $(e,n)$ and the private key is $(d,n)$ .

$$
C=P^{e}\bmod n,\qquad P=C^{d}\bmod n.
$$
<!-- Sources: w11sec p.30 -->

### An RSA example

![Slide 31 - RSA example](assets/13-cryptography/slide-31.png)

The top half derives the keys with the five steps: $p=3$ , $q=11$ , so $n=33$ and $z=20$ ; take $d=7$ (no common factor with 20), then $e=3$ ( $7\times3=21$ , $21\bmod20=1$ ). The encryption key is $(3,33)$ and the decryption key $(7,33)$ .

The table below encrypts SUZANNE letter by letter; read each row left to right: letter → number $P$ → $P^3$ → $P^3\bmod33$ gives the ciphertext $C$ → $C^7$ → $C^7\bmod33$ restores the number → letter. Taking the first row: S is the 19th letter, $19^3=6859$ , $6859\bmod33=28$ ; decrypting, $28^7\bmod33=19$ , giving S back.
<!-- Sources: w11sec p.31 -->

**Illustrative example (our own)**: $p=5$ , $q=11$ give $n=55$ and $z=40$ . Take $d=7$ ; from $7e\bmod40=1$ we get $e=23$ ( $7\times23=161=4\times40+1$ ). Encrypt $P=2$ : since $2^{20}\bmod55=1$ , $2^{23}\bmod55=8$ , so $C=8$ . Decrypt $8^7\bmod55$ : $8^2\bmod55=9$ , $8^4\bmod55=26$ , $26\times9\times8=1872$ , $1872\bmod55=2$ , recovered.

When computing $C^d\bmod n$ by hand, do not compute the huge number $C^d$ first: as above, split the exponent into products of squares and reduce modulo $n$ after every multiplication, so the numbers stay small.

### RSA's security and use

![Slide 32 - RSA security and drawback](assets/13-cryptography/slide-32.png)

RSA's security rests on the **difficulty of factoring large numbers**: knowing $n$ but unable to factor it into $p$ and $q$ , an attacker cannot compute $z$ and so cannot derive the private key $d$ . The slides quote about $10^{25}$ years to factor a 500-digit number. Its drawback is speed: it is too slow for encrypting large volumes of data, so it is widely used for other tasks such as **secure key distribution** for symmetric-key algorithms: RSA sends a symmetric session key, and the fast symmetric algorithm then encrypts the data.
<!-- Sources: w11sec p.32 -->

<a id="topic-6"></a>
## 6. Public key management

### Why public keys need managing

![Slide 34 - Man-in-the-middle on public keys](assets/13-cryptography/slide-34.png)

To talk to Bob you first need Bob's public key. Suppose Bob just posts it on his personal web page; following the numbers in the figure: Alice requests Bob's home page (step 1); Trudy intercepts and returns a fake page containing Trudy's own public key $E_T$ (step 2); Alice encrypts her message with $E_T$ (step 3); Trudy decrypts and reads it, then re-encrypts it with Bob's real key $E_B$ and forwards it (step 4). Neither side notices: a **man-in-the-middle attack**.

The slide ends by asking whether a key distribution centre handing out public keys on demand would work. **Note**: such a centre must be online for every request, so it becomes a bottleneck and a single point of failure; the certificates on the next slide let public keys be checked offline and avoid this.
<!-- Sources: w11sec p.34 -->

### Certificates

![Slide 35 - Certificates](assets/13-cryptography/slide-35.png)

A **certificate** binds a public key to the name of a person or company:

- **Certification Authority (CA)**: a trusted intermediary that uses non-electronic identification to verify users before certifying keys and issuing certificates;
- **X.509** defines the format and fields of certificates.

The sample certificate below has two parts: on top, "I hereby certify that the following public key belongs to so-and-so" with that person's details; on the bottom line, a SHA-1 hash of the certificate contents signed with the CA's private key. Anyone holding the CA's public key can check that the certificate has not been altered (signatures are explained in [14 Digital signatures](14-signatures-authentication-security.en.md#topic-1)).
<!-- Sources: w11sec p.35 -->

### Public key infrastructure

![Slide 36 - Public key infrastructure](assets/13-cryptography/slide-36.png)

A **Public Key Infrastructure (PKI)** consists of hierarchically structured certificate authorities, with users, CAs, certificates and directories as components. Look at the tree: the Root certifies regional authorities RA 1 and RA 2, and each RA certifies the CAs below it; the boxes joined by dashed lines on the right are certificate contents, e.g. "RA 2 is approved, its public key is …, Root's signature". To verify CA 5's certificate, walk up the chain: CA 5's certificate is signed by RA 2, RA 2's by the Root, and the Root's public key is preinstalled in the browser, so trust is passed all the way down.
<!-- Sources: w11sec p.36 -->

## Self-check

1. What is the key space of an algorithm with a 64-bit key? How many times larger than DES is it?
2. The same plaintext block appears many times in a file. What can an attacker see under ECB and under CBC?
3. Encrypt the letter B (the 2nd letter) with the slides' RSA key $(3,33)$ and check by decrypting with $(7,33)$ .
4. Two messages are encrypted in counter mode with the same (key, IV) pair by mistake. What does an attacker learn from the two ciphertexts? And if they also know one of the plaintexts?
5. Why is RSA usually used to send a symmetric key rather than to encrypt a whole file?
