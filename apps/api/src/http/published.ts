import { HttpApiBuilder } from '@effect/platform'
import { queryPublished } from '@jalyk/core'
import { Api } from '@jalyk/contract'
import { Effect } from 'effect'
import { access } from './access.ts'

// Запрос на проводе — нетипизированный JSON; берём лишь объекты-аргументы, прочее
// игнорируем (форму гарантирует типизированный клиент @jalyk/client).
const asRecord = (value: unknown) =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined

export const PublishedLive = HttpApiBuilder.group(Api, 'published', (handlers) =>
  handlers.handle('query', ({ path, payload }) =>
    access(path.projectId).pipe(
      Effect.andThen(() =>
        queryPublished(path.projectId, path.type, {
          where: asRecord(payload.where),
          select: asRecord(payload.select),
          orderBy: asRecord(payload.orderBy),
          take: payload.take,
          skip: payload.skip,
        }).pipe(Effect.catchTag('DbError', (e) => Effect.die(e))),
      ),
    ),
  ),
)
