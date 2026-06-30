import { Context, Effect, Layer } from 'effect'

// Сериализация загрузок ассетов в пределах одного проекта. Проверка квоты и
// последующая запись должны идти «по очереди»: иначе две параллельные загрузки
// оба пройдут проверку свободного объёма и вместе переберут лимит проекта.
//
// Реализация — in-process: семафор(1) на каждый projectId, лениво создаётся и
// кешируется через Effect.cachedFunction (один и тот же семафор на ключ). Это
// корректно при одном экземпляре api (текущий free-хостинг); при горизонтальном
// масштабировании понадобится распределённый лок (Postgres advisory lock).

export class UploadGate extends Context.Tag('UploadGate')<
  UploadGate,
  {
    readonly withProjectLock: <A, E, R>(
      projectId: string,
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E, R>
  }
>() {}

export const UploadGateLive = Layer.effect(
  UploadGate,
  Effect.gen(function* () {
    const semaphoreFor = yield* Effect.cachedFunction((_: string) =>
      Effect.makeSemaphore(1),
    )
    return UploadGate.of({
      withProjectLock: (projectId, effect) =>
        semaphoreFor(projectId).pipe(
          Effect.flatMap((semaphore) => semaphore.withPermits(1)(effect)),
        ),
    })
  }),
)
