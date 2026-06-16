import { db } from '@/db'
import { z } from 'zod/v4'
import { t } from './t'

export const projectRouter = t.router({
  forSignIn: t.procedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ input: { id } }) => {
      return db.project.findFirst({
        where: {
          id,
        },
        select: {
          title: true,
        },
      })
    }),
  find: t.procedure.input(z.object({ projectId: z.string() })).query(({ input: { projectId } }) => {
    return db.project.findFirst({
      where: {
        id: projectId,
      },
      include: {
        documents: {
          select: {
            _count: true,
          },
        },
        users: {
          select: {
            role: true,
            userId: true,
          },
        },
      },
    })
  }),
})
