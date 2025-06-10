import { QueryClient } from '@tanstack/react-query'

export const qc = new QueryClient()

export const queryKeys = {
  users: (projectId: string) => [projectId, 'users'],
} as const
