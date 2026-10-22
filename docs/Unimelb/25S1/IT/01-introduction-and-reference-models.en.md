# COMP90007 Weeks 1–2 - Introduction and Reference Models

Sources: `lecture/Week1-Lecture2.pdf` (Introduction to Networking), `lecture/Week2-Lecture2.pdf` (Introduction to Networking (2)), `lecture/Week12-Review-handout.pdf` p.2–6; `lecture/Week1-Lecture1.pdf` is course administration only and is not used. Apple Notes: CS/25S1/IT — "WEEK 1 - Network Technology", "WEEK 2 Reference Models"; CS/25S1/IT/Review — "EXAM PREPARATION".

This lecture asks: **how can a collection of independent computers communicate in an orderly way?** First classify networks, then split the complicated communication task into layers, each doing one job.

Learning path: [What a network is and how to classify it](#topic-1) → [Layering and encapsulation](#topic-2) → [Services, primitives and protocols](#topic-3) → [OSI and TCP/IP](#topic-4) → [Comparison, the hybrid model and origins](#topic-5).

Key points: the idea of layering, the difference between services and protocols, the layer names and their data units. Hard parts: the information flow of encapsulation (each layer adds a header). Common mistakes: the Internet is not the WWW; OSI is a reference framework, while TCP/IP is the protocol suite that actually runs.

<a id="topic-1"></a>
## 1. What a network is and how to classify it

### Basic terms

- **Computer network**: a collection of autonomous computers interconnected by a single technology.
- **Network device**: a PC, phone, router, switch and so on.
- A **server** provides a service and accepts requests; a **client** connects to a server and requests a service.
- **Packet**: a message sent between two network devices.
- **IP address**: a unique number identifying a network device.
<!-- Sources: w1l2 p.2-3, p.8-9 -->

![W1L2 slide 04 - Architecture of the Internet](assets/01-introduction-and-reference-models/slide-w1l2-04.png)

This picture is the Internet as a whole. Home users at the bottom left connect through DSL, cable or fibre to the home (FTTX), and there is a mobile device on the right; they first reach an **ISP (Internet Service Provider)**, the ISPs' backbone networks interconnect (peering), and data centres and content delivery networks hang off the backbones. Keep the impression of "many networks joined into one"; each later layer solves the problem of one stretch of that path.
<!-- Sources: w1l2 p.4 -->

![W1L2 slide 06 - Internet vs World Wide Web](assets/01-introduction-and-reference-models/slide-w1l2-06.png)

**Common mistake: the Internet and the WWW are not the same.** The slide asks whether the Internet or the WWW is a computer network. The answer: the Internet is not a single network but a network of networks (the colourful picture on the right visualises many interconnected networks); the WWW is a distributed system that runs on top of the Internet, just one application among many.
<!-- Sources: w1l2 p.6 -->

![W1L2 slide 09 - Client-server model](assets/01-introduction-and-reference-models/slide-w1l2-09.png)

The client process on the left sends a request through the network; the server process on the right handles it and sends back a reply. This is the **client-server model**: one request, one reply. The previous slide (p.8) draws two clients sharing one server, showing that one server can serve several clients.

### Classification by transmission technology

![W1L2 slide 10 - Broadcast links](assets/01-introduction-and-reference-models/slide-w1l2-10.png)

![W1L2 slide 11 - Point-to-point links and multicasting](assets/01-introduction-and-reference-models/slide-w1l2-11.png)

The two slides classify networks by "how many machines receive one message": p.10 is the broadcast link, where all machines share one channel; p.11 is the point-to-point link connecting only one pair of machines, plus multicasting to a subset of machines. The table puts the three side by side:

| Type | Meaning | Example |
| --- | --- | --- |
| Broadcast link | All machines share one channel; one sends and all receive; the intended recipient processes it and the rest ignore it | Wireless LAN, classic Ethernet |
| Point-to-point link | Connects only one pair of machines, invisible to others; one sender and one receiver is called unicasting | A leased line between two routers |
| Multicasting | Sent to a subset of the network | A video-conference group |
<!-- Sources: w1l2 p.10-11; Apple Notes WEEK 1 -->

### Classification by scale

![W1L2 slide 12 - Classification by scale](assets/01-introduction-and-reference-models/slide-w1l2-12.png)

The left column is the distance between processors, the middle column says what the processors are located in, and the right column names the network. Reading downward, each roughly tenfold increase in distance moves up one network type:

| Interprocessor distance | Processors located in the same | Network type |
| --- | --- | --- |
| 1 m | Square metre | Personal area network (PAN), e.g. Bluetooth |
| 10 m – 1 km | Room, building, campus | Local area network (LAN) |
| 10 km | City | Metropolitan area network (MAN) |
| 100 km – 1000 km | Country, continent | Wide area network (WAN) |
| 10 000 km | Planet | The Internet |
<!-- Sources: w1l2 p.12 -->

<details markdown="1"><summary>Note: examples of network types from the student's notes (optional)</summary>

These examples come from textbook Chapter 1 figures in the student's notes; the local lecture PDFs have no matching page:

- **LAN**: a wireless LAN connects to the wired network through an access point (AP); a wired LAN commonly uses an Ethernet switch with one computer per port. A VLAN tags ports to split them logically into separate segments.
- **MAN**: historically the cable-TV network, where a head end distributes signals centrally to each home; later WiMAX, LTE and 5G also provide metropolitan coverage.
- **WAN**: made of hosts and a communication subnet; the subnet consists of transmission lines and switching elements (usually routers). The **routing algorithm** decides which path the network as a whole uses; the **forwarding algorithm** decides which next hop a single router hands a packet to. Both are developed in [08 Routing algorithms](08-routing-algorithms.en.md).
- A **VPN** joins branch offices with virtual links over the Internet; how a VPN is secured is in [14 Communication security](14-signatures-authentication-security.en.md). The student also recorded SD-WAN (software-defined WAN): centrally managing several wide-area links in software and offering one service-level agreement (SLA). This is extension material.

</details>
<!-- Sources: Apple Notes WEEK 1 (textbook figures 1-8 to 1-10) -->

### Classification by topology

![W1L2 slide 13 - Mesh and bus topologies](assets/01-introduction-and-reference-models/slide-w1l2-13.png)

![W1L2 slide 14 - Star and ring topologies](assets/01-introduction-and-reference-models/slide-w1l2-14.png)

The two slides hold four pictures (a)–(d); look at how the lines join the devices: (a) in a full mesh every pair of devices has its own line; (b) in a bus every device hangs off one horizontal line; (c) in a star every line meets at the hub in the middle; (d) in a ring each device links only to its two neighbours, closing a loop.

| Topology | How devices are connected | Properties |
| --- | --- | --- |
| Fully mesh | Every device has a dedicated point-to-point link to every other device | Reliable, but many links |
| Bus | All devices attach to one shared medium | Only one device may transmit at a time, so a negotiation mechanism resolves conflicts; Ethernet is the most common bus network |
| Star | All devices attach to a central device (e.g. a hub) | The central device is critical |
| Ring | Each device receives from the previous one and forwards to the next | Needs access control, e.g. token ring |
<!-- Sources: w1l2 p.13-14 -->

The negotiation question on a bus, "who sends first", is exactly what [05 MAC sublayer](05-mac-sublayer.en.md) answers.

<a id="topic-2"></a>
## 2. Layering and encapsulation

### Why layer at all

Communication involves many concerns: electrical signals, errors, finding a path, reliable delivery, application formats… Writing all of it in one program would be nearly unmaintainable. **Layering** splits it up: each layer solves one class of problem, provides a service to the layer above and uses the service of the layer below. The student's notes summarise the benefits as **modularity, interoperability and abstraction**.
<!-- Sources: w1l2 p.15-17; Apple Notes WEEK 1 -->

![W1L2 slide 16 - Philosopher-translator-secretary architecture](assets/01-introduction-and-reference-models/slide-w1l2-16.png)

Location A is on the left and location B on the right, each with three layers. The two philosophers (layer 3) care only about ideas ("I like rabbits"); the translators (layer 2) put it into an agreed intermediate language (Dutch in the picture, "Ik vind konijnen leuk"); the secretaries (layer 1) care only about faxing the paper. The translator on the far side turns the Dutch into French for the other philosopher. Any layer can change its implementation (for example, the translators switch to another intermediate language) without affecting the others, as long as the interfaces above and below stay the same.
<!-- Sources: w1l2 p.16 -->

![W1L2 slide 17 - Protocol hierarchies](assets/01-introduction-and-reference-models/slide-w1l2-17.png)

Look at the two kinds of line: the vertical solid lines are **interfaces**, through which adjacent layers in one host hand data over (labelled Layer 4/5 interface and so on, on the left); the horizontal dashed lines are **protocols**, the agreed "virtual" conversation between the same layer (peers) on two hosts. Real data only travels on the physical medium at the bottom.
<!-- Sources: w1l2 p.17 -->

### Encapsulation: each layer adds its own header

![W1L2 slide 18 - Information flow in layer 5](assets/01-introduction-and-reference-models/slide-w1l2-18.png)

Follow the left side from top to bottom: layer 5 produces message M; layer 4 adds header $H_4$ ; layer 3 may cut it into two pieces, each with $H_3$ ; layer 2 adds header $H_2$ and trailer $T_2$ . On the destination machine on the right, each layer strips off its own header and passes the rest upward. This is **encapsulation**, and it explains why the "data" seen by each layer contains everything from all the layers above.
<!-- Sources: w1l2 p.18; rev1 p.3; Apple Notes EXAM PREPARATION -->

**Illustrative example (our own)**: a browser sends an HTTP request. The application's HTTP message is produced first, so the TCP header is the first header added, followed by the IP header and the 802.11 frame header and trailer; the receiver strips them in the reverse order.

<a id="topic-3"></a>
## 3. Services, primitives and protocols

### Connection-oriented and connectionless

| Service type | Procedure | Analogy |
| --- | --- | --- |
| Connection-oriented | Establish connection → send data → release connection; parameters can be negotiated at setup | A phone call |
| Connectionless | Just send; each message is handled independently with no negotiation | Posting a letter |
<!-- Sources: w1l2 p.19 -->

![W1L2 slide 20 - Six types of services](assets/01-introduction-and-reference-models/slide-w1l2-20.png)

The choice of service affects reliability and quality of service. The braces on the left split the six services into two groups: the top three rows are connection-oriented and the bottom three connectionless; the right column gives examples:

| Category | Service | Example |
| --- | --- | --- |
| Connection-oriented | Reliable message stream | Sequence of pages |
| Connection-oriented | Reliable byte stream | Movie download |
| Connection-oriented | Unreliable connection | Voice over IP |
| Connectionless | Unreliable datagram | Electronic junk mail |
| Connectionless | Acknowledged datagram | Text messaging |
| Connectionless | Request-reply | Database query |
<!-- Sources: w1l2 p.20 -->

**Illustrative example (our own)**: live voice can tolerate losing a little sound, and waiting for retransmission would be worse, so it can use an unreliable connection; a downloaded file must not have a single wrong byte and must arrive in order, so it needs a reliable byte stream.

### Service primitives

![W1L2 slide 21 - Service primitives](assets/01-introduction-and-reference-models/slide-w1l2-21.png)

**Service primitives** are the formal set of operations a layer offers its users. More complex services need more primitives. The table at the bottom of the slide lists the six primitives of a simple connection-oriented service:

| Primitive | Meaning |
| --- | --- |
| LISTEN | Block waiting for an incoming connection |
| CONNECT | Establish a connection with a waiting peer |
| ACCEPT | Accept an incoming connection from a peer |
| RECEIVE | Block waiting for an incoming message |
| SEND | Send a message to the peer |
| DISCONNECT | Terminate a connection |
<!-- Sources: w1l2 p.21 -->

The typical order is: the server does LISTEN, the client CONNECT, the server ACCEPT, both SEND/RECEIVE, and finally DISCONNECT. The same set of primitives reappears as sockets in [09 Transport layer](09-transport-layer-udp-tcp.en.md).

### Services versus protocols

![W1L2 slide 22 - Services and protocols](assets/01-introduction-and-reference-models/slide-w1l2-22.png)

The vertical arrows join layer $k+1$ and layer $k$ and are labelled "service provided by layer $k$"; the horizontal dashed line joins layer $k$ on the two machines and is labelled "protocol".

- A **service** is vertical: the set of primitives that layer $k$ provides to layer $k+1$ ; it says what can be done, not how.
- A **protocol** is horizontal: the rules governing the format and meaning of packets exchanged by peer entities within one layer.

For example, the transport layer offers SEND to the application through the interface: that is a service; how the two TCP entities number and acknowledge the data behind that SEND is the protocol.

![W1L2 slide 24 - Object-oriented analogy](assets/01-introduction-and-reference-models/slide-w1l2-24.png)

Look at the dashed Interface box on the right: it frames only the headings of `accelerate` and `decelerate`, the only part the user sees, which corresponds to the service; the method bodies (the code in braces) that the arrows on the left point to correspond to the protocol. As long as the signatures stay fixed, the implementation can be swapped.
<!-- Sources: w1l2 p.22-24; Apple Notes WEEK 1 -->

<a id="topic-4"></a>
## 4. Reference models: OSI and TCP/IP

### Why a reference model

Networks are very complex systems. A **reference model** simplifies the design process and gives many independent parties a common baseline for developing services and protocols; having an abstract model, validated by concrete implementations, is engineering best practice.
<!-- Sources: w2l2 p.3-4 -->

### The seven-layer OSI model

**OSI (Open Systems Interconnection)** comes from ISO and divides layers on these principles: create a layer only where a new abstraction is needed; each layer performs a well-defined function; choose layer boundaries to minimise information flow across interfaces; have enough layers to separate distinct functions but not so many that the architecture becomes unwieldy; choose each layer's function with internationally standardised protocols in mind.
<!-- Sources: w2l2 p.5-6; Apple Notes WEEK 2 Reference Models -->

![W2L2 slide 07 - OSI reference model](assets/01-introduction-and-reference-models/slide-w2l2-07.png)

The right-hand column (Name of unit exchanged) is the data unit exchanged at each layer. The two routers inside the rounded box in the middle implement only the bottom three layers, so those protocols run hop by hop between host and router (the host-router protocols labelled at the bottom); only the transport layer and above are end to end (host to host). This dividing line is the communication subnet boundary.

| Layer | Name | Data unit |
| --- | --- | --- |
| 7 | Application | APDU |
| 6 | Presentation | PPDU |
| 5 | Session | SPDU |
| 4 | Transport | Segment |
| 3 | Network | Packet |
| 2 | Data link | Frame |
| 1 | Physical | Bit |
<!-- Sources: w2l2 p.7; Apple Notes WEEK 2 Reference Models -->

### The four-layer TCP/IP model

TCP/IP was proposed by Vint Cerf and Bob Kahn (1974) and has only four layers.

![W2L2 slide 09 - OSI layers versus TCP/IP layers](assets/01-introduction-and-reference-models/slide-w2l2-09.png)

The two columns are aligned row by row: OSI's presentation and session layers are grey blanks in TCP/IP (Not present in the model); OSI's network layer corresponds to TCP/IP's internet layer; OSI's bottom two layers, data link and physical, merge into one TCP/IP layer, host-to-network (called Link on the next slide).

![W2L2 slide 10 - TCP/IP protocols](assets/01-introduction-and-reference-models/slide-w2l2-10.png)

This slide fills each layer with concrete protocols:

| Layer | Representative protocols | Uses noted by the student |
| --- | --- | --- |
| Application | HTTP, SMTP, RTP, DNS | Web pages, email, real-time audio/video, name resolution |
| Transport | TCP, UDP | TCP is reliable and connection-oriented; UDP is fast but unreliable |
| Internet | IP, ICMP | Packet forwarding; ICMP for control messages such as ping |
| Link | ADSL, SONET, 802.11, Ethernet | Broadband over phone lines, fibre backbones, Wi-Fi, wired Ethernet |
<!-- Sources: w2l2 p.8-10; Apple Notes WEEK 2 Reference Models -->

<a id="topic-5"></a>
## 5. Comparison, the hybrid model and origins

### Comparing and critiquing the two models

- **Similarities**: both are layered, both support end-to-end communication, and both aim to standardise network communication.
- **Differences**: different numbers of layers; OSI explicitly distinguishes services, interfaces and protocols, whereas TCP/IP has protocols that actually succeeded.
<!-- Sources: w2l2 p.11; Apple Notes WEEK 2 Reference Models -->

**Why OSI did not take over**: bad technology, bad implementations, bad timing.

![W2L2 slide 13 - Bad timing](assets/01-introduction-and-reference-models/slide-w2l2-13.png)

The horizontal axis is time and the vertical axis is activity. The first peak is the research burst, the second is the billion-dollar investment, and the trough between them is labelled Standards: the right moment for a standard is the low point between the two peaks. By the time the OSI standards appeared, TCP/IP was already widely deployed in universities, so OSI missed the trough.
<!-- Sources: w2l2 p.12-13 -->

**Problems with TCP/IP**: it is not a general model; it does not distinguish service, interface and protocol; it does not separate the physical and data link layers; some minor protocols are deeply entrenched and hard to replace.
<!-- Sources: w2l2 p.14 -->

### The hybrid model used in this subject

![W2L2 slide 15 - Hybrid model](assets/01-introduction-and-reference-models/slide-w2l2-15.png)

The five layer names are on the left; on the right is a typical scenario: a browser and a server each run HTTP, TCP, IP and 802.11 from top to bottom, joined by the line at the bottom. The model takes OSI's clean layering (physical and data link kept separate) and TCP/IP's real protocols:

| Layer | Name | Typical protocol (browser to server) |
| --- | --- | --- |
| 5 | Application | HTTP |
| 4 | Transport | TCP |
| 3 | Network | IP |
| 2 | Data link | 802.11 |
| 1 | Physical | 802.11 radio signals |
<!-- Sources: w2l2 p.15; rev1 p.6 -->

The rest of these notes follow these five layers bottom up: [02 Physical layer](02-physical-layer.en.md) → [03](03-data-link-framing-and-error-control.en.md)/[04 Data link layer](04-data-link-flow-control.en.md) → [05 MAC sublayer](05-mac-sublayer.en.md) → [06](06-network-layer-internetworking.en.md)/[07](07-ip-addressing.en.md)/[08 Network layer](08-routing-algorithms.en.md) → [09](09-transport-layer-udp-tcp.en.md)/[10 Transport layer](10-congestion-control.en.md) → [11](11-dns-and-www.en.md)/[12 Application layer](12-email-and-multimedia.en.md), and finally network security, which cuts across the layers, in [13](13-cryptography.en.md)/[14](14-signatures-authentication-security.en.md).

### Origins of the Internet

![W2L2 slide 16 - Telephone system and distributed switching](assets/01-introduction-and-reference-models/slide-w2l2-16.png)

![W2L2 slide 17 - Growth of the ARPANET](assets/01-introduction-and-reference-models/slide-w2l2-17.png)

On p.16, picture (a) is the traditional telephone system: phones connect to switching offices, which connect to toll offices, forming a hierarchical tree, so losing one switching office cuts off a large area beneath it; picture (b) is Baran's proposed distributed switching system, in which every node has several paths and traffic can route around a failed node. The five small pictures (a)–(e) on p.17 show ARPANET growing from 4 nodes in December 1969 to many research sites across the US by September 1972. This idea of not depending on a single centre carries through to today's Internet.
<!-- Sources: w2l2 p.16-17 -->

## Self-check

1. A laptop opens a web page over Wi-Fi. Using the hybrid model, list the protocol used at each layer from top to bottom, and say which layer's header the receiver strips first.
2. Why is a "service" a vertical relationship and a "protocol" a horizontal one? Illustrate with the SEND primitive.
3. Which of the six services best suits a video conference, and which a query of your online banking transaction history? Why?
4. Which OSI layers does a router implement? How does this relate to the transport layer being "end to end"?
