"""Pair every note with its translation, so the site reads in Chinese or English.

A note keeps its original file, X.md, in whichever language it was written; its translation sits beside it as
X.zh.md (an English original) or X.en.md (a Chinese original). The translations stay out of the nav, and every page
gets a small JSON map of all the pairs (window.__i18n), which docs/javascripts/site.js uses to add the language
button, send a reader to the version in their language, and point the nav and in-note links at that version.

Folders get readable titles in both languages from docs/.sections.json: the nav is built with the English title and the map
carries the Chinese one, which site.js puts in when the reader reads Chinese.
"""

import json
import re
from pathlib import Path
from posixpath import relpath, dirname, join, normpath

from mkdocs.structure.nav import Section

SUFFIX = re.compile(r"\.(zh|en)\.md$")
TITLE = re.compile(r"^#\s+(.+)$", re.M)
FRONT_TITLE = re.compile(r"\A---\n(?:.*\n)*?title:\s*(.+)\n(?:.*\n)*?---\n")

pairs = {}  # src_uri of either file -> {"zh": File, "en": File}

# Folder under docs/ -> {"en": title, "zh": title}. Fieldnotes reads the same file for its library and breadcrumbs.
SECTIONS = {
    folder: (titles["en"], titles["zh"])
    for folder, titles in json.loads((Path(__file__).resolve().parent.parent / "docs" / ".sections.json").read_text()).items()
}


def _title(file):
    match = FRONT_TITLE.search(file.content_string) or TITLE.search(file.content_string)
    return re.sub(r"[*_`]", "", match.group(1)).strip() if match else None


def on_files(files, config):
    pairs.clear()
    by_uri = {f.src_uri: f for f in files.documentation_pages()}
    for uri, file in by_uri.items():
        match = SUFFIX.search(uri)
        if not match:
            continue
        original = by_uri.get(uri[: match.start()] + ".md")
        if not original:
            continue
        lang = match.group(1)
        pair = {lang: file, ("en" if lang == "zh" else "zh"): original}
        pairs[uri] = pairs[original.src_uri] = pair
    return files


def _drop_translations(items):
    kept = []
    for item in items:
        if isinstance(item, Section):
            item.children = _drop_translations(item.children)
            if item.children:
                kept.append(item)
        elif getattr(item, "file", None) is not None and SUFFIX.search(item.file.src_uri):
            continue
        else:
            kept.append(item)
    return kept


def _first_page(section):
    for child in section.children:
        if isinstance(child, Section):
            found = _first_page(child)
            if found:
                return found
        elif getattr(child, "file", None) is not None:
            return child
    return None


def _title_sections(items, depth=0):
    for item in items:
        if not isinstance(item, Section):
            continue
        page = _first_page(item)
        if page:
            folder = "/".join(page.file.src_uri.split("/")[: depth + 1])
            if folder in SECTIONS:
                item.title = SECTIONS[folder][0]
        _title_sections(item.children, depth + 1)


def on_nav(nav, config, files):
    nav.items = _drop_translations(nav.items)
    _title_sections(nav.items)
    nav.pages = [p for p in nav.pages if not SUFFIX.search(p.file.src_uri)]
    for i, page in enumerate(nav.pages):
        page.previous_page = nav.pages[i - 1] if i else None
        page.next_page = nav.pages[i + 1] if i + 1 < len(nav.pages) else None
    return nav


def _site_map():
    seen, entries = set(), []
    for pair in pairs.values():
        if id(pair) in seen:
            continue
        seen.add(id(pair))
        entries.append({lang: {"url": f.url, "title": _title(f)} for lang, f in pair.items()})
    return entries


RAW_MD_LINK = re.compile(r'href="([^":#?]+\.md)(#[^"]*)?"')


def on_page_content(html, page, config, files):
    """Links to notes inside raw HTML (the home page's cards) are left as X.md by MkDocs; point them at the page."""
    here = dirname(page.file.src_uri)

    def resolve(match):
        target = files.get_file_from_path(normpath(join(here, match.group(1))))
        if not target:
            return match.group(0)
        return f'href="{relpath(target.url, dirname(page.file.url) or ".")}{match.group(2) or ""}"'

    return RAW_MD_LINK.sub(resolve, html)


REDIRECT = (
    "(function(d){var l;try{l=localStorage.getItem('fieldnotes.lang')}catch(e){}"
    "if(l!=='zh'&&l!=='en')l=/^zh\\b/i.test(navigator.language||'')?'zh':'en';"
    "var a=document.querySelector('link[rel=alternate][hreflang='+l+']');"
    "if(d.lang&&d.lang!==l&&a)location.replace(a.href+location.hash)})(window.__i18n)"
)


def on_post_page(output, page, config):
    uri = page.file.src_uri
    pair = pairs.get(uri)
    lang = None
    if pair:
        lang = next(l for l, f in pair.items() if f.src_uri == uri)
    data = {"lang": lang, "pairs": _site_map(), "sections": {en: zh for en, zh in SECTIONS.values()}}
    # The redirect to the reader's language runs here in <head>, before anything is drawn; site.js does the rest.
    script = (
        f"<script>window.__i18n={json.dumps(data, ensure_ascii=False)};{REDIRECT}</script>"
    )
    links = ""
    if pair:
        here = dirname(page.file.url) or "."
        for l, f in pair.items():
            links += f'<link rel="alternate" hreflang="{l}" href="{relpath(f.url, here)}">'
    output = output.replace("</head>", links + script + "</head>", 1)
    if lang:
        output = re.sub(r'<html lang="[^"]*"', f'<html lang="{"zh-CN" if lang == "zh" else "en"}"', output, count=1)
    return output
