import { HttpServerRequest } from '@effect/platform'
import { Authentication, Unauthorized } from '@jalyk/contract'
import { Effect, Layer } from 'effect'
import { auth } from '../lib/auth.ts'

// Серверная реализация middleware аутентификации. Тег Authentication и
// предоставляемый им CurrentUser объявлены в @jalyk/contract; здесь — только
// Layer, разрешающий пользователя из bearer-токена сессии.
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const session = yield* Effect.promise(() =>
        auth.api.getSession({ headers: new Headers(request.headers) }),
      )
      if (!session) {
        return yield* new Unauthorized()
      }
      const { user } = session
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? null,
      }
    })
  }),
)
