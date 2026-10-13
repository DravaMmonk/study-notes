"""Keep Vision Complete in the published site.

The game is published at site/game/ beside the notes. `mkdocs gh-deploy` replaces the whole
gh-pages branch with site/, so this hook copies the game's build (trace-viewer/dist-game, made by
`npm --prefix trace-viewer run build:game`) into every MkDocs build. If the build is missing it
tries to make it; if that fails, the notes still build and a warning says the game was left out.
"""

import logging
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("mkdocs.hooks.vision_complete")
ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / "trace-viewer" / "dist-game"


def on_post_build(config, **kwargs):
    if not (GAME / "index.html").exists():
        try:
            subprocess.run(["npm", "--prefix", str(ROOT / "trace-viewer"), "run", "build:game"], check=True, capture_output=True)
        except (OSError, subprocess.CalledProcessError) as error:
            log.warning("Vision Complete was not built, so site/game is left out: %s", error)
            return
    target = Path(config["site_dir"]) / "game"
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(GAME, target)
    log.info("Vision Complete copied to %s", target)
