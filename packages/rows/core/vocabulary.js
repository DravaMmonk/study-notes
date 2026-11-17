export const vocabulary = {
  "module": "rows",
  "kinds": {
    "kind": {
      "rows:equation": {
        "about": {
          "zh": "补齐等式右边的加法式"
        }
      }
    }
  },
  "languages": {
    "rows:sum": {
      "about": {
        "zh": "由整数和加号组成的等式右边",
        "en": "The right side of an equation, built from integers and addition"
      }
    }
  }
}

export const meaning = {
  type: 'level', read: value => value,
  vocabulary(base) {
    const kinds = { ...base.kinds }
    for (const [kind, items] of Object.entries(vocabulary.kinds)) kinds[kind] = { ...kinds[kind], ...items }
    return { ...base, kinds, languages: { ...base.languages, ...vocabulary.languages } }
  },
}
