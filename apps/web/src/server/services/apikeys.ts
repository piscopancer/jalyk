import { issueApiKey, listApiKeys, revokeApiKey } from '@jalyk/core'
import type { Scope } from '@jalyk/db'
import { Effect } from 'effect'
import { requireOwner } from './projects'

/** Список действующих ключей проекта (без хеша) — только владелец. */
export const list = (projectId: string, actorId: string) =>
  requireOwner(projectId, actorId).pipe(Effect.zipRight(listApiKeys(projectId)))

/**
 * Выпустить ключ — только владелец. Сырое значение возвращается один раз;
 * в БД остаётся лишь хеш и префикс.
 */
export const issue = (
  projectId: string,
  actorId: string,
  name: string,
  scope: Scope,
) =>
  requireOwner(projectId, actorId).pipe(
    Effect.zipRight(issueApiKey(projectId, name, scope)),
  )

/** Отозвать ключ (мягко) — только владелец. */
export const revoke = (projectId: string, actorId: string, keyId: string) =>
  requireOwner(projectId, actorId).pipe(Effect.zipRight(revokeApiKey(keyId)))
