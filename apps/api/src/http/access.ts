import { getProjectAccess, type ProjectAccess } from '@jalyk/core'
import { CurrentPrincipal, Forbidden, NotFound } from '@jalyk/contract'
import { Effect } from 'effect'

// Общая проверка доступа к проекту для контентных групп (документы, ассеты).
// Отказ ядра (чужой/несуществующий проект) → 404, чтобы не раскрывать его
// существование. DbError — необрабатываемый сбой (die → 500).
export const access = (projectId: string) =>
  Effect.gen(function* () {
    const principal = yield* CurrentPrincipal
    return yield* getProjectAccess(principal, projectId).pipe(
      Effect.catchTag('NotFoundError', () => new NotFound()),
      Effect.catchTag('DbError', (e) => Effect.die(e)),
    )
  })

// Доступ с правом записи: к 404-изоляции добавляет 403 для read-only принципала.
export const writeAccess = (projectId: string) =>
  access(projectId).pipe(
    Effect.flatMap((a: ProjectAccess) => (a.canWrite ? Effect.succeed(a) : new Forbidden())),
  )
