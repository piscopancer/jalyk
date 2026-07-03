import { HttpApiBuilder, HttpMiddleware, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Api } from '@jalyk/contract'
import { DatabaseLive, StorageStateLive } from '@jalyk/core'
import { Effect, Layer } from 'effect'
import fs from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { fileURLToPath } from 'node:url'
import { port } from './config.ts'

// Опциональный локальный https (как в vite web/test-client): когда заданы
// HTTPS_CERT_FILE/HTTPS_KEY_FILE (относительно корня монорепы), api поднимается по
// https — иначе студия по https не сможет звать его (mixed content). Без них —
// обычный http (прод за внешним TLS).
const tlsCert = process.env.HTTPS_CERT_FILE
const tlsKey = process.env.HTTPS_KEY_FILE
const tls =
  tlsCert && tlsKey
    ? {
        cert: fs.readFileSync(
          fileURLToPath(new URL(`../../../${tlsCert}`, import.meta.url)),
        ),
        key: fs.readFileSync(
          fileURLToPath(new URL(`../../../${tlsKey}`, import.meta.url)),
        ),
      }
    : undefined
import { EventsLive } from './events.ts'
import { AssetsLive, AssetsPublicLive, UsersPublicLive } from './http/assets.ts'
import { AuthorizationLive } from './http/authz.ts'
import { DocumentsLive } from './http/documents.ts'
import { EventsHttpLive } from './http/events.ts'
import { HealthLive } from './http/health.ts'
import { MeLive } from './http/me.ts'
import { PublishedLive } from './http/published.ts'
import { AuthenticationLive } from './http/middleware.ts'
import { ProjectsLive } from './http/projects.ts'
import { UploadGateLive } from './http/upload-gate.ts'
import { PresenceLive } from './presence.ts'

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
  allowedHeaders: [
    'content-type',
    'x-api-key',
    'authorization',
    'b3',
    'traceparent',
    'tracestate',
  ],
})

const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HealthLive),
  Layer.provide(MeLive),
  Layer.provide(ProjectsLive),
  Layer.provide(DocumentsLive),
  Layer.provide(PublishedLive),
  Layer.provide(AssetsLive),
  Layer.provide(AssetsPublicLive),
  Layer.provide(UsersPublicLive),
  Layer.provide(EventsHttpLive),
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthorizationLive),
  Layer.provide(PresenceLive),
  Layer.provide(EventsLive),
  Layer.provide(DatabaseLive),
  Layer.provide(StorageStateLive),
  Layer.provide(UploadGateLive),
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
    // ВАЖНО: NodeHttpServer.layer вызывает фабрику сервера БЕЗ аргументов и
    // передаёт options только в server.listen(). Поэтому cert/key для https
    // нельзя класть в options — их надо передать прямо в createHttpsServer
    // через thunk, иначе сервер поднимется без сертификата и отвергнет TLS.
    Layer.provide(
      NodeHttpServer.layer(
        tls ? () => createHttpsServer(tls) : createHttpServer,
        { port: resolvedPort, host: '0.0.0.0' },
      ),
    ),
  )
  yield* Layer.launch(ServerLive)
})

NodeRuntime.runMain(program)
