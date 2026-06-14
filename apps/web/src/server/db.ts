import { PrismaClient, createClient, prisma } from '@jalyk/db'
import { Context, Effect, Layer } from 'effect'
import { DbError } from './errors'

// Сервис БД. Тег несёт PrismaClient, чтобы окружения (prod/test) могли
// подставлять разные подключения, не трогая бизнес-логику.
export class Database extends Context.Tag('Database')<Database, PrismaClient>() {}

/** Прод: общий клиент из @jalyk/db (DATABASE_URL из окружения). */
export const DatabaseLive = Layer.succeed(Database, prisma)

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

/** Выполнить операцию Prisma внутри Effect, обернув ошибку в DbError. */
export const query = <A>(f: (db: PrismaClient) => Promise<A>) =>
  Effect.flatMap(Database, (db) =>
    Effect.tryPromise({ try: () => f(db), catch: (cause) => new DbError({ cause }) }),
  )
