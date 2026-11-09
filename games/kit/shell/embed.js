// A level embedded in a page of the notes (games/DESIGN.md 12.1, EmbedShell.jsx): the shared layouts read this to
// lay the level out as a block in the page's flow, with no task column, title, map or dialogs of their own.
import { createContext, useContext } from 'react'

export const EmbedContext = createContext(false)

/** Whether the level is played embedded in a note. */
export const useEmbed = () => useContext(EmbedContext)
