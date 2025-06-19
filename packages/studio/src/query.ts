import { QueryClient } from '@tanstack/react-query'

export const qc = new QueryClient()

export const queryKeys = {
  users: (projectId: string) => [projectId, 'users'],
  // document: (id: string) => ['document', id],
  // field: (documentId: string, path: string) => [...queryKeys.document(documentId), 'field', path],
} as const
