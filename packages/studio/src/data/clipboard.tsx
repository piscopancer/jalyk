import type { FieldKind } from '@jalyk/schema'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// Внутренний буфер обмена студии для значений полей. Помимо системного буфера
// (navigator.clipboard, куда кладётся JSON) храним последнее скопированное значение
// в памяти приложения вместе с видом поля (kind) — это нужно, чтобы «вставить»
// предлагалось только когда вид совпадает с целевым полем. Перезаписывается каждым
// новым копированием.
export type ClipboardEntry = {
  kind: FieldKind
  value: unknown
}

export type FieldClipboardValue = {
  /** Последнее скопированное значение (или null, если ещё ничего не копировали). */
  entry: ClipboardEntry | null
  /** Скопировать значение поля: в память студии и в системный буфер (JSON). */
  copy: (kind: FieldKind, value: unknown) => void
}

const FieldClipboardContext = createContext<FieldClipboardValue | null>(null)

export function useFieldClipboard(): FieldClipboardValue {
  const ctx = useContext(FieldClipboardContext)
  if (!ctx) {
    throw new Error('useFieldClipboard должен вызываться внутри <FieldClipboardProvider> (или <Studio>)')
  }
  return ctx
}

export function FieldClipboardProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<ClipboardEntry | null>(null)
  const value = useMemo<FieldClipboardValue>(
    () => ({
      entry,
      copy: (kind, value) => {
        setEntry({ kind, value })
        // Системный буфер — best effort: может быть недоступен (нет фокуса/прав).
        void navigator.clipboard?.writeText(JSON.stringify(value ?? null, null, 2)).catch(() => {})
      },
    }),
    [entry],
  )
  return <FieldClipboardContext.Provider value={value}>{children}</FieldClipboardContext.Provider>
}
