// Принципал — субъект запроса в контракте API: студия-редактор приходит сессией
// (kind 'user'), клиентское приложение пользователя — api-ключом (kind 'key').
// Ключ уже привязан к проекту, поэтому несёт projectId и scope.
//
// Тип живёт в контракте, а не в серверном @jalyk/core, потому что на него ссылается
// middleware Authorization (через CurrentPrincipal), а значит и весь тип Api,
// который импортирует студия. Держим его здесь, чтобы декларации @jalyk/contract
// были самодостаточны и собирались без серверных зависимостей (core → db/Prisma).

/** Scope api-ключа. Литерал совпадает с енамом Scope в Prisma-схеме (@jalyk/db). */
export type ApiKeyScope = 'read' | 'write'

export type Principal =
  | { readonly kind: 'user'; readonly userId: string }
  | {
      readonly kind: 'key'
      readonly keyId: string
      readonly projectId: string
      readonly scope: ApiKeyScope
    }
