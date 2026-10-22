# COMP90007 Weeks 5–6 - Network Layer: Service Models and Internetworking

Sources: `lecture/Week5-Lecture3.pdf` (Network Layer (1)), `lecture/Week6-Lecture1.pdf` (Network Layer (2)); review material `lecture/Week12-Review-handout.pdf` p.21–24; Apple Notes: CS/25S1/IT — "WEEK 5-6 Network Layer"; CS/25S1/IT/Review — "Network Layer".

This lecture asks: **the data link layer only handles two adjacent points; how does a packet cross many routers, even different kinds of network, to reach a distant host?**

Learning path: [Where the network layer sits in the Internet](#topic-1) → [Datagrams and virtual circuits](#topic-2) → [How different networks are connected](#topic-3) → [Fragmentation and path MTU discovery](#topic-4).

Key points: comparing datagrams with virtual circuits, tunnelling, transparent versus non-transparent fragmentation. Hard parts: offsets in IP fragmentation. Common mistakes: IP uses non-transparent fragmentation and reassembles only at the destination host; in tunnelling the two end networks are the same type and the middle one differs.

<a id="topic-1"></a>
## 1. Where the network layer sits in the Internet

### What the network layer is responsible for

![W5L3 slide 02 - Network layer responsibilities](assets/06-network-layer-internetworking/slide-w5l3-02.png)

On the right is the five-layer model with the Network layer highlighted. The three lines of text on the left give, from top to bottom, the duties of the network, data link and physical layers: the network layer is responsible for **connecting different networks (internetworking) and routing**; the data link layer handles framing, error and flow control and medium access; the physical layer handles media and signals. The earlier lectures solved problems "on one link"; from here on the problem is crossing many links.
<!-- Sources: w5l3 p.2 -->

### IP is the narrow waist of the Internet

![W5L3 slide 04 - TCP/IP hourglass](assets/06-network-layer-internetworking/slide-w5l3-04.png)

This "hourglass" is the heart of TCP/IP: many applications (SMTP, HTTP, RTP, DNS) and two transport protocols (TCP, UDP) on top, many link technologies below (Ethernet, 4G, SONET, ADSL, 802.11), and a narrow waist containing only **IP**. Everything above runs over IP and IP runs over every link, which is why the Internet can join all kinds of networks.
<!-- Sources: w5l3 p.4 -->

![W5L3 slide 05 - Internet and IP](assets/06-network-layer-internetworking/slide-w5l3-05.png)

![W5L3 slide 06 - Internet as interconnected networks](assets/06-network-layer-internetworking/slide-w5l3-06.png)

The first slide gives three definitions and the second draws them: a US backbone and a European backbone joined by leased transatlantic lines, with regional, mobile, national, company and home networks hanging below; IP routers connect them, and access can be by cable, WiMAX or Ethernet.

- The Internet is a collection of interconnected networks that communicate using the **Internet Protocol (IP)**;
- IP provides a **best-effort** service that routes datagrams from source host to destination host, with no guarantee of delivery or order;
- the source and destination hosts may be on different networks; for example, a computer in the home network reaching a server in the company network crosses the regional network, both backbones and the national network.
<!-- Sources: w5l3 p.5; rev1 p.22 -->

### Store-and-forward packet switching

![W5L3 slide 07 - Store-and-forward packet switching](assets/06-network-layer-internetworking/slide-w5l3-07.png)

Host H1 generates packets and injects them into the ISP's network (the grey ellipse); routers A, B, C… **receive each packet whole, store it, and forward it based on its address** to the next router, until it reaches, via F, the LAN where H2 lives. This is **store-and-forward packet switching**.
<!-- Sources: w5l3 p.7 -->

### What the network layer should offer the transport layer

![W5L3 slide 08 - Network layer services](assets/06-network-layer-internetworking/slide-w5l3-08.png)

- Services independent of router technologies;
- the transport layer shielded from the number, type and topology of routers;
- network addresses that follow a uniform numbering plan.

Taken together: the transport layer only says "deliver this to that address"; how the networks in between are built, or what equipment is swapped, should not affect the layers above.
<!-- Sources: w5l3 p.8 -->

<a id="topic-2"></a>
## 2. Datagrams and virtual circuits

### Two services, two schools of thought

![W5L3 slide 09 - Connectionless vs connection-oriented](assets/06-network-layer-internetworking/slide-w5l3-09.png)

The network layer can offer two kinds of service, reflecting two schools of thought:

- **Connectionless**: packets are injected into the subnet individually and routed independently to the destination; flow and error control are left to other layers. This is the Internet community's view: the subnet may be unreliable and only moves packets; quality of service (QoS) is not easily implemented.
- **Connection-oriented**: packets to the same destination follow the same route. This is the telecommunications community's view: guarantee reliability and value QoS.
<!-- Sources: w5l3 p.9; Apple Notes WEEK 5-6 Network Layer -->

### Datagram subnet: the post-office model

![W5L3 slide 10 - Datagram subnet](assets/06-network-layer-internetworking/slide-w5l3-10.png)

Every packet carries the full destination address and is routed on its own, so **packets of one message may take different paths**. In each table at the bottom, the left column is the destination (Dest.) and the right column the outgoing line (Line). Look at A's table: at first, traffic for F goes via C; later A changes its mind and sends traffic for E and F via B (for instance because the ACE route is congested). Packets 1–3 go A→C→E, while packet 4 goes A→B. Different paths mean different delays, so packets may **arrive out of order** and the upper layers must reorder them. The **routing algorithm** maintains the routing table; see [08 Routing algorithms](08-routing-algorithms.en.md).
<!-- Sources: w5l3 p.10 -->

### Virtual-circuit subnet: the telephone model

![W5L3 slide 11 - Virtual-circuit subnet](assets/06-network-layer-internetworking/slide-w5l3-11.png)

A **virtual circuit (VC)** is set up first; afterwards all packets follow the same path, carrying only a short **connection identifier** instead of being routed afresh each time. Read the "in | out" row of each table: A receives packets from H1 with identifier 1 and sends them towards C, still labelled 1; C passes identifier 1 from A on to E; E passes it to F. Packets 1–4 all travel A→C→E→F and arrive in the order sent. A typical example is **MPLS (Multiprotocol Label Switching)**.
<!-- Sources: w5l3 p.11 -->

**Note**: an identifier only has meaning on one link, and a router may rewrite it when forwarding. The figure draws a second host, H3, but the slide's tables list only H1's connection; in the textbook's original figure, H3's connection also arrives at A with identifier 1, so A relabels it 2 before sending it towards C, keeping the two connections apart downstream. This point is `Extension` material.

### Comparison

![W5L3 slide 12 - Datagram vs virtual-circuit table](assets/06-network-layer-internetworking/slide-w5l3-12.png)

The table compares the two subnets row by row. The first three rows: datagrams need no circuit setup, every packet carries the full source and destination addresses, and each is routed independently; a virtual circuit must be set up first, after which packets carry only a short VC number and the route is fixed at setup. The last three rows: when a router fails, a datagram network loses only the packets inside that router at the time, whereas in a virtual-circuit network every VC through it is terminated; QoS and congestion control are difficult for datagrams, and easy for virtual circuits provided enough resources can be reserved in advance for each VC.

![W5L3 slide 13 - Compromises: time, memory, bandwidth](assets/06-network-layer-internetworking/slide-w5l3-13.png)

![W5L3 slide 14 - Compromises: longevity, vulnerability](assets/06-network-layer-internetworking/slide-w5l3-14.png)

These two slides spell out the trade-offs under five headings:

| Aspect | Datagram | Virtual circuit |
| --- | --- | --- |
| Time | Every packet needs a complex table lookup, so address parsing takes longer | Setup costs time and resources, then forwarding is very fast |
| Router memory | Large tables with an entry for every possible destination | One entry per virtual circuit |
| Bandwidth | Full destination address in every packet | Full address and path computation only during setup, saving overhead afterwards |
| Longevity | – | Can be set up for long-running repeated use as permanent VCs |
| Vulnerability | Can use an alternative route when a router fails | A hardware or software crash aborts all VCs through it; no traffic until they are rebuilt |
<!-- Sources: w5l3 p.12-14; Apple Notes WEEK 5-6 Network Layer -->

**Illustrative example (our own)**: a long video conference suits a virtual circuit: set it up once, then every packet is forwarded quickly and bandwidth is easy to guarantee. An occasional web request suits datagrams better, avoiding setting up and tearing down a connection for one small exchange.

<a id="topic-3"></a>
## 3. How different networks are connected

### How networks differ

![W5L3 slide 15 - How networks differ](assets/06-network-layer-internetworking/slide-w5l3-15.png)

![W6L1 slide 03 - Internetworking challenges](assets/06-network-layer-internetworking/slide-w6l1-03.png)

**Internetworking** joins multiple, different networks into one larger network. The second slide names the difficulties: different network types and protocols, different design goals and configuration motives, and incompatible hardware and software. The first slide lists the specific differences:

| Aspect | Possible differences |
| --- | --- |
| Service | Connectionless or connection-oriented |
| Packet size | Different maximum sizes |
| Addressing | Different lengths; flat or hierarchical |
| Quality of service | Present or absent |
| Reliability | Different levels of loss |
| Security | Privacy rules, encryption |
<!-- Sources: w5l3 p.15; w6l1 p.3 -->

The difference in packet size leads directly to the fragmentation problem of Section 4.

### Connecting with one common IP

![W6L1 slide 04 - Connecting networks with IP](assets/06-network-layer-internetworking/slide-w6l1-04.png)

The Internet's answer is to use **one common network-layer protocol, IP**, over every network. The upper half is the topology: the source host is on an 802.11 network, the path crosses an MPLS network (which runs a virtual circuit), and ends on the Ethernet where the destination lives. The lower half shows the protocol stack in each device: each hop has a different link-layer header (802.11, MPLS, Eth), but the IP packet inside is unchanged all the way ("Common protocol (IP) carried all the way"); at each hop the router strips the old frame header and adds a new one.
<!-- Sources: w6l1 p.4; rev1 p.23 -->

### Tunnelling

![W6L1 slide 05 - Tunneling definition](assets/06-network-layer-internetworking/slide-w6l1-05.png)

**Tunnelling** is used when the source and destination are on the **same type** of network but a **different type** of network lies in between: the source packet is encapsulated whole inside the middle network's packet, carried across, and unwrapped at the far end.

![W6L1 slide 06 - Tunneling IPv6 through IPv4](assets/06-network-layer-internetworking/slide-w6l1-06.png)

Paris and London are both IPv6 networks with only IPv4 in between. The left router places the IPv6 packet inside an IPv4 packet (the "IPv4 | IPv6 packet" in the middle); the IPv4 network forwards it by the outer header alone; the right router removes the outer layer and delivers the original IPv6 packet into London's network. To the middle network, the IPv6 packet is just ordinary payload: the destination address the middle routers see is the one in the outer IPv4 header, namely the IPv4 address of the router at the far end of the tunnel, not the IPv6 address of the London host.
<!-- Sources: w6l1 p.5-6; Apple Notes WEEK 5-6 Network Layer -->

<a id="topic-4"></a>
## 4. Fragmentation and path MTU discovery

### Why fragment

![W6L1 slide 07 - MTU and fragmentation](assets/06-network-layer-internetworking/slide-w6l1-07.png)

Every network defines an **MTU (Maximum Transmission Unit)**, the largest packet it can carry, determined by hardware and operating system, protocol standards and transmission efficiency. Ethernet's MTU is commonly 1500 bytes. When a large packet must cross a network with a smaller MTU, it is split up: **fragmentation**.
<!-- Sources: w6l1 p.7; Apple Notes WEEK 5-6 Network Layer -->

### Transparent and non-transparent fragmentation

![W6L1 slide 08 - Transparent fragmentation](assets/06-network-layer-internetworking/slide-w6l1-08.png)

**Transparent**: fragmentation happens at the entrance of each small-MTU network and reassembly at its exit (G1 fragments, G2 reassembles; G3 fragments, G4 reassembles). Later networks never see the fragments, but all fragments of a packet must leave through the same exit router to be reassembled and cannot be routed independently, which constrains routing and makes routers work harder.

![W6L1 slide 09 - Non-transparent fragmentation](assets/06-network-layer-internetworking/slide-w6l1-09.png)

**Non-transparent**: once fragmented, pieces are not reassembled along the way; **only the destination host reassembles** ("reassemble at destination" at the right of the figure), and this is how IP works. Routers have less work, but every fragment must carry a packet number, a byte offset and an end-of-packet flag.
<!-- Sources: w6l1 p.8-9; rev1 p.24 -->

**Common mistake**: the student's notes summarise transparent fragmentation as "fragment and reassemble in every network passed" and non-transparent as "only at source and destination". More precisely, non-transparent fragmentation may happen at any router on the way (even repeatedly); it is the **reassembly** that happens only at the destination.

### An IP-style fragmentation example

![W6L1 slide 10 - IP-style fragmentation](assets/06-network-layer-internetworking/slide-w6l1-10.png)

Each fragment header has three fields: packet number, byte offset, end flag. The original packet is number 27 with 10 data bytes A–J:

| Stage | Fragments (number, offset, end flag: data) |
| --- | --- |
| Original packet | (27, 0, 1: A–J) |
| Split to at most 8 bytes each | (27, 0, 0: A–H), (27, 8, 1: I–J) |
| Re-split to at most 5 bytes each | (27, 0, 0: A–E), (27, 5, 0: F–H), (27, 8, 1: I–J) |
<!-- Sources: w6l1 p.10 -->

The offset records which byte of the original packet a fragment's data starts at, so however many times it was split and in whatever order the pieces arrive, the destination can put them back in place; the fragment with end flag 1 tells it the total length. Note row (c): when re-splitting, (27, 0, 0: A–H) becomes A–E and F–H, and the latter has offset 5 and still end flag 0; only I–J, which was already the last piece, keeps flag 1.

<details markdown="1"><summary>Extension (optional): calculating real IPv4 fragments</summary>

The real IPv4 header implements the three fields above with Identification, MF (More Fragments) and Fragment offset (see [07 IPv4 header](07-ip-addressing.en.md#topic-1)). The offset is counted in 8-byte units, so every fragment except the last must carry a multiple of 8 data bytes.

Example: a 4000-byte datagram (20-byte header + 3980 data bytes) crosses a link with MTU = 1500. Each fragment holds at most $1500-20=1480$ data bytes (conveniently a multiple of 8):

| Fragment | Data bytes | Offset field | MF |
| --- | --- | --- | --- |
| 1 | 1480 | 0 | 1 |
| 2 | 1480 | 185 | 1 |
| 3 | 1020 | 370 | 0 |

</details>

### Path MTU discovery

![W6L1 slide 11 - Path MTU discovery](assets/06-network-layer-internetworking/slide-w6l1-11.png)

**Path MTU Discovery (PMTUD)** is an alternative to fragmentation: the source sends packets with **DF (Don't Fragment)** set. Follow the figure from left to right: the source first sends a 1400-byte packet; the first router finds the next hop's MTU smaller, drops the packet and returns an error packet saying "try 1200"; the source resends at 1200 and at the second router receives "try 900"; finally a 900-byte packet reaches the destination, and the source knows what the whole path can carry.

- Advantage: the source knows what length to send, and there is no fragmentation inside the network;
- if routes or the path MTU change, new error packets are triggered and the source adapts.
<!-- Sources: w6l1 p.11; Apple Notes WEEK 5-6 Network Layer -->

## Self-check

1. In a datagram subnet, why might packets of the same file arrive out of order? Can this happen in a virtual-circuit subnet?
2. Two IPv6 offices of a company are linked only by an IPv4 network. Which technique should they use, and which header do the middle routers forward by?
3. Why does transparent fragmentation constrain routing?
4. A packet with 1000 data bytes is fragmented, in the slides' simplified format, first into pieces of 400 bytes and then into pieces of 300 bytes. Give the offset and end flag of every final fragment.
