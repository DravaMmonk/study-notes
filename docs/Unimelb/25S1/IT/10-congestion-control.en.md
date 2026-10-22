# COMP90007 Week 9 - Quality of Service and Congestion Control

Sources: `lecture/Week9-Transport Layer-Lectures2and3.pdf` (Transport Layer (3), printed slide numbers 57–72), `lecture/Week12-Review-Lecture3.pdf` p.12–16 (p.12–14 repeat lecture pages; p.15–16 are review questions, used for concepts only); Apple Notes: CS/25S1/IT — "WEEK9 - Transport4 - Congestion Control"; CS/25S1/IT/Review — "Transport Layer".

This lecture asks: **why does a network become "busier but less useful" when too many senders push data into it at once, and how does TCP sense this and adjust its sending rate?**

Learning path: [Quality of service and congestion](#topic-1) → [Flow control and congestion control](#topic-2) → [TCP slow start and additive increase](#topic-3) → [TCP Tahoe and Reno](#topic-4).

Key points: taking the minimum of the two windows, how the slow start threshold is updated, the difference between Tahoe and Reno. Hard parts: computing the congestion window RTT by RTT by hand. Common mistakes: slow start actually grows exponentially; after a loss the new threshold is "half the congestion window at the time of loss", not half the old threshold.

<a id="topic-1"></a>
## 1. Quality of service and congestion

### Four measures of quality of service

![Slide 03 - Quality of service measures](assets/10-congestion-control/slide-03.png)

Many network applications judge success by the network performance they expect. **Quality of Service (QoS)** concerns the four things the slide lists:

| Measure | Meaning |
| --- | --- |
| Bandwidth | How much data can be carried per second |
| Loss | Packets dropped or not delivered |
| Delay | How long data takes to reach its destination |
| Jitter | Variation in delay between packets |
<!-- Sources: w9tl p.3; Apple Notes WEEK9 Transport4 -->

### Network congestion

![Slide 04 - Network congestion](assets/10-congestion-control/slide-04.png)

**Congestion** happens when demand for network resources exceeds the available capacity and performance degrades. The slide maps the consequences onto the measures above:

- router queues fill up, so delay and jitter rise;
- routers start dropping packets, so loss rises;
- **goodput** falls, because overhead and retransmissions increase. Goodput is the number of **useful** packets delivered per unit time.
<!-- Sources: w9tl p.4 -->

### The effect of congestion: the goodput curve

![Slide 05 - Goodput vs offered load](assets/10-congestion-control/slide-05.png)

The horizontal axis is the load offered to the network and the vertical axis is goodput. The ideal curve stays flat once it reaches network capacity; the "desirable response" approaches capacity smoothly; but in practice the curve may slide downwards past the onset of congestion until **congestion collapse**: the network is busy carrying retransmissions and packets that will be dropped anyway, and almost nothing useful gets through.
<!-- Sources: w9tl p.5; rev2 p.12 -->

<a id="topic-2"></a>
## 2. Flow control and congestion control

### The general approach to congestion control

![Slide 06 - Congestion control approach](assets/10-congestion-control/slide-06.png)

**Congestion control** in the transport layer aims to stop too much traffic from entering the network. The general approach has two steps: detect congestion from **feedback** given by the network (such as packet loss), and respond by adjusting the **rate** at which the sender injects data, so the network is not overloaded.
<!-- Sources: w9tl p.6; Apple Notes WEEK9 Transport4 -->

### The two kinds of control protect different things

![Slide 07 - Flow control vs congestion control definitions](assets/10-congestion-control/slide-07.png)

Both limit the sending rate, but the slide stresses their different scope: flow control looks only at one sender–receiver pair and keeps the receiver from being overwhelmed; congestion control asks whether the network can carry the traffic, and is "global", taking into account the state of the whole path between sender and receiver, including routers and switches.

| | Flow control | Congestion control |
| --- | --- | --- |
| Protects | The receiver's buffer | The network's capacity |
| Scope | Between sender and receiver | Global: the whole path |
| Consequence of ignoring it | Receive buffer overflows | The sender sends too hard for the network to cope |
<!-- Sources: w9tl p.7; Apple Notes Review Transport Layer -->

![Slide 08 - Tap and bucket analogy](assets/10-congestion-control/slide-08.png)

Left: the pipe is wide but the small receiving bucket cannot hold the water; this is the problem **flow control** solves. Right: the bucket is large but the pipe is blocked inside (internal congestion); this is the problem **congestion control** solves. In both cases the tap must be turned down, but for different reasons.
<!-- Sources: w9tl p.8 -->

### TCP's sending rate

![Slide 09 - Sending rate in TCP](assets/10-congestion-control/slide-09.png)

When adjusting its rate, TCP considers both network capacity and receiver capacity, so the sender maintains **two windows**:

- the **flow control window**: the size of the receiver's buffer (the Window field in the TCP header, see [09 window management](09-transport-layer-udp-tcp.en.md#topic-5));
- the **congestion window (cwnd)**: how many bytes the sender may have in the network (unacknowledged) at any moment.

$$
\text{maximum in flight}=\min(\text{flow control window},\ \text{congestion window}).
$$
<!-- Sources: w9tl p.9 -->

**Worked example (my own)**: if the receiver advertises 16 KB and the congestion window is 10 KB, at most 10 KB of unacknowledged data may be in flight, so the limit comes from the network; if the congestion window grows to 20 KB, the limit becomes the receiver's 16 KB.

<a id="topic-3"></a>
## 3. TCP slow start and additive increase

### The congestion signal

![Slide 10 - Congestion control of TCP](assets/10-congestion-control/slide-10.png)

TCP adjusts its rate using a congestion signal from the network layer. The signal is **packet loss**, detected through a **timeout** or **duplicate acknowledgements**, and TCP assumes the loss was caused by congestion. The congestion window follows the **Additive Increase Multiplicative Decrease (AIMD)** control law. The last two lines of the slide preview the two versions in this lecture: Tahoe is "slow start + additive increase", and Reno is "Tahoe + fast recovery".
<!-- Sources: w9tl p.10 -->

<details markdown="1"><summary>Extension (optional): loss does not always mean congestion</summary>

On wired networks bit errors are very rare, so almost every loss comes from a router queue overflowing, and "loss = congestion" is a reasonable assumption. Wireless links have many more bit errors, so a loss need not mean congestion, yet TCP will still take it as congestion and slow down unnecessarily.

</details>

### Slow start

![Slide 11 - Slow start rules](assets/10-congestion-control/slide-11.png)

The congestion window is how many segments may be **in flight (unacknowledged)** at a given moment.

1. When the connection is established, the sender sets the congestion window to 1 (or a small number) and sends one segment;
2. if that segment is acknowledged before the timer expires, the window grows by one segment and two segments are sent;
3. each newly acknowledged segment grows the window by one more segment.
<!-- Sources: w9tl p.11; Apple Notes WEEK9 Transport4 -->

![Slide 12 - Slow start trace](assets/10-congestion-control/slide-12.png)

On the left is cwnd after each acknowledgement: 1 → 2 → 3, 4 → 5, 6, 7, 8. On the right are the segments sent per RTT: 1, 2, 4, 4. **Each round of acknowledgements doubles the window**, and it keeps growing until a timeout or until it reaches the receiver's flow control window. In the last round the window has reached 8, yet only 4 segments go out per RTT: the label "pipe is full" means this path holds only 4 segments per RTT, so a larger window no longer doubles the throughput.
<!-- Sources: w9tl p.12 -->

**Common mistake**: despite the name, "slow" start grows **exponentially**. It is "slow" only compared with sending at the full receive window from the very start.

### The slow start threshold

![Slide 13 - Slow start threshold](assets/10-congestion-control/slide-13.png)

To keep the exponential growth from overshooting, the sender keeps a **slow start threshold**:

- initially it is set to the size of the receiver's window;
- **when a loss is detected**: the threshold becomes **half the current congestion window**, and the whole process restarts (the congestion window is reinitialised);
- **once the threshold is crossed**: switch from slow start to **additive increase**, growing the window by only one segment per RTT.
<!-- Sources: w9tl p.13; Apple Notes WEEK9 Transport4 -->

### Additive increase

![Slide 14 - Additive increase trace](assets/10-congestion-control/slide-14.png)

Compare with the slow start figure: here the segments per RTT are 1, 2, 3, 4, and cwnd grows by 1 per round instead of doubling. The slide starts from cwnd = 1 for comparison; real TCP enters this linear growth only after crossing the threshold. The last round is again limited by the pipe and sends only 4 segments.
<!-- Sources: w9tl p.14 -->

<a id="topic-4"></a>
## 4. TCP Tahoe and Reno

### TCP Tahoe

![Slide 15 - TCP Tahoe](assets/10-congestion-control/slide-15.png)

**TCP Tahoe**: slow start followed by additive increase; after a loss the threshold becomes half the window at the time of loss and the window returns to 1. In the figure: the initial threshold is 32 KB; the window doubles 1, 2, 4, 8, 16, 32 up to the threshold, then grows by 1 per round up to 40; a loss occurs here, the new threshold is $40/2=20$ KB, the window falls back to 1, slow start runs again up to 20, and additive increase follows.

**Common mistake**: the slide title says "threshold is half of previous after packet loss"; "previous" means the **congestion window** before the loss (40 in the figure), not the earlier threshold 32. Using the threshold would give 16, which does not match the 20 KB in the figure.
<!-- Sources: w9tl p.15; rev2 p.13 -->

### TCP Reno

![Slide 16 - TCP Reno](assets/10-congestion-control/slide-16.png)

**TCP Reno** = Tahoe + **fast recovery**: apart from when the connection has just started or a timeout occurs, Reno no longer returns to slow start. When a loss is detected by duplicate acknowledgements, the window drops straight to the new threshold (half the window at the time of loss) and additive increase continues. In the figure: after the first loss the window drops from 40 to 20 and then rises linearly; after the second loss it halves again. The curve is therefore saw-toothed, which is exactly what "additive increase, multiplicative decrease" looks like.
<!-- Sources: w9tl p.16; rev2 p.14; Apple Notes WEEK9 Transport4 -->

| | Tahoe | Reno |
| --- | --- | --- |
| Threshold after loss | Half the window at the time of loss | Half the window at the time of loss |
| Window after loss | Back to 1, slow start again | Detected by duplicate ACKs: drops to the new threshold, additive increase continues; timeout: back to 1 |
| When slow start runs | At the start and after every loss | Only at the start and after a timeout |
<!-- Sources: w9tl p.15-16; Apple Notes WEEK9 Transport4 -->

### Computing the congestion window by hand

**Worked example (my own)**: counting in segments, TCP Tahoe has a current threshold of 20 and a timeout occurs when the congestion window is 32.

1. New threshold $=32/2=16$ ;
2. the window is reset to 1, and then per RTT:

| RTT after reset | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Congestion window | 2 | 4 | 8 | 16 | 17 | 18 |
| Phase | Slow start | Slow start | Slow start | Threshold reached | Additive increase | Additive increase |

With Reno, if the loss had been detected by duplicate acknowledgements, the window would start additive increase straight from 16: 17, 18, 19, ….
<!-- Sources: w9tl p.13-16; rev2 p.15-16 -->

**Common mistake**: the new threshold is half the **congestion window at the time of loss** (here half of 32), not half the old threshold 20. The student's review notes practise exactly this kind of RTT-by-RTT working. Watch the switch-over point too: only after the round in which the window **reaches** the threshold does it grow by 1 per round; with a threshold of 8, for example, the sequence is 2, 4, 8, 9, 10.
<!-- Sources: Apple Notes Review Transport Layer -->

## Self-check

1. On a path where the receiver's buffer is large but a router in the middle keeps dropping packets, should flow control or congestion control respond? Why?
2. The receiver advertises a window of 8 KB and the congestion window is 12 KB. What is the most unacknowledged data the sender may have at this moment?
3. TCP Tahoe times out when the congestion window is 64. What is the new threshold? After the window is reset to 1, what is the window over the next 6 RTTs?
4. If the same loss is detected by three duplicate acknowledgements instead, how does Reno's window change? Which stage does it skip compared with Tahoe?
