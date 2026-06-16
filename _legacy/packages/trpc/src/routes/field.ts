import { db } from '@/db'
import { FieldUpdateEvent, SubscriptionEvents } from '@/types'
import EventEmitter, { on } from 'node:events'
import { JsonValue, OverrideProperties } from 'type-fest'
import { z } from 'zod/v4'
import { t } from './t'

type EventMap = {
  [Key in keyof SubscriptionEvents]: [SubscriptionEvents[Key]]
}
const ee = new EventEmitter<EventMap>()

export const fieldRouter = t.router({
  find: t.procedure
    .input(
      z.object({
        documentId: z.string(),
        path: z.string(),
      })
    )
    .query(async ({ input: { documentId, path } }) => {
      return (
        db.field
          .findFirst({
            where: {
              documentId,
              path,
            },
            select: {
              value: true,
            },
          })
          // TODO: need real type fix
          .then((res) => res as OverrideProperties<NonNullable<typeof res>, { value: JsonValue }> | null)
      )
    }),
  upsert: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        documentId: z.string(),
        documentType: z.string(),
        path: z.string(),
        value: z.json(),
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
      ee.emit(`fieldUpdate/${projectId}`, { documentId, path, value })
      return upsertedDocument
    }),
  onFieldUpdate: t.procedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .subscription(async function* ({ input, signal }) {
      for await (const [data] of on(ee, `fieldUpdate/${input.projectId}` satisfies keyof SubscriptionEvents, {
        signal,
      })) {
        const updatedField = data as FieldUpdateEvent[keyof FieldUpdateEvent]
        yield updatedField
      }
    }),
})
