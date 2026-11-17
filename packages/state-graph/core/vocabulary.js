export const vocabulary = {
  "module": "state-graph",
  "kinds": {
"play": {"state-graph:circuit": {"about": {"zh": "拼电路板：机器人在每一格上跑它", "en": "wiring a board the robot runs on every cell"}}, "state-graph:fill": {"about": {"zh": "亲手填表：每个地点的路线数", "en": "filling the table by hand: the routes to every place"}}, "state-graph:trace": {"about": {"zh": "一条条找出所有路线", "en": "tracing every route one by one"}}, "state-graph:link": {"about": {"zh": "连线不交叉：两串字相同的字母连起来", "en": "lines that never cross between equal letters of two strings"}}, "state-graph:pack": {"about": {"zh": "亲手装背包", "en": "packing a backpack by hand"}}, "state-graph:breach": {"about": {"zh": "找反例：画两条路线，落进同一个格子", "en": "finding the counterexample: two routes into one cell"}}, "state-graph:policy": {"about": {"zh": "顺着价值画出箭头", "en": "drawing the arrows along the values"}}, "state-graph:seam": {"about": {"zh": "一条条剪掉图里的缝", "en": "cutting seams out of a picture one by one"}}},
    "world": {
      "state-graph:world-grid": {
        "about": {
          "zh": "棋盘城市：只往右或往下走，每格可以有石头、体力或金币",
          "en": "the grid city: right or down only, a cell may hold a rock, energy or coins"
        },
        "params": {
          "type": "obj",
          "fields": {
            "scan": {
              "type": "oneOf",
              "values": [
                "rowTL",
                "rowBR",
                "colL",
                "colR",
                "colRB"
              ],
              "optional": true
            },
            "answerAt": {
              "type": "oneOf",
              "values": [
                "start",
                "end"
              ],
              "optional": true
            },
            "rounds": {
              "type": "bool",
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "given": {
              "type": "map",
              "of": {
                "type": "num"
              },
              "keys": "^\\d+,\\d+$",
              "optional": true
            },
            "rocks": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            },
            "costs": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "num"
                }
              },
              "view": "grid",
              "optional": true
            },
            "coins": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "num"
                }
              },
              "view": "grid",
              "optional": true
            }
          }
        }
      },
      "state-graph:world-gridYes": {
        "about": {
          "zh": "棋盘城市，每格存「是 / 否」：能不能走到这里",
          "en": "the grid city holding yes / no: can a route get here"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "rocks": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            }
          }
        }
      },
      "state-graph:world-piles": {
        "about": {
          "zh": "两堆石子：(a, b) 是两堆各剩几颗，存轮到的人能不能赢",
          "en": "two piles of stones: (a, b) the stones left, holding whether the player to move wins"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            }
          }
        }
      },
      "state-graph:world-tri": {
        "about": {
          "zh": "砖块叠成的三角：从顶上一块往下走",
          "en": "bricks stacked in a triangle, walked down from the top one"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "k": {
              "type": "int",
              "min": 0
            }
          }
        }
      },
      "state-graph:world-lawn": {
        "about": {
          "zh": "铺草坪：一块地上有树，找最大的空正方形",
          "en": "a lawn to lay: a field with trees, the biggest open square"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "trees": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              }
            }
          }
        }
      },
      "state-graph:world-strip": {
        "about": {
          "zh": "一段楼梯：一次上一级或两级，坏台阶踩不得",
          "en": "a flight of stairs: one or two steps at a time, broken steps not to be stood on"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "n": {
              "type": "int",
              "min": 0
            },
            "broken": {
              "type": "list",
              "of": {
                "type": "int",
                "min": 0
              },
              "optional": true
            }
          }
        }
      },
      "state-graph:world-pile": {
        "about": {
          "zh": "一堆石子：一次拿一颗或两颗，拿走最后一颗的赢",
          "en": "a pile of stones: take one or two, whoever takes the last wins"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "n": {
              "type": "int",
              "min": 0
            }
          }
        }
      },
      "state-graph:world-coins": {
        "about": {
          "zh": "凑零钱：每格是一个钱数，扫描臂退回每种硬币",
          "en": "making change: a cell is an amount, the sweep arm steps back by every coin"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "n": {
              "type": "int",
              "min": 0
            },
            "coins": {
              "type": "list",
              "of": {
                "type": "int",
                "min": 1
              }
            }
          }
        }
      },
      "state-graph:world-parts": {
        "about": {
          "zh": "切词：一串字母切成词典里的词，每块有代价",
          "en": "cutting a string into dictionary words, each part at a cost"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "s": {
              "type": "str"
            },
            "dict": {
              "type": "either",
              "of": [
                {
                  "type": "list",
                  "of": {
                    "type": "str"
                  }
                },
                {
                  "type": "map",
                  "of": {
                    "type": "num"
                  }
                }
              ]
            },
            "letter": {
              "type": "num",
              "optional": true
            }
          }
        }
      },
      "state-graph:world-rob1": {
        "about": {
          "zh": "一排房子，每家一个格子",
          "en": "a row of houses, one cell a house"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "a": {
              "type": "list",
              "of": {
                "type": "num"
              }
            }
          }
        }
      },
      "state-graph:world-rob2": {
        "about": {
          "zh": "一排房子，每家三个格子：没偷、偷了、最多",
          "en": "a row of houses, three cells a house: skipped, robbed, most so far"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "a": {
              "type": "list",
              "of": {
                "type": "num"
              }
            }
          }
        }
      },
      "state-graph:world-ring": {
        "about": {
          "zh": "环形的街：第一家和最后一家相邻",
          "en": "a street in a ring: the first house and the last are neighbours"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "a": {
              "type": "list",
              "of": {
                "type": "num"
              }
            }
          }
        }
      },
      "state-graph:world-prefix": {
        "about": {
          "zh": "一排房子，每格是到这一家为止的总数",
          "en": "a row of houses, each cell the total so far"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "a": {
              "type": "list",
              "of": {
                "type": "num"
              }
            }
          }
        }
      },
      "state-graph:world-heights": {
        "about": {
          "zh": "一排柱子：以这一根结尾，最长连几根越来越高",
          "en": "a row of posts: the longest rising run ending on this one"
        },
        "params": {
          "type": "obj",
          "fields": {
            "filter": {
              "type": "oneOf",
              "values": [
                "all",
                "lower"
              ],
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "a": {
              "type": "list",
              "of": {
                "type": "num"
              }
            }
          }
        }
      },
      "state-graph:world-gains": {
        "about": {
          "zh": "每天的收支：以这一天结尾的一段最多赚多少",
          "en": "daily gains: the best run of days ending today"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "a": {
              "type": "list",
              "of": {
                "type": "num"
              }
            }
          }
        }
      },
      "state-graph:world-keys": {
        "about": {
          "zh": "有钥匙和门的迷宫，状态记住的每组钥匙是一层",
          "en": "a maze of keys and doors, one layer for every set of keys the state remembers"
        },
        "params": {
          "type": "obj",
          "fields": {
            "remember": {
              "type": "list",
              "of": {
                "type": "oneOf",
                "values": [
                  "red",
                  "blue",
                  "green"
                ]
              },
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "key": {
              "type": "list",
              "of": {
                "type": "int"
              },
              "min": 2,
              "optional": true
            },
            "keys": {
              "type": "map",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            },
            "doors": {
              "type": "list",
              "of": {
                "type": "either",
                "of": [
                  {
                    "type": "list",
                    "of": {
                      "type": "int"
                    },
                    "min": 2
                  },
                  {
                    "type": "obj",
                    "fields": {
                      "at": {
                        "type": "list",
                        "of": {
                          "type": "int"
                        },
                        "min": 2
                      },
                      "color": {
                        "type": "oneOf",
                        "values": [
                          "red",
                          "blue",
                          "green"
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      "state-graph:world-river": {
        "about": {
          "zh": "过河的青蛙：每块石头写着往回能跳多远",
          "en": "a frog crossing a river: each stone says how far back a jump reaches"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "k": {
              "type": "list",
              "of": {
                "type": "either",
                "of": [
                  {
                    "type": "int",
                    "min": 0
                  },
                  {
                    "type": "oneOf",
                    "values": [
                      null
                    ]
                  }
                ]
              }
            },
            "p": {
              "type": "list",
              "of": {
                "type": "num"
              },
              "optional": true
            }
          }
        }
      },
      "state-graph:world-stock": {
        "about": {
          "zh": "股价：每天三种状态，空手、持有、刚卖掉",
          "en": "share prices: three states a day, flat, holding, just sold"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "p": {
              "type": "list",
              "of": {
                "type": "num"
              }
            },
            "cool": {
              "type": "bool",
              "optional": true
            }
          }
        }
      },
      "state-graph:world-align": {
        "about": {
          "zh": "对齐表：一个词在上面，一个词在左边",
          "en": "an alignment table: one word along the top, one down the left"
        },
        "params": {
          "type": "obj",
          "fields": {
            "border0": {
              "type": "bool",
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "top": {
              "type": "str"
            },
            "left": {
              "type": "str"
            }
          }
        }
      },
      "state-graph:world-local": {
        "about": {
          "zh": "局部对齐：两串字最像的一段",
          "en": "local alignment: the most alike stretch of two strings"
        },
        "params": {
          "type": "obj",
          "fields": {
            "border0": {
              "type": "bool",
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "top": {
              "type": "str"
            },
            "left": {
              "type": "str"
            }
          }
        }
      },
      "state-graph:world-knap": {
        "about": {
          "zh": "背包表：行是物品，列是容量",
          "en": "the knapsack table: rows are items, columns capacities"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "W": {
              "type": "int",
              "min": 0
            },
            "items": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "n": {
                    "type": "text",
                    "optional": true
                  },
                  "w": {
                    "type": "int",
                    "min": 0
                  },
                  "v": {
                    "type": "num",
                    "optional": true
                  },
                  "many": {
                    "type": "bool",
                    "optional": true
                  }
                }
              }
            },
            "ways": {
              "type": "bool",
              "optional": true
            }
          }
        }
      },
      "state-graph:world-roll": {
        "about": {
          "zh": "压成一行的背包：只留一行，原地改写",
          "en": "the knapsack in one row, rewritten in place"
        },
        "params": {
          "type": "obj",
          "fields": {
            "dirs": {
              "type": "obj",
              "fields": {
                "01": {
                  "type": "oneOf",
                  "values": [
                    "asc",
                    "desc"
                  ]
                },
                "inf": {
                  "type": "oneOf",
                  "values": [
                    "asc",
                    "desc"
                  ]
                }
              },
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "kind": {
              "type": "oneOf",
              "values": [
                "01",
                "inf"
              ]
            },
            "W": {
              "type": "int",
              "min": 0
            },
            "items": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "n": {
                    "type": "text",
                    "optional": true
                  },
                  "w": {
                    "type": "int",
                    "min": 0
                  },
                  "v": {
                    "type": "num",
                    "optional": true
                  },
                  "many": {
                    "type": "bool",
                    "optional": true
                  }
                }
              }
            }
          }
        }
      },
      "state-graph:world-interval": {
        "about": {
          "zh": "区间表：一段 i..j 的答案，切点扫一遍",
          "en": "the interval table: the answer for a run i..j, every split point swept"
        },
        "params": {
          "type": "obj",
          "fields": {
            "diag": {
              "type": "num",
              "optional": true
            },
            "empty0": {
              "type": "bool",
              "optional": true
            },
            "scan": {
              "type": "oneOf",
              "values": [
                "rowTL",
                "rowBR",
                "colL",
                "colLB",
                "len"
              ],
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "s": {
              "type": "str",
              "optional": true
            },
            "w": {
              "type": "list",
              "of": {
                "type": "num"
              },
              "optional": true
            },
            "words": {
              "type": "list",
              "of": {
                "type": "text"
              },
              "optional": true
            }
          }
        }
      },
      "state-graph:world-vgrid": {
        "about": {
          "zh": "格子世界：宝藏、陷阱和墙，扫到不再变",
          "en": "the grid world: treasure, traps and walls, scanned until it settles"
        },
        "params": {
          "type": "obj",
          "fields": {
            "arrows": {
              "type": "bool",
              "optional": true
            },
            "rounds": {
              "type": "bool",
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "gold": {
              "type": "list",
              "of": {
                "type": "int"
              },
              "min": 2
            },
            "traps": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            },
            "walls": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            },
            "cliffs": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            },
            "ice": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "num"
                },
                "min": 3
              },
              "optional": true
            },
            "rd": {
              "type": "bool",
              "optional": true
            },
            "slip": {
              "type": "num",
              "optional": true
            }
          }
        }
      },
      "state-graph:world-tags": {
        "about": {
          "zh": "给句子标词性：每一列一个词，每一行一种词性",
          "en": "tagging a sentence: a word a column, a part of speech a row"
        },
        "params": {
          "type": "obj",
          "fields": {
            "prob": {
              "type": "bool",
              "optional": true
            }
          }
        },
        "test": {
          "type": "obj",
          "fields": {
            "words": {
              "type": "list",
              "of": {
                "type": "text"
              }
            },
            "emit": {
              "type": "list",
              "of": {
                "type": "map",
                "of": {
                  "type": "num"
                }
              }
            },
            "start": {
              "type": "map",
              "of": {
                "type": "num"
              }
            },
            "trans": {
              "type": "map",
              "of": {
                "type": "map",
                "of": {
                  "type": "num"
                }
              }
            },
            "note": {
              "type": "text",
              "optional": true
            }
          }
        }
      },
      "state-graph:world-pic": {
        "about": {
          "zh": "一张图：每格的能量，找一条最不起眼的缝",
          "en": "a picture: each cell’s energy, the least noticeable seam"
        },
        "params": {
          "type": "obj",
          "fields": {}
        },
        "test": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "img": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "num"
                }
              },
              "view": "grid",
              "optional": true
            },
            "energy": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "num"
                }
              },
              "view": "grid",
              "optional": true
            }
          }
        }
      }
    },
    "robot": {
      "state-graph:robot-scout": {
        "about": {
          "zh": "小方：视野 3×3",
          "en": "Boxy: a 3×3 view"
        }
      },
      "state-graph:robot-ranger": {
        "about": {
          "zh": "远望：视野 5×5，看得见表头，会换方向扫",
          "en": "Farsight: a 5×5 view, the table’s headings, other scan orders"
        }
      },
      "state-graph:robot-reach": {
        "about": {
          "zh": "长臂：视野 5×5，伸缩臂够到任意远",
          "en": "Longarm: a 5×5 view, a telescopic arm"
        }
      },
      "state-graph:robot-broom": {
        "about": {
          "zh": "扫帚：扫描臂一次扫过一整段",
          "en": "Broom: a sweep arm over a whole run"
        }
      },
      "state-graph:robot-stack": {
        "about": {
          "zh": "千层：同时站在很多层上，探针探到另一层",
          "en": "Layercake: many layers at once, a probe to another"
        }
      },
      "state-graph:robot-loop": {
        "about": {
          "zh": "回环：一轮一轮扫到不再变",
          "en": "Loop: scans in rounds until nothing changes"
        }
      }
    },
    "figure": {
      "state-graph:figure-scene": {
        "about": {
          "zh": "一张画好的图：格子、箭头和字，坐标照写",
          "en": "a picture as drawn: cells, arrows and words, at their coordinates"
        },
        "params": {
          "type": "obj",
          "fields": {
            "cells": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "id": {
                    "type": "str"
                  },
                  "x": {
                    "type": "num"
                  },
                  "y": {
                    "type": "num"
                  },
                  "w": {
                    "type": "num"
                  },
                  "h": {
                    "type": "num"
                  },
                  "rx": {
                    "type": "num",
                    "optional": true
                  },
                  "label": {
                    "type": "text",
                    "optional": true
                  },
                  "value": {
                    "type": "either",
                    "of": [
                      {
                        "type": "num"
                      },
                      {
                        "type": "text"
                      }
                    ],
                    "optional": true
                  },
                  "corner": {
                    "type": "either",
                    "of": [
                      {
                        "type": "num"
                      },
                      {
                        "type": "text"
                      }
                    ],
                    "optional": true
                  },
                  "sub": {
                    "type": "text",
                    "optional": true
                  },
                  "cls": {
                    "type": "str",
                    "optional": true
                  },
                  "fill": {
                    "type": "str",
                    "optional": true
                  }
                }
              }
            },
            "edges": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "a": {
                    "type": "str"
                  },
                  "b": {
                    "type": "str"
                  },
                  "cls": {
                    "type": "str"
                  },
                  "bend": {
                    "type": "num"
                  },
                  "off": {
                    "type": "num"
                  }
                }
              }
            },
            "texts": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "x": {
                    "type": "num"
                  },
                  "y": {
                    "type": "num"
                  },
                  "t": {
                    "type": "text"
                  },
                  "anchor": {
                    "type": "oneOf",
                    "values": [
                      "start",
                      "middle",
                      "end"
                    ],
                    "optional": true
                  },
                  "cls": {
                    "type": "str",
                    "optional": true
                  }
                }
              },
              "optional": true
            }
          }
        }
      },
      "state-graph:figure-grid": {
        "about": {
          "zh": "棋盘：R 行 C 列，箭头往右往下（或按 moves），个别格子另写",
          "en": "a grid of R × C with arrows right and down (or by moves), some cells written apart"
        },
        "params": {
          "type": "obj",
          "fields": {
            "R": {
              "type": "int",
              "min": 1
            },
            "C": {
              "type": "int",
              "min": 1
            },
            "arrows": {
              "type": "bool",
              "optional": true
            },
            "moves": {
              "type": "list",
              "of": {
                "type": "list",
                "of": {
                  "type": "int"
                },
                "min": 2
              },
              "optional": true
            },
            "cells": {
              "type": "map",
              "of": {
                "type": "obj",
                "fields": {
                  "value": {
                    "type": "either",
                    "of": [
                      {
                        "type": "num"
                      },
                      {
                        "type": "text"
                      }
                    ],
                    "optional": true
                  },
                  "corner": {
                    "type": "either",
                    "of": [
                      {
                        "type": "num"
                      },
                      {
                        "type": "text"
                      }
                    ],
                    "optional": true
                  },
                  "label": {
                    "type": "text",
                    "optional": true
                  },
                  "cls": {
                    "type": "str",
                    "optional": true
                  }
                }
              },
              "keys": "^\\d+,\\d+$",
              "optional": true
            },
            "edges": {
              "type": "map",
              "of": {
                "type": "str"
              },
              "keys": "^\\d+,\\d+>\\d+,\\d+$",
              "optional": true
            },
            "robot": {
              "type": "str",
              "optional": true
            }
          }
        }
      },
      "state-graph:figure-circuit": {
        "about": {
          "zh": "一小块示意电路：上面是输入，中间是元件，下面是输出",
          "en": "a little circuit: inputs on top, parts in rows, outputs at the bottom"
        },
        "params": {
          "type": "obj",
          "fields": {
            "taps": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "id": {
                    "type": "str"
                  },
                  "label": {
                    "type": "text"
                  },
                  "kind": {
                    "type": "oneOf",
                    "values": [
                      "bool"
                    ],
                    "optional": true
                  }
                }
              }
            },
            "parts": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "id": {
                    "type": "str"
                  },
                  "name": {
                    "type": "text"
                  },
                  "tag": {
                    "type": "text",
                    "optional": true
                  },
                  "row": {
                    "type": "int",
                    "min": 0,
                    "optional": true
                  }
                }
              }
            },
            "outs": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "id": {
                    "type": "str"
                  },
                  "label": {
                    "type": "text"
                  }
                }
              }
            },
            "wires": {
              "type": "list",
              "of": {
                "type": "obj",
                "fields": {
                  "from": {
                    "type": "str"
                  },
                  "to": {
                    "type": "str"
                  },
                  "kind": {
                    "type": "oneOf",
                    "values": [
                      "bool",
                      "off"
                    ],
                    "optional": true
                  }
                }
              }
            }
          }
        }
      },
      "state-graph:figure-window": {
        "about": {
          "zh": "机器人 3×3 的视野：每格的值，亮起的是读的格子",
          "en": "the robot’s 3×3 view: what each cell holds, the ones read lit"
        },
        "params": {
          "type": "obj",
          "fields": {
            "vals": {
              "type": "map",
              "of": {
                "type": "either",
                "of": [
                  {
                    "type": "num"
                  },
                  {
                    "type": "text"
                  }
                ]
              }
            },
            "on": {
              "type": "list",
              "of": {
                "type": "str"
              }
            }
          }
        }
      }
    },
    "condition": {
      "state-graph:condition-reads": {
        "about": {
          "zh": "输入元件上点了这个传感器",
          "en": "an input card reads this sensor"
        },
        "params": {
          "type": "str"
        }
      },
      "state-graph:condition-uses": {
        "about": {
          "zh": "这个传感器读了，还接出了线",
          "en": "this sensor is read and wired on"
        },
        "params": {
          "type": "str"
        }
      },
      "state-graph:condition-has": {
        "about": {
          "zh": "板上有这种元件（可以再说它的数值）",
          "en": "the board has a part of this type (and this value)"
        },
        "params": {
          "type": "either",
          "of": [
            {
              "type": "ref",
              "kind": "part",
              "reference": "circuit/part"
            },
            {
              "type": "obj",
              "fields": {
                "part": {
                  "type": "ref",
                  "kind": "part",
                  "reference": "circuit/part"
                },
                "value": {
                  "type": "num",
                  "optional": true
                }
              }
            }
          ]
        }
      },
      "state-graph:condition-feeds": {
        "about": {
          "zh": "一种元件直接接进另一种元件",
          "en": "a part of one type wired straight into a part of another"
        },
        "params": {
          "type": "obj",
          "fields": {
            "from": {
              "type": "ref",
              "kind": "part",
              "reference": "circuit/part"
            },
            "to": {
              "type": "ref",
              "kind": "part",
              "reference": "circuit/part"
            }
          }
        }
      },
      "state-graph:condition-placed": {
        "about": {
          "zh": "板上放了元件",
          "en": "a part is on the board"
        }
      },
      "state-graph:condition-wired": {
        "about": {
          "zh": "板上接了线",
          "en": "a wire is on the board"
        }
      },
      "state-graph:condition-wiredOut": {
        "about": {
          "zh": "输出接上了线",
          "en": "an output is wired"
        }
      },
      "state-graph:condition-all": {
        "about": {
          "zh": "每一条都成立",
          "en": "every one holds"
        },
        "params": {
          "type": "list",
          "of": {
            "type": "call",
            "kind": "condition"
          }
        }
      },
      "state-graph:condition-any": {
        "about": {
          "zh": "至少一条成立",
          "en": "one of them holds"
        },
        "params": {
          "type": "list",
          "of": {
            "type": "call",
            "kind": "condition"
          }
        }
      },
      "state-graph:condition-not": {
        "about": {
          "zh": "这一条不成立",
          "en": "this one does not hold"
        },
        "params": {
          "type": "call",
          "kind": "condition"
        }
      }
    },
    "trace": {
      "state-graph:trace-lcs": {
        "about": {
          "zh": "公共子序列表倒推出的路线和连线",
          "en": "the walk back through a common-subsequence table, and its matched letters"
        }
      },
      "state-graph:trace-edit": {
        "about": {
          "zh": "编辑距离表倒推出的路线",
          "en": "the walk back through an edit-distance table"
        }
      },
      "state-graph:trace-local": {
        "about": {
          "zh": "局部对齐从最大的一格倒推到 0",
          "en": "local alignment walked back from its best cell to a 0"
        }
      },
      "state-graph:trace-knap": {
        "about": {
          "zh": "背包表倒推出的装法",
          "en": "the packing walked back through a knapsack table"
        }
      },
      "state-graph:trace-seam": {
        "about": {
          "zh": "从最底一行最小的格子倒推的缝",
          "en": "the seam walked back from the smallest cell of the bottom row"
        }
      },
      "state-graph:trace-tags": {
        "about": {
          "zh": "维特比表倒推出的词性",
          "en": "the tags walked back through a Viterbi table"
        }
      }
    },
    "panel": {
      "state-graph:panel-lcs": {
        "about": {
          "zh": "通过后：表格里藏着的连线",
          "en": "once passed: the lines hidden in the table"
        }
      },
      "state-graph:panel-edit": {
        "about": {
          "zh": "通过后：倒推出的改法",
          "en": "once passed: the edits traced back"
        }
      },
      "state-graph:panel-spell": {
        "about": {
          "zh": "全部通过后：候选词按步数排",
          "en": "once every test passes: the candidates by number of steps"
        },
        "params": {
          "type": "obj",
          "fields": {
            "candidates": {
              "type": "list",
              "of": {
                "type": "str"
              }
            }
          }
        }
      },
      "state-graph:panel-local": {
        "about": {
          "zh": "通过后：最像的一段",
          "en": "once passed: the most alike stretch"
        }
      },
      "state-graph:panel-tags": {
        "about": {
          "zh": "通过后：倒推出的标法（测试有 note 时加一句）",
          "en": "once passed: the tagging traced back (and the test’s note)"
        }
      },
      "state-graph:panel-knap": {
        "about": {
          "zh": "通过后：倒推出的装法",
          "en": "once passed: the packing traced back"
        }
      },
      "state-graph:panel-roll": {
        "about": {
          "zh": "物品一览，正在改写的那件亮起",
          "en": "the items, the one being rewritten lit"
        }
      },
      "state-graph:panel-dictionary": {
        "about": {
          "zh": "词典（和每个词的代价）",
          "en": "the dictionary (and what each word costs)"
        }
      },
      "state-graph:panel-robConflict": {
        "about": {
          "zh": "反例：一家一格时，两段历史落进同一个格子",
          "en": "the counterexample: with one cell a house, two histories land in one cell"
        }
      }
    },
    "explain": {
      "state-graph:explain-roll": {
        "about": {
          "zh": "压成一行时，改写方向错了会把一件物品放两次",
          "en": "in one row, rewriting the wrong way packs an item twice"
        }
      }
    },
    "port": {
      "state-graph:port-reads": {
        "about": {
          "zh": "读这一关的一个传感器，名字随它",
          "en": "a sensor of the level, named as it is"
        },
        "params": {
          "type": "str"
        }
      },
      "state-graph:port-way": {
        "about": {
          "zh": "第 n 条来路（a、b、c、d）：一个传感器，或板上一个只属于这一关的输入",
          "en": "way in n (a, b, c, d): a sensor, or an input of the board of its own"
        },
        "params": {
          "type": "obj",
          "fields": {
            "n": {
              "type": "int",
              "min": 1,
              "max": 4
            },
            "sensor": {
              "type": "str",
              "optional": true
            },
            "input": {
              "type": "str",
              "optional": true
            }
          }
        }
      },
      "state-graph:port-start": {
        "about": {
          "zh": "「起点」：一个是 / 否传感器",
          "en": "“start”: a yes / no sensor"
        },
        "params": {
          "type": "obj",
          "fields": {
            "sensor": {
              "type": "str"
            }
          }
        }
      },
      "state-graph:port-named": {
        "about": {
          "zh": "自己起名字的口",
          "en": "a port with a name of its own"
        },
        "params": {
          "type": "obj",
          "fields": {
            "label": {
              "type": "text"
            },
            "short": {
              "type": "text"
            },
            "sensor": {
              "type": "str"
            }
          }
        }
      }
    }
  },
  "languages": {},
  "categories": { "play": "task",
    "part": "primitive"
  },
  "version": 1
}
export const gameSchema = {
  "type": "obj",
  "fields": {
    "title": {
      "type": "text"
    },
    "kicker": {
      "type": "text"
    },
    "lede": {
      "type": "text",
      "about": {
        "zh": "这款游戏教什么、学完能亲手做成什么，不写关卡数",
        "en": "what the game teaches and what the player ends up building, not how many levels"
      }
    },
    "primitives": {
      "type": "list",
      "of": {
        "type": "str",
        "reference": "grant"
      }
    },
    "chapters": {
      "type": "list",
      "of": {
        "type": "str",
        "reference": "chapter"
      }
    },
    "encyclopedia": {
      "type": "list",
      "of": {
        "type": "str",
        "reference": "section"
      },
      "optional": true
    },
    "optional": {
      "type": "list",
      "of": {
        "type": "level"
      },
      "optional": true
    },
    "skippable": {
      "type": "list",
      "of": {
        "type": "level"
      },
      "optional": true
    },
    "borrow": {
      "type": "map",
      "of": {
        "type": "level"
      },
      "about": {
        "zh": "一个想法在元件箱里借用哪一关的电路板",
        "en": "the level whose board an idea borrows in the components box"
      },
      "optional": true
    }
  }
}
