import { HttpApiMiddleware, HttpServerRequest } from '@effect/platform'
import { DatabaseLive, findApiKey, type Principal } from '@jalyk/core'
import { Context, Effect, Layer } from 'effect'
import { auth } from '../lib/auth.ts'
import { Unauthorized } from './errors.ts'

// Принципал текущего запроса, разрешённый из заголовков. Доступен в обработчиках
// контентных эндпоинтов через тег; дальше его проверяет getProjectAccess по
// projectId из пути.
export class CurrentPrincipal extends Context.Tag('CurrentPrincipal')<CurrentPrincipal, Principal>() {}

// Единый middleware доступа на все контентные операции (docs/05). Два режима:
// клиентское приложение шлёт api-ключ в заголовке `X-Api-Key`, студия — сессию в
// `Authorization: Bearer`. X-Api-Key имеет приоритет. Любой невалидный/отсутствующий
// принципал → 401. Привязку к конкретному проекту проверяет уже getProjectAccess.
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()('Authorization', {
  failure: Unauthorized,
  provides: CurrentPrincipal,
}) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const apiKey = request.headers['x-api-key']
      if (apiKey) {
        const key = yield* findApiKey(apiKey).pipe(
          Effect.catchAll(() => Effect.succeed(null)),
          Effect.provide(DatabaseLive),
        )
        if (!key) {
          return yield* new Unauthorized()
        }
        return {
          kind: 'key',
          keyId: key.id,
          projectId: key.projectId,
          scope: key.scope,
        } satisfies Principal
      }
      const session = yield* Effect.promise(() =>
        auth.api.getSession({ headers: new Headers(request.headers) }),
      )
      if (!session) {
        return yield* new Unauthorized()
      }
      return { kind: 'user', userId: session.user.id } satisfies Principal
    })
  }),
)
