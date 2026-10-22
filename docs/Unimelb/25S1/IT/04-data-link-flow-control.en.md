# COMP90007 Week 4 - Data Link Layer: Flow Control and Link Protocols

Sources: `lecture/Week4-Lectures23-data-link.pdf` (Data Link Layer (3)), review slides `lecture/Week12-Review-handout.pdf` p.16–18; Apple Notes: CS/25S1/IT — "WEEK 4 - Data Link3 - Flow Control", "WEEK 3-4 Data Link Layer" (PPP and AAL5 parts); CS/25S1/IT/Review — "Data Link Layer".

This lecture asks: **when a fast sender meets a slow receiver, and then a channel that loses frames, when may the sender send the next frame?**

Learning path: [What flow control solves](#topic-1) → [Stop-and-wait and link utilisation](#topic-2) → [Sliding windows: Go-Back-N and selective repeat](#topic-3) → [Real data link protocols](#topic-4).

Key points: the stop-and-wait utilisation formula; the difference between the two sliding-window protocols. Hard parts: why stop-and-wait is so inefficient on long, fast links. Common mistakes: the utilisation formula uses $2T_p$ (round trip), not $T_p$ ; the Go-Back-N receive window is 1, and its receiver sends no NAK after an error.

<a id="topic-1"></a>
## 1. What flow control solves

**Flow control** is the strategy that controls when the sender may send the next frame. There are two kinds: **feedback-based**, where the receiver tells the sender whether it may continue, and **rate-based**, where the protocol has a built-in limit on the sending rate. This subject focuses on feedback-based methods.
<!-- Sources: w4dl p.2; rev1 p.16 -->

The slides use three figures to add difficulty step by step; each step adds exactly one real-world problem.

### A very simple protocol: assume an infinitely fast receiver

![Slide 03 - A very simple protocol](assets/04-data-link-flow-control/slide-03.png)

The left vertical line is the sender, with time flowing downwards; the right one is the receiver. The sender sends six frames back to back, and each slanted line is a frame arriving after a propagation delay. The small squares beside the receiver are its buffer: when frames arrive faster than it can process them, the squares pile up. This protocol assumes an infinitely fast receiver and an error-free channel, so no feedback is needed; but the growing pile in the figure is exactly why a slow receiver would be overwhelmed in practice.

### Acknowledged transmission: fast sender, slow receiver

![Slide 04 - Acknowledged transmission](assets/04-data-link-flow-control/slide-04.png)

Now the receiver's buffer is limited. The green dashed lines are **acknowledgements (ACKs)**: after each frame the sender stops and waits until the receiver has processed it and returned an ACK. The receiver thus controls the sending pace by when it returns ACKs; this is feedback-based flow control.

### Noisy channel: frames can be lost or damaged

![Slide 05 - Noisy channel protocol](assets/04-data-link-flow-control/slide-05.png)

Once the channel can lose frames, ACKs alone are not enough. Two new things are needed:

- a **timeout**: if the sender waits too long without an ACK, it assumes the frame (or the ACK) was lost;
- a way to **tell new frames from retransmissions**: if the ACK was lost, the sender sends the same frame again, and the receiver must recognise it as a duplicate rather than deliver it twice. The solution is to number frames with a **sequence number**.
<!-- Sources: w4dl p.3-5; Apple Notes WEEK 4 Data Link3 -->

| Case | Problem | Mechanism needed |
| --- | --- | --- |
| Very simple protocol | Assumes an infinitely fast receiver and an error-free channel | None, but in reality the receiver's buffer is overwhelmed |
| Acknowledged transmission | Fast sender, slow receiver with limited buffer | Acknowledgement (ACK): send the next frame only after an ACK |
| Noisy channel | Frames can be lost entirely or partially | A timeout to decide whether a frame arrived; sequence numbers to tell new frames from retransmissions |

<a id="topic-2"></a>
## 2. Stop-and-wait and link utilisation

### ARQ: acknowledgement, timeout, sequence number

![Slide 06 - Stop-and-wait protocol](assets/04-data-link-flow-control/slide-06.png)

The **stop-and-wait** protocol is a form of **ARQ (Automatic Repeat reQuest)**: it combines the ACK, timeout and sequence number from the previous section, sending one frame, stopping, and sending the next only when its acknowledgement arrives. Read the figure from top to bottom:

1. Frame 0 arrives, the receiver accepts it and returns an ACK, but the ACK is lost (red cross);
2. the sender times out and resends frame 0; the receiver sees sequence number 0 again, knows it is a duplicate, discards it but acknowledges again;
3. frame 1 is corrupted on the way and the receiver ignores it; the sender times out again and resends, and the receiver accepts.

A 1-bit sequence number (alternating 0/1) is enough to tell a new frame from a retransmission.

**Common mistake**: the student's notes list "fast sender vs slow receiver" under stop-and-wait; in the slides that problem belongs to the earlier step, acknowledged transmission. What stop-and-wait adds is handling lost frames on a noisy channel.
<!-- Sources: w4dl p.6; rev1 p.17; Apple Notes WEEK 4 Data Link3 -->

### Link utilisation

![Slide 07 - Link utilisation](assets/04-data-link-flow-control/slide-07.png)

Look at the time axis in the lower half: the sender takes $T_f$ to transmit the frame (dark green bar); the last bit reaches the receiver after $T_p$ ; the ACK's transmission time $T_a$ is usually taken as 0; the ACK returns after another $T_p$ , and only then can the sender send next. One round takes $T_t=T_f+2T_p$ , of which only $T_f$ actually carries data.

$$
U=\frac{T_f}{T_f+2T_p},\qquad T_f=\frac{L}{B}
\quad\Longrightarrow\quad
U=\frac{L}{L+2T_pB}.
$$

$L$ is the frame length (bits), $B$ the bandwidth (bit/s) and $T_p$ the one-way propagation delay.
<!-- Sources: w4dl p.7; Apple Notes WEEK 4 Data Link3 -->

![Slide 08 - Utilisation example](assets/04-data-link-flow-control/slide-08.png)

**Lecture example**: $B=1$ Mbps, $T_p=50$ ms, frame size 10 kb. $T_f=10^4/10^6=10$ ms, $U=10/(10+2\times50)\approx9.09\%$ . In the figure the dark green bar ( $T_f$ ) covers only a small part of the whole axis $T_t$ : for over 90% of the time the link sits idle waiting for acknowledgements, which the student's notes flag as very low efficiency.
<!-- Sources: w4dl p.8; Apple Notes WEEK 4 Data Link3 -->

**Common mistake**: the denominator is $T_f+2T_p$ : the frame must travel there and the ACK must come back. Writing a single $T_p$ overstates the utilisation.

From $U=L/(L+2T_pB)$ : the larger the bandwidth $B$ and the longer the distance ( $T_p$ ), the more stop-and-wait wastes. A satellite link, for instance, has $T_p$ of hundreds of milliseconds, and with short frames the utilisation falls far below 1%. This is the problem sliding windows solve.

<a id="topic-3"></a>
## 3. Sliding windows: Go-Back-N and selective repeat

### What a window means

![Slide 09 - Sending and receiving windows](assets/04-data-link-flow-control/slide-09.png)

- **Sending window**: the set of sequence numbers the sender maintains for frames it is currently allowed to send and that are not yet acknowledged;
- **Receiving window**: the set of sequence numbers the receiver maintains for frames it is currently allowed to accept.

The slide ends by asking for the window size of stop-and-wait: both the sending and receiving windows are 1, so stop-and-wait is a special case of a sliding window.
<!-- Sources: w4dl p.9 -->

![Slide 10 - Stop-and-wait vs sliding window](assets/04-data-link-flow-control/slide-10.png)

Both diagrams cover the same length of time. On the left, each frame costs a full round trip and the link is idle half the time (50%); on the right, the sender keeps sending later frames while waiting for the first acknowledgement, filling the "pipe" and reaching 100% utilisation.
<!-- Sources: w4dl p.10 -->

<details markdown="1">
<summary>Extension (optional): utilisation of a sliding window</summary>

The slides only give the sketch. A common generalisation: with sending window $W$ , at most $W$ frames can be sent in one round of $T_f+2T_p$ , so

$$
U=\min\!\left(1,\ \frac{W\,T_f}{T_f+2T_p}\right).
$$

Reaching utilisation 1 needs $W\ge (T_f+2T_p)/T_f$ . For the lecture example, $W\ge110/10=11$ .

</details>

### Go-Back-N

![Slide 11 - Go-Back-N](assets/04-data-link-flow-control/slide-11.png)

The sender may send up to $N$ frames without waiting for each acknowledgement: **the receive window is 1 and the send window is** $N$ . Follow the figure:

1. frames 0 and 1 arrive normally and the receiver returns Ack0 and Ack1;
2. frame 2 is in error (E). With a receive window of 1, the receiver now accepts only frame 2, so it discards frames 3–8 already on their way (D), and **sends no acknowledgement at all**;
3. when the sender's timer for frame 2 runs out (Timeout interval), it **resends everything from frame 2 on** (2, 3, 4, …), and only then does the receiver start returning Ack2, Ack3, ….

The slide also warns that on low-bandwidth or long-distance links a frame takes a long time to be sent and to arrive; the timeout must allow for this, or frames will be wrongly judged lost.

**Common mistake**: after an error the Go-Back-N receiver stays silent; it does not send a NAK. The student's notes describe this step as "the receiver sends NACK", which does not match the slide. NAKs belong to selective repeat, below.
<!-- Sources: w4dl p.11; Apple Notes WEEK 4 Data Link3 -->

Worked example (my own): with a sending window of 7, the sender has sent frames 0–6 and frame 3 is lost. The receiver discards 4, 5 and 6; when frame 3 times out, the sender resends 3, 4, 5 and 6, four frames, of which 4–6 had already reached the receiver once. This is where Go-Back-N wastes bandwidth.

### Selective repeat

![Slide 12 - Selective repeat](assets/04-data-link-flow-control/slide-12.png)

In **selective repeat**, the receiver accepts any frame within its receiving window. Look at what happens after frame 2 is in error:

1. the receiver still accepts 3, 4 and 5 and keeps them in the data link layer's buffer (Frames buffered by data link layer);
2. the receiver sends a **NAK (negative acknowledgement)** for 2, so the sender resends only frame 2 without waiting for a timeout;
3. once frame 2 arrives, the receiver delivers the buffered 3–5 in order and returns **Ack 5**. This is a **cumulative ack**: the number means "the highest frame received in order", so a single Ack 5 acknowledges 2–5 at once.

The student's notes add that selective repeat times each frame separately and resends only that frame on timeout; the window size is limited by the buffer size, so a larger buffer allows a larger window.
<!-- Sources: w4dl p.12; Apple Notes WEEK 4 Data Link3 -->

### Comparison

![Slide 13 - Go-Back-N vs selective repeat](assets/04-data-link-flow-control/slide-13.png)

The slide puts the difference in what the receiver does after an error; the table lines the two figures up side by side:

| | Go-Back-N | Selective repeat |
| --- | --- | --- |
| Receive window | 1 | Greater than 1 |
| Receiver after an error | Discards all later frames; no ACK until the next in-sequence frame arrives | Buffers the good frames after the error point |
| Retransmission | Everything from the bad frame on | Only the lost or corrupted frames |
| Cost | Wastes bandwidth | Needs receive buffer and more complex logic |
<!-- Sources: w4dl p.13; rev1 p.18 -->

At heart this is a **trade-off between efficient use of bandwidth and buffer space at the data link layer**: a Go-Back-N receiver accepts only the next in-sequence frame and discards everything else, so it needs no buffer; selective repeat keeps the good frames after the error point until the missing frame arrives and then delivers them in order, so it needs a buffer.

<a id="topic-4"></a>
## 4. Real data link protocols

The lecture closes with three real examples: PPP, packets over SONET, and PPP over ADSL.

### PPP

![Slide 15 - PPP frame](assets/04-data-link-flow-control/slide-15.png)

**PPP (Point-to-Point Protocol)** is the standard protocol for carrying packets across links:

- framing: the flag byte `01111110` with byte stuffing (see [03 Framing](03-data-link-framing-and-error-control.en.md#topic-2));
- default service: unnumbered mode, i.e. connectionless unacknowledged service, with the control field fixed at `00000011`;
- error detection: a checksum field (2 or 4 bytes).

Look at the frame format at the bottom; the numbers above the boxes are byte counts. From left to right: Flag (1 byte), Address (1 byte, all 1s), Control (1 byte), Protocol (1 or 2 bytes, which protocol the payload carries, e.g. IP), Payload (variable, the IP packet), Checksum (2 or 4 bytes), Flag.
<!-- Sources: w4dl p.14-15; Apple Notes WEEK 3-4 Data Link Layer -->

### Packet over SONET

![Slide 16 - Packet over SONET](assets/04-data-link-flow-control/slide-16.png)

IP packets carried over **SONET (Synchronous Optical NETwork)** use PPP for framing. The left diagram is the protocol stack between two routers: IP / PPP / SONET, with optical fibre in between; the right diagram shows that PPP frames and SONET payloads need not line up, so one PPP frame may be split across two SONET payloads.
<!-- Sources: w4dl p.16 -->

### ADSL

![Slide 17 - ADSL protocol stacks](assets/04-data-link-flow-control/slide-17.png)

**ADSL** provides broadband Internet over telephone lines, from the modem in the customer's home to the **DSLAM** at the ISP. Look at the protocol stacks on both sides: the PC connects to the DSL modem over Ethernet; IP packets go into PPP, then through AAL5 and ATM, and finally out over the ADSL physical layer along the local loop to the ISP's DSLAM and on to the Internet.

**Common mistake**: the student's notes describe ADSL as "dial-up". ADSL does run over phone lines, but it is always-on broadband using frequencies above the voice band; dial-up occupies the voice band, so the phone cannot be used while online.
<!-- Sources: w4dl p.17; Apple Notes WEEK 2 Reference Models -->

![Slide 18 - AAL5 frame](assets/04-data-link-flow-control/slide-18.png)

ATM uses short, fixed-size **cells**: 53 bytes = a 5-byte header + a 48-byte payload, and each cell carries a virtual circuit identifier. A PPP frame is first converted to an AAL5 frame (PPPoA): in the Structure of AAL5 frame diagram, the PPP protocol field and PPP payload come first (the AAL5 payload), followed by padding (Pad, 0–47 bytes, so the total is a multiple of 48) and the AAL5 trailer (Unused, Length, CRC). The whole AAL5 frame is then cut into 48-byte pieces, each given a 5-byte header to become one ATM cell.
<!-- Sources: w4dl p.18; Apple Notes WEEK 3-4 Data Link Layer -->

## Self-check

1. A satellite link has $T_p=270$ ms, bandwidth 1 Mbps and 1000-bit frames. What is the stop-and-wait utilisation? How large must the window be for utilisation close to 1?
2. Why does a Go-Back-N receiver need no buffer while selective repeat does?
3. In selective repeat, frame 4 is in error and frames 5–7 arrive correctly. Which NAK and cumulative acknowledgement does the receiver send?
4. Which of the three data link services is PPP's default service? Why can its control field be fixed?
