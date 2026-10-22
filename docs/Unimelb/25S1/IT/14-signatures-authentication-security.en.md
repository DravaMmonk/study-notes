# COMP90007 Week 12 - Network Security (2): Signatures, Authentication and Communication Security

Sources: `lecture/Week12-Lecture1.pdf` (Network Security (2)), `lecture/Week12-Review-handout.pdf` p.35, `lecture/Week12-Review-1-sample-solution.pdf` p.2 (concepts only); Apple Notes: CS/25S1/IT — "WEEK12 - Internet Security"; CS/25S1/IT/Review — "Network Security".

This lecture asks: **with encryption algorithms in hand, how do we prove that a message really came from someone, confirm that the other party is who we want, and build these tools into real networks?**

Learning path: [Digital signatures and message digests](#topic-1) → [Authentication protocols](#topic-2) → [Communication security: IPsec, firewalls and VPNs](#topic-3) → [Web security: HTTPS](#topic-4).

Key points: the full signing and verification process with message digests, challenge-response, Diffie-Hellman and its man-in-the-middle attack, the two IPsec modes. Hard parts: in authentication protocols, who sends each message and whose key encrypts it. Common mistakes: signing uses the **sender's private key** and verification the sender's public key; encrypting for someone is the opposite, using the **recipient's public key**.

<a id="topic-1"></a>
## 1. Digital signatures and message digests

### What a signature scheme must provide

![Slide 02 - Digital signature requirements](assets/14-signatures-authentication-security/slide-02.png)

**Digital signatures** ensure authenticity, integrity and non-repudiation. The slide lists four requirements, each tagged in brackets with the property it serves:

- the receiver can verify the sender's claimed identity (authenticity);
- the receiver cannot have produced the message themselves (integrity);
- sender and receiver can both verify the message was not altered in transit (integrity);
- the sender cannot deny creating the message contents (non-repudiation).
<!-- Sources: w12sec p.2 -->

### With symmetric keys: a "Big Brother"

![Slide 03 - Signatures with a trusted intermediary](assets/14-signatures-authentication-security/slide-03.png)

With symmetric keys, a trusted intermediary **BB (Big Brother)** must relay every message. In the figure Alice is on the left, BB in the middle and Bob on the right. Alice shares key $K_A$ with BB, and Bob shares $K_B$ :

1. Alice sends BB $A,\ K_A(B,R_A,t,P)$ : recipient B, random number $R_A$ , timestamp $t$ and plaintext $P$ , encrypted with $K_A$ ;
2. BB decrypts and sends Bob $K_B\bigl(A,R_A,t,P,K_{BB}(A,t,P)\bigr)$ .

The final item $K_{BB}(A,t,P)$ is BB's signed "proof": if Alice later denies it, Bob can ask BB to testify. The drawback is that every message must go through this one intermediary.
<!-- Sources: w12sec p.3 -->

### With public-key algorithms

![Slide 04 - Signatures with public keys](assets/14-signatures-authentication-security/slide-04.png)

With a public-key algorithm such as RSA (see [13 Public-key algorithms](13-cryptography.en.md#topic-5)), where $E(D(P))=P$ also holds, follow the four boxes from left to right: Alice applies **her own private key** $D_A$ to $P$ to get the signature $D_A(P)$ ; for secrecy she then encrypts with Bob's public key $E_B$ , so the line carries $E_B\bigl(D_A(P)\bigr)$ . Bob removes the outer layer with his private key $D_B$ to get $D_A(P)$ , then recovers $P$ with **Alice's public key** $E_A$ . Only Alice knows $D_A$ , so she cannot deny signing.
<!-- Sources: w12sec p.4 -->

### Message digests

![Slide 05 - Message digest properties](assets/14-signatures-authentication-security/slide-05.png)

Applying public-key operations to a whole long message is too slow. A **message digest (MD)** uses a **one-way hash function** to turn plaintext of any length into a unique, small, fixed-length bit string. It has four important properties:

1. given $P$ , it is easy to compute $MD(P)$ ;
2. given $MD(P)$ , it is effectively impossible to find $P$ ;
3. given $P$ , no one can find $P'$ such that $MD(P')=MD(P)$ ;
4. changing even a single input bit produces a very different output.
<!-- Sources: w12sec p.5 -->

The bottom of the slide gives the use: Alice sends $P,\ D_A\bigl(MD(P)\bigr)$ . The private-key operation is applied only to the short digest, with no need to encrypt the whole message for authentication; property 3 ensures nobody can reuse the signature on a different message with the same digest.

![Slide 06 - Hash algorithm examples](assets/14-signatures-authentication-security/slide-06.png)

Common secure hash algorithms are SHA-1, SHA-2 and SHA-3; MD5 is known to have significant vulnerabilities (e.g. hash collisions, two different messages with the same digest, which is exactly a violation of property 3). The slide gives the MD5 (32 hex characters, i.e. 128 bits), SHA-1 (40, 160 bits) and SHA-3 (64, 256 bits) values of the string "this is a test": the length is set by the algorithm alone, regardless of input length.
<!-- Sources: w12sec p.6 -->

**Note**: the slides list SHA-1 among the "secure hash algorithms"; practical SHA-1 collisions have since been demonstrated, so new signatures should use SHA-2 or SHA-3.

### The full signing and verification process

Split the use above into each side's steps. Symbols:

| Symbol | Meaning |
| --- | --- |
| A, B | Alice (sender), Bob (receiver) |
| $D_A$ , $E_A$ | Alice's private key, public key |
| $P$ | Plaintext |
| $MD$ | Message digest function |

**Signing (Alice)**:

1. compute the digest of the plaintext, $MD(P)$ ;
2. encrypt the digest with her private key to get the signature $D_A\bigl(MD(P)\bigr)$ ;
3. send $P$ together with the signature to Bob.

**Verification (Bob)**:

1. decrypt the signature with Alice's public key $E_A$ to get $MD(P)$ ;
2. compute $MD(P')$ of the received plaintext $P'$ himself;
3. if $MD(P)=MD(P')$ , the signature is valid and the message is authentic and untampered.
<!-- Sources: w12sec p.5; rev-sol p.2; Apple Notes Review Network Security -->

**Common mistake**: verification uses **Alice's public key**, not Bob's own private key; anyone can verify, but only Alice can sign.

<a id="topic-2"></a>
## 2. Authentication protocols

### The general model of authentication

![Slide 07 - Authentication general model](assets/14-signatures-authentication-security/slide-07.png)

**Authentication** confirms that the communication partner is who it claims to be. The general model: Alice starts by contacting Bob or a trusted intermediary; the two exchange several messages for validation; at the end both are sure they are talking to the right person, and they can also set up a secret **session key** for the upcoming communication. There are two typical methods: a shared secret key, or public-key cryptography. The next four slides cover the shared key (including how to create one when none exists), and the last one covers public keys.
<!-- Sources: w12sec p.7 -->

### Shared secret key: challenge-response

![Slide 08 - Challenge-response](assets/14-signatures-authentication-security/slide-08.png)

Assume Alice and Bob already share a key $K_{AB}$ . $R_A$ and $R_B$ are random numbers chosen by each side, called **challenges**. In the figure the left bar is Alice, the right bar Bob, and each arrow shows the direction of a message:

| Message | Direction | Content | Purpose |
| --- | --- | --- | --- |
| 1 | A → B | $A$ | Claims to be Alice |
| 2 | B → A | $R_B$ | Bob sets a challenge |
| 3 | A → B | $K_{AB}(R_B)$ | Only someone who knows $K_{AB}$ can answer; Bob confirms the other side is Alice |
| 4 | A → B | $R_A$ | Alice sets a challenge |
| 5 | B → A | $K_{AB}(R_A)$ | Alice confirms the other side is Bob |
<!-- Sources: w12sec p.8 -->

Each challenge is a fresh random number, so an attacker who records an old response and **replays** it gets nowhere: the old response answers an old challenge.

### No shared key: Diffie-Hellman key exchange

![Slide 09 - Diffie-Hellman key exchange](assets/14-signatures-authentication-security/slide-09.png)

If Alice and Bob share no key beforehand, they can create one on the spot with **Diffie-Hellman key exchange**. Following the figure's two messages:

1. both agree on two large numbers $n$ and $g$ (which may be public);
2. Alice picks a large secret number $x$ and sends $n,\ g,\ g^x\bmod n$ ;
3. Bob picks a large secret number $y$ and sends $g^y\bmod n$ ;
4. Alice computes $(g^y\bmod n)^x\bmod n$ and Bob computes $(g^x\bmod n)^y\bmod n$ ; both equal $g^{xy}\bmod n$ , the shared secret circled in red in the figure.

An eavesdropper sees $n$ , $g$ , $g^x\bmod n$ and $g^y\bmod n$ , but recovering $x$ or $y$ from these is extremely hard. **Note**: in practice $n$ is a large prime.
<!-- Sources: w12sec p.9 -->

**Illustrative example (our own)**: take $n=23$ , $g=5$ ; Alice picks $x=6$ and Bob $y=15$ . Alice sends $5^6\bmod23=8$ and Bob sends $5^{15}\bmod23=19$ . Alice computes $19^6\bmod23=2$ and Bob computes $8^{15}\bmod23=2$ : the shared secret is 2.

### The man-in-the-middle attack on Diffie-Hellman

![Slide 10 - Man-in-the-middle on Diffie-Hellman](assets/14-signatures-authentication-security/slide-10.png)

The previous slide ends by asking "Is there a way to break this?" This slide answers: Trudy picks her own secret number $z$ and sits in the middle. Follow the four messages: Alice's $g^x$ is intercepted by Trudy (message 1), and Trudy sends $g^z$ to Bob instead (message 2); Trudy also sends $g^z$ to Alice (message 3), and Bob's reply $g^y$ is received by Trudy (message 4). Alice ends up sharing $g^{xz}$ with Trudy and Bob shares $g^{zy}$ with Trudy; each believes they are talking to the other, while every message of the encrypted session is captured, decrypted and forwarded by Trudy. The root cause is that DH by itself **does not authenticate the other party**: Alice has no way to tell whether the $g^y$ she receives really came from Bob.
<!-- Sources: w12sec p.10 -->

### Authentication with public keys

![Slide 11 - Authentication with public keys](assets/14-signatures-authentication-security/slide-11.png)

$E_A$ and $E_B$ are Alice's and Bob's public keys; the PKI directory server hands out certificates for public keys (certificates are in [13 Public key management](13-cryptography.en.md#topic-6)), preventing the impersonation above. By the numbers in the figure:

| Message | Direction | Content | Purpose |
| --- | --- | --- | --- |
| 1–2 | Alice ↔ directory | Request and receive $E_B$ | Get Bob's public key, vouched for by a certificate |
| 3 | A → B | $E_B(A,R_A)$ | Only Bob can open it |
| 4–5 | Bob ↔ directory | Request and receive $E_A$ | Get Alice's public key, vouched for by a certificate |
| 6 | B → A | $E_A(R_A,R_B,K_S)$ | Returns Alice's challenge, proving he could decrypt; also sets challenge $R_B$ and proposes session key $K_S$ |
| 7 | A → B | $K_S(R_B)$ | Answers with the session key, proving she is Alice |
<!-- Sources: w12sec p.11 -->

The difference from DH is that every public key here is vouched for by a certificate, so Trudy cannot pass off her own value as the other party's, as she did in DH.

The review lecture groups common attacks into categories: man-in-the-middle, keystream reuse (see [13 The keystream reuse attack](13-cryptography.en.md#topic-4)), replay and so on. The matching defences in these lectures are certificates, choosing (key, IV) independently at random, and a fresh challenge number every time.
<!-- Sources: rev1 p.35 -->

<a id="topic-3"></a>
## 3. Communication security: IPsec, firewalls and VPNs

### The properties communication security must cover

![Slide 13 - Communication security properties and solutions](assets/14-signatures-authentication-security/slide-13.png)

The five boxes at the top are the five properties from [13 Goals of network security](13-cryptography.en.md#topic-1); communication security has to cover all of them. Below are four solutions: IPsec, firewalls, virtual private networks and HTTPS, covered in turn in the rest of this lecture.
<!-- Sources: w12sec p.13; Apple Notes WEEK12 Internet Security -->

### Which layer IPsec lives in

![Slide 14 - IPsec at the network layer](assets/14-signatures-authentication-security/slide-14.png)

Where should security go? At the application layer, every application has to do it itself; **IPsec (IP Security)** puts it at the **network layer**, so all applications above are protected together. It is a framework allowing multiple services, algorithms and levels of granularity: the main services are confidentiality, data integrity and replay protection, based on symmetric-key cryptography; it is independent of specific algorithms; and it can protect a single TCP connection, all traffic between two hosts, or all traffic between a pair of routers.
<!-- Sources: w12sec p.14 -->

### The two IPsec modes

![Slide 15 - IPsec modes](assets/14-signatures-authentication-security/slide-15.png)

IPsec adds headers for security and integrity control; the figure shows one type, the **ESP (Encapsulating Security Payload)** header. It operates in two modes:

| Mode | Layout (front to back) | Use |
| --- | --- | --- |
| Transport mode | IP header → ESP header → TCP header → payload + padding → authentication (HMAC) | End-to-end communication, e.g. between a client and a server |
| Tunnel mode | new IP header → ESP header → old IP header → TCP header → payload + padding → authentication (HMAC) | Between gateways, e.g. a security gateway or company firewall |

Compare the "Authenticated" arrow above each row and the "Encrypted" arrow below it:

- The **encrypted range** starts after the ESP header: transport mode encrypts the TCP header and payload, leaving the original IP header in the clear so routers forward the packet as usual; tunnel mode also encrypts the original IP header, so outsiders see only the two gateways' addresses in the new IP header.
- The **authenticated range** runs from the ESP header to the end of the payload, one ESP header more than the encrypted range; the leading (new) IP header is covered by neither. The HMAC field at the end is the check value used for authentication.
<!-- Sources: w12sec p.15 -->

**Note**: IPsec has a second header type, AH (Authentication Header), which authenticates without encrypting; the slides cover only ESP.

### What a firewall is

![Slide 16 - Firewall characteristics](assets/14-signatures-authentication-security/slide-16.png)

A **firewall** sits at the network boundary and provides a controlled set of routes between the internal and external networks. Three characteristics: all inbound and outbound traffic must pass through the firewall; only authorised traffic may pass; the firewall itself must be immune to penetration.
<!-- Sources: w12sec p.16 -->

### Where the firewall goes

![Slide 17 - Firewall placement](assets/14-signatures-authentication-security/slide-17.png)

A firewall acts as a **packet filter**, checking for bad packets, e.g. distinguishing regular HTTP from P2P-related HTTP. Look at the figure: the internal hosts on the left are inside the security perimeter (the dashed line through the firewall); the web server and email server sit between the firewall and the outer router, i.e. outside the perimeter. The slide's point is that the best firewall does not cut everything off from the Internet: these servers must be exposed to work, so they sit outside the boundary while the internal network stays behind the firewall.
<!-- Sources: w12sec p.17 -->

### Firewall limitations

![Slide 18 - Firewall limitations](assets/14-signatures-authentication-security/slide-18.png)

There are three limitations: to filter, firewalls inspect transport- and application-layer information, violating protocol layering; applications can still spread viruses through attachments; and they offer no protection against in-house threats (the attacker is already inside the boundary).
<!-- Sources: w12sec p.18 -->

### Virtual private networks

![Slide 19 - Virtual private networks](assets/14-signatures-authentication-security/slide-19.png)

Leasing physical lines between locations that need secure transit is very expensive. A **Virtual Private Network (VPN)** is a virtual layer on top of an IP network that provides secure end-to-end connections over public infrastructure. A common implementation: a firewall at each end of a connection, and **IPsec tunnels** between all pairs of end points (by setting up Security Associations), i.e. the tunnel mode above.
<!-- Sources: w12sec p.19 -->

![Slide 20 - VPN topology](assets/14-signatures-authentication-security/slide-20.png)

The left figure is the reality: the London office, the Paris office, and employees at home and travelling all go through the Internet, joined by tunnels; the right figure is the topology users perceive, as if there were direct private lines between the sites. The infrastructure is transparent to end users, and tunnels can be set up on demand.
<!-- Sources: w12sec p.20 -->

<a id="topic-4"></a>
## 4. Web security: HTTPS

### HTTPS and TLS

![Slide 21 - HTTPS and TLS handshake contents](assets/14-signatures-authentication-security/slide-21.png)

**HTTPS** provides secure communication and data transfer using **TLS (Transport Layer Security)**. The slides expand it as Secure Hypertext Transport Protocol; **Note**: the standard name is Hypertext Transfer Protocol Secure, i.e. "HTTP running over TLS". The TLS handshake first negotiates how to exchange data securely, and the slide lists what the first two messages carry: Client Hello carries the version, the cryptographic algorithms on offer and data compression methods; Server Hello settles the algorithm and carries a session ID, a digital certificate and a public key.

### The TLS handshake

![Slide 22 - TLS handshake](assets/14-signatures-authentication-security/slide-22.png)

The client is on the left and the server on the right; time runs top to bottom:

| Message | Direction | Purpose |
| --- | --- | --- |
| Client Hello | Client → server | Proposes version, algorithms, compression methods |
| Server Hello | Server → client | Chooses the algorithm, presents certificate and public key |
| Client Key Exchange | Client → server | **Note**: sends the material for generating the session key (e.g. encrypted with the server's public key) |
| Client Finished, Server Finished | Both ways | **Note**: each side confirms the handshake matched and switches to the session key |
| Data Exchange | Both ways | Data encrypted with the negotiated session key |
<!-- Sources: w12sec p.21-22; Apple Notes WEEK12 Internet Security -->

The digital certificate the server presents in Server Hello is signed by a CA (see [13 Public key management](13-cryptography.en.md#topic-6)), so the client can confirm the public key really belongs to that server, which closes exactly the kind of man-in-the-middle hole seen in DH.

**Illustrative example (our own)**: tie this lecture and the last together through HTTPS: certificates and public-key algorithms **authenticate** the server and exchange a session key securely; the bulk data is then encrypted with a symmetric algorithm for **confidentiality**; and the message authentication code attached to each record provides **integrity**.

## Self-check

1. Alice wants her message to be both secret and signed. Whose which key should she apply first, and whose which key next? In what order does Bob undo them?
2. In the challenge-response protocol, if Bob always used the same $R_B$ , how could an attacker impersonate Alice?
3. With $n=11$ and $g=2$ , Alice picks $x=3$ and Bob $y=4$ . What values are exchanged, and what is the shared secret?
4. A company wants all traffic between two offices encrypted, without outsiders seeing internal host addresses. Which IPsec mode should it use, and why does the other one not work?
5. A company puts its web server inside the internal network, behind the firewall. By the firewall principles in the slides, what is the problem with this?
