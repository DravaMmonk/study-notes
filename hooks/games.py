"""Keep the games in the published site.

The games live at site/game/: the hub and the shared kit come straight from games/, and each game (a folder of
games/ named in games/games.js) is a build of trace-viewer on the shared kit (games/kit/app):
`GAME=<id> npm --prefix trace-viewer run build:game` writes trace-viewer/dist-games/<id>/, copied to site/game/<id>/.
`mkdocs gh-deploy` replaces the whole gh-pages branch with site/, so this hook assembles the folder into every
MkDocs build. A game that is not built yet is built here; if that fails, the notes still build and a warning says
which game was left out.
"""

import logging
import os
import re
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger("mkdocs.hooks.games")
ROOT = Path(__file__).resolve().parent.parent
GAMES = ROOT / "games"
VIEWER = ROOT / "trace-viewer"
# The games, by id, as the hub lists them.
IDS = re.findall(r"^\s*id: '([^']+)'", (GAMES / "games.js").read_text(encoding="utf-8"), re.M)


def on_post_build(config, **kwargs):
    target = Path(config["site_dir"]) / "game"
    shutil.rmtree(target, ignore_errors=True)
    # The games' specs stay out: each one is published as its build.
    shutil.copytree(GAMES, target, ignore=shutil.ignore_patterns(*IDS))
    for name in IDS:
        built = VIEWER / "dist-games" / name
        if not (built / "index.html").exists():
            try:
                subprocess.run(["npm", "--prefix", str(VIEWER), "run", "build:game"], check=True, capture_output=True, env={**os.environ, "GAME": name})
            except (OSError, subprocess.CalledProcessError) as error:
                log.warning("%s was not built, so site/game/%s is left out: %s", name, name, error)
                continue
        shutil.copytree(built, target / name)
    log.info("Games copied to %s", target)
