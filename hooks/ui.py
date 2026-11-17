"""Package the notes site's shared UI without building or publishing games, and embed the levels of a notes edition.

A note marks a level of a notes edition (games/DESIGN.md 12.1 in the games repository) with <!-- task: game/namespace/level --> on its own line; it
becomes the game's published page, embedded (docs/javascripts/site.js gives it the page's language and its height).
"""

import re
import shutil
from pathlib import Path

UI = Path(__file__).resolve().parent.parent / "ui"
ASSETS = ("tokens.css", "ui.css", "prose.css", "menu.js", "overlays.js", "lang.js", "theme.js")


def on_post_build(config, **kwargs):
    target = Path(config["site_dir"]) / "assets" / "kit"
    target.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        shutil.copy2(UI / name, target / name)


TASK = re.compile(r"^[ \t]*<!--\s*task:\s*([a-z0-9-]+)/(@?[a-z][a-z0-9-]*/[A-Za-z0-9_][A-Za-z0-9_-]*)\s*-->[ \t]*$", re.M)


def on_page_markdown(markdown, page, config, **kwargs):
    games = config["extra"]["games"]
    return TASK.sub(
        lambda m: f'<iframe class="task-embed" data-game="{games}{m[1]}/" data-level="{m[2]}" loading="lazy"></iframe>',
        markdown,
    )
