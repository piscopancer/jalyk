import type { PrismaClient } from '@jalyk/db'
import { Match } from 'effect'
import { SEED_IDS, type SeedProfile } from './config'

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

  const projectId = 'seed-project-1'
  await db.project.create({
    data: {
      id: projectId,
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
  profile: SeedProfile,
): Promise<void> {
  return Match.value(profile).pipe(
    Match.when('demo', () => seedDemo(db)),
    Match.when('many', () => seedMany(db)),
    Match.when('empty', () => Promise.resolve()),
    Match.exhaustive,
  )
}
