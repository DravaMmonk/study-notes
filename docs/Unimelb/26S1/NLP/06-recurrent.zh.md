# 06 循环网络

## 为什么循环模型重要

- 循环神经网络 (recurrent neural network, RNN) 通过反复更新一个状态向量来处理任意长度的输入序列。
<!-- Sources: L8 p.11 -->
- 循环状态概括了到目前为止已看到的前缀。
<!-- Sources: L8 p.11 -->

$$
s_i=\tanh(W_s s_{i-1}+W_x x_i+b),
\qquad
y_i=\mathrm{softmax}(W_y s_i)
$$
<!-- Sources: L8 p.16 -->

## 训练

- 将 RNN 沿时间展开会得到一个深层计算图，各时间步之间共享参数。
<!-- Sources: L8 p.15 -->
- 训练使用随时间反向传播 (backpropagation through time, BPTT)。
<!-- Sources: L8 p.15; JM3 Ch.13 BPTT discussion -->

## 作为语言模型的 RNN

- 在循环语言模型中，当前词元是输入，循环状态携带之前的上下文，输出分布则预测下一个词元。
<!-- Sources: L8 p.16-18 -->
- 生成过程是自回归的 (autoregressive)：生成的词元会作为之后的输入反馈回去。
<!-- Sources: L8 p.18 -->
- 典型的生成失败包括训练与测试不匹配、错误传播以及生成泛泛而谈的文本。
<!-- Sources: L8 p.19 -->

## 为什么循环模型应当胜过 n-gram

- 循环模型原则上可以利用任意长的左侧上下文，而不是固定宽度的历史。
<!-- Sources: L8 p.21; Wk5 p.16 -->
- 这为在未见序列上获得比基于计数的固定窗口模型更强的泛化能力提供了途径。
<!-- Sources: Wk5 p.16 -->

## 梯度消失

- 在实践中，简单 RNN 仍难以处理长距离依赖，因为梯度在反向传播过程中会迅速缩小。
<!-- Sources: L8 p.21; Wk5 p.17-18 -->
- 因此，较早的输入所获得的学习信号比较晚的输入弱得多。
<!-- Sources: Wk5 p.17-18 -->

## LSTM 的记忆单元与门

- 长短期记忆网络 (Long Short-term Memory, LSTM) 通过引入记忆单元 (memory cell) 和调节信息流的门 (gate) 来解决梯度消失问题。
<!-- Sources: L8 p.22 -->
- 遗忘门、输入门和输出门分别控制丢弃什么、写入什么以及暴露什么。
<!-- Sources: L8 p.26-29 -->

$$
f_t=\sigma(W_f [h_{t-1},x_t]+b_f), \quad
i_t=\sigma(W_i [h_{t-1},x_t]+b_i), \quad
o_t=\sigma(W_o [h_{t-1},x_t]+b_o)
$$

$$
\tilde{C}_t=\tanh(W_C [h_{t-1},x_t]+b_C), \quad
C_t=f_t * C_{t-1}+ i_t * \tilde{C}_t, \quad
h_t=o_t * \tanh(C_t)
$$
<!-- Sources: L8 p.30 -->

## 典型 NLP 应用

| 应用 | 对序列的使用方式 |
| --- | --- |
| 语言建模 | 根据前缀预测下一个词元 |
| 文本分类 | 把一个句子或文档映射到一个标签 |
| 序列标注 | 为每个词元输出一个标签 |
| 双向标注 | 结合从左到右和从右到左的上下文 |
<!-- Sources: L8 p.16-18, p.37-40 -->

- 多层 LSTM 把循环层一层层堆叠起来。
<!-- Sources: L8 p.39 -->
- 双向 LSTM (bidirectional LSTM) 让每个输出同时依赖过去和未来的上下文。
<!-- Sources: L8 p.40; JM3 Ch.13 stacked and bidirectional RNN discussion -->

## 实践权衡

- 循环模型很灵活，原则上可以捕捉长上下文。
<!-- Sources: L8 p.41 -->
- 它们的缺点是计算必须串行、在实践中长距离表现较弱，以及在 Transformer 出现后流行度下降。
<!-- Sources: L8 p.41 -->
