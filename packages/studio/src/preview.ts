import { z } from 'zod/v4'
import { useParsedFieldQuery } from './field'

type UseParsedFieldQuery = typeof useParsedFieldQuery
export type ResolvedPreview = {
  title?: string
  subtitle?: string
  imgUrl?: string
}

export function defineUsePreview(hookCreator: (props: { useParsedFieldQuery: UseParsedFieldQuery; documentId: string }) => ResolvedPreview) {
  return (documentId: string) =>
    hookCreator({
      documentId,
      useParsedFieldQuery,
    })
}

export type UsePreview = ReturnType<typeof defineUsePreview>

// test

export const useUserPreview1 = defineUsePreview(({ useParsedFieldQuery, documentId }) => {
  const nameFieldQuery = useParsedFieldQuery({
    documentId,
    path: 'name',
    shape: z.string(),
  })
  const surnameFieldQuery = useParsedFieldQuery({
    documentId,
    path: 'surname',
    shape: z.string(),
  })
  const middlenameFieldQuery = useParsedFieldQuery({
    documentId,
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
