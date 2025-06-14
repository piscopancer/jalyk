import { z } from 'zod'
import { t } from './trpc'

export const fieldRouter = t.router({
  create: t.procedure
    .input(
      z.object({
        type: z.string(),
        name: z.string(),
        value: z.unknown(),
      })
    )
    .mutation(({ input }) => {
      return input.name
    }),
})
