import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from './generated/client.ts'

// Один экземпляр на процесс. В dev TanStack/Vite перезапускает модули,
// поэтому держим клиент на globalThis, чтобы не плодить пулы соединений.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 работает через driver adapter; для SQLite берём libsql — у него
// готовые бинарники, не требует нативной сборки (важно на Windows).
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Новый клиент на произвольную БД — для тестов с изолированным файлом. */
export const createClient = (url: string) =>
  new PrismaClient({ adapter: new PrismaLibSql({ url }) })

/**
 * Клиент на in-memory SQLite со схемой, применённой из DDL. Используется
 * тестовыми средами: при каждом запуске процесса БД пустая, поэтому таблицы
 * нужно создать вручную (db push к памяти не применить). Весь DDL и все
 * последующие запросы идут через одно соединение адаптера — это та же
 * in-memory БД. `ddl` берётся из `@jalyk/db/schema.sql?raw`.
 */
export const createInMemoryClient = async (ddl: string) => {
  // `cache=shared` обязателен: иначе каждое соединение адаптера получает свою
  // отдельную in-memory БД и не видит таблиц, созданных при применении DDL.
  const client = new PrismaClient({
    adapter: new PrismaLibSql({ url: 'file::memory:?cache=shared' }),
  })
  // Делаем DDL идемпотентным: in-memory БД с cache=shared переживает горячую
  // перезагрузку модулей в dev, поэтому таблицы/индексы могут уже существовать.
  const statements = ddl
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/^CREATE (TABLE|UNIQUE INDEX|INDEX) /i, 'CREATE $1 IF NOT EXISTS '))
  for (const statement of statements) {
    await client.$executeRawUnsafe(statement)
  }
  return client
}

export type Db = PrismaClient
