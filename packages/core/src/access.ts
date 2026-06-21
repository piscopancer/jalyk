import type { Role, Scope } from '@jalyk/db'
import { Effect } from 'effect'
import { type Database, query } from './db.ts'
import { type DbError, NotFoundError } from './errors.ts'

// Принципал — тот, от чьего имени пришёл запрос. Студия-редактор приходит сессией
// (kind 'user'), клиентское приложение пользователя — api-ключом (kind 'key').
// Ключ уже привязан к проекту, поэтому несёт projectId и scope.
export type Principal =
  | { readonly kind: 'user'; readonly userId: string }
  | {
      readonly kind: 'key'
      readonly keyId: string
      readonly projectId: string
      readonly scope: Scope
    }

// Разрешённый доступ к конкретному проекту — результат проверки принципала против
// projectId. canWrite сводит роль/скоуп к одному флагу для операций записи.
export type ProjectAccess =
  | {
      readonly kind: 'user'
      readonly projectId: string
      readonly userId: string
      readonly role: Role
      readonly canWrite: boolean
    }
  | {
      readonly kind: 'key'
      readonly projectId: string
      readonly keyId: string
      readonly scope: Scope
      readonly canWrite: boolean
    }

/** Членство пользователя в проекте, либо null. */
export const getMembership = (projectId: string, userId: string) =>
  query((db) =>
    db.member.findUnique({
      where: { projectId_userId: { projectId, userId } },
    }),
  )

// Проверка доступа принципала к проекту. Это и есть ядро изоляции: пользователь
// получает доступ только к проектам, где он участник; ключ — только к своему
// проекту. Во всех случаях отказа возвращаем NotFoundError, чтобы не раскрывать
// существование чужих проектов. Права на запись (editor/owner для пользователя,
// scope 'write' для ключа) проверяет уже конкретный обработчик через canWrite.
export const getProjectAccess = (
  principal: Principal,
  projectId: string,
): Effect.Effect<ProjectAccess, NotFoundError | DbError, Database> => {
  if (principal.kind === 'user') {
    return getMembership(projectId, principal.userId).pipe(
      Effect.flatMap((member) =>
        member
          ? Effect.succeed({
              kind: 'user' as const,
              projectId,
              userId: principal.userId,
              role: member.role,
              canWrite: true,
            })
          : Effect.fail(new NotFoundError({ what: 'project' })),
      ),
    )
  }
  return principal.projectId === projectId
    ? Effect.succeed({
        kind: 'key' as const,
        projectId,
        keyId: principal.keyId,
        scope: principal.scope,
        canWrite: principal.scope === 'write',
      })
    : Effect.fail(new NotFoundError({ what: 'project' }))
}
