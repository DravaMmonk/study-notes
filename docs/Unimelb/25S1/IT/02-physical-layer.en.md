# COMP90007 Weeks 2–3 - Physical Layer

Sources: `lecture/Week2-Lecture3.pdf` (Physical Layer (1)), `lecture/Week3-physical-layer-2.pdf` (Physical Layer (2)); example solutions `lecture/example_solutions.pdf` (latency) and `lecture/W3-L2-example_solutions.pdf` (Nyquist/Shannon); `lecture/Week12-Review-handout.pdf` p.7–11. Apple Notes: CS/25S1/IT — "WEEK 2-3 Physical Layer"; CS/25S1/IT/Review — "Physical Layer".

This lecture asks: **how do bits become signals that travel along a cable or through the air, and how fast can one channel go at most?**

Learning path: [Link model and delay](#topic-1) → [Wired media](#topic-2) → [Wireless and satellites](#topic-3) → [Representing bits with signals](#topic-4) → [Channel capacity and multiplexing](#topic-5).

Key points: delay calculations, the Nyquist and Shannon limits. Hard parts: the relation between symbol rate and data rate, converting decibels. Common mistakes: the achievable limit is the **smaller** of the two theorems; do not confuse transmission delay with propagation delay.

<a id="topic-1"></a>
## 1. Link model and delay

### What the physical layer is responsible for

![W2L3 slide 02 - What is the physical layer](assets/02-physical-layer/slide-w2l3-02.png)

The slide first asks you to recall the reference models: the physical layer is the bottom layer of OSI and of the hybrid model. It is concerned with three kinds of network interface: **electrical**, such as voltage levels and signal strength; **timing**, such as data rate; **mechanical**, such as material and cable length. The four parts of this lecture follow exactly "timing → mechanical (media) → electrical (signals) → channel capacity".
<!-- Sources: w2l3 p.2; rev1 p.7; Apple Notes EXAM PREPARATION -->

### Abstracting the physical channel as a link

![W2L3 slide 04 - Simplified link model](assets/02-physical-layer/slide-w2l3-04.png)

Each machine in the picture has a full protocol stack (HTTP, TCP, IP, PHY), but only the two PHYs at the bottom are joined, by a line of length $L$ metres along which the bit string `10111..` travels. The **simplified link model** treats the physical medium as such a link, and the network as a series of interconnected links. Two quantities describe a link:

- **Bandwidth**: the rate of transmission in bit/s;
- **Delay**: the time for the first bit to travel from A to B.
<!-- Sources: w2l3 p.4-5 -->

**Lecture example**: the slide asks how many voice calls (about 1 kbit/s each) one single-mode fibre (about 1 Tbit/s) can carry. The answer is $10^{12}/10^{3}=10^{9}$ , a billion calls. In such questions, align the unit prefixes first: kilo $10^3$ , mega $10^6$ , giga $10^9$ , tera $10^{12}$ .
<!-- Sources: w2l3 p.6 -->

### Transmission delay and propagation delay

![W2L3 slide 07 - Message latency](assets/02-physical-layer/slide-w2l3-07.png)

The slide splits the total delay (latency) of sending one message into two parts, and the last line adds them:

$$
\text{T-delay}=\frac{\text{message length (bit)}}{\text{transmission rate (bit/s)}},\qquad
\text{P-delay}=\frac{\text{channel length}}{\text{signal speed}},
$$

$$
\text{Latency}=\text{T-delay}+\text{P-delay}.
$$

- **Transmission delay**: how long it takes to push all bits onto the link; depends on bandwidth;
- **Propagation delay**: how long one bit takes to travel the whole distance; depends on distance and signal speed. The speed of light is $C=300\,000$ km/s; in copper wire the signal speed is about $\frac{2}{3}C=200\,000$ km/s.
<!-- Sources: w2l3 p.7; rev1 p.11; Apple Notes Review Physical Layer -->

**Common mistake**: transmission delay does not depend on distance, and propagation delay does not depend on message length. The student's review note writes T = data size / rate and P = length / signal speed, which are exactly these two unrelated factors.

#### Worked example: modem versus fibre broadband

The two examples on slides p.8–9 both use a 5600-bit frame:

| Case | T-delay | P-delay | Latency |
| --- | --- | --- | --- |
| 56 kbps modem, 5 km, signal speed $\frac{2}{3}C$ | $5600/56\,000=100$ ms | $5/200\,000$ s $=0.025$ ms | $100.025$ ms |
| 100 Mbps fibre, 1000 km, signal speed $C$ | $5600/10^8=0.056$ ms | $1000/300\,000$ s $\approx3.33$ ms | $\approx3.39$ ms |
<!-- Sources: example_solutions.pdf p.1-2; w2l3 p.8-9 -->

Compare the rows: the slow short link is almost all transmission delay; the fast long link is almost all propagation delay. As bandwidth grows, the bottleneck of long-distance communication becomes the speed of light. The solution sheet writes 3.386 ms, a small rounding difference.

### Bandwidth grows faster than CPU speed

CPU speed rises about 20-fold per decade and is approaching the physical limits of silicon; bandwidth rises about 125-fold per decade, from 56 kbps modems in 1981 to tens of Tbps today.
<!-- Sources: w2l3 p.10 -->

<a id="topic-2"></a>
## 2. Wired media

### Signal attenuation

![W2L3 slide 13 - Signal attenuation](assets/02-physical-layer/slide-w2l3-13.png)

Look at the bottom of the slide: the red waveform entering the medium on the left is tall, the blue waveform leaving on the right is clearly shorter, and the envelope above shows the amplitude falling with distance $d$ . This is **attenuation**: the loss of amplitude (strength) of a signal as it passes through a medium. It determines how far and how much data a medium can carry, so different media suit different situations.
<!-- Sources: w2l3 p.13 -->

### Copper: twisted pair and coaxial cable

![W2L3 slide 14 - Twisted pair](assets/02-physical-layer/slide-w2l3-14.png)

The photo on the right shows four pairs of copper wires, each pair twisted together. **Twisted pair**: two insulated copper wires twisted into a helix. Twisting cancels external electromagnetic interference (EMI) and crosstalk between pairs; reach is up to about 5 km, extendable with repeaters. The next slide (p.15) lists the categories: Cat 3 is about 16 MHz; Cat 5 has more twists, less interference, about 100 MHz; Cat 8 reaches 2 GHz. The slide says not to worry about the unit, just that a higher value is better.

![W2L3 slide 16 - Coaxial cable](assets/02-physical-layer/slide-w2l3-16.png)

The cross-section on the right runs from inside to outside: copper wire core, insulation, copper mesh, outside insulation. Thanks to that extra mesh, **coaxial cable** is better shielded than twisted pair, so it is faster over longer distances; bandwidth approaches 1 GHz, and it is still widely used for cable TV and Internet.
<!-- Sources: w2l3 p.14-17; Apple Notes WEEK 2-3 Physical Layer -->

### Fibre

**Fibre optics** carry light in a glass fibre, with enormous bandwidth (THz) and tiny loss; they are common for backbone links between ISPs and fibre to the home.

![W2L3 slide 18 - Light through fibre](assets/02-physical-layer/slide-w2l3-18.png)

From left to right the picture shows the three parts of a fibre system: a light source (LED or semiconductor laser; light means 1, no light means 0), the fibre, and a photodetector that produces an electrical pulse when light hits it. The zigzag in the middle shows light undergoing **total internal reflection** at the core–cladding boundary, so it stays trapped in the fibre as it travels.
<!-- Sources: w2l3 p.18 -->

![W2L3 slide 19 - Single-mode and multi-mode fibre](assets/02-physical-layer/slide-w2l3-19.png)

The cross-section on the right labels the core (glass), cladding (glass) and jacket (plastic). The core's thickness gives two kinds of fibre:

- **Single-mode fibre**: a very narrow core (about 10 μm) where light can hardly bounce; used with lasers over long distances of about 100 km;
- **Multi-mode fibre**: a core of about 50 μm where light bounces; used with LEDs, cheaper but shorter.
- The next slide (p.20) compares the loss by connection method: connectors 10–20%, mechanical splice about 10%, fusion under 1%.
<!-- Sources: w2l3 p.19-20 -->

![W2L3 slide 21 - Fibre optic ring](assets/02-physical-layer/slide-w2l3-21.png)

Fibre can be organised as a ring or as a bus. The left picture is a fibre ring: each computer hangs on the ring through an interface. The right side enlarges the interface: incoming light is turned into an electrical signal by the optical receiver (photodiode), cleaned up by the electrical signal regenerator, and turned back into light by the optical transmitter (LED) for the next segment; meanwhile the interface exchanges data with the computer over copper wire. So a fibre ring is really a series of point-to-point links.

![W2L3 slide 22 - Wires versus fibre](assets/02-physical-layer/slide-w2l3-22.png)

Finally, one table compares wires (twisted pair and coax) with fibre:

| Property | Wires (twisted pair, coax) | Fibre |
| --- | --- | --- |
| Distance | Short (100s of m) | Long (tens of km) |
| Bandwidth | Moderate | Very high |
| Security | Easy to tap | Hard to tap |
| Cost | Inexpensive | More expensive |
| Convenience | Easy to use | Harder to use |
<!-- Sources: w2l3 p.22 -->

<a id="topic-3"></a>
## 3. Wireless and satellites

### Electromagnetic waves

All wireless networks rest on **electromagnetic wave** propagation. Signals are broadcast over a region and can collide, so the spectrum must be regulated.

![W3PHY slide 03 - Basics of electromagnetic waves](assets/02-physical-layer/slide-w3phy-03.png)

The sine wave at the bottom right marks "1 Wavelength": the distance between two neighbouring peaks.

- **Frequency** $f$ : oscillations per second, in Hz;
- **Wavelength** $\lambda$ : the distance between two consecutive maxima (or minima);
- All EM waves travel in vacuum at the speed of light $c\approx3\times10^8$ m/s.

$$
\lambda\times f=c.
$$
<!-- Sources: w3phy p.2-3; Apple Notes WEEK 2-3 Physical Layer -->

**Illustrative example (our own)**: 2.4 GHz Wi-Fi has wavelength $3\times10^8/2.4\times10^9\approx0.125$ m, about 12.5 cm. Higher frequency means shorter wavelength.

![W3PHY slide 04 - Electromagnetic spectrum](assets/02-physical-layer/slide-w3phy-04.png)

The upper strip is the whole spectrum, with frequency rising to the right: radio, microwave, infrared, visible light, ultraviolet…; the dashed lines enlarge $10^4$ to $10^{16}$ Hz into the lower strip, which marks the bands used by each medium and application: twisted pair and coax at low frequencies, satellite and terrestrial microwave around $10^9$–$10^{10}$ Hz, fibre around $10^{14}$ Hz. Different bands behave differently: radio suits wide-area broadcast; microwave is used for LANs and 3G/4G; infrared and visible light need line of sight.
<!-- Sources: w3phy p.4 -->

### Communication satellites

![W3PHY slide 06 - Types of satellites](assets/02-physical-layer/slide-w3phy-06.png)

The vertical axis is orbital altitude; the two right-hand columns are latency and the number of satellites needed for global coverage; the two grey bands are the upper and lower Van Allen belts, which satellites avoid. Higher orbits cover more per satellite and need fewer satellites, but have more latency:

| Type | Altitude | Latency | Satellites for global coverage |
| --- | --- | --- | --- |
| GEO (geostationary) | About 35 800 km, fixed relative to the ground | About 270 ms | 3 |
| MEO (medium-Earth orbit) | Between the two Van Allen belts | 35–85 ms | 10 |
| LEO (low-Earth orbit) | Lowest, e.g. Starlink's first shell at about 550 km | 1–7 ms | 50 (Starlink uses thousands) |
<!-- Sources: w3phy p.5-8 -->

![W3PHY slide 07 - Geostationary satellites](assets/02-physical-layer/slide-w3phy-07.png)

GEO satellites let small ground terminals (VSATs) communicate through a hub: arrows 1–4 show one VSAT sending up to the satellite (1), the satellite passing it down to the hub (2), and the hub sending it back up via the satellite (3) to the destination VSAT (4). The L, S, C, Ku and Ka bands in use may be crowded or susceptible to rain.

![W3PHY slide 08 - Low-Earth orbit satellites](assets/02-physical-layer/slide-w3phy-08.png)

The grid over the globe is Starlink's first orbital shell: 72 orbits with 22 satellites each, 1584 satellites at 550 km altitude. A low-orbit satellite covers only a small area, so a large constellation is needed for global coverage.

**Illustrative example (our own)**: LEO latency is only a few milliseconds, which suits interactive uses such as video calls; one GEO satellite stays fixed over the ground and covers a large area, which suits TV broadcasting, where its roughly 270 ms latency matters little for one-way delivery.

### Comparing satellite, fibre, wireless and wired

![W3PHY slide 10 - Wireless versus wired](assets/02-physical-layer/slide-w3phy-10.png)

The slide marks advantages with "+" and disadvantages with "−". The previous slide (p.9) compares satellite with fibre in the same format; together:

| Comparison | Advantages | Disadvantages |
| --- | --- | --- |
| Satellite | Once launched, communication can be set up anywhere, anytime; broadcasts to large regions | Limited bandwidth; interference must be managed |
| Fibre | Enormous bandwidth over long distances | Hard to install in rural areas |
| Wireless | Naturally supports mobility and broadcast; easy and cheap to deploy | Transmissions interfere and must be managed; signal strength and data rates vary greatly |
| Wired | Easy to keep a fixed data rate; supports point-to-point | Expensive over distances; does not readily support mobility or broadcast |
<!-- Sources: w3phy p.9-10; rev1 p.8 -->

<a id="topic-4"></a>
## 4. Representing bits with signals

### Changing the three parameters of a sine wave

Information is sent by varying a physical quantity (voltage, current). For the sine wave

$$
f(t)=c\sin(at+b),
$$

$c$ is the amplitude, $a/(2\pi)$ the frequency and $b$ the phase. Changing any one of them can represent different symbols.
<!-- Sources: w3phy p.12 -->

![W3PHY slide 13 - Amplitude, frequency and phase](assets/02-physical-layer/slide-w3phy-13.png)

Each small plot changes only one parameter: in the top plot the two curves differ in height (amplitude), in the middle in spacing (frequency), at the bottom they are shifted sideways (phase). The receiver tells symbols apart by these differences.
<!-- Sources: w3phy p.13; rev1 p.9 -->

### Baseband and passband transmission

**Modulation** turns bits into signals; a modem is a modulator plus demodulator.

![W3PHY slide 14 - Baseband and passband (ADSL)](assets/02-physical-layer/slide-w3phy-14.png)

- **Baseband transmission**: the signal occupies frequencies from 0 up to a maximum, e.g. 0–4 kHz in the telephone system;
- **Passband transmission**: the signal is shifted to occupy a higher range of frequencies.

The ADSL spectrum at the bottom is a passband example: the narrow red strip at the far left is the 0–4 kHz voice band; after a gap, the blue 25.875–138 kHz band is upstream, the green 138–1104 kHz band is downstream, and ADSL2+ extends downstream to 2208 kHz. So one phone line can carry a call and Internet traffic at the same time.
<!-- Sources: w3phy p.14; Apple Notes WEEK 2-3 Physical Layer -->

![W3PHY slide 15 - Modulation types](assets/02-physical-layer/slide-w3phy-15.png)

The top row is the NRZ (non-return-to-zero) bit signal; the three rows below encode the same bits with **amplitude shift keying (ASK)**, where 1 has a wave and 0 has none; **frequency shift keying (FSK)**, where 1 and 0 use different frequencies; and **phase shift keying (PSK)**, where the phase flips when the bit changes.
<!-- Sources: w3phy p.15 -->

### Symbol rate and data rate

![W3PHY slide 17 - Symbol rate](assets/02-physical-layer/slide-w3phy-17.png)

The left plot has only two levels, 0 V and 3 V, so each symbol carries 1 bit; the right plot has four levels, so each symbol carries 2 bits (each slot is labelled with two bits such as "10", "11" or "01").

- **Symbol rate (baud rate)**: number of signal changes per second;
- **Data rate**: number of bits per second.

If the signal has $V$ distinguishable levels (patterns), each symbol carries $\log_2V$ bits:

$$
\text{Data Rate}=\log_2V\times\text{Symbol Rate}.
$$
<!-- Sources: w3phy p.16-17; Apple Notes WEEK 2-3 Physical Layer -->

**Illustrative example (our own)**: a signal that changes 1000 times per second with 16 levels has data rate $\log_2 16\times1000=4000$ bit/s.

<a id="topic-5"></a>
## 5. Channel capacity and multiplexing

### Nyquist: a noiseless channel

![W3PHY slide 20 - Nyquist theorem](assets/02-physical-layer/slide-w3phy-20.png)

The boxed formula applies to a **noiseless** channel of bandwidth $B$ with $V$ signal levels:

$$
\text{Max. data rate}=2B\log_2V\ \text{bit/s}.
$$

Raising the bandwidth or the number of levels raises the rate. $2B$ is the maximum number of distinguishable symbols per second, and $\log_2V$ is the bits per symbol.
<!-- Sources: w3phy p.20; rev1 p.10 -->

### Shannon: a noisy channel

![W3PHY slide 22 - Shannon theorem](assets/02-physical-layer/slide-w3phy-22.png)

The two arrows under the formula say what each factor controls: $B$ sets how fast the signal can change, and $S/N$ (the signal-to-noise ratio) sets how many levels can be seen:

$$
\text{Max. data rate}=B\log_2\!\left(1+\frac{S}{N}\right)\ \text{bit/s}.
$$

![W3PHY slide 23 - Large and small SNR](assets/02-physical-layer/slide-w3phy-23.png)

In the top row the signal is far stronger than the noise, and the square wave is still clear after they add; in the bottom row signal and noise are similar, and the levels are hard to tell apart. This is why adding signal levels cannot raise the rate without limit: more levels sit closer together, so noise more easily makes the receiver misjudge them.

SNR is often given in decibels and must be converted first:

$$
\text{SNR}_{\text{dB}}=10\log_{10}\frac{S}{N}.
$$
<!-- Sources: w3phy p.22-23; sol-w3 p.2 -->

**Common mistake**: Shannon's formula takes the ratio $S/N$ , not the decibel value. 20 dB means $S/N=100$ ; 30 dB means 1000.

### Worked examples: take the smaller limit

Slides p.24–26 pose three examples in turn; the answers are in `W3-L2-example_solutions.pdf`:

| Question | Calculation | Result |
| --- | --- | --- |
| Binary signal, 3 kHz channel (Nyquist) | $2\times3000\times\log_2 2$ | 6 kbps |
| SNR = 20 dB, 4 kHz (Shannon) | $S/N=100$ , $4000\times\log_2 101$ | $\approx26.63$ kbps |
| Binary signal, 3 kHz, SNR = 20 dB | Shannon: $3000\times\log_2 101\approx19.97$ kbps; Nyquist: 6 kbps | 6 kbps |
<!-- Sources: sol-w3 p.1-3; w3phy p.24-26 -->

The third question is bound by both limits: Shannon says the noise allows about 20 kbps, but a binary signal carries only 1 bit per symbol, so Nyquist allows only 6 kbps. **The achievable limit is always the smaller of the two**, which the student's notes stress too.
<!-- Sources: Apple Notes WEEK 2-3 Physical Layer -->

### Channel direction

- **Full-duplex**: both directions at once, e.g. a different twisted pair for each direction;
- **Half-duplex**: both directions, but not at the same time, e.g. senders taking turns on a wireless channel;
- **Simplex**: one fixed direction only; not common.
<!-- Sources: w3phy p.27 -->

### Multiplexing: many users sharing one medium

The slides list four kinds of **multiplexing**: time division multiplexing (TDM), frequency division multiplexing (FDM), statistical multiplexing and code division multiple access (CDMA). This lecture develops only the first two:

![W3PHY slide 29 - Time division multiplexing](assets/02-physical-layer/slide-w3phy-29.png)

**TDM**: the data of the three users on the left are merged onto one line, and the sequence on the right reads 1, 2, 3, 1, 2, 3…: users take turns using the whole channel on a fixed schedule, with a guard time between slots. Each user gets the full channel speed during its own slot.

![W3PHY slide 30 - Frequency division multiplexing](assets/02-physical-layer/slide-w3phy-30.png)

**FDM**: the horizontal axis is frequency, and the three users each occupy their own small "hump", stacked and sending at the same time. Each user permanently occupies its own frequency band and sends continuously, but only uses part of the channel's bandwidth, so it is slower.
<!-- Sources: w3phy p.28-30; Apple Notes WEEK 5 MAC2 -->

TDM and FDM are static allocations and are very inefficient when the number of users changes or traffic is bursty; [05 MAC sublayer](05-mac-sublayer.en.md#topic-1) starts from here and moves to dynamic allocation.

## Self-check

1. A 2000 km fibre link (signal speed $C$ ) has bandwidth 1 Gbps and sends a 10 000-bit frame. Which delay dominates?
2. A 4 kHz channel uses 8 signal levels and has an SNR of 30 dB. What is the maximum data rate?
3. On the same channel, if the number of levels rises from 8 to 1024, what does the achievable rate become, and which theorem is now the binding limit?
4. A remote farm needs Internet access. Using the advantages and disadvantages of satellite, fibre, wireless and wired links, how would you choose?
