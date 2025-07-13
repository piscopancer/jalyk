import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { documentRouter } from './document'
import { fieldRouter } from './field'
import { projectRouter } from './project'
import { t } from './t'
import { userRouter } from './user'

// todo: cannot build bcs of inference in dts???
export const trpcRouter = t.router({
  user: userRouter,
  field: fieldRouter,
  document: documentRouter,
  project: projectRouter,
})

export type TRPCRouter = typeof trpcRouter

export const expressAdapter = createExpressMiddleware({
  router: trpcRouter,
})
