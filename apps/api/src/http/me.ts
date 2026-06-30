import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import {
  AssetStorage,
  assertFileSize,
  updateUserProfile,
} from '@jalyk/core'
import { Api, CurrentUser, FileTooLarge } from '@jalyk/contract'
import { Effect } from 'effect'

// Профиль на провод (поля CurrentUserInfo). image может быть как внешним URL
// (аватарка OAuth-провайдера), так и нашим /users/:id/avatar после загрузки.
const toInfo = (user: {
  id: string
  email: string
  name: string
  image: string | null
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  image: user.image,
})

// Группа /me: текущий пользователь, смена имени и загрузка аватарки. Все три
// работают «над собой» — id берётся из middleware Authentication (CurrentUser),
// projectId не нужен.
export const MeLive = HttpApiBuilder.group(Api, 'me', (handlers) =>
  handlers
    // Текущий пользователь, выведенный из bearer-токена сессии.
    .handle('me', () => CurrentUser)
    // Смена имени. Пустой payload (имя не передано) — ничего не меняет.
    .handle('updateProfile', ({ payload }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser
        const updated = yield* updateUserProfile(user.id, {
          name: payload.name,
        }).pipe(Effect.catchTag('DbError', (e) => Effect.die(e)))
        return toInfo(updated)
      }),
    )
    // Загрузка аватарки: сырые байты тела, тип в query. Лимит файла (10 МБ)
    // проверяем как у ассетов — сперва по Content-Length, затем по факту. Объект
    // в хранилище один на пользователя (ключ users/:id, перезаписывается). В
    // профиль кладём наш публичный URL раздачи с типом и версией (cache-bust).
    .handle('uploadAvatar', ({ urlParams }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser
        const request = yield* HttpServerRequest.HttpServerRequest
        const declared = Number(request.headers['content-length'])
        if (Number.isFinite(declared)) yield* assertFileSize(declared)

        const buffer = yield* request.arrayBuffer.pipe(Effect.orDie)
        const bytes = new Uint8Array(buffer)
        yield* assertFileSize(bytes.length)

        const storage = yield* AssetStorage
        yield* storage.write(`users/${user.id}`, bytes).pipe(Effect.orDie)

        const proto = request.headers['x-forwarded-proto'] ?? 'http'
        const host = request.headers['host'] ?? ''
        const ct = encodeURIComponent(urlParams.contentType)
        const image = `${proto}://${host}/users/${user.id}/avatar?ct=${ct}&v=${Date.now()}`
        const updated = yield* updateUserProfile(user.id, { image }).pipe(
          Effect.catchTag('DbError', (e) => Effect.die(e)),
        )
        return toInfo(updated)
      }).pipe(
        Effect.catchTag(
          'FileTooLargeError',
          (e) => new FileTooLarge({ limit: e.limit, size: e.size }),
        ),
      ),
    ),
)
