/** Имена состояний авторизации. Чистый модуль без резолва конфига — его безопасно
 * импортировать до установки JALYK_AUTH_STATE (нужно лаунчеру scripts/dev.ts). */
export const authStateNames = ['local', 'prod'] as const

export type AuthState = (typeof authStateNames)[number]
