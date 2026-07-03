import { Layer, ManagedRuntime } from 'effect'
import { DatabaseLive, DatabaseTest } from './db'

// Композиция всех зависимостей серверной части. Сейчас это только БД, но сюда
// же добавляются будущие сервисы (S3, почта, учёт запросов).
export const AppLive = Layer.mergeAll(DatabaseLive)

/** Окружение под тесты: своя БД, всё остальное как в прод. */
export const AppTest = (dbUrl: string) => Layer.mergeAll(DatabaseTest(dbUrl))

// Единый рантайм приложения. Состояние БД (включая сид-профили) выбирается
// переменной JALYK_DB_STATE в @jalyk/db: для сид-профилей DatabaseLive уже
// подключён к предзасеянной базе jalyk_seed, поэтому отдельной сид-композиции
// здесь больше нет — засев делает лаунчер один раз перед стартом.
export const runtime = ManagedRuntime.make(AppLive)

/** Фабрика рантайма для тестов — на отдельной БД. */
export const makeTestRuntime = (dbUrl: string) =>
  ManagedRuntime.make(AppTest(dbUrl))
