import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './context.tsx'
import { studioKeys } from './keys.ts'

// Хуки данных студии. Чтение — useQuery по ключам из keys.ts; запись — useMutation
// с инвалидацией затронутых ключей. queryFn/mutationFn запускают эффект клиента
// через run из контекста (ошибка → состояние ошибки react-query, тип ошибки
// сохраняется в канале эффекта).

/** Список документов одного типа (новые сверху). */
export function useDocuments(type: string) {
  const { projectId, client, run } = useStudio()
  return useQuery({
    queryKey: studioKeys.documents(projectId, type),
    queryFn: () => run(client.documents.list({ path: { projectId }, urlParams: { type } })),
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
      run(client.documents.create({ path: { projectId }, payload: { type: input.type, draft: input.draft } })),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: studioKeys.documents(projectId, doc.type) })
      qc.invalidateQueries({ queryKey: studioKeys.counts(projectId) })
    },
  })
}

/** Точечная запись поля-по-пути. Низкоуровневая мутация; поверх неё строится
 * useField (см. field-хуки). Кэш документа инвалидируется по его id. */
export function useSetField(id: string) {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { path: readonly string[]; value: unknown }) =>
      run(client.documents.setField({ path: { projectId, id }, payload: { path: input.path, value: input.value } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.document(projectId, id) })
    },
  })
}

/** Опубликовать документ (draft → published). */
export function usePublishDocument(id: string) {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => run(client.documents.publish({ path: { projectId, id } })),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: studioKeys.document(projectId, id) })
      qc.invalidateQueries({ queryKey: studioKeys.documents(projectId, doc.type) })
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
  const { uploadAsset } = useStudio()
  return useMutation({ mutationFn: (file: File) => uploadAsset(file) })
}

/** Синхронизировать снапшот схемы проекта. */
export function usePutSchemaSnapshot() {
  const { projectId, client, run } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapshot: unknown) =>
      run(client.documents.putSchema({ path: { projectId }, payload: { snapshot } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.schema(projectId) })
    },
  })
}
