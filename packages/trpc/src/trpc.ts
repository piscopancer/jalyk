import { initTRPC } from '@trpc/server'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { fieldRouter } from './field'
import { userRouter } from './user'

export const t = initTRPC.create()

export const trpcRouter = t.router({
  user: userRouter,
  field: fieldRouter,
})

export type TRPCRouter = typeof trpcRouter

export const expressAdapter = createExpressMiddleware({
  router: trpcRouter,
})
