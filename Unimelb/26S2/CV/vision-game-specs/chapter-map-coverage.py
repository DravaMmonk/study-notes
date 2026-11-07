"""Place every COMP90086 knowledge point on the remade Vision Complete chapter map and check prerequisite order.

Usage: python3 -I coverage.py <knowledge-graph.json>
Prints the coverage appendix as Markdown; exits non-zero on a missing point or a prerequisite placed later.
"""
import json
import sys

# Chapter order of the map; lecture numbers are provenance only.
CHAPTERS = {
    0: "质检台", 1: "扫描仪", 2: "去网纹与缩略图", 3: "不怕换灯的质检台", 4: "分拣机", 5: "更深更省",
    6: "相册去重与以图搜图", 7: "书封面", 8: "避障测距", 9: "把图切成区域", 10: "细胞分割",
    11: "重建与生成", 12: "货架盘点", 13: "看它在看哪",
}

# id -> (chapter, primary landing). Landings: 现 the chapter's opening probe, 主 main line, 原 an optional
# principle series, 补 extra lesson (parameter bench), 文 copy only, 专 technical/workshop content inside an
# optional series or topic.
PLACE = {
    "vision-task": (0, "文"), "pixels": (0, "主"), "projection": (8, "主"), "lens": (8, "补"),
    "sampling": (7, "主"),
    "weighted-sum": (1, "主"), "convolution": (1, "主"), "filters": (1, "主"), "padding": (1, "主"),
    "separable": (1, "原"), "gradient": (1, "主"),
    "sinusoid": (2, "主"), "fourier": (2, "主"), "frequency-filter": (2, "主"), "ringing": (2, "主"),
    "compression": (2, "文"),
    "reflectance": (3, "主"), "colour": (3, "主"), "material": (3, "文"), "equivariance": (3, "主"),
    "recognition": (4, "现"), "channels": (4, "主"), "stride": (4, "主"), "pooling": (4, "主"),
    "classification-loss": (4, "主"), "train-split": (4, "主"), "regularisation": (4, "主"),
    "optimisation": (4, "主"),
    "receptive-field": (5, "主"), "residual": (5, "主"), "depthwise": (5, "主"), "transfer": (5, "主"),
    "classification-metrics": (5, "主"),
    "patches": (6, "主"), "attention": (6, "主"), "position": (6, "主"), "attention-cost": (6, "文"),
    "contrastive": (6, "主"), "clip": (6, "主"), "embedding-view": (6, "现"),
    "keypoint": (7, "现"), "harris": (7, "主"), "sift": (7, "主"), "outlier": (7, "现"),
    "hough": (7, "主"), "ransac": (7, "主"), "ratio-test": (7, "主"), "homography": (7, "主"),
    "depth-cues": (8, "现"), "disparity": (8, "主"), "stereo-matching": (8, "主"),
    "learned-depth": (8, "主"), "homogeneous": (8, "主"), "calibration": (8, "主"),
    "epipolar": (8, "主"), "fundamental": (8, "原"), "rectification": (8, "主"),
    "segmentation": (9, "现"), "clustering": (9, "主"), "bag-features": (9, "主"),
    "mean-shift": (9, "主"), "bandwidth": (9, "主"), "superpixels": (9, "主"), "slic": (9, "主"),
    "rag": (9, "主"), "stuff-things": (9, "文"), "grabcut": (9, "主"),
    "fcn": (10, "主"), "encoder-decoder": (10, "主"), "unpooling": (10, "主"), "transpose-conv": (10, "主"),
    "unet": (10, "主"), "sam": (10, "主"), "mask-loss": (10, "主"),
    "probability": (11, "现"), "autoencoder": (11, "主"), "vae": (11, "主"), "latent-sampling": (11, "主"),
    "gan": (11, "主"), "gan-stability": (11, "主"), "generation-evaluation": (11, "主"),
    "conditional-gan": (11, "主"), "gaussian-noise": (11, "原"), "forward-diffusion": (11, "主"),
    "noise-prediction": (11, "主"), "reverse-diffusion": (11, "主"), "latent-diffusion": (11, "主"),
    "conditional-diffusion": (11, "主"), "generation-cost": (11, "文"),
    "detection": (12, "现"), "iou": (12, "主"), "proposals": (12, "主"), "box-regression": (12, "主"),
    "rcnn": (12, "主"), "roi-pooling": (12, "主"), "rpn": (12, "主"), "instance-mask": (12, "主"),
    "yolo": (12, "主"), "detr": (12, "主"), "set-matching": (12, "主"), "nms": (12, "主"),
    "detection-matching": (12, "主"), "precision-recall": (12, "主"), "map": (12, "主"),
    "interpretability": (13, "主"), "robustness": (13, "文"),
    # Off the main line: workshop and library practice.
    "bgr": (7, "专"), "camera-example": (8, "专"), "attention-distance": (6, "专"),
    "gradcam-practice": (13, "专"), "diffusion-schedule-practice": (11, "专"),
    "normalised-cut-practice": (9, "专"), "cnn-parameter-practice": (4, "专"),
    "mnist-practice": (4, "专"), "separable-cnn-practice": (5, "专"),
    "feature-map-practice": (5, "专"), "harris-api-practice": (7, "专"),
    "matching-practice": (7, "专"), "stereo-practice": (8, "专"), "calibration-practice": (8, "专"),
    "generation-practice": (11, "专"),
}

LAYER_ORDER = "现主原补文专"

# Principle series: letter -> (title, knowledge points the series takes to implementation depth).
SERIES = {
    "K": ("卷积的实现", ["convolution", "padding", "separable"]),
    "F": ("频谱的构造", ["fourier", "frequency-filter"]),
    "B": ("反向传播", ["optimisation", "classification-loss"]),
    "N": ("网络的账", ["stride", "receptive-field", "depthwise"]),
    "A": ("注意力的计算", ["attention", "attention-cost"]),
    "R": ("估计的原理", ["homography", "ransac", "sampling", "fundamental", "calibration"]),
    "U": ("转置卷积", ["transpose-conv"]),
    "D": ("扩散的数学", ["gaussian-noise", "forward-diffusion", "reverse-diffusion"]),
}

# Graph edges this map deliberately does not follow, with the reason recorded in the chapter map.
OVERRIDES = {
    # Only the shared idea "one observation, many scenes" is needed; chapter 3 meets it through
    # reflectance itself, and projection's depth ambiguity reuses it in chapter 8.
    ("reflectance", "projection"),
    # Mean shift needs a Gaussian distance kernel, already built as chapter 1's smoothing kernel;
    # adding noise variances belongs to diffusion.
    ("mean-shift", "gaussian-noise"),
}


def main(path):
    entries = json.load(open(path, encoding="utf-8"))["entries"]
    ids = {e["id"] for e in entries}
    problems = [f"unplaced: {i}" for i in sorted(ids - PLACE.keys())]
    problems += [f"unknown id: {i}" for i in sorted(PLACE.keys() - ids)]
    problems += [f"unknown series point: {k}" for _, ks in SERIES.values() for k in ks if k not in PLACE]
    for e in entries:
        if e["id"] not in PLACE:
            continue
        ch = PLACE[e["id"]][0]
        for r in e["requires"]:
            if r in PLACE and PLACE[r][0] > ch and (e["id"], r) not in OVERRIDES:
                problems.append(f"order: {e['id']} (ch {ch}) requires {r} (ch {PLACE[r][0]})")
    if problems:
        print("\n".join(problems), file=sys.stderr)
        sys.exit(1)

    title = {e["id"]: e["title"] for e in entries}
    lecture = {e["id"]: e["lecture"] for e in entries}
    def name(k):
        return f"{title[k]}{'' if lecture[k] is None else f'（L{lecture[k]}）'}"

    print("| 章 | 现象 | 主线 | 原理系列 | 补课 | 只在文案 | 技术与实验 |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    for ch, label in CHAPTERS.items():
        cells = []
        for layer in LAYER_ORDER:
            ks = [k for k, v in PLACE.items() if v == (ch, layer)]
            cells.append("、".join(name(k) for k in ks) or "—")
        print(f"| {ch} {label} | " + " | ".join(cells) + " |")
    print()
    print("| 原理系列 | 加深的知识点 |")
    print("| --- | --- |")
    for letter, (label, ks) in SERIES.items():
        print(f"| {letter} {label} | " + "、".join(name(k) for k in ks) + " |")
    counts = {layer: sum(1 for v in PLACE.values() if v[1] == layer) for layer in LAYER_ORDER}
    print()
    print(f"共 {len(PLACE)} 个知识点：" + "，".join(f"{k} {v}" for k, v in counts.items()) + "。")


if __name__ == "__main__":
    main(sys.argv[1])
