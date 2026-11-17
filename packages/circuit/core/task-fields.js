import { S } from 'kernel'

export const ITEM_REFERENCE = S.str({ reference: 'grant' })
export const TASK_ITEMS = Object.fromEntries(['adds', 'local', 'gives', 'withholds', 'opens', 'awards'].map((key) => [key, S.opt(S.list(ITEM_REFERENCE))]))
