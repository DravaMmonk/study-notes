# COMP90007 Weeks 3–4 - Data Link Layer: Framing and Error Control

Sources: `lecture/Week3-data-link-1.pdf` (Data Link Layer (1)), `lecture/Week4-Lecture1.pdf` (Data Link Layer (2)); `lecture/Week12-Review-handout.pdf` p.12–15. Apple Notes: CS/25S1/IT — "WEEK 3-4 Data Link Layer", "WEEK 4 - Data Link2 - Error Control"; CS/25S1/IT/Review — "Data Link Layer", "EXAM PREPARATION".

This lecture asks: **the physical layer only delivers a stream of possibly corrupted bits; how do two adjacent machines cut it into meaningful frames, and detect or even correct the errors in it?**

Learning path: [Duties and services](#topic-1) → [Framing](#topic-2) → [Hamming distance: the limits of detection and correction](#topic-3) → [Error-detecting codes](#topic-4) → [Error correction and the trade-off](#topic-5).

Key points: the three framing methods, the two Hamming-distance bounds, hand calculation of CRC and Hamming codes. Hard parts: modulo-2 division in CRC. Common mistakes: detection needs distance $d+1$ , correction needs $2d+1$ ; the Internet checksum adds overflow bits back into the low end and then complements.

<a id="topic-1"></a>
## 1. Duties and services of the data link layer

### Where it sits in the model

![W3DL slide 02 - Overview of the data link layer](assets/03-data-link-framing-and-error-control/slide-w3dl-02.png)

The highlighted layer in the hybrid model on the right is the data link layer. It corresponds to OSI layer 2; TCP/IP has no separate layer for it and folds it together with the physical layer into host-to-network. The data link layer provides **reliable, efficient communication of "frames" between two adjacent machines**, handling transmission errors and flow control. Its three functions (p.4) are: a well-defined service interface to the network layer, handling transmission errors, and regulating data flow.
<!-- Sources: w3dl p.2, p.4; rev1 p.12 -->

![W3DL slide 03 - Typical implementation](assets/03-data-link-framing-and-error-control/slide-w3dl-03.png)

Look at the two Link boxes inside the circle: the link layer is implemented partly in the operating system's driver and partly in the network interface card (NIC) hardware; only below the NIC come the PHY and the cable.

![W3DL slide 05 - Packets and frames](assets/03-data-link-framing-and-error-control/slide-w3dl-05.png)

Look at the middle row: the packet handed down by the network layer is placed in the frame's payload field, with a header in front and a trailer behind. The dashed path at the top is the virtual data path between the two link layers; the real data travels through the physical layer below (actual data path), and the receiver unpacks in reverse.
<!-- Sources: w3dl p.3, p.5; Apple Notes WEEK 3-4 Data Link Layer -->

### Three services

Services are classified by two questions (p.6): is a connection set up before sending? Does the receiver send back an acknowledgement? From these, p.7 lists three services, and the next three slides take one each.

![W3DL slide 08 - Unacknowledged connectionless service](assets/03-data-link-framing-and-error-control/slide-w3dl-08.png)

**Unacknowledged connectionless**: the sender just sends independent frames, with no connection and no acknowledgement from the receiver; lost frames are not recovered at this layer but left to higher layers. Used in Ethernet LANs and real-time audio/video.

![W3DL slide 09 - Acknowledged connectionless service](assets/03-data-link-framing-and-error-control/slide-w3dl-09.png)

**Acknowledged connectionless**: still no connection, but each frame is acknowledged individually and retransmitted if lost or erroneous. Used in wireless 802.11 Wi-Fi.

![W3DL slide 10 - Acknowledged connection-oriented service](assets/03-data-link-framing-and-error-control/slide-w3dl-10.png)

**Acknowledged connection-oriented**: a connection is established first (negotiating rate and other details), frames are numbered, counted and acknowledged with order enforced, and the connection is released at the end. Used on unreliable links such as satellite channels. Side by side:

| Service | Connection | Acknowledgement | Typical use |
| --- | --- | --- | --- |
| Unacknowledged connectionless | None established or released | None; lost frames are not recovered or are left to higher layers | Ethernet LANs; real-time audio/video |
| Acknowledged connectionless | None established or released | Each frame acknowledged individually and retransmitted if lost or erroneous | Wireless 802.11 Wi-Fi |
| Acknowledged connection-oriented | Established then released (rate and details negotiated) | Frames numbered, counted and acknowledged, with order enforced | Unreliable links such as satellite channels |
<!-- Sources: w3dl p.6-10; Apple Notes WEEK 3-4 Data Link Layer -->

**Illustrative example (our own)**: Ethernet cables rarely corrupt data, so acknowledging every frame would be wasteful; errors are left to higher layers such as TCP. Wi-Fi's radio environment has many errors, so retransmitting locally at the link layer pays off.

<a id="topic-2"></a>
## 2. Framing

### Why frame at all

![W3DL slide 11 - Framing and checksums](assets/03-data-link-framing-and-error-control/slide-w3dl-11.png)

**Framing** breaks the raw bit stream into discrete units, with the aim of providing some reliability over the unreliable physical layer. In the picture, the sender computes a check value $T_S=f(D)$ over data $D$ and sends it right after $D$ ; the receiver recomputes $T_R=f(D')$ over the received $D'$ and compares it with the received $T_S'$ ; a mismatch reveals an error. To do this, the receiver must first know where each frame starts and ends.
<!-- Sources: w3dl p.11 -->

The slides list three methods; most protocols combine character count with one other method:

### Character count

![W3DL slide 13 - Character count](assets/03-data-link-framing-and-error-control/slide-w3dl-13.png)

A field in the frame header states how many characters (bytes) the frame contains; the red boxes mark these counts (the count byte itself is included). The top row has no error: the counts 5, 5, 8, 8 cut out four frames. In the bottom row the second frame's count 5 is corrupted to 7, so the receiver cuts by 7 and takes the `1` that really belongs to the third frame as the next count (Now a byte count); every later frame boundary is misaligned, with no way to resynchronise. This is the fatal weakness of character count on its own.
<!-- Sources: w3dl p.13 -->

### Flag bytes with byte stuffing

![W3DL slide 14 - Byte stuffing](assets/03-data-link-framing-and-error-control/slide-w3dl-14.png)

The top half (a) is the frame format: each frame starts and ends with a special **flag byte (FLAG)**. If a byte equal to FLAG happens to occur in the data, an escape byte ESC is inserted before it; if ESC itself occurs in the data, another ESC is inserted before it. Look at the four examples in (b) at the bottom: original characters on the left, stuffed bytes on the right. Whenever the receiver meets ESC, it treats the following byte as ordinary data. This is **byte stuffing**.
<!-- Sources: w3dl p.14; Apple Notes WEEK 3-4 Data Link Layer -->

### Start and end flags with bit stuffing

![W3DL slide 15 - Bit stuffing](assets/03-data-link-framing-and-error-control/slide-w3dl-15.png)

A frame may contain any number of bits, and each frame begins and ends with the bit pattern `01111110`. To keep this pattern out of the data, the sender **inserts a 0 after every five consecutive 1s**; the receiver deletes any 0 that follows five 1s. Compare (a) the original data, (b) the sent data with the three stuffed bits marked by arrows, and (c) the result after destuffing at the receiver; (a) and (c) are identical.
<!-- Sources: w3dl p.15 -->

**Common mistake**: slide p.16 asks whether a 0 must be inserted into `0111110111`. It must. The rule only looks at whether five consecutive 1s have occurred, regardless of the sixth bit; bits 2–6 are already five 1s, so `01111100111` is sent. The receiver's rule is symmetric: a 0 after five 1s is always deleted, so even when the next bit is already 0 an extra 0 must be stuffed, or the receiver would delete a genuine data 0.
<!-- Sources: w3dl p.16 -->

<a id="topic-3"></a>
## 3. Hamming distance: the limits of detection and correction

### Kinds of error

**Error control** adds check bits to a message so that the receiver does not mistake a message corrupted by the physical layer for the original. There are two routes: detect the error and retransmit, or correct it directly.

![W3DL slide 18 - Burst error](assets/03-data-link-framing-and-error-control/slide-w3dl-18.png)

Compare the two rows: the top is what was sent, the bottom what was received, and the blue cells are the corrupted bits.

- **Single-bit error**: only one bit flips;
- **Burst error**: two or more bits change. In the figure, the 8 bits from the first to the last corrupted bit form the burst length, and some bits in between are still correct. Burst errors are easier to detect (big changes) but harder to resolve.
<!-- Sources: w3dl p.17-18; Apple Notes WEEK 4 Data Link2 -->

![W3DL slide 19 - Encoder and decoder](assets/03-data-link-framing-and-error-control/slide-w3dl-19.png)

On the left, the sender's encoder uses a generator to compute redundancy for the message; "message and redundancy" crosses the unreliable transmission to the right, where the receiver's decoder uses a checker to decide whether to correct or discard before passing the message up. A good mechanism is fast with low computational overhead, adds as few extra bits as possible, and detects many kinds of error. Resolution must happen before data is handed to the network layer.
<!-- Sources: w3dl p.19 -->

### A simple example: repeat three times

![W3DL slide 20 - Repetition code example](assets/03-data-link-framing-and-error-control/slide-w3dl-20.png)

The slide encodes 0 as `000` and 1 as `111`, then asks for the overhead, how many errors can be detected and corrected, and how many errors make the algorithm fail. In turn: each data bit costs 2 extra bits, a 200% overhead. After receiving three bits:

- if the three bits disagree, an error is known, so 1 or 2 bit errors are **detected**;
- majority voting **corrects** a 1-bit error;
- a 2-bit error is "corrected" to the wrong value (e.g. `000` becomes `110` and is corrected to 1), and a 3-bit error turns into the other valid codeword and is not detected at all.
<!-- Sources: w3dl p.20 -->

### Hamming distance and the two bounds

![W3DL slide 21 - Hamming distance](assets/03-data-link-framing-and-error-control/slide-w3dl-21.png)

A code turns $n$ data bits into **codewords** of $n+k$ bits. The **Hamming distance** is the minimum number of bit flips needed to turn one valid codeword into another valid codeword. The bottom of the slide gives two bounds:

$$
\text{detect }d\text{ errors: distance}\ \ge d+1,\qquad
\text{correct }d\text{ errors: distance}\ \ge 2d+1.
$$
<!-- Sources: w3dl p.21; rev1 p.14 -->

![W3DL slide 22 - Detection bound](assets/03-data-link-framing-and-error-control/slide-w3dl-22.png)

![W3DL slide 23 - Correction bound](assets/03-data-link-framing-and-error-control/slide-w3dl-23.png)

The two slides explain the two bounds:

- **Why $d+1$ detects $d$ errors** (p.22): detection relies on receiving an invalid codeword. With at most $d$ flips you cannot reach another valid codeword; with more than $d$ you may land exactly on one.
- **Why $2d+1$ corrects $d$ errors** (p.23): correction maps the received word to the nearest valid codeword. With at most $d$ flips the original is still nearest; with more, the received word may be closer to a different valid codeword.
<!-- Sources: w3dl p.22-23 -->

**Lecture example**: the four 10-bit codewords on p.21, `0000000000`, `0000011111`, `1111100000`, `1111111111`, differ pairwise in at least 5 bits, so the distance is 5. This detects up to 4 errors and corrects up to 2. At the bottom of p.23: sending `0000000000` with 2 flips as `1100000000` is still nearest the original and is corrected; with 3 flips as `1110000000` the nearest is `1111100000`, a wrong correction. The student's notes record the same "distance 5: detect 4, correct 2".
<!-- Sources: w3dl p.21-23; Apple Notes WEEK 4 Data Link2 -->

**Illustrative example (our own)**: `1110000011` is received. Its distances to the four codewords are 5, 6, 4 and 5; it is not a valid codeword, so the receiver **can detect** an error. But if `0000011111` had been sent, 6 bits are wrong, beyond the guaranteed range, so detection worked only by luck; correction would map it to the nearest `1111100000`, which is wrong.

<a id="topic-4"></a>
## 4. Error-detecting codes: parity, checksum and CRC

### Parity bit

![W4L1 slide 03 - Parity bit](assets/03-data-link-framing-and-error-control/slide-w4l1-03.png)

Count the 1s in the data and append one bit to make the total even (even parity) or odd (odd parity). The slide's data `10001110` has four 1s: even parity sends `100011100`, odd parity sends `100011101`.

Parity has Hamming distance 2, so it detects $2-1=1$ bit error and corrects $(2-1)/2=\frac12$ bit, i.e. not even one.
<!-- Sources: w4l1 p.3; Apple Notes WEEK 4 Data Link2 -->

### Internet checksum

![W4L1 slide 05 - Checksum example](assets/03-data-link-framing-and-error-control/slide-w4l1-05.png)

A **checksum** is a group of check bits. The Internet checksum (p.4) works on 16-bit words: add all words modulo $2^{16}$ , **adding any overflow from the high-order end back into the low-order bits** (end-around carry), then take the one's complement as the checksum. The receiver adds all words together with the checksum; only an all-1s result means no error was found.

The slide demonstrates with 5-bit words; read it in the circled order 1→2→3→4. In step 2, `10111 + 11001` overflows to 6 bits, and the top 1 is added back into the lowest bit to give `10001`; in step 4 the complement of `11100` gives the checksum `00011`, which is appended to the data:

```text
00110 + 10001          = 10111
10111 + 11001          = 1 10000  -> wrap: 10000 + 1 = 10001
10001 + 01011          = 11100
checksum = one's complement of 11100 = 00011
sent: 00110 10001 11001 01011 00011
```
<!-- Sources: w4l1 p.4-5; Apple Notes WEEK 4 Data Link2 -->

**Common mistake**: the overflow bit must not be dropped; it is added back into the lowest bit, and the last step is a complement. The student's note `10111+11001=110000 -> 110001` misses the step of removing the top bit; the correct result is `10001`.

### Cyclic redundancy check (CRC)

![W4L1 slide 06 - CRC steps](assets/03-data-link-framing-and-error-control/slide-w4l1-06.png)

**CRC** treats a bit string as a polynomial with 0/1 coefficients and performs modulo-2 division (addition and subtraction are both XOR) by an agreed **generator polynomial** $G(x)$ . The slide's steps, with $r$ the degree of $G(x)$ :

1. append $r$ zeros to the data $M(x)$ , giving $x^rM(x)$ ;
2. divide the bit string of $x^rM(x)$ by that of $G(x)$ using modulo-2 division;
3. subtract the remainder (at most $r$ bits) from $x^rM(x)$ modulo 2, which amounts to replacing the appended zeros with the remainder;
4. the result $T(x)$ is the frame sent. The receiver divides by the same $G(x)$ and accepts only a zero remainder.
<!-- Sources: w4l1 p.6; Apple Notes WEEK 4 Data Link2 -->

![W4L1 slide 07 - CRC example](assets/03-data-link-framing-and-error-control/slide-w4l1-07.png)

Lecture example: data `1101001`, $G(x)=x^4+x+1$ i.e. `10011`, degree 4, so four zeros (the blue `0000`) are appended. Follow the XOR line by line: `10011` is subtracted only when the current leading bit is 1, and the red vertical lines show the next bits being "brought down". The boxed remainder is `0101`, and `11010010101` is sent.
<!-- Sources: w4l1 p.7; rev1 p.15 -->

**Illustrative example (our own)**: data `101101`, $G(x)=x^3+x+1$ i.e. `1011`; append three zeros:

```text
101101000
1011            <- bit 0 is 1, XOR
000001000
     1011       <- bit 5 is 1, XOR
000000011       remainder = 011
sent: 101101011
```

The receiver divides `101101011` by `1011`, gets remainder `000`, and accepts it.

![W4L1 slide 08 - Error detection codes](assets/03-data-link-framing-and-error-control/slide-w4l1-08.png)

This slide compares the Hamming distances of the three detecting codes: parity (1 bit) is 2; Internet checksum (16 bits) is 2; the standard 32-bit CRC is 4. By the bounds in the previous section, CRC guarantees detecting 3-bit errors while the other two guarantee only 1; CRC is also especially good at catching burst errors.
<!-- Sources: w4l1 p.8 -->

<a id="topic-5"></a>
## 5. Error correction and the trade-off

### Error correction: the Hamming code

![W4L1 slide 09 - Hamming code](assets/03-data-link-framing-and-error-control/slide-w4l1-09.png)

$n$ data bits need at least $k$ check bits such that

$$
2^k-k-1\ \ge\ n.
$$

The slide's example is 4 data bits: with $k=3$ , $2^3-3-1=4\ge4$ , so 3 check bits are needed and the codeword has 7 bits.
<!-- Sources: w4l1 p.9 -->

**Illustrative example (our own)**: for 8 data bits, $k=3$ protects only 4 bits, which is not enough; with $k=4$ , $2^4-4-1=11\ge8$ , so 4 check bits are needed and the codeword has 12 bits.

Placement rule: check bits go in **power-of-two positions** (1, 2, 4, …) and data fills the rest. The check bit at position $p$ covers every position whose binary expansion contains $p$ :

| Check bit | Positions covered |
| --- | --- |
| P1 | 1, 3, 5, 7 |
| P2 | 2, 3, 6, 7 |
| P4 | 4, 5, 6, 7 |
<!-- Sources: w4l1 p.9-10 -->

![W4L1 slide 10 - Hamming code example](assets/03-data-link-framing-and-error-control/slide-w4l1-10.png)

Lecture example (even parity): in the table at the top, the circles, dashed boxes and yellow box mark the positions covered by P1, P2 and P4. Data `0101` goes into positions 3, 5, 6, 7, giving P1 = 0, P2 = 1, P4 = 0, so `0100101` is sent. Two receiver examples sit at the bottom: in Example 1 on the left, all three checks fail (the × at the end of each line), so the error is at $1+2+4=7$ ; in Example 2 on the right, only the P2 group fails, meaning the check bit P2 itself is wrong. **Adding the numbers of the failing check bits gives the position of the erroneous bit.**
<!-- Sources: w4l1 p.10; Apple Notes WEEK 4 Data Link2 -->

**Illustrative example (our own)**: data `1011` fills P3=1, P5=0, P6=1, P7=1. P1: $1+0+1$ is even, P1 = 0; P2: $1+1+1$ is odd, P2 = 1; P4: $0+1+1$ is even, P4 = 0. Send `0110011`. If bit 5 flips, `0110111` arrives: the P1 group $0+1+1+1=3$ fails, the P2 group $1+1+1+1=4$ passes, the P4 group $0+1+1+1=3$ fails, so the error is at $1+4=5$ ; flip it back.

### Detect or correct?

![W4L1 slide 11 - Error control discussion](assets/03-data-link-framing-and-error-control/slide-w4l1-11.png)

- **Correction** is more efficient on noisy media such as wireless, because a retransmission is itself likely to be corrupted;
- **Detection plus retransmission** is more efficient on low-error media such as quality copper or fibre, because it needs fewer extra bits;
- both assume that no more than a certain number of errors occur, and errors can hit the check bits too.
<!-- Sources: w4l1 p.11 -->

## Self-check

1. Using bit stuffing, write the bit string actually sent for `0111111111110`.
2. A code has Hamming distance 7. How many errors can it detect, and how many can it correct?
3. Compute the CRC of data `110101` with $G(x)=x^3+1$ (`1001`) and write the frame sent; if the last bit flips in transit, how does the receiver notice?
4. Data `1100` is sent with an even-parity Hamming code. If bit 6 flips in transit, which check groups fail at the receiver?
