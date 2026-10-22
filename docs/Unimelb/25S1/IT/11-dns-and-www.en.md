# COMP90007 Week 10 - Application Layer: DNS and the WWW

Sources: `lecture/Week10-Application Layer-Lecture1.pdf` (Application Layer (1), DNS), `lecture/Week10-Application Layer-Lectures2and3.pdf` p.1–25 (Application Layer (2), WWW); review slides `lecture/Week12-Review-Lecture3.pdf` p.17–24. Apple Notes: CS/25S1/IT — "WEEK10 - Application Layer1 - DNS WWW"; CS/25S1/IT/Review — "Application Layer".

This lecture asks: **after you type a web address into a browser, how does the name become an IP address, and how do the page's objects travel from the server to the browser?**

Learning path: [What DNS does](#topic-1) → [Namespace and resource records](#topic-2) → [Name servers and resolution](#topic-3) → [The WWW and HTTP connections](#topic-4) → [HTTP messages, cookies and caching](#topic-5).

Key points: the DNS resolution process, recursive versus iterative queries, timing non-persistent and persistent HTTP. Hard parts: telling apart the roles of the different name servers. Common mistakes: DNS normally runs on UDP port 53; port 80 is what the browser then uses for its TCP connection to the web server.

The subject's four application-layer topics are DNS, the WWW, email and streaming media; the last two are in [12 Email and streaming media](12-email-and-multimedia.en.md).
<!-- Sources: w10a p.2 -->

<a id="topic-1"></a>
## 1. What DNS does

Packets are addressed by IP addresses (e.g. `121.7.106.83`), but people prefer names (e.g. `www.google.com`). **DNS (Domain Name System)** is an application-layer protocol that maps human-readable domain names to computer-friendly IP addresses; other application-layer protocols such as HTTP, FTP and SMTP use it. It is a **distributed database** implemented in a hierarchy of many name servers.
<!-- Sources: w10a p.3; Apple Notes WEEK10 Application Layer1 -->

### The name resolution process

![W10A slide 04 - Use of DNS for name resolution](assets/11-dns-and-www/slide-w10a-04.png)

DNS's main service is **name resolution**: finding the IP address for a given hostname. Read the slide's five steps: a browser wants `www.someschool.edu/index.html`; the DNS client on the local machine (step 1) receives the hostname extracted from the URL (step 2), sends a query to a DNS server (step 3), and eventually receives a reply containing the IP address (step 4); only in step 5 does the browser open a TCP connection to **port 80** at that IP address. The first four steps are DNS; step five is already the start of HTTP.
<!-- Sources: w10a p.4 -->

**Common mistake**: the student's notes say "DNS uses TCP port 80". The TCP port 80 in step 5 is the browser connecting to the web server; the DNS query itself normally goes over **UDP port 53**, and lost queries are retransmitted (see [the resolution process](#topic-3)).
<!-- Sources: w10a p.4, p.18; Apple Notes WEEK10 Application Layer1 -->

### Services beyond name resolution

![W10A slide 05 - Other DNS services](assets/11-dns-and-www/slide-w10a-05.png)

The slide lists three; the table lines each up with its example:

| Service | What it does | Example |
| --- | --- | --- |
| Host aliasing | Maps alias names to canonical names | `www.unimelb.edu.au` is an alias of `squizedge-cloud.cms.unimelb.edu.au` |
| Mail server registry | Finds the server willing to accept mail for a domain | Mail to `…@unimelb.edu.au` needs the mail server of `unimelb.edu.au` |
| Load distribution and redundancy | One canonical name maps to several IPs; DNS rotates their order to spread load; if one is down the client can try another | The many servers of a large website |
<!-- Sources: w10a p.5; Apple Notes WEEK10 Application Layer1 -->

<a id="topic-2"></a>
## 2. Namespace and resource records

### A hierarchical namespace

![W10A slide 06 - DNS namespace tree](assets/11-dns-and-www/slide-w10a-06.png)

The DNS namespace is a tree. Below the root are the **top-level domains (TLDs)**: the left span marked Generic holds generic domains (com, edu, gov, org, net…), the right span marked Countries holds country domains (au, jp, uk, nl…). Reading from a leaf up to the root gives the full name, e.g. `robot.cs.washington.edu` at the bottom left: washington under edu, cs under that, and host robot under cs. The table on the next slide adds that the Internet has historically been divided into over 250 TLDs.
<!-- Sources: w10a p.6-7; Apple Notes WEEK10 Application Layer1 -->

### How domain names are written

![W10A slide 08 - Domain name characteristics](assets/11-dns-and-www/slide-w10a-08.png)

- Case insensitive: `WWW.UniMelb.edu.au` and `www.unimelb.edu.au` are the same name;
- up to 63 characters per component and 255 per full path;
- internationalised (non-English characters) since 1999;
- an **absolute domain name** ends in "." and specifies its exact place in the tree; a **relative domain name** specifies the location only partly and is usable only within the context of an absolute name.
<!-- Sources: w10a p.8; Apple Notes WEEK10 Application Layer1 -->

**Illustrative example (our own)**: inside `cs.washington.edu`, writing `robot` is a relative name; adding its domain gives `robot.cs.washington.edu.`, where the final dot stands for the root. The `www.unimelb.edu.au.` in the dig output later carries that dot, so it is an absolute name.

### Resource records

![W10A slide 09 - Resource records as five-tuples](assets/11-dns-and-www/slide-w10a-09.png)

The DNS database stores **resource records (RRs)**. Each RR is a five-tuple (domain name, TTL, class, type, value): the domain name says whom the record belongs to; the **TTL (time to live)** says how stable the record is, i.e. how long others may cache it; the class is always IN on the Internet; the type decides how to read the value.
<!-- Sources: w10a p.9 -->

![W10A slide 10 - Resource record types](assets/11-dns-and-www/slide-w10a-10.png)

The six yellow rows are the most used: SOA gives this zone's parameters; A is an IPv4 address (32 bits) and AAAA an IPv6 address (128 bits); MX (mail exchange) gives a priority and the domain willing to accept mail; NS names a name server for this domain; CNAME points an alias to its canonical name. Below them: PTR is used to look up a name from an IP (reverse lookup), SPF encodes a mail sending policy as text, SRV names the host providing a service, and TXT is descriptive text.
<!-- Sources: w10a p.10; Apple Notes Review Application Layer -->

![W10A slide 11 - Example resource records for cs.vu.nl](assets/11-dns-and-www/slide-w10a-11.png)

This is part of the database for `cs.vu.nl`. Read the three red-labelled groups: the SOA, MX and NS records at the top describe the whole domain (the name server is `star`, where mail goes); the A records in the middle give the computers' IP addresses, with `www` and `ftp` as CNAMEs pointing to `star` and `zephyr`; the MX records for `flits` and `rowboat` below name their mail gateways. Each line reads left to right as the five-tuple: name, TTL (86400 seconds, one day), IN, type, value. The student's review summary: A translates a name to an IP, CNAME is an alias (usable for load balancing), NS is a name server record.
<!-- Sources: w10a p.11; Apple Notes Review Application Layer -->

<a id="topic-3"></a>
## 3. Name servers and resolution

### Zones and authoritative servers

![W10A slide 12 - Non-overlapping zones](assets/11-dns-and-www/slide-w10a-12.png)

The DNS namespace is divided into non-overlapping **zones**; the pink outline around `cs.washington.edu` (containing robot) is one zone. The next slide continues: name servers are arranged hierarchically down from a set of root servers; each zone has one or more name servers holding its database, and they are **authoritative** for that zone: their answers are always correct.
<!-- Sources: w10a p.12-13; rev2 p.18 -->

**Why not centralise**: slide 14 lists four reasons: one central database could not handle the traffic, would be a single point of failure, would be distant from most users, and would be hard to maintain. So DNS hands the data out to zones, each managing its own.
<!-- Sources: w10a p.14 -->

### Four kinds of name server

![W10A slide 16 - Root and TLD name servers](assets/11-dns-and-www/slide-w10a-16.png)

Slide 15 first lists the four kinds: root, TLD, other authoritative, local. This slide covers the first two:

- **Root name servers**: the starting point of resolution; the slide says there are 13 worldwide. A root server does not know the final answer; it gives a **referral** to a TLD server: the TLD server's name (NS record, authoritative) plus its IP address (A record, called the **glue record**).
- **TLD name servers**: responsible for com, org, net, edu etc. and country domains uk, fr, au, jp etc.; give referrals to the authoritative servers of the zones below.

**Hard part: why the glue record is needed.** The NS record only says "the edu server is called `a.edu-servers.net`"; contacting it requires its IP, and looking up that name would itself need DNS, going round in a circle. The root server attaches that server's A record to its reply, which breaks the loop.

<details markdown="1"><summary>Extension (optional): what the 13 root servers are</summary>

"13" refers to 13 root server names (`a.root-servers.net` to `m.root-servers.net`), not 13 machines. Each name is deployed at many locations worldwide through anycast, and users always reach a nearby instance.

</details>
<!-- Sources: w10a p.15-16 -->

![W10A slide 17 - Authoritative and local name servers](assets/11-dns-and-www/slide-w10a-17.png)

- **Other authoritative name servers**: organisations' own DNS servers, storing and serving authoritative records for subdomains in their zone; give referrals further down.
- **Local name servers**: not strictly part of the hierarchy. Every ISP, company or university has a "default name server"; it returns a cached value if it has one, otherwise acts as a proxy and forwards the query up the hierarchy.
<!-- Sources: w10a p.17 -->

### The resolution process

![W10A slide 18 - Resolution process](assets/11-dns-and-www/slide-w10a-18.png)

The text version: the client asks the local server to resolve a name; the local server asks a root; the root names the server for the next zone down; this continues zone by zone until an authoritative server can resolve the hostname. Two additions matter: once the local server learns a mapping it **caches** it and answers directly within the TTL; DNS typically runs on **UDP port 53**, and lost queries are retransmitted.

![W10A slide 19 - Resolving robot.cs.washington.edu](assets/11-dns-and-www/slide-w10a-19.png)

A program on `flits.cs.vu.nl` looks up `robot.cs.washington.edu`, following the numbers in the figure:

| Step | What happens |
| --- | --- |
| 1 | Query the local name server (`cs.vu.nl`) |
| 2–3 | The local server asks a root server, which returns the NS record for edu plus its A record (glue), the red text in the figure |
| 4–5 | Ask the edu server and get a referral to the `washington.edu` server |
| 6–7 | Ask the UW name server and get a referral to the `cs.washington.edu` server |
| 8–9 | Ask the UWCS name server and get robot's A record |
| 10 | The local server returns the IP to the originator |
| 11 | The originator connects to `robot.cs.washington.edu` (the green line) |

The red text below step 10 spells the name "aashington"; that is a typo in the slide and should read `robot.cs.washington.edu`.
<!-- Sources: w10a p.18-19; rev2 p.19 -->

### Recursive and iterative queries

![W10A slide 20 - Recursive and iterative queries](assets/11-dns-and-www/slide-w10a-20.png)

- **Recursive query**: the queried server obtains the final mapping on the client's behalf instead of returning partial answers. In the blue part of the figure, the originator asks the local server once and waits for the result.
- **Iterative query**: the queried server replies "I don't know this name, but ask this server". In the pink part, the local server asks root, edu, UW and UWCS in turn.

**Key point**: both kinds appear in the same resolution. The host's query to the local server is recursive (ask once, wait for the final IP); the local server's queries to the root, TLD and authoritative servers are iterative (each returns only a referral).
<!-- Sources: w10a p.20; Apple Notes Review Application Layer -->

### One query seen with dig

![W10A slide 21 - dig www.unimelb.edu.au](assets/11-dns-and-www/slide-w10a-21.png)

The reply to `dig www.unimelb.edu.au` has several sections; read from top to bottom:

| Section | Contents |
| --- | --- |
| QUESTION | Asks for the A record of `www.unimelb.edu.au` |
| ANSWER | `www.unimelb.edu.au. 15589 IN A 128.250.148.40` (green box): name, TTL, class, type, value, the five-tuple exactly |
| AUTHORITY | Two NS records for `unimelb.edu.au`: `ns1` and `ns2` |
| ADDITIONAL | The A records of `ns1` and `ns2`, saving another lookup (the same idea as a glue record) |

`SERVER: 128.250.66.5#53` at the bottom shows the answer came from port 53 of the local name server.
<!-- Sources: w10a p.21 -->

**Key point: what happens without DNS.** The review lecture discussed this: if every DNS server in the world crashed at once, nothing could map between domain names and IP addresses, so websites could only be reached by IP address. Since most people do not know the IP addresses of the servers they use, the Internet would become practically unusable for ordinary users.
<!-- Sources: rev2 p.20-21 -->

<a id="topic-4"></a>
## 4. The WWW and HTTP connections

### Components of the WWW

Slide 3 splits the WWW into four parts:

| Component | Role | Example |
| --- | --- | --- |
| Client and server applications | The browser requests and displays; the server responds | Firefox; Apache HTTP Server |
| Markup languages | Specify page structure and formatting | HTML |
| Scripting languages | Enable dynamic page generation | JavaScript |
| HTTP | Defines how client and server programs exchange information | HTTP/1.1 |
<!-- Sources: w10b p.3; Apple Notes WEEK10 Application Layer1 -->

![W10B slide 04 - Web pages, objects and URLs](assets/11-dns-and-www/slide-w10b-04.png)

A web page consists of **objects**; an object is simply a file (HTML, JPEG image, video…). Most pages are a base HTML file plus several referenced objects, each addressed by a **URL (uniform resource locator)**. Look at the split at the bottom of the slide: after `http://` up to the first `/` is the host name (handed to DNS), the rest is the path name (used by the server to find the file).
<!-- Sources: w10b p.4 -->

![W10B slide 05 - HTTP client/server model](assets/11-dns-and-www/slide-w10b-05.png)

**HTTP (Hypertext Transfer Protocol)** is an application-layer protocol using the client/server model: in the figure, the PC running Firefox and the Mac running Safari are both clients, each sending HTTP requests, and the server running Apache returns HTTP responses. Different browsers do not matter as long as they all speak HTTP.
<!-- Sources: w10b p.5; rev2 p.22 -->

### Non-persistent HTTP

The slides first give two definitions: **non-persistent HTTP**: at most one object is sent over a TCP connection; **persistent HTTP**: multiple objects can be sent over one TCP connection. They then walk through the non-persistent case: a page with a base HTML file and 10 JPEGs, 11 objects in total, all on the same server.

![W10B slide 08 - Non-persistent HTTP steps 1-3](assets/11-dns-and-www/slide-w10b-08.png)

![W10B slide 09 - Non-persistent HTTP steps 4-7](assets/11-dns-and-www/slide-w10b-09.png)

The two slides together give seven steps. Green text is the server's action, red text the client's:

1. The client opens a TCP connection to port 80 on the server;
2. the client sends a request message through its socket, asking for `someDepartment/home.index`;
3. the server retrieves the object and sends it back in a response message;
4. the server initiates closing the TCP connection;
5. the client receives the HTML and the connection is released;
6. the client parses the HTML and finds 10 referenced JPEGs;
7. steps 1–5 are repeated for each JPEG.

The crux is step 7: every image starts again from "open a connection".
<!-- Sources: w10b p.6-9 -->

![W10B slide 10 - Response time of non-persistent HTTP](assets/11-dns-and-www/slide-w10b-10.png)

The **Round Trip Time (RTT)** is the time for a small packet to go from client to server and back. Follow the timeline on the right: the first round trip is "initiate TCP connection", the second is "request file" plus the first bytes of the response, and the thick grey slope is the "time to transmit entire file". So each object needs:

$$
\text{response time}=2\,\text{RTT}+\text{file transmission time}.
$$
<!-- Sources: w10b p.10; Apple Notes WEEK10 Application Layer1 -->

Slide 11 sums up the problems of non-persistent HTTP: a new connection per object; the overhead of every TCP connection; a delivery delay of 2 RTTs per object.
<!-- Sources: w10b p.11 -->

### Persistent HTTP and pipelining

Slide 12: with **persistent HTTP**, the server leaves the connection open after responding, and later messages between the same client and server use it; the server closes it after it has been idle for some time. **Pipelining**: the client sends a request as soon as it meets a referenced object, without waiting for earlier responses, reducing waiting time and improving request throughput.
<!-- Sources: w10b p.12 -->

![W10B slide 13 - Sequential vs pipelined requests](assets/11-dns-and-www/slide-w10b-13.png)

Compare the three columns: (a) non-persistent, where every object needs the grey "Connection setup"; (b) persistent with sequential requests, one setup but each request still waits for the previous response; (c) persistent with pipelining, requests sent back to back and responses returned back to back.

| Feature | Non-persistent HTTP | Persistent HTTP |
| --- | --- | --- |
| TCP connection reuse | No, a new connection per object | Yes, many objects share one connection |
| Default version | HTTP/1.0 | HTTP/1.1 and later |
| Efficiency | Low | High |
| Network delay | Higher (many handshakes) | Lower |
| Connection management | Simple | More complex (timeouts etc.) |
<!-- Sources: w10b p.13; Apple Notes WEEK10 Application Layer1 -->

**Key point: benefits and drawback of persistent connections.** The benefit is reusing one TCP connection, raising request throughput and cutting overhead; the challenge is **deciding when to close the connection**: keeping it open too long wastes server resources, closing it too soon loses the benefit of reuse.
<!-- Sources: rev2 p.23-24; Apple Notes Review Application Layer -->

**Illustrative example (our own)**: a page with a base HTML file and 10 images, RTT = 50 ms, ignoring transmission time.

| Method | RTTs | Time |
| --- | --- | --- |
| Non-persistent, sequential | $11\times2=22$ | 1100 ms |
| Persistent, sequential requests | 1 (setup) $+\,11$ (one exchange per object) $=12$ | 600 ms |
| Persistent, pipelined | 1 (setup) $+\,1$ (HTML) $+\,1$ (all 10 images requested together) $=3$ | 150 ms |

Note that even pipelining cannot merge the HTML request with the image requests: the client must receive and parse the HTML before it knows which images exist.

<a id="topic-5"></a>
## 5. HTTP messages, cookies and caching

### Request methods

![W10B slide 14 - HTTP request methods](assets/11-dns-and-www/slide-w10b-14.png)

The most used methods in the table are GET (read a web page) and POST (append to a resource, e.g. submit a form). HEAD asks only for the page's header without the body, handy for checking whether a page has changed; PUT stores a page and DELETE removes it; TRACE echoes the incoming request, for debugging; CONNECT is "reserved for future use" on the slide; OPTIONS asks which options the server supports.
<!-- Sources: w10b p.14 -->

### Request and response messages

![W10B slide 15 - HTTP request message format](assets/11-dns-and-www/slide-w10b-15.png)

A request message has four blocks from top to bottom: the **request line**, i.e. method, URL and version separated by spaces (sp) and ended by cr lf; several **header lines**, each "field name: value"; a **blank line** containing only cr lf; and an optional **entity body**, usually empty for GET and used by POST to carry data.

![W10B slide 16 - HTTP request message example](assets/11-dns-and-www/slide-w10b-16.png)

Match the format above to a real request: the first line is the request line, then the header lines, and the final lone `\r\n` marks the end of the headers. The slide example (excerpt):

```http
GET /index.html HTTP/1.1
Host: www-net.cs.umass.edu
User-Agent: Firefox/3.6.10
Accept: text/html,application/xhtml+xml
Connection: keep-alive
```

`Connection: keep-alive` is what the slide labels in red as "Persistent HTTP": it asks to keep the connection open. The `Host` header tells the server which website is wanted, since one IP address may host several websites.
<!-- Sources: w10b p.15-16, p.18 -->

![W10B slide 17 - HTTP response status codes](assets/11-dns-and-www/slide-w10b-17.png)

The first digit of a status code gives its class: 1xx information, 2xx success, 3xx redirection, 4xx client error, 5xx server error. The examples in the table are worth remembering: 200 request succeeded, 204 no content; 301 page moved; **304 cached page still valid**; 403 forbidden, 404 page not found; 500 internal server error, 503 try again later.

**Common mistake**: 304 is not an error. It belongs to 3xx and means "the cached copy you hold is still usable", so the server need not send the body again; it works together with [web caching](#topic-5) below, saving bandwidth and time.
<!-- Sources: w10b p.17; Apple Notes WEEK10 Application Layer1 -->

![W10B slide 18 - HTTP response message example](assets/11-dns-and-www/slide-w10b-18.png)

A response has the same shape as a request, with the first line replaced by a **status line**: protocol, status code and phrase, here `HTTP/1.1 200 OK`; then header lines such as Date, Server, Last-Modified, Content-Length and Content-Type; `Keep-Alive: timeout=10, max=100` gives the server's conditions for keeping the connection; after the blank line, `data data data …` is the requested HTML file.

### Cookies

![W10B slide 19 - Cookies and their four components](assets/11-dns-and-www/slide-w10b-19.png)

HTTP servers are **stateless**: each request is handled on its own, with no memory of what you did before. Yet websites often need to identify users: to keep session state (e.g. a shopping cart) or serve content based on identity (e.g. recommendations from past activity). HTTP uses **cookies** for this, with four components:

1. a cookie header line in the HTTP response message (`Set-cookie`);
2. a cookie header line in the HTTP request message (`Cookie`);
3. a cookie file on the user's machine, managed by the browser;
4. a backend database at the website.
<!-- Sources: w10b p.19; Apple Notes WEEK10 Application Layer1 -->

![W10B slide 22 - Cookie interaction over time](assets/11-dns-and-www/slide-w10b-22.png)

Follow the slides' Susan example down the timeline (slides 20–21 are the text version of the same process): Susan visits an e-commerce site for the first time; the site creates a unique ID 1678 and an entry in its backend database, and adds `Set-cookie: 1678` to its response; the browser records "this site, 1678" in its cookie file (on the left, an amazon line now sits beside the old ebay line); every later request carries `Cookie: 1678`, so the server looks up its database and takes "cookie-specific action", recognising her even a week later. All four components appear in the figure: the two header lines on the arrows, the cookie file on the left, the database on the right.
<!-- Sources: w10b p.20-22 -->

### Web caching

![W10B slide 23 - Web caching with a proxy server](assets/11-dns-and-www/slide-w10b-23.png)

The goal of **web caching** is to satisfy client requests without involving the origin server. Once the browser is set to use the cache, all HTTP requests go to the **proxy server** first: if the object is cached, it is returned directly; otherwise the cache requests it from the origin server and then returns it to the client. Look at the proxy in the middle: to the clients on the left it is a server, to the origin server on the right it is a client, so the cache plays both roles; it is usually installed by an ISP (university, company, residential ISP).

- Why: reduce response time for client requests; reduce traffic on an institution's access link to the Internet;
- limitation: frequently changing data is hard to keep up to date. The cache can ask the origin server whether its copy is stale; if nothing changed, the origin server replies with the 304 above instead of resending the body.
<!-- Sources: w10b p.23-24 -->

## Self-check

1. A university's local name server has an empty cache, and a student looks up `www.example.org`. List the servers asked in order, and say which query is recursive and which are iterative.
2. If a root server replied with the NS record for edu but no A record, what problem would the local server face?
3. A page has 1 HTML file and 4 small images, RTT = 20 ms, ignoring transmission time. How long do non-persistent HTTP and persistent pipelined HTTP take?
4. A browser requests a cached page through a proxy; the proxy checks with the origin server and receives 304. What should the proxy do next, and why is this better than receiving 200?
