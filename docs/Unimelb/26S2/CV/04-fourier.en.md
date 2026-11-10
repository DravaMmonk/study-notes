# COMP90086 Lecture 4 - Frequency Filtering

Sources: `lecture/COMP90086-04-Fourier.pdf` and `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt`.

This lecture looks at images in a different way: instead of only asking "what is the value of each pixel", it also asks "how much of the image changes quickly and how much changes slowly". This is the frequency-domain view.

Learning path: [Frequency, magnitude and phase](#topic-1) → [From formula to effect](#topic-2) → [Ringing and compression](#topic-3) → [Inspecting images with spectra](#topic-4).

Key points: reading spectra, the convolution theorem, low-pass and high-pass filtering. Hard parts: why phase affects shape, and why hard truncation produces ripples. Compression and detecting generated images are only supplementary applications.

<a id="topic-1"></a>
## 1. Reading a spectrum: frequency, magnitude and phase

### Why look at frequency

![Slide 6 - Signals as sinusoids](assets/04-fourier/slide-06.png)

A 1D signal can be viewed as a sum of many sinusoids. A single sinusoid can be written as:

$$
y=A\sin(\omega x+\varphi).
$$

- $A$ : amplitude, how large the oscillation is;
- $\omega$ : frequency, how fast it oscillates;
- $\varphi$ : phase, where the waveform starts, equivalent to a shift.

Increasing $\omega$ makes the ripples denser; increasing $A$ makes the peaks and troughs higher; changing $\varphi$ shifts the whole shape but leaves the frequency unchanged.

![Slide 8 - Sinusoid parameters](assets/04-fourier/slide-08.png)

For images, slowly varying large-scale outlines are low frequencies; edges, fine textures and small details are high frequencies. The value of the frequency domain is that some variations which are not obvious in the spatial image become very obvious in the frequency distribution.

### What the Fourier transform outputs

![Slide 18 - Fourier transform](assets/04-fourier/slide-18.png)

The Fourier transform rewrites a signal from the spatial or time domain into the frequency domain. Each frequency corresponds to a complex coefficient, which should be understood as two parts:

- **Magnitude**: how strong this frequency is;
- **Phase**: how this frequency is positioned relative to the overall structure.

First keep these two quantities distinct; a swapping experiment later shows why phase cannot be discarded.

![Slide 20 - DC component](assets/04-fourier/slide-20.png)

Frequency $0$ is called the **DC component**, and represents the average brightness or mean value. Low frequencies describe broad, slow changes; high frequencies describe rapid changes.

![Slide 21 - Magnitude and phase](assets/04-fourier/slide-21.png)

In the figure, the vector length $A$ corresponds to the magnitude and the angle $\phi$ to the phase; together they describe one complex coefficient, not two unrelated frequencies.

#### A simple way to read a spectrum

When you see a spectrum, first ask:

1. Is the centre very bright? If so, the image probably has a strong average brightness or low-frequency structure;
2. Are there bright spots far from the centre? If so, the image contains rapidly repeating variation;
3. In which direction do the bright spots lie? This reflects the orientation of repeating patterns in the image;
4. Is the spectrum concentrated or spread out? The more spread out it is, the richer the frequency content usually is.

### From 1D signals to 2D images

![Slide 25 - Fourier transform of an image](assets/04-fourier/slide-25.png)

An image has two spatial directions, horizontal and vertical, so its frequency domain also has two directions, $\omega_x$ and $\omega_y$ . The zero frequency is usually shifted to the centre of the spectrum:

- Near the centre: low spatial frequencies;
- Farther from the centre: higher spatial frequencies.

![Slide 26 - Interpreting Fourier spectra](assets/04-fourier/slide-26.png)

For a set of regular stripes: the denser the stripes, the farther the bright spots in the spectrum are from the centre; if the stripes rotate, the spectrum rotates too. The orientation of edges in the image is perpendicular to the direction of the bright spots in the spectrum, so do not read them as the same direction.

### Which matters more, magnitude or phase

![Slide 33 - Magnitude and phase](assets/04-fourier/slide-33.png)

Think of magnitude as "how energy is distributed across frequencies", and phase as "how those frequencies are arranged in space".

![Slide 34 - Mixing magnitude and phase](assets/04-fourier/slide-34.png)

In class, the magnitude and phase of different images were combined crosswise. The reconstruction usually keeps the overall brightness/texture feel of the magnitude source, but its recognisable outlines and object structure are closer to the phase source.

This does not mean magnitude is useless; it is a reminder that **phase cannot simply be treated as noise.** It carries the spatial relationships between frequency components, and without it, clear object structure is hard to recover.

<a id="topic-2"></a>
## 2. Frequency-domain filtering: from formula to effect

### The convolution theorem: two ways of filtering are interchangeable

![Slide 37 - Convolution theorem](assets/04-fourier/slide-37.png)

The core formula is:

$$
\mathcal F\{h*f\}
=\mathcal F\{h\}\,\mathcal F\{f\}.
$$

It means:

- Convolution in the spatial domain becomes element-wise multiplication in the frequency domain;
- Multiplying in the frequency domain and then applying the inverse transform gives the result of spatial filtering;
- Conversely, multiplication in the spatial domain corresponds to convolution in the frequency domain.

So there are two routes to filtering:

1. Slide the kernel directly over the image;
2. Transform both the image and the filter into the frequency domain, multiply, and apply the inverse transform.

Which is faster depends on the image size, the kernel size and the actual library; the formula tells us the two are equivalent, not that every implementation costs the same.

### Low-pass, high-pass and band-pass

#### Low-pass: keep the broad outlines

![Slide 39 - Low-pass filter](assets/04-fourier/slide-39.png)

A low-pass filter lets low frequencies through and attenuates high frequencies. The result is therefore smoother: the overall layout is preserved, while edges, fine textures and small details are weakened.

![Slide 40 - Low-pass mask](assets/04-fourier/slide-40.png)

In the frequency domain, a filter can be seen as a mask: values close to 1 at positions to keep and close to 0 at positions to remove. Multiply the mask element-wise with the spectrum, then apply the inverse transform, to obtain the filtered image.

#### High-pass: keep the rapid changes

![Slide 42 - High-pass filter](assets/04-fourier/slide-42.png)

A high-pass filter does the opposite: it removes low frequencies and emphasises edges and details. The result often looks like an outline sketch, because smooth regions and overall brightness have been removed.

#### Band-pass: keep only one range of frequencies

A band-pass filter removes both frequencies that are too low and those that are too high, keeping only the middle range. It is suited to studying textures or patterns at a particular scale.

<a id="topic-3"></a>
## 3. The cost of truncation: ringing and compression

### Ringing: why cutting frequencies sharply produces ripples

![Slide 45 - Ringing artefact](assets/04-fourier/slide-45.png)

If the mask jumps abruptly from 1 to 0 at some frequency, that is a hard cutoff. In the spatial domain it corresponds to an oscillating kernel, which, when it meets an abrupt edge, can produce alternating bright and dark ripples on both sides of the edge. This is called a **ringing artefact**.

The intuition is that abruptly cutting off a large group of sinusoids produces unnatural oscillations in the reconstruction. A Gaussian mask transitions smoothly from keep to remove, so it usually causes less ringing than a rectangular hard mask, although its cutoff is also less sharp.

![Slide 48 - Gaussian low-pass](assets/04-fourier/slide-48.png)

![Slide 49 - Gaussian high-pass](assets/04-fourier/slide-49.png)

If the Gaussian low-pass transfer function is $H_{\mathrm{LP}}$ , the corresponding high-pass filter can be written as:

$$
H_{\mathrm{HP}}=1-H_{\mathrm{LP}}.
$$

<!-- figure: harmonic-analyser -->

### The frequency domain and image compression

![Slide 52 - Frequency-domain compression](assets/04-fourier/slide-52.png)

The human eye is usually not very sensitive to certain high-frequency differences, so compression can discard some high-frequency information without making a thumbnail look noticeably different. For computer vision, however, high frequencies may be exactly the edges, small objects and textures, and cannot simply be treated as "useless information".

![Slide 53 - JPEG and DCT](assets/04-fourier/slide-53.png)

A simplified JPEG pipeline is:

1. Split the image into $8\times8$ blocks;
2. Apply the discrete cosine transform (DCT) to each block;
3. Quantise the coefficients of different frequencies, usually more aggressively for high frequencies;
4. Encode and store.

This is why JPEG compression artefacts are often more visible near edges, fine textures and repeating patterns.

<a id="topic-4"></a>
## 4. Supplement: inspecting images with spectra

### Other uses of frequency analysis

![Slide 56 - Dog vs hot dog frequency differences](assets/04-fourier/slide-56.png)

An adversarial image may change only a few pixels in the spatial domain, but when compared in the frequency domain, changes in magnitude or phase may be easier to spot. This helps us study why a model changes its prediction.

![Slide 57 - GAN-generated images](assets/04-fourier/slide-57.png)

Real photos and GAN-generated images may also have different frequency statistics. Frequency analysis can therefore be used in image forensics, for example to find patterns left behind by image generation or processing.

## Self-check for this lecture

1. When stripes become denser, where do the bright spots in the centred spectrum move?
2. Why does swapping the phase of two images change the recognisable structure?
3. How might a hard low-pass filter and a Gaussian low-pass filter differ near edges?
