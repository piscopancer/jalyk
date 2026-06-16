import { HttpApiBuilder } from '@effect/platform'
import { Api } from '@jalyk/contract'
import { query } from '@jalyk/core'
import { Effect } from 'effect'

// Обработчик /health: пингуем БД простым SELECT 1. Сбой подключения не роняет
// эндпоинт, а отражается полем db: 'down' — мониторингу нужен ответ, а не 500.
export const HealthLive = HttpApiBuilder.group(Api, 'health', (handlers) =>
  handlers.handle('check', () =>
    query((db) => db.$queryRaw`SELECT 1`).pipe(
      Effect.as('up' as const),
      Effect.catchAll(() => Effect.succeed('down' as const)),
      Effect.map((db) => ({ status: 'ok' as const, db })),
    ),
  ),
)
