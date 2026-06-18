import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { studioKeys } from '../data/keys.ts'
import { ProjectNotFound, type AccessDenial } from './ProjectNotFound.tsx'

const denials = new Set<AccessDenial>(['NotFound', 'Unauthorized', 'Forbidden'])

// Проба доступа к проекту через специальный эндпоинт /access — он для того и
// заведён: отдаёт разрешённый доступ, падает 404 для чужого/несуществующего
// проекта (изоляция), 403 без прав и 401 без валидного принципала. Через
// runEither, а не run, чтобы разобрать тег ошибки, не бросая исключение. Прочие
// сбои (сеть, 500) пробрасываем в react-query — их гейт не перехватывает.
function useProjectAccess() {
  const { projectId, client, runEither } = useStudio()
  return useQuery({
    queryKey: studioKeys.access(projectId),
    // У пробы свой полноэкранный экран (ProjectNotFound) — глобальный тост ошибок
    // для неё подавляем.
    meta: { silentError: true },
    queryFn: async () => {
      const result = await runEither(client.projects.access({ path: { projectId } }))
      if (result._tag === 'Right') return { ok: true } as const
      const tag = (result.left as { _tag?: string })._tag
      if (tag && denials.has(tag as AccessDenial)) {
        return { ok: false, reason: tag as AccessDenial } as const
      }
      throw result.left
    },
  })
}

// Гейт доступа: пока проба идёт — нейтральная заглушка; при отказе (проект не
// найден / ключ невалиден / нет прав) — экран ProjectNotFound со ссылкой в ЛК;
// иначе пропускает студию дальше.
export function ProjectGate({ children }: { children: ReactNode }) {
  const { projectId } = useStudio()
  const access = useProjectAccess()

  if (access.data && !access.data.ok) {
    return <ProjectNotFound reason={access.data.reason} projectId={projectId} />
  }
  if (access.isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    )
  }
  return <>{children}</>
}
