# Topic 5: How to generate new images

This topic answers: **how does a model "draw" new images that are not in the training set?** The earlier topics all compute an answer from an image; generative models go the other way, starting from random numbers and producing an image. A VAE organises the randomness into a well-structured latent space, while a GAN pits a generator against a discriminator.

Learning path: [VAE sampler](#1-vae-sampler-lecture-15) → [real-or-fake test bench](#2-real-or-fake-test-bench-lecture-16).

## 1. VAE sampler (Lecture 15)

<!-- figure: vae-sampler -->

**What this device is**: a Galton board (bean machine). Balls fall from a funnel at the top, bounce through seven rows of fixed pegs and land in eight bins; below the bins is a row of swinging deflector vanes that send the balls into a collecting trough at the bottom that can slide left and right. The encoder box on the left has an input plate and a KL gauge, and on top of the decoder on the right is a shape plate that deforms.

**The concept**: the encoder does not output a point but a distribution N(μ, σ²). All the randomness lives in the fixed pegs (ε ~ N(0,1)), and μ and σ only decide how the vanes are set, so z = μ + σ·ε is differentiable with respect to μ and σ; this is the reparameterisation trick. The KL gauge reads ½(μ² + σ² − 1 − ln σ²), which measures how far N(μ, σ²) is from the prior N(0, 1). When switched to "Generate from prior", all vanes stand vertical, z is just ε, and no input image is needed.

**How to play**: choose an input with "Diamond / Circle / Square", adjust μ with the left/right arrow keys and σ with the up/down arrow keys. Space drops one ball, G toggles "Generate from prior", and R empties the trough.

**What to watch**: how the balls that have already fallen shift with μ and stretch or shrink with σ; the needle of the KL gauge; and how far the decoder's top plate (the one with the black outline) differs from the original outline engraved below it.

**Common misconceptions**: thinking that "sampling is not differentiable" so the model cannot be trained; in fact the randomness has been moved into ε. Thinking that a smaller σ is always better: reconstruction gets more accurate, but the KL grows, the latent space no longer stays close to the prior, and sampling from the prior then decodes into strange outputs. Also, generation does not require feeding the encoder an image; just draw z directly from N(0,1).

Lecture notes: [Lecture 15 · VAE and reparameterisation](../15-generation.en.md)

## 2. Real-or-fake test bench (Lecture 16)

<!-- figure: gan-bench -->

**What this device is**: a ball rack that looks like an abacus. Each cell has two columns: the dark balls are a batch of real samples (a distribution with two peaks), and the white balls are a batch just dropped by the generator's two nozzles. Behind the balls stands a row of slats, like a profile gauge, and the height of each slat is the discriminator's output D(x); behind the slats runs a thin line at D = ½.

**The concept**: the alternating min-max training of a GAN. In its step, the discriminator D raises the slats where there are more real balls and lowers them where there are more fake balls; in its step, the generator G moves its nozzles towards where D is high, trying to fool D. The readout D accuracy = ½·E_real[D] + ½·E_fake[1 − D] is 0.5 at equilibrium.

**How to play**: space or → trains one step, Enter trains continuously, R resets. Use "Start apart / Start together" (or press C) to change the initial state.

**What to watch**: the shape of the slats. When starting apart, each nozzle takes one peak, and all the slats fall onto the ½ line. When starting together, the two nozzles get the same gradient at every step and can never separate, so all the white balls pile up on the right peak, while the slats above the left peak bulge high and D keeps chasing. This is mode collapse.

**Common misconceptions**: thinking that "D accuracy 0.5 means the generator has learned well": D is also 0.5 at step 0, and some step during the collapse can also be close to 0.5. Nor should you assume that sharp samples mean diverse samples: under mode collapse all samples crowd onto one peak, each one "looks real", but the coverage is incomplete.

Lecture notes: [Lecture 16 · GAN training and mode collapse](../16-gans.en.md)

## Putting it together

Both methods generate images starting from a random z, but their training signals differ. A VAE has an encoder and uses "reconstruction error + KL" to tell the model directly how close its drawing is to the original, while shaping the latent space to be close to N(0,1); training is therefore stable, but outputs are often somewhat blurry. A GAN has no reconstruction objective, only the discriminator's judgement, so its samples can be very sharp, at the cost of having to find a balance between two networks during training and the risk of mode collapse.

## Hands-on self-test

1. On the VAE sampler, make σ smaller. How do the reconstruction gap and the KL readout each change? Why can the two not both be minimised at the same time?
2. After switching to "Generate from prior", what does the distribution of balls in the collecting trough look like? Do μ and σ still have any effect?
3. On the real-or-fake test bench, why can "Start together" never separate the two peaks? In that case, is D accuracy necessarily above 0.5?
