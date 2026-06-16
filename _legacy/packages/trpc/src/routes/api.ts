import { db } from '@/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod/v4'
import { t } from './t'

export const apiRouter = t.router({
  field: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        // query: z.custom<FindFirstFieldSafe>(),
        query: z.custom(),
      })
    )
    .query(({ input: { projectId, query } }) => {
      return db.field.findMany({
        where: {
          document: {
            projectId,
          },
        },
      })
    }),
  // .query(({ input: { projectId, query } }) => {
  //   return db.field.findFirst({
  //     ...(query as FindFirstField),
  //     where: {
  //       ...(query as FindFirstField).where,
  //       document: {
  //         projectId: projectId,
  //       },
  //     },
  //   })
  // }),
})

export type FindFirstFieldSafe = OmitRecursively<FindFirstField, 'project' | 'projectId'>
type FindFirstField = Prisma.Args<typeof db.field, 'findFirst'>

export type FindManyFieldsSafe = OmitRecursively<FindManyFields, 'project' | 'projectId'>
type FindManyFields = Prisma.Args<typeof db.field, 'findMany'>

type OmitRecursively<T, K extends PropertyKey> = Omit<{ [P in keyof T]: T extends any ? (T extends object ? OmitRecursively<T, K> : T) : never }, K>
