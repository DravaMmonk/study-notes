# COMP90007 Internet Technologies

这套笔记面向刚接触计算机网络的学习者，对应 2025 年第一学期（25S1）的 COMP90007。课程按"混合五层模型"自底向上讲：物理层 → 数据链路层（含 MAC 子层）→ 网络层 → 传输层 → 应用层，最后是贯穿各层的网络安全。每篇先说明这一讲要回答的问题，再沿讲义顺序放出选用的讲义页，每页紧接着说明该看什么、图表说明了什么；讲义页是主线，学生笔记和复习材料只用来决定重点和补充例子。**重点／难点／易错** 表示学习时需要多花注意力的地方，不代表对考试范围的预测；自拟例子与课外内容单独标明或折叠，末尾用自测题检查理解。

## 按知识模块学习

| 模块 | 学习顺序 | 要建立的能力 |
| --- | --- | --- |
| 网络与分层 | [01 网络导论与参考模型](01-introduction-and-reference-models.md) | 网络分类、服务与协议、OSI 与 TCP/IP |
| 物理层 | [02 物理层](02-physical-layer.md) | 时延计算、传输介质、调制、Nyquist 与 Shannon 上限 |
| 数据链路层 | [03 成帧与差错控制](03-data-link-framing-and-error-control.md) → [04 流量控制与链路协议](04-data-link-flow-control.md) | 成帧、Hamming 距离、CRC、停等与滑动窗口 |
| MAC 子层 | [05 MAC 子层](05-mac-sublayer.md) | ALOHA、CSMA、无冲突协议、MACA、以太网 |
| 网络层 | [06 服务模型与网络互连](06-network-layer-internetworking.md) → [07 IP 协议与编址](07-ip-addressing.md) → [08 路由算法](08-routing-algorithms.md) | 数据报与虚电路、分片、子网与 CIDR、Dijkstra、距离向量与链路状态 |
| 传输层 | [09 连接管理、UDP 与 TCP](09-transport-layer-udp-tcp.md) → [10 服务质量与拥塞控制](10-congestion-control.md) | 三次握手、TCP 序号与窗口、慢启动、Tahoe 与 Reno |
| 应用层 | [11 DNS 与 WWW](11-dns-and-www.md) → [12 电子邮件与流媒体](12-email-and-multimedia.md) | 名字解析、HTTP 连接与消息、SMTP/MIME、抖动与压缩 |
| 网络安全 | [13 密码学](13-cryptography.md) → [14 签名、认证与通信安全](14-signatures-authentication-security.md) | 密码模式、RSA、证书、数字签名、DH、IPsec、VPN、HTTPS |

跟课时按文件编号 01–14 阅读，每篇标题写明对应的教学周；复习时可按上表的层次阅读。跨讲重复的概念只在主要章节详细解释，其他地方链接回去：例如 TDM/FDM 的主要讲解在 02，MAC 子层只引用；Hamming 码在 03，流媒体 FEC 只引用；隧道在 06，IPv6 过渡与 IPsec 只引用。

## 例题答案对应位置

本课程没有恢复 Tutorial 资料。讲义页面附带的例题答案与复习材料按内容连接到笔记；复习材料中的题目只用来决定哪些概念值得强调，笔记以概念讲解和自拟例子呈现，不照录题目。

| 练习 | 笔记中的主要连接 |
| --- | --- |
| Physical Layer (1) 时延例题 1–2（`example_solutions.pdf`） | [02](02-physical-layer.md#topic-1)：传输时延、传播时延与总时延 |
| Physical Layer (2) Nyquist/Shannon 例题 1–3（`W3-L2-example_solutions.pdf`） | [02](02-physical-layer.md#topic-5)：无噪声与有噪声信道的最大数据率 |
| Review 讲义（`Week12-Review-handout.pdf`） | 01–08、13–14 的相应专题 |
| Review (2) 样题解答（`Week12-Review-Lecture3.pdf`） | [09](09-transport-layer-udp-tcp.md) 的主要讲义来源；其余页并入 10–12 |
| 安全复习题答案（`Week12-Review-1-sample-solution.pdf`） | [13](13-cryptography.md)、[14](14-signatures-authentication-security.md)（只取概念） |

## 资源与来源

- [资源完整性](RESOURCE-STATUS.md)：2026-10-22 核对，按周列出本地讲义、例题答案与学生笔记，以及缺失或需要区分的项目。
- [materials.json](materials.json)：每个文件的稳定来源 URL、SHA-256、大小、PDF 页数和首页摘录。

讲义于 **2026 年 10 月 21 日** 从 [Canvas](https://canvas.lms.unimelb.edu.au/courses/210316) 恢复：Week 1–7 与 Week 9–12 讲义页面上可见的全部 26 个文件链接，包括例题答案和复习材料。Week 7 明确沿用 W6-L3，该周另外两讲取消；展开的模块列表中没有 Week 8 讲义条目。Tutorial 页面不在这次只取讲义 PDF 的恢复范围内。Downloads 中的原件已复制并保留。

**学生笔记**：2026 年 10 月 22 日导入了 Apple Notes 中 `CS/25S1/IT` 的 17 篇周笔记，以及 `CS/25S1/IT/Review` 中的 8 篇复习笔记。学生笔记是次要来源：用来决定讲解重点、保留学生自己的例子和表述，并在若干处标出其中的笔误（如以太网最小帧长、DNS 端口、Internet 校验和的回卷）。笔记中的截图大多是讲义页，凡本地有讲义 PDF 的都改用重新渲染的页面。未单独导入的内容：

- `practice_exam`：只有标题、没有内容；
- 复习笔记中的样题与练习考试题：只把考查的概念并入相应专题，不照录题目；TCP Tahoe 的手算改用自拟数字；
- `Network Layer` 复习笔记中标为 Assignment-2 的截图：作业内容，不公开。

**来源上的几点说明**：

- 学生标为 "WEEK 8" 的三篇传输层笔记（传输层服务、UDP 与 TCP、TCP 管理）对应 Transport Layer (1)、(2)，这两份讲义没有恢复到本地。[09](09-transport-layer-udp-tcp.md) 因此以复习讲义 `Week12-Review-Lecture3.pdf` 为讲义来源，另用学生笔记中的 16 张截图补足，以 `note-XX` 标出。
- `Week9-Transport Layer-Lectures2and3.pdf` 的文件名写 Lectures 2 and 3，首页标题却是 Transport Layer (3)，内容是服务质量与拥塞控制，按内容归入 [10](10-congestion-control.md)。
- Week 6 的三份讲义依次是 Network Layer (2)、(3)、(4)，据此推断 W6-L3 是路由一讲（`Week6-routing.pdf`）；学生把路由笔记标为 "WEEK 7"，与"Week 7 沿用 W6-L3"一致。
- 网络层与传输层的学生笔记分讲编号与讲义不同：学生的 "Network2"、"Network3" 对应讲义 Network Layer (3)、(4)，"Transport4" 对应讲义 Transport Layer (3)。归档以讲义首页标题为准。
- 学生标为 "WEEK12" 的安全提纲同时覆盖 Network Security (1)（文件在 Week 11）与 (2)。

讲义截图编号均指 **PDF 页码**，不等于页脚的印刷编号：同一主题的几份讲义页脚连续编号（例如 Data Link Layer (3) 的页脚从 34 开始）。一篇笔记只用一份讲义时截图名为 `slide-XX`；用到多份讲义时加简写，如 `slide-w3phy-13`，简写与文件的对照见 [资源完整性](RESOURCE-STATUS.md)。

| 本地目录 | 内容 |
| --- | --- |
| `lecture/` | 26 份讲义、例题答案与复习 PDF（保留原始文件名） |
| `assets/<topic>/` | 选用讲义页的 PNG 截图（`slide-…`），以及学生笔记中无对应本地讲义的截图（`note-XX`） |

二进制资源与截图被 Git 忽略，只存在于本地检出中，不提交到版本库。可复用的笔记整理规则位于仓库 `.claude/skills/study-notes-course-materials/SKILL.md`。
