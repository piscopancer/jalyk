import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useStudio } from './context.tsx'
import { useDocumentContext } from './document.tsx'
import { useDocument, useSetField } from './hooks.ts'
import { studioKeys } from './keys.ts'
import { getAtPath, samePath, setAtPath } from './path.ts'

/** Хэндл поля документа: типизированный доступ к значению по пути плюс точечная запись и статус мутации. Подписан на SSE-события того же документа и пути — правка из другого клиента патчит кэш и приходит сюда как новое value. */
export type FieldHandle<T> = {
  /** Текущее значение draft по пути (undefined, пока документ грузится или пусто). */
  value: T | undefined
  /** Точечно записать значение поля-по-пути (PATCH через jsonb_set на сервере). `null` очищает поле (делает его пустым), поэтому редакторам не нужно приводить «пустое» значение к типу поля. */
  set: (value: T | null) => void
  /** Статус последней записи: idle | pending | success | error. */
  status: 'idle' | 'pending' | 'success' | 'error'
  /** Ошибка последней записи (типизирована каналом ошибок HttpApiClient). */
  error: unknown
  /** Документ ещё грузится. */
  isLoading: boolean
}

/** Форма закэшированного документа, которую патчим по SSE (нам важно лишь draft). */
type CachedDocument = { draft: unknown } & Record<string, unknown>

/** Доступ к полю текущего документа (из <DocumentProvider>) по пути. Дженерик T — ожидаемый тип значения; вызывающий редактор задаёт его из своей схемы. */
export function useField<T = unknown>(path: readonly string[]): FieldHandle<T> {
  const { id } = useDocumentContext()
  const { projectId, subscribeEvents } = useStudio()
  const qc = useQueryClient()
  const doc = useDocument(id)
  const setField = useSetField(id)

  // Удалённые правки этого же поля: патчим кэш документа по пути из события, чтобы value обновилось без перезапроса. Своя правка тоже вернётся сюда — патч до того же значения безвреден.
  const pathKey = JSON.stringify(path)
  useEffect(
    () =>
      subscribeEvents((event) => {
        if (
          event.kind === 'field' &&
          event.docId === id &&
          samePath(event.path, path)
        ) {
          qc.setQueryData<CachedDocument>(
            studioKeys.document(projectId, id),
            (prev) =>
              prev
                ? {
                    ...prev,
                    draft: setAtPath(prev.draft, event.path, event.value),
                  }
                : prev,
          )
        }
      }),
    [subscribeEvents, qc, projectId, id, pathKey, path],
  )

  return {
    value: getAtPath(doc.data?.draft, path) as T | undefined,
    set: (value: T | null) => setField.mutate({ path, value }),
    status: setField.status,
    error: setField.error,
    isLoading: doc.isLoading,
  }
}
