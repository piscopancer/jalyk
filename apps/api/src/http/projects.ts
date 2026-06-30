import { HttpApiBuilder } from '@effect/platform'
import { getProjectAccess, listProjectMembers } from '@jalyk/core'
import { Effect } from 'effect'
import { Api, CurrentPrincipal, NotFound } from '@jalyk/contract'
import { access } from './access.ts'
import { Presence } from '../presence.ts'

// Обработчики группы /projects/:projectId. access прогоняет принципала через ядро
// изоляции; members отдаёт участников проекта с их текущим online для presence.
// NotFoundError/DbError из core мапятся в 404 (чужой/несуществующий проект).
export const ProjectsLive = HttpApiBuilder.group(Api, 'projects', (handlers) =>
  handlers
    .handle('access', ({ path }) =>
      Effect.gen(function* () {
        const principal = yield* CurrentPrincipal
        const granted = yield* getProjectAccess(principal, path.projectId).pipe(
          Effect.catchTag('NotFoundError', () => new NotFound()),
          Effect.catchTag('DbError', (e) => Effect.die(e)),
        )
        return {
          kind: granted.kind,
          projectId: granted.projectId,
          canWrite: granted.canWrite,
          role: granted.kind === 'user' ? granted.role : undefined,
          scope: granted.kind === 'key' ? granted.scope : undefined,
        }
      }),
    )
    // Участники проекта для presence: сперва изоляция, затем список членов из БД,
    // помеченный online по текущему состоянию Presence (кто держит SSE-поток).
    .handle('members', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(
          Effect.gen(function* () {
            const presence = yield* Presence
            const online = yield* presence.onlineUserIds(path.projectId)
            const members = yield* listProjectMembers(path.projectId).pipe(
              Effect.catchTag('DbError', (e) => Effect.die(e)),
            )
            return members.map((m) => ({
              userId: m.userId,
              name: m.name,
              image: m.image,
              role: m.role,
              joinedAt: m.joinedAt.toISOString(),
              online: online.has(m.userId),
            }))
          }),
        ),
      ),
    ),
)
