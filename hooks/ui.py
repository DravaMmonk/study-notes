"""Package the notes site's shared UI without building or publishing games."""

import shutil
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent / "games" / "kit"
ASSETS = ("tokens.css", "ui.css", "prose.css", "menu.js", "lang.js", "theme.js")


def on_post_build(config, **kwargs):
    target = Path(config["site_dir"]) / "assets" / "kit"
    target.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        shutil.copy2(KIT / name, target / name)
