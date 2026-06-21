import type { Scope } from '@jalyk/db'
import { Effect } from 'effect'
import { createHash, randomBytes } from 'node:crypto'
import { query } from './db.ts'

// Префикс всех api-ключей — по нему клиента сразу видно в логах и его можно
// отличить от прочих токенов. Полный ключ показывается пользователю один раз;
// в БД лежит только SHA-256-хеш и короткий префикс для отображения в списке.
const KEY_PREFIX = 'jalyk_'

export const hashApiKey = (raw: string) =>
  createHash('sha256').update(raw).digest('hex')

/** Сгенерировать новый ключ: сырое значение (показать один раз), префикс и хеш. */
export const generateApiKey = () => {
  const raw = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`
  return { raw, prefix: raw.slice(0, 12), hash: hashApiKey(raw) }
}

/** Найти действующий (не отозванный) ключ по сырому значению. */
export const findApiKey = (raw: string) =>
  query((db) =>
    db.apiKey.findFirst({ where: { hash: hashApiKey(raw), revokedAt: null } }),
  )

/** Поля ключа, безопасные для показа в списке (без хеша). */
export const apiKeyListSelect = {
  id: true,
  name: true,
  prefix: true,
  scope: true,
  createdAt: true,
  lastUsedAt: true,
} as const

/** Действующие ключи проекта для списка — без хеша, отозванные не включаются. */
export const listApiKeys = (projectId: string) =>
  query((db) =>
    db.apiKey.findMany({
      where: { projectId, revokedAt: null },
      select: apiKeyListSelect,
      orderBy: { createdAt: 'desc' },
    }),
  )

/** Выпустить ключ для проекта. Возвращает сырое значение и запись. */
export const issueApiKey = (projectId: string, name: string, scope: Scope) =>
  Effect.gen(function* () {
    const { raw, prefix, hash } = generateApiKey()
    const record = yield* query((db) =>
      db.apiKey.create({ data: { projectId, name, scope, prefix, hash } }),
    )
    return { raw, record }
  })

/** Отозвать ключ (мягко — помечаем revokedAt, чтобы сохранить историю). */
export const revokeApiKey = (keyId: string) =>
  query((db) =>
    db.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } }),
  )
