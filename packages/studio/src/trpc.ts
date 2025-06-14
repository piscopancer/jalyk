import type { TRPCRouter } from '@repo/trpc'
import { createTRPCReact, httpBatchLink, loggerLink } from '@trpc/react-query'

export const trpc = createTRPCReact<TRPCRouter>()

export const trpcClient = trpc.createClient({
  links: [
    loggerLink(),
    httpBatchLink({
      url: 'http://localhost:1488/trpc',
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
    }),
  ],
})
