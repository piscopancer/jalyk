import { Config, ConfigProvider, Effect, Option } from 'effect'

// Единственный источник строки подключения к БД. Все остальные места
// (client.ts, prisma.config.ts, сид-среда apps/web, apps/api) берут URL отсюда,
// чтобы при смене параметров не править их по всему репозиторию.
//
// Намеренно читаем ТОЛЬКО DATABASE_URL (и SEED_DATABASE_URL), а не отдельные
// PG*-переменные: последние часто заданы глобально под чужой локальный Postgres
// и незаметно перебивали бы наш Docker. Если переменная не задана — берём дефолт
// под локальный Docker из docker-compose.yml.

const DEFAULT_URL = 'postgresql://jalyk:jalyk@localhost:5432/jalyk'
const DEFAULT_SEED_URL = 'postgresql://jalyk:jalyk@localhost:5432/jalyk_seed'

const envProvider = ConfigProvider.fromMap(
  new Map(
    Object.entries(
      typeof process !== 'undefined'
        ? (process.env as Record<string, string>)
        : {},
    ),
  ),
)

const program = Effect.gen(function* () {
  const explicitUrl = yield* Config.option(Config.string('DATABASE_URL'))
  const explicitSeedUrl = yield* Config.option(
    Config.string('SEED_DATABASE_URL'),
  )

  return {
    databaseUrl: Option.getOrElse(explicitUrl, () => DEFAULT_URL),
    // Сид-среда живёт в отдельной базе с суффиксом _seed: её схема пересоздаётся
    // начисто при каждом старте, поэтому она не должна совпадать с рабочей.
    seedDatabaseUrl: Option.getOrElse(explicitSeedUrl, () => DEFAULT_SEED_URL),
  }
})

const resolved = Effect.runSync(
  program.pipe(Effect.withConfigProvider(envProvider)),
)

/** Строка подключения к рабочей БД. */
export const databaseUrl = resolved.databaseUrl

/** Строка подключения к базе сид/тестовых сред. */
export const seedDatabaseUrl = resolved.seedDatabaseUrl
