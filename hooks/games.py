"""Keep the games in the published site.

The games live at site/game/: the hub and the shared kit come straight from games/, and each game is a build of
trace-viewer on the shared game shell (games/kit/shell): Vision Complete from trace-viewer/dist-game
(`npm --prefix trace-viewer run build:game`) into site/game/vision-complete/, 状态之图 from
trace-viewer/dist-state-graph (`npm --prefix trace-viewer run build:state-graph`) into site/game/state-graph/.
`mkdocs gh-deploy` replaces the whole gh-pages branch with site/, so this hook assembles the folder into every
MkDocs build. A game that is not built yet is built here; if that fails, the notes still build and a warning says
which game was left out.
"""

import logging
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("mkdocs.hooks.games")
ROOT = Path(__file__).resolve().parent.parent
GAMES = ROOT / "games"
VIEWER = ROOT / "trace-viewer"
BUILDS = {"vision-complete": ("build:game", VIEWER / "dist-game"), "state-graph": ("build:state-graph", VIEWER / "dist-state-graph")}


def on_post_build(config, **kwargs):
    target = Path(config["site_dir"]) / "game"
    shutil.rmtree(target, ignore_errors=True)
    # The games' sources stay out: each one is published as its build.
    shutil.copytree(GAMES, target, ignore=shutil.ignore_patterns("state-graph"))
    for name, (script, built) in BUILDS.items():
        if not (built / "index.html").exists():
            try:
                subprocess.run(["npm", "--prefix", str(VIEWER), "run", script], check=True, capture_output=True)
            except (OSError, subprocess.CalledProcessError) as error:
                log.warning("%s was not built, so site/game/%s is left out: %s", name, name, error)
                continue
        shutil.copytree(built, target / name)
    log.info("Games copied to %s", target)
