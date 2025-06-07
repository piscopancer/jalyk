import { ProjectInfo } from '@repo/shared'
import { useQuery } from '@tanstack/react-query'
import useProjectCtx from './useProjectCtx'

export function useProjectInfo() {
  const ctx = useProjectCtx()
  const query = useQuery({
    queryKey: ['project', ctx.id],
    async queryFn() {
      const res = await fetch(`http://localhost:1488/project/${ctx.id}`).then((res) => res.json() as Promise<ProjectInfo>)
      return res
    },
  })
  return query
}
