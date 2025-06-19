import { JsonValue } from 'type-fest'
import { z } from 'zod/v4'
import { db } from '../db'
import { t } from './t'

export const pathSchema = z.array(z.union([z.string(), z.number()]))

export const fieldRouter = t.router({
  find: t.procedure
    .input(
      z.object({
        documentId: z.string(),
        path: z.string(),
      })
    )
    .query(async ({ input: { documentId, path } }) => {
      return db.field.findFirst({
        where: {
          documentId,
          path,
        },
        select: {
          value: true,
        },
      })
    }),
  upsert: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        documentId: z.string(),
        documentType: z.string(),
        path: z.string(),
        value: z.custom<JsonValue>(),
      })
    )
    .mutation(async ({ input: { documentId, documentType, projectId, path, value } }) => {
      // todo slomano :\
      const upsertedDocument = await db.document.upsert({
        create: {
          type: documentType,
          id: documentId,
          projectId,
          fields: {
            create: {
              path,
              value: {
                toJSON: () => value,
              },
            },
          },
        },
        update: {
          fields: {
            upsert: {
              where: {
                documentId_path: {
                  documentId,
                  path,
                },
              },
              create: {
                path,
                value: {
                  toJSON: () => value,
                },
              },
              update: {
                value: {
                  toJSON: () => value,
                },
              },
            },
          },
        },
        where: {
          id: documentId,
        },
      })
      console.log('updated', new Date().toLocaleTimeString(), upsertedDocument)
      return upsertedDocument
      // todo inform websocket listeners of the change
    }),
})
