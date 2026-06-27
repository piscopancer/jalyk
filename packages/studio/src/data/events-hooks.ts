import type { ProjectEvent } from '@jalyk/contract'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useStudio } from './context.tsx'
import { studioKeys } from './keys.ts'

/** Подписка на все события проекта со стабилизацией обработчика через ref: меняющаяся между рендерами функция не пересоздаёт подписку (одно соединение на студию). */
export function useProjectEvents(handler: (event: ProjectEvent) => void): void {
  const { subscribeEvents } = useStudio()
  const ref = useRef(handler)
  // Свежий обработчик кладём в ref из эффекта, а не в рендере: запись ref во
  // время рендера нарушает чистоту (и правило react-hooks/refs). Подписка
  // по-прежнему завязана только на subscribeEvents и зовёт ref.current.
  useEffect(() => {
    ref.current = handler
  })
  useEffect(
    () => subscribeEvents((event) => ref.current(event)),
    [subscribeEvents],
  )
}

/** Готовая живая инвалидация для списков и счётчиков: создание/удаление/публикация документа делают устаревшими список его типа и счётчики типов. Поля (field) не трогают списки — их обрабатывает useField точечным патчем кэша. */
export function useLiveInvalidation(): void {
  const { projectId } = useStudio()
  const qc = useQueryClient()
  useProjectEvents((event) => {
    if (
      event.kind === 'create' ||
      event.kind === 'delete' ||
      event.kind === 'publish'
    ) {
      qc.invalidateQueries({
        queryKey: studioKeys.documents(projectId, event.type),
      })
      qc.invalidateQueries({ queryKey: studioKeys.counts(projectId) })
    }
    // Сброс черновика заменяет весь draft — точечный патч по пути не годится, перезапрашиваем сам документ и его список (updatedAt сменился).
    if (event.kind === 'reset') {
      qc.invalidateQueries({
        queryKey: studioKeys.document(projectId, event.docId),
      })
      qc.invalidateQueries({
        queryKey: studioKeys.documents(projectId, event.type),
      })
    }
  })
}
