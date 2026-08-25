# Fieldnotes

A local-first Markdown reader for the study notes in `../docs`.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The library is generated from every Markdown file under `docs/` whenever the app starts or builds.

## Annotations

Select text in any note to open the annotation toolbar. A highlight can use one of four colours, and the comment action opens the annotation panel for writing a note. Annotations are stored in browser `localStorage`; source Markdown files are never modified.

Use **Export this note** to download the current document's annotations as JSON. Clearing site data also clears local annotations.
