# COMP90007 Week 6 - IP and Addressing

Sources: `lecture/Week6-IP.pdf` (Network Layer (3)); review material `lecture/Week12-Review-handout.pdf` p.25–27; Apple Notes: CS/25S1/IT — "WEEK 6 - Network2 - IP & ICP"; CS/25S1/IT/Review — "Network Layer".

This lecture asks: **what is written inside an IP packet, and how does a 32-bit address tell a router which way to send it?**

Learning path: [The IPv4 datagram header](#topic-1) → [Addresses, prefixes and subnet masks](#topic-2) → [Subnetting and CIDR](#topic-3) → [Classful addressing, private addresses and NAT](#topic-4) → [IPv6 and control protocols](#topic-5).

Key points: prefix notation, subnet masks with bitwise AND, longest prefix matching. Hard parts: dividing subnets and aggregating routes at the bit level. Common mistakes: the 24 in /24 is the **number of bits** in the network portion; a router picks the **longest** (most specific) match, not the first one.

<a id="topic-1"></a>
## 1. The IPv4 datagram header

### Header layout

![Slide 03 - IPv4 header layout](assets/07-ip-addressing/slide-03.png)

An IPv4 datagram consists of a header and a payload. The header is a 20-byte fixed part plus a variable-length optional part (Options, zero or more 32-bit words). Each row of the figure is 32 bits, and the fixed part is five rows. The labels above link groups of fields to their purpose: Header Length points to IHL; Protocol says whether the payload goes to TCP or UDP; the second, red-boxed row (Identification, DF, MF, Fragment offset) handles fragmentation; the two red boxes below are the source and destination addresses.

### Length and fragmentation fields

![Slide 04 - IPv4 header fields part 1](assets/07-ip-addressing/slide-04.png)

| Field | Purpose |
| --- | --- |
| Version | IP version (4) |
| IHL | Header length in 32-bit units, min 5 and max 15 (i.e. 20–60 bytes) |
| Differentiated services | Distinguishes classes of service |
| Total length | Header plus payload, max 65 535 bytes |
| Identification | Lets the host tell which datagram a new fragment belongs to; all fragments of one datagram share the ID |
| DF | Don't Fragment, used in path MTU discovery |
| MF | More Fragments: is this the last one? |
| Fragment offset | Where in the datagram the current fragment belongs |
<!-- Sources: w6ip p.3-4; Apple Notes WEEK 6 Network2 -->

Identification, MF and Fragment offset are the real versions of the "packet number, end flag, byte offset" of the [IP-style fragmentation in 06](06-network-layer-internetworking.en.md#topic-4). IHL is counted in 32-bit (4-byte) units, so IHL = 5 means 20 bytes, the fixed part only.

### Lifetime, protocol and address fields

![Slide 05 - IPv4 header fields part 2](assets/07-ip-addressing/slide-05.png)

| Field | Purpose |
| --- | --- |
| TTL | Time to Live, limits packet lifetime in hops or seconds so packets cannot circle forever |
| Protocol | Which transport protocol the payload belongs to, e.g. TCP, UDP |
| Header checksum | Verifies the header only |
| Source / Destination address | IP addresses of sender and receiver |
| Options | E.g. security, strict vs loose source routing, record route, timestamp |
<!-- Sources: w6ip p.5 -->

<a id="topic-2"></a>
## 2. Addresses, prefixes and subnet masks

### Dotted decimal

![Slide 06 - Dotted decimal notation](assets/07-ip-addressing/slide-06.png)

An IPv4 address is 32 bits long, written as four decimal numbers from 0 to 255 separated by dots, e.g. `128.18.3.11`. Each part is 8 bits weighted from $2^7=128$ down to $2^0=1$ . The arrow in the figure points to the second part, 18: split by weights it is $16+2$ , so it is written `00010010`. IP allocation is managed overall by **ICANN (Internet Corporation for Assigned Names and Numbers)**; IPv4 addresses are running out.
<!-- Sources: w6ip p.6 -->

### Network portion and host portion

![Slide 07 - Network portion and prefix](assets/07-ip-addressing/slide-07.png)

An IP address is hierarchical: **network portion + host portion**. Addresses are allocated in **blocks**, and all hosts in a block share the same network portion. For example, the 256 addresses `128.18.3.0`–`128.18.3.255` form one block.

A **prefix** identifies an address block, written as "lowest address / number of network bits": the block above is `128.18.3.0/24`, because the first three parts, $8\times3=24$ bits, are the network portion. The slide's other example, `18.2.0.0/16`, has the first two parts as the network portion.
<!-- Sources: w6ip p.7; rev1 p.25; Apple Notes WEEK 6 Network2 -->

**Common mistake**: a /24 block has $2^{32-24}=256$ addresses; each extra bit of prefix length halves the block.

### Subnet mask

![Slide 08 - Subnet mask](assets/07-ip-addressing/slide-08.png)

A **subnet mask** has all 1s in the network portion and all 0s in the host portion. In the figure the 32 bits are split into a prefix of length $L$ (Network) and $32-L$ host bits (Host); the line below is the matching mask: $L$ ones followed by zeros. ANDing an IP address with the mask (**bitwise AND**) clears the host portion and leaves the network portion.
<!-- Sources: w6ip p.8 -->

**Illustrative example (our own)**: AND `128.18.3.11` with the /24 mask `255.255.255.0`: the first three parts AND 255 are unchanged, the last part AND 0 becomes 0, giving `128.18.3.0`, the network this host is on.

**Illustrative example (our own)**: when the prefix length is not a multiple of 8, look bit by bit inside the part that is cut. Host `172.20.135.14/20`: the first 20 bits are the network portion, i.e. the first two parts plus the first 4 bits of the third. 135 = `10000111`; keep `1000` and clear the rest to get `10000000` = 128, so the network address is `172.20.128.0`; the host portion has $32-20=12$ bits, so the network has $2^{12}=4096$ addresses.

### Routing tables

![Slide 09 - Routing table triplet](assets/07-ip-addressing/slide-09.png)

A routing table is typically built on a triplet: destination network, subnet mask, outgoing line (physical such as an Ethernet port, or virtual such as a VPN). For example, the row `128.18.3.0 | 255.255.255.0 | Eth 0` in the table means: any destination that gives `128.18.3.0` when ANDed with that mask goes out on Eth 0. The student's notes also list the next hop as part of an entry.
<!-- Sources: w6ip p.9; Apple Notes WEEK 6 Network2 -->

<a id="topic-3"></a>
## 3. Subnetting and CIDR

### Subnetting

![Slide 10 - Subnets at the University of Melbourne](assets/07-ip-addressing/slide-10.png)

**Subnetting** lets a network be split into several parts for internal use while acting as a single network to the outside. The ISP gives the University of Melbourne a single prefix `128.208.0.0/16`; the university router divides it internally among the EE (`128.208.0.0/18`), CS (`128.208.128.0/17`) and Art (`128.208.64.0/19`) departments, while the outside world always sees the one prefix.
<!-- Sources: w6ip p.10; rev1 p.26 -->

![Slide 11 - Subnet bits](assets/07-ip-addressing/slide-11.png)

Look at the first few bits of the third part (to the left of the red line are the added network bits; `x` marks host bits that are free to vary):

| Subnet | Start of third part | Prefix | Addresses |
| --- | --- | --- | --- |
| Whole block | `xxxxxxxx` | `128.208.0.0/16` | $2^{16}$ |
| EE | `00` | `128.208.0.0/18` | $2^{14}$ |
| Art | `010` | `128.208.64.0/19` | $2^{13}$ |
| CS | `1` | `128.208.128.0/17` | $2^{15}$ |
| Left over | `011` | `128.208.96.0/19` | $2^{13}$ |
<!-- Sources: w6ip p.11; rev1 p.27; Apple Notes WEEK 6 Network2 -->

Subnets may have different prefix lengths (variable-length subnets) as long as their leading bits do not overlap. The four blocks add up to $2^{14}+2^{13}+2^{15}+2^{13}=2^{16}$ , exactly the whole block.

### CIDR: route aggregation

![Slide 12 - CIDR aggregation](assets/07-ip-addressing/slide-12.png)

A backbone router connecting about 300k networks worldwide faces a routing-table explosion. **CIDR (Classless Inter-Domain Routing)** uses **aggregation** to join several prefixes into one larger prefix and shrink the routing table. In the figure, the London router serves three prefixes, Cambridge `192.24.0.0/21`, Oxford `192.24.16.0/20` and Edinburgh `192.24.8.0/22` ("3 prefixes"), while New York needs only one entry, `192.24.0.0/19`, pointing to London ("1 aggregate prefix").
<!-- Sources: w6ip p.12 -->

### Longest prefix matching

![Slide 13 - Longest matching prefix](assets/07-ip-addressing/slide-13.png)

The catch is that the block `192.24.12.0/22` was given to San Francisco and falls right inside London's /19. So the New York router's table has two rows: `192.24.12.0/22 → Eth 0 (to SF)` and `192.24.0.0/19 → Eth 1 (to London)`; their masks `255.255.252.0` and `255.255.224.0` are exactly /22 and /19. The rule: **packets are forwarded to the entry with the longest matching prefix (i.e. the smallest address block)**. First check for a /22 match; if not, check /19. This expresses "everything goes to London except San Francisco's little block" in two rows. The forwarding process becomes more complicated, in exchange for flexibility.
<!-- Sources: w6ip p.13; Apple Notes WEEK 6 Network2 -->

**Common mistake**: the label on San Francisco's outgoing line at the bottom left is printed as `192.2412.0/22`, missing a dot; it should be `192.24.12.0/22`.

**Illustrative example (our own)**:

| Destination | Matches /22 (192.24.12.0–192.24.15.255)? | Matches /19 (192.24.0.0–192.24.31.255)? | Outgoing line |
| --- | --- | --- | --- |
| `192.24.13.5` | Yes | Yes | Choose the longer /22: San Francisco |
| `192.24.9.1` | No | Yes | London |
| `192.24.40.1` | No | No | No match; use the default route (if any) |

![Slide 14 - CIDR bit breakdown](assets/07-ip-addressing/slide-14.png)

This slide checks at the bit level how the /19 is used up. Look only at the third part: London's /19 is `000xxxxx` ( $2^{13}=8192$ addresses); Cambridge `00000xxx` is a /21 ( $2^{11}$ ), Edinburgh `000010xx` a /22 ( $2^{10}$ ), San Francisco `000011xx` a /22 ( $2^{10}$ ), and Oxford `0001xxxx` a /20 ( $2^{12}$ ). The equation down the right, $2^{11}+2^{10}+2^{10}+2^{12}=2^{13}$ , shows that the four blocks exactly fill the /19, with San Francisco's block "carved out" by longest prefix matching.
<!-- Sources: w6ip p.14 -->

<a id="topic-4"></a>
## 4. Classful addressing, private addresses and NAT

### Classful addressing

![Slide 15 - Classful addressing](assets/07-ip-addressing/slide-15.png)

Addresses were originally allocated in fixed-size classes, with the class encoded in the leading bits. Read the leading bits on the left of the figure and the address ranges on the right:

| Class | Leading bits | Address range | Use |
| --- | --- | --- | --- |
| A | `0` | 1.0.0.0 – 127.255.255.255 | 8-bit network, 24-bit host |
| B | `10` | 128.0.0.0 – 191.255.255.255 | 16-bit network, 16-bit host |
| C | `110` | 192.0.0.0 – 223.255.255.255 | 24-bit network, 8-bit host |
| D | `1110` | 224.0.0.0 – 239.255.255.255 | Multicast |
| E | `1111` | 240.0.0.0 – 255.255.255.255 | Reserved |
<!-- Sources: w6ip p.15 -->

The problem is inflexibility: in the student's words, class A is too big and class C too small (only 254 usable hosts), so a medium-sized organisation had to take a class B and waste many addresses. CIDR was created to fix this.
<!-- Sources: Apple Notes WEEK 6 Network2 -->

### Private addresses

![Slide 16 - Private IP ranges](assets/07-ip-addressing/slide-16.png)

These ranges are reserved for private networks and **cannot appear on the Internet**:

| Range | Addresses |
| --- | --- |
| `10.0.0.0/8` | $2^{24}=16\,777\,216$ |
| `172.16.0.0/12` | $2^{20}=1\,048\,576$ |
| `192.168.0.0/16` | $2^{16}=65\,536$ |
<!-- Sources: w6ip p.16 -->

The number of addresses in each range is $2^{32-\text{prefix length}}$ , the same block-size rule as before. The slide calls them hosts; strictly they are addresses.

### Network Address Translation (NAT)

![Slide 17 - NAT](assets/07-ip-addressing/slide-17.png)

A **NAT** box maps one external IP address to many internal addresses. The dashed outline in the figure is the customer's premises: several devices form a LAN behind the customer router. A packet from internal host `10.0.0.1`, port 5544, passes through the NAT box (also a firewall), which rewrites its source to the public address `198.60.42.12`, port 3344, and hands it to the ISP router towards the Internet; the NAT records the mapping. When a reply arrives for port 3344, the NAT looks up the table, rewrites it back to `10.0.0.1:5544` and delivers it inside. It uses TCP/UDP ports to distinguish connections and is a popular way to conserve global address space.

**Issue**: NAT violates the layering principle. A network-layer device must read and rewrite transport-layer port numbers.
<!-- Sources: w6ip p.17; Apple Notes WEEK 6 Network2 -->

<a id="topic-5"></a>
## 5. IPv6 and control protocols

### IPv6

![Slide 18 - IPv6 addresses](assets/07-ip-addressing/slide-18.png)

IPv6 addresses are 128 bits, written in hexadecimal in 16-bit groups (4 hex digits each) separated by colons. The figure cuts a long binary string into 8 groups, giving `FDEC:0074:0000:0000:0000:B0FF:0000:FFFF`.

- A much larger address space, which is why the student's notes say NAT is no longer needed;
- more support for security: encryption and authentication;
- transition methods: dual stack, tunnelling (see [06 Tunnelling](06-network-layer-internetworking.en.md#topic-3)), header translation.
<!-- Sources: w6ip p.18; Apple Notes WEEK 6 Network2 -->

![Slide 19 - IPv6 header](assets/07-ip-addressing/slide-19.png)

The required IPv6 header is a fixed 40 bytes: Version, Differentiated services, Flow label, Payload length, Next header, Hop limit, and 16-byte source and destination addresses. Compared with IPv4, Hop limit plays the role of TTL and Next header that of Protocol, while the header checksum and fragmentation fields are absent from the fixed header.
<!-- Sources: w6ip p.19 -->

### Internet control protocols

![Slide 20 - Internet control protocols](assets/07-ip-addressing/slide-20.png)

IP works with the help of several control protocols:

| Protocol | Role | Procedure |
| --- | --- | --- |
| ICMP (Internet Control Message Protocol) | IP's companion that returns error information; ping and traceroute rely on it | E.g. Echo Request / Echo Reply |
| ARP (Address Resolution Protocol) | Finds the MAC address of a local IP address | The host broadcasts a query and the owner replies |
| DHCP (Dynamic Host Configuration Protocol) | Assigns a local IP address to a host automatically so it can get started | The host sends a request to a server, which grants a lease; the student's notes write it as Discover → Offer → Request → Ack |
<!-- Sources: w6ip p.20; Apple Notes WEEK 6 Network2 -->

**Common mistake**: the slide expands DHCP as "Dynamic Host Control Protocol"; the standard name is Dynamic Host **Configuration** Protocol, which also matches its job of configuring hosts automatically.

![Slide 21 - ICMP message types](assets/07-ip-addressing/slide-21.png)

ICMP is used for testing and monitoring conditions between hosts and routers. Common message types (the slide marks the first two and Echo with arrows):

| Message type | Meaning |
| --- | --- |
| Destination unreachable | Packet could not be delivered |
| Time exceeded | TTL hit 0 |
| Parameter problem | Invalid header field |
| Source quench | Choke packet (tells the source to slow down) |
| Redirect | Teach a router a better route |
| Echo and Echo reply | Check whether a machine is alive |
| Timestamp request/reply | Same as Echo, with a timestamp |
| Router advertisement/solicitation | Find a nearby router |
<!-- Sources: w6ip p.21 -->

**Illustrative example (our own)**: traceroute sends packets with TTL = 1, 2, 3, … When the $k$-th router decrements the TTL to 0 it returns Time exceeded, so the source learns the address of each router on the path hop by hop.

## Self-check

1. What is the network address of host `10.38.201.7/19`, and how many addresses does that network have?
2. Split `200.1.0.0/22` evenly into 4 subnets and give their prefixes.
3. A routing table has `10.0.0.0/8 → A`, `10.1.0.0/16 → B`, `10.1.2.0/24 → C`. Where do destinations `10.1.2.9` and `10.1.9.9` go?
4. Why is NAT said to violate the layering principle? Why do the student's notes consider NAT unnecessary with IPv6?
