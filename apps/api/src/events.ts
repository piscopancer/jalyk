import type { ProjectEvent } from '@jalyk/contract'
import { Context, Effect, Layer, PubSub } from 'effect'

// Внутрипроцессная шина событий проекта. Обработчики записи (setField/create/
// publish/delete) публикуют сюда дельты, SSE-эндпоинт раздаёт их подписчикам.
// Один поток на проект — фильтрация по projectId на стороне подписчика; field-
// level подписка (на конкретный путь) — клиентская забота (DocumentFieldHandle).
// PubSub неограниченный, но без подписчиков сообщения отбрасываются сразу, так
// что утечки нет. При горизонтальном масштабировании (несколько процессов api)
// события не пересекают границу процесса — тогда понадобится внешний брокер.
// Тип ProjectEvent общий со студией — живёт в @jalyk/contract.

export type { ProjectEvent }

export interface ProjectEventEnvelope {
  readonly projectId: string
  readonly event: ProjectEvent
}

export class Events extends Context.Tag('Events')<Events, PubSub.PubSub<ProjectEventEnvelope>>() {}

export const EventsLive = Layer.effect(Events, PubSub.unbounded<ProjectEventEnvelope>())

/** Опубликовать событие проекта в шину. Не падает: PubSub.publish без подписчиков
 * просто отбрасывает сообщение и возвращает boolean, ошибок не даёт. */
export const publishEvent = (projectId: string, event: ProjectEvent) =>
  Effect.flatMap(Events, (pubsub) => PubSub.publish(pubsub, { projectId, event }))
