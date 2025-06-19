import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { documentRouter } from './document'
import { fieldRouter } from './field'
import { t } from './t'
import { userRouter } from './user'

export const trpcRouter = t.router({
  user: userRouter,
  field: fieldRouter,
  document: documentRouter,
})

export type TRPCRouter = typeof trpcRouter

export const expressAdapter = createExpressMiddleware({
  router: trpcRouter,
})
