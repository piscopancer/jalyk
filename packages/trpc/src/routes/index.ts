import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { assetRouter } from './asset'
import { documentRouter } from './document'
import { fieldRouter } from './field'
import { projectRouter } from './project'
import { t } from './t'
import { userRouter } from './user'

export const trpcRouter = t.router({
  user: userRouter,
  field: fieldRouter,
  document: documentRouter,
  project: projectRouter,
  asset: assetRouter,
})

export type TRPCRouter = typeof trpcRouter

export const expressAdapter = createExpressMiddleware({
  router: trpcRouter,
})
