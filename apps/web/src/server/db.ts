import { PrismaClient, createClient } from '@jalyk/db'
import { Database } from '@jalyk/core'
import { Effect, Layer } from 'effect'

// Тег Database, прод-Layer и хелпер query живут в @jalyk/core — их использует и
// api. Здесь остаются только специфичные для веба окружения: тест и сид.
export { Database, DatabaseLive, query } from '@jalyk/core'

/**
 * Тест: отдельный клиент на изолированный файл/память, с отключением по
 * завершении scope. Передаётся свой url, чтобы не задеть рабочую БД.
 */
export const DatabaseTest = (url: string) =>
  Layer.scoped(
    Database,
    Effect.acquireRelease(
      Effect.sync(() => createClient(url)),
      (client) => Effect.promise(() => client.$disconnect()),
    ),
  )

/**
 * Сид-среда: in-memory клиент, который инициализируется (схема + данные) при
 * первом обращении и закрывается по завершении scope. БД живёт в памяти
 * процесса, поэтому при каждом рестарте приложения всё возвращается к исходному
 * состоянию профиля. `init` создаёт и наполняет клиент.
 */
export const DatabaseSeed = (init: () => Promise<PrismaClient>) =>
  Layer.scoped(
    Database,
    Effect.acquireRelease(Effect.promise(init), (client) => Effect.promise(() => client.$disconnect())),
  )
