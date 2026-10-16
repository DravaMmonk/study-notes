# 2 查询优化

## 查询流水线

- 用户
	- 不同类型的用户发出不同类型的查询
- 查询求值引擎 (Query Evaluation Engine)
	- 查询 → 关系代数表达式 (relational algebra expression) → 执行计划 (execution plan)（经过优化）
- 存储管理器 (Storage Manager)
	- 页抽象（分配、加载、替换）
	- 索引访问
	- 缓冲池 (buffer pool)
	- 并发
	- 事务日志
- 磁盘 / 存储
	- 数据文件 —— *真实数据*
	- 索引 —— *快速访问*
	- 数据字典 (data dictionary) —— *元数据（表结构、索引结构、约束……）*

---
## 关系代数表达式

### 选择与投影

```SQL
SELECT name
FROM dogs
WHERE breed = 'Labrador'
```

等价于：

$$
\pi_{\text{name}} ( \sigma_{\text{breed=\textit{`Labrador'}}} (\texttt{dogs} ) )
$$

其中，  
- $\sigma$ —— 选择 (selection)（选取行）
- $\pi$ —— 投影 (projection)（选取列）

### 连接操作

```SQL
SELECT name
FROM dogs
JOIN owners
ON dogs.owner_id = owners.owner_id
```

等价于：

1. **在笛卡尔积上做选择**

$$
\pi_{\text{name}}(\sigma_{\texttt{dogs}.owner\_id = \texttt{owners}.owner\_id} (\texttt{dogs} \Join \texttt{owners}))
$$

2. **θ 连接 (θ-join)**

$$
\pi_{\text{name}}(\texttt{dogs} \Join_{\texttt{dogs}.owner\_id = \texttt{owners}.owner\_id} \texttt{owners})
$$

3. **自然连接 (natural join)**

$$
\pi_{\text{name}}(\texttt{dogs} \Join \texttt{owners})
$$

其中，  
- $\Join$ —— 连接操作

---
## 页

页 (page) 是数据库在磁盘和内存之间读写数据时使用的固定大小的存储块。

页的开销：

$$
\text{Pages Cost} = \frac{\text{Record Size}}{\text{Page Size}}
$$

一次查询的开销：

$$
\text{Query Cost} \approx \text{Number of Page R/W}
$$

---
## 基于代价的穷举搜索

步骤：  
1. 生成与查询逻辑等价的各种表达式
	- $\sigma_\theta(R \Join S)$, $\sigma(R \Join_\theta S)$, ...
2. 为得到的表达式标注具体实现方式，从而得到备选查询计划
	- 堆扫描 (heap scan)（*整张表*）、索引扫描 (index scan)……
3. 依据**估计代价**选出最便宜的计划，估计代价基于：
	- 表的统计信息（例如不同值的个数、表大小、直方图……）
	- 中间结果的大小
	- 算法的代价公式

查询计划的估计代价：

$$
\text{Query Cost} \approx \text{Estimated Cost to Join} + \text{Estimated Cost for Scanning}
$$

---
### 缩减因子

缩减因子 (reduction factor, RF) 指对一张表施加某个**选择条件**之后剩下的行所占的比例。  
- 常用于估计结果的代价：

$$
\text{Result Size} = \text{Table Size} \times \text{Reduction Factor}
$$

1. 连接的 RF（例如条件：$R.A = S.B$）

$$
RF = \frac{1}{\max(V(A),V(B))}
$$

其中，  
- $V$ —— **不同**值的个数

$$
\text{Result Size} = |R| \times |S| \times RF
$$


2. 比较条件的 RF

"$A = c$"：

$$
RF = \frac{1}{V(A)}
$$

"$A > c$"：

$$
RF = \frac{\max(A) - c}{\max(A) - \min(A)}
$$

"$a < A < b$"：

$$
RF = \frac{b-a}{\max(A) - \min(A)}
$$

3. 多个条件

$$
RF = RF(A) \times RF(B)
$$

---
### 更好地估计 RF

- 采样 (sampling)
	- 在数据的一个随机子集上测试该条件。
- 直方图 (histogram)
	- 利用已存储的数据取值分布统计信息

---
### 扫描策略

1. 堆（全表）扫描

Page 1 → Page 2 → Page 3 → ... → Page N。 
- ✅不存在索引
- ✅查询的是**表中很大一部分**（选择性低）
- ✅顺序扫描比大量随机索引查找**更便宜**

2. 索引扫描

索引 → 行 ID → 页 ID。 
- ✅**等值查找或小范围查询**之类的条件
- ✅适合**点查询（例如按主键查找）**

---
### 连接算法

1. 嵌套循环连接 (nested loop join)

对于 $R.A = S.B$：

```psudo
for each tuple r in R:
    for each tuple s in S:
        if r.A == s.B:
            output (r,s)
```

$$
\text{Cost} \approx B_R + N_R \times B_S
$$

其中，  
- $B$ —— 页数
- $N$ —— 行数

2. 面向页的嵌套循环连接 (page-oriented nested loop join)

```psudo
for each page pr in R:
    load pr
    for each page ps in S:
        load ps
        for each tuple r in pr:
            for each tuple s in ps:
                if r.A == s.B:
                    output (r,s)
```

$$
\text{Cost} \approx B_R + B_R \times B_S
$$
---
## 基于启发式的优化

好的优化器为何重要：  
- 它是查询效率的核心
- 算法：最合适 > 最好

基于代价的优化器的局限：  
- 结果大小的估计代价 $\ne$ 查询代价
- 生成候选计划本身也可能很昂贵

启发式规则 (heuristic rules)：
- 尽早执行选择
- 尽早执行投影
- 在同类操作中，先执行限制性最强的选择和连接操作

便宜的查询 → 简单启发式  
昂贵的查询 → 穷举枚举

---
## 自适应计划

先等一个计划执行，再选择下一个最佳备选方案。

当**优化器的代价估计不可靠**时，自适应计划 (adaptive plan) 最有用。    
- 统计信息过时
- 数据倾斜
- 复杂连接
- 大型分析查询

---
## 进一步优化
### 重新调整统计信息

统计信息表会从监控、分析、反馈和错误中学习。

### 内存优化

通过设置 `ENGINE = MEMORY`，把常用的表创建并存放在主存中。

```SQL
CREATE TABLE (
...
)ENGINE=MEMORY
```

---
