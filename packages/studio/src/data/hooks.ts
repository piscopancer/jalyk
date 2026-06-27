import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './context.tsx'
import { studioKeys } from './keys.ts'
import { setAtPath } from './path.ts'

// Хуки данных студии. Чтение — useQuery по ключам из keys.ts; запись — useMutation с инвалидацией затронутых ключей. queryFn/mutationFn запускают эффект клиента через run из контекста (ошибка → состояние ошибки react-query, тип ошибки сохраняется в канале эффекта).

/** Список документов одного типа (новые сверху). */
export function useDocuments(type: string) {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.documents(projectId, type),
    queryFn: () =>
      run(client.documents.list({ path: { projectId }, urlParams: { type } })),
  })
}

/** Один документ по id (draft + published + мета). */
export function useDocument(id: string) {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.document(projectId, id),
    queryFn: () => run(client.documents.get({ path: { projectId, id } })),
  })
}

/** Срез открытого документа: тот же запрос и кэш, что и useDocument, но наблюдатель подписан только на результат `select`. Благодаря структурному разделению React Query при оптимистичном патче одного поля сохраняет идентичность нетронутых поддеревьев, поэтому поля, чей срез не изменился, не уведомляются и не перерисовываются. Через это useField/useFieldStatus читают лишь свой кусочек документа, а не весь объект. */
export function useDocumentSelect<T>(
  id: string,
  select: (data: { draft: unknown; published: unknown } & Record<string, unknown>) => T,
) {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.document(projectId, id),
    queryFn: () => run(client.documents.get({ path: { projectId, id } })),
    select: select as (data: unknown) => T,
  })
}

/** Количество документов по каждому типу — для <AllDocumentTypes/>. */
export function useDocumentCounts() {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.counts(projectId),
    queryFn: () => run(client.documents.counts({ path: { projectId } })),
  })
}

/** Создать документ-черновик заданного типа. */
export function useCreateDocument() {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { type: string; draft?: unknown }) =>
      run(
        client.documents.create({
          path: { projectId },
          payload: { type: input.type, draft: input.draft },
        }),
      ),
    onSuccess: (doc) => {
      qc.invalidateQueries({
        queryKey: studioKeys.documents(projectId, doc.type),
      })
      qc.invalidateQueries({ queryKey: studioKeys.counts(projectId) })
    },
  })
}

/** Точечная запись поля-по-пути. Низкоуровневая мутация; поверх неё строится useField (см. field-хуки). Оптимистично патчит draft в кэше документа по пути сразу при старте мутации, чтобы редактор (особенно перетаскивание элементов массива) не показывал старое значение до ответа сервера; при ошибке откатывает снапшот. По завершении инвалидирует сам документ по id и списки документов (studioKeys.documentsAll — префикс покрывает список типа и запросы query), чтобы строки списка и их превью с индикаторами замечаний обновились. */
export function useSetField(id: string) {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { path: readonly string[]; value: unknown }) =>
      run(
        client.documents.setField({
          path: { projectId, id },
          payload: { path: input.path, value: input.value },
        }),
      ),
    onMutate: (input) => {
      const key = studioKeys.document(projectId, id)
      // Отменяем активные рефетчи документа, иначе ответ устаревшего запроса перетрёт
      // оптимистичное значение. Промис не ждём: setQueryData ниже должен примениться
      // синхронно, в том же кадре, что и вызвавшее мутацию действие (дроп при dnd),
      // иначе обновление уезжает в следующий тик и dnd-kit мерит старые позиции.
      qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData<{ draft: unknown } & Record<string, unknown>>(
        key,
        (prev) =>
          prev
            ? { ...prev, draft: setAtPath(prev.draft, input.path, input.value) }
            : prev,
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined)
        qc.setQueryData(
          studioKeys.document(projectId, id),
          context.previous,
        )
    },
    // Сам открытый документ намеренно НЕ инвалидируем: его кэш уже держат в актуальном
    // состоянии оптимистичный патч (onMutate) и SSE-эхо этой же правки (см. useField).
    // Лишний рефетч документа заменял бы массив свежим объектом спустя ~100мс round-trip
    // и давал бы видимую реконсиляцию-перестановку после перетаскивания. Списки же
    // (превью с индикаторами замечаний) обновляем — у них своего оптимизма нет.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: studioKeys.documentsAll(projectId) })
    },
  })
}

/** Опубликовать документ (draft → published). */
export function usePublishDocument(id: string) {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      run(client.documents.publish({ path: { projectId, id } })),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: studioKeys.document(projectId, id) })
      qc.invalidateQueries({
        queryKey: studioKeys.documents(projectId, doc.type),
      })
    },
  })
}

/** Сбросить черновик до последней опубликованной версии (published → draft). */
export function useResetDraft(id: string) {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      run(client.documents.resetDraft({ path: { projectId, id } })),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: studioKeys.document(projectId, id) })
      qc.invalidateQueries({
        queryKey: studioKeys.documents(projectId, doc.type),
      })
    },
  })
}

/** Удалить документ. */
export function useDeleteDocument(id: string) {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => run(client.documents.delete({ path: { projectId, id } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all(projectId) })
    },
  })
}

/** Текущий снапшот схемы проекта. */
export function useSchemaSnapshot() {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.schema(projectId),
    queryFn: () => run(client.documents.getSchema({ path: { projectId } })),
  })
}

/** Загрузить файл-ассет. Статус (pending/error) пробрасывается в редактор поля. */
export function useUploadAsset() {
  const { uploadAsset, projectId } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAsset(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.assets(projectId) })
      qc.invalidateQueries({ queryKey: studioKeys.assetUsage(projectId) })
    },
  })
}

/** Все ассеты проекта (новые сверху) — для галереи выбора картинки. */
export function useAssets() {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.assets(projectId),
    queryFn: () => run(client.assets.list({ path: { projectId } })),
  })
}

/** Использование хранилища проектом (суммарный вес ассетов и лимит) — для
 * прогресс-бара «Хранилище» в галерее. */
export function useAssetUsage() {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.assetUsage(projectId),
    queryFn: () => run(client.assets.usage({ path: { projectId } })),
  })
}

/** Удалить ассет проекта (запись + байты). Инвалидирует список ассетов и использование хранилища. */
export function useDeleteAsset() {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      run(client.assets.delete({ path: { projectId, id } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.assets(projectId) })
      qc.invalidateQueries({ queryKey: studioKeys.assetUsage(projectId) })
    },
  })
}

/** Синхронизировать снапшот схемы проекта. */
export function usePutSchemaSnapshot() {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapshot: unknown) =>
      run(
        client.documents.putSchema({
          path: { projectId },
          payload: { snapshot },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.schema(projectId) })
    },
  })
}
