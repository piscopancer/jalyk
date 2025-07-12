import { z } from 'zod/v4'
import { trpc } from './trpc'

export function useParsedFieldQuery<S extends z.ZodType>({ documentId, path, shape }: { documentId: string; path: string; shape: S }) {
  return trpc.field.find.useQuery(
    {
      documentId,
      path: path,
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
