"""Keep the games in the published site.

The games live at site/game/: the hub, the shared kit and 状态之图 come straight from games/, and Vision Complete
is the build of trace-viewer (trace-viewer/dist-game, made by `npm --prefix trace-viewer run build:game`), copied to
site/game/vision-complete/. `mkdocs gh-deploy` replaces the whole gh-pages branch with site/, so this hook assembles
the folder into every MkDocs build. If Vision Complete is not built it tries to build it; if that fails, the notes
still build and a warning says the game was left out.
"""

import logging
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("mkdocs.hooks.games")
ROOT = Path(__file__).resolve().parent.parent
GAMES = ROOT / "games"
VISION = ROOT / "trace-viewer" / "dist-game"


def on_post_build(config, **kwargs):
    target = Path(config["site_dir"]) / "game"
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(GAMES, target)
    if not (VISION / "index.html").exists():
        try:
            subprocess.run(["npm", "--prefix", str(ROOT / "trace-viewer"), "run", "build:game"], check=True, capture_output=True)
        except (OSError, subprocess.CalledProcessError) as error:
            log.warning("Vision Complete was not built, so site/game/vision-complete is left out: %s", error)
            return
    shutil.copytree(VISION, target / "vision-complete")
    log.info("Games copied to %s", target)
