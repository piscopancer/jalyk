import useStudioConfig from '@/hooks/use-project-ctx'
import { trpc } from '@/trpc'

// todo: fix?
import type * as T from '../../node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs'
type _ = typeof T

export function useProjectQuery() {
  const { projectId } = useStudioConfig()
  return trpc.project.find.useQuery({ projectId })
}
