import { createContext, useContext, type ReactNode } from 'react'

// Окружение, в котором рисуется поле: какие пункты его меню скрыты и можно ли его
// сворачивать. По умолчанию (форма документа, панель состояния) ничего не скрыто и
// сворачивание разрешено; диалог «Открыть полностью» подкладывает сюда другое
// состояние, чтобы спрятать сам пункт «Открыть полностью» и убрать сворачивание.

/** Ключи встроенных действий меню поля — по ним идёт контекстная фильтрация видимости. */
export const fieldActionKeys = [
  'copy',
  'paste',
  'templates',
  'detail',
  'open-fully',
  'reset-draft',
  'reset-default',
] as const

export type FieldActionKey = (typeof fieldActionKeys)[number]

type FieldDialogState = {
  /** Ключи действий (встроенных или кастомных), скрытых в текущем окружении. */
  hiddenActions: ReadonlySet<string>
  /** Можно ли сворачивать поля шевроном (внутри диалога поля — нельзя). */
  collapsible: boolean
}

const emptyHidden: ReadonlySet<string> = new Set()

const FieldDialogContext = createContext<FieldDialogState>({
  hiddenActions: emptyHidden,
  collapsible: true,
})

/** Задаёт окружение для поддерева полей: скрытые ключи действий и запрет сворачивания. */
export function FieldDialogProvider({
  hiddenActions = emptyHidden,
  collapsible = true,
  children,
}: Partial<FieldDialogState> & { children: ReactNode }) {
  return (
    <FieldDialogContext.Provider value={{ hiddenActions, collapsible }}>
      {children}
    </FieldDialogContext.Provider>
  )
}

/** Множество скрытых ключей действий в текущем окружении (для фильтрации пунктов меню). */
export function useHiddenActions() {
  return useContext(FieldDialogContext).hiddenActions
}

/** Можно ли сворачивать поля в текущем окружении (внутри диалога поля — нет). */
export function useFieldsCollapsible() {
  return useContext(FieldDialogContext).collapsible
}
