import { type PrismaClient, prisma } from '@jalyk/db'
import { Context, Effect, Layer } from 'effect'
import { DbError } from './errors.ts'

// Общий Effect-слой поверх Prisma. Тег несёт PrismaClient, чтобы окружения
// (prod/test/seed) могли подставлять разные подключения, не трогая бизнес-логику.
// Тег один на весь монорепо — поэтому web и api ссылаются на одну и ту же
// сущность Database, а свои Layer'ы (тест/сид) собирают поверх него.
export class Database extends Context.Tag('Database')<Database, PrismaClient>() {}

/** Прод: общий клиент из @jalyk/db (URL из единого src/config.ts пакета db). */
export const DatabaseLive = Layer.succeed(Database, prisma)

/** Выполнить операцию Prisma внутри Effect, обернув ошибку в DbError. */
export const query = <A>(f: (db: PrismaClient) => Promise<A>) =>
  Effect.flatMap(Database, (db) =>
    Effect.tryPromise({ try: () => f(db), catch: (cause) => new DbError({ cause }) }),
  )
