import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useStudio } from './context.tsx'
import { useDocumentContext } from './document.tsx'
import { useFieldSource } from './field-source.tsx'
import { useDocumentSelect, useSetField } from './hooks.ts'
import { studioKeys } from './keys.ts'
import { deepEqual, getAtPath, samePath, setAtPath } from './path.ts'

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
  // Подписка точечная: наблюдатель уведомляется только когда меняется значение по этому пути, а не при любой правке документа.
  const valueQuery = useDocumentSelect(id, (data) => getAtPath(data.draft, path))
  const setField = useSetField(id)
  const source = useFieldSource()

  // Удалённые правки этого же поля: патчим кэш документа по пути из события, чтобы value обновилось без перезапроса. Своя правка тоже вернётся сюда эхом — но тогда значение уже совпадает с кэшем (его положил оптимистичный апдейт), и мы возвращаем prev без изменений: иначе setAtPath создал бы новый массив со свежими идентичностями объектов, давая лишний перерендер и видимую перестановку элементов (например, после dnd) спустя ~100мс round-trip.
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
            (prev) => {
              if (!prev) return prev
              const current = getAtPath(prev.draft, event.path)
              // Нечувствительно к порядку ключей: эхо своей правки возвращается через сериализацию контракта и может прийти с переставленными ключами; иначе патч прошёл бы зря и дал лишний перерендер.
              if (deepEqual(current, event.value)) return prev
              return {
                ...prev,
                draft: setAtPath(prev.draft, event.path, event.value),
              }
            },
          )
        }
      }),
    [subscribeEvents, qc, projectId, id, pathKey, path],
  )

  // Локальный источник (аварийный редактор сломанного поля): значение из буфера, запись в буфер, без обращения к документу.
  if (source) {
    return {
      value: source.get(path) as T | undefined,
      set: (value: T | null) => source.set(path, value),
      status: 'idle',
      error: undefined,
      isLoading: false,
    }
  }

  return {
    value: valueQuery.data as T | undefined,
    set: (value: T | null) => setField.mutate({ path, value }),
    status: setField.status,
    error: setField.error,
    isLoading: valueQuery.isLoading,
  }
}
