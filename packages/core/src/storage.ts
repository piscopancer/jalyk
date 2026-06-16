import { Config, Context, Effect, Layer } from 'effect'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { StorageError } from './errors.ts'

// Абстракция хранилища ассетов: общий Effect-слой, за которым прячется конкретный
// бэкенд. Тег несёт две операции по ключу (внутренний путь объекта) — запись и
// чтение байтов. contentType хранится в БД (модель Asset), поэтому хранилище
// оперирует только сырыми байтами. Окружения подставляют свой Layer: тестовое —
// локальная папка, прод — Yandex Cloud (пока заглушка).
export class AssetStorage extends Context.Tag('AssetStorage')<
  AssetStorage,
  {
    readonly write: (key: string, bytes: Uint8Array) => Effect.Effect<void, StorageError>
    readonly read: (key: string) => Effect.Effect<Uint8Array, StorageError>
  }
>() {}

// Папка для тестового хранилища. Путь относительный резолвится от cwd процесса
// api (apps/api), что в деве кладёт файлы в apps/api/uploads.
const uploadsDir = Config.string('JALYK_UPLOADS_DIR').pipe(Config.withDefault('uploads'))

/** Тестовая реализация: ассеты как файлы в локальной папке. Ключ — относительный
 * путь вида `projectId/uuid`; родительские каталоги создаются при записи. */
export const LocalAssetStorageLive = Layer.effect(
  AssetStorage,
  Effect.gen(function* () {
    const baseDir = resolve(yield* uploadsDir)
    const pathFor = (key: string) => join(baseDir, key)
    return AssetStorage.of({
      write: (key, bytes) =>
        Effect.tryPromise({
          try: async () => {
            const file = pathFor(key)
            await mkdir(dirname(file), { recursive: true })
            await writeFile(file, bytes)
          },
          catch: (cause) => new StorageError({ cause }),
        }),
      read: (key) =>
        Effect.tryPromise({
          try: async () => new Uint8Array(await readFile(pathFor(key))),
          catch: (cause) => new StorageError({ cause }),
        }),
    })
  }),
)

/** Прод-хранилище (Yandex Cloud Object Storage, S3-совместимое) — пока заглушка.
 * Реальная загрузка через presigned/SDK появится позже; любая операция падает
 * StorageError, чтобы случайное включение прод-драйвера не молчало. */
export const YandexAssetStorageLive = Layer.succeed(
  AssetStorage,
  AssetStorage.of({
    write: () => Effect.fail(new StorageError({ cause: 'yandex storage не реализован' })),
    read: () => Effect.fail(new StorageError({ cause: 'yandex storage не реализован' })),
  }),
)
