"""Move private course assets between a MkDocs build and a private Git checkout."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path, PurePosixPath

MANIFEST = "course-assets.json"
OFFICE_FILES = {".pdf", ".ppt", ".pptx", ".pps", ".ppsx"}


def is_course_asset(path):
    return path.suffix.lower() in OFFICE_FILES or (
        path.parts[0] == "Unimelb"
        and (
            {"assets", "lecture", "exam"}.intersection(path.parts[1:-1])
            or path.name.startswith("Screenshot")
        )
    )


def digest(path):
    with path.open("rb") as asset:
        return hashlib.file_digest(asset, "sha256").hexdigest()


def export_assets(build, docs, destination):
    manifest = {}
    for asset in sorted(build.rglob("*")):
        path = asset.relative_to(build)
        source = docs / path
        if (
            asset.is_file() and source.is_file() and not source.is_symlink()
            and is_course_asset(path) and digest(source) == digest(asset)
        ):
            target = destination / "docs" / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            manifest[path.as_posix()] = digest(source)

    if not manifest:
        raise SystemExit("No course assets found. Build the complete private site first.")
    (destination / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Exported {len(manifest)} course assets.")


def check_assets(repository, directory):
    manifest = json.loads((repository / MANIFEST).read_text())
    if not isinstance(manifest, dict) or not manifest:
        raise SystemExit("Private course asset manifest is empty or invalid.")

    root = directory.resolve()
    for name, expected in manifest.items():
        path = PurePosixPath(name)
        if path.is_absolute() or not path.parts or ".." in path.parts or not is_course_asset(path):
            raise SystemExit("Invalid path in private course asset manifest.")
        asset = directory / path
        if (
            not asset.resolve().is_relative_to(root) or not asset.is_file()
            or asset.is_symlink() or digest(asset) != expected
        ):
            raise SystemExit("A private course asset is missing or does not match its manifest.")
    return manifest


def import_assets(repository, docs):
    manifest = check_assets(repository, repository / "docs")
    for name in manifest:
        target = docs / name
        if target.exists() or target.is_symlink():
            raise SystemExit("A private course asset overlaps a public source file.")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(repository / "docs" / name, target)
    print(f"Imported {len(manifest)} course assets.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["export", "import", "verify"])
    parser.add_argument("repository", type=Path)
    parser.add_argument("--docs", type=Path, default=Path("docs"))
    parser.add_argument("--build", type=Path, default=Path("site-private"))
    args = parser.parse_args()

    if args.command == "export":
        export_assets(args.build, args.docs, args.repository)
    elif args.command == "import":
        import_assets(args.repository, args.docs)
    else:
        manifest = check_assets(args.repository, args.build)
        print(f"Verified {len(manifest)} private assets in the deployment output.")


if __name__ == "__main__":
    main()
