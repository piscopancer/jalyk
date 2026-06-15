import { HttpApiMiddleware, HttpServerRequest } from '@effect/platform'
import { Context, Effect, Layer } from 'effect'
import { auth } from '../lib/auth.ts'
import { Unauthorized } from './errors.ts'

// Аутентифицированный редактор студии, разрешённый из bearer-токена сессии.
// Доступен в обработчиках эндпоинтов, защищённых middleware Authentication.
export class CurrentUser extends Context.Tag('CurrentUser')<
  CurrentUser,
  {
    readonly id: string
    readonly email: string
    readonly name: string
    readonly image: string | null
  }
>() {}

// Middleware, требующее аутентифицированного пользователя. Подключается к группам
// и эндпоинтам через `.middleware(Authentication)`; в обработчиках появляется
// доступ к тегу CurrentUser.
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()('Authentication', {
  failure: Unauthorized,
  provides: CurrentUser,
}) {}

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
