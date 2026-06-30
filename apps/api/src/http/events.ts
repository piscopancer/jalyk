import { HttpApiBuilder, HttpServerResponse } from '@effect/platform'
import { getProjectAccess } from '@jalyk/core'
import { Duration, Effect, Stream } from 'effect'
import { Events } from '../events.ts'
import { Presence } from '../presence.ts'
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
      const presence = yield* Presence

      // Дельты проекта в кадрах SSE. event: — вид (field/create/publish/delete/
      // presence), data: — JSON события; клиент разбирает и фильтрует сам.
      const deltas = Stream.fromPubSub(pubsub).pipe(
        Stream.filter((e) => e.projectId === path.projectId),
        Stream.map(
          (e) => `event: ${e.event.kind}\ndata: ${JSON.stringify(e.event)}\n\n`,
        ),
      )

      // Комментарий-keepalive каждые 25 секунд держит соединение и проксей живым.
      const keepalive = Stream.tick(Duration.seconds(25)).pipe(
        Stream.map(() => ': keepalive\n\n'),
      )

      // Сразу отдаём комментарий-открытие, чтобы заголовки 200 ушли клиенту до
      // первого события (иначе EventSource ждёт байтов).
      const sse = Stream.make(': open\n\n').pipe(
        Stream.concat(Stream.merge(deltas, keepalive)),
        Stream.encodeText,
      )

      // Присутствие: пока поток жив, помечаем редактора online (по принципалу-
      // пользователю). track — ресурс на scope потока: online при открытии,
      // offline при закрытии соединения. Ключ-принципал (сайт-потребитель) в
      // presence не участвует, поэтому для него поток отдаём как есть.
      const body =
        principal.kind === 'user'
          ? Stream.unwrapScoped(
              presence
                .track(path.projectId, principal.userId)
                .pipe(Effect.as(sse)),
            )
          : sse

      return HttpServerResponse.stream(body, {
        contentType: 'text/event-stream',
        headers: { 'cache-control': 'no-cache', connection: 'keep-alive' },
      })
    }),
  ),
)
