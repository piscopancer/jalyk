import { createSeedClient, seedDatabaseUrl } from '@jalyk/db'
import schemaDdl from '@jalyk/db/schema.sql?raw'
import { Layer, ManagedRuntime } from 'effect'
import { DatabaseLive, DatabaseSeed, DatabaseTest } from './db'
import { seedProfile } from './seed/config'
import { runSeed } from './seed/profiles'

// Композиция всех зависимостей серверной части. Сейчас это только БД, но сюда
// же добавляются будущие сервисы (S3, почта, учёт запросов).
export const AppLive = Layer.mergeAll(DatabaseLive)

/** Окружение под тесты: своя БД, всё остальное как в прод. */
export const AppTest = (dbUrl: string) => Layer.mergeAll(DatabaseTest(dbUrl))

/**
 * Окружение сид-профиля: отдельная база jalyk_seed, схема которой при старте
 * пересоздаётся начисто и наполняется данными профиля. Так среда возвращается в
 * исходное состояние при каждом рестарте процесса.
 */
export const AppSeed = Layer.mergeAll(
  DatabaseSeed(async () => {
    const db = await createSeedClient(seedDatabaseUrl, schemaDdl)
    await runSeed(db, seedProfile!)
    return db
  }),
)

// Единый рантайм приложения. Если задан SEED_PROFILE — поднимаем сид-среду,
// иначе обычный прод. Server functions исполняют Effect через этот рантайм.
export const runtime = ManagedRuntime.make(seedProfile ? AppSeed : AppLive)

/** Фабрика рантайма для тестов — на отдельной БД. */
export const makeTestRuntime = (dbUrl: string) =>
  ManagedRuntime.make(AppTest(dbUrl))
