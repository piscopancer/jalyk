import { HttpApiBuilder, HttpMiddleware, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { DatabaseLive } from '@jalyk/core'
import { Effect, Layer } from 'effect'
import { createServer } from 'node:http'
import { port } from './config.ts'
import { Api } from './http/api.ts'
import { AuthorizationLive } from './http/authz.ts'
import { HealthLive } from './http/health.ts'
import { MeLive } from './http/me.ts'
import { AuthenticationLive } from './http/middleware.ts'
import { ProjectsLive } from './http/projects.ts'

// Сборка реализации API: каждая группа эндпоинтов — свой Layer, все они
// подкладываются под HttpApiBuilder.api. Доменные зависимости (БД, авторизация)
// даются здесь.
const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(HealthLive),
  Layer.provide(MeLive),
  Layer.provide(ProjectsLive),
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthorizationLive),
  Layer.provide(DatabaseLive),
)

// HTTP-слой: Node-сервер на выбранном порту + логирование запросов + раздача
// собранного API. port берётся из Effect Config асинхронно, поэтому слой
// сервера строим внутри Effect и запускаем через NodeRuntime.
const program = Effect.gen(function* () {
  const resolvedPort = yield* port
  const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
    Layer.provide(ApiLive),
    HttpServer.withLogAddress,
    Layer.provide(NodeHttpServer.layer(createServer, { port: resolvedPort })),
  )
  yield* Layer.launch(ServerLive)
})

NodeRuntime.runMain(program)
