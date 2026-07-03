import { createClient } from '@jalyk/db'
import { Database } from '@jalyk/core'
import { Effect, Layer } from 'effect'

// Тег Database, прод-Layer и хелпер query живут в @jalyk/core — их использует и
// api. Здесь остаётся только специфичное для веба окружение под тесты.
export { Database, DatabaseLive, query } from '@jalyk/core'

/**
 * Тест: отдельный клиент на изолированную БД, с отключением по завершении scope.
 * Передаётся свой url, чтобы не задеть рабочую БД.
 */
export const DatabaseTest = (url: string) =>
  Layer.scoped(
    Database,
    Effect.acquireRelease(
      Effect.sync(() => createClient(url)),
      (client) => Effect.promise(() => client.$disconnect()),
    ),
  )
