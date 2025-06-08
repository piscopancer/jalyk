import { ProjectInfo } from '@repo/shared'
import { useQuery } from '@tanstack/react-query'
import useStudioCtx from './use-project-ctx'

export function useProjectInfo() {
  const ctx = useStudioCtx()
  const query = useQuery({
    queryKey: ['project', ctx.projectId],
    async queryFn() {
      const res = await fetch(`http://localhost:1488/project/${ctx.projectId}`).then((res) => res.json() as Promise<ProjectInfo>)
      return res
    },
  })
  return query
}
