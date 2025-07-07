import { initTRPC } from '@trpc/server'

export const t = initTRPC.create({
  sse: {
    ping: {
      enabled: true,
      intervalMs: 30_000,
    },
  },
})
