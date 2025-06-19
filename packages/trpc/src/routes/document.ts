import { z } from 'zod/v4'
import { db } from '../db'
import { t } from './t'

export const documentRouter = t.router({
  find: t.procedure.input(z.string()).query(async ({ input: id }) => {
    return db.document.findFirst({
      where: {
        id,
      },
      select: {
        createdAt: true,
        type: true,
        fields: {
          select: {
            path: true,
          },
        },
      },
    })
  }),
})
