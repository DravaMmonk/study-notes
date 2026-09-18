# COMP90086 Computer Vision

这套笔记面向刚入门计算机视觉的学习者。每讲先说明要解决的问题，再按专题展开；图片旁说明看什么，老师原话旁解释含义。**重点／难点／易错**表示学习时需要多花注意力的地方，不代表对考试范围的预测。补充资料简短列出或折叠，末尾用自测问题检查理解。

## 按知识模块学习

| 模块 | 学习顺序 | 要建立的能力 |
| --- | --- | --- |
| 图像怎样形成和存储 | [01 视觉任务](01-introduction.md) → [02 成像与数组](02-basics.md) → [05 光、颜色与边缘](05-image-formation-ii.md) | 分清现实场景、投影与像素值 |
| 怎样处理图像 | [03 空间滤波](03-filters.md) → [04 频率滤波](04-fourier.md) | 理解局部加权计算，以及频率如何影响图像 |
| 怎样学习图像特征 | [06 CNN 基础](06-cnns-i.md) → [07 CNN 训练](07-cnns-ii.md) → [08 结构与迁移](08-cnns-iii.md) → [09 ViT](09-vit.md) → [10 表示学习](10-representations.md) | 看懂信息流、参数、训练目标与模型边界 |
| 怎样匹配并恢复三维 | [11 局部特征](11-features.md) → [12 特征匹配](12-feature-matching.md) → [13 深度与双目](13-depth-stereo.md) → [14 两视图几何](14-two-view-geometry.md) | 从外观候选走到几何约束与深度 |
| 怎样生成新图像 | [15 AE 与 VAE](15-generation.md) → [16 GAN](16-gans.md) | 分清重建、采样、对抗训练与生成质量 |

跟课时可按文件编号 01–16 阅读；复习时可按上表的专题阅读。跨讲重复概念只在其主要章节详细解释，其他地方链接回去。

## Workshop 对应位置

练习按包内周次编号；Canvas 部分页面的主题名称有错位。这里根据 Notebook 的实际内容连接笔记。

| 练习 | 笔记中的主要连接 |
| --- | --- |
| Week 1 安装与示例 | 图像数组与基础环境 |
| Week 2 图像操作 | [02](02-basics.md)：通道顺序、裁剪、插值、单位换算 |
| Week 3 滤波 | [03](03-filters.md)、[04](04-fourier.md)：空间与频域方法 |
| Week 4 颜色与 MNIST | [05](05-image-formation-ii.md)、[07](07-cnns-ii.md)：亮度、颜色与 MLP/CNN 比较 |
| Week 5 CNN 参数与特征 | [07](07-cnns-ii.md)、[08](08-cnns-iii.md)、[10](10-representations.md) |
| Week 6 ViT 与 Grad-CAM | [09](09-vit.md)、[10](10-representations.md)：注意距离与类别热图 |
| Week 7 Hough 与特征匹配 | [11](11-features.md)、[12](12-feature-matching.md) |
| Week 8 标定、极线与双目 | [13](13-depth-stereo.md)、[14](14-two-view-geometry.md)；官方答案尚未发布 |

笔记解释原练习的目的与容易出错之处；本次整理没有重新执行或训练 Notebook 中的模型。

## 资源与来源

- [资源完整性](RESOURCE-STATUS.md)：截至 2026-09-18 的 Week 1–8 下载状态。
- [Reading Links](READING-LINKS.md)：统一保存阅读链接与章节，避免各篇重复。
- [资源清单与校验值](RESOURCE-INVENTORY.json)：来源、原始文件名与本地校验记录。

每篇开头列出对应 PDF 和字幕。第 1–15 讲有本地字幕；第 16 讲暂时只有讲义依据。`老师原话`仅用于可与字幕核对的英文，中文说明是笔记对资源的解释。自拟例子与课外推导单独标明。

讲义截图编号均指 **PDF 页码**，未必等于页脚印刷编号；交互演示的截图是静态图。第 10、11 讲封面沿用旧年份，第 15、16 讲页脚沿用 Week 9，归档周次以 Canvas 当前发布位置和讲课主题为准。

| 本地目录 | 内容 |
| --- | --- |
| `lecture/` | 16 份讲义 PDF |
| `transcript/` | 15 份按 Week/W/F 归档的字幕 |
| `workshop/week-NN/` | Week 1–8 练习与配套文件、Week 2–7 已发布答案 |
| `workshop/packages/` | 原始 Workshop 压缩包 |
| `assets/<topic>/` | 选用讲义页的 PNG 截图 |
| `assignment/A1/` | 作业说明、Notebook 与测试图 |
| `exam/` | 练习考试与答案 |

原始课程资料和截图保留在本地，不提交到版本库。可复用的笔记整理规则位于仓库 `.agents/skills/study-notes-course-materials/SKILL.md`。

## Assignment 1：已有资料

**Sampling, Aliasing, and Filtering**。原说明截止时间为 2026-08-23 23:59，占总成绩 6%；此处记录原要求，不代表当前延期或提交状态。

任务包括降采样与混叠、高斯抗混叠，以及二维直接滤波、可分离一维滤波和 FFT 方法的运行时间比较。本地 `assignment/A1/` 保留说明、Notebook、`zoneplate.png` 和 `picket-fence.jpg`；具体交付要求以原说明为准。
