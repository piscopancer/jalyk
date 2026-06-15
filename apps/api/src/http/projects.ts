import { HttpApiBuilder } from '@effect/platform'
import { getProjectAccess } from '@jalyk/core'
import { Effect } from 'effect'
import { Api } from './api.ts'
import { CurrentPrincipal } from './authz.ts'
import { NotFound } from './errors.ts'

// Обработчик /projects/:projectId/access: берёт принципала из middleware и
// projectId из пути, прогоняет через ядро изоляции. NotFoundError/DbError из core
// мапятся в HTTP NotFound (чужой/несуществующий проект — 404, без раскрытия).
export const ProjectsLive = HttpApiBuilder.group(Api, 'projects', (handlers) =>
  handlers.handle('access', ({ path }) =>
    Effect.gen(function* () {
      const principal = yield* CurrentPrincipal
      const access = yield* getProjectAccess(principal, path.projectId).pipe(
        Effect.catchTag('NotFoundError', () => new NotFound()),
        Effect.catchTag('DbError', (e) => Effect.die(e)),
      )
      return {
        kind: access.kind,
        projectId: access.projectId,
        canWrite: access.canWrite,
        role: access.kind === 'user' ? access.role : undefined,
        scope: access.kind === 'key' ? access.scope : undefined,
      }
    }),
  ),
)
