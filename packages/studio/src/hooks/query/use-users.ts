import useStudioCtx from '@/hooks/use-project-ctx'
import { queryKeys } from '@/query'
import { faker } from '@faker-js/faker'
import { useQuery } from '@tanstack/react-query'

export function useUsers() {
  const { projectId } = useStudioCtx()
  return useQuery({
    queryKey: queryKeys.users(projectId),
    queryFn: () => {
      return [
        {
          id: '0',
          name: 'igor',
          photoUrl: faker.image.personPortrait({ sex: 'male' }),
        },
        {
          id: '1',
          name: 'inna',
          photoUrl: faker.image.personPortrait({ sex: 'female' }),
        },
      ]
    },
  })
}
