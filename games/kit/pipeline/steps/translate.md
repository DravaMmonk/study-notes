# Localize content

Write the language named in the scope. Every localized field holds its own texts, keyed by locale. Read the field
in context, including its level, what the player has already learned, and any terms it links. Existing language texts
can help establish intent and terminology.

Use `text.set` with a field location and one locale, for example
`{ "op": "text.set", "level": "start", "path": "title", "lang": "fr", "value": "Départ" }`.
Use `in: "game"`, `in: "glossary"` or `in: "pieces"` in place of `level` to address those files.
Reference tags should name the relevant level, piece or entry that the player can access at that point.

Preview the changeset, run the content checks and review any missing fields reported by the language gate.
