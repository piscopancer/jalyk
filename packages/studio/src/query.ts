import { QueryClient } from '@tanstack/react-query'

export const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
    },
  },
})

export const queryKeys = {
  users: (projectId: string) => [projectId, 'users'],
} as const
