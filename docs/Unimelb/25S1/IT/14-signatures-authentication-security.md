# COMP90007 Week 12 - Network Security (2): Signatures, Authentication and Communication Security

来源：`lecture/Week12-Lecture1.pdf`（Network Security (2)）、`lecture/Week12-Review-handout.pdf` p.35、`lecture/Week12-Review-1-sample-solution.pdf` p.2（只取概念）；Apple Notes：CS/25S1/IT — "WEEK12 - Internet Security"；CS/25S1/IT/Review — "Network Security"。

这篇讲的是：**有了加密算法之后，怎样证明一条消息确实出自某人之手？怎样确认对面就是自己要找的人？又怎样把这些手段装进真实的网络里？**

学习路线：[数字签名与消息摘要](#topic-1) → [认证协议](#topic-2) → [通信安全：IPsec、防火墙与 VPN](#topic-3) → [Web 安全：HTTPS](#topic-4)。

重点：用消息摘要签名与验证的完整流程、挑战-应答、Diffie-Hellman 及其中间人攻击、IPsec 的两种模式。难点：认证协议中每条消息由谁发出、用谁的密钥加密。易错：签名用 **发送方的私钥**，验证用发送方的公钥；加密给某人则相反，用 **接收方的公钥**。

<a id="topic-1"></a>
## 1. 数字签名与消息摘要

### 签名方案要满足什么

![Slide 02 - Digital signature requirements](assets/14-signatures-authentication-security/slide-02.png)

**数字签名（digital signature）** 用来保证真实性、完整性和不可否认性。页面列出的四条要求，括号里标着各自对应的性质：

- 接收方能验证发送方声称的身份（真实性）；
- 接收方不可能自己伪造出这条消息（完整性）；
- 收发双方都能验证消息在传输中没有被改动（完整性）；
- 发送方不能否认自己创建了消息内容（不可否认）。
<!-- Sources: w12sec p.2 -->

### 用对称密钥：需要"老大哥"

![Slide 03 - Signatures with a trusted intermediary](assets/14-signatures-authentication-security/slide-03.png)

用对称密钥时，需要一个所有人都信任的中间人 **BB（Big Brother）** 替大家传话。图中左边是 Alice、中间是 BB、右边是 Bob。Alice 与 BB 共享密钥 $K_A$ ，Bob 与 BB 共享 $K_B$ ：

1. Alice 发给 BB： $A,\ K_A(B,R_A,t,P)$ ，即用 $K_A$ 加密收件人 B、随机数 $R_A$ 、时间戳 $t$ 和明文 $P$ ；
2. BB 解密后发给 Bob： $K_B\bigl(A,R_A,t,P,K_{BB}(A,t,P)\bigr)$ 。

最后一项 $K_{BB}(A,t,P)$ 是 BB 签发的"证明"：日后 Alice 否认时，Bob 可以拿它请 BB 作证。缺点是所有消息都要经过这一个中间人。
<!-- Sources: w12sec p.3 -->

### 用公钥算法

![Slide 04 - Signatures with public keys](assets/14-signatures-authentication-security/slide-04.png)

用 RSA 这类公钥算法（RSA 见 [13 公钥算法](13-cryptography.md#topic-5)），且要求 $E(D(P))=P$ 也成立时，沿图中从左到右的四个框走：Alice 用 **自己的私钥** $D_A$ 处理 $P$ 得到签名 $D_A(P)$ ；如需保密，再用 Bob 的公钥 $E_B$ 加密，线上传的是 $E_B\bigl(D_A(P)\bigr)$ 。Bob 先用自己的私钥 $D_B$ 解开外层，得到 $D_A(P)$ ，再用 **Alice 的公钥** $E_A$ 还原出 $P$ 。只有 Alice 知道 $D_A$ ，所以她无法否认签过名。
<!-- Sources: w12sec p.4 -->

### 消息摘要

![Slide 05 - Message digest properties](assets/14-signatures-authentication-security/slide-05.png)

对整条长消息做公钥运算太慢。**消息摘要（message digest，MD）** 用一个 **单向哈希函数**，把任意长的明文变成一个唯一的、短的定长比特串。它有四个重要性质：

1. 给定 $P$ ，很容易算出 $MD(P)$ ；
2. 给定 $MD(P)$ ，实际上不可能找回 $P$ ；
3. 给定 $P$ ，没人能找到 $P'$ 使 $MD(P')=MD(P)$ ；
4. 输入哪怕只改一位，输出也会大不相同。
<!-- Sources: w12sec p.5 -->

页面下方给出用法：Alice 发送 $P,\ D_A\bigl(MD(P)\bigr)$ 。只对很短的摘要做私钥运算，不必为认证而加密整条消息；性质 3 保证别人无法换一条摘要相同的消息来冒用这个签名。

![Slide 06 - Hash algorithm examples](assets/14-signatures-authentication-security/slide-06.png)

常用的安全哈希算法有 SHA-1、SHA-2、SHA-3；MD5 已知有严重漏洞（如哈希碰撞，即两条不同消息得到相同摘要，正好违反性质 3）。页面对字符串 "this is a test" 分别给出 MD5（32 个十六进制字符，即 128 位）、SHA-1（40 个，160 位）和 SHA-3（64 个，256 位）的结果：长度只由算法决定，与输入长度无关。
<!-- Sources: w12sec p.6 -->

**补充**：讲义把 SHA-1 列在"安全哈希算法"里；SHA-1 后来也已出现实际碰撞，新的签名应使用 SHA-2 或 SHA-3。

### 签名与验证的完整流程

把上面的用法拆成收发双方各自的步骤。记号：

| 记号 | 含义 |
| --- | --- |
| A、B | Alice（发送方）、Bob（接收方） |
| $D_A$ 、 $E_A$ | Alice 的私钥、公钥 |
| $P$ | 明文 |
| $MD$ | 消息摘要函数 |

**签名（Alice）**：

1. 计算明文的摘要 $MD(P)$ ；
2. 用私钥加密摘要，得到签名 $D_A\bigl(MD(P)\bigr)$ ；
3. 把 $P$ 和签名一起发给 Bob。

**验证（Bob）**：

1. 用 Alice 的公钥 $E_A$ 解开签名，得到 $MD(P)$ ；
2. 对收到的明文 $P'$ 自己计算 $MD(P')$ ；
3. 若 $MD(P)=MD(P')$ ，签名有效，消息真实且未被篡改。
<!-- Sources: w12sec p.5; rev-sol p.2; Apple Notes Review Network Security -->

**易错**：验证时 Bob 用的是 **Alice 的公钥**，不是自己的私钥；任何人都能验证，但只有 Alice 能签。

<a id="topic-2"></a>
## 2. 认证协议

### 认证的一般模型

![Slide 07 - Authentication general model](assets/14-signatures-authentication-security/slide-07.png)

**认证（authentication）** 是确认通信对方就是他所声称的那个人。一般模型：Alice 向 Bob 或可信的中间人发起；双方交换若干条消息进行验证；结束时双方都确信在和对的人说话，还可以顺便建立一把用于后续通信的秘密 **会话密钥（session key）**。典型方法有两类：用共享密钥，或用公钥密码。下面四页先讲共享密钥（含没有共享密钥时怎样现造一把），最后讲公钥。
<!-- Sources: w12sec p.7 -->

### 共享密钥：挑战-应答

![Slide 08 - Challenge-response](assets/14-signatures-authentication-security/slide-08.png)

假设 Alice 和 Bob 已共享密钥 $K_{AB}$ 。 $R_A$ 、 $R_B$ 是各自选的随机数，叫 **挑战（challenge）**。图中左竖条是 Alice、右竖条是 Bob，箭头方向就是消息方向：

| 消息 | 方向 | 内容 | 作用 |
| --- | --- | --- | --- |
| 1 | A → B | $A$ | 宣称自己是 Alice |
| 2 | B → A | $R_B$ | Bob 出题 |
| 3 | A → B | $K_{AB}(R_B)$ | 只有知道 $K_{AB}$ 的人才能答对，Bob 确认对方是 Alice |
| 4 | A → B | $R_A$ | Alice 出题 |
| 5 | B → A | $K_{AB}(R_A)$ | Alice 确认对方是 Bob |
<!-- Sources: w12sec p.8 -->

每次的挑战都是新的随机数，所以攻击者录下旧的应答再 **重放（replay）** 也没用：旧应答对应的是旧题目。

### 没有共享密钥：Diffie-Hellman 密钥交换

![Slide 09 - Diffie-Hellman key exchange](assets/14-signatures-authentication-security/slide-09.png)

如果 Alice 和 Bob 事先没有共享密钥，可以用 **Diffie-Hellman 密钥交换** 当场造一把。按图中两条消息：

1. 双方商定两个大数 $n$ 和 $g$ （可以公开）；
2. Alice 选一个大的秘密数 $x$ ，发出 $n,\ g,\ g^x\bmod n$ ；
3. Bob 选一个大的秘密数 $y$ ，发出 $g^y\bmod n$ ；
4. Alice 计算 $(g^y\bmod n)^x\bmod n$ ，Bob 计算 $(g^x\bmod n)^y\bmod n$ ，两者都等于 $g^{xy}\bmod n$ ，这就是图中红圈标出的共享秘密。

窃听者看得到 $n$ 、 $g$ 、 $g^x\bmod n$ 、 $g^y\bmod n$ ，但从中求出 $x$ 或 $y$ 极其困难。**补充**：实际使用时 $n$ 取一个大素数。
<!-- Sources: w12sec p.9 -->

**理解用例（自拟）**：取 $n=23$ 、 $g=5$ ，Alice 选 $x=6$ ，Bob 选 $y=15$ 。Alice 发 $5^6\bmod23=8$ ，Bob 发 $5^{15}\bmod23=19$ 。Alice 算 $19^6\bmod23=2$ ，Bob 算 $8^{15}\bmod23=2$ ，共享秘密为 2。

### Diffie-Hellman 的中间人攻击

![Slide 10 - Man-in-the-middle on Diffie-Hellman](assets/14-signatures-authentication-security/slide-10.png)

上一页底部问："有办法破解吗？" 这一页给出答案：Trudy 自己选一个秘密数 $z$ ，站在中间。看图中四条消息：Alice 发出的 $g^x$ 被 Trudy 截下（消息 1），Trudy 改发 $g^z$ 给 Bob（消息 2）；Trudy 也发 $g^z$ 给 Alice（消息 3），Bob 回的 $g^y$ 被 Trudy 收下（消息 4）。结果 Alice 与 Trudy 共享 $g^{xz}$ ，Bob 与 Trudy 共享 $g^{zy}$ ，双方都以为在和对方通话，加密会话中的每条消息都被 Trudy 截获、解开、再转发。根源在于 DH 本身 **不认证对方身份**：收到的 $g^y$ 到底是不是 Bob 发的，Alice 无从判断。
<!-- Sources: w12sec p.10 -->

### 用公钥认证

![Slide 11 - Authentication with public keys](assets/14-signatures-authentication-security/slide-11.png)

$E_A$ 、 $E_B$ 分别是 Alice、Bob 的公钥；PKI 的目录服务器为公钥发放证书（证书见 [13 公钥管理](13-cryptography.md#topic-6)），避免上面的冒充。按图中编号：

| 消息 | 方向 | 内容 | 作用 |
| --- | --- | --- | --- |
| 1–2 | Alice ↔ 目录 | 请求并取得 $E_B$ | 拿到经证书担保的 Bob 公钥 |
| 3 | A → B | $E_B(A,R_A)$ | 只有 Bob 能解开 |
| 4–5 | Bob ↔ 目录 | 请求并取得 $E_A$ | 拿到经证书担保的 Alice 公钥 |
| 6 | B → A | $E_A(R_A,R_B,K_S)$ | 送回 Alice 的挑战，证明自己能解密；同时出题 $R_B$ 并提议会话密钥 $K_S$ |
| 7 | A → B | $K_S(R_B)$ | 用会话密钥答题，证明自己就是 Alice |
<!-- Sources: w12sec p.11 -->

和 DH 的区别在于：这里每个公钥都有证书担保，Trudy 没法像在 DH 里那样把自己的值冒充成对方的。

复习讲义把常见攻击归为几类：中间人攻击、密钥流重用（见 [13 密钥流重用攻击](13-cryptography.md#topic-4)）、重放攻击等。本讲的对应防御分别是证书、独立随机地选（密钥，IV）、每次新的挑战随机数。
<!-- Sources: rev1 p.35 -->

<a id="topic-3"></a>
## 3. 通信安全：IPsec、防火墙与 VPN

### 通信安全要照顾的性质

![Slide 13 - Communication security properties and solutions](assets/14-signatures-authentication-security/slide-13.png)

上方五个方框就是 [13 网络安全的目标](13-cryptography.md#topic-1) 中的五个性质；通信安全要同时照顾它们。下方列出四种解决方案：IPsec、防火墙、虚拟专用网和 HTTPS，本讲余下部分依次讲解。
<!-- Sources: w12sec p.13; Apple Notes WEEK12 Internet Security -->

### IPsec 放在哪一层

![Slide 14 - IPsec at the network layer](assets/14-signatures-authentication-security/slide-14.png)

安全放在哪一层？放在应用层，每个应用都要自己做；**IPsec（IP Security）** 选择放在 **网络层**，上面的所有应用一起受保护。它是一个框架，允许多种服务、算法和粒度：主要服务是机密性、数据完整性和防重放，基于对称密钥密码；与具体算法无关；可以保护一条 TCP 连接、两台主机之间的全部流量，或一对路由器之间的全部流量。
<!-- Sources: w12sec p.14 -->

### IPsec 的两种模式

![Slide 15 - IPsec modes](assets/14-signatures-authentication-security/slide-15.png)

IPsec 增加用于安全和完整性控制的头部，图中是其中一种：**ESP（Encapsulating Security Payload）** 头部。它有两种模式：

| 模式 | 结构（从前到后） | 用途 |
| --- | --- | --- |
| 传输模式（transport mode） | IP 头部 → ESP 头部 → TCP 头部 → 载荷 + 填充 → 认证（HMAC） | 端到端通信，如客户端与服务器之间 |
| 隧道模式（tunnel mode） | 新 IP 头部 → ESP 头部 → 原 IP 头部 → TCP 头部 → 载荷 + 填充 → 认证（HMAC） | 网关之间，如安全网关、公司防火墙 |

对照图中每行上方的 "Authenticated" 和下方的 "Encrypted" 两个箭头范围：

- **加密范围** 从 ESP 头部之后开始：传输模式加密 TCP 头部和载荷，原 IP 头部仍是明文，路由器照常转发；隧道模式连原 IP 头部一起加密，外人只能看到新 IP 头部里两个网关的地址。
- **认证范围** 从 ESP 头部开始、到载荷为止，比加密范围多出 ESP 头部；最前面的（新）IP 头部两者都不覆盖。末尾的 HMAC 字段就是认证用的校验值。
<!-- Sources: w12sec p.15 -->

**补充**：IPsec 还有另一种头部 AH（Authentication Header），只认证不加密；讲义只讲 ESP。

### 防火墙的定义

![Slide 16 - Firewall characteristics](assets/14-signatures-authentication-security/slide-16.png)

**防火墙（firewall）** 位于网络边界，在内部网络和外部网络之间提供一组受控的通道。三个特征：所有进出流量都必须经过防火墙；只有经授权的流量才能通过；防火墙自身要能抵御入侵。
<!-- Sources: w12sec p.16 -->

### 防火墙放在哪里

![Slide 17 - Firewall placement](assets/14-signatures-authentication-security/slide-17.png)

防火墙充当 **分组过滤器**，检查坏分组，例如区分普通 HTTP 与 P2P 相关的 HTTP。看下方的图：左边的内部主机在安全边界（security perimeter，穿过防火墙的虚线）以内；Web 服务器和邮件服务器放在防火墙与外侧路由器之间，即安全边界之外。页面的要点是最好的防火墙不是把一切都与 Internet 断开：这些服务器需要对外开放才能工作，所以放在边界外，内部网络仍由防火墙保护。
<!-- Sources: w12sec p.17 -->

### 防火墙的局限

![Slide 18 - Firewall limitations](assets/14-signatures-authentication-security/slide-18.png)

局限有三条：为了过滤要检查传输层和应用层的信息，违反了协议分层；应用仍可能通过附件传播病毒；无法防御内部威胁（攻击者本来就在边界以内）。
<!-- Sources: w12sec p.18 -->

### 虚拟专用网

![Slide 19 - Virtual private networks](assets/14-signatures-authentication-security/slide-19.png)

在需要安全传输的地点之间租用物理专线非常昂贵。**虚拟专用网（Virtual Private Network，VPN）** 是建立在 IP 网络之上的虚拟层，借助公共基础设施提供安全的端到端连接。常见实现：连接的每一端各放一台防火墙；在所有端点对之间建立 **IPsec 隧道**（设置安全关联，Security Association），也就是上面的隧道模式。
<!-- Sources: w12sec p.19 -->

![Slide 20 - VPN topology](assets/14-signatures-authentication-security/slide-20.png)

左图是实际情况：伦敦办公室、巴黎办公室、在家和出差的员工都经过 Internet，用隧道相连；右图是用户眼中的拓扑：好像各点之间直接有专线。基础设施对终端用户是透明的，隧道可以按需建立。
<!-- Sources: w12sec p.20 -->

<a id="topic-4"></a>
## 4. Web 安全：HTTPS

### HTTPS 与 TLS

![Slide 21 - HTTPS and TLS handshake contents](assets/14-signatures-authentication-security/slide-21.png)

**HTTPS** 用 **TLS（Transport Layer Security）** 实现安全的通信与数据传送。讲义把它展开为 Secure Hypertext Transport Protocol；**补充**：标准名称是 Hypertext Transfer Protocol Secure，即"跑在 TLS 上的 HTTP"。TLS 握手先协商怎样安全地交换数据，页面列出前两条消息带什么：Client Hello 带版本、可用的加密算法和数据压缩方法；Server Hello 确定加密算法，并带上会话 ID、数字证书和公钥。

### TLS 握手

![Slide 22 - TLS handshake](assets/14-signatures-authentication-security/slide-22.png)

图中左边是客户端、右边是服务器，从上往下按时间顺序：

| 消息 | 方向 | 作用 |
| --- | --- | --- |
| Client Hello | 客户端 → 服务器 | 提出版本、加密算法、压缩方法 |
| Server Hello | 服务器 → 客户端 | 选定算法，出示证书和公钥 |
| Client Key Exchange | 客户端 → 服务器 | **补充**：送出生成会话密钥所需的材料（例如用服务器公钥加密） |
| Client Finished、Server Finished | 双向 | **补充**：各自确认握手内容一致、此后改用会话密钥 |
| Data Exchange | 双向 | 用协商好的会话密钥加密数据 |
<!-- Sources: w12sec p.21-22; Apple Notes WEEK12 Internet Security -->

服务器在 Server Hello 中出示的数字证书由 CA 签名（见 [13 公钥管理](13-cryptography.md#topic-6)），客户端借此确认公钥确实属于这台服务器，这正好堵住了 DH 那样的中间人攻击。

**理解用例（自拟）**：把本讲和上一讲串起来看 HTTPS：证书和公钥算法负责 **认证** 服务器并安全地交换会话密钥；之后的大量数据用对称算法加密，保证 **机密性**；每条记录附带的消息认证码保证 **完整性**。

## 本讲自测

1. Alice 想让消息既保密又有签名，她应该先用谁的什么密钥、再用谁的什么密钥？Bob 收到后按什么顺序处理？
2. 在挑战-应答协议中，如果 Bob 每次都用同一个 $R_B$ ，攻击者可以怎样冒充 Alice？
3. 取 $n=11$ 、 $g=2$ ，Alice 选 $x=3$ ，Bob 选 $y=4$ 。双方交换的值和共享秘密各是多少？
4. 公司想让两地办公室之间的所有流量都加密，且不让外人看出内部主机的地址。应选 IPsec 的哪种模式？为什么另一种不行？
5. 一家公司把 Web 服务器放进防火墙以内的内部网络。按讲义的防火墙原则，这样做有什么问题？
