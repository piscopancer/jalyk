import { trpc } from '@/trpc'
import useStudioConfig from '../use-project-ctx'
import { useProjectQuery } from '../use-project-info'

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
