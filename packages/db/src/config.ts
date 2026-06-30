import { Config, Context, Effect, Layer } from 'effect'

// Источник строк подключения к БД, организованный как стратегия окружений.
// Активное окружение выбирается переменной DB_TARGET (по умолчанию `local`):
//   - local    — локальный Docker-Postgres (тестовые данные при разработке);
//   - supabase — боевая база Supabase (реальные данные).
// Каждое окружение отдаёт пару URL: `runtimeUrl` для приложения (PrismaClient)
// и `migrationUrl` для CLI Prisma (db push / migrate). У локального окружения
// они совпадают; у Supabase различаются — рантайм идёт через transaction pooler
// (порт 6543, pgbouncer), а миграции требуют session pooler (порт 5432).
//
// Намеренно НЕ читаем покомпонентные PG*-переменные: они часто заданы глобально
// под чужой локальный Postgres и незаметно перебивали бы наш Docker.

/** Пара строк подключения для одного окружения. */
export interface DbConnection {
  /** URL для рантайма приложения (PrismaClient / driver adapter). */
  readonly runtimeUrl: string
  /** URL для CLI Prisma (миграции, db push). */
  readonly migrationUrl: string
}

/** Сервис конфигурации БД — за тегом прячется выбранное окружение-стратегия. */
export class DbConfig extends Context.Tag('DbConfig')<
  DbConfig,
  DbConnection
>() {}

/** Доступные окружения БД. */
export type DbTarget = 'local' | 'supabase'

const DEFAULT_LOCAL_URL = 'postgresql://jalyk:jalyk@localhost:5432/jalyk'
const DEFAULT_SEED_URL = 'postgresql://jalyk:jalyk@localhost:5432/jalyk_seed'

/**
 * Локальное окружение: одна строка DATABASE_URL (или дефолт под Docker),
 * рантайм и миграции ходят в одну и ту же базу.
 */
export const DbConfigLocal = Layer.effect(
  DbConfig,
  Effect.gen(function* () {
    const url = yield* Config.string('DATABASE_URL').pipe(
      Config.withDefault(DEFAULT_LOCAL_URL),
    )
    return { runtimeUrl: url, migrationUrl: url }
  }),
)

/**
 * Боевое окружение Supabase: рантайм через transaction pooler
 * (SUPABASE_DATABASE_URL), миграции через session pooler (SUPABASE_DIRECT_URL).
 * Обе переменные обязательны — при отсутствии падаем громко, чтобы случайно не
 * уехать в локальную базу под видом прода.
 */
export const DbConfigSupabase = Layer.effect(
  DbConfig,
  Effect.gen(function* () {
    const runtimeUrl = yield* Config.string('SUPABASE_DATABASE_URL')
    const migrationUrl = yield* Config.string('SUPABASE_DIRECT_URL')
    return { runtimeUrl, migrationUrl }
  }),
)

/** Окружение, выбранное переменной DB_TARGET (по умолчанию `local`). */
export const dbTarget: DbTarget =
  process.env.DB_TARGET === 'supabase' ? 'supabase' : 'local'

/** Слой DbConfig для активного окружения. */
export const DbConfigLive =
  dbTarget === 'supabase' ? DbConfigSupabase : DbConfigLocal

// Разовое синхронное разрешение для потребителей, которым строка нужна на этапе
// загрузки модуля (client.ts — создание PrismaClient; prisma.config.ts — CLI).
// Effect-код приложения должен зависеть от сервиса DbConfig напрямую.
const resolved = Effect.runSync(DbConfig.pipe(Effect.provide(DbConfigLive)))

/** Строка подключения к рабочей БД (рантайм приложения). */
export const runtimeUrl = resolved.runtimeUrl

/** Строка подключения для миграций / db push. */
export const migrationUrl = resolved.migrationUrl

/** Строка подключения к базе сид/тестовых сред (всегда локальная отдельная база). */
export const seedDatabaseUrl = Effect.runSync(
  Config.string('SEED_DATABASE_URL').pipe(Config.withDefault(DEFAULT_SEED_URL)),
)
