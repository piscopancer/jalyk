import { PreviewProps } from '@/components/preview'
import { trpc } from '@/trpc'

// function preparePreview(
//   fields: { title: any; subtitle: any },
//   prepare: {
//     title: (title: any) => string
//     subtitle: (subtitle: any) => string
//   }
// ): PreviewProps {
//   return {
//     title: prepare.title(fields.title),
//     subtitle: prepare.subtitle(fields.subtitle),
//   }
// }

export function usePreviewQuery(documentId: string) {
  const { data: doc } = trpc.document.find.useQuery(documentId)
  const fieldsQuery = trpc.useQueries((t) =>
    (doc ? doc.fields : []).map((f) =>
      t.field.find({
        documentId,
        path: f.path,
      })
    )
  )
  // @ts-ignore
  let title = fieldsQuery.find((q) => typeof q.data?.value === 'string')?.data?.value as string | undefined
  return {
    title: title ?? documentId,
  } satisfies PreviewProps as PreviewProps
}
