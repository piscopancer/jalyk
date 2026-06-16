import { HttpApiBuilder, HttpServerResponse } from '@effect/platform'
import { getProjectAccess } from '@jalyk/core'
import { Duration, Effect, Stream } from 'effect'
import { Events } from '../events.ts'
import { Api, CurrentPrincipal, NotFound } from '@jalyk/contract'

// SSE-обработчик потока событий проекта. Сначала та же проверка доступа, что и в
// документах (чужой проект → 404, изоляция), затем подписка на шину и стрим
// дельт в формате text/event-stream. handleRaw отдаёт сырой HttpServerResponse —
// HttpApi пропускает его как есть, не пытаясь сериализовать по схеме успеха.
export const EventsHttpLive = HttpApiBuilder.group(Api, 'events', (handlers) =>
  handlers.handleRaw('events', ({ path }) =>
    Effect.gen(function* () {
      const principal = yield* CurrentPrincipal
      yield* getProjectAccess(principal, path.projectId).pipe(
        Effect.catchTag('NotFoundError', () => new NotFound()),
        Effect.catchTag('DbError', (e) => Effect.die(e)),
      )
      const pubsub = yield* Events

      // Дельты проекта в кадрах SSE. event: — вид (field/create/publish/delete),
      // data: — JSON события; клиент разбирает и фильтрует по docId/type/path.
      const deltas = Stream.fromPubSub(pubsub).pipe(
        Stream.filter((e) => e.projectId === path.projectId),
        Stream.map((e) => `event: ${e.event.kind}\ndata: ${JSON.stringify(e.event)}\n\n`),
      )

      // Комментарий-keepalive каждые 25 секунд держит соединение и проксей живым.
      const keepalive = Stream.tick(Duration.seconds(25)).pipe(Stream.map(() => ': keepalive\n\n'))

      // Сразу отдаём комментарий-открытие, чтобы заголовки 200 ушли клиенту до
      // первого события (иначе EventSource ждёт байтов).
      const body = Stream.make(': open\n\n').pipe(
        Stream.concat(Stream.merge(deltas, keepalive)),
        Stream.encodeText,
      )

      return HttpServerResponse.stream(body, {
        contentType: 'text/event-stream',
        headers: { 'cache-control': 'no-cache', connection: 'keep-alive' },
      })
    }),
  ),
)
