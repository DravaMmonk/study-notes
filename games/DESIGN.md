# 类图灵完备游戏设计手册

这份手册适用于建在共享 kit（`games/kit`）上的所有游戏，包括已有的《视觉完备》《状态之图》《证明完毕》《句法之图》，以及以后的新游戏。各游戏自己的设计文档（例如 `games/vision-complete/DESIGN.md`）记录本专题的内容；本手册定下它们共同遵守的结构、规则，以及引擎替作者做的检查。

**目标**：引擎和视图做好以后，作者只需填入一个专题的教学内容，学习者就能用《图灵完备》的方式学会它：从少量能力起步，用预设承载固定计算，亲手设计有实现选择的组合，逐层建立可复用的机器。

对《图灵完备》本身关卡手法的研究，见《视觉完备》设计文档的第 1 节。

---

## 1. 原则

1. **只从一个或几个元件起步。** 起点尽可能小，但组合起来足以达成全部目标。起点越少，学习者越能感到"一切都由我从这里造出"。
2. **造出来就能一直用。** 需要保存玩家实现的组装元件，在完成构建后才解锁；后续运行的就是通过规格的电路。固定计算采用代码预设，按任务引入。两种元件都要说明输入、输出和约定。
3. **逐层抽象，每层一个新概念。** 从元件到最终系统分成若干层，每层只引入一个新概念。每层的产物必须在后面被真实使用，不设孤立关卡。层与层之间要有明显的视角跃迁时刻。
4. **用规格定义目标，而不是给解法。** 目标以输入输出要求、样例或测试集给出，不规定实现路径。满足规格的任何方案都算对。失败时展示具体的反例，让调试本身成为学习。
5. **按实现选择决定元件形式。** 只有多种可通过规格、且实现方式有实质差异（会影响复杂度或运行效率）的元件，才作为运行玩家电路的组装元件。固定流程或只有接线排列差异的操作直接提供代码预设；教学任务可以拆解其原理，但不因此保存成可复用的玩家实现。
6. **把关键设计权交给学习者。** 在某些层只给接口约定，内部完全由学习者决定；这个决定的后果在后面的层里显现。

**Interface density.** Let layout and controls establish context before adding labels or descriptions. Name data
once; avoid generic reading labels and repeated metadata. Keep the working surface primary, use direct selection
for sibling results, and disclose supporting inputs or explanations on demand. Preserve readable values and usable
touch targets when reducing space. Component names and selected settings must remain readable in both languages:
reserve a title row separate from card actions, wrap long names, and place long-choice controls below their labels.
Use concise domain wording rather than truncating distinguishing terms. Preset circuit positions are only initial anchors:
once cards are measured, separate overlapping siblings using their actual dimensions and a wiring gap. Recheck when
previews or settings change card sizes; do not repack a board merely because the player dragged a card. Layout-only
adjustments preserve connections, settings and the current run.

**玩的过程就是学的过程。** 这一条压过下面所有的规矩。玩家拼一块板、转一个旋钮、判一句话，做的每一步都应当是在弄懂本领域的一样东西；通关时他学会的，是能用本领域的话讲出来的知识，不是这款游戏的操作。所以：

- **主线只讲讲义的理论，技术内容全部放到主线外。** 主线（地基关和练习关）的骨架是讲义（lecture）讲的理论：概念、模型、方法和它们之间的关系（针孔投影、景深、最近邻和双线性插值、语义分割和实例分割的区别）。主线上不放任何技术内容：库和工具的做法（OpenCV 按 BGR 读图、`uint8` 存像素、函数叫什么）、文件格式、实验课（workshop）的操作步骤——不做成任务，不写进引言、点题，也不链接它们的词条。它们只出现在可选的拓展专题里：挂在它要用到的那块理论之后，或挂在这一章主线最后一关之后（第 2.4 节的专题，`after`）。判断时问：讲义讲它是在讲原理，还是在讲某个工具怎么用？
- **关卡花在难的地方，不是把知识点覆盖一遍。** 《图灵完备》的价值在于把一个复杂的知识体系拆开，从简单直白的东西当基础元件，一层层抽象上去，最后让学习者看懂复杂、困难的核心（那张复杂的电路图）。所以排关之前先给知识点定位：它是这一章的**核心**吗（讲义花力气讲、后面的章建在它上面、学生容易错）？它**难**在哪（抽象、离日常远、名词难懂），还是一句话就懂？它由哪些更浅的知识点**搭成**？一句话就懂、符合直觉的点（「不同的视觉任务交出不同形式的答案」）没有值得练的东西，人不会被它难住：它只在引言、总结或词条里提到，不做成关。离生活远、抽象难懂的点要拆碎，从更底层、更浅显的原点开始，用一个系列的关一步步逼近；一章的关卡大多应当在通往这一章核心的阶梯上。
- **每关教本领域的一个知识点。** 知识点是课程材料里的一个概念、方法、约定或事实（最近邻插值、针孔投影、景深），有本领域的名字和出处（哪份讲义、哪一节）。原始元件、运算、旋钮、题型是工具，不是知识点（玩家搭出的元件倒可以就是一个知识点：裁剪、最近邻插值）：「常数」「向下取整」「取较大值」不单独成关，它们跟着第一次需要它们的知识点进来（几块元件同属一个知识点时，课程的 `concept` 把它们算成一个新东西）。
- **每关是一个问题，玩的过程是回答它的思维链。** 问题用本领域的话问（「放大一张图时，新像素的值从哪里来？」），不是一句操作说明。玩家从问题走到答案要经过几步：试什么、看到什么、因此想到什么；每一步都落在屏幕上能做、能看到的东西上（一个任务、一条测试、一次反馈、一个反例）。只有一步的关多半不是一关，而是别的关里的一个任务或一条测试。
- **答案依赖所给的东西。** 玩家必须读图、读数据、看反馈才能答对。光看题面的措辞、把题目和选项的字对上、按选项的排列猜、或者把滑块拖到读数变绿就能过的关，什么也没教。
- **先做成，再命名。** 引言不先讲术语的定义；玩家做成以后，过关时用本领域的术语说出他刚做成的是什么，链接到百科词条。词条用本领域的话下定义、注明出处，并说清它和相邻概念的区别。学完一章，玩家能用术语把这一章讲一遍。
- **关卡数跟着难度走。** 目的是深入：难的知识点拆到最浅的原点，从原点起一步一关；一个知识点的每个侧面（一个约定、一个边界、一种失效、一个易混的近亲）都练到。但一关没有自己的知识点、也没有一个新侧面，就是凑数，删掉；只换数字的变化写成测试或同一关里的任务，不单独成关。不设关数上限，也不为满足检查补关：检查报出「练得不够」时，补的是新的侧面，不是新的关。

下面几条是在各款游戏里落实这五条原则的规矩。

**Construction-led visual learning.**

For a construction-led computer-vision course, plan machine -> capabilities -> parts -> construction and reuse,
then audit how much lecture knowledge these activities cover. Source knowledge constrains the meaning and scope;
it does not require lecture order, one gate per concept, or an optics preface before image processing. First try
to cover a point in construction, application, debugging, a constraint or an upgrade. Only important residual
knowledge that cannot be meaningfully carried by that path receives an additional lesson.

Supply arithmetic evaluation, index/rounding helpers, traversal, repeated layout and other execution support.
Preserve the learner's field-relevant decomposition. A complete sampler, Gaussian/Sobel filter, attention block,
matcher or evaluator is an earned abstraction when constructing that method is the course's purpose. Giving it
first and grading its mode setting is not an equivalent shortcut. Prerequisite formulas and worked examples are
legitimate support, but the task must retain a meaningful construction beyond transcription.

A numeric exercise with automatic fill has no assessment value without another learner decision. Use computed
values as evidence inside construction and debugging. Keep physical-model experiments for knowledge the circuit
path cannot expose, and place them after their actual prerequisites. Camera projection can support a later
geometry machine without blocking the opening image processor.

**Task-scoped introductions.** A level may introduce tools in individual tasks. Its aggregate inventory is the
union for map/audit purposes; the current tray, fresh markers and component-book access follow the stable task
keys and only preceding/current task introductions. A future tool must not leak through a folded tray or an
already saved board. Setting choices that need explanation follow the same prerequisite discipline.

**封装与跨章：**

- **封装件跑的是学习者自己的电路。** 和《图灵完备》的元件工坊一样，一个元件由学习者亲手搭出才解锁，解锁后运行的就是他通过搭建关时的那块电路（外壳在通关时记下它，`progress.built`，一关几段任务的每段记一块；关卡的 `keeps` 说哪些关要记，默认是搭出元件的关；没记下板的，比如「全部解锁」开着却没通过的关、通过时还没记板的旧存档，用参考解），而不是一个一步出结果的内置函数。所以运行时能步进到元件里面：每一步写明它在哪块元件里（`auto › 拆目标 · 第 3 步 › 用规则`），打开元件的详情（手机上点开它）就看到那块电路里每个元件此刻的值。元件里面的东西改不了，要改就回到搭它的那一关（升级过的元件：它现在指向的那一关）重新通过，通过后的电路替换旧的。元件上的设置原样传给里面有同一个设置的元件（化简上的「改哪里」传给里面的每一张改写）；电路里接死的一个选择要做成元件的参数时（规则对已知用哪条规则），搭建关把它做成板上的一个输入（「规则」输入元件），学习者把它接进去，搭出的电路就带着这个口。
- **一个元件可以一关一关升级。** 同一个元件可以由一串关卡接着搭（每关都写 `builds` 同一个元件，按课程先后排成一条升级链；链上后一关以前一关为先修，跨章也一样，审计 `upgrade-order`）：第一关搭出它，之后每一关是一次升级。升级关打开时，板上就是这个元件此刻跑的那块电路（链上在它之前、学习者最后通过的那一关的电路，没通过就用那一关的参考解），学习者直接在上面改；通过后，元件改为跑这一关的电路，「编辑」也跳到这一关。关卡树上只有搭出它的第一关在连线上标出这个元件，升级关不再标。升级关自己的托盘里没有它正在升级的这个元件。一关用到这个元件时，跑的是链上在它之前的那一段里学习者最后通过的电路。
- **同一章（代）里，解锁的元件之后每一关都能用；跨章（代）时，由新的一章决定带走什么。用不着的折叠起来。** 这是硬性规则，关卡规格不写可用元件：一个元件出现或被搭出后，这一章里它之后的每一关都能用，除非被升级或合并取代（比如《视觉完备》第 1 章起，相加、相减、相乘合并成「四则运算」；在课程里用 `replaces` 声明）。这样一章之内的关卡设计有统一的前提，玩家也知道手里的东西一直算数。每一章（第一章除外）必须在它的 era 上写明 `keeps`，审计 `era-keeps` 会检查：
  - **延续**（`keeps: 'all'`）：新的一章是上一章的机器继续扩展或升级，让它能做更多事（《状态之图》每一代机器人都是上一台的升级；《视觉完备》第 1–5 章从流水线长成会学的网络）。前面造出的元件全部带过来。
  - **换话题**（`keeps: [元件…]`）：新的一章大幅换了一个话题（《证明完毕》从真值电路到证明核：线上传的从真值变成定理；《视觉完备》第 6 章从网络转到几何，第 8 章转到潜空间生成）。只带列出的元件，`[]` 就是一个都不带，上一章造出的一批元件留在上一章。
  决定时问一句：新一章的机器，是不是上一章那台的延续？关卡规格只写这一关新带来的原始元件（`adds`）和要折叠哪些（`fold`）。为了不让玩家面对一长排元件不知所措，每关只展开它的谜题用得着的：这一关新带来的元件，加上参考解用到的那些（按概念算，同一概念的几个型号一起展开）。其余的折叠在「更多」后面，照样能放：之前关卡带过来、参考解用不着的，以及关卡用 `fold` 指定折叠的。规则在 `kit/course.js` 的 `reach` 和 `offer`，各款游戏共用。关卡树上，每关下面的连线上标着它新带来的原始元件和通过它会解锁什么，还没到时显示为锁定。元件箱里也有原始元件：从带来它的那一关打开时起算拿到。元件箱和地图一样按章分组，每章标题照地图写（「第 n 章 · 章名」），章里按拿到的先后排。
- **有的元件留在带来它的关里（`local`）。** 一个元件标成留在原地后，通关不会把它解锁给玩家，后面的关也不带它；哪一关要用，就在那一关再带来（`adds`，或摆在板上预置）。它照样是见过的元件，元件箱里有它，文案可以链接它；再带来时不算新元件。两种情况用它：很快被封装件取代、后面几乎不再用的中间件（《证明完毕》的「归结一圈」，搭出饱和器以后就不再用）；只为一关的场景准备的元件（「别人的证明器」）。关卡自己给定的东西做成元件时（《证明完毕》机器板上，关卡的公理、数据类型的规则、定义的等式），也留在原地，而且不算新概念（课程的 `concept` 给 `null`）：它们和题目里的已知一样是题目的一部分，不标「新」，托盘只展开参考解用到的那几条。
- **不是每个专题都像造电脑。** 造电脑是一条链，每层都是下一层的零件。很多专题（比如动态规划）的"机器"其实很小，功夫在于用这台机器去解各种平行的问题。所以课程结构是"代际 + 专题"，而不是一条长链（见第 2 节）。

**练习与抽象链：**

- **一个新知识点后面要练它的各个侧面。** 专题越抽象，"会用"和"见过"之间的距离越远。知识点出现的那一关只是第一次接触；之后要练，练的是它前面没露出来的侧面（见 2.3 的维度表），由易到难，最后和已有的知识点组合，然后才引入下一个。一个侧面是一关；同一个侧面换几组数据是这一关的测试或任务。课程不能排成「一关一条定理」的清单：那样学习者通关的是一张定理表，练出的只是照着提示接线。
- **抽象链要连续：每个新东西有前因，每个造出的东西有后果。** 《图灵完备》的核心是"把过去学会的组合抽象成新元件，用在后面的谜题里"。所以：
  - 新元件或新能力不能凭空出现。在它出现之前，要有一关让学习者用现有的东西做到它，或撞上没有它就做不到的墙；它出现时，是把学习者已经做过的那件事收成一个元件（参照初号的演绎定理专题之于二号的假设框）。
  - 学习者造出的元件，后面的关要真的用到，而且要用在"不用它会很长"的地方，让学习者体会到抽象的价值。
  - 后面的题要逐渐依赖越来越高层的元件。如果后期的参考解仍然只用最早那批原始元件，就说明中间造出的东西没有进入抽象链。
  - 换代时，如果新一代延续上一代，上一代造出的东西要么带过去，要么在新机体上用新能力重新搭一遍（升级），不能就此作废；如果换了话题，就把用不着的一批留在上一代（`keeps` 列出带走的）。

**排章的四条硬规则**（每一章写完都要逐条对一遍；实例见第 11 节）：

- **不依赖的就分支。** 一串关不需要排在它前面那一串解锁的元件或讲过的概念，就不能排在它后面，而要和它并行（并行组），或挂在它真正需要的那一关之后。检查办法：对每个系列，写出它的关和参考解真正用到的东西出自哪几关；排在它前面、却不在这张单子上的系列，就是该分开的地方。一路可以很长（几个系列连成一路），并行组最多三路；放不下时，按依赖把最独立的一路挪到别处，而不是全部串成一条线。（例：《证明完毕》合一器造好以后，「倒着用规则」和「高阶模式」互不依赖；策略一章的「组合子」和「回溯」互不依赖，「搜索」和「按形状拆」又互不依赖。）
- **引言写的是组装，不是新元件说明书。** 《图灵完备》的精神是自下而上积累，一步步把一台大机器装起来。每一关的引言回答三件事：手上的机器（或上一关做到的事）在这里卡在哪里、缺什么；这一关补上的那一块是什么；它装在机器的哪个位置、和已经有的部分怎么接。「新元件 X：……」这句话只能出现在前面已经把需要它的理由说出来之后；只有一句「新元件 X 做什么」的引言就是偷懒。没有新元件的练习关，引言说出它和前一关差在哪个维度。每章第一关说这一章要给机器装上什么模块、上一章的机器为什么还不够。
- **元件形式由有意义的实现选择决定。** 先判断规格是否允许多种正确实现，再判断这些实现的算法、复杂度或运行效率是否有实质差异。只有两项都成立才设搭建关并保存玩家电路；仅有交换律、接线顺序、变量名或等价展开的差别不算。固定计算流程直接提供代码预设，在需要它的任务中说明输入、输出和约定。可以让玩家拆解或验证预设的数学原理，但这样的任务不写 `builds`。组装元件仍运行通过规格的玩家电路，参数在输入口显式暴露；预设元件只运行领域代码，不读取教学任务的存档板。新增或重构元件时，在专题设计中记录选择依据。

- **一个机制放在它被核心用到的地方，不放在最早能做出它的地方。** 能早证出来、早搭出来，不等于该早放：一个元件或定律离第一次真正用上它的关越远，学习者越记不住它为什么存在，中间那段也只是在攒用不上的东西。排章时对每个机制问一句「哪里第一次非它不可」，把它和那里放在一起，最好就是那里撞上的墙（《证明完毕》：排中律和反证法放在 auto 证不出排中律之后，德摩根放在化简器把否定推进去的那一章，证明项放在建在它上面的归纳类型和依赖类型之前）。一章里只是换一种眼光重看前面做过的东西时，同一个点的小任务并进同一关，只给真正新的动作单独成关。

---

## 2. 课程结构

```
课程
└── 第 1 代机体 …… 第 n 代机体（每一代 = 一个时代）
    ├── 主线（必修）
    │   ├── 地基关     教这一代的外部能力，每关解锁一个中层元件
    │   ├── 练习关     用这一代机体解的各种问题，按难度曲线排
    │   └── 并行组     主线分成几路系列，先后随意，全部通过才继续
    ├── 专题系列       可选；引入关 → 递进关 → 终极谜题，挂在它需要的那一关之后
    └── 挑战关         可选；挂在它需要的那一关之后，在既定机制上探能力边界
```

整个时代是一棵**关卡树**（参照《图灵完备》的关卡树）：

- **主线**按顺序开放。主线上可以有**并行组**：主线在这里分成几路，每一路是一个小系列（路内按顺序）；几路的先后随意，全部通过后才汇回主线继续。适合"几个机制各自单独练，再合起来用"的地方。
- **专题和挑战是支线**，可选，不是任何必修关的先修。它们挂在**刚好具备前置**的那一关之后（`after`）：一串题只要某几关的元件和知识就能做，就直接挂在那一关后面，不必排到时代最后。不写 `after` 时挂在主线末尾。
- **下一代机体在本代主线走完后开放**，与支线做没做完无关。

**哪些关能并行，按元件依赖判断**：一关用到的元件，搭出它的关必须是它的先修；互不依赖的几串关才排成并行组。概念上的依赖也算：引言里接着某一关往下讲（"在<那一关的链接>里，机器替你找出了反例"），这两关就只能前后排。

**"学习者此时见过什么"按先修关系算，不按游玩顺序算。** 有了并行组和支线，地图上的排列只是一种展开方式，学习者可能先走另一路。所以凡是"这一关之前学习者有什么"的判断，都取这一关先修关系的全部祖先（`requires` 一路往上），不取扁平顺序里排在它前面的关：
- 托盘里元件的"新"标记、画法（地形、频谱……）是否已解锁；
- "全部解锁"模式下给这一关的开关和选项；
- 文案里引述的关卡（必须是先修）和"又是一个""新元件"这类说法（见第 4 节）。

专题的关沿用上一关的电路（专题是同一个问题在长大）；主线上一关若是在前一关的电路上升级（比如两路汇合 → 认出起点），也可以写明 `carry: '<那一关>'`，从玩家在那一关留下的电路开始，那一关必须是它的先修（审计 `carry-unseen`）。其余主线的系列和并行组，每关从空板开始。

**存档按任务记。** 外壳存下的（`kit/shell/progress.js`，浏览器里 `<游戏 id>.v2`）分两层：关卡层面的是通过的关（`solved`，一关通过了就一直算通过，后来多了任务也不收回）、得分（`best`）；谜题层面的全部按**任务 key** 记：每个任务的板和它的几块存档（`data`、`slots`）、通过了哪些任务（`passed`）、元件跑的那块板（`built`）。任务 key 就是任务的 id（第 4 节），每个领域的关都是一串任务、每个任务都必须有 id（契约检查）；只有一个任务的关，任务 id 通常就是关的 id。所以任务在关内换位置、插进新任务、挪进别的关、几关合成一关，存下的都跟着任务走。

**开发阶段不迁移存档。** 存档记着它是在哪一版谜题上存的（`stamp`，`kit/engine/stamp.js`：每一关、每个任务谜题区和测试区字段的哈希，连同它们的 id，字段里的文字不算，再加上 `parts.json`）。页面打开时内容的 stamp 和存档的不一样，这款游戏的存档就不读，玩家从空白开始。改文字、参考答案、起始板、课程顺序不改 stamp，存档都留着；改了一关的谜题、测试、端口，或任何元件，整款游戏的存档清空。

数据写法（`games/kit/course.js` 的 `layout(eras)`）：

```js
{
  id: 2,
  foundation: ['2-1', '2-2', { parallel: [{ id: 'probe', title, levels: ['2-3', '2-4', '2-5'] }] }, '2-6'],
  challenges: [{ level: '2-12', after: '2-10' }],
  topics: [{ id: 'thumbnails', levels: ['2-13', '2-14'], after: '2-11' }],
}
```

`parallel` 里只有一路时，就是一个带标题的系列。

### 2.1 机体与时代

**机体**是学习者编程的那台机器，它有一组固定的**外部能力**：能感知什么、能伸到哪里、能在哪些格子上工作。在《状态之图》里机体是机器人（视野、伸缩臂、扫描臂、分层），在《视觉完备》里是相机和流水线，在《图灵完备》里是计算机。

**一代机体就是一个时代。** 换一代，就更新、增加或增强一些外部能力。新机制只在需要它的那一代出现，不在开头就一次性摆出来。时代顺序同时是故事线（机体升级）和知识线（新机制）。

也可以只有一台机体：每一章给它装上一个模块（《证明完毕》：玩家自己的证明器）。这时各章的 era 写同一个 `machine`，但每一章照样要写 `keeps`：延续上一章的写 `'all'`，换了话题的列出带走的元件。

元件在一章之内一直能用；跨章带不带，看新一章的 `keeps`。专属某种外部能力的输入（比如只有带手臂的机器人才有的臂格），只在有这种能力的机体上出现。

**机体要写明自己会什么。** 每台机体列出它的能力（看多远、能不能换扫描顺序、有没有手臂……）；审计从每关的参考解读出它用到的机制，机体必须都会。最早的机体要刻意做得窄：它不会的东西，就是后面几代存在的理由。

**哪些关由本代机体来做。** 地基、练习、专题的终极谜题和挑战，都由本代机体来做，这样每一代的关都在展示这台机体；只有专题的引入和过渡关可以借用更早的机体（它们是终极谜题的简化版，有时用不上新能力）。

### 2.2 地基关

地基关是这一代机体的教程：

- 展示并教会它的**外部能力**（新传感器、新视野、新手臂……）；
- 每关解锁一个它能用的**中层元件**，而且这个元件必须由学习者在这一关亲手搭出；
- 线性推进，每关只新增一个能力或一个元件。

**概念靠发现，不靠照着公式接线。** 把公式写在说明里、让学习者用元件拼出来，练到的只是抄写。一个量有几个参数时，做成机关台：每一步只开一个旋钮，让学习者把自己的曲线和目标叠在一起，看清每个参数管什么（《视觉完备》的「一道波」）。真正值得学习者亲手搭的，是"知道要什么、但不知道怎么接"的电路。

**难的机制拆开引入。** 一关里同时出现两个新想法，后一关就会难到劝退（《视觉完备》第一版的频率探针）。把每个难点单独做成一关引入，排成带名字的系列（乘了再平均 → 错开的波 → 频率探针），最后一关再把它们合起来。一个新主题的第二关不能比第一关难一大截。

一代机体可用的东西有三种来源：固定的外部能力（随机体给出，靠地基关教会）、基础元件（课程起点的原始元件，或前几代解锁的）、需要特定地基关搭出才解锁的中层元件。

### 2.3 练习关

练习关是这一代机体能解的各种问题，彼此独立，按难度曲线排成一条线：从刚学完地基就能做的，到需要把几个机制组合起来的。练习关不要求"同一个问题在长大"；那是专题系列的事。

**地基和练习交替，不要先把机制全摆完再练。** 每个新知识点后面紧跟它自己的练习（可以做成主线上的系列或并行组）。一关练习露出这个知识点的一个新侧面（蓝图里 slot 的 `facet`：一个约定、一个边界、一种失效、一个易混的近亲），按下面几个维度变化，每关只动一个维度。只换素材、换数字的变化不算维度：它们是同一关的测试或任务。练习有几关由侧面有几个决定，不凑数：

| 维度 | 做法 | 例子（《证明完毕》的假设框） |
|---|---|---|
| 换方向 | 正着用 ↔ 倒着用，从已知出发 ↔ 从目标倒推 | 由 A→B 推出东西 ↔ 要证出 A→B |
| 加层数 | 嵌套、重复、更长的链 | 框套框：A→(B→A) |
| 去支架 | 少给提示、少给已知，或多给干扰项 | 已知里混入用不着的前提 |
| 组合 | 和之前的机制一起用 | 框里用分离，框里拆 ∧ |
| 辨真伪 | 一个看起来能做、其实做不到的目标，看反例 | 证 (A→B)→(B→A)，反模型面板画出那一行 |

一组练习的最后一关应当是"组合"或"辨真伪"，它是这一组的小毕业。难度曲线看的是整个时代：前半段每组都很短、很直白，后半段的组更少、但每关跨更多机制。

### 2.4 专题系列

专题系列让学习者用这一代机体（加上已解锁的元件）做一项完整的应用，并以一道**终极谜题**收尾。专题是可选支线，挂在它需要的那一关之后。**一章（代）可以有零个到多个专题**，不必每章都有：只有有意义的业务问题（一项真实的应用，比如图里的缝、拼写纠错），或者值得长线拓展的方向，才做成专题，各自挂在自己的位置。为了凑数而设的专题，宁可不要；一个机制本身的概念，放进主线的地基关去讲（《证明完毕》的演绎定理，就放在假设框一章的第一关里讲，不另设专题）。

**设计时从终极谜题倒推：**

1. 先定终极谜题：这个专题的大问题、它的世界、它的测试数据。
2. 拆出它依赖的机制。
3. 每一关都是终极谜题"去掉若干机制"的版本，或者其中一个机制单独实现。关卡的顺序就是把机制一个个加回去。

| 位置 | 是什么 | 产出 |
|---|---|---|
| 引入关 | 终极谜题的简化版（规模小、约束少），或者复杂系统里一个核心机制的单独实现 | 往往就是后面要复用的那个元件 |
| 递进关 | 每关加回一个机制或一个维度 | 有时是一个中间元件 |
| 终极谜题 | 完整的问题 | 专题的求解器：整个流程（比如整张表）封装成的一个元件 |

**不设单独讲故事的动机关。** 专题的第一关就是终极谜题的引入版，所以一个专题从头到尾是同一个问题在长大，学习者始终知道自己在往哪里走。

**专题内保持一致：** 同一个世界（或同一族世界）、相同的输入输出接口，只是数据规模和约束不同。

专题互相独立，可以任选顺序。一个专题可以接着更早一章的专题往下讲（《证明完毕》的岛民：真值电路一章的谜题 → 连接词一章的骑士与无赖 → 归结一章的岛民变多），这时把前一个专题的最后一关也写进 `after`：它是先修，地图仍把专题挂在本章那一关下面。主线不能依赖专题搭出的元件（专题是可选的）。确实要借用另一个专题的求解器时（比如拼写纠错要用编辑距离），写成明确的先修关系，借用方也只能是可选的。

### 2.5 挑战关

挑战关在既定机制上展现机体的能力边界，可以跳过：

- **只用已出现的机制**：元件、传感器、世界都不超出它挂靠位置之前已解锁的范围。挑战的是理解，不是新知识。
- **难在跳跃，而不是繁琐**：关键是一个"啊哈"，比如换个角度看表、把两件事塞进一格、换一个计算方向。拼几十个元件那种难不算。
- **可跳过**：不是任何必修关的先修。它若产出元件，这个元件后面也只能是可选的。
- **规格更严**：参考解必须通过；"直觉上的简单解法"（naive 解）必须失败；再加隐藏测试防止凑巧过关。
- **提示更少，反例照给。** 通关后的点题讲清那个跳跃。

两类挑战：

- **新题型挑战**：全新规格，只用已有元件，靠对机制更深的理解解出。
- **约束挑战**：拿一道已有的关，加更紧的预算（元件数、读取次数、表的大小）。普通解法能过关，想达到预算就得更深入。这一类需要代价度量（第 6 节）。

地图把关卡画成按钮节点组成的树（`kit/shell/LevelMap.jsx` 的 `LevelTree`），规则是：
- 居中排列；几个关卡并排时整组居中。
- 同一系列、专题或挑战的关卡始终在同一列。
- 整棵树最多三列，每行最多三关。并行分支组（`branches`）一组最多三条；更多的拆成先后两组。
- 可选支线不必另开一列往外挂：它从挂靠关下一行起，找已有三列里第一段空着的行放进去（必要时整串往下移），宁可往下也不加宽。
- 可选支线用虚线，在三列之内优先放离挂靠关最近的一侧，左右平衡。一条支线若接着正上方的另一条支线往下走（同一系列，只有它从那里接下去），就留在那条支线的列里，连成一串。虚线只从紧挨在它上一行的先修关连过来；不排在一起的先修关（隔了几行，或在别的支线上）不画线，免得长虚线绕过半张图。
- 并排的关按编号从左到右排：并行组的各路按第一关的编号排，可选支线按编号依次放，和并排的同系列关比，编号大的放右边，两条支线站反了就对调（放得下时）。主线的编号也照这个来：并行组按行编号（`kit/course.js` 的 `numbered`：先编每一路更靠上的关，同一行按各路写下的顺序），所以每一行都从左到右递增。
- 地图上不写"专题""挑战""可选"之类的标签和小标题，虚线已经说明。
- 专题的关用字母加序号编号（`code`）。一个字母代表一个系列：专题之间有依赖（一个专题挂在另一个专题的关后面，`after`）就是同一个系列，用同一个字母，跨章也一样，序号接着数（《证明完毕》的消去规则生成器 E1–E4 分在三章）；不相干的系列用不同的字母。审计 `topic-code` 检查。
- 关卡按钮分两种尺寸（`kit/course.js` 的 `isCore`）。里程碑画成原尺寸：每台机体的第一关、带来新概念或解锁元件的关、挑战关、专题的终极谜题；其余画小一号：新机制之后的练习关、专题的引入关和递进关。小按钮居中放在同样的格子里，版面不变。两种尺寸的按钮右侧都有关卡类型的图标，通关后换成这一关的成绩（步数等）。
- 排得紧：一关只往下排到必须的位置（它的来路和同一列上面那关的下方，再避开横穿它这一列的连线拐弯），同一行的关不必对齐；连线上没有标签时，两关之间只留一小段线。
- 点一个还锁着的关，它和所有还要先通过的关一起高亮（跨章也算），并列出现在就能做的那几关，点一下直接去。
- 每关下面的连线上标出它带来的东西：这一关新带来的原始元件（这一关打开后显示名字，`introductions`），和通过它解锁的元件（通过后显示名字）。

挂靠位置（`after`）也要考虑版面：一串支线挂在已经排满的位置，会被挤到下面，连线还会穿过别的关卡；这时换一个同样具备前置的挂靠关。

### 2.6 时代之间

不另设过渡关。上一代的挑战关本来就在探能力边界，学习者在那里撞上"做不到"。新一代第一关的引言里提一句"上一台为什么不够"，再配上机体升级的展示，就是这一次的视角跃迁。

---

## 3. 基本元素和引擎里的对应

| 元素 | 含义 | 在引擎里 |
|---|---|---|
| 传感器 | 关卡给电路的一个有名字的值：一张测试图、机器人看到的一格、脚下格子的一条信息 | `kit/circuit/sensors.js` 的统一形状 `{ id, label, short?, type, family?, named? }` |
| 输入元件 | 电路板上固定的输入，按传感器的种类分（《状态之图》：视野、本格信息），不能放也不能删。元件一开始没有输出口；学习者点一个传感器（在元件上，或在输入窗口里），元件就多一个读它的输出口，再点一下就去掉 | `domains/table/model/parts.js` 的输入元件（读到的传感器存在 `params.picks`）；kit 的 `parts.outputs` 支持一个元件多个输出 |
| 原始元件 | 课程起点，内部不在本专题关心的范围 | 课程声明的 `primitives`（`games/kit/course.js`） |
| 中层元件 / 封装件 | 学习者搭出、解锁后当一个元件用，打开能看里面 | 由一关搭出（`needs` / `builds`）；`kit/engine/boards.js` 的 `packed` 把通关时记下的电路当一个元件跑 |
| 规格 | 传感器、输出、测试、隐藏测试 | 各游戏的关卡数据（数据游戏：`levels/<id>.json`，字段由领域的词汇表给出 schema） |
| 参考解 / naive 解 | 证明规格可解 / 证明直觉解法不够 | 数据游戏写成蓝图文本；`npm run check` 运行它们（各领域的 `validate`） |
| 反例 | 失败时具体的那组输入、期望、实际，以及第一处偏离 | 各游戏的失败面板（《状态之图》能定位到第一格算错） |
| 代价 | 元件数、求值步数、读取次数、表的大小 | `kit/engine/tests.js` 的 `score` 钩子；《视觉完备》算计算量 |
| 世界 | 机体工作的地方：一张图、一张表、一排房子 | `domains/table/model/worlds/`；《视觉完备》测试数据 |
| 词汇表 | 内容能引用的全部项：元件、世界、机体、玩法、引言图、诊断条件…… | `domains/<领域>/vocabulary.js`（`kit/engine/vocabulary.js` 的 `defineVocabulary`） |

---

## 4. 一关怎么写

### 4.1 一关的知识契约

动手写一关之前，先写清它教什么、玩家怎样想到。课程蓝图里每个 slot 都带着这几样（`kit/pipeline/blueprint.js`），关卡和文案照着它写，评审拿它核对：

- **知识点**（`teaches`，指向蓝图的 `knowledge`）：它有多难（`difficulty`：`intuitive` 一句话就懂，只在文案和词条里提到——slot 的 `mentions`；`learnable` 要一个例子或一关练习；`hard` 抽象、离日常远，要从更浅的点起一串关逼近）、是不是这一章的核心（`core`）、由哪些更浅的知识点搭成（`depends`），本领域的术语（`term`，课程材料里的叫法）、它说的是什么（`about`）、出处（`source`：讲义、章节、页或幻灯片）、不懂它就答不上的问题（`wall`）、它纠正的直觉错误（`misconception`）、它是讲义的理论还是技术内容（`basis`：`lecture` / `technical`）。主线上的关只带来、只用讲义的理论；技术内容的知识点由可选的拓展专题带来。练习关不带新知识点，写它露出的新侧面（`facet`）。
- **问题**（`question`）：玩家玩这一关是在回答什么，用本领域的话问。引言的落点就是这个问题。
- **思维链**（`chain`）：玩家从问题走到答案的几步，一步一句：试了什么、看到什么、因此想到什么。每一步要在屏幕上有落点：一个任务、一条测试、一次反馈、一个反例、一个能转的旋钮。写不出两步的，多半不是一关。
- **误解和反例**：知识点要纠正的那个直觉错误，就是这一关的 naive 答案；测试里要有一条让它失败，失败时的反馈说出它错在哪（不是「没有达到目标」）。
- **命名**：过关时用 `term` 说出玩家刚做成的东西，链接它的词条（`<wiki-ref to="知识点 id">`，词条 id 就是知识点 id，在这一关打开）。

**几种做不出学习的关**（审查时一条条对；能机械看出的已经是检查，第 5 节、第 7.2 节）：

- **工具关**：一关的全部内容是认识一块元件或一个运算（「取较大值」「向下取整」），和本领域的知识没有关系。元件跟着需要它的知识点进来。
- **练一个人人都懂的点**：一关训练的是一句话就懂的道理（「问在哪里，答案要带位置」），玩家照着常识就能答对，什么也没学到。这样的点写进引言、总结或词条（`bp-trivial`）。
- **一步跳到难点**：抽象的核心知识（景深、透视投影、反问题）在一关里直接出现，前面没有铺垫它依赖的更浅的东西（`bp-shallow`）。
- **技术内容上了主线**：主线上的一关讲的是某个库或工具的做法（OpenCV 的通道顺序、`uint8` 换算），或者在引言、点题里顺带提它、链接它的词条。挪到可选的拓展专题里（`bp-main-tech`、`bp-main-link`）。
- **重复关**：参考解和别的关是同一块板，或者题面、提示、引言一字不差地出现在别的关（`pd-repeat-board`、`pd-repeat-text`）。
- **不看材料的判断题**：答案只取决于题面措辞，题目和选项的字面一一对上（「框出它的位置」对「一个位置框」），选项标签直接说出区别，或者每轮的正确选项排在同样的位置。题目要让玩家去看图、看数据、看场景才答得出：选项用中性的名字，区别藏在材料里。
- **纯答题**：一个任务只让玩家从几个选项里点一个答案，没有搭、没有试、没有算（`pd-quiz`）。它要教的东西写进引言和点题；要练的，换成动手的任务：在实验台上造一个反例、手算一格、接一块电路。判断一张图能说明什么，就让玩家亲手另造一个拍出同一张图的场景。
- **拖到变绿的实验台**：只有一个旋钮能动、目标的读数实时显示，玩家把旋钮拖到读数变绿就过（`pd-slide`）。实验台要让玩家先想再试：开两个以上互相牵制的旋钮（像高够了却太暗）、先写下预测再看结果、或者只在提交时判定（`check: 'submit'`，第 6.4 节）。
- **只有一步的关**：思维链只有「照题面做」一步。并进相邻的关当一个任务，或者把它做成那一关的测试。
- **术语缺席**：一关做完，玩家说不出它在本领域叫什么。

### 4.2 示范：同一个知识点，一关教得会，一关教不会

知识点：**最近邻插值**（nearest-neighbour interpolation；COMP90086 第 2 讲「重采样」：放大或缩小时，每个新像素复制原图里离它最近的那个像素的值）。它回答的问题：放大一张图时，新多出来的像素的值从哪里来？它纠正的直觉错误：新位置的下标就是原图的下标（或者一律向下取整）。

**教不会的一关**（《视觉实验室》第一版的写法）：引言「新位置不一定落在旧像素上。先尝试从最近的像素取值。」——方法已经在引言里说完；目标把首尾对齐、只有一个位置取中心、等距取较大坐标三条约定全写出来；托盘里正好是公式要的那几块元件。玩家做的是把一句话翻译成元件，通关时说不出这叫什么；此前还有五关分别认识「常数」「乘」「除」「取整」「比较」，每关都和图像无关。

**教得会的一关**：

- 问题（引言的落点）：「流水线要把 2 格宽的一行放大成 3 格。新的中间那一格在原图里没有对应的像素：它该是多少？」引言先说情境（缩放和裁剪不同：裁剪只取已有的像素，缩放要给新位置算出值），再说手里有什么（坐标网格、取像素），最后说怎样算对（三组测试里的输出图）。
- 思维链，每一步落在屏幕上：
  1. 第一个任务是一张格子题：在 `[0, 1]` 放大到 3 格的格子上，写出三个新位置在原图里的坐标（0、0.5、1）。玩家第一次看到「新位置落在两个旧像素之间」。
  2. 第二个任务是电路：先照直觉把新下标当成原下标去取像素，测试 1 的输出出错，反馈画出新旧两排格子的对应（naive 解就是这个直觉）。
  3. 玩家改成按比例映射坐标，再取整去读像素；`[0, 1] → 3` 的测试在中间那格卡住：0.5 离两边一样远，取哪一边？测试说按约定取较大的坐标，玩家补上「加 0.5 再向下取整」。
  4. 隐藏测试里有缩小（4 → 1，取中心）和彩色图，确认这块电路对每种尺寸都成立。
- 新元件（取整、比较）在第 3 步第一次需要时才出现，是这一关的工具，不各占一关。
- 过关点题：「你搭出的是<wiki-ref to="nearest-neighbour">最近邻插值</wiki-ref>：每个新像素照抄离它最近的旧像素，所以放大后能看到一块块的方格。下一种做法会让新像素介于两边之间。」——前一句命名并说它在本领域里是什么，没有复述接法；后一句不该写（往后透露），删掉。
- 词条 `nearest-neighbour`：标题「最近邻插值」，正文用讲义的话下定义，注出第 2 讲，说清它和双线性插值、和裁剪的区别。OpenCV 里它叫什么、默认怎样对齐，是技术内容，放进主线后的拓展专题，不写在这里。

两关用的元件差不多，差别在于：教得会的那一关里，玩家自己撞上了「新位置落在旧像素之间」和「一样远时取哪边」两堵墙，每一步都是测试或反馈逼出来的，通关时手里有一个名字。

**拆一个难点：景深。** 「景深」是第 2 讲的核心之一，名词抽象、离日常远：直接给玩家一个光圈旋钮和一条模糊曲线，他只能拖到变绿。它由更浅的东西搭成，从原点排起，一关一步：

1. **一个点成一个点**（针孔，`learnable`）：针孔相机里，每个物点在像平面上只落一个点，所以远近都清楚，但很暗。
2. **孔开大，点变成斑**（模糊圈，`learnable`）：把孔开大，像更亮，可每个物点落成一块斑，斑越大越糊。玩家自己看到「亮」和「清楚」在这里互相牵制。
3. **透镜把斑收回一个点，但只对一个距离**（对焦，`learnable`）：加上透镜，某一个距离上的物点又收成一个点；别的距离仍是斑。
4. **斑多小算清楚**（容许模糊圈，`learnable`）：斑小到一定程度，眼睛（或传感器的一个像素）分不出来，就算清楚。
5. **景深**（`hard`、`core`）：在对焦距离前后，斑都还小于那个门槛的一段距离；光圈越小，斑长得越慢，这段越长。到这一关，玩家已经亲手经历过前面每一样，景深只是把它们放在一起看。

「相机有光圈、能调焦」这样一说就懂的事不单独成关，写在第 1 步的引言里。前 4 步每一步都只多一样东西，都能在台上动手试；第 5 步是这一串的毕业关。

每关只写规格，不写解法：

- **目标**：一两句话。
- **传感器和输出**：读什么，写什么。
- **测试**：小规模的可以穷举；大的用有代表性的例子，覆盖边界；再加隐藏测试。
- **参考解**：必须通过。挑战关另带一个 naive 解，必须失败。
- **新元件和折叠**：不写可用元件（之前出现或搭出的元件自动带过来）；只写这一关新带来的原始元件（`adds`），以及参考解用不着、又容易干扰思路、要折叠起来的元件（`fold`）。
- **预置**（可选）：板上一开始就摆好的元件，或拼好的一段电路（`preset`，取参考解里的几个元件：它们之间、它们和关卡给的输入输出之间的线一起摆上）。玩家能挪动这些元件（只在它所在的区域里），不能删，也不能改这些线；预置元件空着的口由玩家接。元件上的设置默认由玩家改，每个预置元件可以单独固定它的设置：全部（`{ id, fixed: true }`），或其中几项（`fixed: [设置名]`），固定的设置在元件上只显示、不能改。用在一关的谜题围着一块现成的东西转的时候：别人给的证明器，摆在板上让玩家接上核去查它。
- **产出**（如果有）：通过后解锁的元件和它的接口（板上的输入就是它的输入口）。
- **提示**：逐级给出，第一级只指方向，不给接线。
- **过关点题**：用本领域的术语命名玩家刚做成的东西（链接词条），一两句说它在本领域里是什么、用在哪里；不复述接法（见下面的文字纪律）。
- **按电路图检验或修正**（可选的玩法，所有游戏都能用，和拼电路并列）：关卡不让玩家从空板拼起，而是给出几块电路（`play` 加 `boards: [{ label?, board }]`），每块就是一个测试案例，测试条上的标签就是它们，点一个标签，画布上就换成那一块；运行时逐块检验。标签用共用的 `TestTabs`，放在和拼电路关的测试一样的位置：桌面在测试条的头部，手机在界面顶部（滚动区之外）。两种：
  - **纠错**（`play: 'audit'`）：每块电路固定、不能改，各错在一处。玩家改的是这一关的一份配置（领域给出它的编辑器：《证明完毕》是一张检验条例表，写下手里有哪些证明、按需求该不该证得出），一块电路在这份配置上暴露出错误，这个测试就通过。配置本身要合需求（期望写错时停下并指出哪一条不符），所以不能靠乱填过关；配置越小越好。判定有三种（关卡的 `want`）：默认是**抓住**（至少一处和预期不符）；**相符**（`want: 'agree'`：每一处的结果都和预期相符，用来练「怎样检验一块对的电路」）；**全部暴露**（`want: 'expose'`：每一处都和预期不符）。配置可以事先摆好几条（《证明完毕》的 `slots: [条例]`），每条写明哪些格子已经填好、不能改（`fixed`），或者一格里哪几项必须留着、玩家还能再加（《证明完毕》条例的 `keep`：前提里固定有某一句），玩家只填空着的格子；全部填好的那几条不用运行，一开始就显示结果。电路也可以是玩家在先修关里自己拼的那块（`carry`：那一关的 id；没有存档时用那一关的参考解）。
  - **修正**（`play: 'repair'`）：每块电路是要改对的起点，玩家逐块修改，每块各自存档；一块改到满足这一关的规格（领域原有的判定），这个测试就通过。
  共用的部分在 `kit/shell/useBoardCases.js`：存配置或每块的修改、当前看的那一块、测试标签（`TestTabs`）和逐块运行（`usePlayback`）；领域只给出画布、配置的编辑器和每块的判定 `judge(k, …)`。题目可以直接取参考解的 naive 解，或参考解各改错一处（变异）。
- **填表格**（可选的玩法部件，所有游戏共用）：玩家逐行填写的表（《证明完毕》的检验条例）用 `kit/shell/RowTable.jsx`。桌面上直接在表格里改：能改的列给出就地编辑器（列的 `edit(row, set, k)`：游戏自己的编辑器，或 `FormFields.jsx` 里的小号字段 `InlineChoice`；《证明完毕》的前提和目标是一句话，点开后在旁边的提示框里用填句子条拼），行尾 × 删除，表下的小按钮添一行空的。手机上表格本身只显示，列表式的列（`align: 'start'`）靠左，其余列和列头居中，放在固定窗口里可以左右滚动，每列按文字撑宽、超过约 16 个字才换行，每行加高便于点按，添加按钮是表下一个大按钮。桌面上是紧凑的表，添加按钮是表下一个小的虚线按钮。手机上点一行就弹出这一行的底部单子，和别的弹窗（假设框等）一样：改了立即生效，没有保存按钮，× 或点遮罩关闭，底部一个「删除」；「添加」先添一行空的再打开它的单子。游戏只给出列（`columns`）和表单的字段（`form(row, set, k)`、新行 `blank()`），字段用共用的 `kit/shell/FormFields.jsx`：`Field`（带标签的一块，里面放游戏自己的编辑器）、`ChoiceField`（几项并排的按钮选一项）。`fixed`：行数事先定好（关卡预先摆好几行空的），不能添加也不能删除，只能填写。手机上表格下方提示一句「点按任意一行即可修改」（`tip` 可以换成游戏自己的说法）。运行结果这类只读的列，由游戏在单元格里显示，表单不管。
- **一关是一串任务。** 一关说一次的东西（标题、引言、点题、带来和搭出的元件）写在关上，谜题（目标、提示、板的口、测试、参考解和 naive 解）是它的任务（`tasks`，至少一个），按顺序做：前一个通过才能做下一个，最后一个过了才算过关。只有一个任务的关就是普通的一关，任务条不显示；关长出第二个任务，就是在列表里加一个。词汇表用 `kit/engine/tasks.js` 的 `taskLevel(一次的字段, 任务的字段)` 写一关的 schema，领域读一关时用 `taskLevels(关)` 一个任务一个任务地读（每个任务是关的字段上盖着任务自己的字段），外壳也这样玩（`kit/shell/GameShell.jsx`）；搭出的元件跑最后一个任务的板。拆成几个任务用在同一个问题换一种机器再做一遍的时候，比如骑士与无赖先把岛民的话翻译成真值电路，再用证明器证出来；也用在同一个想法用到两处的时候，比如《视觉完备》的补边，先给平移补边，再给滤波补边，不拆成两关。每个任务有 id（`id`）：整款游戏里唯一，也不能是别的关的 id；只有一个任务的关通常就用关的 id，新任务由操作集起名（`<关>_<n>`，以后可以 `task.rename`）。玩家存下的东西按任务 id 记（`kit/shell/progress.js`：每个任务的板、通过了哪些任务），所以任务在关内换位置、插进新的、挪进别的关，板和通过与否都跟着它走；几关合成一关就是把任务挪过去、删掉空了的关。任务有名字（`step`，写在任务条上）；前一个任务搭出的能力，后一个马上能用（`opens`），整关通过才作为解锁列出；从上一个任务的板接着做的写 `carries`。每个任务的点题（任务的 `after`）只说这一个任务得到了什么，可以带出下一个要做的事，但不透露它的做法。一个任务要交代新东西（新元件、新规则、上一个任务留下的问题）时，写自己的引言（任务的 `intro`）：第一次做到它时弹出，之后随时能从引言按钮重看；第一个任务的引言接在整关引言后面。每个领域都是这个形状，内核里只有这一种关卡遍历（`taskLevel` 是领域词汇表里唯一的关卡 schema，契约检查）：一关的玩法（`kind`、`mode`）写在任务上，几种玩法就是任务的 `S.by`，判别可以再套一层（《视觉完备》先按 `kind` 再按 `scene`，《状态之图》先按 `mode` 再按 `world`）。《状态之图》原来的「阶段」就是任务：一个阶段一个任务，接着上一阶段的板做的写 `carries`。领域读课程时不往内容里写（检查、操作集和开发页面都把内容深冻结了再读），它推出来的东西另起对象。

**文字纪律：**

Component descriptions are plain text in both languages: write terminology and names directly, without HTML or
reference chips. They are exempt from the reference and terminology-annotation rules below. Introductions, task
text and encyclopedia entries retain those rules. The components box, tray and tooltips show the same plain text.

- **入门教约定，不考常识。** 指出高亮格的坐标、照抄一个数、按指令改颜色等只需说明的内容，不单独设通关任务。难度递进增加的是推理、组合或约束，每一步都要有新问题；能够用已有元件探索的关系直接放进搭建关。只有实验干预本身不可替代时保留工作台，且用可辨认的具体场景呈现被操作的对象。
- **题面不替玩家判断。** 目标、题目和选项不用答案里的词：题目写「框出它的位置」、选项写「一个位置框」，就是把答案告诉了玩家。选项用中性的名字，区别要从材料里看出来。
- **目标只陈述任务。** 每关、每段的目标（`brief`）只说要做成什么：从哪些已知证出哪句、接一台什么样的机器、找出哪一行。背景、动机、新元件的介绍放进引言（关的或段的），做法的点拨放进提示，等价的另一种写法也放进提示。谜题本身的陈述（岛民说了什么、理发师的规矩）是任务的一部分，留在目标里。规格写错、要玩家检验或写出的关（《证明完毕》的声明关），目标先写自然语言的需求（「需求：……」），再写这一段要做的事；引言不再重复需求。界面上有放原话的位置时（填句子板顶上的那句话，《证明完毕》的翻译关和反例板），需求就写在那里，目标只说要做的事。
- 引言里不能出现做法。"把上面和左边加起来"就是在给解法。
- 新概念在引言里只讲"它是什么"，不讲"该怎么用在这一关"。
- 失败时优先给反例；文字提示只是补充。
- **文案用标准书面语，不写翻译腔。** 适用于全部文字：引言、目标、提示、判错说明、过关点题、元件说明、百科和界面上的字。
  - 书面、准确，不口语化：不写「搞定」「接一下」「啥」，也不用「就行」「没事」这类随口的收尾。用词谨慎，条件和因果的连接词要合逻辑：「只要……就……」和「只有……才……」不混用，「所以」「因此」之前要真有理由。
  - 不写翻译腔：主动句优先，不用「得到证明」「得到揭示」「被引入」这类被动式（写「证出了」「找出了错误」「引入」）；不用「进行」「对……进行」撑动词；不把「当……的时候」「在……的情况下」套在每一句前面；「的」字定语不叠成长链，长句拆短；不加英文冠词式的「一个」「一种」；不堆「其」「之」「该」一类文言虚词凑庄重。
  - 不过于直白：提示和判错说明指出哪里不符、该重新考虑什么，引导玩家自己想到，不直接给出答案或接法。
  - 英文一面按英文的习惯写，不照中文的语序和句式直译；术语用学科通行的说法。
- **游戏简介**（地图顶部的 lede）只讲这款游戏教什么、学完能亲手做成什么，不写有多少关：关卡数会变，进度条已经显示。
- **元件名用书面语，并说明作用。** 元件名用标准书面用语，尽量写成「动作 + 对象」（替换结论、分解目标、逆用规则），让人一眼看出它做什么；学科里有通行术语的用通行术语（德摩根律、全称实例化、回溯搜索），成对的元件用成对的名称（全称概括 / 全称实例化，分解目标 / 分解假设）。口语化的说法（「已知里有」「几条路」「去掉箭头」）不做元件名；关卡标题可以保留日常说法。
- **元件说明只写功能。** 原始元件和搭出的封装件一样：读哪些口、输出什么、碰到「—」怎么办，直白写清。不写「你拼出的电路板，现在是一个元件」「你在某关里搭的」这类没有信息的话，也不写它能用在哪些题上；过关点题也不必再宣布「电路现在是元件」，通关窗口已经列出解锁的元件。
- **文本随课程更新。** 元件的介绍可以随关卡推进改写：文本带 `revisions: [{ at: 关卡 id, …字段 }]`，从 `at` 那一关起（以及它之后的关）用新写法；元件箱按玩家已打开的关显示（`defineGame` 的 `textAt` / `textFor`）。一个元件在某一关得到新用法时（《证明完毕》「矛盾」一关起，套用也能接 ¬A 和 A 得到 ⊥），就在那一关更新它的介绍，不在一开始把后面的用法写进去。`at` 必须是主线上的关，而且是新用法第一次在任务里出现的那一关：挂在可选专题或挑战上，跳过它的玩家就永远看不到新写法（《证明完毕》的「消去 ∧ 也能拆 ↔」原先挂在可选的骑士与无赖上，后来在主线补了一关「两个方向」，改挂在那里）。
- **元件说明随开放的选项一起长。** 一个可配置的元件，说明只写所有选项共有的功能，每个选项特有的作用写在选项的 `about` 里；说明显示时接上此刻开放的那几个选项的 `about`（`kit/engine/parts/define.js` 的 `partDesc`）：详情、托盘按这一关这个任务开放的选项，元件箱按玩家已打开的关开放过的选项。还没开放的选项不出现在任何文案里。
- **元件升级与形状。** 元件可以随关卡升级，文字和能力一起长：`revisions` 里的一条可以写 `by: 关卡 id`（过了那一关才算，玩家挣来的升级），除了 `desc` 还能带 `forms`，给元件添新的形状（累加，`shell/index.js` 的 `textAt` / `textFor` 按关卡和进度读出）。一个元件可以有几种形状（`engine/forms.js` 的 `formed`：每种形状是一个完整的元件，有自己的输入口、设置和计算），元件上用和其他设置同一种选择框切换（`node.params.form`，默认第一种）；只给出这一关已经挣到的形状（`kit/course.js` 的 `formsAt`，`npm run check` 查参考答案用的形状这一关有没有）。同一条规律的几个方向、几种推广做成一个元件的几种形状，不拆成几个元件（《证明完毕》的德摩根：命题的四个方向证完后一次解锁，量词的四个方向各由证出它的那一关添上）。几个方向一起解锁时，元件由证出最后一个方向的那一关造出，其余形状用一条 `by` 这一关的升级一次给齐；每种形状的证明项取自证出那个形状的关。
- **不剧透核心思路。** 元件说明、引言、提示、百科只说一个东西"做什么"，不说"为什么这样就能解题"。带着专题核心思考点的句子一律删掉（比如动态规划里"走不通的路，加多少都走不通"这类解释、该选哪种汇合操作、一张表的递推）。简单的机械关可以手把手。
- **通关点题命名知识，不谈答案（硬性标准）。** 带来知识点的关，过关点题（`after`）用本领域的术语说出玩家刚做成的是什么，链接词条，再用一两句说它在本领域里的位置（它解决什么问题、和哪个相近的概念不同；库和工具里怎么叫是技术内容，主线上不写）。点题不复述这道题的具体答案、接法和操作顺序；应解释已发现关系的原理、适用条件及边界，不能把“不剧透”当作省略分析的理由。练习关可以不写点题。审查时对每一句问：它说的是这道题怎么做的吗？是就删；它说出了本领域的叫法吗？带来知识点的关，没说就补。
- **说全，不凑字。** 引言要让一个没学过的人读完就知道：机器在这里卡在哪（用本领域的话说情境）、这一关要回答的问题、手里有什么、怎样算答对。这几样缺一样，玩家就只能照着目标操作，想不起来为什么。前后关卡的文案要衔接，同一个知识点只在第一次出现的地方讲一次，后面不再重复；不写空话、套话（「现有流水线需要处理新的数值条件」这种放在哪一关都成立的句子，等于没写），不为凑满引言或点题硬写一句。
- **不往后透露。** 引言和过关点题都不描述后面的关（"下一关会……""后面你会用到……"）。过关点题只总结这一关学到了什么。
- **板上的东西都叫元件。** 文案里不说「卡片」「块」：放在板上的、托盘里的、元件箱里的都是元件。手机上也不报格子的序号：放元件时说「放在这一格」「放下了「① 套用」」，用元件的编号和名字指它。
- **文案里不手写第几关。** 关卡号会随重排变化：文案里指代前面学过的东西，用元件名，或者链接到那一关；链接自己显示关卡号，重排后跟着变。
- **引述关卡、元件、百科词条一律用链接。** 关卡写 `<level-ref to="关卡 id"></level-ref>`，元件箱里的元件写 `<part-ref to="元件的 key"></part-ref>`，百科词条写 `<wiki-ref to="词条 id"></wiki-ref>`（`kit/shell/refs.js`），中英两面都写。它们显示成带图标的名字（关卡还带关卡号），显示时从游戏里读，重排、改名都不用改文案。玩家点关卡，确认后跳过去；点元件或词条，直接打开元件箱或百科翻到那一条；还没解锁的，告诉玩家玩到哪一关时打开。不写「名字」，也不写"上一关""前两关""下一关""the last level"这类按位置的说法：顺序会变，按位置的说法会悄悄变错，链接不会。泛指一段经历时（"到这里为止""前面练过的几步"）不算引述，不用链接。被引述的关卡应当是这一关的先修；引述后面的关就是往后透露。`npm run check` 查：引用的东西存在、中英两面引用同一批、没有按位置指关卡、没有用「名字」代替链接；一个名字在某处说的是别的东西时（一句口头禅、一个按钮），在规格的 `quotes` 里列出，引号里的它就照字面用。
- **Explain terminology through clickable entries (manual review).** Each professional term in player-facing prose uses an available `<wiki-ref>`; its glossary body supplies the meaning. Do not require a definition in the intro, brief, hint or summary, or evidence that the player has already read it. Keep definitions, terminology distinctions and reference detail in the entry; copy supplies the situation, actions, reasoning support and synthesis of the discovered relationship without paraphrasing the entry. A diagram label must identify the visible referent and offer a clickable entry or an adjacent term tag. Review both languages and each task for entry availability and usable access. Missing, empty, locked or inaccessible explanations block review under `terminology-before-use`; repeated definitions block under `term-definition-duplication`. Links provide meaning, not the practical reasoning steps needed for a hard puzzle.
- **专有名词都有词条，并在引入它的地方链接。** 术语用课程材料和本领域通行的说法，不自造（「坐标网格」不能代替「采样网格」，如果课程这样叫）；英文用学科里的原词。每个知识点的词条 id 就是蓝图里知识点的 id，在带来它的那一关打开，正文用本领域的话下定义、注出处、说清它和相邻概念的区别。学科的每个专有名词在百科里有自己的一条，标题就是这个词，写成它在句子里的样子（英文小写，人名、专名除外；列表和标题里首字母自动大写），因为链接在正文里显示的就是标题。文案里原来加粗定义一个词的地方，换成 `<wiki-ref>`；中英两面的句子要写成链接放进去读得通（「这叫[逆否]」「This is the [contrapositive]」），英文不要在链接后面加 s。概括性的词条拆成一个词一条，用 `see` 互相连起来。
- **链接打开的必须是已经解锁的东西。** 词条在 `at` 那一关打开，元件在搭出它（或带来它）的那一关拿到；关卡文案里链接的词条或元件，必须在这一关或它的先修关里解锁，词条正文里链接的词条也不能比它自己晚开，否则点开只得到一句「还没解锁」。并行组里只有一条路经过的关不算先修。`npm run check` 查这一条。点链接时，百科和元件箱直接翻到那一条（手机上也不停在列表），列表滚到它的位置。
- **改了顺序就重核文案。** 链接到的关卡要仍是先修，"又是一个""新元件「…」"这类说法要在每一条先修路线上都成立（第 2 节）；并行组里先走另一路的学习者，不能读到一句不成立的话。

---

### Registered terminology

Each game's `glossary.json` is its sole professional-term registry. An entry's existing `title` is the canonical
name and its existing `body` is the explanation; do not add a second definition or summary field. Optional
`aliases` is a list of bilingual text pairs (a language-neutral abbreviation may be a string). Canonical names and
aliases identify one entry unambiguously within each language. `at` retains its current meaning: the entry is
available on entering that level and its guaranteed successors; omitted `at` means available from the start.

Use `<wiki-ref>` for professional terms in prose. One tag per term in an independently visible paragraph, hint or
summary is sufficient; repeated mentions in the same field may stay plain to avoid duplicate chips. The referenced entry must exist, contain nonempty explanatory
text in both languages, and be available where it is referenced. Clicking the term is the way to learn its meaning;
no inline definition or proof of prior reading is required. Keep definitions, distinctions and reference detail in
the entry. Intros, hints and summaries must not repeat or paraphrase that explanation: they establish the situation,
support the next inference and synthesise the discovered relationship. A link does not replace an observation or
practice needed for a hard reasoning step. Titles may use registered names directly; diagram/control labels must
identify their visible referents and provide a clickable term or adjacent term tag. A required route cannot depend
on an explanation locked behind an optional or parallel route.

`npm run check` checks registry integrity. `npm run pipeline -- <game> terminology` additionally checks references
through schema-declared content, reports literal unlinked occurrences of known names/aliases, and supplies the
registry for semantic review (`--json` for the full record). A literal occurrence can be an ordinary word, so it is a
candidate, not an automatic semantic failure. Reviewers must also extract professional terms missing from the
registry, including terms in domain UI/diagram text, and report confirmed unregistered or unlinked technical usage
as blockers. Automated success is not a proof that all prose uses only registered terms. No closed-word-list regex
claims to classify arbitrary Chinese or English technical language.

### 4.3 Learning routes, guidance and bench acceptance

Required parallel routes let the learner choose study order, not skip core knowledge: each route develops an
independent ability and a later join requires the abilities it actually uses. Peripheral topics are optional and
cannot gate a required route. Serial edges need a knowledge/part dependency, not a chapter number. Review a wholly
serial chapter for avoidable dependencies without forcing cosmetic branches. The shared `parallel` layout is an
AND join; do not treat it as an OR-choice feature.

Open each chapter with a shared situation and a usable first task before offering route choices. Establish what
the player is building, why it matters and how to try it. A fork is justified by learning dependencies, not by
symmetry on the map; an experiment that only explores a limitation must not gate an unrelated composition.

Review the actual conceptual load of every task, not only its `teaches` field or new-part count. New terminology,
physical-to-pixel units, coordinate-origin shifts and angular reasoning can be independent learning steps. Establish
the needed meanings and small observable operations before combining them; group small tasks only when they answer
one coherent question. Do not replace a missing foundation with the final formula in a hint.
Deleting a low-value task does not delete its instructional responsibility: move essential conventions and
observations into the introduction or a smaller meaningful task before the combined challenge.

Guidance includes model assumptions, named objects and conventions, known quantities and a usable observation.
A discovery hint must point to evidence visible at that moment and to controls available in that task. Afterwards,
a core introduction explains the principle, causal relationship and scope the player has discovered. This analysis
is required where it completes the learning; the no-spoiler rule forbids pre-solving the target and replaying a
particular solution, not explaining the model after discovery.

Non-assembly puzzles have the same burden of meaningful reasoning as assembly. Specify the competing explanations,
controlled intervention, observable contrast and transfer check. A submit button plus an unlabelled schematic is
not enough. Discovery must expose the evidence it requests; assessment can withhold a result only with adequate
prior support and explanatory feedback. Domain displays identify relevant objects, dimensions, units, coordinate
origins and state changes, with a coherent visual hierarchy and legible labels. New terms and controls appear only
when needed. Static inspection checks the contract; actual composition and touch/keyboard usability require visual
and interaction evidence and cannot be certified by source inspection alone.

Use `.agents/skills/turing-complete-games/references/learning-review.md` for the evidence worksheet and finding IDs.
The vision domain's concrete acceptance contract is `kit/domains/vision/DESIGN.md`. These requirements apply before
content authoring and during review; missing domain capabilities return to the domain step rather than being hidden
inside prose or executable content.


## 5. 规则与自动检查

规则尽量交给引擎检查，作者写偏了能被直接发现。

| 规则 | 检查 | 状态 |
|---|---|---|
| A wholly serial chapter has justified concept/part dependencies | `pd-serial-chapter` reports the topology; review decides whether required parallel routes are missing | Structural report, not a forced branch quota |
| Task concepts, guidance, principle synthesis and bench display satisfy §4.3 | Static semantic review with task-level evidence and domain ownership | Required review; visual/interaction acceptance remains separate |
| Professional terms open available entries; copy does not repeat entry definitions; diagram referents are identified | Terminology checks plus semantic review of access, definition duplication and reasoning support | Registry/reference errors are automatic; access, duplication and explanation quality require review |
| 关卡新带来的每个元件，要么是原始元件，要么已被更早的关卡搭出 | `npm run check`（kit/course.js 的 `audit`） | 已实现 |
| 一个元件不能在"搭出它"的那一关就直接给出 | 同上（`own-level`） | 已实现 |
| 不由关卡直接发放元件（`grants`） | 同上（`granted`） | 已实现 |
| 每关新增不超过一个元件（同一元件的不同型号算一个） | 同上（`many-new`） | 已实现 |
| 关卡规格不重复写已经带过来的元件 | 同上（`carried`） | 已实现 |
| 元件只有在搭出它的关卡通关后才进托盘 | 运行时过滤（kit/course.js 的 `usable`），两款游戏都已接入 | 已实现 |
| 内容是数据，合词汇表的 schema：字段、类型、引用的项存在、参数合项的 schema | `npm run check`（`kit/engine/vocabulary.js` 的 `checkContent`） | 已实现（所有游戏都是数据游戏） |
| 每关的参考解通过 | `npm run check`（各领域的 `validate`） | 已实现 |
| 封装件与搭出它的那一关一致：只放这一个封装件去跑那一关的测试，结果和逐格填出的表都要一致；搭出它的电路只读它的口 | `npm run check` | 《状态之图》已实现；《视觉完备》查前一半：只放这一个封装件，接上那一关的输入，要通过那一关的全部测试和隐藏测试；《车在说话》：封装件单独放在搭它的那一关上，测试和隐藏测试逐拍的输出都对；《证明完毕》查机器板上的元件和真值电路拼出的门：单独放上去通过那一关 |
| 课程按代际组织；关卡角色（地基 / 引入 / 递进 / 终极谜题 / 挑战）；开放规则由此生成 | `kit/course.js` 的 `layout(eras)`；《状态之图》的 `levels/eras.js` | 已实现（两款游戏） |
| 每关都在某一代里 | `npm run check`（`unplaced`） | 已实现 |
| 关卡用本代或更早一代的机体；地基、练习、终极谜题、挑战只用本代机体 | 同上（`machine`、`machine-role`） | 已实现 |
| 机体会做关卡参考解用到的每一种机制 | 同上（`mechanism`；课程给出 `uses(level)` 和 `can(machine)`） | 已实现（《状态之图》） |
| 沿用电路（`carry`）的那一关是先修 | 同上（`carry-unseen`，表格领域） | 已实现 |
| 专题内同一族世界 | 同上（`topic-world`） | 已实现 |
| 专题代号一个字母一个系列：有依赖的专题同一个字母，不相干的不同字母 | 同上（`topic-code`） | 已实现 |
| 专题内的关卡都是终极谜题的简化版：终极谜题的参考解，能通过前面每一关的测试；如果前面某关是"核心机制单独实现"，它产出的元件要出现在终极谜题的参考解里 | 同上（`topic-finale`，《状态之图》） | 已实现 |
| 专题只用本代及以前的元件：元件的搭建关必须是先修 | 同上（`built-later`，按先修关系判断） | 已实现 |
| 必修关不用可选关（专题、挑战）搭出的元件 | 同上（`optional-needed`） | 已实现 |
| 可选关搭出的元件只给依赖它的关用：参考解用到它的关必须以它的搭建关为先修；托盘也只在这些关里给出它 | 同上（`optional-built`；`usable` 运行时过滤） | 已实现 |
| 挑战关新概念为 0、不是任何关的先修、带一个会失败的 naive 解 | 同上（`challenge-new` / `challenge-required` / `challenge-naive`） | 已实现 |
| 约束挑战的预算 | 代价度量（关卡的 `constraint`，`tests.js` 执行） | 《视觉完备》已实现 |
| 新想法放在需要它的地方：引入它的那一关自己用到它，之后在两个别的新想法进来之前就有一关用到它（怎么算见表下） | `idle-idea` | 已实现，所有游戏都打开、清零 |
| 搭出的元件后面有人用：至少一关后续关卡的参考解（或同一关后面的任务）用到它（含换代后重新搭出的升级版） | `unused`（课程开 `abstraction` 时检查） | 已实现：《证明完毕》《视觉完备》《状态之图》《句法之图》《软件工厂》《车在说话》已打开（《句法之图》没有封装件） |
| 一个类型名只指一块元件：引理、门、机器元件不能同名（否则解锁和显示会互相顶替） | 课程构造时报错（`logicCourse`） | 已实现（《证明完毕》） |
| 抽象在上升：一关的参考解如果不用任何封装件，而某个已解锁的封装件能把它明显缩短，就报出来（通常意味着这道题放错了位置，或封装件没进入抽象链；怎么算见表下） | `bypass` | 已实现，所有游戏都打开、清零 |
| 新元件有前因：作为原始元件出现的元件，它出现的那一关参考解不能只是"放上它、接到目标"一步。例外只给用法本身就抽象、光看说明会用错的元件：可以先用一关单纯弄清它怎么用，这一关标 `showcase` 并写明它抽象在哪（如《证明完毕》的假设框：一个区域、两个圆点，框里得出的东西只能从结论带出去）。一句说明就讲得清、接上就会用的元件（如《状态之图》的拦截闸：条件为「是」就输出「—」，否则放行）不单独占一关，第一次出现就放进一道真题里 | `bare-intro`（同上） | 已实现：《证明完毕》《视觉完备》《状态之图》《句法之图》《软件工厂》《车在说话》已打开（《状态之图》的「两路汇合」是第一次往板上放元件，《软件工厂》的「第一次调用」是第一块板、模型在纸笔一章已经亲手调用过，都标了 `showcase`） |

**`idle-idea` 怎么算**（`kit/course.js` 的 `idle`，只用课程已经给出的数据）。这条规则查的是编排的质量：一个想法是不是放在了需要它的地方；它不要求任何关数，修它的办法是把想法挪到需要它的地方、或者让后面的关真的用上它，从来不是为了凑数补关。练得够不够、练习是不是真的在变化（第 2.3 节），还要人看。

- **新想法**：一关新带来的原始元件，按概念算（`concept`：几块元件合起来是一个想法；`fresh`），留在原地的（`local`，谜题自带的东西）不算；或者这一关的板依赖、而它的先修关都没有依赖过的一种机体能力（`uses`）。专题和挑战上出现的新想法不查：专题按设计一关加回一个机制、由终极谜题把它们合起来（`topic-finale`），挑战不带新东西。
- **自己用到**：引入它的那一关，参考解（`needed`）用到它；一关的答案是声明这些元件、或者围着它们的声明做文章时（《证明完毕》的声明关，检验声明、过强与过弱，`declares`），也算用到。
- **随后用到**：以这一关为先修的关里（`requires` 一路往上，跨章、跨并行组；必修、可选都算），第一批用到它的关之前，进来的别的新想法不到两个（只数必修关带来的；并行组里另一路上的关不在两者之间）。下一个新想法可以先来：它可能正建在这个想法上，或者这个想法紧接着就回来。用到它搭出的封装件也算用到：想法在封装件里接着工作。
- 一关之后再没有关用到它，也报（课程的最后一关除外）。

**`bypass` 怎么算**（`kit/course.js` 的 `bypass` 和 `kit/engine/match.js` 的 `rebuilt`）：一关的参考解（`needed`）里没有封装件，而它手里有某个封装件（`usable`），这块封装件跑的那块板（在它之前、搭这个封装件的最后一关的最后一块参考板，课程的 `boards`）**原样**出现在这一关的某块参考板里：同样的元件、同样的设置、彼此之间一样接线，封装件的每个输入都从同一处读，空着的口也空着，这几块元件之外没有别的元件读它们里面的值（只读封装件交出的结果）。这样这几块元件就能换成一块封装件。**明显缩短**：被换掉的至少三块元件，即至少省两块；两块元件的封装件只省一块，不报。只比结构，不比意思：换了常数、寄存卡改了名字、或者封装件自己的板里又用了别的封装件，就认不出来（漏报，不误报）；证明里的引理按陈述套用，这样比只能认出原样照抄的一段证明。

`npm run check` 在 `trace-viewer` 目录下运行。审计或任一领域检查不清零时，它以非零状态退出，并按规则列出每一处问题（元件@关卡）。课程一时做不到的审计结果，写进游戏 `game.json` 的 `open`（`{ "规则": ["元件@关卡"] }`），同时写进游戏设计文档的工作单：`check` 把它们列成 `OPEN`，不算失败；不在单子上的新问题照样失败，单子上已经做到的也失败，直到从单子上删掉。所以规则对所有游戏都打开，单子只会变短。

---

## 6. 引擎：分层

**规则：三层，内容层只有数据**（方向和理由见 `games/DIRECTION.md`）。

```
内核层   games/kit/（engine、circuit、shell、strip、studio、course.js、app）   机制与界面，所有游戏共用
领域层   games/kit/domains/<领域>/                                      值、原始元件、世界、求值、判定、画法、关卡界面；一个专题一份代码
内容层   games/<游戏>/                                                  课程、关卡、文案、百科；全部是数据，不含代码
```

一款游戏的文件夹里只有数据：它的课程、关卡、测试、参考解、引言、提示和百科，不实现元件、世界、运行逻辑或界面，也不写一行可执行代码。凡是要计算的（引言里的图、诊断失败的谓词、通关后显示的倒推路线），都由领域在**词汇表**里给一个有名字、带参数 schema 的项，内容只写 `{ "项名": 参数 }`；算不出来的就物化成数据。这样内容才能被 schema 校验、在 git 里 diff、交给不受信任的作者或 agent 去改。

```
games/kit/
├── circuit/   电路编辑器（桌面画布、手机格位）、托盘、浮窗、线的种类、框（元件里还能摆元件）、蓝图文本、无头的 SVG 画法（svg.js）
├── strip/     词序条：按顺序排好的类型化位置，括号标出成分，点词填入；给"搭一个序列或一棵小树"而不是"搭数据流"的关卡（《证明完毕》拼公式和证明项：自然书写，块填进去就写成字，空位画成框；上方一行工具和电路板一致：左边清空（二次确认），右边撤销、重做，每点一次块是一步）
├── shell/     游戏外壳：顶栏、地图、关卡抽屉、引言、通关窗口、元件箱、百科、存档；参数台（bench/，第 6.4 节）
├── course.js  课程规则：代际、关卡树、解锁、审计
├── engine/    与领域无关的引擎（见下），包括内容层的契约：schema、词汇表、数据游戏的组装
├── scaffold/  新领域的模板，一个机制一份（第 6.3 节、6.5 节）
├── domains/   领域模块：每个领域的值、原始元件、世界、画法、关卡界面、校验
│   ├── image/   图像流水线（《视觉完备》）
│   ├── table/   机器人逐格填表（《状态之图》）
│   ├── logic/   命题与证明（《证明完毕》）
│   ├── syntax/  英语长句分析：把修饰成分折到它修饰的词上、标出主干、与答案对照（《句法之图》）
│   ├── unix/    模拟内核与字节流（《一切皆文件》，只有引擎部分）
│   ├── agent/   模拟模型、抽象仓库与逐轮跑板的机器（《软件工厂》）
│   ├── can/     线性与的总线、CAN 帧（填充、CRC-15）、逐拍跑板和逐拍检查（《车在说话》）
│   ├── net/     点对点的线、线那头的格式（起止位、校验、旗标帧、CRC、汉明块）、取用的队列（《从一根线开始》）
│   └── vision/  计算机视觉重做用的领域（第 6.8 节）：灰度与彩色图像值、逐像素的取样电路、读图填格、选择题的判定、
│                受控的三维小场景、针孔和薄透镜参数台；能力已备，还没有用它的游戏
├── pipeline/  agent 流水线：每一步的 brief 和闸门、课程蓝图的 schema 和审计、文案 lint、npm run pipeline（第 7.2 节）
├── studio/    studio：审、改、玩内容的页面，schema 驱动，操作集上的一层皮（第 6.7 节）
└── app/       每款游戏的页面入口和构建；studio 在开发服务器上的桥（studio.js）
games/<游戏>/   内容：game.json、levels/<关卡 id>.json、glossary.json，操作集的修改日志 changes.jsonl
games/<插图>/   每款游戏的标题图（boxy、press、detach、stick；loop、wave 是简单的线描）：用 anatomy 技能的等距套件画的一台机器，build.mjs 生成一个模块，
                同时挂在游戏列表的卡片和关卡地图上；配色取自 kit/tokens.css（kit/anatomy.css）
```

### 6.1 内容：数据游戏的形状

一款数据游戏（《状态之图》《视觉完备》）的文件夹：

| 文件 | 内容 |
|---|---|
| `game.json` | `domain`（交给哪个领域）、`vocabulary`（写它时对的词汇表版本）、`open`（可选：课程还没做到的审计结果，第 5 节）、标题、简介、课程（`eras`、`primitives`、`concept`、搭出的元件的名字和说明）、领域要的其余全局设置 |
| `levels/<id>.json` | 一关一个文件，文件名就是关卡 id；字段由领域按玩法给出 schema |
| `glossary.json` | 百科：`{ groups, entries }` |
| `parts.json` | 这款游戏的元件（第 6.9 节）：每个元件的口、设置、运算（对领域引擎资源的调用）和三面视图，加上几个元件共用的设置预设；元件定义成数据的领域才有 |
| `changes.jsonl` | 修改日志（操作集写，只追加，`kit/engine/ops/log.js`）：每次修改一行，记下它跑了哪些操作、为什么、改了的每个文件改前改后的哈希、撤销它的变更集（第 7 节）；`adopt` 一行把游戏的全部文件照现状收进日志（手改、git 改过之后） |
| `blueprint.json` | 课程蓝图（第 7.2 节，流水线做出的游戏才有）：机体阶梯、要教的知识点（术语、出处、撞上的墙）、原始元件和搭出的元件、每章的系列和每关的位置（slot：问题、思维链、带来的知识点），向领域提的需求；schema 是内核的 `BLUEPRINT`（`kit/pipeline/blueprint.js`），经操作集写（`blueprint.put`、`blueprint.set`）；`check` 按 schema 查它，页面不读它 |
| `pipeline.json` | 流水线的记录（第 7.2 节）：每一步跑过的 agent（模型、用量、调用了几次命令、写下的变更集）、每次闸门的结果、评审队列里的那一项；只由 `npm run pipeline` 写 |

- 文字一律写成 `{ "zh": …, "en": … }` 两面；与语言无关的符号（`a + b`）可以写成一个字符串。
- 引用词汇表的地方写成单键对象 `{ "项名": 参数 }`，没有参数的项也可以只写项名。例如诊断：`{ "when": { "uses": "right" }, "say": {…} }`；条件可以用 `all`、`any`、`not` 组合。
- 参考解、naive 解、预置电路都写成蓝图文本（`kit/circuit/text.js`，每行一个字符串的列表），和玩家导出、导入的是同一种文本。
- 文件按统一的格式写：两格缩进，一个对象或列表连同键和后面的逗号不超过 112 列就写在一行，否则展开（`kit/engine/ops/json.js`）。早先写成的文件不全是这个格式；操作集改一个文件时，没变的部分照原文留下，只有新写的部分用这个格式，所以 diff 只有改了的那几行。
- 课程的形状都是数据：代际、并行组、专题和挑战的挂靠（`eras`）、原始元件（`primitives`）、哪几块元件合起来是一个想法（`concept`）、合并与升级（`replaces`）、留在原地的元件（`local`）、跨章带走什么（`keeps`）。领域代码只从关卡和参考解里读出事实（用到哪些元件、依赖哪些能力），不替课程做决定。
- 内核的 `kit/engine/content.js` 把这几个文件组装成一份内容（`assemble`）；`npm run check` 在 node 下读盘（`readContent`）。游戏页面只打包领域的代码（`kit/app/vite.js`），内容在页面打开时读进来（页面旁边的 `content.json`：构建时写一份，开发服务器每次从文件现读），先按词汇表查一遍，读不进的内容显示问题清单，不交给领域；所以改内容不用重新构建，`npm run publish:content [-- <游戏>]` 查过之后把它写到已构建的页面旁边就上线了。

### 6.2 词汇表与 schema

每个领域给出一份**词汇表**（`kit/domains/<领域>/vocabulary.js`，用内核的 `defineVocabulary`）：领域里能被内容引用的每一样东西是一个**项**，按种类（原始元件、世界、机体、玩法、引言图、诊断条件、倒推路线、通关面板……）分组，每一项带一句说明和参数的 schema；再加上 `game.json` 和一关的 schema（一关的字段按它的玩法分开，`S.by('mode', …)`）。

- **文字只带内核的标记**（`kit/engine/markup.js`）：`<b>`、`<i>`、`<strong>`、`<code>` 和三种引用（`<level-ref>` 等），不带属性；外壳按它画成元素（`kit/shell/Markup.jsx`），从不把内容当 HTML 插进页面。别的标签、属性、没配对的标签，`npm run check` 在 schema 的 `text` 上就拦下。领域自己把文字拼进 SVG 时要转义。
- **schema 是数据**（`kit/engine/schema.js`），可以带给编辑者看的提示（`view`、`step`、`section`，第 6.7 节）：`S.text()`、`S.num()`、`S.list()`、`S.obj()`、`S.ref('world')`（某一种的一个项的名字）、`S.call('condition')`（一个项和它的参数）、`S.level()`（这款游戏的一关的 id）、`S.board()`（一块板的蓝图文本）、`S.syntax('formula')`（领域小语言里的一段文字：公式、证明项……，领域在 `domain.js` 的 `languages` 里给出读它的函数，读不进时按文件和字段路径报告，不抛出）……所以整份词汇表能打印成 JSON（`describe`），给写内容的 agent 和以后的 studio 看，它们不需要读领域代码就知道能写什么。
- **提到一关的地方都写成 `S.level()`**：课程的各项（`eras` 里的关、`after`、挑战）、`carry`、百科的 `at`、元件说明的 `at`/`by`……检查时它必须是这款游戏的一关；操作集按它找出一关被提到的每一处（再加文字里的 `<level-ref>` 和 `open` 的 `元件@关卡`），改名、删关才不漏。一块板写成 `S.board()`，操作集和 MCP 按它找出一关的每块板。
- **封闭**：内容只能由词汇表里的项组合出来。要一样词汇表里没有的东西，就加一个项（领域代码，走代码审查），不在内容里绕路。
- **粒度**：一个项是玩家在屏幕上能指着说「那个东西」的一个概念：一种元件、一种世界、一种玩法、一种图。只有实现细节能区分的，合成一项加参数。
- **版本**：`game.json` 写明它对的词汇表版本（1 到当前版本）；每个版本打印出来存在领域旁边（`versions/<n>.json`，重复的子树只存一次），存下就不再改：词汇表和存下的不一样就得升版本（`npm run versions` 存下新版本）。新版本只能在旧版本上增加——不去掉、不改动，对象新加的字段必须可选，不给已有的 schema 加界限（`additionProblems`，`npm test` 查每个领域的每一对相邻版本）。删改要带迁移。
- `npm run check` 先用词汇表查内容（字段、类型、引用的项存在、参数合 schema），再组装课程跑审计和领域检查；内容错了，报出文件和字段的路径。

### 6.3 领域的契约

一个领域（`kit/domains/<领域>/`）对内核只承诺下面这些；满足了，`npm run check`、外壳、操作集、MCP 和 studio 不用认识它就能用它。契约写成代码在 `kit/engine/contract.js`，`npm test` 的 `contract.test.js` 对每个领域、每款数据游戏机械地查一遍。

| 给出 | 形状 | 契约测试查什么 |
|---|---|---|
| `domain.js` 默认导出 | `{ vocabulary, spec, validate }`，node 下能跑，不碰界面；工具加的钩子也挂在这里，登记在 `contract.js` 的 `EXTENSIONS`（连同每个钩子要的形状）：文字里的一关 `play`、无头画一关的 `scene(spec, 关卡)`（返回 SVG 文本或 `null`，MCP 的 `render` 和 studio 用，第 6.7 节） | 三个入口都在，没有不认识的键 |
| `vocabulary` | `defineVocabulary`（第 6.2 节）：种类 → 项（`about` 说明它是什么，`params` 参数的 schema），加 `game`、`level` 两个 schema | `domain` 就是文件夹名，版本从 1 起；每一项有说明；schema 只用 `schema.js` 的类型，`ref`、`call` 指向存在的种类；整份是数据（没有函数），`describe` 打印出来就是它自己；`languages` 列出领域的小语言（每种一句 `about`），`domain.js` 的 `languages` 给出每种的读法，两边一一对应；游戏的内容合它（`checkContent`） |
| `spec(content)` | `{ id, domain, title, course, levels, texts?, quotes?, audit?(), blueprints?, syncOwn?, builtIn? }`：`course` 是 `defineCourse` 的结果，`levels` 按游玩顺序，每关有 `id`、`title`、`requires` | id、标题、关卡集合和内容一致，课程的关卡就是 `levels` 的顺序；`audit()` 报 `{ rule, level, part }` |
| 课程钩子（`kit/course.js` 的 `defineCourse`） | `adds`、`builds`、`granted`、`uses`、`folds`、`declares` 给名字的列表；`needed` 给列表或 `null`；`boards` 给板的列表；`machine`、`world`、`concept`、`needs` 给名字或 `null`；`can` 给列表或 `null`；`naive`、`local` 给真假；`showcase` 给理由或 `null`；`replaces` 给列表 | 每一关、每个元件上都按形状调用一遍，审计只报认识的规则 |
| `spec.blueprints` | 内容里写成蓝图文本的每一块板：`{ level, task, key, board, write(board) → 行, read(行) → board, naive? }`（`task`：这一关的第几个任务的板，`key`：那个任务的 id，也就是它在存档里的 key；`progress.built` 存的就是板本身） | 关卡有参考板（`course.boards`）时必须给；每一块写出来再读回，算的东西不变，再写一遍文本不变 |
| `spec.syncOwn(built)` | 课程有搭出的元件时必须给：把外壳的 `progress.built`（按任务 key 记）交给封装件，之后每个封装件跑它那一关最后一个任务记下的板（没有就跑参考解） | 每个搭建关最后一块参考板拔掉接到输出的线（`out <- a` 那几行），交给 `syncOwn`，那一关必须查不过：封装件真的在跑交给它的板。不跑玩家的板的元件（内置实现）由领域列在 `spec.builtIn` 里（按元件，不按关），在代码旁写明原因：只搭这些元件的关必须照样查得过，单子只会变短；列了没有关搭的元件也算错 |
| `validate(spec)` | `[{ text, fail?, level? }]`：参考解通过、naive 解失败、封装件单独放在搭它的那一关上通过；说某一关的行写明 `level` | 把内容里每关的 naive 解放到参考解的位置（不动搭建关），这些关都要查不过，别的关只有排在它们后面的可以跟着不过（后面的关可以建在前面的答案上：声明的类型、定义的函数） |
| `game.jsx` | `default (content) → defineGame(…)`：外壳的游戏描述，关卡界面放在 `kinds` | 在 node 下经 vite 载入（`kit/engine/games.mjs`，和 `check` 一样）：关卡就是 `spec` 的关卡、同样的顺序，每关的 `kind` 有 `Screen`，章、元件箱、百科、存档都在 |

**关卡界面不在契约里，但有共用的件：** 电路关用 `kit/shell/CircuitLevel.jsx`（第 6.10 节），领域只写一个适配器：给出元件描述、元件的几面、结果区、封装件怎么打开；建在电路底座上的领域连适配器也不写，用 `kit/shell/CircuitScreen.jsx`，只交卡片目录、怎么跑、值怎么显示、卡片自己的设置和结果区（逐拍的板交波形的几条线，跑一次的板交一个测试的结果；脚手架生成的 `ui/Screen.jsx` 是最小的样子）；参数台用 `kit/shell/bench/`（第 6.4 节），领域只给模型项和画不出来的显示项。其余玩法（词序条、填表、纠错与修正、手动关）现在各领域自己接，见第 6.5 节的机制目录。

**领域模块**给出：值和比较、原始元件（engine 的注册表）、世界、画法、关卡界面、参数台的模型和领域自己的显示项、词汇表和它的解释（每一项怎么算、怎么画），以及上面的契约。领域之间不互相依赖，也不读任何一款游戏的文件。**元件严格按游戏隔离，机制可以共用。** 两款游戏里意思一样的元件（加法、常数、放行闸、重复框……）也各自在自己的领域里定义，不抽成跨游戏的元件库：元件的名字、说明、口、碰到「—」怎么办、出现在哪一关，都是这款游戏课程的一部分，改一款不能牵动另一款。能共用的是元件底下的机制：求值、封装件、形状、框的区域与作用域、逐步运行的机器、内容的 schema，这些放在 `kit/engine`、`kit/circuit`，领域在上面定义自己的元件（比如用 `framePart` 造自己的框）。

**新领域从脚手架开始。** `npm run new-domain -- <名字> --mechanism <机制>` 从 `kit/scaffold/<机制>/` 生成一个能玩的空领域：词汇表（一个示例概念）、`domain.js`、`course.js`、`validate.js`、`parts.js`（模型）、`board.js`、`run.js`、`game.jsx` 和接在内核界面上的 `ui/`、一个单元测试、一款最小的入门游戏 `starter/`（两关、百科），并把入门游戏复制成 `games/<名字>/`、在 `games/games.js` 里登记成隐藏的开发中游戏。生成的东西过契约测试、`npm run check`、`npm test`，能构建、在浏览器里能玩通。`npm run new-game -- <id> --domain <领域>` 把一个领域的 `starter/` 复制成一款新的数据游戏，同样登记；没有 `starter/` 的领域不能这样开新游戏。有 `play` 钩子的领域必须有 `starter/`：`play.test.js` 在它上面走文字接口，一直玩到课程结束。游戏的文件夹里事先只有设计文档（专题先写了框架，比如 `games/network/`）也可以；有别的东西就拒绝，而且领域和游戏有一个做不成就什么都不写。现在有两个模板（第 6.5 节）：`circuit`（数据流电路）和 `tick-bus`（逐拍总线：一根大家共用的线，世界的一个节点按测试说话，玩家的板每拍跑一遍、经「说」元件往线上说，寄存卡跨拍保存，板下是波形图，带 `play` 钩子；从 `kit/domains/can` 抽出）。`scaffold.test.js` 在 kit 的副本里对每个模板生成一遍、跑契约，再把生成的领域的单元测试当作单独的一次测试运行（嵌在 `node --test` 里跑时它总是退出 0，查不出失败）。

《从一根线开始》的 `net` 领域从 `tick-bus` 模板生成，契约测试一次通过；生成之后，模板的那根共用线换成了点对点的线：进线和出线是板的口（和输入输出一样），所以搭出的元件把它那一关的线当作自己的口，一块网卡就是一个元件。点对点的线上，线那头只按测试说话、不回听，板这一拍可以说它这一拍听到的；共用线上不行（`ticks.js` 的说、听两半）。

**`kit/engine`（与领域无关）：**

| 模块 | 做什么 |
|---|---|
| `circuit.js` | 求值：按需从目标往回拉，每个值只算一次；元件来自领域的注册表；多输出口；未接的口取领域给的空值，否则算缺输入；元件出错只影响它下游；`Halt` 让整次求值停下（机器人读到还没算的格子）；给 `ctx.trace` 时按运行顺序记下每个节点算出的值或错误（框转圈时框里每个元件每一圈都记一步；内部会转圈的封装件，比如饱和器、合一器、auto，也把每一圈或每一次套用记进去） |
| `trace.js` | 回放：`viewAt` 还原轨迹前 k 步时板上每个元件显示什么；`paceOf` 是所有游戏共用的播放节奏：每步的时长固定（第一个测试 650 ms、后面 110 ms），和步数无关；步数多到超出一个测试的时长上限时，帧间隔不变、一帧走几步 |
| `boards.js` | 电路自己的输入和输出（按名字绑定）；封装件是一块固定内容的电路，当一个元件用：一个或几个结果口，每个结果口只读通向它的输入；`holds` 的封装件里的寄存卡按它的路径各存一份 |
| `machine.js` | 机体运行时：按顺序在每一步跑一遍电路板，读写一张表；可以一遍一遍扫到不再变。《状态之图》的机器人和《一切皆文件》的逐行机器都是它 |
| `ticks.js` | 逐拍世界：几个节点共用一根线，每拍分「说」和「听」两半（说的一半只算通向驱动口的电路，读到这一拍的线就是回路），线的规则由领域给；寄存卡（`register` / `store`，按封装件的路径各存一份）。《车在说话》的总线用它，《从一根线开始》也将用它 |
| `tests.js` | 跑一关的测试（含隐藏测试）、判定、评分、约束 |
| `schema.js` | 内容的 schema：可打印成数据的类型（文字两面、数、列表、对象、按字段分开的几种形状、引用词汇表的项），`validate` 报出每一处不合的路径 |
| `bench.js` | 参数台的数据（第 6.4 节）：旋钮、目标（限制）、按钮、版面块和内核显示项的 schema，`benchSchema(模型)` 给出一关的参数台的 schema；起始值、判定（`judge`）、一步里能过的全部设定（`passingSettings`）、数的写法 |
| `vocabulary.js` | 领域的词汇表：`defineVocabulary` 把一个领域能被内容引用的项和 schema 收在一起，`describe` 打印成数据，`checkContent` 按它查一份内容 |
| `content.js` | 数据游戏的组装：`assemble` 把 `game.json`、各关、百科合成一份内容；`readContent`（`content-node.js`）在 node 下读盘 |
| `checks.js` | 一款游戏的全部检查（`checkGame`）：先按词汇表查内容；课程审计（`game.json` 的 `open` 列着的照列不算失败，第 5 节）、关卡 id、文字都有中英两面、链接，再加领域自己的检查（参考解通过、naive 解失败……）。`check.js` 是 `npm run check`，每个变更集也跑它；`games.mjs` 在 node 下照页面的样子把内容交给领域的 `game.jsx`，给链接检查用 |
| `match.js` | 在一块板里找另一块板（`rebuilt`）：同样的元件、设置和接线，审计 `bypass` 用它 |
| `deps.js` | `npm run deps -- <游戏>`：从课程数据画出元件依赖图（第 7 节第 5 步） |
| `contract.js` | 领域的契约（第 6.3 节），`contract.test.js` 对每个领域和每款数据游戏跑它 |
| `scaffold.js` | `npm run new-domain`、`npm run new-game`：从 `kit/scaffold/<机制>/` 生成领域，从领域的 `starter/` 开新游戏（第 6.3 节） |
| `circuit-domain.js` | 电路领域的底座：`circuitBoard`（领域只列出关卡给板的几种固定卡）、`circuitCourse`（从内容读出课程、每个任务、搭出的元件；玩家的板存在这份课程里，不是模块级单例）、`checkCircuitTasks`（每个电路关都要过的检查）、`circuitSpec`（检查读的 spec，课程读出挂在 `circuit` 上）、`GAME` 和 `levelSchema`（词汇表里 game.json 和一关的 schema，领域只交板的口、测试和要求）；页面一侧是 `shell/circuit-game.js` 的 `circuitGame`（外壳的游戏描述，`game.circuit`）和 `shell/CircuitScreen.jsx`。领域只写任务怎么读、怎么跑、结果区和文案；一关里也可以有不是板的任务（`kinds`：读图填格、选择判定、参数台，由领域读、在领域自己的屏上玩）。`net`、`can`、`vision` 和两个脚手架模板建在它上面，`npm run duplication`（`duplication.js`，`npm test` 里按文件类别设上限）量它们还逐字写着多少一样的代码 |
| `ops/` | 操作集（第 7 节）：`operations.js` 每种修改一个操作，`changeset.js` 把几个操作当一次修改跑完、整款游戏检查、写盘和记日志；`workspace.js` 打开一款游戏的文件，`place.js` 在课程里取出、放进一关，`refs.js` 找出提到一关的每一处，`search.js` 在整款游戏里搜索、把替换写成操作，`json.js` 按统一格式写文件；`cli.js` 是 `npm run op`，`mcp.js` 是 MCP 服务器，`tools.js` 是它和 studio 共用的工具 |
| `play/` | 一关在文字里的样子和对一次尝试的判定（`play.js`，电路关的公共部分在 `circuit.js`），`run_tests` 用它；盲玩 harness 的其余部分（一局的记录、统计、CLI、盲玩 agent）暂停，见第 6.6 节 |

**框（`kit/circuit/frames.js`），所有游戏共用。** 《证明完毕》的假设框是它的第一个用法：一个元件里有几个区域，元件可以摆进区域里，区域在左边给出一个值（比如假设），或者几个值（区域写 `gives: [键…]`，每个值一个圆点：《证明完毕》的消去 ∧ 一个区域同时假设左右两边）；区域也可以不收结果（`closes: false`，没有结果口：《证明完毕》消去板上的一种情况，结论由用规则的人推出），区域里得出的东西接回框右边的口，框再给出自己的结果。领域只需要用 `framePart(自己的输入, [{ name, opens }])` 造出这种元件，在求值时按 `key` 区分「区域给出的值」和「框的结果」，并在元件描述里给区域起名（`parts.frames(node)` 返回带 `label` 的区域）；其余都由 kit 负责：两个编辑器画出区域、拖进拖出、折叠，`model.js` 保证线只往里走（框里得出的东西只能在框里用），`engine/circuit.js` 按 `reads` 让区域的值只读框自己的输入，`regionsFit` 检查存档里的元件还在存在的区域里。桌面画布上拖着元件悬到一个能放进去的区域上时，那个区域的底色和虚线框会亮起来。手机格位上，框占它所在格子网格的若干行：每个区域一行头（区域名和它给出的假设，框名在第一个区域的头上）、区域自己的几行、一行尾（结果接进来的点），用子网格和外面的格子按行对齐；框的边就是格子的边，和普通元件一样，框名和内边距在框里，所以框的第一行和最后一行稍高一些。框默认两列宽，右上角一个按钮点一下在两列和一列之间切换（像接线显示的按钮一样只有一个，图标显示现在的宽度；存在元件的 `narrow` 上），它的区域和里面的框也随之一列。以后需要"局部作用域"的游戏（比如程序里的函数体、循环体）都用它。

**内容可以：** 在词汇表里选项、填参数；写测试数据、参考解和 naive 解（蓝图文本）、文案和百科；在 `parts.json` 里定义元件：口、设置、用领域的引擎资源（`op`）组合出的运算、三面视图（第 6.9 节）。**不可以：** 写任何函数；定义新的引擎资源、新世界、新的参数台模型或显示项、新界面。需要新东西时，加到领域的词汇表和实现里。

**单元测试不认识关卡。** 测试跟着三层分开：`npm test` 只测内核和领域的机制，用的内容是测试里现写的小内容，或领域的 `starter/`（契约测试和 `new-game` 共用的最小样例），不读任何一款游戏的关卡，也不写死某一关、某个任务或一款游戏有几关。对每款游戏都成立的性质（契约、文件的写法）可以逐款机械地查，但不点名任何一关；要列例外时，例外由领域或内容自己声明，不写在测试里。一款游戏的关卡对不对（参考解、naive 解、审计、文案）只由 `npm run check` 查。所以改关卡不用改测试；改了关卡测试就失败，说明那条测试写错了层。

**命令**（都在 `trace-viewer` 目录下；游戏 id 写错了，三个命令都列出有哪些游戏）：`npm test` 跑 kit 的单元测试；`npm run check` 校验所有游戏（`npm run check -- state-graph` 只校验一款）；`npm run deps -- <游戏>` 画出一款游戏的元件依赖图（Mermaid；`--dot` 出 DOT，`--levels` 连关卡一起画）；`npm run new-domain -- <名字> --mechanism <机制>`、`npm run new-game -- <id> --domain <领域>` 生成新领域和新游戏（第 6.3 节）；`npm run op -- <游戏> …` 用操作集改内容（第 7 节）；`npm run mcp` 起 MCP 服务器（第 7 节）；`npm run studio` 在开发服务器上打开 studio（第 6.7 节，`GAMES_ROOT` 让它改一份副本）；`npm run conform` 在真的 Linux 上跑模拟内核的一致性用例；`npm run pipeline -- <游戏> <命令>` 跑 agent 流水线的一步、它的闸门、它的记录（第 7.2 节）；`npm run build:games` 构建所有游戏（`GAME=<id> npm run build:game` 构建一款），产物在 `dist-games/<id>/`；`npm run publish:content` 只换内容不重建代码；`npm run versions` 存下词汇表的新版本。新游戏要在 `games/games.js` 里登记，`check`、构建和发布都按这张表走。

**现状和待做：**

- 所有游戏都是数据游戏：内容只有 JSON，领域给出词汇表（`kit/domains/<领域>/vocabulary.js`），封装件跑学习者的电路（《句法之图》《软件工厂》没有封装件）。
- 图像领域借用笔记站的插图和基础样式（`trace-viewer/src/figures`、`index.css`），所以 kit 对 `trace-viewer` 还有这一处依赖。
- 《证明完毕》（`games/qed`）第 0–15 章都已做：`kit/domains/logic` 给出证明关（规则即元件，假设框是画布上的框：区域左边给出假设，区域里证出的接回框的输入口）、真值表、真值电路、规则板、机器板等十一种关卡，词汇表和两个入口。证明板上证出的引理跑证出它的那块证明板：每个形状跑证出那个形状的那段任务的板，字母换成这次用到的句子，给出的是那块板推出的东西；那块板对这几句推不出陈述时（比如任取框选的名字正好出现在这几句里），引理不给结果，说出是哪一关的证明、在这里差在哪。证明项不变，仍是它的名字套在前提的证明项上（第 13 章起写证明项要用到）：命名的定理按名字用。归结（`card`）是唯一的例外：它照 kit 的卡片跑，对任意长的子句、任意位置的一对文字都行，这超出了一个证明的任何一个实例。
- 《句法之图》（`games/syntax-graph`）拆计算机论文里的长难句，已有前三章：`kit/domains/syntax` 给出分词、把关卡用词写的答案变成下标、折叠（一段修饰成分收成一块，挂在它修饰的词上）和标主干的规则（放的时候拒绝切开已折的块、修饰成分跟着它的词走）、与答案的对照（挂错时说出那样挂的意思）、词汇表（成分和结构、机体）和 `game.jsx`；`validate` 查每句答案自洽、能按某个顺序折出来、只用这一关已有的结构。一句话是一行词，不走电路编辑器，也不用词序条。
- 《软件工厂》（`games/factory`）已有第 0–2 章：`kit/domains/agent` 给出确定性的模拟模型（`model.js`，每条规则一个单元测试）、抽象仓库和测试报告（`world.js`）、每轮跑一遍板的机器（`run.js`）、第 0 章玩家自己当循环的手动关（`hand.js`）、词汇表和两个入口；板上的运行用 `usePlayback`，一轮是一步。
- 逐拍世界（`engine/ticks.js`）、有状态多输出的封装件（`engine/boards.js` 的 `packed`：`outputs`、`holds`）和波形图（`shell/Timeline.jsx`）已经做好，《车在说话》（`games/bus`）第 1 代的前九关跑在上面；《从一根线开始》（`games/network`）还只有设计文档，到时用同一套。换代时把下一层收进世界的整帧的线还没做，跟《车在说话》第 3 代一起做；它是对「封装件跑学习者的电路」的例外，要在原型里看玩家能不能接受。
- 桌面画布拒绝一根线时，会在板子上说出 `parts.refuse` 给的原因（手机格位原本就有），所有电路游戏都受益。
- 《一切皆文件》的领域模块只有引擎部分（模拟内核、逐行机器、一致性用例，都有单元测试），还没有关卡界面和 `defineXGame`；第一个原型关卡做出来时再加。
- 电路关界面（`kit/shell/CircuitLevel.jsx`）：《软件工厂》的板、《车在说话》、《证明完毕》的证明板、机器板和真值电路已经用它；《视觉完备》（`image/ui/LevelScreen.jsx`）和《状态之图》（`table/ui/modes/Circuit.jsx`）还是各写一份。这两款游戏按专题重做时换上它，不再单独迁移；新游戏的电路关一开始就用它。
- 最后一次运行（第 6.10 节）：只差《视觉完备》的电路关，它按专题重做时换上 `CircuitLevel` 就接上了。同一处还要改：《视觉完备》的探针关和参数台画在它的电路关界面里，手机上多套一层 `PinnedPlay`，窗口跨过手机宽度时它们被重新打开，运行和参数台的旋钮都回到开头。
- 代价度量：引擎有 `score` 钩子，《视觉完备》算计算量，证明按步数；《状态之图》还没有。
- 封装件跑学习者的电路、步进到元件里面：契约测试查每个搭建关的元件是不是真的跑交给它的板，内置实现由领域的 `spec.builtIn` 声明（`image`：关卡解锁、不打包电路的元件；`logic`：门只跑通过了那一关的板，带 `card` 的引理照 kit 的卡片跑，比如归结）。《视觉完备》、《证明完毕》的机器板和真值电路、《状态之图》和《车在说话》已经跑电路；《证明完毕》的机器板能步进进去，真值电路上搭出的门和《车在说话》搭出的元件能在详情里打开（只读，元件上是这一行、这一拍的值），元件箱里也能看门跑的那块电路；《视觉完备》的封装件还不能展开；《状态之图》的封装件在元件箱里能打开，看它跑的那块电路（只读，元件上是试一试最近一次运行的值），关卡里运行时还不能步进进去；证明板上的引理跑证明，但还不能展开看里面。
- 机体升级的呈现。

Phone play locks the document and scrolls only its internal panels. Visual-viewport offsets are used only while
an editable field is focused, and are bounded by the space removed from the layout viewport. Elastic scrolling
must not translate the game root or hide the run bar; map pages retain normal document scrolling.
Phone result drawers start folded, including circuit levels. The player can expand them manually; Run/Step/Check
opens them to show the resulting feedback.

### 6.4 参数台

**电路拼不出来的机制用参数台**（机体的物理传感器、连续信号的采样、几万步的训练、几百次随机试验、一场对抗）：玩家不接线，只转旋钮、按按钮，看模拟怎么变。所有参数台是同一个界面（`kit/shell/bench/Bench.jsx`），数据和判定在 `kit/engine/bench.js`（node 下也能跑，`npm run check` 用它）。它放在内核，因为参数台不属于哪个专题：网络（窗口、重传）、总线（位时间）都会有。

一关的参数台全是数据，选领域的项、填参数：

| 字段 | 内容 |
|---|---|
| `model`、`setup` | 模拟：领域词汇表 `benchModel` 里的一项和它的参数。模型是代码：由旋钮算出一组有名字的量（`view`），会自己走的（训练、对抗、限时的轮）还有状态和动作（`start`、`act`，`after` 要求隔多久自动做一个动作，比如倒计时） |
| `knobs` | 旋钮：一段刻度（`min`、`max`、`step`）、一张表里的第几个（`values`）、几个选项之一（`choices`，`look: dot` 画成大小不同的圆点）、开关（`toggle`）、一列东西（`list`，在图上点出来）；`fixed` 只显示，`drawn` 在图上拖、不另画控件，`perCase` 每个情形一个值；`format`、`unit` 定读数怎么写 |
| `cases` | 几个情形，同一组旋钮要在每个上都过（几张图、几种外点比例）；头上一排切换，每个带对错 |
| `stages` | 一步一步走：每步的标题、说明、开哪几个旋钮（`opens`）、起点（`start`）、目标、过了说什么（`win`）、没过说什么（`status`），加上模型要的字段；过了才有「下一步」，走过的步可以回去。一个量有几个参数时一步开一个旋钮（第 1 节） |
| `actions` | 按钮：模型的一个动作（`act`，可以 `repeat` 若干次、每次隔 `every` 毫秒，运行中旋钮和别的按钮锁住，`always` 的除外），或把几个旋钮放回起点（`reset`） |
| `goal` | 目标：对模型算出的量的几条限制（`of` 加 `atLeast`、`atMost`、`above`、`below`，`near` 时比的是离它多远，`abs` 比大小，`is`、`not` 比相等），全部满足才过；一步可以有自己的目标。目标一条一行画出来，带此刻的值和要求（`≥ 40%`、`30 ± 1 mm`） |
| `check` | 目标怎样判：`live`（默认）随旋钮实时判；`submit` 只在玩家按「检查这个设置」时判，在那之前目标只写出要求、不显示读数，画面里模型算出的结果（成的像、光线、模糊）也不画，旋钮动了就要再检查一次。只开一个旋钮的一步用它，玩家才会先想再试，而不是拖到变绿（第 4.1 节） |
| `layout` | 版面：`head`（一行）、`main`（主卡）、`side`（旁栏，`split` 定宽）、`foot`（下面几行）；每处是一列块：显示项，或卡片（`panel`，`dock` 在手机上停在底部）、一列（`stack`）、一行（`row`，`narrow` 第一列窄） |

**显示项是封闭的。** 内核给：步骤说明、旋钮、按钮、结论（分步的带「下一步」）、目标、步骤列表、情形切换、曲线图（指向一处读数）、像素行、一段字、读数块、标签、小曲线、表、进度点。字可以写定，也可以是模型算出的（`{ of: 名字 }`）。每一项都可以 `when`、`unless` 一个模型的量（限时的轮在玩和不在玩时显示不同的东西），`with` 把别的项嵌进它里面。领域只补内核画不出来的图和交互，每一项要说得出为什么通用的不行：《视觉完备》的暗箱侧视图（在图上拖孔板和屏幕）、屏幕正面、霍夫的点和累加器（栅格加叠层）、RANSAC 的一次试验和每种比例一张卡、封面配点（在两张图之间拖）和点对列表、GAN 的分布图、对比学习的嵌入圆和选择表、核速判的一轮和四张核卡（限时作答）。会动的（GAN、嵌入圆、暗箱）由那个显示项自己缓动，减少动态时直接到位。

`npm run check` 对每个参数台跑模型项的 `verify`：这一关的课在这组数据上成立（起点不算过、能过、天真的做法过不了、每一步接受的答案正好是它说的那些，`passingSettings` 逐个设定试过）。


### 6.5 机制目录

一个专题先选机制，再写领域。机制是玩家手上的动作和引擎跑它的方式；同一个机制在不同领域里用不同的元件。下表是 kit 现有的全部机制。

| 机制 | 玩家做什么 | 适合 | 内核里的件 | 例子 | 缺什么 |
|---|---|---|---|---|---|
| 数据流电路 | 把元件接成一块板，输入一次流到输出 | 输入定了结果就定了的东西：图像处理的流水线、逻辑门、公式变换、协议头的字段 | `engine/circuit.js`、`engine/boards.js`（封装件）、`circuit/`（两个编辑器、蓝图文本）、`shell/CircuitLevel.jsx` | 《证明完毕》的真值电路；脚手架的 `circuit` 模板 | 《视觉完备》《状态之图》的电路关还是各写一份界面（第 6.3 节现状） |
| 逐步机器 | 搭一块板，机器按顺序在每一格、每一行、每一轮上跑它一遍 | 一张表一格格填（动态规划）、逐行处理、一轮轮调用（agent 循环） | `engine/machine.js`（`walk`）、`shell/usePlayback.jsx` | 《状态之图》（机器人填表）、《软件工厂》（一轮一步，经 `CircuitLevel`）、《一切皆文件》（只有引擎） | 没有内核的表格世界界面（《状态之图》用自己的 `usePlayer`）；没有脚手架模板 |
| 逐拍总线 | 搭一块每拍跑一遍的板，几个节点共用一根线（或几根点对点的线），寄存卡跨拍保存 | 状态随时间变：时序逻辑、总线和链路协议、计时和重传 | `engine/ticks.js`、`boards.js` 的 `holds`、`shell/Timeline.jsx`、`CircuitLevel`；脚手架 `tick-bus` | 《车在说话》（共用的总线）、《从一根线开始》（点对点的线，线是板的口） | 把下一层收进世界的整帧线还没做（网络第 2 代要） |
| 框 | 在元件的区域里摆元件，区域给出局部的值，只能在框里用 | 局部假设与作用域：假设推理、函数体、循环体 | `circuit/frames.js`（`framePart`），两个编辑器和 `model.js` 管区域 | 《证明完毕》的假设框、消去框 | 只在一个领域用过；它是电路上的一项，不单独成模板 |
| 词序条 / 分析 | 往一排类型化的位置里点词，或把一行词折成结构 | 写出或拆开一段有结构的文字：公式、证明项、句子 | `kit/strip/`（词序条） | 《证明完毕》拼公式和证明项；《句法之图》折句子（领域自己的界面，不用词序条） | 没有内核的关卡界面，两处都是领域代码 |
| 填表 | 逐行写一张表，每格一个编辑器 | 写清单式的规格：检验条例、情形、规则行 | `shell/RowTable.jsx`、`shell/FormFields.jsx` | 《证明完毕》的检验条例 | 只是界面件，放在领域的关卡界面里 |
| 参数台 | 转旋钮、按按钮，看模拟怎么变 | 拼不出电路的机制：连续量、采样、几万步训练、随机试验、物理传感器、对抗 | `engine/bench.js`、`shell/bench/`（第 6.4 节） | 《视觉完备》的暗箱、波、训练、RANSAC 等 | 只有一个领域用过；没有脚手架模板 |
| 纠错 / 修正 | 拿到几块别人的板，写一份配置去暴露错误，或逐块改对 | 检验和评审：找出错的证明、错的规格、错的实现 | `shell/useBoardCases.js`、`shell/TestTabs.jsx` | 《证明完毕》的 `play: 'audit'`、`'repair'` | 每块的判定在领域里，只有一个领域用过 |
| 读图填格 | 看一张小图的格子和坐标轴，填数、点格、报坐标、改一个像素 | 数据本身就是要学的东西：像素网格、坐标约定、通道、显示和存储的区别 | `vision/ui/GridScreen.jsx`（第 6.8 节） | vision 领域的 `grid` 任务 | 只在 vision 领域；别的领域要用时搬进内核 |
| 选择判定 | 把几个问题配到选项、选出一组情形、给论断归类；对错由领域按数据算出，不由作者逐条写死 | 判断题背后有可计算的事实：输出里有哪些字段、哪些场景与图像相容、哪组测试覆盖了要求 | `vision/judges.js`、`vision/ui/ChoiceScreen.jsx` | vision 领域的 `choice` 任务 | 同上 |
| 手动关 | 玩家自己当机器，一步步做机器以后要做的事 | 机器出现之前的前因：先手做，再搭 | 无专门的件（`StepLog` 列出步骤） | 《软件工厂》第 0 章（`domains/agent/hand.js`）、《状态之图》的纸笔一代 | 没有内核的件，每次是领域代码 |

**给新专题选机制。** 按专题的核心动作逐条问，一个专题常常用到几种，各放在需要它的章里：

1. 答案是不是输入定了就定了、算一次就出来？是：数据流电路（脚手架 `circuit`）。
2. 时间是不是专题的一部分：有状态、有先后、几方共用一条通道、要等、要超时？是：逐拍总线。
3. 是不是同一块小机器在一个结构上一格格、一轮轮重复？是：逐步机器。
4. 推理里要不要"先假设、再收回"，或者有局部的作用域？要：在电路上加框。
5. 产物是不是一段有结构的文字？是：词序条或分析。
6. 要发现的是不是连续的参数、统计规律，或者步数多到接不出来？是：参数台。
7. 要练的是不是判断别人的东西对不对？是：纠错或修正，作为一种玩法加在已有的板上。
8. 机器出现之前，玩家是不是该先自己当一回机器？是：手动关，放在机器那一章之前。

例：计算机网络从一根线开始，线上的位、帧、冲突和重传都是时间里的事，主体是逐拍总线；报文头的解析是数据流电路；窗口大小、丢包率和吞吐量的关系是参数台；路由表的收敛是逐步机器。《从一根线开始》第 1 代只用逐拍总线（`tick-bus` 模板起步的 `net` 领域）：线那头说的话按约好的格式编码、解码（字节、起止位、奇偶、校验位、汉明块、带位填充的旗标帧、带 CRC 的帧），要的东西或者逐拍对，或者不论时机按顺序对，或者看线那头解出了什么；参数台（「晚到」）推到第 2 代，因为一拍一位时发送时间还不要紧。选定以后，有模板的机制用 `npm run new-domain` 起步，没有模板的从表里的例子领域抄起，抄出来的领域照样要过契约测试。

### 6.6 play 钩子（盲玩暂停）

**盲玩暂时停用，也不出现在流水线、npm 命令、`check` 和 MCP 里。** 它的代码留在 `kit/engine/play/`（一局的记录、统计、CLI、盲玩 agent），恢复时再写回这一节和流水线。

留下来在用的是领域的 `play` 钩子（`domain.js`）：一关在文字里的样子（输入、输出、托盘里的元件、可见测试，画面写成文字）和对一次尝试的判定（照关卡界面的规矩跑可见测试和隐藏测试，失败时的话就是界面的话）。studio 和 MCP 的 `run_tests` 靠它在不开浏览器的情况下跑一块板。新领域照样给出这个钩子；参考解、naive 解、隐藏测试的内容不出现在它给出的文字里。

### 6.7 studio

**studio 是人审、改、玩内容的地方，是操作集上的一层皮**（方向见 `games/DIRECTION.md` 决策五）。`npm run studio` 在开发服务器上打开它（`trace-viewer/studio.html`，代码在 `kit/studio/`）。它不认识任何领域，没有自己关于内容的逻辑。**一关在游戏自己的页面上改**：主区就是玩家玩的那一页，点上面的一段字、一个测试、一个任务的名字，右边的侧栏打开它的控件；改完就是玩到的样子，不在表单和试玩之间来回切：

- **一切修改都是操作。** 每改一处，studio 往一个待定的变更集里加一个操作（同一处连着改只留最后一个：一段文字打字时始终是一个 `text.set`，只带改了的那一面；一张表、一条波形改几格也只是那个字段的一个 `level.set`）；搜索替换、批量修改一次加几个操作，一关一个，加进去之前先列出来。服务器不写盘地跑这个变更集（工具 `preview`），答回它留下的内容、`npm run check` 的每一行（标明说的是哪几关）和改到的每个文件改前改后的文本。树、画面、字段、侧栏、文案表、比较、审计、变更集评审显示的都是这一份答复。应用就是 `modify`，撤销就是修改日志的 `undo`。
- **预览分两步，大游戏上也跟手。** 改完 0.12 秒先跑 `preview` 的 `check: false`（只按词汇表查内容），画面、树、侧栏、评审马上换上新内容，内容不合 schema 的地方也马上标在字段上；停手 0.7 秒后再跑整款检查（领域的检查要把每个参考解跑一遍），一次只跑一个，跑完时已经又改过就接着跑最新的那一份；这期间审计栏是上一次的结果、淡下去，「应用」等它回来才能点。量过（Playwright，开发服务器，副本）：《从一根线开始》1-12 打开到能编辑约 1.2–1.3 秒，整款检查回来约 11–13 秒；《证明完毕》「两个都要」打开约 1.6–2.0 秒，整款检查约 10–12 秒。在整款游戏里搜索一个词约 0.1 秒（《从一根线开始》27 处、《证明完毕》357 处，从打字到列出）；替换加进变更集后新内容回来约 0.5 秒（26 个操作）到 1.7 秒（351 个操作），整款检查约 9–20 秒。链接显示的名字（工具 `names`）只在改动可能改到名字时（改 id、挪关、改标题、`game.json`、百科）重取；领域没有画面（`scene`）的，不再去取。
- **服务器只是桥。** `kit/app/studio.js` 是开发服务器的插件，把 MCP 的同一组工具（`kit/engine/ops/tools.js`）开成 HTTP：`POST /studio/api/<工具>`，参数是 JSON；调用排成一队依次执行，和 MCP 一样，只有慢的读（整款检查的 `preview`、`run_tests`）走第二条道：一个工作线程里的同一组工具（`kit/app/studio-worker.js`），所以快的预览不排在它们后面；写盘的调用（`modify`、`undo`、写板的 `blueprint`）等两条道都空了再跑。`GAMES_ROOT` 让它改一份副本。studio 的工具要的东西凡是 agent 也用得上的，做成这组工具里的一个（搜索 `search`、替换 `replace`、git 里的旧版 `history`），不只做在页面里；搜索替换的逻辑是内核的一个模块（`kit/engine/ops/search.js`），页面边打字边用它，MCP 的两个工具也是它。

**界面：信息密，靠去掉多余的东西，不靠把字缩小。** 左栏是树或搜索，中间是画面（或字段、文案、比较、变更），右边是侧栏，审计在中间栏下面的抽屉里。一个字段一行摘要（字段页），控件在侧栏；控件里一个字段的名字在它左边（窄的地方——侧栏、窄屏——在上面），用着时下面一行写出词汇表的 `about`；几个短字段（数、开关、单行字、选项、几个小块）在宽处并排成几列；文字的两面并排（侧栏里上下排）；能折叠的都折成一行：一章、字段页的一段（折起来时这一行列出段里有哪些字段）、列表的一项（一行摘要）。字号和间距是 studio 自己的一组更紧的值（`studio.css` 开头，取 `kit/tokens.css` 的颜色和字体）。左栏（树或搜索）、侧栏可以拖动改宽，审计抽屉（检查的行很长，要整个中间栏的宽度才放得下、折行读完）拖动改高；双击或 Alt+[ / Alt+\\ / Alt+] 收起（抽屉收成一行：通过还是几处不过、几个待定），宽度、高度、收起、折起的章和段、搜索和审计的筛选，每个看的人记在自己的浏览器里（`kit/studio/prefs.js`，localStorage，取不到就用默认）。窄屏上三块依次排下来，文字的两面上下排。长的列表（文案表的几百行）交给浏览器跳过屏幕外的行（`content-visibility`），审计和搜索最多画出几百行、其余写一个数。样式取 `kit/tokens.css`、`ui.css`，顶栏和游戏、笔记站一样（语言、主题菜单）。

**几块：**

| 块 | 做什么 | 背后的操作和工具 |
|---|---|---|
| 树 | 每一章照地图的排法列出：主线（地基、练习）、并行组的分支（一路排在另一路下面，左边一道线）、专题、挑战；关和关之间有槽位（`kit/studio/tree.js`）。一关一行，右边几个小记号（`kit/studio/worklist.js` 的 `marksOf`）：不过的检查有几条（红色的数）、有待办或报告（一个点）、领域的检查（参考解、naive 解）过没过（方块：过、不过、还没查完）、几个测试；悬停写出每一个是什么。一章可以折起来。点一关选中它；Ctrl/⌘ 点再选几关、Shift 点选一段，就是批量修改（下面）。把一关（或选中的几关）拖到一个槽位（没有鼠标时点「移动」再点槽位）就是挪过去；有几个任务的关，下面一行一个列出它的任务（编号和名字），点一下在侧栏打开，拖到另一关上就排在那一关的任务最后、拖到另一个任务上就排在它后面（`task.move`，存下的板跟着任务的 id 走）；↑↓ 在关之间走（加 Shift 一路选上）。点一章看这一章，点游戏名看 `game.json` 的其余字段 | `level.move`（槽位就是 `ops/place.js` 的位置；几关一起挪：第一关到槽位，之后每关接在前一关后面）；`task.move` |
| 搜索 | 左栏的另一个页签（Ctrl/⌘+Shift+F）：在整款游戏里搜一个词或正则（区分大小写、整词），范围是文字的中文面、英文面、板的每一行、关卡和词条的 id（四个开关）；链接标签里面永远不算（替换不会弄坏链接）。结果按关分组，每处一行，前后带一段上下文（链接显示成它指向的 id），点一下跳到那个字段。写了替换的词，每处显示换成什么，可以逐处去掉；「替换」把剩下的写成操作加进待定的变更集（一段文字一个 `text.set`，只带改了的那一面；一块板一个 `level.blueprint`），「为什么改」空着时填上「把 X 换成 Y」——之后和别的修改一样在审计里查、在评审里看、应用或放弃。id 只搜不换（换 id 是 `level.rename`，会改到每一处提到它的地方） | `text.set`、`level.blueprint`；工具 `search`、`replace` |
| 画面 | 主区的第一个页签，选中一关时的样子：一个 iframe（`studio.html?play`，`kit/studio/play.jsx`、`GameFrame.jsx`），把变更集留下的内容交给领域的 `game.jsx`，在外壳里玩这一关，和游戏自己的页面一样；改了只换内容，这一关、这个任务、板和运行都留着。存档单独存（存在游戏 `studio.<游戏>` 名下），所有关都打开。**编辑模式**（默认；上方一个开关切到「试玩」，只剩游戏本身）下，外壳把画面上是内容字段的那几块标出来（`kit/shell/edit.js`：标题、目标的每段、每条提示、引言的每页、任务条上这个任务的名字、每个测试页签、带来的元件），悬停描一圈虚线，点一下就在侧栏打开它（不再当玩的点击；测试页签照样切到那个测试）；侧栏里选中的字段在画面上描实线。一个标记说的是它在画面上的位置（`at`，比如 `hint[1]`、`tests[2]`）和它属于这一关还是这个任务（`scope`），`kit/studio/marks.js` 照内容找到它是哪个字段：这个任务有就是任务的（`tasks[1].hint[1]`），否则是关的；画面拆成几段的一段文字是整段；内容里没有的（领域生成的字）侧栏说清楚。能加东西的地方有个「+」：加一条提示、一页引言（接在这一页后面）、一个测试（照最后一个复制）、一个任务（`task.add`，照正在做的这个任务复制、插在它后面，不带 id、名字和它自己的引言，所以马上能玩，画面跳到它）、没有引言的关上的「+ 引言」；只有字的新项是空的，等人写。编辑模式下引言不自己弹出，从顶栏打开；任务条一直在，所有任务都能点开。点树上的关就在画面打开它；「载入参考解」把参考板写进存档再打开（工具 `seed`）；Ctrl/⌘+Enter 一步做完 | `text.set`；`level.set`（加项是整张列表的一个 `level.set`）；`task.add`；工具 `seed` |
| 字段 | 主区的第二个页签：一关、一章（`game.json` 的那一项）、`game.json` 的每个字段一行（`kit/studio/Rows.jsx`）：字段名、一行摘要（列表是几项和前几项）、改过的点、检查说到它的条数；一关的任务每个一组（头上是任务的 id 和名字），组里是这个任务的字段。点一行就在侧栏打开它。没有画面位置的字段（课程、答案、`game.json`）在这里改，画面上有的也能在这里一眼看全。一关分成几段：玩家读到的（文案）、谜题、测试、答案、课程（带来和搭出的元件、沿用）、任务；每段可以折起来（记住，对每一关都一样），Alt+1… 跳到第几段。头上一行是 id、标题、形状（`S.by`，几层就几个，切换时保留两种形状共有的字段；`S.either` 的写法按各自独有的字段起名）、各段的跳转和几个图标：试玩、载入参考解试玩、移动、复制成新的一关（`level.add`，放在它后面）、删除（`level.remove`）；能改 id（`level.rename`）。可选字段缺着时是一排「+ 字段名」，点了加上空的并在侧栏打开。选中一章时，这一章自己的字段在上（关卡放在哪里的那几个字段收起来，那是树的事），下面是这一章的文案表 | `level.rename`、`level.add`、`level.remove`、`level.set` |
| 元件 | 左栏的第三个页签：这款游戏 `parts.json` 里的每个元件（图标、名字、类型）和每份设置预设，一行一个；「+」加一个空元件，选中一个时「复制」「删除」。选中一个元件，画面页签是它的样子（`kit/shell/parts/PartPreview.jsx`，在游戏自己的页面里画，所以值、图标、配色和玩家看到的一样）：桌面卡片、手机格位、详情三面并排，设置能当场拨动；三面下面是它的运算、交互规则和检查，照 `parts.json` 写的式子一行一个（检查旁边一个点：此刻成立没有）。点一个设置、一个块、一面、一个式子，侧栏打开那个字段（还用默认的一面第一次点开时，写成它的默认块）；每面右上的「+」加一个块，`+ rule`、`+ check` 加一条规则、一条检查。字段页签是这个元件的全部字段，头上能改类型名（`part.rename`）、复制、删除 | `part.add`、`part.remove`、`part.rename`、`parts.set`、`parts.unset`、`text.set`（`in: parts`） |
| 侧栏 | 右边，选中的一个字段：从画面上点的、字段里点的、检查结果（F8）、命令面板、搜索结果跳过去的，都在这里打开（跳过去的光标落进它的控件）；一个任务的字段在别的任务上时画面跟着换到那个任务。头上是它的路径（`1-1 › tasks › 2 › brief`），每一步都能点，回到外层的字段（点关的 id 是整关的全部字段）；下面是词汇表的 `about` 和按 schema 生成的控件（下表，和以前表单的同一套）、检查说到它的话、改回去的 ↶。列表里的一项能上移、下移、复制、去掉，可选的字段能去掉，还没有的可选字段能加上。一个有 id 的任务的工具是任务操作：上移、下移、复制成新的任务、去掉（不是这一关唯一的任务时）、挪进另一关（排在那一关的任务最后；这一关只有这一个任务时是「并进」，同时删掉这一关）；改它的 `id` 是 `task.rename`。什么都没选时，侧栏说怎样选 | 控件的操作（下表）；`task.move`、`task.add`、`task.remove`、`task.rename`、`level.remove` |
| 批量修改 | 树上选了几关时表单换成它：对这几关都有的一个字段，用 schema 给的同一种控件写一个值，「全部设成这样」或「全部去掉」；按 JSON merge patch 改几个字段；给带来的元件（`adds`）加上、拿掉几样；一起移动（再点树上的槽位）。先列出要加的操作（一关一个）和跳过的关、为什么跳过（没有这个字段、已经是这个值、不带元件……），再加进变更集（`kit/studio/bulk.js`） | 一关一个 `level.set` / `text.set` / `level.blueprint`、`level.unset`、`level.patch`、`level.adds`、`level.move` |
| 文案表 | 中间栏的「文案」页签，也是一章的表单下面那一块：一章（这一章自己的文字和它每一关的全部文字，按课程顺序）、整款游戏（再加 `game.json` 的文字）或百科（每个词条的标题和正文）的每一段文字一行，左边是关和字段、右边中英两栏，直接改；`check` 和文案 lint 查出的问题在这一段的角上标个数，光标进去就列出来。可以只看某个字段（目标、提示、点题……）、只看有问题的行、按词筛选：一遍读完一章的文案并改好（`kit/studio/copy.js`） | `text.set`（关、`game.json`、百科） |
| 比较 | 中间栏的「比较」页签：选中的这一关和另一关逐字段比（文字两面各一栏、改了的词标出来，板一行一行），或者和它待定修改之前比，或者和 git 里某一版比（默认 HEAD，工具 `history`）；点一个字段的路径就跳到它 | 工具 `history` |
| 审计 | 中间栏下面的抽屉，一张工作单（一行写全，长的折行）：`check` 的每一行一行（`kit/studio/worklist.js`：严重程度——不过、待办、报告、通过——哪条规则、说的是哪几关），不过的在最前；按严重程度（四个开关，各带条数）、规则、只看选中的关、关键词筛选；F8 / Shift+F8 一条一条往下、往上走，每走一步在侧栏打开这一行说的那个字段（说不到字段的选中它说的那一关），点一行也一样；每次改动后重算 | `preview` 的 `lines` |
| 评审 | 待定的操作一条一行，用操作集自己的话说（`says`），可以单独去掉，或者撤回到某一条之前；撤回和 Ctrl/⌘+Z 去掉的操作能放回来（Ctrl/⌘+Shift+Z），有新修改时清空；一句「为什么改」；每个改到的文件按字段读（`kit/studio/diff.js`、`DiffView.jsx`，比较页签用的也是它）：文字两面各一栏、改了的词标出来，板一行一行；列表按留下的项对齐，只列出加上、去掉和原地改了的那几项；其余的值改前改后，长的对象缩进显示；也能切成逐行 diff；然后「应用」（全部清零才能点）或「全部放弃」。下面是修改日志，最后一次没撤销的修改旁边有「撤销」 | `modify`、`log`、`undo` |

**命令面板和快捷键。** Ctrl/⌘+K 打开命令面板（`kit/studio/palette.js` 编索引和排序，`Palette.jsx`）：每一关（id、地图上的关号、两面的标题）、每一章、正在改的这一关的每个字段、百科的每个词条、检查的每一处问题、最近改过的字段，和 studio 的每个动作（搜索替换、文案表、比较、试玩、载入参考解试玩、复制成新的一关……要一个新 id 的动作在同一个框里问、移动、换 id、下一处 / 上一处问题、去掉 / 放回操作、收起左栏 / 检查栏、快捷键表）；打字时按开头、词首、中间、按顺序出现的字母排序；`>` 只搜动作，`@` 只搜这一关的字段。? 打开快捷键表（`Shortcuts.jsx`），面板里每个动作旁边写着同一个键。

**通用控件是内核的，领域不写编辑器。** 画面上的标记也是内核的：外壳的共用部件（`Brief`、`TestTabs`、`IntroSheet`、电路关的元件栏）标出它们画的字段，领域的关卡界面用这些部件就自动有了，不另写。 控件在 `kit/studio/`（`Fields.jsx`、`TextField.jsx`、`Picker.jsx`、`Cells.jsx`），由内核维护；一个值用哪个控件由 `form.js` 的 `formOf` 按 schema 的形状决定，形状说不清的地方由词汇表在 schema 上写**提示**（`kit/engine/schema.js` 的 `HINTS`，是数据，不改变值能是什么，契约测试查它的取值）：`view: 'expr'`（元件的式子，第 6.9 节）、`view: 'icon'`（图标表里的一个名字）、`view: 'grid'`（一串串数是矩阵；一串数按 `cols` 一行，不写就是方阵）、`view: 'ticks'`（每拍一个值的列表、一串 0 和 1 的字符串，或它们的映射，一个信号一行）、`step`（数一次加减多少）、`section`（一关的字段归哪一段；不写时按形状：有板的是答案，提到关的是课程，只有文字和插图的是文案，其余是谜题）。按值的种类：

| 值 | schema 的形状（和提示） | 控件 |
|---|---|---|
| 中英文字（引言、目标、提示、点题、百科） | `S.text()` | 中英并排、随内容长高；`<level-ref>`、`<part-ref>`、`<wiki-ref>` 显示成带名字的小块（关卡号和标题、元件名、词条名，取自工具 `names`：外壳拿到的同一个游戏描述），不是标签文本；🔗、Ctrl/⌘+L 或打出 `[[`（中文键盘的 `【【`）打开搜索关卡、元件、词条的列表，插进光标处；选中一段字再按 Ctrl/⌘+L，这段字就是搜索词，选中的链接替换它；另一种语言有、这一面还缺的链接排在列表最前（Enter 直接补上）；Esc 回到原处（贴进来或打出来的标签也变成小块）。改标题会改链接上的名字，重画时光标留在原处；`check` 查文案的那几条（两面都有、链接存在且两面一样、不按位置指关卡、不用「名字」代替链接）和文案 lint（`kit/pipeline/lint.js` 的 `lintText`：禁用词、往后透露、长度、点题提元件、目标讲理由）边打边写在下面（文案表里是角上的一个数，光标进去才列出） |
| 名字、id、句子 | `S.str()` | 单行输入，不合 `pattern` 时标红 |
| 数 | `S.num()`、`S.int()`（`min`、`max`、`step`） | − / + 和输入框；两端都有时加一条滑块 |
| 词汇表里的项、几个固定值、这款游戏的关 | `S.ref`、`S.oneOf`、`S.level` | 几个短的值并排成一排按钮；多的是可搜索的列表，每项带词汇表的 `about`（`S.call` 的项还列出它的参数名），关按课程排、带地图上的关号和标题、按章分组 |
| 一项和它的参数 | `S.call` | 同上选项，下面是参数自己的控件 |
| 几个项、几关 | `S.list` 的元素是上面那种 | 一排小块，× 去掉，+ 从列表里加 |
| 一串数 | `S.list(S.num())` | 一行格子：打字、方向键、贴一串数、加减一个 |
| 矩阵、卷积核、小图 | `view: 'grid'` | 可编辑的表：打字，方向键和回车移动，从电子表格贴一块（从这一格铺开，不够就加行加列），加减行列，格子按数值深浅着色，刷子（定一个值，按住拖过的格子都涂成它） |
| 一排记录、键值 | 元素是只有标量字段的对象或映射的列表（《证明完毕》的 `cases`）；标量的映射（`premises`） | 一张表，一个字段一列（映射的列是各行用到的键，可以加一列），键值映射是键和值两列 |
| 波形、位串 | `view: 'ticks'`，或元素是 0 / 1 的列表（自动） | 一格一拍、上面有拍号的条：点一下翻转 0 / 1，按住拖过去一路涂成同一个值，空格翻转、0 / 1 直接写、Delete 写成「—」（schema 允许时），双击写一个数；几条信号上下对齐，可以加一条；末尾加减一拍 |
| 列表 | 其余的 `S.list` | 每项一行：把手拖动或 Alt+↑↓ 换位置（整张列表一个 `level.set`），复制、去掉；对象项多于两个时收成一行摘要（它的第一段文字或前几个值），点开是它的字段；只有一个字段的项不再写字段名 |
| 测试 | `section: 'tests'` 的列表 | 同上，每张卡片可以「运行参考解」：工具 `run_tests` 经领域的 `play` 钩子（第 6.6 节）按关卡界面的方式把参考解跑在这一关的可见测试和隐藏测试上，每张卡片标出过没过、画面说了什么，并显示关卡界面给这个测试画的样子（给了什么、应当是什么，比如总线的每一拍和输出应当是几）；钩子不支持的玩法写明原因 |
| 元件的运算、读数和按钮的式子 | `view: 'expr'` | 一行等宽输入，边打边解析、边查（调用的资源、参数、输入和设置）：错在哪一处标在下面；旁边一个列表列出这个领域的全部引擎资源，带说明和参数名，点一下插进光标处；输入口和设置也在列表里 |
| 图标 | `view: 'icon'` | 内核图标表里的图标排成一格格，可以按名字筛 |
| 板 | `S.board()` | SVG 缩略图（`kit/circuit/svg.js`），点它就切到画面，在游戏自己的电路编辑器里打开这块板，编辑器上「用作 <字段>」把板写回这个字段（`level.blueprint`），「不用这块板」放弃；「蓝图文本」可以直接改，读不进的行写在下面 |
| 其余 | `S.any()` 和说不清的形状 | JSON |

板在侧栏里画成 SVG（只读蓝图文本，不认识领域：每个元件一个框，写上类型、名字和设置，按读谁排成列；框的区域画在框里；关卡给的节点在两边）；电路编辑器就是游戏里的那一个（`kit/circuit`，经外壳的 `SlotsContext.take`），所以元件、托盘、接线规则和玩家看到的完全一样。领域可以给一个**显示**：`domain.js` 的 `scene(spec, 关卡)` 把一关无头地画成 SVG（《车在说话》画每个测试总线上的波形和帧），表单头上显示它，MCP 的 `render` 也给它；领域不给编辑器。

**提示用在哪里**：`view: 'grid'`——《状态之图》的矩阵（花费、金币、能量、图）、《视觉完备》的卷积核（`kit/domains/image/items/targets.js` 的 `KERNEL`、赛车台的核）；`view: 'ticks'`——《车在说话》测试的输入，《从一根线开始》测试的输入、`given` 要的值、位串 `bits`；`section`——每个领域的测试列表（`tests`、`hidden`，《证明完毕》的 `cases`、定义关的测试）是 `tests`，带来、折叠、搭出的元件和展示理由（`adds`、`fold`、`builds`、`unlock`、`grants`、`packs`、`showcase`……）是 `course`，有任务的关的 `tasks` 是 `tasks`，《视觉完备》带插图的引言是 `read`。

**没有做的控件和原因**：图像（按像素画的图）——内容里没有按像素写的图，《视觉完备》的图都是有名字的图案加参数（`S.call('picture')`），《状态之图》的小图是数的矩阵，用矩阵的刷子；世界——各领域的世界参数都是上面这些形状的组合（坐标对、矩阵、记录），没有一个需要单独的控件；坐标对的列表（石头、墙、陷阱）没有在棋盘上点格子的控件——要知道棋盘大小就得认识兄弟字段 `R`、`C`，需要一个说明「这些点落在哪张格子上」的提示，留到按专题重做时有内容用它再加。「运行参考解」在《状态之图》的电路关上不可用：它的 `play` 钩子只能在一局之内从头玩到这一关时打开，单独打开一关时读不进参考解（`run_tests` 照实报出读不进的行）；《证明完毕》的证明板钩子不支持（第 6.6 节）。

**没有做的工具和原因**：搜索不搜文字和板以外的字符串（元件的名字、端口名这类 `S.str()`）——它们多半是领域的标识，替换要像换 id 一样改到每一处引用，只换一处会弄坏内容，要换就用对应的操作；替换没有「换 id」——那是 `level.rename`，命令面板里有；批量修改不批量删除关卡（`level.remove` 一次一关，别处还提到它时拒绝，批量删只会得到一串拒绝）；比较不比较两章、整款游戏（评审页签已经逐文件给出整个变更集的字段级 diff）；命令面板不做模糊的全文搜索（那是左栏的搜索）。

**已在浏览器里走通**（Playwright，在副本上，`GAMES_ROOT`；副本放进一个 git 仓库，好比较 HEAD）：《从一根线开始》1-1 在画面上点任务条的「+ 任务」（加一个 `level.set tasks`，画面跳到任务 2）、点任务 2 的目标在侧栏两面各打一句、在「字段」里点任务 2 的 `wires` 把进线的延迟加一拍、回到画面点「+ 测试」（加在画面正在做的任务上），评审里 4 个操作，整款检查清零后应用，写进 `levels/1-1.json`，整款检查里这一关三个任务各自 PASS；《证明完毕》《视觉完备》《状态之图》《软件工厂》《车在说话》《句法之图》的画面上标出标题、目标、提示、测试，点目标在侧栏打开它（《状态之图》的目标是领域拼的字，侧栏说明它不是内容里的字段）。之前一轮：《从一根线开始》——命令面板跳到一关（按英文标题）、跳到一个字段（`@hint[1]`，光标落在那里）、「复制成新的一关……」问 id 后加一个 `level.add`；Ctrl/⌘+Z 去掉、Ctrl/⌘+Shift+Z 放回；搜索 flag（整词，只搜文字）27 处、去掉一处、替换成 banner 加进 26 个 `text.set`，审计清零后应用（写盘，去掉的那一处原样）、撤销后除了修改日志之外的文件和原来一字不差；文案表整款游戏 330 行，在一段中文里打「搞定」，角上立刻标出文案 lint，「只看有问题的」剩这一行；选两关批量写一个 `note`、给 `adds` 加一个元件、一起挪到第一章开头，评审里是 6 个操作；审计打开「通过」后 38 行、只看 `domain` 规则 34 行，F8 跳到第一条报告说的那一关；比较页签和改前比、和 HEAD 比各 1 个字段，和另一关比 48 个字段；Ctrl/⌘+Enter 载入参考解试玩；? 的快捷键表；左栏拖宽 100 像素、审计抽屉拖高 200 像素，重新载入后都还在；抽屉收起后 F8 把它打开；《视觉完备》打开「通过」后 400 行检查在 1440、1100 宽下整行折开读完，页面不横向撑开。《证明完毕》——搜索 proof 357 处、替换成 derivation 加进 351 个操作，整款检查清零后放弃。之前一轮：每种控件改一处，变更集里是预期的那个操作、审计清零（《车在说话》1-6 的文字、链接、波形、测试和运行参考解，《状态之图》「最省力」的矩阵、贴块、刷子、提示换位置，《证明完毕 · 试做》的表，《视觉完备》1-1 的 `views`、卷积核和 ↶，《软件工厂》1-5 的电路编辑器浮层；应用、撤销）；在《软件工厂》第 1 章上读完全部文案、改文案、改测试、挪关、在电路编辑器里改参考板、看审计变红又清零、试玩、应用、撤销。

**还没有的**：画面上的标记只有外壳的共用部件画的那些：领域自己画的东西（参数台的旋钮、表格领域的世界参数、总线的波形）没有标记，在「字段」里改；手机宽度上的托盘也没有「带来的元件」的标记（studio 是桌面上用的）。百科的文字能在文案表里改，词条的其余字段（分组、`at`、`see`）和加删词条还只能经命令行和 MCP 的操作；评审里写给 agent 的意见还没有去处（决策五的「驳回并写意见」要等阶段 5 的流水线来读它）；拖动和槽位只覆盖 `level.move` 能放的位置（不能新建并行组或专题，那要先改 `game.json` 的那一章）。

### 6.8 vision 领域

**计算机视觉按专题重做时用的领域**（`kit/domains/vision/`，从数据流电路模板起步，一关是一串有 id 的任务）。领域展示与学习验收还需遵守 `kit/domains/vision/DESIGN.md`；教学可用性不由数值测试代替。它把课程规格（`docs/Unimelb/26S2/CV/vision-game-specs/`，第 0、1 章）要的能力都备好：值、元件、四种任务、判定、场景和参数台；`vision-lab` 已有前两章试做内容；`starter/` 只放每种任务各一个的最小样例，给 `new-game` 和契约测试用，不是教学质量样板。原型《视觉完备》的 `image` 领域不动，随阶段 6.5 退下。

**值。** 线上走的是数（`null` 是「—」）、二维向量 `{ x, y }` 或图像 `{ w, h, c, data }`。成对出现的坐标量（位移 dx、dy，每轴的半径）是一个向量输入、一个输出口，不拆成两张输入元件；测试里写成 `{ "x": 1, "y": 0 }`，任务输入标 `type: "vector"`。图像 `c` 为 1 是灰度、3 是 RGB，按行存、同一像素的通道挨着（`vision/image.js`）。内容里一张图写成行：灰度是数的行，彩色是 `[R, G, B]` 的行；坐标零起，x 向右、y 向下，读 `I[y, x]`。值是实数，计算里不偷偷截断；只在画出来时把 [0, 1] 之外的值截到两端（显示和存的数分开，`1F1`）。测试按尺寸、通道数和每个值比，容差默认 `1e-5`（任务可写 `tolerance`），不对时说出第一个不同的格子：哪一格、应当是多少、板给了多少。

**逐像素取样是成片算的。** 不另做「每个像素跑一遍板」的机器：一张图上的每个坐标排成两张坐标图，算术逐元素作用在整张图上，取样按坐标图一次取完。基础运算和理论工具由课程按学习目标选择；裁剪等坐标关系可以由玩家搭建，采样与邻域计算可直接提供（`vision/parts.js`）：

| 元件 | 做什么 |
|---|---|
| 常数 `const` | 设定的数 |
| `add`、`sub`、`mul`、`div`、四则运算 `arithmetic` | 逐元素的加减乘除；数和图、图和图（尺寸相同；单通道可以对上三通道）、向量和向量、向量和数（逐分量）都行；向量和图不能混算；除以 0 报错 |
| `floor`、`min`、`max` | 向下取整、取小、取大（用于需要研究这些运算的课程，不要求视觉理论课程考核其实现） |
| `less` | a < b 为 1，否则为 0 |
| `select` | 条件不为 0 取「是」一路，否则「否」一路（逐元素） |
| `size` | 图的宽 `w`、高 `h`（两个输出） |
| `grid` | 给定宽高，出两张坐标图 `x`、`y`：每格的值就是它自己的坐标 |
| `lookup` | 在图上按坐标取值：坐标是数就取一个值，是坐标图就取出同样大小的一张图；坐标必须是整数；出界时按设置 `outside`：报错（默认）、取 0、取最近的边 |
| `channel` | 彩色像素里第 c 个位置（元件上的设置 `c`：0、1、2）组成的灰度图；位置不是颜色：RGB 图的 0 是红，BGR 图（OpenCV 读进来的）的 0 是蓝 |
| `compose` | 三张同样大小的灰度图拼成彩色图；尺寸不同时报错 |

**四种任务**（任务的 `kind`；一关的任务可以混用）：

| 任务 | 玩家做什么 | 怎么判 |
|---|---|---|
| `circuit` 电路 | 接一块板，输入口和输出口由任务给，测试和隐藏测试是数或图 | 每个输出的尺寸和值。「—」是元件给出的值，可以是期望；输出没有值（没接线、上游缺输入、某块元件停下报错）不算「—」，任何期望下都不过，并说出是哪块元件、为什么停。搭出的元件跑玩家通过时的板 |
| `grid` 读图填格 | 看一张图（数字、画面或两样都看），按 `ask` 做：`copy` 把它的数照抄进空格子，`pick` 点出给定坐标的格子，`locate` 写出高亮格子的坐标，`set` 把一个像素改成给定的值，`fill` 填一张按任务答案大小的格子（采样位置、显示值……；可带 `strip`：画出新旧两排等长的像素条，玩家填的 x 标在旧像素条上）。格子里能填小数、负数和分数（−1/6） | 按领域算出的答案比：照抄的是图本身，点格和坐标按约定换算，改像素要别的格子不变 |
| `choice` 选择判定 | 一轮一轮回答（第一轮公开，后面几轮换了数据，答对一轮才出下一轮）：每个问题选一个或几个选项 | 判定是词汇项（`vision/judges.js`），由数据算出正确答案，不靠作者逐条写死：`answer`（写明的答案）、`fields`（选项给出的字段够不够、是不是刚好）、`match`（问题的某个属性等于选项的值）、`claims`（一句论断在每个候选场景里真假：都真是成立，都假是不成立，有真有假是无法确定）、`cover`（选出的情形合起来覆盖要求的变化）、`refute`（选出推翻「每个预测都对」的情形，没有就选「没有」）、`pair`（两边量的是同一种东西）、`same`（候选场景和参照场景只差在 `vary` 那一样：视角或光照）、`project`（几组物高和距离在同一焦距下成像一样高、距离又不同）。答错时说出哪一题错、为什么（论断的话给出两个意见相反的场景）。读图填格和选择判定都可以写 naive 答案（`naive`：读图填格是一个答案，选择判定是每一轮每题的选项）和它为什么错：`npm run check` 查它确实判错，玩家交出同样的答案时，屏幕在判错之外说出这条为什么错 |
| `bench` 参数台 | 内核的参数台（第 6.4 节），模型是领域的 | 目标限制。`npm run check` 查这一课成立（`vision/benches/lesson.js`）：每一步的起始设置不过、有设置能过；任务必须写出玩家容易试的错误设置（`naive`，带为什么错），每个都过不了；写了 `holds`（这一课要教的关系）时，把能动旋钮的每个取值都试一遍，每个过关的设置也都得满足它，免得目标能绕开所教的关系达成 |

**受控的三维小场景**（`vision/scene.js`）：几个由长方体拼成的物体（类别、颜色、位置），可选的不透明挡板和地面，一架绕目标转的相机（方位、俯仰、距离、焦距）和一束平行光（方位、高度、强度，加环境光）。领域用光线投射把它渲成一张小的彩色图，带阴影。场景同时是事实：每个物体在不在画面里（有没有像素落在它上面）、深度、大小、颜色，`claims` 就在这些事实上算。`choice` 的一轮可以带一个能转视角、调光的场景（玩家自己去试），候选项可以带场景（画成图给玩家看）。`claims` 一轮的候选场景必须渲出同一张图（`npm run check` 查），玩家看到的就是这张图；这一轮除图以外让玩家知道的事（一个已知的大小、一个渲得出这张图的场景）写在这一轮的 `given` 里，显示在图旁边，不塞进某一题的题干；论断里的数要能由图和 `given` 推出或推翻，玩家算不出来的数不进题目。一句论断在一个候选场景里成立、在另一个里不成立时，领域找出一个能把两者分开的视角（绕目标转相机），答错时把这两个场景从这个视角画给玩家看——找不到这样的视角，`npm run check` 报错。

**参数台模型**：`pinhole` 针孔相机，用虚像平面（不倒像）：相机在原点，光轴是 +Z，像平面在 f，`u = fX/Z`、像高 `h = fH/Z`，旋钮是 X、H、Z、f（任务定哪几个能动），显示是侧视的光线图和像平面；可以放几个物体（`objects`，各从 X 到 X + H，各在自己的深度或旋钮 Z 上），可以加一块传感器（`sensor`：高、宽的毫米数和像素数，主点在中心），这时像平面上画出传感器的边，像跑出边外的物体虚着画、标出不在画面里，每个位置和像高另以像素读出（`u_px`、`h_px`），还读出像素焦距 `fpx`、竖直和水平视场 `fov`、`fovW`，以及画面里有几个物体（`inView`、`allIn`），目标可以用像素给出；`lens` 薄透镜：焦距 F、光圈直径 A、对焦距离，算出进光量（与 A² 成正比）、每个物体的模糊圈直径和是否清晰（不超过 `cMax`）、清晰的深度范围，显示是光线图和「模糊对深度」的曲线带清晰门槛。两个模型都说明自己是简化的教学模型，单位和适用范围写在任务的参数里。

**`play` 钩子**：只给玩家在屏幕上看得到的东西。电路任务用内核的 `circuitPlay`，图像写成数的行；读图填格给数表，只给画面时给每格看上去的亮度（0 到 9）；选择判定的场景写成画面里看得到的色块（颜色、范围、像素数，不给名字、类别和被挡住的东西），选项只给编号和文字，判定读的字段不给；论断答错时和屏幕一样，把分开两个场景的视角描述出来。参数台给出台上画的东西（显示项的说明，不给模型自己的说明：那里可能写着这一课要找的公式）、旋钮、每一步的目标和起始读数，一次尝试是依次试的几个设置，每个都回给屏幕上读得到的数：旋钮的值和目标里的量。还没覆盖的：带情形、按钮或要在图上点的台子（跳过并写明），以及选择题里转视角、调光的探索（只给起始的样子）。

**页面**：每种任务一个屏（`vision/ui/`）：电路任务在内核的电路编辑器上，卡片上的图画成小图；测试、结果和元件详情里的每张图放进同样大小的固定窗口（大小随屏幕定），有两种视图：简略（整张图等比缩放到刚好放进窗口，只画像素不写数）和信息（每格写数、按数字看得清的格子大小画、不缩放，手机上每格点得中），窗口里拖动看局部；结果区里一个开关（桌面在结果区头部，手机在输出那一行）同时切换屏上所有图像的视图，起初是信息，按玩家记住；读图填格画出图的数和画面（带坐标轴），下面是答案的格子、可点的格子或坐标框；选择判定一轮一轮出题，场景渲成像素图，可转的场景带滑块；参数台用内核的台子，领域只补三张图（针孔侧视、透镜光线、模糊对深度）。`vision/starter/` 是最小的游戏，四种任务各一个，只供 `npm run new-game` 和契约测试用，不是课程关卡。

### 6.9 元件定义（`parts.json`）

**元件是内容，引擎资源是领域。** 一款游戏的原始元件写在它自己的 `parts.json` 里：口、设置、运算、三面视图都是数据，studio 能直接改，`npm run check` 能查。领域只给**引擎资源**（词汇表的 `op` 种类，实现在领域的 `ops.js`）：一个有名字、有参数的基本运算，比如 vision 的逐值相加、按坐标采样、按核滤波；和**自定义控件**（`widget` 种类）：内核的控件画不出来的设置或显示。元件按游戏隔离（第 6.3 节）在这里是自然的：同一个领域的两款游戏各有自己的 `parts.json`，名字、说明、口、默认值互不牵动。关卡给的节点（输入、输出、线）和搭出的封装件不在 `parts.json` 里：前者是领域的，后者是关卡的。

```json
{
  "presets": { "outside": { "control": "select", "label": { "zh": "图外假设", "en": "Outside" }, "options": [...], "default": "zero" } },
  "parts": {
    "arithmetic": {
      "name": { "zh": "四则运算", "en": "Arithmetic" }, "desc": {...}, "icon": "Plus", "family": "value",
      "inputs": [{ "name": "a" }, { "name": "b" }],
      "settings": [{ "key": "op", "control": "buttons", "options": [{ "value": "add", "label": "+" }, ...], "default": "add" }],
      "compute": "match $op { add: add(a, b), sub: sub(a, b), mul: mul(a, b), div: div(a, b) }",
      "views": { "tile": [{ "show": "setting", "key": "op", "as": "label" }] }
    }
  }
}
```

**一个元件**：`name`、`desc`（只写功能，第 4 节；只写每个选项都成立的部分，某个选项特有的作用写在那个选项的 `about` 里）、`icon`（内核图标表 `kit/engine/parts/icons.js` 里的名字，外壳按同一张表画，`kit/shell/parts/icons.js`）、`family`（类别的颜色：领域词汇表 `family` 种类里的一项，颜色在领域的样式里）、`inputs`（每个 `{ name, label?, about? }`，`name` 是 ASCII）、`outputs`（只有一个输出时不写；几个时每个 `{ name, label? }`）、`settings`、`compute`、`nulls`（默认 `give`：任何一个输入是「—」就给「—」；`pass`：把「—」交给运算）、`rules`、`checks`、`views`、`width`（桌面卡片宽，像素）。

**设置的控件只有六种**，都是内核的（`kit/shell/parts/SettingField.jsx`），桌面卡片上紧凑、手机单子里加大，同一份定义：

| `control` | 是什么 | 自己的字段 | 值 |
|---|---|---|---|
| `select` | 下拉框 | `options` | 选项的 `value`（ASCII 字） |
| `buttons` | 小按钮组 | `options`，`layout`：`row`（一行，会折行）、`column`、`grid`（两两一行）、`pad`（上下左右四向，选项是 `up`、`left`、`right`、`down`） | 同上 |
| `number` | 数字 | `min`、`max`、`step`、`integer`、`unit`、`stepper`（两边加 − / +） | 数 |
| `slider` | 拖拉条 | `min`、`max`（必填）、`step`、`unit`、`marks`（刻度） | 数 |
| `toggle` | 开关 | `on`、`off`（两端的字） | 真假 |
| `custom` | 自定义 | `widget`（领域 `widget` 种类的一项）、`params`（合那一项的 schema） | 那一项说 |

每个设置都有：`key`（ASCII，写进蓝图文本）、`label`、`about`（悬停和单子里的一行说明）、`options` 的每一项也可以有 `about`（这个选项做什么：一句完整的话），`default`、`when`（只读设置的式子，为真时才出现：`eq($axis, 'x')`）、`fixed`（只显示，玩家不能改）、`use`（取 `presets` 里的一份，再用自己写的字段覆盖）。一份设置可以给好几个元件用（vision 的「图外假设」「空间轴」），也给搭出的封装件用（关卡的 `builds.settings` 列出预设的名字）。选项的 `{ value, label?, icon?, about? }` 里，`label` 不写就显示 `value`。课程可以只放出一部分选项（vision 的 `configurations`）：只剩一个选项时这个设置不再画出来，值就是它。

**运算是一行 ASCII 表达式**（`kit/engine/parts/expr.js`），只能调用领域的引擎资源：

```
a                     输入口 a 上的值
$op                   设置 op 的值（数字和拖拉条给数，开关给真假）
1.5   -2   'add'      一个数，一个字
add(a, b)             一个引擎资源，先按位置写参数，再写有名字的：sample(image, x, y, method=$method)
match $op { add: add(a, b), sub: sub(a, b), _: a }    按一个设置的值分开；_ 是其余的值
```

几个输出时 `compute` 写成 `{ 输出: 表达式 }`。每个式子除了领域的资源，还能调用内核的几个**内建资源**（`kit/engine/parts/builtins.js`，在纯数、字和真假上：`eq`、`ne`、`lt`、`le`、`gt`、`ge`、`and`、`or`、`not`、`if`、`plus`、`minus`、`times`、`over`、`round`、`clamp`），交互逻辑多半只用它们；领域的资源不能和它们同名。`if` 只算取到的那一支（`if(eq($b, 0), $a, over($a, $b))` 在 b 为 0 时不会除以 0），别的调用先算完所有参数。`npm run check` 查：调用的资源存在、位置参数的个数对、要纯数的参数不是输入、不是领域资源算出的值（`round(a)` 这样把一张图交给内建资源的式子在检查时就拦下）、有名字的参数是这个资源的、字面值和每个选项都合资源参数的 schema；输入和设置都存在；`match` 覆盖了那个设置的每个选项（或者有 `_`）；默认值在选项或范围之内；预设、自定义控件、图标、`when` 指的东西都存在；视图里的块指的设置和输出都存在。运算出错时（除以 0、图的大小不合）是资源报的错，写在卡片上。

**交互逻辑也是式子**，只调用引擎已有的资源，写法和运算一样（studio 里按同一个检查边写边查）：

- `rules`：一个设置改了以后，另几个跟着改。每条 `{ on?, when?, set: { 设置: 式子 } }`：玩家改了 `on`（不写就是改了任何一个）、`when` 为真时，`set` 里的设置换成算出的值，按列出的顺序，每条读前一条留下的设置（`kit/engine/parts/define.js` 的 `applyRules`）。
- `checks`：设置必须满足的条件。每条 `{ holds, say }`：`holds` 为假时元件不计算，报出 `say`（卡片上写出它，`failedCheck`）。
- 块 `action` 的 `set`、`when` 和块 `readout` 的 `expr`、设置的 `when` 也是只读设置的式子。

**三面视图**（`views`）：`card` 是桌面画布上卡片的主体，`tile` 是手机格位上的简略视图（`value` 块画在元件名上面，其余的块画在下面），`detail` 是两边共用的详情（桌面卡片头上的 ⓘ、手机点开元件的单子，控件加大）。每一面是一列块，不写就用默认：卡片是全部设置加值，格位是值加一行设置摘要，详情是说明、全部设置和值。只剩一个可选值的设置不画（课程只放出了一个）。块（`show`）：

| 块 | 画什么 | 字段 |
|---|---|---|
| `value` | 输出上的值，领域画（`defined.value(node, ctx, output, face)`：卡片上一个数、一张小图，详情里逐个输出细看） | `output`（几个输出时选一个） |
| `settings` | 设置的控件 | `keys`（只画这几个，默认全部） |
| `setting` | 一个设置：控件，或它此刻的值的字（`as: 'label'`） | `key`、`as` |
| `summary` | 一行设置摘要 | `text`：带 `{设置}` 的一句话；不写就是各设置的值的字，用「·」隔开 |
| `readout` | 由设置算出的一个读数 | `label`、`expr`（只读设置的表达式）、`unit`、`digits` |
| `action` | 一个按钮，按下把几个设置改成算出的值 | `label`、`set: { 设置: 表达式 }`、`when`（表达式：为假时按钮变灰） |
| `text` | 一段固定的字 | `text` |
| `desc` | 元件的说明 | |
| `ports` | 输入口和输出口，带名字 | |
| `widget` | 领域的显示项 | `widget`、`params` |
| `row` | 几个块排成一行 | `blocks: [块…]` |

例：vision 的「邻域加权」卡片上画方向、三个权重和边界，下面一个读数「权重和」（`plus(plus($a, $b), $c)`）和一个按钮「使权重和为 1」（`set: { a: over($a, plus(plus($a, $b), $c)), … }`，`when: ne(plus(plus($a, $b), $c), 0)`）；格位上一行 `{axis} [{a}, {b}, {c}]`。

**内核替领域做的**：`kit/engine/parts/define.js` 的 `defineParts(file, ops)` 把 `parts.json` 变成引擎的元件表（`inputs`、`outputs`、`params`、`settings`、`eval`），给出每个元件的默认设置；`kit/shell/parts/` 的 `faces.jsx` 给出编辑器的元件描述（名字、口、口名、类别、图标、卡片宽）、托盘的条目和卡片的三面（`PartFace.jsx` 画块，`SettingField.jsx` 画设置）。电路关用 `CircuitLevel` 的 `defined`：领域交出 `{ of(type) → 定义或 null, defaults(type), ops, value(node, ctx, output, face), widgets?, allowed?(type, key) }`，定义了的元件的卡片、格位、详情、设置和新元件的默认值都由内核画、内核给，封装件里面的板也一样；领域只画关卡给的节点和封装件。封装件的设置是 `parts.json` 里的预设（vision 关卡的 `builds.settings`），领域用同一个 `SettingField` 画。领域的 `game.jsx` 在游戏描述上挂 `defined = { of, defaults, ops, widgets? }`，studio 的元件页用它画元件（第 6.7 节）。领域的词汇表有 `op` 种类时，内容里的 `S.ref('part')` 指 `parts.json` 的元件（`kit/engine/parts/define.js` 的 `withParts` 把它们放进词汇表的 `part` 种类，检查和 studio 都用它）。

**操作**：`part.add`（新元件，或复制一个）、`part.remove`（还有关卡、课程或板用到它时拒绝）、`part.rename`（改到课程、关卡、板和 `configurations` 里的每一处）、`parts.set` / `parts.unset`（`parts.json` 里的一个字段，路径如 `parts.arithmetic.settings[0].options`、`presets.outside.default`），`text.set` 的 `in: 'parts'`。

**内容的形状**：`kit/engine/content.js` 把 `parts.json` 组装成内容的 `partDefs`（不叫 `parts`：原型游戏的 `game.json` 有自己的 `parts` 字段）。

**现状**：数据流电路的脚手架（`kit/scaffold/circuit/`）和 vision 领域的元件定义成数据，《视觉实验室》和两个 `starter/` 各有 `parts.json`。逐拍总线的脚手架和 `net`、`can` 领域的寄存卡、说话卡是有状态的元件，要等内核给出「有状态的引擎资源」（寄存、跨拍保存）再搬；原型领域（`table`、`image`、`logic`、`agent`、`syntax`）的元件仍在领域代码里，随阶段 6.5 按专题重做时换成 `parts.json`。自定义控件的机制已在内核（`widget` 种类、`SettingField` 的 `custom`），还没有领域用到它。

### 6.10 界面

所有游戏共用的界面原则和交互约定，改界面时照着做、改动时保持。颜色、字号、间距、圆角取 `kit/tokens.css` 的变量（几套主题都在那里调），这里不抄数值；某一款游戏特有的界面写在那款游戏自己的设计文档里。

**原则**

- **布局自己说话。** 不加次要的标签和说明：一块东西是什么，由它的位置和样子说清楚。结果区不加「测试 N」之类的标题，测试标签已经说了是哪一个；同一件事不说两遍：预期和结果里一样的输入只写一次。说明只在不写就看不懂时才写。
- **信息要密。** 能写在一行的不拆成两栏，不留只为对齐的空白；空间先给玩的地方和结果。
- **所有游戏一样。** 基本的界面和交互都由 kit 的共用件给（本节最后的「共用的件」），领域只交内容，不另排版面、不另做一套控件；改一个共用件就是改所有游戏，要在每种用到它的玩法上看一遍。
- **手机上的可操作性先于画面完整性。** 核心检查按钮使用共用运行栏；画面不能挤出控件，也不能把不可横向滚动的输入表藏在屏外。需要横向阅读的表明确提供滚动区域；彩色图编辑一次选择一个像素，再显示带通道名称的输入。输入与主要按钮至少有 44px 的触摸范围，并实际检查窄屏、滚动和键盘弹出后的操作。
- **兼容手机浏览器。** 不用较新的 JavaScript API（例如 `Map.groupBy`），旧版 iOS Safari 上会整页白屏；手机上点开元件也要试一遍。拖着手机格位上的元件或框时（连同贴边自动滚动），每挪一下都重画连着它的线，线头跟着口此刻的位置；放下或取消时回到排好的版面，拖的过程中不改任何接线。自动滚动只在原来的区域里滚，挪动中的元件和线不会把可滚动的画布永久撑大。

**版面**

- **每一关的版面都一样**（`kit/shell/Workbench.jsx` 和 `Layout.jsx` 的 `PhonePage`，关卡界面只交出各块内容，不自己排版面）。桌面：左边是任务；中间上方是玩的地方（画布、表、句子条……，可以带一行元件 `parts`）；下方是结果条：头部是测试标签和通过情况（有的话），下面左边是结果区（运行或检查给出的东西：输出、测试棋盘、运行过程、检查的结论；头部只放读数、视图开关这类控件），右下角一列是运行栏，检查、运行按钮永远在这里。结果条按内容定高，拖它的上沿可以调高矮。手机：一页，测试标签钉在顶上，中间滚动：任务卡、玩的地方，结果区接在玩的地方下面，不另开抽屉；底下是托盘和运行栏，运行栏固定在最底下。点运行或检查（或步进）时，页面滚到结果区刚好露出来。
- **关卡导航。** 地图是关卡树（第 2.5 节）。关卡里的关卡列表是从左侧拉出的抽屉，直接画每章的关卡树（紧凑尺寸），标出当前关，不做成列表，也不常驻占用版面。
- **通关窗口**只有"留在这里"和"返回关卡导航"，不直接跳到下一关；回到地图时，页面直接跳到刚才那一关（不平滑滚过去），并在顶部插图加载完之前一直对准它。外壳的滚动都写明 `behavior: 'instant'`，不受某款游戏页面带进来的全局 `scroll-behavior` 影响（《视觉完备》借用的笔记站样式里有 `html { scroll-behavior: smooth }`）。

**板上**

- **端口都是圆点。** 还没接线的输入口，圆点里多一个小圈（`--port-mark`：浅色主题淡灰，深色主题偏浅，各主题在 `tokens.css` 里调过），接上线就去掉，用来和输出口区分；桌面画布和手机格位一样，其他形状的端口，小圈跟着端口的形状（《状态之图》的菱形端口里是小菱形，`--port-mark-radius`）。
- **输入就是输入元件。** 机体读到的东西（视野、本格信息、手臂）直接画在画布的输入元件里，点一下就接上或断开，桌面和手机同一个模型；不另设一块输入面板。输入元件可以比其他元件宽（`parts.cardWidth`），默认摆放位置要按元件宽度留出间距，不能叠在一起。手机格位上，输入元件和输出元件一样两两对称并排、各占一半宽（独占一行的宽元件除外），里面的图居中。
- **预置的元件和线锁在板上。** 关卡的预置（第 4 节）由外壳放进新板和旧存档里（`circuit/model.js` 的 `withPreset`），标成 `locked`。共用的两个编辑器都守着它：每次改动都把锁住的元件和线放回去（`keepLocked`，蓝图导入、撤销也一样）；锁住的线不能拆、不能换（`lockedRefusal`，在板上说明原因）；锁住的元件没有删除按钮，拖出板外或拖进别的区域会弹回去；固定的设置项也一样放回预置的值（`isFixed`），元件上的选择框变灰。清空回到关卡的起点，预置还在。
- **手机上点开一个元件**，弹出的单子只有：它是什么、它的设置、它在当前测试上的结果，最后是「拿掉这一块」（`circuit/RemoveButton.jsx`）。接线只在板上点圆点完成，单子里不再给"读哪个结果"之类改接线的入口，所有游戏一样。
- **点一个按钮填一样东西**（一句话、一个值）用 `kit/shell/Popover.jsx`：桌面上在按钮旁弹出一个指着它的框，像装着编辑器的提示框，点框外或按 Esc 关掉；手机上是底部单子。改了立即生效，没有保存按钮。整关就是填这一样东西的（翻译关）不用它，编辑器直接摆在台面上。
- **撤销和重做**在桌面画布和手机格位上都有。**清空**也是画布自己的工具（`onClear`：桌面在右下角工具条最前面，手机在撤销、重做左侧），点了先弹窗确认，清空后仍可撤销；不放在运行栏里。手机格位和词序条上的清空按钮一直在，板上没有可清空的东西时变灰、不能点（kit 的 `ClearButton` 不给 `onClear` 就是这样）。
- **一关可以存多块电路。** 每个拼电路的关卡都能新建（空白或复制当前）、切换、重命名、删除几块电路图（`shell/slots.js`）。正在玩的那块就是这一关的存档（`progress.data`），其余的等在 `progress.slots` 里；切换时外壳让关卡界面从选中的那块重新开始。切换器由外壳经 `SlotsContext` 交给编辑器，不经过各领域的界面：桌面在画布左下角（游戏自己的角落工具，如《视觉完备》的「全部画成」，用 `corner` 放在它右边），手机在撤销、重做那一行的最左端。
- **电路的文本形式就是蓝图。** 多存档菜单里有「以文本查看 / 复制」和「从文本导入」（`kit/circuit/text.js`、`BlueprintDialog.jsx`）：把当前这块板写成纯 ASCII 文本，可以复制、存成 .txt，在任何记事本里改，再粘贴或打开文件导入；导入替换当前这块板，可以撤销。文本只写电路算什么（元件、设置、接线、框的嵌套），不写版面：同名同类型的元件留在原位，新元件由编辑器排开。写法：`名字 = 类型[设置](输入, …)`，按输入口顺序写来源，`_` 留空，`来源.键` 指多个输出里的一个；框写成按区域分开的代码块，区域给出的值读作 `框.区域`；接到关卡给的节点写 `out <- a`。导入时按编辑器的规则逐条检查（只能用这一关托盘里的元件、不成环、框里的东西不带出框、口的类型相容），出错按行列出。**元件的类型、口名和设置值都要是 ASCII**：新元件的口名和设置值直接用 ASCII 起名，显示用的符号放在标签里（《视觉完备》的平移方向是 `right`、`down`，按钮上画箭头；重参数化的口是 `mu`、`sigma`、`eps`，标签是 μ、σ、ε）。展示用的记号本来就是符号的（《证明完毕》的公式），由领域的 `parts.text` 在写出和读回时换成 ASCII 拼法（`->`、`&`、`|`、`~`、`forall x.`）；关卡给的节点上玩家能改的东西（《状态之图》输入元件读哪几格）由 `parts.text.sets` 列出，随蓝图一起写出。

**运行和结果**

- **测试棋盘**在画布下方的测试条里，居中，默认格子不大（《状态之图》26–34px）；表太大时在条里滚动，不撑满屏幕。
- **运行时每一步都重绘。** 测试一步一步跑时，每一步都要重画元件上的值，不能只重画棋盘；单步和连续运行都要看得到每个元件此刻的结果。
- **最后一次运行留在板上，直到离开这一关。** 一块板跑完以后（通过或失败，或停在单步的某一步），在关内切换任务、换一块存档再换回来，看到的都还是那次运行：每个测试的状态、停下的那一步、元件上的值、步骤列表。通关后玩家要能在关内回头查看结果。离开这一关（回地图或去别的关）运行就清空，不进存档，刷新页面也不留。外壳只在内存里按「任务 · 存档」给打开的这一关的每块板记一个很小的标记，关卡界面从 `lastRun` 读、用 `keepRun` 写（用 `CircuitLevel` 的电路关自动接上）：`usePlayback` 记走到了第几步（传 `kept`、`onKeep`），一次性检查的界面记「检查过」（`shell/useKeptVerdict.js`，《句法之图》的对照也是），《状态之图》记跑到了哪个测试。打开时界面照当前这块板把运行重放到那里，不再弹通关或失败的窗口；板一改标记就清掉，删掉的存档连同它的标记一起删。关内重新打开关卡界面的只有换任务和换存档（外壳按「任务 · 存档」给界面换 key），所以有任务或有存档切换器的玩法才要接 `lastRun`；两样都没有的（《状态之图》的手动玩法、《视觉完备》的探针关和参数台、《软件工厂》的手动关）运行就留在界面自己的状态里，它正好活到离开这一关。关内别的事（关卡抽屉、引言、百科、窗口跨过手机宽度）都不能重新打开关卡界面。《软件工厂》的手动关另有一条：测试报告回到模型的上下文里，是玩家做的事的一部分，所以一串操作连同其中的测试就是存档，离开再回来也还在，只是不再通关一次。跑完后板上显示整块板的运行结果：输入的值、没接到结果上的元件给出什么或缺什么，和运行前一样，只多了测试的状态。
- **封装件能打开看里面。** 一块封装件跑的是学习者的电路（第 1 节），它里面的每个元件也是运行的一步，步骤写明它在哪几块元件里（外层在前），主板上点亮最外面那块元件。画布里不套画布：桌面上，封装件右上角有「编辑」（问过以后跳到搭它的那一关）和「详情」；手机上点开元件。详情窗（手机上是单子）里贴出这块电路的格位板版本，桌面和手机一样（只读，固定高度、上下滚动，输入和结果是顶上和底下一排细的端口，当前这一步所在的块滚到眼前；点里面的块，在上面再弹出它自己的详情：说明和值，设置只显示；它若是封装件，详情里又是它的电路，标题栏关闭按钮旁是一个小的「编辑」）。板上元件的单子在手机上把「编辑」和「移动」「删除」并排放在底下；桌面的详情窗按桌面排：「编辑」是标题栏里关闭按钮旁的一个小按钮，不占一整行。封装件在桌面画布、手机格位、元件列表和托盘上用自己的标记和原始元件分开（`parts.packed`）：类别小方块是实心的（类别的颜色作底，图标反白），图标由游戏给（《证明完毕》是电路板），说的是「里面是一块电路」。电路上每个元件显示这块元件到当前这一步为止最近一次运行里的值，当前这一步所在或正在算的元件亮起并滚到眼前。步骤多（一次 auto 几百上千步）时，靠运行的快进和步进看；性能不够时，宁可去掉改板时的即时预览或「跳到结果」，也保留逐步运行。不分步的电路（《证明完毕》真值电路上的门，《车在说话》的一拍）里面的元件显示板上此刻这一行、这一拍的值。这些都由内核做（`kit/circuit/Inside.jsx`，`engine/trace.js` 的 `insideAt`）：领域只说一块封装件跑哪块板、此刻的轨迹是哪一条（`engine/boards.js` 的 `packed` 在轨迹里给里面每个元件记下 `path`；逐拍世界的板节点传 `traced` 就每拍留一条），用的是 `CircuitLevel` 的 `packed`；元件箱里的封装件用同一套（`PackedBoard`，只读，没有值）。
- **多条目的值是一个能滚动的窗口。** 一个值有很多条（子句集、证明状态的目标、等式、模型的上下文……）时，一律用 kit 的 `shell/Entries.jsx` 显示：条目在一个能滚动的窗口里，一条一行，窗口下面固定一行写共有多少条，不跟着滚；不到这么多行时窗口跟着变矮。窗口多少行（含共计那一行）、最多列多少条，按用的地方配：默认板上（桌面画布、手机格位、运行过程）5 行、20 条，单子里（`Sheet` 经 `EntriesSize` 给出）13 行、50 条；别的地方用 `EntriesSize` 给它里面的一切另定，单个列表也可以直接写 `lines`、`max`。行高默认是 12px 字一行，领域的行更高时在样式里设 `--entry-row`。
- **读数放在预览里。** 指针在图上时，数值显示在输入输出的预览里，不在元件上浮出坐标。

**共用的件**

关卡界面只交各块内容，版面和交互由下面这几样给（第 6.3 节「关卡界面不在契约里」那一段说领域怎么接）。版面是 `kit/shell/Workbench.jsx` 和 `Layout.jsx` 的 `PhonePage`：关卡给 `results` 就有结果区（还没有内容时传 `null`：桌面上留着空的结果区，手机上不显示），不给就没有；运行栏交 `dock`（一个 `RunDock`），版面替它套上 `run-foot`。

- **电路关是一个内核界面。** 拼电路的关卡用 `kit/shell/CircuitLevel.jsx`：`useLevelBoard(屏幕, { open, fresh, clearable? })` 管板（打开时用哪块：存档合不合、升级、带过来的板由领域的 `open` 决定；清空回到 `fresh()`；`change(板, { keep })` 里 `keep` 的改动——挪元件、换显示——只存档，不算改了板，运行和结论留着）；`useLevelRun(屏幕, 板, { tests, steps | judge, hidden?, score?, onSolve?, onFail?, guard? })` 管运行和判定：测试标签后面可以跟一个「样张」（`tests` 里 `sample: true` 的一项，只用于一次判完的关）：一张较大的图，板也在上面跑，只看效果、不判定，不计入通过数；`steps`（每个测试的步骤、检查、`final`）逐步跑（`usePlayback`），`judge` 一次判完（`useKeptVerdict`），两种都把最后一次运行留在板上。**默认一次判完、直接出结果**；只有一步一步的运算过程本身就是要看的东西时才用 `steps`（证明的推导、一拍一拍的总线、一轮一轮的循环），像《视觉实验室》这样逐像素算一整张图的电路关用 `judge`；隐藏测试每次一并跑、只说几个没过，通关后再打开这一关时列出来；`onSolve` 让领域在全过时另做打算（还有下一段、板还不能做成元件），`onFail` 在逐步运行停在失败上时调用，`guard` 在还不能运行时拦下。`<CircuitLevel>` 管版面和其余一切：桌面工作台（元件栏、画布、存档切换、测试标签、通过情况、结果条、运行栏）和手机页（格位板、板下的结果区、托盘、元件的单子和空格的单子、清空、撤销）、框的区域里加元件、简介和提示、封装件的「编辑」和详情。领域只交：元件描述（`parts`）、元件目录（`items`、`folded`）、新元件的设置（`defaults`，或整个 `create`）、此刻板上的值（`view`）、元件的几面（`card`：`body`、`head`、`cardClass`、`outNote`、`wireState`、`regionNote`、`resultNote`，手机上 `thumb`、`tileExtra`、`sinkBody`、`sinkClass`、`nodeClass`，每面都拿 `(node, ctx)`，`ctx` 是 `{ view, board, path, readOnly }`：同一套画法既画关卡的板，也画封装件里面的板）、结果区（`results` 等）、手机上板下面的东西（`below`，`follow` 让页面跟着跑到底）、单子里的说明和内容（`describe`、`sheet`，或整个 `addSheet`）、封装件（`packed`：`open(node, board)` 给出它跑的那块板和画它的 `parts`，`edit` 去搭它的那一关，`trace()` 给出板上此刻显示的那次求值的轨迹）和运行键的字。领域自己的面板放进简介（`brief.children`）、结果区或单子里，不另排版面。
- **步进运行用共用的 kit。** React 界面的关卡用 `shell/usePlayback.jsx`：给它每个测试的步骤和检查，它管运行、步进、暂停/继续、跳到结果、第一个测试慢后面快、遇到失败的一步或不对的测试立刻停、全过才通关，并生成运行栏的控制按钮（`dock()`，手机上小按钮只剩图标，和运行键同一行）。当前这一步的元件加 `is-step` 类（桌面画布和手机格位都有样式，出错时加 `is-step-fail`），输出区用 `shell/StepLog.jsx` 列出每一步的结果，列表和每条结果都限高、超出滚动。电路类的板用 `engine/circuit.js` 的轨迹直接得到步骤。现在用它的：《证明完毕》的机器板（规则与元变量一章起）和真值电路板，《软件工厂》的板（一轮一步），《车在说话》（一拍一步），都经 `CircuitLevel`。《状态之图》的电路关用领域自己的 `usePlayer`（`domains/table/ui/play.jsx`：运行一个测试一个测试地在测试棋盘上走，单步、暂停、继续、跳过动画和 `usePlayback` 一样，测试之间停一拍）；它的每次等待也取 `paceOf`，所以出结果的速度和别的游戏一样。不论一张表几行、一块板几步，玩家看到的都是同一个速度。

---

## 7. 作者流程

**先改文档，再改代码。** 课程的每一次演进（加章、重排、拆合元件、改机制），先把这份手册和游戏自己的设计文档改成新的样子，再照着文档动手。文档只写现在的设计和接下来的计划，不写「原来……后来改成……」：过时的内容随改随删，变更的来龙去脉在 git 历史里。一份要做的重排可以先写成文档里的工作单，做完就删。手册和 skill 也一样：每次做完一件事，想一想有没有新的、更一般的规矩，有就写进去，旧的说法不再成立就改掉，不照抄上一次的写法。

下面是作者（人或 agent）做一个专题的顺序；由 agent 做时，第 1–8 步、10 步分给流水线的几步，每步一份 brief 和一道闸门（第 7.2 节）。

1. **定终点和知识点，给知识点定位**：学完能亲手造出、能测试的那个东西；从讲义逐节列出要教的理论知识点，标出每一章的核心和每个点的难度，画出由浅到深的知识图（`depends`），难点拆到最浅的原点；一句话就懂的点只在文案里提到。每个写本领域的术语、出处、它回答的问题和它纠正的错误（第 4.1 节）；库和工具的做法、文件格式、实验课的操作列为技术内容，只进可选的拓展专题。关卡从知识点排出来，不从元件排出来。新专题还要选机制（第 6.5 节），领域从脚手架开始（`npm run new-domain`，第 6.3 节）。
2. **定代际**：机体的升级序列，每一代多出哪些外部能力。
3. **每一代列出原始元件和中层元件**：逐个问"去掉它，能不能用剩下的搭出来"，能就改成一关去搭。
4. **按核心用处排机制**：对每个机制问「哪里第一次非它不可」，把它放到那里，最好就是那里撞上的墙（第 1 节）。
5. **画抽象链**：`npm run deps -- <游戏>` 从课程数据画出元件依赖图：每个元件（原始、搭出的、升级的）在哪一章、哪一关出现（并行组和专题的名字跟在后面），搭出的元件由哪些元件搭成，几关的参考解用到它；加 `--levels` 把每一关也画上，连着它用到和带来的元件。逐个检查：它出现前有没有前因？出现后有没有关用到它？后期的关是不是越来越多地站在高层元件上？换代时上一代的产物去了哪里？
6. **关卡花在难的地方**：一章的关卡大多在通往核心的阶梯上；每个知识点练它的侧面：列出它前面没露出来的侧面（约定、边界、失效、易混的近亲），一个侧面一关，按 2.3 的维度变化，排在下一个知识点之前；同一侧面的几组数据写成测试或任务。
7. **定专题（如果有）**：这一章有没有值得做成专题的业务问题或长线拓展？有的话，先写终极谜题，再倒推出引入关和递进关；没有就不设。
8. **写规格**：先写这一关的问题和思维链（第 4.1 节），再写参考解和 naive 解（naive 解就是知识点要纠正的那个错误），再写测试：每一步思维链都要有一条测试或一次反馈落在它上面。都用下面的操作写进内容。
9. **Scope verification**: follow §7.0. Reuse the operation set's successful check for unchanged content; name affected games and test files when additional verification is needed.
10. **核对文案**：按第 4 节的文字纪律逐条看引言、提示、过关点题和元件说明（studio 的文案表：一章或整款游戏的每段文字一行、中英并排、就地改，可以只看有问题的行；一个说法要全游戏统一时用搜索替换）；改过顺序的，按先修关系重核引述的关卡和"又是一个"之类的说法。
11. **Review affected UI**: inspect changed visual or interaction flows on desktop and phone. Shared UI changes add representative consumers; documentation and pure model edits do not automatically require browser review. To inspect execution, load the reference board and exercise the changed run behaviour.
12. **最后写挑战关**：从每一代能力的边界上找题。

### Task-scoped capability introduction

Introduce a component or configuration at the first task that uses it, including folded trays, detail sheets and
headless play. A prerequisite must establish unfamiliar representation changes or model assumptions before a
combined construction assesses them. Use meaningful partial constructions and contrasting cases; familiar
arithmetic and simple controls need concise guidance rather than filler tasks. A newly earned component must
execute the player's passed circuit. A chapter number, all-unlocked mode or unrelated sibling route does not
supply missing prerequisites. Unavailable settings are omitted, and a single available choice needs no selector.

### 7.0 Verification by impact

Start with the smallest meaningful check of the changed behaviour and its direct consumers. File count alone
does not determine impact: a shared evaluator can affect many games, while a long copy edit may affect no execution.

| Changed scope | Required verification | Broaden when |
| --- | --- | --- |
| Documentation or process instructions | Diff/format review and changed references | An executable command or contract is also changed |
| Game copy or curriculum data | Operation-set validation of that game; copy or topology gates only for the changed concern | New dependencies, references, task contracts or built-part consumers are affected |
| Game UI, CSS or interaction | Changed-JS lint, that game's build, and the changed desktop/phone flow | Shared widgets or layouts have additional consumers |
| Domain calculation or evaluation | Relevant domain test files, affected-game checks, and direct packed-part/consumer cases | Evaluation or representation contracts change across domains |
| Shared shell, circuit or engine module | That module's tests and affected consumer checks; representative UI flows for interaction changes | The shared API changes or affected consumers cannot be bounded confidently |
| Save stamp, schema, registry or dependencies | Relevant stamp/schema/replay/contract tests and all identified consumers | A repository-wide contract or dependency is affected; then run the full relevant suite |

Commands use existing entry points; no new validation runner is needed:

```sh
# From the repository root: run only the relevant test file(s).
node --test games/kit/domains/vision/calculation.test.js

# From trace-viewer/: name the game for checks and builds.
npm run check -- vision-lab
GAME=vision-lab npm run build:game
```

A successful operation-set check counts as the affected game's content check until relevant content or validation
code changes. Reuse passed results for an unchanged scope; committing, amending or pushing alone does not invalidate
them. A failure expands verification along the failing dependency, rather than automatically selecting every suite.
Linux syscall conformance belongs to Unix model changes, not unrelated vision or interface edits.

Finish implementation and necessary review before submitting one release. Add late changes only when they block
correctness or the requested behaviour. Report the selected checks and any unverified boundary accurately.

Local verification and deployment are separate scopes. The current `deploy-games.yml` still performs full checks
and builds a complete site; this policy does not claim that CI already selects checks or publishes games incrementally.
A documentation-only local change does not require a deployment.

### 7.1 内容只经操作修改

内容层的每一处修改都是操作集（`kit/engine/ops/operations.js`）里的一个**操作**，不手改 JSON：人在命令行里或 studio 里（第 6.7 节）、agent 经 MCP，跑的都是同一套操作，走同一道门。几个操作合成一个**变更集**，当一次修改：

```json
{ "why": "为什么改", "ops": [{ "op": "level.move", "level": "s-each", "to": { "before": "in-zero", "on": "path" } }] }
```

| 操作 | 做什么 |
|---|---|
| `level.set`、`level.unset`、`level.patch`、`level.replace` | 改一关的一个字段（路径 `tests[0].goal`）、去掉一个字段或列表的一项、按 JSON merge patch 改几个字段、整关换掉；新字段按 schema 的字段顺序放 |
| `level.blueprint` | 把一关的一块板（参考解、naive 解……，schema 里的 `S.board()`）写成蓝图文本，先按蓝图语法读一遍 |
| `level.adds` | 一关新带来的元件里加上、拿掉几样 |
| `level.add`、`level.remove` | 加一关（内容和课程里的位置）；删一关（文件和位置，掏空的分支、专题一起去掉），别处还提到它时拒绝并列出在哪里 |
| `level.rename` | 换 id：文件名和提到它的每一处（`S.level()` 的字段、文字里的链接、`open`） |
| `level.move` | 挪到课程里的另一个位置：同一章、跨章、进出并行组的分支、专题、挑战（位置的写法见 `ops/place.js`） |
| `task.add`、`task.remove`、`task.move`、`task.rename` | 一关是一串有 id 的任务的领域（第 4 节）：加一个任务（放在某个任务后面、最前或最后；不给 id 就起一个），删一个（一关至少留一个，整关不要用 `level.remove`），挪到关内别的位置或另一关（`to: { level, after? / first? }`；挪走一关唯一的任务时，同一个变更集里要删掉那一关，否则检查不过），换 id；按 id 找任务，id 在整款游戏里唯一（`npm run check` 查）；几关合成一关就是把任务挪过去、删掉空了的关，拆开是加关再挪任务 |
| `game.set`、`game.unset` | 改 `game.json` 的一个字段（课程、元件、标题……） |
| `text.set` | 改一段文字的一面或两面（一关、`game.json`、百科里的） |
| `glossary.put`、`glossary.set`、`glossary.remove` | 写一条百科、改几个字段、删一条 |

**一个变更集怎么跑**（`ops/changeset.js`）：每个操作先按它参数的 schema 查（提到的关必须存在），再依次改内存里的内容，哪一个失败整个变更集作废；然后把整款游戏按 `npm run check` 的规则查一遍（词汇表、课程审计、文案和链接、领域检查：参考解跑测试、naive 解失败）。全部清零才写盘，否则什么都不写，并列出每一处问题。写盘时只动改了的行（第 6.1 节的格式），游戏 `games.js` 里的关卡数跟着改，修改日志 `changes.jsonl` 加一行，记下撤销它的变更集。写盘、记日志在游戏的锁里做（`changes.lock`，写着持有它的进程；进程死了留下的锁会被接手）：盘上的文件和打开游戏时读到的不一样就拒绝（另一个写者先改了）；调用方给了 `base`（它看到的日志最后一条的序号，`preview`、`log` 给出 `head`；studio 总是给）而日志已经往前走了，也拒绝。撤销只从那一条留下的状态往回改：它改过的文件此后又变了（手改、后来的修改），就拒绝。文件在操作集之外被改过，`log`、`npm run check` 报出来（不算失败），`npm run op -- <游戏> adopt --why …` 把现状收进日志。

**命令行**（`trace-viewer` 目录下）：

```
npm run op -- list                                         列出操作和参数
npm run op -- <游戏> <操作> 键=值 …                          跑一个操作（值是 JSON 就按 JSON 读）
npm run op -- <游戏> --file 变更集.json                      跑一个变更集
npm run op -- <游戏> undo                                   撤销日志里最后一次还没撤销的修改（撤销本身也是一次修改，也记日志）
npm run op -- <游戏> log                                    看修改日志
```

加 `--dry-run` 只打印 diff、不写盘；`--why "…"` 写明为什么（记进修改日志）；`--json` 输出 JSON。

**MCP**（`npm run mcp`，stdio 上的 JSON-RPC；仓库根目录的 `.mcp.json` 已把它登记成 Claude Code 的项目级 `games` 服务器：在仓库根目录启动 Claude Code，第一次用时批准它即可；要只给自己登记，在仓库根目录跑 `claude mcp add --transport stdio games -- node games/kit/engine/ops/mcp.js`。服务器要用 `trace-viewer/node_modules` 里的 vite，先在 `trace-viewer` 里 `npm install`）：工具只是同一套操作和检查的薄皮，没有自己的逻辑。

| 工具 | 做什么 |
|---|---|
| `vocabulary` | 一款游戏的领域词汇表（`describe`）和全部操作的参数 schema：写内容之前先读它 |
| `audit` | 和 `npm run check -- <游戏>` 一样的检查 |
| `modify` | 跑一个变更集；`dryRun` 只看 diff |
| `run_reference` | 一关的参考解和 naive 解经领域检查跑测试，给出提到这一关的那几行（《状态之图》的领域只在失败时提到一关） |
| `blueprint` | 读一关的每块板的蓝图文本；给了 `text` 就经 `level.blueprint` 写进去 |
| `render` | 一关或它的一块板写成文字（给了什么、要做什么、各块板的蓝图）；`format: svg` 把各块板画成 SVG（`kit/circuit/svg.js`），领域给 `scene` 的再画这一关（第 6.7 节）；给 `changeset` 就画变更集留下的样子。PNG 画不了，直说 |
| `deps` | 元件依赖图（Mermaid 或 DOT） |
| `preview` | 一个变更集留下的整款游戏，不写盘：内容、`check` 的每一行和它说的是哪几关、每个文件改前改后、失败的是第几个操作、修改日志（`check: false` 只按词汇表查内容，快）。studio 靠它显示一切 |
| `seed` | 一关的一块板（默认参考解）在存档里的样子：放进 `progress.data`，打开这一关就是这块板 |
| `names` | 链接显示的名字：每关的关号和标题、元件箱里每个元件的名字、每个词条的标题，和文案里可以照字面引用的名字（studio 的链接小块和文案检查用它） |
| `run_tests` | 一关的一块板（默认参考解）经领域的 `play` 钩子跑这一关的可见测试和隐藏测试：每个测试关卡界面怎么画（给了什么、应当是什么）、过没过、界面说了什么；钩子不支持的玩法说明原因 |
| `log`、`undo` | 修改日志；撤销最后一次还没撤销的修改（和 `npm run op -- <游戏> undo` 一样） |
| `search` | 在整款游戏里搜索（变更集留下的样子）：文字的每一面（链接标签里面不算）、板的每一行、关卡和词条的 id；每处给出文件、关、路径和匹配的位置（`kit/engine/ops/search.js`） |
| `replace` | 把搜索到的换掉，写成一个变更集，不写盘：一段文字一个 `text.set`、一块板一个 `level.blueprint`，每处改前改后，和找到但不换的 id；再交给 `modify`（先 `dryRun`） |
| `history` | git 里某一版（默认 HEAD）的一个文件：一关、`game.json` 或游戏文件夹里的其他文件；游戏文件夹不在 git 里时（`GAMES_ROOT` 的副本）照实说 |

环境变量 `GAMES_ROOT` 让服务器改一份游戏文件夹的副本，试改动用。

**studio**（`npm run studio`，第 6.7 节）：同一组工具开在开发服务器上，人在一个页面上走完上面的流程。读一章（文案表）、改文字和字段（在画面上点它，或在字段页点它，侧栏里改；任务、提示、测试在画面上点「+」加）、全游戏搜索替换和几关一起改（都先列出要加的操作）、挪关（拖到树上的槽位）、改板（侧栏里的蓝图，或者在游戏的电路编辑器里改完点「用作 …」）；每改一处就是待定变更集里的一个操作，审计栏随即重算，画面玩的就是改过的内容；最后在「变更」页签里逐个看操作和每个文件的字段级 diff，写一句为什么，应用；修改日志里的最后一次可以撤销。agent 交来的变更集（`{ why, ops }` 的 JSON 文件，MCP 的 `modify` 收的那种）在「变更」页签里打开，就成了待定的变更集：一样能读、能改、能玩，再应用或放弃；agent 已经写进去的修改在修改日志里，同样能撤销。

### 7.2 agent 流水线

**一个新专题由 agent 一步步做出来，每一步一份 brief、一道闸门**（方向见 `games/DIRECTION.md` 第 4 节）。流水线对所有专题都一样，放在 `kit/pipeline/`：每一步的 brief（`steps/<步>.md`，给做这一步的 agent 读的全部要求）、每一步读什么写什么和它的闸门（`steps.js`）、课程蓝图的 schema 和审计（`blueprint.js`）、文案 lint（`lint.js`）、命令 `npm run pipeline`（`pipeline.mjs`）。每一步的产物都是内容层的数据，经操作集写进去（第 7.1 节）；闸门的每一条失败都叫得出一条规则。

| 步 | 谁做 | 读 | 写 | 闸门 |
|---|---|---|---|---|
| `blueprint` | 课程设计 agent | 课程资料（讲义、笔记、游戏文件夹里的设计文档）、手册第 1、2、4.1、6.5、8 节、领域的词汇表 | `blueprint.json`（`blueprint.put`、`blueprint.set`）：先是知识点，再是 slot | 蓝图审计（`bp-…`，下面） |
| `domain` | 工程师（代码，决策三的内核权限） | 蓝图的 `requests`、`mechanisms` | 领域代码；每条需求的状态（`done`，或 `declined` 带 `note`） | 没有还开着的需求；领域契约（第 6.3 节）；`check`；领域的单元测试 |
| `levels` | 关卡设计 agent | 蓝图（每个 slot 的问题和思维链）、词汇表、手册第 2、4、5 节 | 关卡、`eras`、`primitives`（`level.add`、`game.set`……） | `check` 清零（参考解通过、naive 解失败、审计全开）；关卡合蓝图（术语链接除外）；教学 lint（`pd-…`，下面） |
| `copy` | 文案 agent | 蓝图（每个知识点的术语、出处、墙，每个 slot 的问题）、关卡、手册第 1、4 节 | 全部文字和百科（`text.set`、`glossary.put`……） | `check`；合蓝图（含术语链接）；文案 lint（`copy-…`）；教学 lint |
| `review` | 评审 agent | 手册和 skill 的两张核对单、整款游戏 | 只写发现（它最后交出的 JSON：在哪、归哪一步、违反哪一条、`fix` 要不要改） | 最后一次评审没有还没解决的 `fix` |
| `queue` | — | — | 评审队列里的一项（`pipeline.json` 的 `review`：这款游戏修改日志里的变更集） | 上面每一道闸门此刻都还清零 |

**一个 agent 只拿到它这一步的东西。** `npm run pipeline -- <游戏> run <步>` 起一个新的 `claude -p`，在一个空的临时目录里：brief 加上这一步的输入（文件的路径、上一次没过的闸门、评审留给这一步要改的发现、这一次的范围 `--scope`），能读任何文件，只能在自己的目录里写，只能运行这一步的几个命令（`./op` 跑变更集，`./check`，`./gate` 这一步的闸门，`./deps`，`./eras` 蓝图排出的 `eras`，`./lint`；评审没有 `./op`）。跑完记下用量、每个命令跑了几次和失败了几次、写进去的变更集（修改日志的序号）和它的报告，再跑一遍闸门；全部记进 `pipeline.json`。没过就再跑一次：上一次的闸门失败和评审的发现成了下一次的输入。`domain` 这一步是代码，不由内容 agent 做；评审的发现修好以后，用 `npm run pipeline -- <游戏> resolve <k> --why "…"` 记下是哪个变更集修的，或者再评审一次。`status` 列出每一步的闸门和跑过几次，`brief <步>` 打出一个 agent 会拿到的全部文字。

**课程蓝图**（`blueprint.json`，schema 是 `kit/pipeline/blueprint.js` 的 `BLUEPRINT`）：专题、学习者、终点和这一次做到哪（`scope`，往后的写进 `deferred`）；从机制目录里选的机制；机体阶梯（每台机体会什么、缺什么）；**知识点**（`knowledge`：本领域的术语、说的是什么、出处、撞上的墙、纠正的错误、是讲义的理论还是技术内容；第 4.1 节）；原始元件（每个写明为什么接不出来）和搭出的元件（由什么搭成），原始元件是工具，不是知识点；每一章是一串系列（地基、练习、专题、挑战；同一个 `parallel` 的几个系列是一个并行组），每个系列是一串 slot：一个 slot 就是将来的一关，写它的 id、做什么（`task`）、玩家要回答的问题（`question`）、从问题到答案的思维链（`chain`，至少两步）、带来的那一个知识点（`teaches`；主线上只能是讲义的理论）或练习露出的侧面（`facet`）、加的原始元件、搭出的元件、参考解站在哪些元件和知识点上（`uses`）、练习变化的是哪个维度（第 2.3 节），挑战写 naive 解；最后是向领域和内核提的需求（决策三的需求通道）。`erasOf` 把它排成 `game.json` 的 `eras`。

**蓝图审计**（`auditBlueprint`）在一关都还没有的时候就按第 1、2、4.1 节查编排：`bp-refs`、`bp-unique` 名字都有定义、不重复；`bp-source` 每个知识点注出处，出处是 `sources` 里的一份材料；`bp-part-point` 知识点不是原始元件（id 或术语不是原始元件的 id 或名字：工具不是知识；搭出的元件可以就是知识点）；`bp-knowledge` 每个 slot 都在做某个知识点（带来一个，或在 `uses` 里练一个），什么知识点也不做的 slot 是凑数；`bp-taught` 每个要练的知识点有一处带来；`bp-trivial` 一句话就懂的点（`intuitive`）不做成关、不当练习的内容，`bp-mentioned` 它们只由某一关提到（`mentions`）；`bp-depends` 一个点搭在其上的点，在每条通向它的路上都先出现；`bp-shallow` 难点（`hard`）之前至少有两关在教它依赖的点；`bp-core-none` 每章标出核心；只报告的 `bp-ladder`：主线上通往核心的关不到一半；`bp-main-tech` 主线（地基、练习）上的关不带来、不用技术内容的知识点，它们只在可选专题里；`bp-adds-teaches` 加原始元件的 slot 带来需要它的那个知识点；`bp-facet` 练习 slot 写出它露出的新侧面；`bp-question` 每个 slot 写出问题和至少两步的思维链；`bp-point` 每个知识点写出术语、出处和 `basis`（schema 只管能写什么，好让这些字段出现之前写成的蓝图仍然读得进来；必须写全由审计要求）；`bp-placed` 每个原始元件、搭出的元件恰好有一处带来；`bp-order` 一个 slot（和一个搭出的元件）站在的东西，在通向它的每条路上都已经有了（按先修关系，并行组的另一路不算）；`bp-first-use` 知识点在带来它的那一关用上；`bp-unused` 搭出的元件后面有人站在它上面；`bp-practice` 一组练习不重复维度、以组合或辨真伪收尾；`bp-branch` 主线上前后两个系列，后一个用不着前一个的任何东西时，该是并行组；`bp-parallel` 并行组两到三路、互不依赖；`bp-abstraction` 一章最后一个系列站在这一章搭出的元件上；`bp-machine` 用到的能力机体会；`bp-challenge` 挑战不带新东西、有 naive 解；`bp-keeps`。只报告、由人判断的：`bp-reuse`（一个知识点在再来两个知识点之前没有再用上，或主线后面再没用到：它是不是通过部件复用、或由后面的关链回来）、`bp-bare`（只放它带来的东西）、`bp-lonely`（一个知识点后面没有练习关：它的测试和任务够不够，看第 2.3 节）、`bp-heavy`（一个知识点占了四关以上：每关都是新侧面吗）、`bp-open`（还开着的需求）。

**关卡合蓝图**（`conformance`）：每个 slot 恰好一关、`eras` 和 `primitives` 就是蓝图排出的、每关的 `adds`、`builds` 是它的 slot 的、参考解用到 slot 的 `uses` 里的每一个元件、slot 有 naive 解的关也有（某个任务有）；`bp-entry` 每个知识点有同 id 的百科词条，在带来它的那一关打开；`bp-term` 带来知识点的那一关在玩家读到的文字里链接这个词条；`bp-main-link` 主线上的关不链接技术内容的词条。

**教学 lint**（`lintPedagogy`，`kit/pipeline/pedagogy.js`，第 4.1 节里能机械看出的几种）：`pd-repeat-board` 两关的参考解是同一块板（不管元件叫什么名字，比的是元件、设置和接法）；`pd-repeat-text` 玩家读到的一段话（引言的一页、目标、提示、点题、naive 解为什么错）一字不差地出现在两处；只报告的 `pd-slide`：实验台的一步只开一个旋钮、目标读数实时显示，拖到变绿就能过；`pd-quiz`：一个任务只是点选答案（选择题）。它们看得见形式，看不见意思：是不是工具关、判断题是不是不看材料就能答、思维链有没有落在屏幕上，由评审逐关读。

**文案 lint**（`lintCopy`，`check` 已经查两面、链接和按位置指关卡，这里补手册第 4 节能机械看出的）：`copy-banned` 口语、翻译腔和「卡片」「方块」；`copy-ahead` 往后透露；`copy-length` 目标、引言一段、提示、点题的长度上限；`copy-intro-part` 引言一开口就是新元件；`copy-after-part` 点题链接了元件（多半在复述接法）；`copy-brief-why` 目标里讲理由。

**闸门漏掉、后面一步抓到的，改成检查。** 流水线的每一步都可能抓到前面闸门没看见的毛病；能机械查的，就加进领域或内核的检查，不只修这一处。《从一根线开始》上的例子：盲玩的玩家在「接力」一关只接了一根线（左进线直接接右出线）就通过了，参考解有五十个元件——测试只看线那头收到什么，原样转发的位本来就满足它；`net` 领域的检查因此多了一条：只把一根进线（或一个输入）直通到全部输出的板必须查不过（参考解本身就是这样的除外），和「空板必须查不过」并列。关卡设计 agent 两次停在蓝图上（帧的校验位凑不成整字节、计数器不能暂停），评审 agent 找出蓝图的八处编排问题（一个机制只有一关练习、难点挤在一关、搭出的东西在后面被手接一遍），都回到课程设计这一步重做，不在关卡上绕过去。

**评审队列**：`npm run pipeline -- <游戏> queue` 把每一道闸门再跑一遍，全部清零时在 `pipeline.json` 记下 `review: { status: 'pending', changes: [修改日志的序号…] }`。人在 studio 里评审（第 6.7 节）：修改日志里是 agent 写下的每一个变更集，各带它的「为什么」，能逐个撤销；要改的就地改，成为人自己的变更集。要退回给 agent 的，写成评审意见：`npm run pipeline -- <游戏> comment <在哪> --owner <步> --why "…"`，游戏退出队列，那一步下一次跑的时候把这些意见当作输入（决策五的「驳回并写意见」；studio 的评审页签还没有写意见的入口，接上时写的就是这一处）。

---

## 8. 常见的坑

- **原始元件选得太低**：学习者被琐碎细节拖住，离开了专题本身（比如让学动态规划的人先搭加法器）。
- **原始元件选得太高**：直接给现成的高级元件，就失去了"亲手造出"的感觉。
- **一关多个新想法**：审计里的 `many-new`。
- **孤立关**：做完的东西后面的参考解都用不上。
- **规格泄露解法**：引言写成了说明书。
- **专题跑题**：引入关和终极谜题不是同一个问题。
- **挑战关靠繁琐取胜**：难在元件多，而不是在理解。
- **后期机制提前出现**：某个能力在它的那一代之前就出现在托盘或引言里。
- **凑数**：为了满足「一关一个新东西」「每个机制配几关练习」这类检查，把一块元件、一个运算拆成一关（「取较大值」「向下取整」各占一关，引言都是同一句套话），或者把同一道题换个数字再出一关。检查报出不够时，要找的是新的知识点或新的侧面；找不到，说明这里本来就不需要那么多关。《视觉实验室》第一版的两章 59 关里，大约一半是这样的关（第 4.1 节列的几种都出现了）。
- **课程排成知识点清单**：一关一个定律或一个新规则，每个机制只练一次就换下一个。学习者记住了每关的接法，却没练出这个机制的思维。专题越抽象，这个坑越深。
- **新元件不是必需的**：引入一个原始元件的那一关，用已有的元件也能过（《状态之图》的最省力：两个汇合器就能代替加法器）。引入关要找一个只有新元件才做得到的规格（走不到的路口：「加起来」会跳过「—」，加法器不会）。
- **很快被顶替的元件**：一个封装件出现后一两关就被更大的封装件吞掉（起点值很快被路线计数器取代），就不必单独造它；把它并进下一关的电路里升级出来。一个原始元件只是搭某个封装件的中间件、之后几乎不再用时，标成留在原地（`local`），不让它一直挂在托盘里。
- **元件凭空出现**：一个新元件在它那一关直接发下来，提示是"新元件正是做这件事的"，一步就过。学习者既不知道为什么需要它，也没有亲手接近过它。
- **主线的动机挂在支线上**：必修关的引言接着一道可选挑战往下讲；跳过挑战的学习者读不懂。
- **照着公式接线**：说明里写好公式，学习者只是把它翻译成元件。改成机关台去发现，或者只给规格（第 2.2 节）。
- **难点挤在一关**：一关里两个新想法，后面一关难到劝退。拆成带名字的引入系列。
- **按游玩顺序判断"见过"**：并行组里先走另一路的学习者，看到错的"新"标记、拿不到该有的画法，或读到一句不成立的"又是一个"。
- **文案剧透或后透**：元件说明讲出了解法的关键，或者过关点题预告了下一关。
- **互不依赖的关排成一条线**：后一串关不需要前一串的任何元件和概念，却要等它通关才开放（第 1 节「不依赖的就分支」）。
- **引言只是新元件说明书**：引言只说「新元件 X：做什么」，不说机器在这里缺什么、这一块装在哪里；关卡变成一道道互不相干的题。
- **重看旧东西的章节一个点一关**：一章不带新机制，只是换一种眼光重看前面做过的东西（《证明完毕》的证明即程序：把连接词一章的证明读成证明项），却仍按「一个知识点一关、读一关写一关」排，学习者等于把旧关重做一遍。这样的章把同一种眼光下的小任务并进同一关（`tasks`），只给真正新的动作（新的板、新的元件）单独的关。
- **合并步骤做成原始元件**：一个新原始元件其实是「先 X 再 Y」，或者一个设置项把几个已有元件的组合藏了起来；它应该是搭建关造出的封装件（第 1 节「基础元件保持最少」）。
- **造出的东西沉底**：早期搭出的元件后面没有关用到，后期仍然一直用最基础的一批元件做题；或者换代时把上一代的产物全部丢下，没有升级版接上。
- **封装件比造它的电路多做一步**：后面的关需要流水线里多一道工序（《证明完毕》的化成子句要先 Skolem 化），就把这道工序放进造它的那一关之前、接进参考电路，而不是让元件悄悄多做。
- **故意给错的元件留在托盘里**：一关发下一块错的元件让学习者抓出来（别人的证明器），它只属于这一关：标成留在原地（`local`），最好直接预置在板上，不放进托盘；否则后面的关都多一块不该用的元件。
- **会失败的步骤被当成运行出错**：框里的元件失败（让框停下、换路、回头）、搜索里走不通的一步、要求「证不出来」的测试里的失败，都是正常的结果；步进回放只在没有框接住的地方、而且测试不要求失败时，才把失败的一步当成停下来的理由。

---

## 9. 实例：《状态之图》按代际重排（`game.json` 的 `eras`）

按本手册从头设计的新关卡树见 [`state-graph/CURRICULUM.md`](state-graph/CURRICULUM.md)。下面是现有关卡按代际重排后的样子，在新关卡树做出来之前它是线上的版本。

**原始元件。** 动态规划讲的是表、状态和顺序，不是算术，所以算术和逻辑元件都是原始元件，各自在一关里第一次出现：
- 汇合器及其型号（加起来、取较小、取较大、任一是）；
- 常数和放行闸（一起出现）、拦截闸、加法器、取反、乘法器。

学习者搭出的东西是电路板：路线计数器、最省格、择优器、区间合并器、编辑距离器、打折器，通关后作为元件解锁，跑的就是学习者通关时的那块电路板。搭它的那一关，板上的输入就是元件的口：视野和本格信息里读的格子；元件要的口在那一关的世界里没有对应的格子时（最省格的第三条来路），板上多一个只属于这一关的输入，在这一关里一直是「—」。通关时板子只能读元件的口，而且每个口都要读到，否则元件会和板子做的不一样。

**代际**（每一代：地基 → 练习 → 专题系列，挑战挂在旁边）：

| 时代 | 地基 | 练习（按难度） | 专题系列 | 挑战 |
|---|---|---|---|---|
| 0 纸笔 | 找路线、只看最后一步、棋盘城市（还没有机器人，手算） | — | — | — |
| 1 小方 | 传话、两路汇合、认出起点、落石、能不能到、最省力、走不到的路口 | 斜街、最值钱的路、杨辉三角、有坑也有价 | 图里的缝（一根柱子 → 可以斜着走 → 最不起眼的缝 → 剪掉它） | 最大的正方形 |
| 2 远望 | 爬楼梯、倒着算、拿石子、连线不交叉、对齐表、回文 | 有坏台阶的楼梯、最长回文子序列 | 拼写纠错（改一个字母 → 改错字 → 你是想打这个词吗） | 奇还是偶、找最像的一段、两堆石子 |
| 3 长臂 | 青蛙过河、跳得更远、安全过河 | 猜词性、这句话有多可能 | 背包（装背包 → 背包表 → 每件可以拿多次 → 混合背包） | 凑零钱有几种、压成一行 |
| 4 扫帚 | 前面所有的、越来越高 | 合并石子、顺序不止一种、句子的骨架、凑零钱 | 切单词（最少几块 → 有的词更贵 → 分词） | 最大的一段 |
| 5 千层 | 不能连着偷、找出破绽、钥匙与门 | 买卖一次股票、冷冻期 | 设计状态（两把钥匙 → 三把钥匙 → 记得够不够） | 环形街道 |
| 6 回环 | 绕一圈 | 格子世界、箭头自己长出来 | 格子世界（往右往下找宝藏 → 会打滑的地板 → 有冰有地） | — |

`npm run check` 对《状态之图》已经清零。

长臂的背包系列可以当作样板：
- 伸缩臂在地基里由青蛙过河教会，背包专题从手装背包开始；
- 专题是"装背包 → 背包表 → 每件可以拿多次 → 混合背包"。混合背包给每件物品一个"能不能拿多次"的事实，它的参考解因此也能直接解前一关和 0/1 背包表；
- 测试选的是让"全都只拿一次"和"全都能拿多次"两种想法都答错的背包。

## 10. 实例：《视觉完备》

每一章是一个 era（`games/vision-complete/game.json` 的 `eras`）：主线是步骤（新元件和紧跟的小练习交替），专题和挑战挂在各自需要的那一关之后；主线按机制整理成带名字的系列；互不依赖的系列排成并行组（比如第 1 章的「锐化」和「找边」，第 6 章的「角点」和「匹配」），先后随意，全部通过才继续。哪些关能并行，按元件依赖判断：一关用到的元件，搭出它的关必须在它之前。全部 12 章（第 0–11 章）都已这样重排，审计（含抽象链的 `unused`、`bare-intro`）清零：

- 能拼出来的元件都由玩家拼：ReLU = 相乘 + 阈值，取较大 = ReLU 再加回去，最大池化 = 取较大 + 平移 + 隔点取样，Sigmoid = exp + 加常数 + 相除；
- 拼不出来的原件用探测关引入（平移、阈值），或声明为原始元件（cos、exp、相除、开方、求平均、全图最大值、频域相乘、可学习的数）；
- 「放大解锁」：一个频率的探针搭好后，解锁对每个频率都做探针的「频谱」；
- 机关台只留给拼不出来的机制（暗箱、采样、几万步的训练）。
- 跨章按话题决定带走什么：第 0–3 章的流水线元件加上第 4 章不学习的那几样（exp、ReLU、取较大、最大池化）是共同底座。第 1–5、7、10、11 章延续上一章，写 `"all"`；第 6 章（转向几何）、第 8 章（潜空间生成）、第 9 章（从生成回到逐像素）的 `keeps` 只列这份底座。第 10 章还要用第 6 章搭出的非极大值抑制，第 11 章还要用第 5 章的注意力，所以第 6、8、9 章的列表也要带上它们（`crosses` 要求中途每一章都放行；没用到时托盘会折叠起来）。可学习 3×3 核是原始元件，第 6 章留下后，到修旧照片那一关用 `adds` 重新带来。

打开抽象链审计时，报出了五个搭出后再没人用的元件，按两种办法处理：
- 有后续价值的，补一道真用上它的练习，放在不用它会很长的地方：多通道 3×3 核之后的「蓝天与黄沙」（三个核加两次加法收成一个元件），残差块之后的「再深一倍」（十二层，每层一个元件，不用它就是二十四张）。两道新关都用游戏自己的训练器验证过能训出来。
- 只是一课的（锐化、纵向差分、位置编码），关照样留着，但不再做成元件。

## 11. 实例：《证明完毕》的章怎么排

`games/qed/DESIGN.md` 的第 3、4 节是这几条规则落到一个课程上的样子，这里只点出各条在哪里起作用。

- **练习，而不是一关一个定律。** 连接词一章每条规则后面跟一组按维度变化的练习，定律不当关卡的主题，而是练习里自然出现的目标。
- **墙在前，元件在后。** 反证法不在连接词一章发下来：玩家先搭出只用引入和消去规则的 auto，看它搜遍了也证不出排中律，再给核加上反证法（经典逻辑一章）。
- **放在被核心用到的地方。** 德摩根、双重否定在连接词一章就能证，但它们的用处是化简器把否定推进去，所以在化简器一章证出，最后一段任务马上当改写规则用；证明项在规则与元变量、策略、化简器几章都用不上，放在建在它上面的归纳类型、依赖类型之前。
- **不依赖的就分支。** 合一器造好以后，倒着用规则和高阶模式是两路；策略一章的组合子和回溯是两路，搜索和按形状拆又是两路。
- **基础元件最少。** 策略的原始元件只有用规则和已知里有，规则对已知、往前推、拆目标、用已知、auto 都是搭出来的；化简器的原始元件只有改写一处，化简是重复框、几条路和改写搭出来的。
- **重看旧东西的章并任务。** 证明即程序一章不加新规则，读证明项、写证明项都按「同一个点一关、几段任务」排，不把前几章的证明一个连接词一关地重做一遍。
- **专题挂在它要回答的问题后面。** 「机器做不到的事」（理发师到停机问题）只用量词规则和说谎者，但它回答的是自动化一章留下的问题（饱和器证不出时停不下来，有没有机器能判定一切），所以放在自动化最后；不完备性要用数，挂在数与列表一章，接在停机问题后面。
- **元件讲机制在前，填块写法在后。** 《证明完毕》前面的章都用元件接线（真值电路、证明板、机器板），把机制讲完；证明即程序、依赖类型与相等、结构化证明这三章换成写出来的证明（证明项、脚本），放在最后。反射要用证明项和定义相等，所以从自动化一章挪到依赖类型与相等，排在定义相等之后。
- **一个主题讲完再换。** 数和列表原来分在化简器（算）和归纳类型（声明、归纳）两章，现在是一章：证明板上手算 → 化简算 → 声明 → 证明板上手做归纳 → 机器上的归纳规则 → 不完备性。新机制先在证明板上手做一遍（两个框的归纳元件），机器上的规则才有前因。
- **不为一关造机器。** 证明即程序一章原来用化简搭一台「化简证明」，只在下一关用一次，又把玩家拉回机器板；现在弯路就在证明板上接出算下来的那一个，计算交给后面的定义相等。
- **检查要分清规则的性质。** 归纳不是一阶逻辑的推论，用它的证明关在反模型检查里会被误报「证不出」；检查只对一阶的证明做反模型搜索。
