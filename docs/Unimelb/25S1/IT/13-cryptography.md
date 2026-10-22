# COMP90007 Week 11 - Network Security (1): Cryptography

来源：`lecture/Week11-Lectures2&3.pdf`（Network Security (1)）、`lecture/Week12-Review-handout.pdf` p.32–34、`lecture/Week12-Review-1-sample-solution.pdf` p.1（只取概念）；Apple Notes：CS/25S1/IT — "WEEK12 - Internet Security"；CS/25S1/IT/Review — "Network Security"。

这篇讲的是：**数据要穿过任何人都可能偷听、篡改的网络，怎样让只有该看的人看得懂？** 答案的核心是密码学。

学习路线：[网络安全的目标](#topic-1) → [加密模型与密钥](#topic-2) → [古典密码与一次性密码本](#topic-3) → [对称密钥算法与密码模式](#topic-4) → [公钥算法与 RSA](#topic-5) → [公钥管理](#topic-6)。

重点：四种密码模式的区别、RSA 的密钥生成与加解密、证书的作用。难点：各密码模式的加解密结构图。易错：Kerckhoff 原则下算法是公开的，保密的只有密钥；流密码模式和计数器模式绝不能重用同一对（密钥，IV）。

<a id="topic-1"></a>
## 1. 网络安全的目标

### 五个安全性质

![Slide 02 - Essential security properties](assets/13-cryptography/slide-02.png)

这页列出五个性质。前三个常合称 CIA，后两个和"对方是谁、能否抵赖"有关：

| 性质 | 含义 |
| --- | --- |
| 机密性（confidentiality） | 信息不被未授权的人看到 |
| 完整性（integrity） | 内容没有被修改或篡改 |
| 可用性（availability） | 系统和服务不会变得无法使用 |
| 认证（authentication） | 确认你交付内容的对象持有有效凭据 |
| 不可否认（non-repudiation） | 证明内容确实由某个具名用户创建，与签名有关 |
<!-- Sources: w11sec p.2 -->

### 两起事件对应哪些性质

![Slide 03 - Equifax man-in-the-middle incident](assets/13-cryptography/slide-03.png)

![Slide 04 - Azure DDoS incident](assets/13-cryptography/slide-04.png)

两页的下半部分都把事件对到上一页的性质上。2017 年 Equifax 遭受 **中间人攻击（man-in-the-middle attack）**：攻击者截获甚至篡改双方之间的数据，持续 75 天才被发现，约 1.43 亿条个人记录可能受影响，事后公司花了 14 亿美元升级安全；涉及机密性、完整性和认证。2021 年 Microsoft Azure 抵御了一次 3.47 Tbps、每秒 3.4 亿个分组的 **DDoS 攻击**（分布式拒绝服务）：这类攻击意在耗尽系统资源，破坏的是可用性，并带来经济损失。
<!-- Sources: w11sec p.3-4 -->

### 安全出现在每一层

![Slide 05 - Security at every layer](assets/13-cryptography/slide-05.png)

按层看：物理层把传输线封闭起来防窃听；网络层用防火墙监控流量；传输层加密连接；应用层做认证。页面最后一句是本讲的出发点：大多数安全实现都建立在 **密码学（cryptography）** 和 **认证** 之上。密码学是一组算法，用来制造秘密、认证用户、确保消息未被篡改、确保作者不能否认自己的修改。
<!-- Sources: w11sec p.5, p.7 -->

学生笔记的 Week 12 提纲列出了两讲安全课的主题：密码学、公钥管理、数字签名、认证、通信安全（IPsec、防火墙、VPN、HTTPS）。后四项在 [14 签名、认证与通信安全](14-signatures-authentication-security.md)。
<!-- Sources: Apple Notes WEEK12 Internet Security -->

<a id="topic-2"></a>
## 2. 加密模型与密钥

### 加密模型

![Slide 08 - Encryption model](assets/13-cryptography/slide-08.png)

从左往右读：Alice 用加密方法 $E$ 和密钥 $K$ 把 **明文（plaintext）** $P$ 变成 **密文（ciphertext）** $C=E_K(P)$ 送出；Bob 用解密方法 $D$ 和同一把密钥还原。中间的 Trudy 是入侵者：左上标的 **被动入侵者** 只是偷听，右上标的 **主动入侵者** 还能篡改消息。

$$
C=E_K(P),\qquad P=D_K(C),\qquad D_K\bigl(E_K(P)\bigr)=P.
$$
<!-- Sources: w11sec p.8-9 -->

### 密钥：从众多加密方式中选一种

![Slide 10 - Shift cipher example](assets/13-cryptography/slide-10.png)

**密钥（key）** 是一个字符串，用来从众多可能的加密中选出一种。这页的例子：把每个字母换成字母表中的下一个（z 绕回 a），右边两个小表分别是密钥为 1 和 4 时的对应关系。密钥为 1 时，明文 `where` 加密成 `xifsf`；解密就往回退一个字母。密钥为 4 时 z→d、a→e。算法（"往后移"）不变，换的只是密钥（"移几位"）。
<!-- Sources: w11sec p.10 -->

### Kerckhoff 原则与密钥空间

![Slide 11 - Kerckhoff's principle](assets/13-cryptography/slide-11.png)

**Kerckhoff 原则**：加密算法和相关函数（ $E$ 、 $D$ ）是公开的，只有密钥 $K$ 保密。页面下方的式子说，我们希望

$$
D_{K_1}\bigl(E_{K_2}(P)\bigr)=P\quad\text{当且仅当}\quad K_1=K_2,
$$

也就是只有拿对了密钥才能解开。密钥长 $n$ 位时，**密钥空间** 大小为 $2^n$ 。密钥越长，破解越费力；密钥可以随时更换，算法则不常更换。
<!-- Sources: w11sec p.11-12 -->

**易错**：安全不能依赖"别人不知道我用的什么算法"。算法迟早会泄露；把秘密集中在可随时更换的密钥上才可靠。**补充**：这条原则的提出者是 Auguste Kerckhoffs，英文资料多写作 Kerckhoffs's principle；讲义写作 Kerckhoff。

<a id="topic-3"></a>
## 3. 古典密码与一次性密码本

### 替代密码

![Slide 13 - Substitution cipher](assets/13-cryptography/slide-13.png)

**替代密码（substitution cipher）**：每个字母或字母组被系统地替换成另一个字母或字母组。Example 1 就是上面的"下一个字母"。Example 2 用一张打乱的字母表作密钥：上行是明文字母，下行是对应的密文字母（a→Q、b→W、c→E……）。解密时反查这张表：先在下行找到密文字母，再读它上方的明文字母。

**理解用例（自拟）**：收到密文 `TQZ`，在下行找到 T、Q、Z，上方分别是 e、a、t，明文是 `eat`。

页面最后一条说明它的弱点：密码分析者可以利用自然语言的统计规律（如 e 最常见）破解这种密码，因为同一个明文字母总是变成同一个密文字母。
<!-- Sources: w11sec p.13 -->

### 换位密码

![Slide 14 - Transposition cipher](assets/13-cryptography/slide-14.png)

**换位密码（transposition cipher）**：字母不变，只重新排列顺序。密钥 `MEGABUCK` 按字母顺序给各列编号（A = 1，B = 2，C = 3，E = 4……），也就是图中密钥下面那行数字 `7 4 5 1 2 8 3 6`。明文按行写进 8 列，再按编号 1、2、3……逐列读出。图中框出的第 1 列（A 列）从上往下是 `afllskso`，正是密文开头 `AFLLSKSO`。
<!-- Sources: w11sec p.14 -->

### 一次性密码本

![Slide 16 - XOR truth table](assets/13-cryptography/slide-16.png)

一次性密码本要用到 **异或（XOR）**：A XOR B 表示"A 或 B，但不能两者都是"。左表是真值表，右表把它换成比特：数据位与密钥位相同得 0、不同得 1。右侧空着的 Receiver 栏是课堂动画留给接收方的：再用同一个密钥位异或一次，就回到原数据位。

![Slide 17 - One-time pad worked example](assets/13-cryptography/slide-17.png)

**一次性密码本（one-time pad）**：把明文转成比特串（如用 ASCII），取一个随机比特串作密钥，两者逐位异或。图中蓝色是明文、红色是密钥：

```text
加密  plaintext  00110101
      key        11100011
      ciphertext 11010110
解密  ciphertext 11010110
      key        11100011
      plaintext  00110101
```
<!-- Sources: w11sec p.15-17 -->

从信息论看它很难破解。缺点：密钥无法记住；能传的数据总量受密钥长度限制；对丢失或插入的字符很敏感（错一位，后面全错位）。
<!-- Sources: w11sec p.18 -->

<a id="topic-4"></a>
## 4. 对称密钥算法与密码模式

现代基于密钥的算法分两大类：**对称密钥算法（symmetric-key algorithm）** 和 **公钥算法**。对称密钥算法加解密用同一把密钥，靠置换、替代以及二者的组合工作。
<!-- Sources: w11sec p.19; rev1 p.33 -->

### DES 与 AES

![Slide 20 - DES and AES](assets/13-cryptography/slide-20.png)

页面给出两种标准算法的分组大小、密钥长度和密钥空间：

| 算法 | 分组 | 密钥 | 密钥空间 |
| --- | --- | --- | --- |
| DES（Data Encryption Standard） | 64 位 | 56 位 | $2^{56}$ ；讲义写 3DES 为 $3\times2^{56}$ |
| AES（Advanced Encryption Standard，2000 年代起） | 讲义写 128–256 位 | 128–256 位 | $2^{128}$ 到 $2^{256}$ ，仍基于替代与置换，多轮运算 |
<!-- Sources: w11sec p.20 -->

<details markdown="1">
<summary>延伸内容（可选）：讲义两处数字的精确说法</summary>

- **3DES 的密钥空间**：3DES 用三把 56 位密钥（或其中两把相同），总密钥长度是 168 位（或 112 位），所以密钥空间是 $2^{168}$ （或 $2^{112}$ ），不是 $3\times2^{56}$ 。由于中间相遇攻击，三密钥 3DES 的实际强度约为 $2^{112}$ 。讲义的 $3\times2^{56}$ 只能理解为"做三次 DES"的粗略说法。
- **AES 的分组大小**：AES 标准把分组固定为 128 位，密钥可以是 128、192 或 256 位。"128–256 位分组"是它的前身 Rijndael 的设计范围。

</details>

### 为什么需要密码模式

![Slide 21 - Cipher modes](assets/13-cryptography/slide-21.png)

DES 和 AES 直接使用时是 **电子密码本模式（Electronic Code Book，ECB）**：每个明文块独立加密。页面指出它的局限：**相同的明文块总得到相同的密文块**，攻击者能看出重复，甚至挪动、替换整块。下面列出的四种密码模式就是解决办法，后面四页逐一画出它们的结构。
<!-- Sources: w11sec p.21 -->

### 密码分组链接模式

![Slide 22 - Cipher block chaining](assets/13-cryptography/slide-22.png)

**CBC（Cipher Block Chaining）**：每个明文块先与 **前一个密文块** 异或再加密；第一块与随机选择的 **初始向量（Initialization Vector，IV）** 异或。看左图从上往下：明文块先进 $\oplus$ ，再进加密框 E；E 的输出既是本块密文，又沿斜线送去和下一块明文异或。于是 $C_0=E(P_0\oplus IV)$ ， $C_1=E(P_1\oplus C_0)$ ……即使 $P_0=P_1$ ，密文也不同。解密（右图）反过来：密文先进解密框 D，再与前一个密文块异或。
<!-- Sources: w11sec p.22; Apple Notes Review Network Security -->

### 密码反馈模式

![Slide 23 - Cipher feedback](assets/13-cryptography/slide-23.png)

**CFB（Cipher Feedback）**：按 **字节** 而不是按块加密。看左图顶部：一个 64 位移位寄存器装着最近的 8 个密文字节 $C_2$ … $C_9$ ；对它加密后取最左边一个字节，与明文字节 $P_{10}$ 异或得到 $C_{10}$ ，右侧的回线把 $C_{10}$ 移进寄存器，最老的 $C_2$ 被挤出。适合数据不能一次凑齐整块的场合，例如逐个加密键盘输入。缺点是单比特差错影响更大：密文中错 1 位，会影响 9 个字节的解密结果（当前字节，加上它在寄存器中停留期间的 8 个字节）。
<!-- Sources: w11sec p.23 -->

**易错**：对比左右两图，解密一侧用的仍是加密框 E，不是 D。CFB 只用 E 生成"要异或的字节"，异或本身可逆，所以收发双方都只需要 E。下面的流密码模式和计数器模式也一样。

### 流密码模式

![Slide 24 - Stream cipher mode](assets/13-cryptography/slide-24.png)

**流密码模式（stream cipher mode）**：从 IV 开始反复加密（每次输出又作为下一次的输入，图中 E 下方绕回的粗箭头），生成一串输出块，叫 **密钥流（keystream）**。把密钥流当作一次性密码本，与明文异或得到密文。红框标出：密钥流 **与数据无关**，可以提前算好。**补充**：因为密文不回流，密文中错 1 位只影响对应的 1 位明文，不像 CFB 那样扩散。
<!-- Sources: w11sec p.24 -->

### 计数器模式

![Slide 25 - Counter mode](assets/13-cryptography/slide-25.png)

**计数器模式（counter mode）**：不直接加密明文，而是加密 IV 加一个常数（图中从左到右是 IV、IV+1、IV+2、IV+3），再把结果与对应明文块异或。每块只依赖 **自己的位置**（红框 "Step based"）。
<!-- Sources: w11sec p.25 -->

**重点：需要随机访问时用计数器模式。** 加密后的文件若要按非顺序访问（例如直接读第 1000 块），计数器模式最合适：任一块都能用"IV + 块号"单独加密或解密。CBC 需要前一个密文块，CFB 需要前面 8 个密文字节，流密码模式要从头生成密钥流，都无法直接跳到中间。
<!-- Sources: rev-sol p.1; Apple Notes Review Network Security -->

**易错**：复习答案把 CFB 的依赖写成"前 8 个密文块"，按第 23 页的图应是前 8 个密文 **字节**（合起来正好是一个 64 位块）。

| 模式 | 加密单位 | 依赖什么 | 适合 |
| --- | --- | --- | --- |
| ECB | 块 | 只有本块 | 不推荐：相同明文得相同密文 |
| CBC | 块 | 前一个密文块（首块用 IV） | 一般的文件与消息加密 |
| CFB | 字节 | 前 8 个密文字节 | 逐字节到达的数据（如击键） |
| 流密码 | 位/字节 | 由 IV 反复加密生成的密钥流 | 可预先计算密钥流；差错不扩散 |
| 计数器 | 块 | IV + 块位置 | 随机访问 |

### 密钥流重用攻击

![Slide 26 - Keystream reuse attack](assets/13-cryptography/slide-26.png)

流密码模式和计数器模式中，如果 **同一对（密钥，IV）用了两次**，两条消息会用同一个密钥流 $K_0$ 。页面中间三行就是推导：

$$
(P_0\oplus K_0)\oplus(Q_0\oplus K_0)=P_0\oplus Q_0.
$$

攻击者只要把两段密文异或，密钥流就抵消了，从 $P_0\oplus Q_0$ 可以推出明文。所以密钥和 IV 必须独立、随机地选取。
<!-- Sources: w11sec p.26 -->

**理解用例（自拟）**：两条消息各 8 位， $P_0=01000001$ 、 $Q_0=01000010$ ，误用同一个 $K_0$ 。攻击者把两段密文异或，得到 $00000011$ ，与 $K_0$ 无关；只要他猜中其中一条（比如固定格式的报头），另一条就能直接算出。

<a id="topic-5"></a>
## 5. 公钥算法与 RSA

### 非对称密钥

![Slide 29 - Public-key encryption process](assets/13-cryptography/slide-29.png)

对称密钥算法必须把密钥分发给系统中的所有用户，这本身就是难题。Diffie 和 Hellman 提出新模型：使用两把 **不容易互相推导** 的密钥，即 **非对称密钥（asymmetric keys）**。页面中红字把两把钥匙对上符号：

- **公钥（public key）** $K_1$ ：所有人都知道，任何人都能用它给密钥主人加密消息；
- **私钥（private key）** $K_2$ ：只有主人知道，解密需要它。

$$
C=E_{K_1}(P),\qquad P=D_{K_2}(C),\qquad D_{K_2}\bigl(E_{K_1}(P)\bigr)=P.
$$
<!-- Sources: w11sec p.27-29; rev1 p.34 -->

### RSA 的密钥生成

![Slide 30 - RSA key generation](assets/13-cryptography/slide-30.png)

**RSA（Rivest, Shamir, Adleman）** 的密钥生成按页面五步走：

1. 选两个大素数 $p$ 、 $q$ ；
2. 计算 $n=p\times q$ ， $z=(p-1)\times(q-1)$ ；
3. 选 $d$ 与 $z$ 互素（没有公因子）；
4. 找 $e$ 使 $(d\times e)\bmod z=1$ ；
5. 公钥是 $(e,n)$ ，私钥是 $(d,n)$ 。

$$
C=P^{e}\bmod n,\qquad P=C^{d}\bmod n.
$$
<!-- Sources: w11sec p.30 -->

### RSA 例子

![Slide 31 - RSA example](assets/13-cryptography/slide-31.png)

上半部分按五步算出密钥： $p=3$ 、 $q=11$ ，所以 $n=33$ 、 $z=20$ ；取 $d=7$ （与 20 无公因子），则 $e=3$ （ $7\times3=21$ ， $21\bmod20=1$ ）。加密密钥 $(3,33)$ ，解密密钥 $(7,33)$ 。

下面的表逐个字母加密 SUZANNE，从左往右读每一行：字母 → 编号 $P$ → $P^3$ → $P^3\bmod33$ 得到密文 $C$ → $C^7$ → $C^7\bmod33$ 还原编号 → 字母。以第一行为例：S 是第 19 个字母， $19^3=6859$ ， $6859\bmod33=28$ ；解密 $28^7\bmod33=19$ ，还原为 S。
<!-- Sources: w11sec p.31 -->

**理解用例（自拟）**： $p=5$ 、 $q=11$ ，则 $n=55$ 、 $z=40$ 。取 $d=7$ ，由 $7e\bmod40=1$ 得 $e=23$ （ $7\times23=161=4\times40+1$ ）。加密 $P=2$ ：因为 $2^{20}\bmod55=1$ ，所以 $2^{23}\bmod55=8$ ， $C=8$ 。解密 $8^7\bmod55$ ： $8^2\bmod55=9$ ， $8^4\bmod55=26$ ， $26\times9\times8=1872$ ， $1872\bmod55=2$ ，还原成功。

手算 $C^d\bmod n$ 时不要先算出 $C^d$ 这个巨大的数：像上面这样把指数拆成平方的乘积，每乘一步就取一次模，数字始终很小。

### RSA 的安全性与用途

![Slide 32 - RSA security and drawback](assets/13-cryptography/slide-32.png)

RSA 的安全性依赖于 **大数分解的困难**：知道 $n$ 却分解不出 $p$ 、 $q$ ，就算不出 $z$ ，也就推不出私钥 $d$ 。讲义称分解一个 500 位数约需 $10^{25}$ 年。缺点是太慢，不适合加解密大量数据，因此常用于其他任务，例如为对称密钥算法 **安全地分发密钥**：先用 RSA 送一把对称会话密钥，再用快速的对称算法加密数据。
<!-- Sources: w11sec p.32 -->

<a id="topic-6"></a>
## 6. 公钥管理

### 为什么公钥也要管理

![Slide 34 - Man-in-the-middle on public keys](assets/13-cryptography/slide-34.png)

要和 Bob 通信，先得拿到 Bob 的公钥。如果 Bob 只是把公钥贴在个人网页上，按图中编号：Alice 请求 Bob 的主页（第 1 步），Trudy 截获并回送一个伪造的主页，里面是 Trudy 自己的公钥 $E_T$ （第 2 步）；Alice 用 $E_T$ 加密消息（第 3 步），Trudy 解密读完，再用 Bob 的真公钥 $E_B$ 加密转给 Bob（第 4 步）。双方都没察觉，这就是 **中间人攻击**。

页面最后一问是"建一个按需提供公钥的密钥分发中心行不行"。**补充**：这样的中心要始终在线、处理所有请求，会成为瓶颈和单点故障；下一页的证书让公钥可以离线验证，避开了这个问题。
<!-- Sources: w11sec p.34 -->

### 证书

![Slide 35 - Certificates](assets/13-cryptography/slide-35.png)

**证书（certificate）** 把一个公钥和一个人或公司的名字绑定在一起：

- **证书颁发机构（Certification Authority，CA）**：可信的中间人，在认证密钥和签发证书之前用非电子手段核实用户身份；
- **X.509** 规定证书的格式和字段。

下方的示例证书分两块：上面是"我在此证明下列公钥属于某某"以及此人的信息；最下一行是这份证书内容的 SHA-1 哈希，用 CA 的私钥签名。任何人用 CA 的公钥就能核对证书没被改过（签名原理见 [14 数字签名](14-signatures-authentication-security.md#topic-1)）。
<!-- Sources: w11sec p.35 -->

### 公钥基础设施

![Slide 36 - Public key infrastructure](assets/13-cryptography/slide-36.png)

**公钥基础设施（Public Key Infrastructure，PKI）** 由层次化的证书颁发机构组成，组件包括用户、CA、证书和目录。看图中的树：根（Root）为区域机构 RA 1、RA 2 签发证书，RA 再为下面的 CA 签发证书；右侧虚线连着的方框就是证书内容，例如"RA 2 is approved, its public key is …, Root's signature"。验证 CA 5 的证书时，沿链向上：CA 5 的证书由 RA 2 签名，RA 2 的证书由根签名，而根的公钥预先装在浏览器中，于是信任可以一路传递下来。
<!-- Sources: w11sec p.36 -->

## 本讲自测

1. 一个密钥长 64 位的算法，密钥空间是多少？是 DES 的多少倍？
2. 同一个明文块在一个文件中出现了很多次。用 ECB 和 CBC 加密，攻击者分别能看出什么？
3. 用讲义的 RSA 密钥 $(3,33)$ 加密字母 B（第 2 个字母），并用 $(7,33)$ 解密验证。
4. 两条消息误用同一对（密钥，IV）以计数器模式加密。攻击者拿到两段密文后能得到什么？如果他还知道其中一条的明文呢？
5. 为什么 RSA 常被用来传送对称密钥，而不是直接加密整个文件？
