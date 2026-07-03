/** Имена состояний БД. Чистый модуль без резолва конфига — его безопасно
 * импортировать до установки JALYK_DB_STATE (нужно лаунчеру scripts/dev.ts). */
export const dbStateNames = ['local', 'prod', 'empty', 'many', 'demo'] as const

export type DbState = (typeof dbStateNames)[number]

/** Сид-профили — подмножество состояний, работающих на базе jalyk_seed. */
export const seedStateNames = ['empty', 'many', 'demo'] as const

export type SeedState = (typeof seedStateNames)[number]

export const isSeedState = (state: DbState): state is SeedState =>
  seedStateNames.some((name) => name === state)
