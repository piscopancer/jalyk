import { HttpServerRequest } from '@effect/platform'
import { Authorization, Unauthorized } from '@jalyk/contract'
import { DatabaseLive, findApiKey, type Principal } from '@jalyk/core'
import { Effect, Layer } from 'effect'
import { auth } from '../lib/auth.ts'

// Серверная реализация middleware доступа. Тег Authorization и предоставляемый им
// CurrentPrincipal объявлены в @jalyk/contract (общий контракт сервера и студии);
// здесь — только Layer, разрешающий принципала из заголовков запроса.
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
