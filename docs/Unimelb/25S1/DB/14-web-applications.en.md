# INFO90002 Week 11 - Web Applications and Databases

Sources: `lecture/INFO90002_Week11-1_WebApps.pdf`; Apple Notes: CS/25S1/DB — "FE - Web Apps".

This lecture asks: **how do end users reach a database through an application? Where does the business logic live? How does a web application get from a browser request to a database query and back, step by step?**

Learning path: [The limits of SQL and business logic](#topic-1) → [Application architectures: one tier to three](#topic-2) → [How web applications work](#topic-3) → [From pages to databases and web services](#topic-4).

Key points: how presentation, business and storage logic are distributed; pros and cons of two-tier and three-tier architectures; static versus dynamic web pages. Hard parts: logical tiers versus physical tiers. Common mistakes: the web architecture is a particular form of three-tier (or four-tier) architecture, not something different.

<a id="topic-1"></a>
## 1. The limits of SQL and business logic

SQL is declarative, intuitive and versatile, but:

- not every possible query can be expressed in SQL;
- business rules beyond domain and referential integrity must be enforced;
- procedural constructs such as loops and decisions are needed;
- would you give end users a query browser? No: they need an interface that is both friendly and constraining.
<!-- Sources: W11-1 p.3; Apple Notes FE - Web Apps -->

![Slide 04 - Business logic](assets/14-web-applications/slide-04.png)

The two blue headings in the left column are two pieces of business logic. Take the first: an example of **business logic** is a customer placing an order: accept input; insert a row into `Order`; for each product check stock, and if there is enough insert a row into `OrderItem` and update stock and the customer's amount owing; if no errors occur, end successfully. The right column lists what this needs: sequence (several steps in order), iteration (loops), control flow (conditions) and a user interface, which is what procedural programming languages are good at; SQL specialises in low-level data access. The second piece, "move money from savings to the credit card", is the transfer transaction of [08](08-transactions-concurrency.en.md#topic-1); here we see the program logic wrapped around it.
<!-- Sources: W11-1 p.4 -->

<a id="topic-2"></a>
## 2. Application architectures: one tier to three

### Three kinds of logic

![Slide 07 - Presentation, business and storage logic](assets/14-web-applications/slide-07.png)

The three boxes at bottom right, "user interface ↔ application software ↔ data storage", show where the three kinds of logic sit; the left side explains what each is responsible for:

| Logic | Responsible for |
| --- | --- |
| Presentation logic (the user interface, UI) | Input (keyboard, touchscreen, voice, sensor, barcode) and output (large screen, printer, phone, ATM) |
| Business logic | Handling input and commands, enforcing business rules |
| Storage logic | Persistent storage of data, enforcing data integrity |
<!-- Sources: W11-1 p.7; Apple Notes FE - Web Apps -->

![Slide 08 - Multi-tiered architectures](assets/14-web-applications/slide-08.png)

The three rows are two tiers (clients connected directly to a server with the database), three tiers (clients – web server – database server) and four tiers (clients – web server – application server – database server). The more tiers, the further apart the three kinds of logic are split.
<!-- Sources: W11-1 p.8 -->

### Evolution: mainframe → client/server → web

| Architecture | Division of work | Assessment |
| --- | --- | --- |
| One tier: mainframe / dumb terminals | One large computer handles all logic; terminals do no processing; embedded SQL, report generators | Does not scale with the number of users |
| Two tier: client/server | The server is a relational DBMS handling data storage and access; SQL is sent to the server, which returns raw data; presentation and business logic live in the client application (e.g. Visual Basic in the 1990s–2000s) | See the table below |
| Three tier | Client program ↔ application server ↔ database server | See the table below |
| Web architecture | A particular form of three- or four-tier architecture | See the table below |
<!-- Sources: W11-1 p.9-11, p.15; Apple Notes FE - Web Apps -->

![Slide 12 - Two-tier example](assets/14-web-applications/slide-12.png)

A two-tier example (Hoffer textbook figure): three clients send "requests for data" over a LAN to the database server, which returns only the "selected data". Every client must have the full application installed.

![Slide 13 - Distribution of processing logic](assets/14-web-applications/slide-13.png)

In a two-tier system, processing logic can sit at the client, the server or both: the "fat client" on the left keeps processing and presentation logic at the client; the "thin client" in the middle keeps only presentation logic at the client, with processing on the server; "distributed" on the right splits processing logic across client and server.
<!-- Sources: W11-1 p.13 -->

![Slide 15 - Three-tier architecture](assets/14-web-applications/slide-15.png)

![Slide 16 - Three-tier example](assets/14-web-applications/slide-16.png)

The left column of the first page assigns the three kinds of logic to three tiers: the client handles only the interface (thinner, possibly storing almost no data, even without a hard disk), the application server handles business logic, and the database server handles persistence and access. The second page redraws the two-tier example as three tiers: client layer, business layer (application server) and database layer, all on the same LAN.

**Hard part: logical versus physical tiers.** The blue text in the right column of the first page: a three-tier architecture has 3 logical tiers but may have only 2 or 3 physical tiers, because the application server and database server can run on the same computer.
<!-- Sources: W11-1 p.15 -->

**Illustrative example (lecture exercise):** connecting MySQL Workbench to MySQL Server gives two logical tiers (Workbench for the interface, MySQL Server for storage). Connected to the school's engineering server, the two run on two computers: two physical tiers; with MySQL installed on your own computer, both run on one computer: one physical tier.
<!-- Sources: W11-1 p.20 -->

| | Two tier (client-server) | Three tier | Three tier (web based) |
| --- | --- | --- | --- |
| Pros | Clients and server share the processing load; data processed centrally gives good integrity; stored procedures put some business rules on the database server | Scalable; technologically flexible (business logic is easy to change); any single component is easy to swap; lower long-term cost; more secure (the user's machine does presentation only) | Everyone has a browser; no client software to install and maintain; HTML and HTTP are simple, widely supported standards; global access to the database |
| Cons | Presentation, business logic and data model are intertwined at the client; a schema change breaks every client; updates must be deployed to every client; one database connection per client, so hard to scale; hard to extend beyond the organisation (customers, suppliers); interoperability issues | High short-term cost; tools and training needed; complex to design; variable standards | An even more complex middle tier; simple standards make complex applications hard; global access is a potential security nightmare |
<!-- Sources: W11-1 p.14-18; Apple Notes FE - Web Apps -->

### Security in multi-tier applications

A networked environment creates complex security issues, and security can be enforced at different tiers: application passwords (who may use the application software), database-level security (access privileges to tables; see [13](13-security-backups.en.md#topic-1)) and encrypted client/server communication.
<!-- Sources: W11-1 p.19 -->

<a id="topic-3"></a>
## 3. How web applications work

### Why build web applications

Browsers are everywhere; external customers need not install client software; the communication protocols are simple; it is platform- and OS-independent (interoperable); development time and cost fall; it enabled e-government, e-business, B2B and B2C.
<!-- Sources: W11-1 p.25 -->

![Slide 25 - Web app request flow](assets/14-web-applications/slide-25.png)

Follow the numbers in the small figure at the bottom: 1. the client submits form input to the web server; 2. the web server sends DML to the database server; 3. the database returns a record set; 4. the web server turns the result into HTML for the client. The exercise on the right asks you to redraw it with the application server as a separate machine, which makes it four tiers.

![Slide 24 - Architecture of a web app](assets/14-web-applications/slide-24.png)

The structure of a web application: clients on the public Internet go through the Internet (TCP/IP) and a firewall to the web server, which accesses the database server; internal clients on the organisation's intranet (the green box on the right) and partners' extranet clients also use browsers.
<!-- Sources: W11-1 p.24 -->

### Web infrastructure terms

| Term | Meaning |
| --- | --- |
| Browser | Software that retrieves and displays HTML documents |
| Web server | Software that responds to browser requests by sending HTML and other documents |
| Web page (HTML document) | A static page's content is fixed at development time; a dynamic page's content is generated from database data |
| World Wide Web (WWW) | The total set of interlinked hypertext documents on web servers worldwide |
| Internet | The global network infrastructure hosting the WWW (and email, chat, etc.) |
<!-- Sources: W11-1 p.26 -->

### Web languages

| Language | Role | Layer |
| --- | --- | --- |
| HTML (HyperText Markup Language) | Defines a page's content and structure | Structured content |
| CSS (Cascading Style Sheets) | Controls the appearance of an HTML document | Presentation |
| JavaScript | Makes HTML documents interactive | Behaviour and interactivity |
| XML (eXtensible Markup Language) | Transports data between web services | Data exchange |
<!-- Sources: W11-1 p.27-28; Apple Notes FE - Web Apps -->

![Slide 28 - Build web pages bottom up](assets/14-web-applications/slide-28.png)

Build pages "from the bottom up" (blue text at the bottom): describe content with HTML first, present it with CSS, then control behaviour with scripts; the two scissor lines show the three are written separately. The large arrow on the right says the higher you go, the richer the user experience.
<!-- Sources: W11-1 p.28 -->

### Structure of an HTML document

![Slide 30 - HTML document tree](assets/14-web-applications/slide-30.png)

The code is on the left and a tree view of the same document on the right: the root element is `<html>`, which usually has only two children, `<head>` and `<body>`; `<head>` holds `<meta>`, `<title>` and so on; `<body>` can hold `<div>`, `<table>` and more, with `<h1>`, `<p>`, `<tr>`, `<th>` and `<td>` below them.
<!-- Sources: W11-1 p.29-30 -->

![Slide 31 - A browser displays a basic web page](assets/14-web-applications/slide-31.png)

The arrows connect `<title>`, `<h1>` and the two `<p>` elements in the source on the right to the tab title, the large heading and the two paragraphs in the browser on the left: the browser "renders" one HTML file into what you see.

| Element | Purpose |
| --- | --- |
| `<h1>` … `<h6>` | Headings, `<h1>` largest, `<h6>` smallest |
| `<p>` | Paragraph; the browser inserts a blank line before each |
| `<ol>` / `<ul>` with `<li>` | Ordered list (1. 2. 3.) / unordered list (bullets) |
| `<table>`, `<caption>`, `<tr>`, `<th>`, `<td>` | Table, caption, row, header cell (bold and centred by default), data cell; borders and styling belong in CSS |
| `<form>` | Lets the user enter data and submit it to a server, which may display information, add it to a database or send an email |
<!-- Sources: W11-1 p.31-34 -->

![Slide 33 - HTML table](assets/14-web-applications/slide-33.png)

The blue arrows map `<caption>`, the header row of `<th>` and the data rows of `<td>` to the rendered result on the right; the note on the right says `<th>` is bold and centred by default, and the note at top left says the `border` attribute is deprecated and styling belongs in CSS. A trimmed version of the same structure:

```html
<html lang="en">
  <head><title>Monthly savings</title></head>
  <body>
    <h1>Savings</h1>
    <table>
      <tr><th>Month</th><th>Savings</th></tr>
      <tr><td>January</td><td>$100</td></tr>
    </table>
  </body>
</html>
```
<!-- Sources: W11-1 p.30, p.33 -->

### One request and response

A web server consists of a networked computer running an operating system, web-server software that receives and answers HTTP requests (handling many at once), and a collection of documents to serve; access to content needs careful control.
<!-- Sources: W11-1 p.35 -->

![Slide 37 - Server maps the URL to a file](assets/14-web-applications/slide-37.png)

![Slide 38 - Server sends headers and the file](assets/14-web-applications/slide-38.png)

The slides animate one static request over four pages; the middle two are kept here. On the first, the client sends `GET http://www.server.com/home.html` and the server maps the URL to `C:\htmldocs\home.html` on its disk; on the second, the server sends that file back unchanged, preceded by server-generated headers. The full four steps:

1. The client requests a document from the web server over HTTP, in the form of a URL;
2. the web server maps the URL to a local resource (e.g. `C:\htmldocs\home.html` on disk) to find the file;
3. the server sends the file back as is, with server-generated headers (control information for the browser);
4. the browser interprets and displays (renders) the HTML document.
<!-- Sources: W11-1 p.36-39 -->

### Static versus dynamic web pages

![Slide 40 - Static vs dynamic web pages](assets/14-web-applications/slide-40.png)

| | Static page | Dynamic page |
| --- | --- | --- |
| The URL identifies | A file in the server's file system | A program to run |
| The server | Fetches the file and sends it to the browser | The web app runs the program, which usually retrieves data from a database |
| Content | The file contains HTML | Loops fill tables, lists and other elements with query results: e.g. `SELECT * FROM Product;` returns a set of products, and one HTML table row is printed per product |
<!-- Sources: W11-1 p.40; Apple Notes FE - Web Apps -->

**Illustrative example (our own):** a page showing "all current product prices" should be dynamic: the prices are in the database and change, so the page queries them on each request and builds the table with a loop; as a static file, every price change would mean editing the HTML by hand.

<a id="topic-4"></a>
## 4. From pages to databases and web services

### Problems with old-style web apps

![Slide 42 - SQL within PHP](assets/14-web-applications/slide-42.png)

The PHP example in the slides writes three things in one file: the left column connects to the database (`mysqli_connect`, selecting the database) and runs `SELECT regNo, colour, price FROM car WHERE …`; the right column fetches the result row by row in a `while` loop and `echo`es `<tr><td>…</td></tr>`. The problems:
<!-- Sources: W11-1 p.42 -->

- placing raw SQL inside PHP/HTML mixes presentation, business and database logic and is hard to maintain when requirements change; best practice separates them, e.g. MVC (model–view–controller);
- lots of reinvented wheels: every developer writes their own login security, page templates and database access;
- a growing variety of clients (phones, tablets) needs manual programming for each platform.

Hence **web application frameworks** such as Ruby on Rails, .NET, Symfony, AngularJS and Django.
<!-- Sources: W11-1 p.41 -->

**Note:** building SQL strings directly from user input in this style is exactly where the SQL injection of [13](13-security-backups.en.md#topic-4) comes from.

### Web services

The WWW lets **people** access remote databases; **web services** let **computers** access them, i.e. application-to-application (A2A) communication. A web service is a web-based interface for interacting with a remote component, regardless of its location, nature or environment; in essence it is software listening for requests on a network port. It gives applications inside and across enterprises a simple, reliable way to connect, and it is platform-independent, discoverable and self-describing.
<!-- Sources: W11-1 p.43 -->

<details markdown="1">
<summary>Extension (optional): SOAP and REST</summary>

![Slide 44 - SOAP and REST](assets/14-web-applications/slide-44.png)

The slide is marked OPTIONAL at top right. Both major approaches define how to build APIs through which web applications pass data:

- **SOAP** (Simple Object Access Protocol): a text-based messaging protocol running over HTTP, exchanging XML messages between client and server;
- **REST** (Representational State Transfer): a client–server architectural style rather than a protocol; nouns are resources identified by URIs, structured data is usually returned as XML or JSON, and the verbs map to DML: `GET` ↔ `SELECT`, `POST` ↔ `INSERT`, `PUT` ↔ `UPDATE`, `DELETE` ↔ `DELETE`.
<!-- Sources: W11-1 p.44 -->

</details>

![Slide 45 - XML and JSON data formats](assets/14-web-applications/slide-45.png)

The two formats web services commonly use to exchange data are JSON and XML. The page writes the same three employees both ways: JSON puts three objects in an `employees` array; XML uses nested opening and closing tags, three `<employee>` elements inside `<employees>`. JSON syntax is covered in [12](12-nosql-json.en.md#topic-4).
<!-- Sources: W11-1 p.45 -->

## Self-check

1. List two requirements that SQL alone handles poorly and that need business logic.
2. A company's internal inventory system is written in Visual Basic, installed on every PC and connected directly to the database. Now suppliers must be able to query stock. Which two-tier disadvantages surface, and what are the benefits and new risks of moving to a web-based three-tier architecture?
3. A website's web server, application server and database server are all deployed on one cloud machine. How many logical tiers and how many physical tiers does it have?
4. An order-lookup page asks for an order number and shows the order's lines. Describe the path from browser to database and back as request–response steps, and say which step makes it a "dynamic page".
