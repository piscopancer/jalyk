import { type TRPCRouter, FindFirstFieldSafe } from '@repo/trpc'
import { createTRPCReact, httpBatchLink, loggerLink } from '@trpc/react-query'

export type S = TRPCRouter

const trpc = createTRPCReact<TRPCRouter>()
const trpcClient = trpc.createClient({
  links: [
    loggerLink(),
    httpBatchLink({
      url: `http://localhost:${8484}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
    }),
  ],
})

// todo
export function createJalykClient<D extends any[]>(opts: {
  //
  projectId: string
  token?: string
  definitions: D
}) {
  // add documents on query object as i loop over the config

  return {
    field: (query: FindFirstFieldSafe) =>
      trpcClient.api.field.query({
        projectId: opts.projectId,
        query,
      }),
  }
}
