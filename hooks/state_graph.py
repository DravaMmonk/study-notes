"""Keep 状态之图 in the published site.

The game is one static page in state-graph/, published at site/state-graph/ beside the notes.
`mkdocs gh-deploy` replaces the whole gh-pages branch with site/, so this hook copies the folder
into every MkDocs build.
"""

import logging
import shutil
from pathlib import Path

log = logging.getLogger("mkdocs.hooks.state_graph")
SOURCE = Path(__file__).resolve().parent.parent / "state-graph"


def on_post_build(config, **kwargs):
    target = Path(config["site_dir"]) / "state-graph"
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(SOURCE, target)
    log.info("状态之图 copied to %s", target)
