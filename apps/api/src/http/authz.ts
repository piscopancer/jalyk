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
      // Приоритет у сессии редактора: когда студия шлёт и X-Api-Key (контекст
      // проекта от хоста), и Bearer (личность вошедшего), принципал — пользователь,
      // а доступ даёт его членство в проекте. Ключ остаётся для headless-запросов
      // (сервер потребителя без сессии), где сессии нет и мы падаем в ветку ключа.
      const session = yield* Effect.promise(() =>
        auth.api.getSession({ headers: new Headers(request.headers) }),
      )
      if (session) {
        return { kind: 'user', userId: session.user.id } satisfies Principal
      }
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
      return yield* new Unauthorized()
    })
  }),
)
