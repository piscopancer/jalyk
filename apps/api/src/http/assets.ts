import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { AssetStorage, createAsset, deleteAsset, getAssetById, listAssets } from '@jalyk/core'
import { Api, NotFound } from '@jalyk/contract'
import { Effect } from 'effect'
import { randomUUID } from 'node:crypto'
import { access, writeAccess } from './access.ts'

// Метаданные ассета на провод (поля AssetInfo из контракта). Общая для upload и
// list проекция доменной записи.
const toInfo = (asset: { id: string; projectId: string; filename: string; contentType: string; size: number }) => ({
  id: asset.id,
  projectId: asset.projectId,
  filename: asset.filename,
  contentType: asset.contentType,
  size: asset.size,
})

// Группа ассетов проекта: загрузка, список и удаление (раздача байтов — отдельная
// публичная группа ниже). Все три под /projects/:projectId, изоляция через access.
export const AssetsLive = HttpApiBuilder.group(Api, 'assets', (handlers) =>
  handlers
    // Загрузка ассета. Тело запроса — сырые байты файла (читаем через
    // HttpServerRequest), имя и тип берём из query. Ключ хранилища генерим
    // отдельным uuid (не равен публичному id), пишем байты, затем создаём запись.
    .handle('upload', ({ path, urlParams }) =>
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
            return toInfo(asset)
          }),
        ),
      ),
    )
    // Список всех ассетов проекта (новые сверху). Фильтрацию по типу (картинки)
    // делает клиент. Только чтение — достаточно access без права записи.
    .handle('list', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(listAssets(path.projectId).pipe(Effect.catchTag('DbError', (e) => Effect.die(e)))),
        Effect.map((assets) => assets.map(toInfo)),
      ),
    )
    // Удаление ассета: требует право записи. Сперва удаляем запись в БД (с
    // изоляцией; NotFoundError → 404), затем стираем байты из хранилища.
    .handle('delete', ({ path }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(
          deleteAsset(path.projectId, path.id).pipe(
            Effect.catchTag('NotFoundError', () => new NotFound()),
            Effect.catchTag('DbError', (e) => Effect.die(e)),
          ),
        ),
        Effect.tap((asset) =>
          Effect.gen(function* () {
            const storage = yield* AssetStorage
            yield* storage.remove(asset.key).pipe(Effect.orDie)
          }),
        ),
        Effect.asVoid,
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
