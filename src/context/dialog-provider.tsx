import React, { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

interface DialogContextType {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  content: React.ReactNode
  setContent: Dispatch<SetStateAction<React.ReactNode>>
}

const DialogContext = createContext<DialogContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function DialogProvider({ children }: Props) {
  const [open, setOpen] = React.useState(false)
  const [content, setContent] = React.useState<React.ReactNode>(null)

  return (
    <DialogContext.Provider
      value={{
        open,
        setOpen,
        content,
        setContent,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  const context = useContext(DialogContext)

  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }

  return context
}
