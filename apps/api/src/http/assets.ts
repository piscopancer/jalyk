import {
  HttpApiBuilder,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import {
  AssetStorage,
  assertFileSize,
  assertWithinQuota,
  createAsset,
  deleteAsset,
  getAssetById,
  getAssetUsage,
  listAssets,
} from '@jalyk/core'
import { Api, FileTooLarge, NotFound, QuotaExceeded } from '@jalyk/contract'
import { Effect } from 'effect'
import { randomUUID } from 'node:crypto'
import { access, writeAccess } from './access.ts'
import { UploadGate } from './upload-gate.ts'

// Метаданные ассета на провод (поля AssetInfo из контракта). Общая для upload и
// list проекция доменной записи.
const toInfo = (asset: {
  id: string
  projectId: string
  filename: string
  contentType: string
  size: number
  createdAt: Date
}) => ({
  id: asset.id,
  projectId: asset.projectId,
  filename: asset.filename,
  contentType: asset.contentType,
  size: asset.size,
  createdAt: asset.createdAt.toISOString(),
})

// Группа ассетов проекта: загрузка, список и удаление (раздача байтов — отдельная
// публичная группа ниже). Все три под /projects/:projectId, изоляция через access.
export const AssetsLive = HttpApiBuilder.group(Api, 'assets', (handlers) =>
  handlers
    // Загрузка ассета. Тело запроса — сырые байты файла (читаем через
    // HttpServerRequest), имя и тип берём из query. Ключ хранилища генерим
    // отдельным uuid (не равен публичному id).
    //
    // Лимиты проверяются на сервере: размер файла (10 МБ) — сперва по
    // Content-Length до чтения тела, чтобы не буферизовать заведомо большой файл,
    // затем по фактической длине (заголовок можно подделать). Квота проекта
    // (100 МБ) проверяется под локом проекта: чтение тела, проверка квоты, запись
    // в S3 и создание записи идут «по очереди», иначе параллельные загрузки могут
    // вместе перебрать лимит. Доменные ошибки маппятся в контрактные (413/409).
    .handle('upload', ({ path, urlParams }) =>
      writeAccess(path.projectId).pipe(
        Effect.andThen(
          Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest
            const declared = Number(request.headers['content-length'])
            if (Number.isFinite(declared)) yield* assertFileSize(declared)

            const gate = yield* UploadGate
            const storage = yield* AssetStorage
            return yield* gate.withProjectLock(
              path.projectId,
              Effect.gen(function* () {
                const buffer = yield* request.arrayBuffer.pipe(Effect.orDie)
                const bytes = new Uint8Array(buffer)
                yield* assertFileSize(bytes.length)
                yield* assertWithinQuota(path.projectId, bytes.length).pipe(
                  Effect.catchTag('DbError', (e) => Effect.die(e)),
                )
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
            )
          }),
        ),
        Effect.catchTags({
          FileTooLargeError: (e) =>
            new FileTooLarge({ limit: e.limit, size: e.size }),
          QuotaExceededError: (e) =>
            new QuotaExceeded({ quota: e.quota, used: e.used, size: e.size }),
        }),
      ),
    )
    // Список всех ассетов проекта (новые сверху). Фильтрацию по типу (картинки)
    // делает клиент. Только чтение — достаточно access без права записи.
    .handle('list', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(
          listAssets(path.projectId).pipe(
            Effect.catchTag('DbError', (e) => Effect.die(e)),
          ),
        ),
        Effect.map((assets) => assets.map(toInfo)),
      ),
    )
    // Использование хранилища: суммарный вес ассетов и лимит. Только чтение.
    .handle('usage', ({ path }) =>
      access(path.projectId).pipe(
        Effect.andThen(
          getAssetUsage(path.projectId).pipe(
            Effect.catchTag('DbError', (e) => Effect.die(e)),
          ),
        ),
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
export const AssetsPublicLive = HttpApiBuilder.group(
  Api,
  'assetsPublic',
  (handlers) =>
    handlers.handleRaw('serve', ({ path }) =>
      Effect.gen(function* () {
        const asset = yield* getAssetById(path.id).pipe(
          Effect.catchTag('DbError', (e) => Effect.die(e)),
        )
        if (!asset) return yield* new NotFound()
        const storage = yield* AssetStorage
        // Нет объекта в хранилище (например, рассинхрон БД и бэкенда) — честный
        // 404, а не 500: запись в БД есть, а байтов нет.
        const bytes = yield* storage
          .read(asset.key)
          .pipe(Effect.catchTag('StorageError', () => new NotFound()))
        return HttpServerResponse.uint8Array(bytes, {
          contentType: asset.contentType,
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        })
      }),
    ),
)

// Публичная раздача аватарки пользователя по ключу хранилища users/:id. Отдельной
// записи в БД нет, поэтому content-type берём из query (ct), который мы же зашили
// в URL при загрузке (см. me.uploadAvatar). Версия (v) в URL обеспечивает
// cache-bust, поэтому кэшируем агрессивно. Нет объекта в хранилище → 404.
export const UsersPublicLive = HttpApiBuilder.group(
  Api,
  'usersPublic',
  (handlers) =>
    handlers.handleRaw('avatar', ({ path, urlParams }) =>
      Effect.gen(function* () {
        const storage = yield* AssetStorage
        const bytes = yield* storage.read(`users/${path.id}`).pipe(
          Effect.catchTag('StorageError', () => new NotFound()),
        )
        return HttpServerResponse.uint8Array(bytes, {
          contentType: urlParams.ct ?? 'application/octet-stream',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        })
      }),
    ),
)
