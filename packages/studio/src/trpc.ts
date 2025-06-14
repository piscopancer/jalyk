import type { TRPCRouter } from '@repo/trpc'
import { createTRPCReact, httpBatchLink } from '@trpc/react-query'

export const trpc = createTRPCReact<TRPCRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:1488/trpc',
    }),
  ],
})
