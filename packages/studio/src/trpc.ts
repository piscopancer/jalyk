import { type TRPCRouter } from '@repo/trpc'
import { createTRPCReact, httpBatchLink, httpSubscriptionLink, loggerLink, splitLink } from '@trpc/react-query'

export const trpc = createTRPCReact<TRPCRouter>()
export const trpcClient = trpc.createClient({
  links: [
    loggerLink(),
    splitLink({
      condition(op) {
        return op.type === 'subscription'
      },
      true: httpSubscriptionLink({
        url: `http://localhost:${1488}/trpc`,
      }),
      false: httpBatchLink({
        // url: `http://localhost:${httpServerPort}/trpc`,
        url: `http://localhost:${1488}/trpc`,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          })
        },
      }),
    }),
  ],
})
