import { trpc } from '@/trpc'

export function useDocumentQuery({ id }: { id: string }) {
  return trpc.document.find.useQuery(id)
}
