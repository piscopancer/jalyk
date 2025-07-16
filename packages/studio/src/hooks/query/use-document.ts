import { trpc } from '@/trpc'

// todo: fix?
import type * as T from '../../../node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs'
type _ = typeof T

export function useDocumentQuery({ id }: { id: string }) {
  return trpc.document.find.useQuery(id)
}
