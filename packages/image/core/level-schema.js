export const levelSchema = {
  "type": "obj",
  "fields": {
    "title": {
      "type": "text"
    },
    "after": {
      "type": "text",
      "about": {
        "zh": "通过这一关时说的话（最后一个任务的点题）",
        "en": "what passing the level says (its last task’s pass text)"
      }
    },
    "intro": {
      "type": "list",
      "of": {
        "type": "obj",
        "fields": {
          "t": {
            "type": "text"
          },
          "fig": {
            "type": "either",
            "of": [
              {
                "type": "obj",
                "fields": {
                  "test": {
                    "type": "int",
                    "min": 0
                  },
                  "task": {
                    "type": "int",
                    "min": 0,
                    "optional": true
                  },
                  "view": {
                    "type": "ref",
                    "kind": "view",
                    "optional": true
                  },
                  "caption": {
                    "type": "text",
                    "optional": true
                  }
                }
              },
              {
                "type": "obj",
                "fields": {
                  "part": {
                    "type": "ref",
                    "kind": "part",
                    "reference": "circuit/part"
                  },
                  "params": {
                    "type": "map",
                    "of": {
                      "type": "any"
                    },
                    "optional": true
                  },
                  "input": {
                    "type": "either",
                    "of": [
                      {
                        "type": "oneOf",
                        "values": [
                          "test"
                        ]
                      },
                      {
                        "type": "call",
                        "kind": "picture"
                      }
                    ],
                    "optional": true
                  },
                  "inputs": {
                    "type": "list",
                    "of": {
                      "type": "either",
                      "of": [
                        {
                          "type": "oneOf",
                          "values": [
                            "test"
                          ]
                        },
                        {
                          "type": "call",
                          "kind": "picture"
                        }
                      ]
                    },
                    "optional": true
                  },
                  "view": {
                    "type": "ref",
                    "kind": "view",
                    "optional": true
                  },
                  "caption": {
                    "type": "text",
                    "optional": true
                  }
                }
              },
              {
                "type": "obj",
                "fields": {
                  "figure": {
                    "type": "str",
                    "pattern": "^[a-z0-9-]+$",
                    "about": {
                      "zh": "笔记插图的名字（trace-viewer/src/figures 登记的 id，检查时核对）",
                      "en": "the id of one of the notes’ figures (as trace-viewer/src/figures registers it, checked)"
                    }
                  },
                  "caption": {
                    "type": "text",
                    "optional": true
                  }
                }
              }
            ],
            "optional": true
          }
        }
      },
      "section": "read",
      "about": {
        "zh": "引言：进关前读的几页，每页一段话和一张可选的图",
        "en": "the intro: pages read before playing, each a paragraph and maybe a figure"
      }
    },
    "tasks": {
      "type": "list",
      "min": 1,
      "of": {
        "type": "obj",
        "fields": {
          "id": {
            "type": "task"
          },
          "step": {
            "type": "text",
            "optional": true
          },
          "brief": {
            "type": "text"
          },
          "play": {
            "type": "str",
            "reference": "play"
          },
          "after": {
            "type": "text",
            "optional": true
          }
        }
      }
    },
    "carry": {
      "type": "level",
      "section": "course",
      "about": {
        "zh": "从这关通过时的电路开始",
        "en": "Start from the circuit that passed this level"
      },
      "optional": true
    },
    "unlocks": {
      "type": "list",
      "of": {
        "type": "ref",
        "kind": "unlock"
      },
      "section": "course",
      "optional": true
    }
  }
}
