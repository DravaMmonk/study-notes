# COMP90007 Weeks 10–11 - Application Layer: Email and Streaming Media

来源：`lecture/Week10-Application Layer-Lectures2and3.pdf` p.26–42（Application Layer (2)，Email）、`lecture/Week11-Application Layer-Lecture1.pdf`（Application Layer (3)，Streaming Multimedia Data）；复习讲义 `lecture/Week12-Review-Lecture3.pdf` p.25–30。Apple Notes：CS/25S1/IT/Review — "Application Layer"（学生的 WEEK10 笔记未覆盖这两部分）。

这篇讲的是：**一封邮件怎样从发件人的电脑走到收件人的信箱？音视频这种又大又怕延迟的数据，应用层要多做哪些事？**

学习路线：[电子邮件的架构](#topic-1) → [邮件格式与 MIME](#topic-2) → [SMTP 与最终投递](#topic-3) → [流媒体的基本模型](#topic-4) → [流媒体的挑战：差错、抖动与压缩](#topic-5)。

重点：三段式邮件传送与各自的协议、MIME 的作用、抖动缓冲、有损压缩。难点：区分邮件信封与邮件首部。易错：SMTP 只负责"推"邮件，收件人"取"邮件用 POP3/IMAP（或 Web）；实时会议不适合重传。

<a id="topic-1"></a>
## 1. 电子邮件的架构

### 两类组件

![W10B slide 27 - User agents and message transfer agents](assets/12-email-and-multimedia/slide-w10b-27.png)

电子邮件系统只有两类组件，幻灯片各给了一个微软产品作例子：

- **用户代理（user agent）**：让用户读写邮件，例如 Microsoft Outlook。讲义第 31 页的 Outlook 截图展示了它的功能：撰写、显示、回复邮件，以及管理信箱（排序、建文件夹）；
- **报文传送代理（message transfer agent，MTA）**：也叫邮件服务器（mail server），把邮件从源头搬到目的地，例如 Microsoft Exchange。

记法：用户代理在用户面前，MTA 在后台，用户一般看不到它。
<!-- Sources: w10b p.27, p.31; rev2 p.25 -->

### 三段传送

![W10B slide 30 - Email architecture with protocols](assets/12-email-and-multimedia/slide-w10b-30.png)

这张图是第 28 页架构图加上了红字协议（第 29 页是对应的文字版）。从左到右看，Alice 发信给 Bob 分三步：

| 步骤 | 从哪到哪 | 协议 |
| --- | --- | --- |
| 1 邮件提交（mail submission） | Alice 的用户代理 → Alice 的邮件服务器 | SMTP |
| 2 报文传送（message transfer） | Alice 的邮件服务器 → Bob 的邮件服务器，放进 Bob 的信箱（mailbox） | SMTP |
| 3 最终投递（final delivery） | Bob 的信箱 → Bob 的用户代理 | POP3 或 IMAP |

**易错**：前两段是发送方"推"（push）邮件，用 SMTP；第三段是收件人"取"（pull）邮件，换成 POP3 或 IMAP。Bob 的电脑不必一直在线，邮件先在 Bob 的邮件服务器的信箱里等着。
<!-- Sources: w10b p.28-30; Apple Notes Review Application Layer -->

<a id="topic-2"></a>
## 2. 邮件格式与 MIME

### 信封、首部和正文

![W10B slide 32 - Envelope, header and body](assets/12-email-and-multimedia/slide-w10b-32.png)

- **信封（envelope）**：封装与传输相关的信息，供 SMTP 传送邮件使用，例如 `MAIL FROM`（信封发件人）、`RCPT TO`（收件人）。传送代理可以用首部的某些字段来构造信封；
- **首部（header）**：给用户代理看的控制信息；
- **正文（body）**：给收件人看的内容。
- **地址格式（addressing scheme）**：`用户名@DNS 地址`，例如 `username@student.unimelb.edu.au`。@ 后面的部分正是交给 DNS 查 MX 记录的域名（见 [11 资源记录](11-dns-and-www.md#topic-2)）。
<!-- Sources: w10b p.32 -->

![W10B slide 33 - Message format: header, blank line, body](assets/12-email-and-multimedia/slide-w10b-33.png)

一封邮件的结构和 HTTP 消息很像：上面一块是若干首部行（To、From、Subject……），中间一个空行（blank line），下面是正文，即真正的"信"。

![W10B slide 34 - Common header fields](assets/12-email-and-multimedia/slide-w10b-34.png)

表中容易混的几对：To 是主要收件人，Cc（carbon copy，抄送）是次要收件人，Bcc（blind carbon copy，密送）的地址不会被其他收件人看到；From 是撰写邮件的人，Sender 是实际发送的地址（例如秘书替上司发信时两者不同）。Received 由沿途每个传送代理各加一行，Return-Path 可用来找回到发件人的路径，这两项都是传送途中由系统添加的。
<!-- Sources: w10b p.33-34 -->

**理解用例（自拟）**：信封像信封上的地址，邮局只看它；首部像信纸抬头的"致某某"。Bcc 收件人出现在信封的 RCPT TO 里，却不出现在其他人看到的首部里，所以别人不知道他也收到了。

### MIME

![W10B slide 35 - Limits of RFC 822](assets/12-email-and-multimedia/slide-w10b-35.png)

早期邮件只有英文和 ASCII，RFC 822 反映了这种简单约束。后来问题逐渐显现，幻灯片列了四类：带重音的语言（法语、西班牙语）、非拉丁字母（西里尔字母）、非字母文字（中文、日文），以及文本以外的内容（音频、图片）。解决方案是 **MIME（Multipurpose Internet Mail Extensions，多用途 Internet 邮件扩展）**。
<!-- Sources: w10b p.35 -->

![W10B slide 36 - The five MIME headers](assets/12-email-and-multimedia/slide-w10b-36.png)

MIME 做两件事：给正文加上结构，并为非 ASCII 内容规定编码规则。为此新增五个首部：MIME-Version 标明版本；Content-Description 是人可读的说明；Content-Id 是唯一标识；**Content-Transfer-Encoding** 说明正文在传输时怎样包装（如 base64，把二进制转成可打印的 ASCII 字符）；**Content-Type** 说明内容的类型和格式。最后两个最关键：一个解决"怎样安全地过 SMTP"，一个解决"收到后怎样解读"。
<!-- Sources: w10b p.36; Apple Notes Review Application Layer -->

![W10B slide 37 - MIME types and subtypes](assets/12-email-and-multimedia/slide-w10b-37.png)

Content-Type 的值写成"类型/子类型"，例如 `text/html`、`image/jpeg`、`application/pdf`。表中前六类（text、image、audio、video、model、application）描述单一内容；最后两类是容器：`message` 封装另一封报文，`multipart` 把多种类型组合在一起，子类型 mixed（附件）、alternative（同一内容的几种版本）、parallel（同时播放）、digest（汇编）。
<!-- Sources: w10b p.37 -->

![W10B slide 38 - MIME multipart/alternative example](assets/12-email-and-multimedia/slide-w10b-38.png)

这封生日祝福用的是 `multipart/alternative`：首部里给出一个分隔串（`boundary=qwertyuiop…`），正文被它切成两部分；分隔串之前的 preamble 会被用户代理忽略。第一部分 `text/html` 是 HTML 版本；第二部分是音频版本，但它是 `message/external-body`：邮件里只说明音频文件在哪台 FTP 站点上、叫什么，文件本身是 `audio/basic`、用 `base64` 编码。收件人的用户代理挑自己能显示的那个版本。学生复习笔记的概括是：MIME 把多种内容转成文本形式，使 SMTP 也能传送非文本内容。
<!-- Sources: w10b p.38; Apple Notes Review Application Layer -->

<a id="topic-3"></a>
## 3. SMTP 与最终投递

### SMTP

![W10B slide 39 - SMTP submission and transfer](assets/12-email-and-multimedia/slide-w10b-39.png)

**SMTP（Simple Mail Transfer Protocol，简单邮件传输协议）** 分两种用途，端口不同：

- **邮件提交**：用户代理把邮件交给 MTA 的 **587 端口**，通常需要认证（发件人凭据）；
- **报文传送**：发送方 MTA 与接收方 MTA 的 **25 端口** 建立 TCP 连接；传送分三个阶段：握手、报文传送、关闭；以 ASCII 命令/响应方式交互：客户端发命令，服务器回响应码和响应短语；
- 若目的服务器暂时不可用，邮件进入队列，稍后重试。
<!-- Sources: w10b p.39 -->

![W10B slide 40 - SMTP dialog between client and server](assets/12-email-and-multimedia/slide-w10b-40.png)

看 C（客户端）和 S（服务器）的一问一答，正好对应上一页的三个阶段：

1. 握手：S 先报 220 服务就绪；C 发 `HELO` 打招呼，S 回 250；
2. 报文传送：`MAIL FROM` 和 `RCPT TO` 是信封，S 各回 250；C 发 `DATA`，S 回 354，提示"以单独一行的 . 结束"；接着 C 发整封邮件（含 MIME 首部与 multipart 正文），以单独一行"."结束；S 回 250 表示接受；
3. 关闭：C 发 `QUIT`，S 回 221 关闭连接。

图中对 `HELO abcd.com` 的 250 回复写成 "cs.washington.edu says hello to ee.uwa.edu.au"，两台主机的名字放反了（220 那行已表明服务器是 `ee.uwa.edu.au`）；这是讲义（沿用教材）例子里的小瑕疵，不影响命令顺序。 每发一封信都要好几轮往返，这就是下表缺点的来源。
<!-- Sources: w10b p.40 -->

| SMTP 的优点 | SMTP 的缺点 |
| --- | --- |
| 简单的文本协议，容易阅读、调试和实现 | 每封邮件需要多次来回的消息；非文本内容需要传输编码 |
<!-- Sources: w10b p.40; rev2 p.26-27; Apple Notes Review Application Layer -->

### 最终投递

![W10B slide 41 - IMAP and POP3](assets/12-email-and-multimedia/slide-w10b-41.png)

| 协议 | 端口与运行方式 | 特点 |
| --- | --- | --- |
| IMAP（Internet Message Access Protocol） | 接收方 MTA 运行 IMAP 服务器（143 端口），用户代理运行 IMAP 客户端；命令如 LOGIN、LIST、CREATE、DELETE、COPY | 邮件保存在服务器上，为多设备设计 |
| POP3（Post Office Protocol version 3） | 更简单的最终投递协议 | 邮件下载到用户代理所在电脑，不在服务器上保留，适合单一设备 |

IMAP 的命令里有 CREATE、COPY，说明文件夹也在服务器上管理，所以换一台设备看到的信箱一样。**延伸内容**：很多 POP3 客户端提供"在服务器上保留副本"的选项，但协议的设计思路仍是下载后由本机保管。
<!-- Sources: w10b p.29, p.41 -->

![W10B slide 42 - Webmail](assets/12-email-and-multimedia/slide-w10b-42.png)

**Webmail**（如 Gmail、Hotmail）把一组在浏览器中显示的网页当作用户代理。对照三段传送：邮件提交走 HTTP + SMTP；最终投递走 HTTP + 自定义 API/IMAP/POP3；邮件服务器之间的传送仍然用 SMTP。也就是说，Webmail 只改变了用户和自己邮件服务器之间的那两段。
<!-- Sources: w10b p.42 -->

<a id="topic-4"></a>
## 4. 流媒体的基本模型

### 多媒体数据有什么不同

![W11A slide 03 - Multimedia data](assets/12-email-and-multimedia/slide-w11a-03.png)

多媒体数据包括 **点播（存储的）媒体（streaming stored media）**、**直播媒体（streaming live media）** 和 **交互式音视频会议（interactive audio and video conference）**。与普通数据相比，它需要更高的带宽，并且有严格的 QoS 要求：对时延（delay）和抖动（jitter）敏感。处理多媒体是应用层的关键挑战。
<!-- Sources: w11a p.3 -->

### 最简单的模型：下载完再播

![W11A slide 04 - Basic model: download then play](assets/12-email-and-multimedia/slide-w11a-04.png)

按编号看：1 浏览器用 HTTP 向 Web 服务器请求媒体；2 媒体文件经 HTTP 整个返回；3 浏览器把它存到本地磁盘；4 媒体播放器从磁盘读出来播放。整个文件传完之前不能开始播放。好处是没有实时的网络问题要处理，坏处是用户必须等下载结束。
<!-- Sources: w11a p.4 -->

### 专门的播放软件

![W11A slide 05 - Specialised multimedia software with a metafile](assets/12-email-and-multimedia/slide-w11a-05.png)

改进的做法引入专门的播放软件。和上一张图比，多了一台媒体服务器（media server）：浏览器先用 HTTP 从 Web 服务器取回一个很小的 **元文件（metafile）**（第 1–2 步），里面只写着媒体在哪里；浏览器把它交给媒体播放器（第 3 步）；播放器再用 RTSP 直接向媒体服务器请求媒体（第 4 步），媒体经 TCP 或 UDP 流式到达（第 5 步），边收边播。
<!-- Sources: w11a p.5 -->

![W11A slide 06 - Streaming media protocols](assets/12-email-and-multimedia/slide-w11a-06.png)

幻灯片强调这些协议常一起使用，各管一层事：HTTP 取元文件或分段下载；**RTSP（Real Time Streaming Protocol）** 提供 PLAY、PAUSE、RECORD 等"遥控器"功能；**RTP（Real-time Transport Protocol）** 运行在 UDP 上，不重传，支持组播和时间戳，负责搬数据；MPEG-4 负责压缩；此外还有封闭协议，如 QuickTime、Adobe RTMP、Spotify 基于 HTTP 的私有协议。
<!-- Sources: w11a p.6 -->

![W11A slide 07 - Main tasks of playback software](assets/12-email-and-multimedia/slide-w11a-07.png)

播放软件的四项主要任务，正好是下一节的提纲：处理用户界面（音量、播放、下一首）；与传输协议配合处理传输差错（用 RTP/UDP 时必须优雅地掩盖差错）；消除抖动；压缩与解压。消除抖动一项里给出了缓冲大小的取舍：缓冲小，开播快，但容易受抖动和时延影响；缓冲大，开播前要等，但不容易受抖动影响。
<!-- Sources: w11a p.7; rev2 p.28 -->

<a id="topic-5"></a>
## 5. 流媒体的挑战：差错、抖动与压缩

### 处理差错

![W11A slide 08 - Forward error correction with a parity packet](assets/12-email-and-multimedia/slide-w11a-08.png)

**前向纠错（Forward Error Correction，FEC）**：用冗余位纠错，不必请发送方重传。看图右侧服务器端"Construct parity"：每 4 个数据分组 A、B、C、D 加 1 个校验分组 $P=A\oplus B\oplus C\oplus D$ （逐位异或，XOR）。中间传输线上 B 是虚线框，表示丢了；左侧客户端"Repair loss"用 $B=P\oplus A\oplus C\oplus D$ 把它算回来。也可以用 Hamming 码或 Reed-Solomon 码给视频编码（Hamming 码见 [03 成帧与差错控制](03-data-link-framing-and-error-control.md)）。

**理解用例（自拟）**：A = `1010`，B = `0110`，C = `1100`，D = `0001`，则 $P=A\oplus B\oplus C\oplus D=$ `0001`。若 B 丢失，接收方计算 $A\oplus C\oplus D\oplus P=$ `0110`，恰好是 B。代价是每 4 个数据分组多发 1 个，即相对数据多 25% 的流量（占总发送量的 1/5）。这一招只能补回同一组中的 **一个** 丢失分组；同组丢两个就算不回来，只能靠下面的差错掩盖。
<!-- Sources: w11a p.8-9 -->

![W11A slide 09 - Error resilience, concealment and retransmission](assets/12-email-and-multimedia/slide-w11a-09.png)

- **差错恢复力（error resilience）**：很多压缩方案中，丢一个分组会影响后续数据的解压。在数据中密集放置特殊标记，解压过程能尽快从标记处恢复，减少丢包的影响。
- **差错掩盖（error concealment）**：由接收方完成，例如在帧之间插值，减轻差错的观感。
- **重传（retransmission）**：对交互式音视频会议意义不大，因为重传来的数据往往已经错过播放时刻。

### 抖动管理

![W11A slide 10 - Jitter buffer with low and high water marks](assets/12-email-and-multimedia/slide-w11a-10.png)

抖动来自变化的带宽以及丢包与重传，解决办法是 **缓冲（buffer）**：客户端先攒一段数据再播放。看图中客户端的缓冲区上两条竖线：数据量低于 **低水位（low-water mark）** 就有卡顿危险，所以它是"避免停顿的安全余量"；高于 **高水位（high-water mark）** 时可以让服务器暂停发送，免得溢出。播放器从左边按固定速度取数据，网络从右边不均匀地送数据，缓冲区吸收两者之差。
<!-- Sources: w11a p.10 -->

缓冲区大小的取舍见上一节的 [播放软件任务](#topic-4)；在实时会议里要选小缓冲，见本节末尾。
<!-- Sources: w11a p.7 -->

### 压缩

![W11A slide 12 - Encoding, decoding and their asymmetry](assets/12-email-and-multimedia/slide-w11a-12.png)

多媒体数据常常要压缩，以减少带宽需求和传输时间（讲义第 11 页）。压缩系统需要两个算法：源端的 **编码（encoding）** 和目的端的 **解码（decoding）**。图中 200 kB 编码成 20 kB 传送，再解码回 200 kB。两者是不对称的：编码可以慢、耗资源；解码必须快，且不需要昂贵硬件，因为每个观众都要解码。另外，过程可以是有损的：解码出来的 200 kB 不一定等于原来的 200 kB。
<!-- Sources: w11a p.11-12 -->

![W11A slide 13 - Lossless vs lossy and the threshold of audibility](assets/12-email-and-multimedia/slide-w11a-13.png)

| | 无损（lossless） | 有损（lossy） |
| --- | --- | --- |
| 还原 | 精确还原原始数据 | 只能近似还原 |
| 依靠 | 原始数据中的结构 | 人类感知的局限 |

底部的曲线是 **听阈（threshold of audibility）**：横轴是频率（kHz，对数刻度），纵轴是功率（dB）。曲线以下的声音人听不到；曲线在 2–5 kHz 附近最低，说明耳朵对这一段最敏感，而在很低和很高的频率，声音要很响才听得见。编码器可以放心丢掉曲线以下的成分，这就是"利用感知局限"的具体意思。
<!-- Sources: w11a p.13 -->

**重点：为什么多媒体用有损压缩。** 多媒体普遍采用基于 **感知编码（perceptual encoding）** 的有损方案：利用人类听觉和视觉系统的缺陷，去掉人感觉不到的信息，例如 MP3（音频）、JPEG（图像）、H.264（视频）。接受少量信息损失，换来压缩率的大幅提升，这就是它重要的原因。
<!-- Sources: w11a p.13; rev2 p.29-30; Apple Notes Review Application Layer -->

### 直播与实时会议

![W11A slide 14 - Streaming live media](assets/12-email-and-multimedia/slide-w11a-14.png)

**直播流媒体（streaming live media）**：通过 Internet 直播，观众随时可以加入。客户端仍用缓冲平滑抖动；理想是 RTP over UDP 组播，但实际上多用 TCP，因为 IP 组播往往只在某个运营商网络内可用，于是要给每个客户端单独发一路流，需要一组服务器组成 **内容分发网络（content distribution network，CDN）**。

![W11A slide 15 - Real-time conferencing and SIP](assets/12-email-and-multimedia/slide-w11a-15.png)

**实时会议（real-time conferencing）**（网络电话、视频会议）：要求低时延。缓冲要小，迟到太久的分组直接跳过；可动态调整视频质量；利用网络层的 QoS，如资源预留和区分服务标记。应用层协议例如 **SIP（Session Initiation Protocol）**：定位被叫、确定其能力，建立双方、多方和组播会话，并负责会话的建立、管理与终止。

**易错**：实时会议和点播的取舍相反。点播可以用大缓冲换流畅；会议里大缓冲意味着对话有明显延迟，所以宁可跳过迟到的分组，也不等重传。
<!-- Sources: w11a p.14-15 -->

## 本讲自测

1. Alice 用 Outlook 给 Bob 发信，Bob 在手机和电脑上都看邮件。三段传送各用什么协议、什么端口？Bob 应选 POP3 还是 IMAP？
2. 一封邮件同时带 HTML 正文和一张 JPEG 附件。它的 Content-Type 首部大致怎样写？附件部分为什么还需要 Content-Transfer-Encoding？
3. 给一个视频会议软件和一个电影点播网站分别设计抖动缓冲：哪个大、哪个小？迟到的分组各自怎样处理？
4. 用 FEC 每 3 个数据分组加 1 个 XOR 校验分组。开销是多少？如果同一组里校验分组本身丢了，接收方需要做什么？
