import { Config, ConfigProvider, Effect, Option } from 'effect'

/**
 * Профиль тестовой среды. Выбирается переменной `SEED_PROFILE`:
 *   empty — 0 пользователей;
 *   many  — 1000 пользователей (для нагрузки/списков);
 *   demo  — 3 именованных пользователя, у Бебраила 1 проект, под ним и логин.
 * Если переменная не задана — работает обычная прод-БД (DATABASE_URL).
 */
export type SeedProfile = 'empty' | 'many' | 'demo'

// Фиксированные id сидов: должны быть стабильными, чтобы фейковая сессия знала,
// под кем логиниться, не обращаясь к БД.
export const SEED_IDS = {
  amir: 'seed-amir',
  tamik: 'seed-tamik',
  bebrail: 'seed-bebrail',
} as const

// Читаем профиль через Effect Config, но с провайдером, собранным из process.env
// вручную: так модуль безопасен и в браузере (там process нет — карта пустая,
// профиль = None), и не тянет неявных зависимостей дефолтного провайдера.
const envProvider = ConfigProvider.fromMap(
  new Map(
    Object.entries(
      typeof process !== 'undefined'
        ? (process.env as Record<string, string>)
        : {},
    ),
  ),
)

const readProfile = Config.option(
  Config.literal('empty', 'many', 'demo')('SEED_PROFILE'),
).pipe(Effect.withConfigProvider(envProvider))

/** Активный профиль сида или null (обычный прод-режим). */
export const seedProfile: SeedProfile | null = Option.getOrNull(
  Effect.runSync(readProfile),
)

/** id пользователя, под которым считаем себя залогиненными в данном профиле. */
export const seedSessionUserId: string | null =
  seedProfile === 'demo'
    ? SEED_IDS.bebrail
    : seedProfile === 'many'
      ? 'seed-user-1'
      : null
