import { HttpApiBuilder, HttpMiddleware, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Api } from '@jalyk/contract'
import { DatabaseLive, LocalAssetStorageLive, YandexAssetStorageLive } from '@jalyk/core'
import { Effect, Layer } from 'effect'
import { createServer } from 'node:http'
import { port, storageDriver } from './config.ts'
import { EventsLive } from './events.ts'
import { AssetsLive, AssetsPublicLive } from './http/assets.ts'
import { AuthorizationLive } from './http/authz.ts'
import { DocumentsLive } from './http/documents.ts'
import { EventsHttpLive } from './http/events.ts'
import { HealthLive } from './http/health.ts'
import { MeLive } from './http/me.ts'
import { AuthenticationLive } from './http/middleware.ts'
import { ProjectsLive } from './http/projects.ts'

// Сборка реализации API: каждая группа эндпоинтов — свой Layer, все они
// подкладываются под HttpApiBuilder.api. Доменные зависимости (БД, авторизация)
// даются здесь.
// CORS: студия встраивается в чужой сайт (другой origin) и ходит в api из браузера
// с заголовком X-Api-Key, поэтому нужны preflight и разрешающие заголовки. Авторизация
// идёт ключом, а не cookie, так что credentials не включаем и origin можно открыть.
const CorsLive = HttpApiBuilder.middlewareCors({
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // b3 / traceparent / tracestate — заголовки распространения трейса, которые
  // Effect HttpClient добавляет к запросам; без них preflight отклоняет вызов.
  allowedHeaders: ['content-type', 'x-api-key', 'authorization', 'b3', 'traceparent', 'tracestate'],
})

// Хранилище ассетов выбирается по конфигу: local (файлы) или yandex (заглушка).
const StorageLive = Layer.unwrapEffect(
  Effect.map(storageDriver, (driver) => (driver === 'yandex' ? YandexAssetStorageLive : LocalAssetStorageLive)),
)

const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HealthLive),
  Layer.provide(MeLive),
  Layer.provide(ProjectsLive),
  Layer.provide(DocumentsLive),
  Layer.provide(AssetsLive),
  Layer.provide(AssetsPublicLive),
  Layer.provide(EventsHttpLive),
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthorizationLive),
  Layer.provide(EventsLive),
  Layer.provide(DatabaseLive),
  Layer.provide(StorageLive),
  Layer.provide(CorsLive),
)

// HTTP-слой: Node-сервер на выбранном порту + логирование запросов + раздача
// собранного API. port берётся из Effect Config асинхронно, поэтому слой
// сервера строим внутри Effect и запускаем через NodeRuntime.
const program = Effect.gen(function* () {
  const resolvedPort = yield* port
  const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
    Layer.provide(ApiLive),
    HttpServer.withLogAddress,
    // host задаём явно: без него Node на Windows биндится на `::` (IPv6-only,
    // т.к. dual-stack по умолчанию выключен), и localhost:3001 (IPv4) недоступен.
    Layer.provide(NodeHttpServer.layer(createServer, { port: resolvedPort, host: '0.0.0.0' })),
  )
  yield* Layer.launch(ServerLive)
})

NodeRuntime.runMain(program)
