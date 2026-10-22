# COMP90007 Internet Technologies

These notes are for learners new to computer networks and follow COMP90007 as taught in Semester 1, 2025 (25S1). The subject follows the "hybrid five-layer model" from the bottom up: physical layer → data link layer (including the MAC sublayer) → network layer → transport layer → application layer, finishing with network security, which cuts across the layers. Each note first states the question its lecture answers, then shows selected slide pages in lecture order, each immediately followed by what to look at and what the figure or table shows; the slides are the backbone, while the student's notes and the review material only decide emphasis and add examples. **Key points / Hard parts / Common mistakes** mark places that deserve extra attention while learning; they are not predictions of exam scope. Our own examples and material beyond the slides are labelled or folded away, and each note ends with a self-check.

## Study by module

| Module | Reading order | Skills to build |
| --- | --- | --- |
| Networks and layering | [01 Introduction and reference models](01-introduction-and-reference-models.en.md) | Classify networks; distinguish services and protocols; OSI and TCP/IP |
| Physical layer | [02 Physical layer](02-physical-layer.en.md) | Delay calculations, transmission media, modulation, the Nyquist and Shannon limits |
| Data link layer | [03 Framing and error control](03-data-link-framing-and-error-control.en.md) → [04 Flow control and link protocols](04-data-link-flow-control.en.md) | Framing, Hamming distance, CRC, stop-and-wait and sliding windows |
| MAC sublayer | [05 MAC sublayer](05-mac-sublayer.en.md) | ALOHA, CSMA, collision-free protocols, MACA, Ethernet |
| Network layer | [06 Service models and internetworking](06-network-layer-internetworking.en.md) → [07 IP and addressing](07-ip-addressing.en.md) → [08 Routing algorithms](08-routing-algorithms.en.md) | Datagrams and virtual circuits, fragmentation, subnets and CIDR, Dijkstra, distance vector and link state |
| Transport layer | [09 Connection management, UDP and TCP](09-transport-layer-udp-tcp.en.md) → [10 Quality of service and congestion control](10-congestion-control.en.md) | Three-way handshake, TCP sequence numbers and windows, slow start, Tahoe and Reno |
| Application layer | [11 DNS and the WWW](11-dns-and-www.en.md) → [12 Email and streaming media](12-email-and-multimedia.en.md) | Name resolution, HTTP connections and messages, SMTP/MIME, jitter and compression |
| Network security | [13 Cryptography](13-cryptography.en.md) → [14 Signatures, authentication and communication security](14-signatures-authentication-security.en.md) | Cipher modes, RSA, certificates, digital signatures, DH, IPsec, VPNs, HTTPS |

While following the course, read the notes in file order 01–14; each title names its teaching week(s). When revising, read by layer using the table above. Concepts that recur across lectures are explained in full only in their main note and linked from elsewhere: for example TDM/FDM are explained in 02 and only referenced in the MAC sublayer; Hamming codes live in 03 and are only referenced by streaming FEC; tunnelling lives in 06 and is only referenced by IPv6 transition and IPsec.

## Where the worked-example solutions fit

No tutorial materials were recovered for this subject. The worked-example solutions attached to the lecture pages, and the review material, are linked to the notes by content; questions in the review material only decide which concepts deserve emphasis, and the notes present concepts and our own examples without reproducing the questions.

| Exercise | Main links in the notes |
| --- | --- |
| Physical Layer (1) delay examples 1–2 (`example_solutions.pdf`) | [02](02-physical-layer.en.md#topic-1): transmission delay, propagation delay and total latency |
| Physical Layer (2) Nyquist/Shannon examples 1–3 (`W3-L2-example_solutions.pdf`) | [02](02-physical-layer.en.md#topic-5): maximum data rate of noiseless and noisy channels |
| Review handout (`Week12-Review-handout.pdf`) | The matching topics of 01–08 and 13–14 |
| Review (2) answers to sample questions (`Week12-Review-Lecture3.pdf`) | Main slide source of [09](09-transport-layer-udp-tcp.en.md); other pages folded into 10–12 |
| Security review answers (`Week12-Review-1-sample-solution.pdf`) | [13](13-cryptography.en.md), [14](14-signatures-authentication-security.en.md) (concepts only) |

## Resources and sources

- [Resource completeness](RESOURCE-STATUS.en.md): checked on 2026-10-22; lists the local slides, worked-example solutions and student notes week by week, and the items that are missing or need to be kept apart.
- [materials.json](materials.json): each file's stable source URL, SHA-256, size, PDF page count and first-page excerpt.

The slides were recovered from [Canvas](https://canvas.lms.unimelb.edu.au/courses/210316) on **21 October 2026**: all 26 file links visible on the Week 1–7 and Week 9–12 lecture pages, including worked-example solutions and revision material. Week 7 explicitly reuses W6-L3, and its other two lectures were cancelled; no Week 8 lecture entry was present in the expanded module list. Tutorial pages were outside the scope of this lecture-PDF recovery. The Downloads originals were copied and preserved.

**The student's notes**: on 22 October 2026, 17 weekly notes from Apple Notes `CS/25S1/IT` and 8 review notes from `CS/25S1/IT/Review` were imported. The student's notes are a secondary source: they decide emphasis, keep the student's own examples and phrasing, and in several places their slips are flagged (e.g. Ethernet's minimum frame size, the DNS port, the end-around carry of the Internet checksum). Most screenshots in the notes are slide pages; wherever a local lecture PDF exists, a freshly rendered page is used instead. Not imported as such:

- `practice_exam`: a heading with no content;
- sample and practice exam questions in the review notes: only the concepts they test are folded into the relevant topics, without reproducing the questions; the TCP Tahoe hand trace uses our own numbers;
- the screenshot marked Assignment-2 in the `Network Layer` review note: assignment content, not published.

**Notes on provenance**:

- The three transport-layer notes the student labelled "WEEK 8" (transport services, UDP and TCP, TCP management) correspond to Transport Layer (1) and (2), whose slides were not recovered locally. [09](09-transport-layer-udp-tcp.en.md) therefore uses the review slides `Week12-Review-Lecture3.pdf` as its lecture source, supplemented by 16 screenshots from the student's notes, marked `note-XX`.
- `Week9-Transport Layer-Lectures2and3.pdf` says Lectures 2 and 3 in its file name, but its first page is titled Transport Layer (3) and it covers quality of service and congestion control, so by content it belongs to [10](10-congestion-control.en.md).
- Week 6's three files are Network Layer (2), (3) and (4) in order, so W6-L3 is inferred to be the routing lecture (`Week6-routing.pdf`); the student labelled the routing note "WEEK 7", consistent with "Week 7 reuses W6-L3".
- For the network and transport layers the student's part numbers differ from the slides': the student's "Network2" and "Network3" are the decks Network Layer (3) and (4), and "Transport4" is the deck Transport Layer (3). Filing follows the first-page title of each deck.
- The security outline the student labelled "WEEK12" covers both Network Security (1) (filed under Week 11) and (2).

Slide screenshot numbers always refer to the **PDF page index**, not the printed footer number: decks on the same topic share continuous footer numbering (Data Link Layer (3)'s footers start at 34, for example). When a note uses one deck the screenshots are named `slide-XX`; when it uses several, a short code is added, as in `slide-w3phy-13`; the short codes are listed in [Resource completeness](RESOURCE-STATUS.en.md).

| Local directory | Contents |
| --- | --- |
| `lecture/` | 26 lecture, example-solution and review PDFs (original file names retained) |
| `assets/<topic>/` | PNG screenshots of selected slide pages (`slide-…`), plus screenshots from the student's notes with no local lecture PDF (`note-XX`) |

Binary resources and screenshots are ignored by Git and exist only in this local checkout; they are not committed to the repository. The reusable rules for organising these notes are in the repository at `.claude/skills/study-notes-course-materials/SKILL.md`.
