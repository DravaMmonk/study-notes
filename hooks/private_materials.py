"""Add a document index to the private MkDocs build."""

from collections import defaultdict
from pathlib import PurePosixPath
from urllib.parse import quote

from mkdocs.structure.files import File


def on_files(files, config):
    courses = defaultdict(list)
    for file in files:
        path = PurePosixPath(file.src_uri)
        if path.suffix.lower() in {".pdf", ".ppt", ".pptx", ".pps", ".ppsx"}:
            courses[" / ".join(path.parts[1:3])].append(path)

    lines = ["# Course slides and PDFs"]
    for course, paths in sorted(courses.items()):
        lines.extend(["", f"## {course}", ""])
        for path in sorted(paths):
            title = path.name.replace("[", r"\[").replace("]", r"\]")
            lines.append(f"- [{title}]({quote(path.as_posix())})")

    files.append(File.generated(config, "course-materials.md", content="\n".join(lines)))
    return files
