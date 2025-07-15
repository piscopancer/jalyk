import { createExpressMiddleware } from '@trpc/server/adapters/express'
import * as SUS from '../../node_modules/zod/dist/types/v4/core/util'
import { assetRouter } from './asset'
import { clientRouter } from './client'
import { documentRouter } from './document'
import { fieldRouter } from './field'
import { projectRouter } from './project'
import { t } from './t'
import { userRouter } from './user'

const s = 1 as unknown as SUS.AnyFunc

// todo: https://stackoverflow.com/questions/72041763/typescript-inferred-type-cannot-be-named-without-reference
// todo: https://stackoverflow.com/a/78037438

export const trpcRouter = t.router({
  user: userRouter,
  field: fieldRouter,
  document: documentRouter,
  project: projectRouter,
  asset: assetRouter,
  client: clientRouter,
})

export type TRPCRouter = typeof trpcRouter

export const expressAdapter = createExpressMiddleware({
  router: trpcRouter,
})
