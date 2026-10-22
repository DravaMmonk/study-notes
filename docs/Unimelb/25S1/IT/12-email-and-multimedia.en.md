# COMP90007 Weeks 10–11 - Application Layer: Email and Streaming Media

Sources: `lecture/Week10-Application Layer-Lectures2and3.pdf` p.26–42 (Application Layer (2), Email), `lecture/Week11-Application Layer-Lecture1.pdf` (Application Layer (3), Streaming Multimedia Data); review slides `lecture/Week12-Review-Lecture3.pdf` p.25–30. Apple Notes: CS/25S1/IT/Review — "Application Layer" (the student's WEEK10 note does not cover these two parts).

This lecture asks: **how does an email travel from the sender's computer to the recipient's mailbox, and what extra work must the application layer do for audio and video, which are large and sensitive to delay?**

Learning path: [Email architecture](#topic-1) → [Message format and MIME](#topic-2) → [SMTP and final delivery](#topic-3) → [The basic model of streaming media](#topic-4) → [Streaming challenges: errors, jitter and compression](#topic-5).

Key points: the three stages of mail delivery and their protocols, the role of MIME, jitter buffers, lossy compression. Hard parts: telling the envelope apart from the message header. Common mistakes: SMTP only "pushes" mail, while the recipient "pulls" it with POP3/IMAP (or the Web); real-time conferencing is not suited to retransmission.

<a id="topic-1"></a>
## 1. Email architecture

### Two kinds of component

![W10B slide 27 - User agents and message transfer agents](assets/12-email-and-multimedia/slide-w10b-27.png)

An email system has only two kinds of component, and the slide gives a Microsoft product as an example of each:

- **User agents**: let users read and send email, e.g. Microsoft Outlook. The Outlook screenshot on slide 31 shows what they do: compose, display and reply to messages, and manage mailboxes (sorting, creating folders);
- **Message transfer agents (MTAs)**: also called mail servers, they move messages from source to destination, e.g. Microsoft Exchange.

To remember: the user agent sits in front of the user; the MTA works in the background, usually unseen.
<!-- Sources: w10b p.27, p.31; rev2 p.25 -->

### Three stages of delivery

![W10B slide 30 - Email architecture with protocols](assets/12-email-and-multimedia/slide-w10b-30.png)

This is the architecture diagram from slide 28 with the protocols added in red (slide 29 is the text version). From left to right, Alice's mail to Bob takes three steps:

| Step | From where to where | Protocol |
| --- | --- | --- |
| 1 Mail submission | Alice's user agent → Alice's mail server | SMTP |
| 2 Message transfer | Alice's mail server → Bob's mail server, into Bob's mailbox | SMTP |
| 3 Final delivery | Bob's mailbox → Bob's user agent | POP3 or IMAP |

**Common mistake**: the first two stages are the sender side "pushing" mail, using SMTP; the third is the recipient "pulling" mail, which switches to POP3 or IMAP. Bob's computer need not be online all the time; the mail waits in the mailbox on Bob's mail server.
<!-- Sources: w10b p.28-30; Apple Notes Review Application Layer -->

<a id="topic-2"></a>
## 2. Message format and MIME

### Envelope, header and body

![W10B slide 32 - Envelope, header and body](assets/12-email-and-multimedia/slide-w10b-32.png)

- **Envelope**: encapsulates transport-related information used by SMTP to transfer the message, e.g. `MAIL FROM` (envelope sender) and `RCPT TO` (recipient). A transfer agent may build the envelope from some header fields;
- **Header**: control information for the user agents;
- **Body**: the message for the human recipient.
- **Addressing scheme**: `user@dns-address`, e.g. `username@student.unimelb.edu.au`. The part after @ is exactly the domain name handed to DNS to look up its MX record (see [11 Resource records](11-dns-and-www.en.md#topic-2)).
<!-- Sources: w10b p.32 -->

![W10B slide 33 - Message format: header, blank line, body](assets/12-email-and-multimedia/slide-w10b-33.png)

A message is shaped much like an HTTP message: a block of header lines (To, From, Subject…) at the top, a blank line in the middle, and the body, the actual "letter", below.

![W10B slide 34 - Common header fields](assets/12-email-and-multimedia/slide-w10b-34.png)

Pairs in the table that are easy to confuse: To is the primary recipient, Cc (carbon copy) the secondary recipient, and Bcc (blind carbon copy) addresses are not shown to other recipients; From is the person who wrote the message, Sender is the address that actually sent it (they differ when, say, an assistant sends on a manager's behalf). Received is added as one line by each transfer agent along the route, and Return-Path can identify a path back to the sender; both are added by the system during transfer.
<!-- Sources: w10b p.33-34 -->

**Illustrative example (our own)**: the envelope is like the address on a paper envelope, which is all the post office reads; the header is like the "Dear …" at the top of the letter. A Bcc recipient appears in the envelope's RCPT TO but not in the header others see, so nobody else knows they received it.

### MIME

![W10B slide 35 - Limits of RFC 822](assets/12-email-and-multimedia/slide-w10b-35.png)

In early email, messages were in English and ASCII only, and RFC 822 reflected these simple constraints. Over time the limits became clear; the slide lists four kinds: languages with accents (French, Spanish), non-Latin alphabets (Cyrillic), non-alphabetic languages (Chinese, Japanese), and content other than text (audio, images). The solution is **MIME (Multipurpose Internet Mail Extensions)**.
<!-- Sources: w10b p.35 -->

![W10B slide 36 - The five MIME headers](assets/12-email-and-multimedia/slide-w10b-36.png)

MIME does two things: it adds structure to the message body and defines encoding rules for non-ASCII content. For this it adds five headers: MIME-Version identifies the version; Content-Description is a human-readable description; Content-Id is a unique identifier; **Content-Transfer-Encoding** says how the body is wrapped for transmission (e.g. base64, which turns binary into printable ASCII characters); **Content-Type** gives the type and format of the content. The last two matter most: one solves "how to get safely through SMTP", the other "how to interpret it on arrival".
<!-- Sources: w10b p.36; Apple Notes Review Application Layer -->

![W10B slide 37 - MIME types and subtypes](assets/12-email-and-multimedia/slide-w10b-37.png)

A Content-Type value is written "type/subtype", e.g. `text/html`, `image/jpeg`, `application/pdf`. The first six types in the table (text, image, audio, video, model, application) describe a single kind of content; the last two are containers: `message` encapsulates another message, and `multipart` combines several types, with subtypes mixed (attachments), alternative (several versions of the same content), parallel (played together) and digest (a collection).
<!-- Sources: w10b p.37 -->

![W10B slide 38 - MIME multipart/alternative example](assets/12-email-and-multimedia/slide-w10b-38.png)

This birthday greeting uses `multipart/alternative`: the header gives a boundary string (`boundary=qwertyuiop…`), which cuts the body into two parts; the preamble before the first boundary is ignored by the user agent. The first part, `text/html`, is the HTML version; the second is an audio version, but it is `message/external-body`: the mail only says on which FTP site the audio file lives and what it is called, while the file itself is `audio/basic`, encoded with `base64`. The recipient's user agent picks whichever version it can display. The student's review summary: MIME converts many kinds of content into text form so that SMTP can carry non-text content.
<!-- Sources: w10b p.38; Apple Notes Review Application Layer -->

<a id="topic-3"></a>
## 3. SMTP and final delivery

### SMTP

![W10B slide 39 - SMTP submission and transfer](assets/12-email-and-multimedia/slide-w10b-39.png)

**SMTP (Simple Mail Transfer Protocol)** has two uses, on different ports:

- **Mail submission**: the user agent submits to the MTA on **port 587**, usually with authentication (the sender's credentials);
- **Message transfer**: the sending MTA opens a TCP connection to **port 25** of the receiving MTA; transfer has three phases: handshake, message transfer, closure; it is a command/response interaction in ASCII: the client sends commands, the server answers with a response code and phrase;
- if the destination server is not immediately available, the email is queued and retried later.
<!-- Sources: w10b p.39 -->

![W10B slide 40 - SMTP dialog between client and server](assets/12-email-and-multimedia/slide-w10b-40.png)

Follow the exchange between C (client) and S (server); it matches the three phases on the previous slide:

1. Handshake: S first reports 220 service ready; C greets with `HELO`, and S replies 250;
2. message transfer: `MAIL FROM` and `RCPT TO` form the envelope, and S answers 250 to each; C sends `DATA`, S replies 354, "end with . on a line by itself"; C then sends the whole message (with its MIME headers and multipart body), ending with a line containing only "."; S replies 250 to accept it;
3. closure: C sends `QUIT`, and S replies 221, closing the connection.

The 250 reply to `HELO abcd.com` in the figure reads "cs.washington.edu says hello to ee.uwa.edu.au", with the two host names swapped (the 220 line already shows the server is `ee.uwa.edu.au`); this is a small flaw in the slide's (textbook-derived) example and does not affect the command order. Each message takes several round trips, which is where the disadvantage in the table below comes from.
<!-- Sources: w10b p.40 -->

| Advantage of SMTP | Disadvantage of SMTP |
| --- | --- |
| A simple text-based protocol that is easy to read, debug and implement | Each email needs several back-and-forth messages; non-text content needs transfer encoding |
<!-- Sources: w10b p.40; rev2 p.26-27; Apple Notes Review Application Layer -->

### Final delivery

![W10B slide 41 - IMAP and POP3](assets/12-email-and-multimedia/slide-w10b-41.png)

| Protocol | Port and operation | Properties |
| --- | --- | --- |
| IMAP (Internet Message Access Protocol) | The receiving MTA runs an IMAP server on port 143 and the user agent runs an IMAP client; commands such as LOGIN, LIST, CREATE, DELETE, COPY | Mail stays on the server; designed with multiple devices in mind |
| POP3 (Post Office Protocol version 3) | A simpler protocol for final delivery | Mail is downloaded to the user agent's computer and not kept on the server; suits a single device |

IMAP's commands include CREATE and COPY, showing that folders are also managed on the server, so every device sees the same mailbox. **Extension**: many POP3 clients offer a "leave a copy on the server" option, but the protocol's design is still download-and-keep-locally.
<!-- Sources: w10b p.29, p.41 -->

![W10B slide 42 - Webmail](assets/12-email-and-multimedia/slide-w10b-42.png)

**Webmail** (e.g. Gmail, Hotmail) uses a set of web pages rendered in a browser as the user agent. Against the three stages: submission uses HTTP + SMTP; final delivery uses HTTP + custom APIs/IMAP/POP3; transfer between mail servers still uses SMTP. In other words, webmail only changes the two legs between the user and their own mail server.
<!-- Sources: w10b p.42 -->

<a id="topic-4"></a>
## 4. The basic model of streaming media

### What is different about multimedia data

![W11A slide 03 - Multimedia data](assets/12-email-and-multimedia/slide-w11a-03.png)

Multimedia data includes **streaming stored media**, **streaming live media** and **interactive audio and video conferencing**. Compared with ordinary data it needs more bandwidth and has stringent QoS requirements: it is sensitive to delay and jitter. Handling multimedia is a key application-layer challenge.
<!-- Sources: w11a p.3 -->

### The simplest model: download, then play

![W11A slide 04 - Basic model: download then play](assets/12-email-and-multimedia/slide-w11a-04.png)

Follow the numbers: 1 the browser requests the media from the web server over HTTP; 2 the whole media file comes back over HTTP; 3 the browser saves it to the local disk; 4 the media player reads it from disk and plays it. Playback cannot start before the whole file has arrived. The upside is that there is no real-time network problem to address; the downside is that users must wait for the download.
<!-- Sources: w11a p.4 -->

### Specialised player software

![W11A slide 05 - Specialised multimedia software with a metafile](assets/12-email-and-multimedia/slide-w11a-05.png)

The improved approach adds dedicated player software. Compared with the previous figure, there is an extra media server: the browser first fetches a tiny **metafile** from the web server over HTTP (steps 1–2), which only says where the media is; the browser hands it to the media player (step 3); the player then uses RTSP to request the media directly from the media server (step 4), and the media streams back over TCP or UDP (step 5) and is played as it arrives.
<!-- Sources: w11a p.5 -->

![W11A slide 06 - Streaming media protocols](assets/12-email-and-multimedia/slide-w11a-06.png)

The slide stresses that these protocols are often used together, each with its own job: HTTP fetches metafiles or downloads segments; **RTSP (Real Time Streaming Protocol)** provides "remote control" functions such as PLAY, PAUSE, RECORD; **RTP (Real-time Transport Protocol)** runs over UDP with no retransmission, supports multicasting and timestamping, and carries the data; MPEG-4 handles compression; and there are closed protocols too, such as QuickTime, Adobe RTMP and Spotify's proprietary HTTP-based protocol.
<!-- Sources: w11a p.6 -->

![W11A slide 07 - Main tasks of playback software](assets/12-email-and-multimedia/slide-w11a-07.png)

The four main tasks of playback software are exactly the outline of the next section: handle the user interface (volume, playback, next); handle transmission errors together with the transport protocol (over RTP/UDP it must mask errors gracefully); eliminate jitter; compress and decompress. The jitter item gives the buffer-size trade-off: a small buffer starts playback quickly but is susceptible to jitter and delay; a large buffer delays the start but is less susceptible.
<!-- Sources: w11a p.7; rev2 p.28 -->

<a id="topic-5"></a>
## 5. Streaming challenges: errors, jitter and compression

### Handling errors

![W11A slide 08 - Forward error correction with a parity packet](assets/12-email-and-multimedia/slide-w11a-08.png)

**Forward Error Correction (FEC)**: use redundant bits for correction, without asking the sender to retransmit. Look at "Construct parity" at the server on the right: for every 4 data packets A, B, C, D one parity packet $P=A\oplus B\oplus C\oplus D$ (bitwise exclusive-OR, XOR) is added. On the line in the middle, B is a dashed box, meaning it was lost; "Repair loss" at the client on the left computes it back as $B=P\oplus A\oplus C\oplus D$ . A video file can also be encoded with a Hamming or Reed-Solomon code (Hamming codes are in [03 Framing and error control](03-data-link-framing-and-error-control.en.md)).

**Illustrative example (our own)**: A = `1010`, B = `0110`, C = `1100`, D = `0001`, so $P=A\oplus B\oplus C\oplus D=$ `0001`. If B is lost, the receiver computes $A\oplus C\oplus D\oplus P=$ `0110`, which is exactly B. The cost is one extra packet per 4 data packets, i.e. 25% more traffic relative to the data (1/5 of everything sent). This trick recovers only **one** lost packet per group; if two in the same group are lost they cannot be recovered, and only the error concealment below helps.
<!-- Sources: w11a p.8-9 -->

![W11A slide 09 - Error resilience, concealment and retransmission](assets/12-email-and-multimedia/slide-w11a-09.png)

- **Error resilience**: in many compression schemes, losing one packet affects the decompression of later data. Placing special markers close together lets decompression recover quickly at a marker, reducing the damage from loss.
- **Error concealment**: done by the receiver, e.g. interpolating between frames to soften visible errors.
- **Retransmission**: of little use for interactive audio/video conferencing, because retransmitted data usually arrives after its playback moment.

### Managing jitter

![W11A slide 10 - Jitter buffer with low and high water marks](assets/12-email-and-multimedia/slide-w11a-10.png)

Jitter comes from variable bandwidth and from loss and retransmission; the solution is **buffering**: the client stores some data before playing. Look at the two vertical lines on the client's buffer: below the **low-water mark** a stall threatens, so it is the "safety margin to avoid a stall"; above the **high-water mark** the server can be paused to avoid overflow. The player takes data from the left at a steady rate while the network delivers it unevenly from the right, and the buffer absorbs the difference.
<!-- Sources: w11a p.10 -->

For the buffer-size trade-off see the [playback software tasks](#topic-4) in the previous section; real-time conferencing needs a small buffer, as explained at the end of this section.
<!-- Sources: w11a p.7 -->

### Compression

![W11A slide 12 - Encoding, decoding and their asymmetry](assets/12-email-and-multimedia/slide-w11a-12.png)

Multimedia data is often compressed to cut bandwidth needs and transfer times (slide 11). A compression system needs two algorithms: **encoding** at the source and **decoding** at the destination. In the figure, 200 kB is encoded to 20 kB for sending and decoded back to 200 kB. The two are asymmetric: encoding may be slow and resource-intensive, but decoding must be fast and need no expensive hardware, because every viewer decodes. Also, the process may be lossy: the decoded 200 kB need not equal the original 200 kB.
<!-- Sources: w11a p.11-12 -->

![W11A slide 13 - Lossless vs lossy and the threshold of audibility](assets/12-email-and-multimedia/slide-w11a-13.png)

| | Lossless | Lossy |
| --- | --- | --- |
| Reconstruction | Original data reconstructed exactly | Only approximately |
| Relies on | Structure in the original data | Limits of human perception |

The curve at the bottom is the **threshold of audibility**: the horizontal axis is frequency (kHz, log scale), the vertical axis power (dB). Sounds below the curve cannot be heard; the curve is lowest around 2–5 kHz, so the ear is most sensitive there, while at very low and very high frequencies a sound must be loud to be heard. An encoder can safely drop components below the curve, which is concretely what "exploiting perceptual limits" means.
<!-- Sources: w11a p.13 -->

**Key point: why multimedia uses lossy compression.** Multimedia commonly uses lossy schemes based on **perceptual encoding**, which exploit flaws in human hearing and vision to remove information people cannot perceive, e.g. MP3 (audio), JPEG (images), H.264 (video). Accepting a small loss of information buys a large gain in compression ratio, which is why it matters.
<!-- Sources: w11a p.13; rev2 p.29-30; Apple Notes Review Application Layer -->

### Live streaming and real-time conferencing

![W11A slide 14 - Streaming live media](assets/12-email-and-multimedia/slide-w11a-14.png)

**Streaming live media**: broadcast live over the Internet, and viewers can tune in at any time. Clients still buffer to smooth jitter; ideally multicast with RTP over UDP would be used, but in practice TCP is common, because IP multicast is often only available within one provider's network, so each client gets its own stream, which needs a set of servers forming a **content distribution network (CDN)**.

![W11A slide 15 - Real-time conferencing and SIP](assets/12-email-and-multimedia/slide-w11a-15.png)

**Real-time conferencing** (voice over IP, video conferences): needs low latency. Buffers are small and packets that arrive too late are skipped; video quality can be adjusted; network-layer QoS can be used, such as resource reservation and Differentiated Services marking. An application-layer protocol example is **SIP (Session Initiation Protocol)**: it locates the callee and determines capabilities, establishes two-party, multiparty and multicast sessions, and handles setup, management and termination of sessions.

**Common mistake**: conferencing and on-demand streaming make opposite trade-offs. On-demand playback can trade a large buffer for smoothness; in a conference a large buffer means noticeable lag in the conversation, so late packets are skipped rather than waiting for retransmission.
<!-- Sources: w11a p.14-15 -->

## Self-check

1. Alice sends mail to Bob with Outlook, and Bob reads mail on both a phone and a computer. Which protocol and port are used at each of the three stages? Should Bob choose POP3 or IMAP?
2. An email carries both an HTML body and a JPEG attachment. Roughly what does its Content-Type header say? Why does the attachment part also need a Content-Transfer-Encoding?
3. Design jitter buffers for a video-conferencing app and for a film-on-demand site: which is larger, which smaller? How does each handle late packets?
4. FEC adds one XOR parity packet per 3 data packets. What is the overhead? If the parity packet itself is lost in a group, what must the receiver do?
