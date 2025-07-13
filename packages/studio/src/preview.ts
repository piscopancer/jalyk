import { LucideFileSymlink } from 'lucide-react'
import { SetOptional } from 'type-fest'
import { z } from 'zod/v4'
import { PreviewBaseProps } from './components/preview'
import { JalykDocument } from './document'
import { useParsedFieldQuery } from './field'
import useStudioConfig from './hooks/use-project-ctx'

type UseParsedFieldQuery = typeof useParsedFieldQuery
export type ResolvedPreview = PreviewBaseProps
// {
//   title?: string
//   subtitle?: string
//   imgUrl?: string
// }

export type DocumentForPreview = SetOptional<JalykDocument, 'type'>

export function defineUsePreview(hookCreator: (props: { useParsedFieldQuery: UseParsedFieldQuery; document: DocumentForPreview }) => ResolvedPreview) {
  return (document: DocumentForPreview) =>
    hookCreator({
      document,
      useParsedFieldQuery,
    })
}

export type UsePreview = ReturnType<typeof defineUsePreview>

export const useDefaultPreview = defineUsePreview(({ document }) => {
  const { definitions } = useStudioConfig()
  const icon = document.type ? definitions.find((d) => d.type === document.type)?.icon : LucideFileSymlink

  if (!icon) throw new Error(`Icons was not found bcs there is no type ${document.type}`)

  return {
    title: document.id,
    subtitle: document.type,
    media: {
      type: 'icon',
      icon,
    },
    size: 'default',
  }
})

// test

export const useUserPreview1 = defineUsePreview(({ useParsedFieldQuery, document }) => {
  const nameFieldQuery = useParsedFieldQuery({
    documentId: document.id,
    path: 'name',
    shape: z.string(),
  })
  const surnameFieldQuery = useParsedFieldQuery({
    documentId: document.id,
    path: 'surname',
    shape: z.string(),
  })
  const middlenameFieldQuery = useParsedFieldQuery({
    documentId: document.id,
    path: 'middlename',
    shape: z.string(),
  })

  const name = nameFieldQuery.data?.errors ? 'АШИБКА' : nameFieldQuery.data?.value || '*'
  const surname = surnameFieldQuery.data?.errors ? 'АШИБКА' : surnameFieldQuery.data?.value || '*'

  return {
    title: name + ' ' + surname,
    subtitle: middlenameFieldQuery.data?.errors ? '---' : middlenameFieldQuery.data?.value || ':)',
  }
})
