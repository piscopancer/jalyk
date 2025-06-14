import useStudioCtx from '@/hooks/use-project-ctx'
import { ProjectInfo } from '@/types'
import { useQuery } from '@tanstack/react-query'

export function useProjectInfo() {
  const ctx = useStudioCtx()
  const query = useQuery({
    queryKey: ['project', ctx.projectId],
    async queryFn() {
      return {
        id: '123',
        title: 'AAAA',
      } satisfies ProjectInfo

      // TODO: this does not work bcs of trpc
      const res = await fetch(`http://localhost:1488/project/${ctx.projectId}`).then((res) => res.json() as Promise<ProjectInfo>)
      return res
    },
  })
  return query
}
