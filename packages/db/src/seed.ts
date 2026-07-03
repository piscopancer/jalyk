import { Match } from 'effect'
import { createSeedClient } from './client.ts'
import { dbState, seedDatabaseUrl } from './config.ts'
import { isSeedState, type SeedState } from './states.ts'
import type { PrismaClient } from './generated/client.ts'

// Тестовые данные сид-профилей. Живут в @jalyk/db, чтобы их могли использовать и
// приложения (web/api подключаются к уже засеянной базе), и лаунчер dev, который
// эту базу засевает один раз перед стартом.

// Фиксированные id сидов: должны быть стабильными, чтобы фейковая сессия знала,
// под кем логиниться, не обращаясь к БД.
export const SEED_IDS = {
  amir: 'seed-amir',
  tamik: 'seed-tamik',
  bebrail: 'seed-bebrail',
} as const

// Популяция тестовых данных через Prisma (createMany/create) — наглядно и
// типобезопасно. updatedAt не передаём: поле @updatedAt Prisma проставит сам.

/** demo: Амир, Тамик и Бебраил; у Бебраила один проект, он же владелец. */
async function seedDemo(db: PrismaClient): Promise<void> {
  await db.user.createMany({
    data: [
      {
        id: SEED_IDS.amir,
        name: 'Amir Makoev',
        email: 'amir@jalyk.test',
        emailVerified: true,
      },
      {
        id: SEED_IDS.tamik,
        name: 'Tamik Goidov',
        email: 'tamik@jalyk.test',
        emailVerified: true,
      },
      {
        id: SEED_IDS.bebrail,
        name: 'Бебраил Жемарисов',
        email: 'bebrail@jalyk.test',
        emailVerified: true,
      },
    ],
  })

  await db.project.create({
    data: {
      id: 'seed-project-1',
      name: 'Мой первый проект',
      ownerId: SEED_IDS.bebrail,
    },
  })
  await db.subscription.create({
    data: { userId: SEED_IDS.bebrail, plan: 'free' },
  })
}

/** many: 1000 пользователей без проектов; логин под seed-user-1. */
async function seedMany(db: PrismaClient): Promise<void> {
  const users = Array.from({ length: 1000 }, (_, i) => {
    const n = i + 1
    return {
      id: `seed-user-${n}`,
      name: `User ${n}`,
      email: `user${n}@jalyk.test`,
      emailVerified: true,
    }
  })
  await db.user.createMany({ data: users })
}

/** Применить выбранный профиль к свежей (только что пересозданной) БД. */
export async function runSeed(
  db: PrismaClient,
  state: SeedState,
): Promise<void> {
  return Match.value(state).pipe(
    Match.when('demo', () => seedDemo(db)),
    Match.when('many', () => seedMany(db)),
    Match.when('empty', () => Promise.resolve()),
    Match.exhaustive,
  )
}

/**
 * Пересоздать базу jalyk_seed начисто и наполнить профилем. Вызывается лаунчером
 * ОДИН раз перед стартом приложений, чтобы web и api не гонялись за пересоздание
 * схемы. Требует @jalyk/db/schema.sql (передаётся вызывающим, чтобы пакет не тянул
 * ?raw-импорт бандлера).
 */
export async function applySeed(state: SeedState, ddl: string): Promise<void> {
  const db = await createSeedClient(seedDatabaseUrl, ddl)
  try {
    await runSeed(db, state)
  } finally {
    await db.$disconnect()
  }
}

/** Активно ли сид-состояние (empty/many/demo). В таком режиме OAuth не
 * используется — сессия подменяется фиксированным id профиля. */
export const seedActive: boolean = isSeedState(dbState)

/** id пользователя, под которым считаем себя залогиненными в текущем состоянии
 * (фейковая сессия сид-профилей). Для не-сид-состояний — null. */
export const seedSessionUserId: string | null = !isSeedState(dbState)
  ? null
  : dbState === 'demo'
    ? SEED_IDS.bebrail
    : dbState === 'many'
      ? 'seed-user-1'
      : null
