import { Context, Effect, Layer, PubSub, type Scope } from 'effect'
import { Events } from './events.ts'

// Присутствие редакторов в студии: кто сейчас держит открытым SSE-поток проекта.
// Состояние — внутрипроцессное: на каждый проект счётчик соединений по userId
// (один редактор может открыть несколько вкладок). Переход 0↔1 рассылает
// presence-событие в ту же шину, что и дельты документов, — студия по нему
// переключает участнику online. Как и шина событий, это корректно для одного
// экземпляра api; при горизонтальном масштабировании понадобится общий стор.

export class Presence extends Context.Tag('Presence')<
  Presence,
  {
    /** Ресурс на время соединения: при захвате участник становится online (с
     * рассылкой, если это первое его соединение), при освобождении — offline
     * (когда закрылось последнее). Привязывается к scope SSE-потока. */
    readonly track: (
      projectId: string,
      userId: string,
    ) => Effect.Effect<void, never, Scope.Scope>
    /** id участников, у кого сейчас есть хотя бы одно соединение в проекте. */
    readonly onlineUserIds: (projectId: string) => Effect.Effect<Set<string>>
  }
>() {}

export const PresenceLive = Layer.effect(
  Presence,
  Effect.gen(function* () {
    const pubsub = yield* Events
    // projectId → (userId → число открытых соединений).
    const projects = new Map<string, Map<string, number>>()
    const countsFor = (projectId: string) => {
      let m = projects.get(projectId)
      if (!m) {
        m = new Map()
        projects.set(projectId, m)
      }
      return m
    }
    const broadcast = (projectId: string, userId: string, online: boolean) =>
      PubSub.publish(pubsub, {
        projectId,
        event: { kind: 'presence', userId, online },
      })

    return Presence.of({
      track: (projectId, userId) =>
        Effect.acquireRelease(
          Effect.gen(function* () {
            const counts = countsFor(projectId)
            const prev = counts.get(userId) ?? 0
            counts.set(userId, prev + 1)
            if (prev === 0) yield* broadcast(projectId, userId, true)
          }),
          () =>
            Effect.gen(function* () {
              const counts = countsFor(projectId)
              const next = (counts.get(userId) ?? 0) - 1
              if (next <= 0) {
                counts.delete(userId)
                yield* broadcast(projectId, userId, false)
              } else {
                counts.set(userId, next)
              }
            }),
        ).pipe(Effect.asVoid),
      onlineUserIds: (projectId) =>
        Effect.sync(() => new Set(countsFor(projectId).keys())),
    })
  }),
)
