import { trpc } from '@/trpc'
import useStudioConfig from '../use-project-ctx'
import { useProjectQuery } from '../use-project-info'

// todo: fix?
import type * as T from '../../../node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs'
type _ = typeof T

export function useProjectUsers() {
  const { projectId } = useStudioConfig()
  const { data: project } = useProjectQuery()
  return trpc.user.findMany.useQuery(
    {
      projectId,
      userIds: project?.users.map((u) => u.userId)!,
    },
    {
      enabled: !!project,
    }
  )
}
