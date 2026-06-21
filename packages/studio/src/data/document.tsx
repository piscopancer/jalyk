import { createContext, useContext, useMemo, type ReactNode } from 'react'

/** Контекст редактируемого документа. Редактор документа оборачивает в него своё поддерево, и вложенные редакторы полей (useField) узнают, какой документ правят, не получая id пропсами через всё дерево. */
export type DocumentContextValue = {
  id: string
  type: string
}

const DocumentContext = createContext<DocumentContextValue | null>(null)

export function useDocumentContext(): DocumentContextValue {
  const ctx = useContext(DocumentContext)
  if (!ctx) {
    throw new Error(
      'useField/useDocumentContext должны вызываться внутри <DocumentProvider>',
    )
  }
  return ctx
}

export function DocumentProvider({
  id,
  type,
  children,
}: {
  id: string
  type: string
  children: ReactNode
}) {
  const value = useMemo(() => ({ id, type }), [id, type])
  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  )
}
