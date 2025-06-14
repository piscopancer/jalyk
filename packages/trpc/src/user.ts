import { z } from 'zod'
import { t } from './trpc'

export const userRouter = t.router({
  create: t.procedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(({ input }) => {
      return input.name
    }),
})
