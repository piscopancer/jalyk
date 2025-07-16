import { type TRPCRouter } from '@repo/trpc'
import { createTRPCReact, httpBatchLink, httpSubscriptionLink, loggerLink, splitLink } from '@trpc/react-query'

// todo: fix?
import type * as T from '../node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs'
import type * as T2 from '../node_modules/zod/dist/types/v4/core/util'
type _ = typeof T
type _2 = typeof T2

export const trpc = createTRPCReact<TRPCRouter>()
export const trpcClient = trpc.createClient({
  links: [
    loggerLink(),
    splitLink({
      condition(op) {
        return op.type === 'subscription'
      },
      true: httpSubscriptionLink({
        url: `http://localhost:${8484}/trpc`,
      }),
      false: httpBatchLink({
        // url: `http://localhost:${httpServerPort}/trpc`,
        url: `http://localhost:${8484}/trpc`,
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
