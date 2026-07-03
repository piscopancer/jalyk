/** Имена состояний хранилища. Чистый модуль без зависимостей и резолва — его
 * безопасно импортировать до установки JALYK_STORAGE_STATE (нужно лаунчеру). */
export const storageStateNames = ['files', 's3', 'memory'] as const

export type StorageState = (typeof storageStateNames)[number]
