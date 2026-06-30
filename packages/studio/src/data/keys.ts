/** Ключи react-query. Все под префиксом проекта, чтобы кэш разных проектов не пересекался и инвалидация била точечно. Типизированы как const-кортежи — никаких произвольных строк в местах вызова. */
export const studioKeys = {
  all: (projectId: string) => ['jalyk', projectId] as const,
  documentsAll: (projectId: string) =>
    ['jalyk', projectId, 'documents'] as const,
  documents: (projectId: string, type: string) =>
    ['jalyk', projectId, 'documents', type] as const,
  query: (projectId: string, type: string, args: unknown) =>
    ['jalyk', projectId, 'documents', type, 'query', args] as const,
  document: (projectId: string, id: string) =>
    ['jalyk', projectId, 'document', id] as const,
  counts: (projectId: string) => ['jalyk', projectId, 'counts'] as const,
  schema: (projectId: string) => ['jalyk', projectId, 'schema'] as const,
  access: (projectId: string) => ['jalyk', projectId, 'access'] as const,
  assets: (projectId: string) => ['jalyk', projectId, 'assets'] as const,
  assetUsage: (projectId: string) =>
    ['jalyk', projectId, 'asset-usage'] as const,
  members: (projectId: string) => ['jalyk', projectId, 'members'] as const,
  // Текущий пользователь не привязан к проекту — отдельный префикс.
  me: () => ['jalyk', 'me'] as const,
}
