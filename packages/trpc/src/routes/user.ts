import { z } from 'zod'
import { db } from '../db'
import { t } from './t'

export const userRouter = t.router({
  create: t.procedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      return db.user.create({
        data: {
          email: input.email,
          name: input.name,
        },
      })
    }),
})
