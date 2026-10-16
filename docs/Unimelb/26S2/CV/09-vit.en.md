# COMP90086 Lecture 9 - Vision Transformers

Sources: `lecture/COMP90086-09-ViT.pdf` and `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` (originally downloaded as `W-transcript-4.txt`; confirmed from the lecture topic to be the Week 5 ViT lecture). The main text follows the slides, with the lecturer's own words placed next to the relevant concepts; the original Week 5 paper summaries are optional extension material.

Remember this first: **a Vision Transformer (ViT) cuts an image into many small patches, treats each patch as a token (one processing unit in a sequence), and then uses self-attention to learn the relationship between any two image regions.** A CNN is built to process local neighbourhoods first; a ViT can compare distant patches from the very first layer, but it usually needs more data to learn the image regularities that a CNN already has built into its structure.

Learning path: [patches and positions](#topic-1) → [how attention passes information](#topic-2) → [encoder blocks and classification](#topic-3) → [data, detail and compute](#topic-4).

Key points: patches, positions, Q/K/V and the class token. Hard part: what the rows and columns of the attention matrix mean. Common mistakes: being able to see globally is not the same as having learned the relationships, and small patches greatly increase the cost.

<a id="topic-1"></a>
## 1. Input representation: patches and positions

### Inductive bias: what a model believes before it sees the data

**Inductive bias** is the set of assumptions or constraints a model carries before training. It makes the learning algorithm prefer certain solutions instead of treating all possible solutions as equally likely.

This is not "bias" in the sense of a mistake. When training data is limited, a sensible inductive bias narrows the search space and makes it easier for the model to learn regularities that generalise.

For example, a $224\times224\times3$ image has $150{,}528$ values. If the model were allowed to combine all pixels in arbitrary ways, the possible relationships would be far too many to enumerate. A CNN builds two important assumptions into its structure in advance:

- **Locality**: neighbouring pixels are more likely to combine into meaningful features, such as edges or textures.
- **Translation equivariance**: the same filter is shared across the whole image, so when a feature moves elsewhere, its response in the feature map moves with it.

![Slide 6 - Inductive biases of CNNs](assets/09-vit/slide-06.png)

A single output of a $3\times3$ convolution can only directly see a $3\times3$ region. Only by stacking layers (all with stride 1) does the receptive field grow layer by layer:

$$
r_L = 1 + 2L.
$$

Here $L$ is the number of $3\times3$ convolution layers. One layer sees $3\times3$ , two layers see $5\times5$ , three layers see $7\times7$ . So a CNN is not completely blind to long-range relationships; it has to go through many layers, first combining local information and then gradually forming features over larger regions.

Self-attention is different: a token can read every other token already in the first layer, so it has a global receptive field from the start. It is not forced to "look nearby first, then further away". This gives the model more freedom and also reduces the CNN's locality assumption.

> **Lecturer's words**: "it's using the same weights on every patch"
>
> **Interpretation**: this is about a CNN reusing the same set of weights at every position, a constraint built into the architecture, not weights that happen to end up equal after training.

### Why treat an image as a sequence of tokens

Transformers were originally designed for text sequences. A sentence is already naturally split into words, but an image has no ready-made word boundaries, so ViT uses a simple rule: cut the image into fixed-size, non-overlapping **patches**.

![Slide 14 - Image patches become a token sequence](assets/09-vit/slide-14.png)

Suppose the input image has size $H\times W\times C$ :

- $H$ : height;
- $W$ : width;
- $C$ : channels, usually 3 for an RGB image;
- each patch has size $P\times P$ .

If both $H$ and $W$ are divisible by $P$ , the number of patches is:

$$
N=\frac{H}{P}\times\frac{W}{P}=\frac{HW}{P^2}.
$$

For example, a $224\times224$ image with $16\times16$ patches gives:

$$
N=\frac{224}{16}\times\frac{224}{16}=14\times14=196.
$$

Each RGB patch originally contains $P\times P\times3$ numbers. After flattening, a $16\times16$ patch becomes a vector of length $16\times16\times3=768$ . A learnable linear layer then maps it to a **patch embedding** of length $D$ :

$$
z_i = x_iE+b,
$$

where $x_i$ is the $i$-th flattened patch; the projection matrix and bias are written $E,b$ , and both are parameters learned during training. The output is $z_i\in\mathbb{R}^{D}$ . This step does not predict a class; it turns every patch into a token representation that the Transformer can process uniformly.

### Position: why patches alone are not enough

If only the patch embeddings were given to self-attention, the model would know "which patches there are" but not where they were in the original image. If the patches are shuffled, the attention output is simply shuffled in the same way; attention itself does not change its computation because something is "top-left" or "bottom-right".

But visual relationships often depend on position: two eyes above a nose may form a face, while the same local features in a different arrangement may not. So ViT adds a **positional encoding** to each patch:

$$
\tilde z_i=z_i+p_i,
$$

where $p_i$ represents the $i$-th position. This is element-wise addition, not concatenating the two vectors end to end.

![Slide 19 - Positional encoding](assets/09-vit/slide-19.png)

Think of $p_i$ as an "address label" each patch carries with it. Even if the token order is rearranged, the address stays with its patch, so the model still has a chance to infer the original spatial layout.

<a id="topic-2"></a>
## 2. Key idea: how attention passes information

### What self-attention actually computes

The core question of self-attention is: **for the current patch, how much information should I read from each of the other patches?**

#### Intuition for Query, Key and Value

![Slide 15 - Queries, keys and values](assets/09-vit/slide-15.png)

The same input token $x_i$ passes through three different learned linear transformations:

$$
q_i=x_iW_Q,\qquad k_i=x_iW_K,\qquad v_i=x_iW_V.
$$

- **Query (Q)**: what the current token is looking for.
- **Key (K)**: the features each token uses to say "I might be relevant to you".
- **Value (V)**: what information I actually provide if another token attends to me.

An intuitive analogy is looking things up: the query is the search term, the key is each document's index entry, and the value is the document's content. The better the search term matches an index entry, the more content is read from that document.

Q, K and V all come from the input tokens but use different parameter matrices, so they can learn representations with different purposes. Training does not manually specify "this attention head looks for eyes, that head looks for outlines"; these parameters are all updated together by backpropagation from the loss of the final task.

#### From similarity to a weighted average

Stacking all queries, keys and values into matrices $Q,K,V$ , standard scaled dot-product attention is written as:

$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V.
$$

Here $d_k$ is the dimension of each query/key vector, and $N$ is the number of tokens taking part in attention. Step by step:

1. $QK^\top$ compares every query with every key, giving an $N\times N$ score matrix.
2. Dividing by $\sqrt{d_k}$ stops the dot products from becoming too large as the vector dimension grows, which would push softmax too close to 0 or 1 and make the gradients tiny.
3. Softmax turns each row into weights that sum to 1.
4. These weights are used to take a weighted average of all value vectors, giving each token its new representation.

![Slide 16 - One attention head](assets/09-vit/slide-16.png)

Take the 6th patch as an example: its query $q_6$ is compared with all keys, not just those of neighbouring patches. If it matches the 4th and 10th keys best, the output $y_6$ will mainly absorb information from $v_4$ and $v_{10}$ .

So attention does not "pick one patch and copy it"; it produces a set of continuous weights and then forms a weighted combination of all the values.

### Multi-head attention: why more than one attention head

One attention head has only one set of $W_Q,W_K,W_V$ , and therefore only one learned matching rule. **Multi-head attention** runs several attention heads in parallel, letting the model look for different kinds of relationships at the same time.

For example, some heads might focus more on colour similarity, while others might focus more on combining distant parts of an object. This is just a possible picture to aid understanding; it does not mean every head can be clearly named by a human.

Writing the embedding width and the number of heads as $D,h$ , a common choice is to give each head a width of:

$$
d_k=d_v=\frac{D}{h}.
$$

The outputs of the heads are first concatenated back to width $D$ and then mixed by an output matrix $W_O$ . This way, adding heads does not necessarily increase the total parameter count proportionally, because each head becomes narrower at the same time.

<!-- figure: attention-switchboard -->

<a id="topic-3"></a>
## 3. The full network: encoder blocks and classification

### A Transformer encoder block does two things

![Slide 21 - Transformer encoder block](assets/09-vit/slide-21.png)

Each encoder block alternates between two kinds of processing:

1. **Multi-head self-attention**: passes information between tokens. Only this step lets one patch directly read other patches.
2. **MLP**: applies a non-linear transformation to each token independently. All tokens use the same MLP parameters, but in this step they do not read each other.

The pre-normalisation encoder block from the slides can be written as:

$$
X'=X+\operatorname{MSA}(\operatorname{LN}(X)),
$$

$$
Y=X'+\operatorname{MLP}(\operatorname{LN}(X')).
$$

- **LayerNorm (LN)** helps stabilise the scale of the feature dimensions within each token.
- **Residual connection** adds the input directly back to the output. Attention or the MLP learns a correction to the existing representation, so each layer does not have to rebuild all the information from scratch.
- **MLP** usually contains two linear layers with a non-linear activation in between.

These blocks are repeated $L$ times. Position information is added once before the first layer and is then carried through the network together with the token representations.

### How a complete ViT produces a classification

![Slide 22 - Complete Vision Transformer](assets/09-vit/slide-22.png)

The whole pipeline can be read as a single line:

$$
\text{image}
\rightarrow \text{patches}
\rightarrow \text{patch embeddings + positions}
\rightarrow L\text{ encoder blocks}
\rightarrow \text{classification head}.
$$

ViT also prepends a learnable **class token**, usually written `[CLS]`, to the patch sequence. It is not a real patch from the image, but an extra token dedicated to summarising information from the whole image.

Because `[CLS]` also takes part in self-attention at every layer, it can keep reading information from all the patch tokens. After the last encoder block, the model feeds the `[CLS]` representation into an MLP head, which outputs the class scores.

> **Lecturer's words**: "It generates keys and queries and values just like all the others, and it participates in this information sharing process."
>
> **Interpretation**: the subject here is the class token: it does not wait until all the patches are computed and then take an average; it takes part in the information exchange from the first layer onward.

**Common mistake**: the count above was of patches; the input to the encoder blocks also includes the class token:

$$
N=196+1=197,
$$

where the extra 1 is the class token.

<a id="topic-4"></a>
## 4. Trade-offs: data, detail and compute

### Key differences between CNNs and ViTs

| Question | CNN | ViT |
| --- | --- | --- |
| How far the first layer can directly see | Local neighbourhood of a small kernel | Each token can attend to all tokens |
| How spatial structure enters the model | Local connectivity and weight sharing of convolution | Patch splitting plus positional embeddings |
| Translation-related assumptions | Strong, built into the architecture | Not written directly into the structure as in a CNN |
| Learning long-range relationships | Needs many stacked layers to grow the receptive field | Possible in the first self-attention layer |
| Tendency on small datasets | Inductive bias usually helps more | More prone to overfitting because of greater freedom |
| Cost of the number of tokens/features | Depends on the convolutional feature maps | Standard attention is quadratic in the number of tokens |

The conclusion of the slides needs careful reading: it is not that "Transformers are always better than CNNs", nor that "ViT has no inductive bias". ViT still assumes a fixed patch grid, a patch scale and some form of position representation. A more accurate statement is: **ViT uses locality and translation biases that are different from, and weaker than, those of a CNN.**

![Slide 27 - Data scale and inductive bias](assets/09-vit/slide-27.png)

The original ViT work emphasised large-scale pre-training followed by transfer to smaller datasets. The slides also point out that CNN/ViT comparisons depend on the training setup, data scale and compute budget; you cannot decide which is better just from the name of the architecture.

### Why patches cannot be made arbitrarily small

Smaller patches preserve finer spatial detail, but they rapidly increase the number of tokens.

For a fixed image size, halving the patch side from $P$ to $P/2$ gives:

$$
N'=\frac{HW}{(P/2)^2}=4N.
$$

Standard self-attention compares all pairs of tokens, so the main cost of the attention scores grows with $N^2$ . When the number of tokens becomes 4 times larger, this part of the cost becomes roughly:

$$
(4N)^2=16N^2.
$$

![Slide 32 - Patch size and quadratic attention cost](assets/09-vit/slide-32.png)

Large patches are cheaper but may crudely cut through small objects or boundaries; small patches are finer but more expensive. Later methods such as the Swin Transformer compute attention within local windows first and shift the windows in the next layer, so that information can still cross the original window boundaries.

![Slide 33 - Shifted local windows](assets/09-vit/slide-33.png)

This can be seen as adding part of the locality assumption back into the Transformer, so that finer visual structure can be handled at lower cost.

> **Lecturer's words**: "we've got this quadratic computational cost with the number of patches."
>
> **Interpretation**: when configuring a model, count the patches first and then estimate the cost of pairwise comparisons; do not look only at how much the image side length has grown.

<details>
<summary>Extra: reading and exercises</summary>

The course paper links are in the [Week 5 reading index](READING-LINKS.md). CLIP is covered in the [next lecture](10-representations.en.md); this week's CNN parameter exercises are in [CNNs II](07-cnns-ii.en.md). Master the information flow in this lecture first, then read the papers.

</details>

### Workshop 6: once everything is visible, how far does the model actually look

Source: `workshop/week-06/worksheet06.ipynb`. The original exercise classifies with a pre-trained ViT and then computes the mean attention distance for each head in each layer: the spatial distance between patches, weighted by the attention weights. It lets you check whether "the architecture allows looking far away" actually becomes "attending to distant regions on this image". Compare again on other images; the result for a single image cannot be taken as a fixed rule for all inputs. The model was not re-run for these notes.

## Self-test

1. For a 224×224 image with 16×16 patches, how many patches and class tokens are there?
2. What does one row of the attention matrix compare, and what does it take a weighted average of?
3. When the patch side is halved, by what factor do the number of patches and the pairwise comparison cost each grow?
