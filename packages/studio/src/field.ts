import { useMemo } from 'react'
import { funnel } from 'remeda'
import { JsonValue } from 'type-fest'
import { z } from 'zod/v4'
import { JalykDocument } from './document'
import useStudioConfig from './hooks/use-project-ctx'
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

export function useUpsertFieldFunnel<S extends z.ZodType, V extends z.infer<S>>(document: JalykDocument, field: { path: string; shape: S }) {
  const { projectId } = useStudioConfig()
  const utils = trpc.useUtils()
  const upsertField = trpc.field.upsert.useMutation()

  const _funnel = useMemo(
    () =>
      funnel(
        (value: V) => {
          upsertField.mutate({
            value: value as any,
            documentId: document.id,
            documentType: document.type,
            path: field.path,
            projectId,
          })
        },
        {
          minQuietPeriodMs: 1000,
          reducer(_, value: V) {
            return value
          },
        }
      ),
    [document, field, projectId]
  )

  return {
    upsertField(value: V) {
      const res = field.shape.safeParse(value)
      if (res.success) {
        utils.field.find.setData(
          {
            documentId: document.id,
            path: field.path,
          },
          { value: value as JsonValue }
        )
        _funnel.call(value)
      } else {
        console.warn('wrong value type')
      }
    },
  }
}
