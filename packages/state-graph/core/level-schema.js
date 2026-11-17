export const levelSchema = {
  "type": "obj",
  "fields": {
    "title": {
      "type": "text"
    },
    "short": {
      "type": "text"
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
            "type": "call",
            "kind": "figure",
            "optional": true
          }
        }
      }
    },
    "mission": {
      "type": "obj",
      "fields": {
        "goal": {
          "type": "text"
        },
        "how": {
          "type": "text"
        }
      }
    },
    "robot": {
      "type": "ref",
      "kind": "robot",
      "about": {
        "zh": "玩这一关电路任务的机器人",
        "en": "the robot the level’s circuit tasks are played by"
      },
      "optional": true
    },
    "carry": {
      "type": "level",
      "about": {
        "zh": "第一个任务从这一关玩家留下的电路板开始（必须是先修）",
        "en": "the first task starts from the board left on this level (a prerequisite)"
      },
      "optional": true
    },
    "debrief": {
      "type": "obj",
      "fields": {
        "title": {
          "type": "text"
        },
        "body": {
          "type": "list",
          "of": {
            "type": "text"
          }
        },
        "note": {
          "type": "text",
          "optional": true
        }
      }
    },
    "requires": {
      "type": "list",
      "of": {
        "type": "level"
      },
      "section": "course",
      "about": {
        "zh": "这关固有的知识前置",
        "en": "Knowledge prerequisites for this level"
      },
      "optional": true
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
          "play": {
            "type": "str",
            "reference": "play"
          },
          "step": {
            "type": "text",
            "optional": true
          },
          "brief": {
            "type": "text",
            "optional": true
          },
          "after": {
            "type": "text",
            "optional": true
          }
        }
      }
    },
    "after": {
      "type": "text",
      "optional": true
    }
  }
}
