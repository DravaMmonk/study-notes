# Localize content

Write the locale named in the scope. Follow a field's message key to the locale files in the same course or package.
Each locale file maps message keys directly to text. Read the field in context, including its level, what the player
has already learned, and any terms it links. Existing locale entries can help establish intent and terminology.

Use `text.set` with a field location and one locale, for example
`{ "op": "text.set", "level": "start", "path": "title", "lang": "fr", "value": "Départ" }`.
Use `in: "game"`, `in: "glossary"` or `in: "pieces"` in place of `level` to address those fields. Applying a
translation edit updates the corresponding locale file.
Reference tags should name the relevant level, piece or entry that the player can access at that point.

Preview the changeset, run the content checks and review the missing fields reported by `./gate --scope <locale>`.
