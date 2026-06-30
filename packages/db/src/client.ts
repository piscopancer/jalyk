import { PrismaPg } from '@prisma/adapter-pg'
import { runtimeUrl } from './config.ts'
import { PrismaClient } from './generated/client.ts'

// Один экземпляр на процесс. В dev TanStack/Vite перезапускает модули,
// поэтому держим клиент на globalThis, чтобы не плодить пулы соединений.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 работает через driver adapter; для Postgres берём pg.
const adapter = new PrismaPg({ connectionString: runtimeUrl })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Новый клиент на произвольную БД — для тестов и сид-сред на отдельной базе. */
export const createClient = (connectionString: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

/**
 * Клиент для тестовой/сид-среды: подключается к отдельной базе, начисто
 * пересоздаёт схему `public` и накатывает на неё DDL. При каждом запуске
 * процесса база возвращается в исходное состояние («сброс при рестарте»).
 * `ddl` берётся из `@jalyk/db/schema.sql?raw`.
 */
export const createSeedClient = async (
  connectionString: string,
  ddl: string,
) => {
  const client = createClient(connectionString)
  // Чистим всё содержимое базы и накатываем схему заново.
  await client.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE')
  await client.$executeRawUnsafe('CREATE SCHEMA public')
  const statements = ddl
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (const statement of statements) {
    await client.$executeRawUnsafe(statement)
  }
  return client
}

export type Db = PrismaClient
