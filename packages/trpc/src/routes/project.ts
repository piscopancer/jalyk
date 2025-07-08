import { z } from 'zod/v4'
import { db } from '../db'
import { t } from './t'

export const projectRouter = t.router({
  forSignIn: t.procedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input: { id } }) => {
      return db.project.findFirst({
        where: {
          id,
        },
        select: {
          title: true,
        },
      })
    }),
})
