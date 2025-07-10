import useStudioConfig from '@/hooks/use-project-ctx'
import { trpc } from '@/trpc'

export function useProjectQuery() {
  const { projectId } = useStudioConfig()
  return trpc.project.find.useQuery({ projectId })
}
