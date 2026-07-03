import { Config, Effect } from 'effect'
import { dbStateNames, isSeedState, type DbState } from './states.ts'

// Состояние БД выбирается переменной JALYK_DB_STATE. Это литерал по фиксированному
// набору имён — неизвестное или отсутствующее значение падает с ConfigError, так
// что прод не свалится молча в локальную базу. В деве переменную выставляет
// лаунчер (scripts/dev.ts) из флага --db, в проде она задаётся явно в дашборде.
//
//   local          — локальный Docker-Postgres (DATABASE_URL);
//   prod           — боевая Supabase (SUPABASE_DATABASE_URL / SUPABASE_DIRECT_URL);
//   empty|many|demo — сид-профили: подключение к предзасеянной базе jalyk_seed
//                     (SEED_DATABASE_URL). Сам сидинг делает лаунчер один раз
//                     перед стартом, поэтому здесь это просто строка подключения.
//
// Намеренно НЕ читаем покомпонентные PG*-переменные: они часто заданы глобально
// под чужой локальный Postgres и незаметно перебивали бы наш Docker.

/** Активное состояние БД. Резолвится синхронно при импорте (нужно client.ts на
 * этапе загрузки модуля для создания PrismaClient). */
export const dbState: DbState = Effect.runSync(
  Config.literal(...dbStateNames)('JALYK_DB_STATE'),
)

/** Строка подключения к базе сид-профилей. Обязательна и резолвится при импорте:
 * без SEED_DATABASE_URL процесс падает, а не подставляет локальный дефолт. */
export const seedDatabaseUrl = Effect.runSync(Config.string('SEED_DATABASE_URL'))

/** Строка подключения к рабочей БД для активного состояния (рантайм приложения).
 * CLI Prisma (migrate / db push) свой URL берёт из prisma.config.ts напрямую. */
export const runtimeUrl = Effect.runSync(
  Effect.gen(function* () {
    if (dbState === 'prod') return yield* Config.string('SUPABASE_DATABASE_URL')
    if (isSeedState(dbState)) return seedDatabaseUrl
    return yield* Config.string('DATABASE_URL')
  }),
)
