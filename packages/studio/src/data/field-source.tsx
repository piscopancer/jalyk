import { createContext, useContext } from 'react'

// Переопределяемый источник значений полей. По умолчанию useField читает и пишет
// черновик документа на сервере. Когда вокруг поддерева есть FieldSourceProvider
// (аварийный редактор сломанного поля), useField вместо документа работает с этим
// локальным источником — обычные компоненты полей рисуются на буфере, ничего не
// записывая в документ, пока пользователь не нажмёт «Применить».

/** Локальный источник значений для useField: get/set по абсолютному пути поля. */
export type FieldSource = {
  get: (path: readonly string[]) => unknown
  set: (path: readonly string[], value: unknown) => void
}

const FieldSourceContext = createContext<FieldSource | null>(null)

export const FieldSourceProvider = FieldSourceContext.Provider

/** Текущий переопределяющий источник поля, либо null — тогда useField работает с документом. */
export function useFieldSource() {
  return useContext(FieldSourceContext)
}
