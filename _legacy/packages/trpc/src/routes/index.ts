import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { apiRouter } from './api'
import { assetRouter } from './asset'
import { documentRouter } from './document'
import { fieldRouter } from './field'
import { projectRouter } from './project'
import { t } from './t'
import { userRouter } from './user'

// todo: fix this lol bruh
import type * as T from 'zod/v4'
type _ = typeof T

// todo: https://stackoverflow.com/questions/72041763/typescript-inferred-type-cannot-be-named-without-reference
// todo: https://stackoverflow.com/a/78037438

export const trpcRouter = t.router({
  user: userRouter,
  field: fieldRouter,
  document: documentRouter,
  project: projectRouter,
  asset: assetRouter,
  api: apiRouter,
})

export type TRPCRouter = typeof trpcRouter

export const expressAdapter = createExpressMiddleware({
  router: trpcRouter,
})
