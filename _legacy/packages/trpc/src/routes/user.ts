import { db } from '@/db'
import { z } from 'zod/v4'
import { AuthProvider } from '../prisma'
import { t } from './t'

export const userRouter = t.router({
  upsert: t.procedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        photoUrl: z.string().optional(),
        authProvider: z.enum(AuthProvider),
      })
    )
    .mutation(async ({ input: { id, name, photoUrl, authProvider } }) => {
      return db.user.upsert({
        where: {
          id,
        },
        create: {
          id,
          name,
          photoUrl,
          authProvider,
        },
        update: {
          name,
          photoUrl,
        },
      })
    }),
  findMany: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        userIds: z.array(z.string()),
      })
    )
    .query(({ input: { projectId, userIds } }) => {
      return db.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        include: {
          inProjects: {
            where: {
              projectId,
            },
            take: 1,
          },
        },
      })
    }),
})
