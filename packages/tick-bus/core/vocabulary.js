export const vocabulary = {
  "module": "tick-bus",
  "kinds": {
    "op": {},
    "family": {
      "tick-bus:family-value": {
        "about": {
          "zh": "算数的元件",
          "en": "parts that work on numbers"
        }
      },
      "tick-bus:family-memory": {
        "about": {
          "zh": "读写寄存器的元件",
          "en": "parts that read and keep registers"
        }
      }
    },
    "want": {
      "tick-bus:want-line": {
        "about": {
          "zh": "这一拍线上的位",
          "en": "the bit on the line this tick"
        }
      },
      "tick-bus:want-delayed": {
        "about": {
          "zh": "输入 input 上一拍的值；第一拍给 first",
          "en": "what the input `input` was the tick before; first on the first tick"
        },
        "params": {
          "type": "obj",
          "fields": {
            "input": {
              "type": "str"
            },
            "first": {
              "type": "int"
            }
          }
        }
      }
    }
  },
  "languages": {}
}

export const meaning = {
  type: 'level', read: value => value,
  vocabulary(base) {
    const kinds = { ...base.kinds }
    for (const [kind, items] of Object.entries(vocabulary.kinds)) kinds[kind] = { ...kinds[kind], ...items }
    return { ...base, kinds, languages: { ...base.languages, ...vocabulary.languages } }
  },
}
