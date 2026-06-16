import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { AssetStorage, createAsset, getAssetById } from '@jalyk/core'
import { Api, NotFound } from '@jalyk/contract'
import { Effect } from 'effect'
import { randomUUID } from 'node:crypto'
import { writeAccess } from './access.ts'

// Загрузка ассета. Тело запроса — сырые байты файла (читаем через
// HttpServerRequest), имя и тип берём из query. Ключ хранилища генерим отдельным
// uuid (не равен публичному id), пишем байты, затем создаём запись с метаданными.
export const AssetsLive = HttpApiBuilder.group(Api, 'assets', (handlers) =>
  handlers.handle('upload', ({ path, urlParams }) =>
    writeAccess(path.projectId).pipe(
      Effect.andThen(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const buffer = yield* request.arrayBuffer.pipe(Effect.orDie)
          const bytes = new Uint8Array(buffer)
          const storage = yield* AssetStorage
          const key = `${path.projectId}/${randomUUID()}`
          yield* storage.write(key, bytes).pipe(Effect.orDie)
          const asset = yield* createAsset(path.projectId, {
            key,
            filename: urlParams.filename,
            contentType: urlParams.contentType,
            size: bytes.length,
          }).pipe(Effect.catchTag('DbError', (e) => Effect.die(e)))
          return {
            id: asset.id,
            projectId: asset.projectId,
            filename: asset.filename,
            contentType: asset.contentType,
            size: asset.size,
          }
        }),
      ),
    ),
  ),
)

// Публичная раздача байтов ассета по id (без авторизации — см. контракт).
// handleRaw отдаёт сырой ответ; contentType берём из записи, байты — из хранилища.
export const AssetsPublicLive = HttpApiBuilder.group(Api, 'assetsPublic', (handlers) =>
  handlers.handleRaw('serve', ({ path }) =>
    Effect.gen(function* () {
      const asset = yield* getAssetById(path.id).pipe(Effect.catchTag('DbError', (e) => Effect.die(e)))
      if (!asset) return yield* new NotFound()
      const storage = yield* AssetStorage
      const bytes = yield* storage.read(asset.key).pipe(Effect.orDie)
      return HttpServerResponse.uint8Array(bytes, {
        contentType: asset.contentType,
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      })
    }),
  ),
)
