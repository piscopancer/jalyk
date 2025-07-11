import { z } from 'zod/v4'
import { trpc } from './trpc'

export function useFieldQuery({ docId, fieldPath, shape }: { docId: string; fieldPath: string; shape: z.ZodAny }) {
  return trpc.field.find.useQuery(
    {
      documentId: docId,
      path: fieldPath,
    },
    {
      select(data) {
        if (data) {
          const res = shape.safeParse(data.value)
          if (res.success) {
            return {
              value: res.data,
            }
          } else {
            return {
              value: data.value,
              errors: res.error.issues.map((i) => i.message),
            }
          }
        }
      },
    }
  )
}
