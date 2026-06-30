import { HttpApiMiddleware } from '@effect/platform'
import { Context } from 'effect'
import { Unauthorized } from './errors.ts'
import type { Principal } from './principal.ts'

// Теги middleware и предоставляемых ими контекстов. Тег задаёт контракт (имя,
// схему ошибки, что middleware кладёт в контекст) и един для сервера и клиента;
// серверная реализация (Layer.effect от этого тега) живёт в apps/api. Тип
// Principal лежит здесь же, в контракте (./principal.ts).

/** Аутентифицированный редактор студии, разрешённый из bearer-токена сессии. */
export class CurrentUser extends Context.Tag('CurrentUser')<
  CurrentUser,
  {
    readonly id: string
    readonly email: string
    readonly name: string
    readonly image: string | null
  }
>() {}

// Требует аутентифицированного пользователя. В обработчиках под ним доступен
// тег CurrentUser; без действительной сессии ответ 401.
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  'Authentication',
  {
    failure: Unauthorized,
    provides: CurrentUser,
  },
) {}

/** Принципал текущего запроса, разрешённый из заголовков (сессия или api-ключ). */
export class CurrentPrincipal extends Context.Tag('CurrentPrincipal')<
  CurrentPrincipal,
  Principal
>() {}

// Единый middleware доступа на контентные операции. Два режима: api-ключ в
// заголовке X-Api-Key (приоритет) или сессия в Authorization: Bearer. Любой
// невалидный/отсутствующий принципал → 401; привязку к проекту проверяет уже
// getProjectAccess в обработчике.
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  'Authorization',
  {
    failure: Unauthorized,
    provides: CurrentPrincipal,
  },
) {}
