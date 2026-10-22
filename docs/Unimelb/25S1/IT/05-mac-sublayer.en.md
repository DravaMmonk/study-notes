# COMP90007 Weeks 4–5 - MAC Sublayer

Sources: `lecture/Week4-Lectures23-MAC.pdf` (MAC Sub-Layer (1)), `lecture/Week5-Lecture1.pdf` (MAC Sub-Layer (2)), `lecture/Week5-Lecture2.pdf` (MAC Sub-Layer (3)); review material `lecture/Week12-Review-handout.pdf` p.19–20; Apple Notes: CS/25S1/IT — "WEEK 4-5 MAC Sub-layer", "WEEK 5 - MAC2 - Multiplexing Methods"; CS/25S1/IT/Review — "MAC Sublayer", "EXAM PREPARATION".

This lecture asks: **when many machines share one broadcast channel, who may send, and when?**

Learning path: [What MAC does and channel allocation](#topic-1) → [Contention protocols: ALOHA and CSMA](#topic-2) → [Collision-free and limited-contention protocols](#topic-3) → [Wireless LANs: MACA](#topic-4) → [Case study: Ethernet](#topic-5).

Key points: the three CSMA variants, binary countdown, hidden/exposed terminals, Ethernet's minimum frame size. Hard parts: why the minimum frame size depends on $2\tau$ . Common mistakes: the Ethernet minimum frame is 64 **bytes**; an exposed terminal is one that "could safely send but holds back", not a collision.

<a id="topic-1"></a>
## 1. What MAC does and channel allocation

### What problem the MAC sublayer solves

![W4MAC slide 02 - Point-to-point vs broadcast networks](assets/05-mac-sublayer/slide-w4mac-02.png)

This slide contrasts two kinds of network. A **point-to-point** link has one fixed sender–receiver pair, so there is no contention over who speaks first; in a **broadcast** network all stations share one channel and everyone receives what one station sends, so transmission rights must be decided. That is the job of the **Medium Access Control (MAC) sublayer**.

![W4MAC slide 03 - MAC sublayer in the OSI stack](assets/05-mac-sublayer/slide-w4mac-03.png)

The figure is the seven-layer OSI model: two hosts at the sides and two routers inside the communication subnet. The red dashed box runs across the bottom of layer 2 (Data link) on every device, just above the physical layer: the MAC sublayer is the **lower part of the data link layer**, and it works on every link and in every device, not only at the two end hosts.
<!-- Sources: w4mac p.2-3; Apple Notes WEEK 4-5 MAC Sub-layer -->

### Static allocation

**Static channel allocation** cuts the channel into fixed segments, one dedicated to each user. The slides give two ways of cutting; the principles are in [02 Multiplexing](02-physical-layer.en.md#topic-4).

![W4MAC slide 06 - Time division multiplexing](assets/05-mac-sublayer/slide-w4mac-06.png)

**Time Division Multiplexing (TDM)**: users 1, 2 and 3 on the left take turns on the same line in a fixed order, producing the cycle 1 2 3 1 2 3 on the time axis; the gap between neighbouring slots is the **guard time**, which keeps consecutive pieces from overlapping. The example is the 2G mobile network.

![W4MAC slide 07 - Frequency division multiplexing](assets/05-mac-sublayer/slide-w4mac-07.png)

**Frequency Division Multiplexing (FDM)**: panel (a) shows three signals that all start in the low band, (b) shifts each to a different band, and (c) places them side by side in one overall FDM channel. Each user keeps its own slice of frequency all the time. Examples are TV and radio, ADSL and 4G.

![W4MAC slide 08 - Why static allocation is inefficient](assets/05-mac-sublayer/slide-w4mac-08.png)

Static allocation suits a fixed number of users, but this slide lists three cases where it is very inefficient: more senders than segments; a changing number of senders; and bursty traffic, while TDM/FDM still give everyone a fixed share that nobody else can use when its owner is idle.
<!-- Sources: w4mac p.4-8; Apple Notes WEEK 4-5 MAC Sub-layer -->

### Assumptions of dynamic allocation

![W4MAC slide 09 - Dynamic allocation assumptions 1–3](assets/05-mac-sublayer/slide-w4mac-09.png)

![W4MAC slide 10 - Dynamic allocation assumptions 4–5](assets/05-mac-sublayer/slide-w4mac-10.png)

**Dynamic channel allocation** lets segmentation and assignment follow demand. Together the two slides list five modelling assumptions:

1. a single channel for all communication;
2. stations generate frames independently;
3. two frames sent at once **collide** and both are damaged;
4. time is either **continuous**, where transmission may start at any instant, or **slotted**, where it may only start at predefined instants;
5. **carrier sense**, where a station checks whether the channel is in use before sending, or no carrier sense, where it simply sends.
<!-- Sources: w4mac p.9-10 -->

The protocols that follow are different combinations of assumptions 4 and 5: ALOHA has no carrier sense and continuous time; slotted ALOHA has no carrier sense and slotted time; CSMA listens first.

<a id="topic-2"></a>
## 2. Contention protocols: ALOHA and CSMA

**Contention** protocols let collisions happen and recover afterwards.

### ALOHA and slotted ALOHA

![W5L1 slide 03 - Pure ALOHA](assets/05-mac-sublayer/slide-w5l1-03.png)

**Pure ALOHA**: send whenever there is data; on a collision or a missing acknowledgement, wait a random time and resend. No central control is needed. Each of the four stations has its own time axis, and the grey areas are collision periods: if two frames overlap in time at all, both are lost. It is efficient at low load but very poor at high load, when collisions soar.
<!-- Sources: w5l1 p.3; Apple Notes WEEK 5 MAC2 -->

![W5L1 slide 04 - Slotted ALOHA](assets/05-mac-sublayer/slide-w5l1-04.png)

**Slotted ALOHA**: stations may only start at the beginning of a slot. Compare the two figures: in pure ALOHA a frame collides if another frame overlaps it even partly; here Slots 1–6 are marked at the bottom and frames must align with slot boundaries, so they either overlap completely (Frames 2.1 and 3.1 in Slot 2, Frames 1.2 and 4.1 in Slot 3) or not at all. The vulnerable period is halved and efficiency improves.
<!-- Sources: w5l1 p.4 -->

### Carrier Sense Multiple Access (CSMA)

![W5L1 slide 06 - Three CSMA variants](assets/05-mac-sublayer/slide-w5l1-06.png)

![W5L1 slide 07 - CSMA flowcharts](assets/05-mac-sublayer/slide-w5l1-07.png)

**CSMA (Carrier Sense Multiple Access)**: when a station has data, it first listens to the channel to detect any active transmission and then decides what to do. The two slides present three variants in words and as flowcharts; they differ in how persistent they are when the channel is busy:

| Protocol | Channel busy | Channel idle | After a collision |
| --- | --- | --- | --- |
| 1-persistent | Keep listening until idle | Send immediately (probability 1) | Wait a random time and repeat |
| Non-persistent | Do not keep listening; wait a random time and check again | Send immediately | Wait a random time and repeat |
| p-persistent | Wait for the next slot | Send with probability $p$ , or defer to the next slot with probability $1-p$ and check again | Wait a random time and repeat |
<!-- Sources: w5l1 p.5-7; rev1 p.20; Apple Notes WEEK 5 MAC2 -->

Follow the red busy/wait loops in the flowcharts: 1-persistent goes straight back to listen while busy and sends the moment the channel is idle; non-persistent goes to a random wait first and then listens again; p-persistent must "pick randomly" even when idle, backing off with probability $1-p$ . The lower halves of all three are the same: after sending, check for a collision, and on a collision wait and start again.

**Why CSMA still collides**: signals take time to propagate. Two stations can hear an idle channel at almost the same moment and both send. 1-persistent is most prone to this, because several stations are waiting for the same idle instant and all send together. The student's notes conclude that a smaller $p$ gives fewer collisions.

![W5L1 slide 08 - CSMA efficiency comparison](assets/05-mac-sublayer/slide-w5l1-08.png)

The horizontal axis is the number of attempts per frame time $G$ (load), and the vertical axis is throughput $S$ (channel utilisation). The two lowest curves are pure and slotted ALOHA; all the CSMA curves lie above them, the less persistent ones (0.01-persistent, non-persistent) do best at high load, and 1-persistent falls off quickly as $G$ grows. The conclusion is the sentence at the bottom: **CSMA outperforms ALOHA, and being less persistent is better under high load**.
<!-- Sources: w5l1 p.8 -->

### CSMA with collision detection

![W5L1 slide 09 - CSMA/CD contention periods](assets/05-mac-sublayer/slide-w5l1-09.png)

**CSMA/CD (Collision Detection)**: listen while sending; as soon as a collision is detected, **abort** the transmission, wait a random time and try again. The channel must therefore be monitored continuously. The time axis falls into three kinds of period: transmission (Frame), contention (the small boxes, i.e. contention slots) and idle. $t_0$ is when the previous frame ends, after which several stations compete in the contention slots; aborting early shrinks the time wasted by a collision from a whole frame to one contention slot. The student's notes add that after detecting a collision the station sends a **jam signal** to alert the others.
<!-- Sources: w5l1 p.9; Apple Notes WEEK 5 MAC2 -->

<a id="topic-3"></a>
## 3. Collision-free and limited-contention protocols

### Bit map protocol

![W5L1 slide 11 - Bit map protocol](assets/05-mac-sublayer/slide-w5l1-11.png)

The **bit map protocol** is reservation-based: there are first $N$ contention slots, one bit per station; station $j$ writes a 1 in slot $j$ if it wants to send. After the contention period every station knows who wants to send, and they transmit in numerical order. In the figure, stations 1, 3 and 7 reserve in the first round of 8 slots, so frames 1, 3 and 7 follow; stations 1 and 5 reserve in the second round, and only station 2 in the third. Collecting transmission rights is separated from transmitting, so no collisions occur. The price is a fixed overhead of $N$ reservation bits per round.
<!-- Sources: w5l1 p.11; Apple Notes WEEK 5 MAC2 -->

### Binary countdown

![W5L1 slide 13 - Binary countdown](assets/05-mac-sublayer/slide-w5l1-13.png)

**Binary countdown**: each station has a binary address, and higher addresses have higher priority. Stations wanting to send broadcast their address bit by bit, high-order bit first, over $\log_2N$ contention slots; the channel takes the **bitwise OR** of the bits sent in each slot. A station that sends 0 but sees 1 knows a higher address is competing and gives up at once.

Check bit times 0–3 on the right of the figure: stations 0010, 0100, 1001 and 1010 compete, and "–" means a station has given up.

| Bit | 0010 | 0100 | 1001 | 1010 | Channel OR | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| Bit 0 | 0 | 0 | 1 | 1 | 1 | 0010 and 0100 send 0, see 1, give up |
| Bit 1 | – | – | 0 | 0 | 0 | Nobody gives up |
| Bit 2 | – | – | 0 | 1 | 1 | 1001 sends 0, sees 1, gives up |
| Bit 3 | – | – | – | 0 | 0 | 1010 sees its full address and wins |
<!-- Sources: w5l1 p.12-13; Apple Notes WEEK 5 MAC2 -->

The student's notes summarise the contention overhead as $O(N)$ bits per round for the bit map and $O(\log_2 N)$ for binary countdown.

### Contention versus collision-free

![W5L1 slide 14 - Contention vs collision-free](assets/05-mac-sublayer/slide-w5l1-14.png)

- **Low load** (few collisions): the fixed overhead of collision-free methods is not worth it, so contention is better;
- **High load**: contention methods suffer too many collisions, so collision-free methods are better.

Each becomes inefficient at a different point, which motivates a compromise.
<!-- Sources: w5l1 p.14 -->

### Limited contention: the adaptive tree walk

![W5L1 slide 15 - Limited contention and success probability](assets/05-mac-sublayer/slide-w5l1-15.png)

**Limited contention** divides stations into groups so that usually only a few stations in a group want to send, cutting the waste from both idle periods and collisions. The curve shows why grouping helps: the horizontal axis is the number of ready stations and the vertical axis is the probability that exactly one station succeeds in a contention slot. With one station the probability is 1; with more it drops quickly to about 0.4 and then barely changes. So we want as few stations competing at once as possible. **Note**: the curve tends to about $1/e\approx0.37$ , the same $e$ that appears in the Ethernet efficiency formula later.

![W5L1 slide 16 - Adaptive tree walk](assets/05-mac-sublayer/slide-w5l1-16.png)

**Adaptive tree walk**: the stations are leaves of a binary tree (A–H), and the internal nodes 1–7 stand for groups. In slot 1 every station (under node 1) may send; on a collision, do a **depth-first search** below the colliding node, letting the left subtree try first and then the right. Walk through the two examples on the right of the figure:

- Example 1 (D and G want to send): slot 1 at node 1, collision; slot 2 at node 2, only D, success; slot 3 at node 3, only G, success.
- Example 2 (B, D, G): slot 1 collision; slot 2 at node 2 (B, D) still collides; slot 3 at node 4, B succeeds; slot 4 at node 5, D succeeds; slot 5 at node 3, G succeeds.

The heavier the load, the lower in the tree the search should start, skipping high nodes that are bound to collide.
<!-- Sources: w5l1 p.15-16; Apple Notes WEEK 5 MAC2 -->

<a id="topic-4"></a>
## 4. Wireless LANs: MACA

![W5L2 slide 03 - Wireless coverage regions](assets/05-mac-sublayer/slide-w5l2-03.png)

Wireless stations each have a coverage region. In the figure the two circles on the left are the ranges of A and C, and D sits in their overlap: if A and C send at once, their signals interfere at D; B is far away and unaffected. So what matters is **detecting transmissions around the receiver**, not just the sender listening to the channel. This leads to the hidden and exposed terminal problems, and to wireless protocols such as 802.11 and MACAW.
<!-- Sources: w5l2 p.3 -->

### Hidden and exposed terminals

![W5L2 slide 04 - Hidden terminals](assets/05-mac-sublayer/slide-w5l2-04.png)

**Hidden terminals**: A and C both want to send to B. The arrow under the figure is one station's radio range: A and C are too far apart to hear each other, so carrier sense tells both the channel is idle, and they collide at B. This loses efficiency and should be prevented.
<!-- Sources: w5l2 p.4 -->

![W5L2 slide 05 - Exposed terminals](assets/05-mac-sublayer/slide-w5l2-05.png)

**Exposed terminals**: B sends to A while C wants to send to D. C can hear B, so carrier sense makes C wait; yet A cannot hear C and D cannot hear B, so both transmissions could proceed safely at once. This concurrency is desirable.
<!-- Sources: w5l2 p.5 -->

**Common mistake**: a hidden terminal "cannot hear the other sender yet collides"; an exposed terminal "can hear the other sender yet would not actually collide". Plain CSMA fails on the first and is over-cautious on the second.

### MACA

![W5L2 slide 07 - MACA RTS and CTS](assets/05-mac-sublayer/slide-w5l2-07.png)

**MACA (Multiple Access with Collision Avoidance)**: the sender asks the receiver to transmit a short control frame; stations near the receiver hear it and know to stay quiet; then the sender transmits the data. The two large circles are the ranges of A's and B's transmitters, and the grey area is where the control frame is heard. A wants to send to B:

1. Left: A sends an **RTS (Request-to-Send)**. C and E, within A's range, hear it and defer, waiting for the CTS;
2. Right: B replies with a **CTS (Clear-to-Send)**. D and E, within B's range, hear it and defer until the data exchange is complete.

C hears only the RTS, not the CTS, so it is not near B and may send as usual (solving the exposed terminal); D hears the CTS and will not interfere at B (solving the hidden terminal). This is what the slide means by "A can send with exposed but no hidden terminals". The student's notes add that IEEE 802.11 (Wi-Fi) uses CSMA/CA with RTS/CTS and ACKs; MACAW, named on the slides, is an improved MACA.
<!-- Sources: w5l2 p.6-7; Apple Notes WEEK 5 MAC2 -->

<a id="topic-5"></a>
## 5. Case study: Ethernet

### Classic Ethernet and the frame format

![W5L2 slide 09 - Classic Ethernet](assets/05-mac-sublayer/slide-w5l2-09.png)

In the figure several computers hang off one Ethernet cable (Ether) through interface cables and transceivers: one shared broadcast channel. Each type of classic Ethernet has a maximum cable length per segment (e.g. 100 m), and segments are joined by **repeaters**, which receive, amplify and retransmit signals in both directions.
<!-- Sources: w5l2 p.9; Apple Notes WEEK 4-5 MAC Sub-layer -->

![W5L2 slide 10 - Ethernet frame format](assets/05-mac-sublayer/slide-w5l2-10.png)

The two points at the top: the MAC protocol is **1-persistent CSMA/CD**; the random wait after a collision comes from **Binary Exponential Backoff (BEB)**: after the $i$-th collision, wait a random number of slots chosen from $0$ to $2^i-1$ . Each further collision doubles the range. In the middle is the IEEE 802.3 frame, left to right:

| Field | Length | Purpose |
| --- | --- | --- |
| Preamble | 7 B | Repeated `10101010`, synchronising sender and receiver clocks |
| Start of Frame | 1 B | Flag byte |
| Destination and source addresses | 6 B + 6 B | Identify receiver and sender |
| Type / Length | 2 B | Which upper-layer process gets the frame |
| Data | 0–1500 B | Payload |
| Pad | 0–46 B | Brings the frame up to the 64-byte minimum |
| CRC | 4 B | 32-bit checksum |
<!-- Sources: w5l2 p.10; Apple Notes WEEK 4-5 MAC Sub-layer -->

### MAC addresses

![W5L2 slide 11 - MAC addressing](assets/05-mac-sublayer/slide-w5l2-11.png)

A **MAC address** uniquely identifies a physical network interface: 48 bits, written in hexadecimal, e.g. `00:02:2D:66:7C:2C`. The conversion table below gives the 4 binary bits for each hex digit, e.g. `2D` = `0010 1101`; 12 hex digits × 4 bits = 48 bits. The student's notes add that the first 24 bits are the **OUI** assigned by IEEE to the manufacturer and the last 24 bits are assigned by the manufacturer.
<!-- Sources: w5l2 p.11; Apple Notes WEEK 4-5 MAC Sub-layer -->

### Minimum frame size

![W5L2 slide 12 - Minimum frame size](assets/05-mac-sublayer/slide-w5l2-12.png)

Let $\tau$ be the time for a signal to propagate across the whole Ethernet. Follow (a)–(d): A starts sending at time 0; just before A's signal arrives, at $\tau-\epsilon$ , B starts too; the collision happens near B; B's noise burst takes about another $\tau$ to get back to A. So **a collision can take up to $2\tau$ to be detected by the sender**. If A finished sending its frame before $2\tau$ , it would never learn the frame was destroyed. Frames must therefore be long enough to take at least $2\tau$ to send, which is the origin of the minimum frame size (64 bytes in classic Ethernet).
<!-- Sources: w5l2 p.12; Apple Notes WEEK 4-5 MAC Sub-layer -->

As a formula: with frame length $F$ and bandwidth $B$ , the sending time is $F/B$ , and we need $F/B\ge2\tau$ , i.e. $F_{\min}=2\tau B$ . So if the bandwidth rises while the segment length stays the same, the minimum frame must grow in proportion; otherwise the segment must be shortened so that $\tau$ shrinks.

**Common mistake**: the student's notes say "minimum 64 bits"; it is 64 **bytes** (512 bits), which is why the Pad field exists.

### Ethernet efficiency

![W5L2 slide 13 - Ethernet channel efficiency](assets/05-mac-sublayer/slide-w5l2-13.png)

$$
\text{Channel Efficiency}=\frac{1}{1+\dfrac{2BLe}{cF}}.
$$

$F$ is the frame length, $B$ the bandwidth, $L$ the cable length, $c$ the propagation speed and $e\approx2.718$ . In the optimal case each frame needs on average $e$ contention slots, each $2\tau=2L/c$ long.
<!-- Sources: w5l2 p.13 -->

- Large $cF$ (long frames) gives high efficiency;
- for a given frame size, raising bandwidth or distance (larger $BL$ ) **lowers** efficiency.

The student's notes express the same idea differently: $E=T_f/(T_f+T_{cont})$ with $T_f=F/B$ and $T_{cont}=e\cdot2T_p$ . The two simplify to the same formula.
<!-- Sources: Apple Notes WEEK 4-5 MAC Sub-layer -->

**Illustrative example (our own)**: 10 Mbps, 2500 m, $c=2\times10^8$ m/s. With the minimum frame $F=512$ bit, $2BLe/(cF)\approx1.33$ and efficiency is about 43%; with a full 1500-byte frame, $F=12\,000$ bit, that term is about 0.057 and efficiency is about 95%. Longer frames spread the contention overhead more thinly.

### Switched Ethernet

![W5L2 slide 14 - Hub vs switch](assets/05-mac-sublayer/slide-w5l2-14.png)

The **hub** on the left wires all lines to a single point, so all devices sit in one CSMA/CD collision domain and still only one can talk at a time; the **switch** on the right has a crossbar inside, so each port is its own collision domain and many ports can forward at once, giving much greater throughput; with full-duplex lines on the ports, CSMA/CD is not needed at all.
<!-- Sources: w5l2 p.14; Apple Notes WEEK 4-5 MAC Sub-layer -->

## Self-check

1. Why does 1-persistent CSMA collide more than non-persistent CSMA under high load?
2. Stations with addresses 0110, 0101 and 0011 compete with binary countdown. Who wins, and at which bit is it decided?
3. After 3 collisions, from what range does a station pick its waiting slots under BEB?
4. If Ethernet speed goes from 10 Mbps to 100 Mbps with the same cable length, by what factor must the minimum frame change, and why?
