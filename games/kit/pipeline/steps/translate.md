# Translation

Translate a game's text into one language, through the operation set. This is its own work, apart from making the
game (`games/DIRECTION.md`, decision 20): the content is written in one base language and you never change it; a
translation that seems impossible because the base text is unclear is a finding for the copy step, in your report.

The language is named in your scope. The overlay is `games/<game>/i18n/<lang>.json`: one entry a base text, keyed by
the text itself, so the same words are translated once wherever they stand. `./gate` lists what is missing (texts that
still read in the base language), what is wrong (a translation whose markup is broken or whose links differ from its
text's) and what no text reads any more.

Read a whole chapter before translating any of it: the levels in play order, then the encyclopedia entries they link.
Keep one word for one term across the game, and take the term from the field's own usage in that language, not from
the base text's wording. Keep every link (`<level-ref>`, `<part-ref>`, `<wiki-ref>`) and every formula exactly; write
the sentence around them naturally for a reader of that language. A symbol or a name that reads the same in both
languages is translated to itself, so it does not stay listed as missing.

Write with `i18n.set` (`{ op: "i18n.set", lang, from: "<the base text, exactly>", to: "<its translation>" }`), many
in one changeset, through `./op --file <file>`; `--dry-run` previews. An entry no text reads any more is dropped with
`i18n.set` without `to`, once you have read what replaced its text.
