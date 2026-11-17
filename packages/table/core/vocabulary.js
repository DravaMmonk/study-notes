export const vocabulary = {
  "module": "table",
  "kinds": {
    "part": {
      "table:msum": {
        "about": {
          "zh": "汇合器 · 加起来",
          "en": "Merger · sum"
        },
        "inputs": [
          {
            "name": "0",
            "type": "table:number-input"
          },
          {
            "name": "1",
            "type": "table:number-input"
          },
          {
            "name": "2",
            "type": "table:number-input"
          }
        ],
        "outputType": "circuit:number"
      },
      "table:mmin": {
        "about": {
          "zh": "汇合器 · 取较小",
          "en": "Merger · min"
        },
        "inputs": [
          {
            "name": "0",
            "type": "table:number-input"
          },
          {
            "name": "1",
            "type": "table:number-input"
          },
          {
            "name": "2",
            "type": "table:number-input"
          }
        ],
        "outputType": "circuit:number"
      },
      "table:mmax": {
        "about": {
          "zh": "汇合器 · 取较大",
          "en": "Merger · max"
        },
        "inputs": [
          {
            "name": "0",
            "type": "table:number-input"
          },
          {
            "name": "1",
            "type": "table:number-input"
          },
          {
            "name": "2",
            "type": "table:number-input"
          }
        ],
        "outputType": "circuit:number"
      },
      "table:many": {
        "about": {
          "zh": "汇合器 · 任一是",
          "en": "Merger · any yes"
        },
        "inputs": [
          {
            "name": "0",
            "type": "table:boolean-input"
          },
          {
            "name": "1",
            "type": "table:boolean-input"
          },
          {
            "name": "2",
            "type": "table:boolean-input"
          }
        ],
        "outputType": "circuit:boolean"
      },
      "table:not": {
        "about": {
          "zh": "取反",
          "en": "Not"
        },
        "inputs": [
          {
            "name": "0",
            "type": "circuit:boolean"
          }
        ],
        "outputType": "circuit:boolean"
      },
      "table:add": {
        "about": {
          "zh": "加法器",
          "en": "Adder"
        },
        "inputs": [
          {
            "name": "0",
            "type": "table:number-input"
          },
          {
            "name": "1",
            "type": "table:number-input"
          }
        ],
        "outputType": "circuit:any",
        "outputRule": "lift"
      },
      "table:mul": {
        "about": {
          "zh": "乘法器",
          "en": "Multiplier"
        },
        "inputs": [
          {
            "name": "0",
            "type": "table:number-input"
          },
          {
            "name": "1",
            "type": "table:number-input"
          }
        ],
        "outputType": "circuit:any",
        "outputRule": "lift"
      },
      "table:const": {
        "about": {
          "zh": "常数",
          "en": "Constant"
        },
        "inputs": [],
        "outputType": "circuit:number",
        "params": {
          "type": "obj",
          "fields": {
            "value": {
              "type": "num",
              "default": 1,
              "optional": true
            }
          }
        }
      },
      "table:pass": {
        "about": {
          "zh": "放行闸",
          "en": "Pass gate"
        },
        "inputs": [
          {
            "name": "0",
            "type": "circuit:boolean"
          },
          {
            "name": "1",
            "type": "circuit:any"
          }
        ],
        "outputType": "circuit:any",
        "outputRule": {
          "copy": 1
        }
      },
      "table:block": {
        "about": {
          "zh": "拦截闸",
          "en": "Block gate"
        },
        "inputs": [
          {
            "name": "0",
            "type": "circuit:boolean"
          },
          {
            "name": "1",
            "type": "circuit:any"
          }
        ],
        "outputType": "circuit:any",
        "outputRule": {
          "copy": 1
        }
      }
    }
  },
  "categories": {
    "part": "primitive"
  }
}
